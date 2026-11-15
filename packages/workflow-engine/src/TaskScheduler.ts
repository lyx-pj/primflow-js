import type { NodeExecutionStatus, NodeClassType, NodeEventHandler } from '@lyx-pj/workflow-model'
import { GraphCompiler, type GraphNode } from './GraphCompiler'
import { createExecutionContext } from './ExecutionContext'
import { LoopController } from './LoopController'
import type { Runtime, NodeInstanceType } from './Runtime'
import { applySubgraphEntryParams, applySubgraphExitParams } from './SubgraphParams'
import type { BreakpointHit, EngineStatus, ProcessOptions } from './types'

type ExecutionSession = {
  nodes: Map<string, { pending: number; running: number; completed: boolean }>
  controller: AbortController
  debug: boolean
  pausedNode?: BreakpointHit
  pausePromise?: Promise<void>
  resume?: () => void
  pausedAt?: number
  pausedMs: number
}

export type TaskCallbacks = {
  notify: (event: string, ...payload: unknown[]) => void
  activity: (delta: number) => void
  emit: (name: string, ...payload: unknown[]) => void
  nodeState: (nodeId: string) => Record<string, unknown> | undefined
}

/** Single-task scheduler owning mutable dependencies, node instances, and pause waiters. */
export class TaskScheduler<NodeDefs extends Record<string, NodeClassType>> {
  private flowStackGraph: Map<string, GraphNode>
  private entryPorts: Set<string>
  private subEntryPort = new Map<string, string>()
  private waitingGraph = new Map<string, GraphNode>()
  private readyGraph = new Map<string, GraphNode>()
  private subFlowStackGraph = new Map<string, Map<string, GraphNode>>()
  private subWaitingGraph = new Map<string, Map<string, GraphNode>>()
  private subReadyGraph = new Map<string, Map<string, GraphNode>>()
  private nodeStatuses = new Map<string, import('@lyx-pj/workflow-model').NodeExecutionStatus>()
  private errorNodes = new Set<string>()
  private session?: ExecutionSession
  private currentStatus: EngineStatus = 'idle'
  private compiled: GraphCompiler
  readonly runtime: Runtime<NodeDefs>
  readonly options: ProcessOptions
  private taskId: string
  private callbacks: TaskCallbacks
  readonly loops: LoopController<NodeDefs>

  constructor(
    runtime: Runtime<NodeDefs>,
    json: import('@lyx-pj/workflow-model').JsonGraph,
    options: ProcessOptions,
    taskId: string,
    callbacks: TaskCallbacks,
    defaults: NodeInstanceType[] = []
  ) {
    this.runtime = runtime
    this.options = options
    this.taskId = taskId
    this.callbacks = callbacks
    this.compiled = new GraphCompiler(runtime.fromJSON(structuredClone(json)))
    for (const initial of defaults) {
      const node = runtime.nodes.get(initial.id)
      if (!node) continue
      node.inputValues = structuredClone(initial.inputValues)
      node.outputValues = structuredClone(initial.outputValues)
      node.data = structuredClone(initial.data)
    }
    this.flowStackGraph = this.compiled.graphs.get('')!
    this.entryPorts = new Set(this.compiled.entries.get(''))
    for (const [id, graph] of this.compiled.graphs) {
      if (!id) continue
      this.subFlowStackGraph.set(id, graph)
      this.subWaitingGraph.set(id, new Map())
      this.subReadyGraph.set(id, new Map())
      const entry = this.compiled.entries.get(id)?.[0]
      if (entry) this.subEntryPort.set(id, entry)
    }
    this.session = { nodes: new Map(), controller: new AbortController(), debug: options.debug ?? false, pausedMs: 0 }
    const session = this.session
    this.loops = new LoopController(runtime, this.compiled, options, {
      taskId,
      signal: session.controller.signal,
      wait: (node, scope, signal) => this.waitForNode(node, node.graphId, session, scope, signal),
      activity: (nodeId, delta) => this.updateNodeActivity(nodeId, session, delta),
      nodeState: callbacks.nodeState,
      emit: callbacks.emit,
      notify: callbacks.notify,
      paused: () => !!session.pausePromise,
      runningTime: () => (session.pausedAt ?? Date.now()) - session.pausedMs,
    })
    this.currentStatus = 'running'
  }

  get status() {
    return this.currentStatus
  }
  get pausedNode() {
    return this.session?.pausedNode ?? null
  }
  get waiting() {
    return this.waitingGraph.size > 0 || [...this.subWaitingGraph.values()].some((graph) => graph.size > 0)
  }

  public getNodeStatus(nodeId: string): NodeExecutionStatus {
    return this.nodeStatuses.get(nodeId) ?? 'idle'
  }

  public getNodeStatuses(): ReadonlyMap<string, NodeExecutionStatus> {
    return new Map(this.nodeStatuses)
  }

  /** Read completed port values or active breakpoint inputs for application execution previews. */
  public getNodeExecutionData(nodeId: string) {
    if (this.pausedNode?.nodeId === nodeId) {
      return { inputs: { ...this.pausedNode.inputs }, outputs: {} }
    }
    if (this.getNodeStatus(nodeId) !== 'completed') return undefined
    const frameData = this.loops.latestData.get(nodeId)
    if (frameData) return structuredClone(frameData)
    const node = this.runtime.nodes.get(nodeId)
    if (!node) return undefined
    return {
      inputs: Object.fromEntries(
        node.inputs
          .filter((port) => port.type !== 'exec' && port.type !== 'spacer')
          .map((port) => [port.name, node.getInput(port.name)])
      ),
      outputs: Object.fromEntries(
        node.outputs
          .filter((port) => port.type !== 'exec' && port.type !== 'spacer')
          .map((port) => [port.name, node.getOutput(port.name)])
      ),
    }
  }

  private setNodeStatus(nodeId: string, status: NodeExecutionStatus) {
    if (this.getNodeStatus(nodeId) === status) return
    this.nodeStatuses.set(nodeId, status)
    this.notify('node:status:changed', nodeId, status)
  }

  private resetNodeStatuses() {
    try {
      for (const nodeId of this.nodeStatuses.keys()) this.setNodeStatus(nodeId, 'idle')
    } finally {
      this.nodeStatuses.clear()
    }
  }

  private updateNodeActivity(
    nodeId: string,
    session: ExecutionSession,
    delta: { pending?: number; running?: number; completed?: boolean }
  ) {
    if (!this.isActive(session)) return
    const activity = session.nodes.get(nodeId) ?? { pending: 0, running: 0, completed: false }
    activity.pending += delta.pending ?? 0
    activity.running += delta.running ?? 0
    activity.completed = delta.completed ?? activity.completed
    session.nodes.set(nodeId, activity)
    // A node may run in concurrent event tasks; one completion must not overwrite other active tasks.
    this.setNodeStatus(
      nodeId,
      activity.running > 0 ? 'running' : activity.pending > 0 ? 'pending' : activity.completed ? 'completed' : 'idle'
    )
  }

  private notify(event: string, ...payload: unknown[]) {
    this.callbacks.notify(event, ...payload)
  }

  private setStatus(status: EngineStatus) {
    if (status === this.currentStatus) return
    this.currentStatus = status
    this.notify('status:changed', status)
  }

  private markPending(ids: string[], graphId = '') {
    for (const id of this.compiled.reachable(ids, graphId)) this.setNodeStatus(id, 'pending')
  }

  async process() {
    const session = this.session!
    this.markPending([...this.entryPorts].map((key) => key.split(':')[0]))
    await Promise.all(
      [...this.entryPorts].map(async (port) => {
        const node = this.flowStackGraph.get(port)!.node
        this.readyGraph.set(node.id, this.flowStackGraph.get(port)!)
        if (await this.prepareStartNode(node, '', session)) await this.executeEntry(port, '', undefined, session)
      })
    )
  }

  stop() {
    const session = this.session
    if (!session) return
    this.session = undefined
    session.controller.abort()
    session.resume?.()
    this.resetNodeStatuses()
    this.setStatus('stopped')
  }

  resume() {
    const session = this.session
    if (!session?.pausePromise) return
    const resume = session.resume
    if (session.pausedAt !== undefined) session.pausedMs += Date.now() - session.pausedAt
    session.pausedAt = undefined
    session.pausePromise = undefined
    session.pausedNode = undefined
    session.resume = undefined
    this.setStatus('running')
    resume?.()
  }

  setBreakpoint(nodeId: string, enabled: boolean) {
    const node = this.runtime.nodes.get(nodeId)
    if (node) node.breakpoint = enabled
  }

  private async track(action: () => Promise<void>) {
    this.callbacks.activity(1)
    try {
      await action()
    } finally {
      this.callbacks.activity(-1)
    }
  }

  async handleNodeEvents(
    name: string,
    payload: unknown[],
    handlers: { nodeId: string; handler: NodeEventHandler; subscribed: () => boolean }[]
  ) {
    const session = this.session!
    await Promise.all([
      ...handlers.map(async (entry) => {
        const node = this.runtime.nodes.get(entry.nodeId)!
        if (!(await this.waitUntilRunning(session)) || !entry.subscribed()) return
        this.markPending([node.id], node.graphId)
        if (!(await this.waitForNode(node, node.graphId, session)) || !entry.subscribed()) return
        const tasks = new Set<Promise<void>>()
        const ctx = this.buildExecContext(node, {}, session)
        const graphNode: GraphNode = {
          node,
          port: { id: 'out-event', name: 'event', type: 'exec' },
          prev: [],
          next: [],
          dataInputs: {},
        }
        ctx.next = (nextExecs?: string[]) => {
          if (!this.isActive(session)) return Promise.resolve()
          this.setNodeStatus(node.id, 'completed')
          const task = this.track(() => this.advanceNode(graphNode, node.graphId, undefined, session, nextExecs))
          tasks.add(task)
          void task.then(
            () => tasks.delete(task),
            (error) => {
              tasks.delete(task)
              if (this.isActive(session)) this.notify('node:error', error, node.id)
            }
          )
          return task
        }
        try {
          this.loops.activate(node.id)
          this.setNodeStatus(node.id, 'running')
          await entry.handler(ctx, ...structuredClone(payload))
          if (this.isActive(session)) this.setNodeStatus(node.id, 'completed')
          await Promise.all(tasks)
        } catch (error) {
          if (this.isActive(session)) this.notify('node:error', error, node.id)
        }
      }),
      ...[...this.runtime.nodeListeners].map(async ([nodeId, node]) => {
        if (!(await this.waitUntilRunning(session))) return
        try {
          const ctx = this.buildExecContext(node, {}, session)
          const response = node.onEvent!(name, ...structuredClone(payload), ctx)
          if (!response?.trigger || !this.isActive(session)) return
          this.markPending([nodeId], node.graphId)
          const inputs = node.inputs.filter((port) => port.type === 'exec')
          if (inputs.length)
            await Promise.all(inputs.map((port) => this.executeEntry(`${nodeId}:${port.id}`, node.graphId)))
          else {
            const graph = node.graphId ? this.subFlowStackGraph.get(node.graphId)! : this.flowStackGraph
            const key = `${node.id}:in-event`
            graph.set(key, {
              node,
              port: { id: 'in-event', name: 'event', type: 'exec' },
              prev: [],
              next: [],
              dataInputs: {},
            })
            await this.executeEntry(key, node.graphId)
          }
        } catch (error) {
          if (this.isActive(session)) this.notify('node:error', error, nodeId)
        }
      }),
    ])
  }

  private buildExecContext(
    node: NodeInstanceType,
    opt: { ctx?: unknown; error?: unknown } = {},
    session = this.session
  ) {
    return createExecutionContext(node, {
      taskId: this.taskId,
      signal: session?.controller.signal,
      ctx: opt.ctx ?? this.options.ctx,
      error: opt.error,
      nodeState: this.callbacks.nodeState(node.id),
      isActive: () => !!session && this.isActive(session),
      getService: (name) => this.runtime.getService(name),
      emit: this.callbacks.emit,
    })
  }

  private isActive(session: ExecutionSession) {
    return this.session === session && !session.controller.signal.aborted
  }

  private async waitUntilRunning(session: ExecutionSession) {
    while (this.isActive(session) && session.pausePromise) {
      await session.pausePromise
    }
    return this.isActive(session)
  }

  private async waitForNode(node: NodeInstanceType, subgraphId: string, session: ExecutionSession, scope?: Pick<BreakpointHit, 'frameId' | 'loop'>, signal = session.controller.signal) {
    while (this.isActive(session) && session.pausePromise) {
      await session.pausePromise
    }
    if (!this.isActive(session) || signal.aborted) return false
    if (session.debug && node.breakpoint) {
      session.pausePromise = new Promise((resolve) => {
        session.resume = resolve
      })
      session.pausedAt = Date.now()
      session.pausedNode = {
        nodeId: node.id,
        nodeType: node.nodeType,
        subgraphId,
        inputs: { ...node.inputValues },
        ...scope,
      }
      this.setStatus('paused')
      this.notify('breakpoint:hit', session.pausedNode)
      const pause = session.pausePromise
      const cancelPause = () => { if (session.pausePromise === pause) this.resume() }
      signal.addEventListener('abort', cancelPause, { once: true })
      if (signal.aborted) cancelPause()
      try { await pause }
      finally { signal.removeEventListener('abort', cancelPause) }
    }
    return !signal.aborted && this.waitUntilRunning(session)
  }

  private async prepareStartNode(node: NodeInstanceType, subgraphId: string, session: ExecutionSession) {
    this.loops.activate(node.id)
    this.updateNodeActivity(node.id, session, { pending: 1 })
    if (!(await this.waitForNode(node, subgraphId, session)) || !this.isActive(session)) return false
    this.updateNodeActivity(node.id, session, { pending: -1, completed: true })
    return true
  }

  public async executeSubgraph(
    graphNode: GraphNode,
    ready: Map<string, GraphNode>,
    error?: unknown,
    session = this.session,
    parentGraphId = '',
    onComplete?: () => void
  ) {
    if (!session || !this.isActive(session)) return
    const { node } = graphNode
    const subgraphId = node.subgraphId!
    const subEntryPort = this.subEntryPort.get(subgraphId)!
    const graph = this.subFlowStackGraph.get(subgraphId)!
    if (graph.has(subEntryPort)) {
      const subStartNodeGraph = graph.get(subEntryPort)!
      // Map parent call inputs by name to subgraph entry parameters.
      applySubgraphEntryParams(node, subStartNodeGraph.node)
      this.subReadyGraph.get(subgraphId)!.set(subStartNodeGraph.node.id, subStartNodeGraph)
      if (await this.prepareStartNode(subStartNodeGraph.node, subgraphId, session)) {
        await this.executeEntry(subEntryPort, subgraphId, error, session)
      }
    }
    if (!this.isActive(session)) return
    // Write subgraph exit parameters to parent call outputs.
    applySubgraphExitParams(node, this.findSubgraphExit(subgraphId))
    onComplete?.()
    ready.set(node.id, graphNode)
    const execPort = node.outputs.find((o) => o.type === 'exec')
    if (!execPort) return
    const execPortId = node.id + ':' + execPort.id
    await this.executeEntry(execPortId, parentGraphId, error, session)
  }

  /** Subgraph end node; regions without an end do not return parameters. */
  private findSubgraphExit(subgraphId: string) {
    for (const item of this.subFlowStackGraph.get(subgraphId)?.values() ?? []) {
      if (item.node.type === 'end') return item.node
    }
    return undefined
  }

  public async executeEntry(portId: string, subgraphId = '', error?: unknown, session = this.session) {
    if (!session || !this.isActive(session)) return
    const graph = subgraphId ? this.subFlowStackGraph.get(subgraphId)! : this.flowStackGraph
    const waiting = subgraphId ? this.subWaitingGraph.get(subgraphId)! : this.waitingGraph
    const ready = subgraphId ? this.subReadyGraph.get(subgraphId)! : this.readyGraph
    let graphNode = graph.get(portId)
    if (!graphNode) return
    if (graphNode.node.type === 'loop' && graphNode.port.id.startsWith('in-')) {
      // Concurrent paths may enter one node; each call owns its inputs and final outputs.
      graphNode = { ...graphNode, node: this.loops.createInvocationNode(graphNode.node) }
    }

    const { node, port, dataInputs } = graphNode

    if (port.id.startsWith('in-')) {
      if (!waiting.has(portId)) this.updateNodeActivity(node.id, session, { pending: 1 })
      // Wait for dependencies before breakpoints so actual inputs are available.
      if (dataInputs) {
        for (const depPort of Object.values(dataInputs)) {
          const depNodeId = depPort.split(':')[0]
          if (!ready.has(depNodeId)) {
            waiting.set(portId, graphNode)
            return
          }
        }
      }

      waiting.delete(portId)
      let phase: 'pending' | 'running' | undefined = 'pending'
      const completeNode = () => {
        if (!phase) return
        const completedPhase = phase
        phase = undefined
        this.updateNodeActivity(node.id, session, { [completedPhase]: -1, completed: true })
      }
      try {
        this.loops.activate(node.id)
        this.prepareInputs(graphNode, ready)
        if (!(await this.waitForNode(node, subgraphId, session))) return
        if (node.type === 'loop') {
          this.updateNodeActivity(node.id, session, { pending: -1, running: 1 })
          phase = 'running'
          await this.loops.run(node)
          if (!this.isActive(session)) return
          this.loops.record(undefined, node)
          completeNode()
          await this.advanceNode(graphNode, subgraphId, error, session, ['done'])
          return
        }
        if (node.type === 'subgraph' && node.subgraphId) {
          this.updateNodeActivity(node.id, session, { pending: -1, running: 1 })
          phase = 'running'
          await this.executeSubgraph(graphNode, ready, error, session, subgraphId, completeNode)
          completeNode()
          return
        }
        if (node.type === 'end') {
          completeNode()
          return
        }

        const nextTasks = new Set<Promise<void>>()
        const ctx = this.buildExecContext(node, { ctx: this.options.ctx || {}, error }, session)
        ctx.next = (nextExecs?: string[]) => {
          // next hands off execution; awaiting downstream Promises does not extend this node's running state.
          completeNode()
          const task = this.track(() => this.advanceNode(graphNode, subgraphId, error, session, nextExecs))
          nextTasks.add(task)
          // Delayed next may repeat; do not accumulate finished tasks in persistent sessions.
          void task.then(
            () => nextTasks.delete(task),
            (err) => {
              nextTasks.delete(task)
              if (this.isActive(session)) this.notify('node:error', err, node.id)
            }
          )
          return task
        }
        while (this.isActive(session) && session.pausePromise) await session.pausePromise
        if (!this.isActive(session)) return
        this.updateNodeActivity(node.id, session, { pending: -1, running: 1 })
        phase = 'running'
        await this.runtime.executeNode(node, ctx)
        completeNode()
        await Promise.all(nextTasks)
      } catch (err) {
        if (!this.isActive(session)) return
        console.error(`Node ${portId} execution failed`, err)
        this.errorNodes.add(node.id)
        this.notify('node:error', err, node.id)
      } finally {
        if (phase) this.updateNodeActivity(node.id, session, { [phase]: -1 })
      }
    } else if (port.id.startsWith('out-')) {
      if (!(await this.waitUntilRunning(session)) || !this.isActive(session)) return
      const tasks = graphNode.next.map((next) => {
        return this.executeEntry(next, subgraphId, error, session)
      })
      await Promise.all(tasks)
    }
  }

  private async advanceNode(
    graphNode: GraphNode,
    subgraphId: string,
    error: unknown,
    session: ExecutionSession,
    nextExecs?: string[]
  ) {
    const { node } = graphNode
    const ready = subgraphId ? this.subReadyGraph.get(subgraphId)! : this.readyGraph
    const waiting = subgraphId ? this.subWaitingGraph.get(subgraphId)! : this.waitingGraph
    if (!(await this.waitUntilRunning(session)) || !this.isActive(session)) return
    ready.set(node.id, graphNode)
    const execPorts = node.outputs.filter(
      (o) => o.type === 'exec' && (!nextExecs?.length || nextExecs.includes(o.name))
    )
    await Promise.all(
      execPorts.map((outPort) => this.executeEntry(node.id + ':' + outPort.id, subgraphId, error, session))
    )
    if (!this.isActive(session)) return
    const pending: Promise<void>[] = []
    for (const [waitingPort, waitingNode] of waiting) {
      if (Object.values(waitingNode.dataInputs).every((dep) => ready.has(dep.split(':')[0]))) {
        pending.push(this.executeEntry(waitingPort, subgraphId, error, session))
      }
    }
    await Promise.all(pending)
  }

  private prepareInputs(graphNode: GraphNode, ready: Map<string, GraphNode>) {
    const { dataInputs, node } = graphNode
    if (dataInputs) {
      for (const [inputKey, depPort] of Object.entries(dataInputs)) {
        const depNodeId = depPort.split(':')[0]
        const depNode = ready.get(depNodeId)?.node
        if (depNode) {
          const inputId = inputKey
          const inputName = node.inputs.find((i) => i.id === inputId)?.name || ''
          const outputId = depPort.split(':')[1]
          const outputName = depNode.outputs.find((o) => o.id === outputId)?.name || ''
          const value = depNode.getOutput(outputName)
          const loopBoundary = node.type === 'loop' || depNode.type === 'loop'
          if (value !== undefined || loopBoundary) node.setInput(inputName, loopBoundary ? structuredClone(value) : value)
        }
      }
    }
  }
}
