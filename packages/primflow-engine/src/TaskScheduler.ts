import { portTypeId, isDataPort } from '@lyx-pj/primflow-model'
import { StreamChannel } from './StreamChannel'
import type { JsonGraph, JsonValue, NodeExecutionStatus, NodeClassType, NodeEvent, NodeEventContext, NodeEventHandler, NodeFailure, NodeRegistry, NodeExecutionContext, TaskState, TaskStateSnapshot } from '@lyx-pj/primflow-model'
import { bindInput, describeInputSource, inputsReady, type ExecutionPath, type InputSelections, type PublishedValues, type StateInput } from './DataDependencies'
import { GraphCompiler, graphPortKey, type ExecutionPortEntry } from './GraphCompiler'
import { createExecutionContext } from './ExecutionContext'
import { LoopController, LoopExecutionError } from './LoopController'
import type { ExecutionNode } from './ExecutionNode'
import { loadGraphNodes } from './GraphLoader'
import type { NodeExecutor } from './NodeExecutor'
import { applySubgraphEntryParams, applySubgraphExitParams } from './SubgraphParams'
import type { TaskStateActivation, TaskStateStore } from './TaskStateStore'
import { describeFailure, RetryController, RetryTimeoutError, StateInputReadError, type RetryActivation, type RetryInput, type RetryTiming } from './RetryController'
import { TaskInterrupts, type InterruptActivation } from './TaskInterrupts'
import type { TaskTraceRecorder } from './TaskTrace'
import type { ActivationInputSource, BreakpointHit, EngineStatus, EngineOptions, TaskStateCommit, WaitingInput } from './types'

type NodeOutcome = 'completed' | 'failed'
type NodeActivity = { pending?: number; running?: number; interrupted?: number; outcome?: NodeOutcome }

type TaskExecutionState = {
  nodes: Map<string, Required<Omit<NodeActivity, 'outcome'>> & { outcome?: NodeOutcome }>
  controller: AbortController
  debug: boolean
  pausedNode?: BreakpointHit
  pausePromise?: Promise<void>
  resume?: () => void
  pausedAt?: number
  pausedMs: number
}

export type TaskCallbacks = {
  trace?: TaskTraceRecorder
  notify: (event: string, ...payload: unknown[]) => void
  activity: (delta: number) => void
  emit: (activationId: number | undefined, name: string, ...payload: unknown[]) => void
  nodeState: (nodeId: string) => Record<string, unknown> | undefined
}

type WaitingEntry = {
  portId: string
  activationId?: number
  parentActivationId?: number
  error?: unknown
  path?: ExecutionPath
  selections?: InputSelections
  initialOutputs?: PublishedValues
  event?: NodeEvent
  eventEntry?: ExecutionPortEntry
  stream?: StreamChannel
}
type WaitingGraph = Map<string | WaitingEntry, WaitingEntry>
type PortValues = { inputs: Record<string, unknown>; outputs: Record<string, unknown> }
type PreparedReplay = {
  stage: ReturnType<TaskStateStore['stage']>
  activations: Map<RetryActivation, RetryActivation>
  inputs: Record<string, unknown>
  sources: Map<string, RetryInput>
}

/** Single-task scheduler owning mutable dependencies, node instances, and pause waiters. */
export class TaskScheduler<NodeDefs extends Record<string, NodeClassType>> {
  private flowStackGraph: Map<string, ExecutionPortEntry>
  private entryPorts: Set<string>
  private subEntryPort = new Map<string, string>()
  private waitingGraph: WaitingGraph = new Map()
  private readyGraph = new Map<string, ExecutionPortEntry>()
  private subFlowStackGraph = new Map<string, Map<string, ExecutionPortEntry>>()
  private subWaitingGraph = new Map<string, WaitingGraph>()
  private publications = new Map<string, PublishedValues>()
  private readyActivations = new Map<string, RetryActivation>()
  readonly retries: RetryController
  private initialPorts = new Map<string, PortValues>()
  private subReadyGraph = new Map<string, Map<string, ExecutionPortEntry>>()
  private roots = new Map<string, Set<string>>()
  private nodeStatuses = new Map<string, import('@lyx-pj/primflow-model').NodeExecutionStatus>()
  private session?: TaskExecutionState
  private currentStatus: EngineStatus = 'idle'
  private compiled: GraphCompiler
  private nodesById: Map<string, ExecutionNode>
  private eventNodes: ExecutionNode[]
  private nodeExecutor: NodeExecutor
  readonly options: EngineOptions
  private taskId: string
  private state: TaskStateStore
  private callbacks: TaskCallbacks
  private trace?: TaskTraceRecorder
  private readonly streamWork = new Set<Promise<void>>()
  private executionSequence = 0
  private producers = new Map<string, number>()
  private interruptions: TaskInterrupts
  readonly loops: LoopController

  constructor(
    registry: NodeRegistry<NodeDefs>,
    nodeExecutor: NodeExecutor,
    json: JsonGraph,
    options: EngineOptions & { retry: RetryTiming },
    taskId: string,
    state: TaskStateStore,
    callbacks: TaskCallbacks,
    defaults: ExecutionNode[] = []
  ) {
    this.nodeExecutor = nodeExecutor
    this.options = options
    this.taskId = taskId
    this.state = state
    this.callbacks = callbacks
    this.trace = callbacks.trace
    this.retries = new RetryController(options.retry, (attempt) => {
      const { activationId, id, status, handled } = attempt
      if (activationId !== undefined) this.trace?.record({ type: 'activation:attempt', activationId, attemptId: id, status, handled })
      this.notify('task:node:attempt', structuredClone(attempt))
    })
    const graph = loadGraphNodes(registry, structuredClone(json))
    this.nodesById = graph.nodesById
    this.eventNodes = [...this.nodesById.values()].filter((node) => node.onEvent)
    this.compiled = new GraphCompiler(graph)
    for (const initial of defaults) {
      const node = this.nodesById.get(initial.id)
      if (!node) continue
      node.inputValues = structuredClone(initial.inputValues)
      node.outputValues = structuredClone(initial.outputValues)
      node.data = structuredClone(initial.data)
    }
    const nodesWithSelections = new Set(this.compiled.selectionSources)
    for (const graph of this.compiled.graphs.values()) {
      for (const item of graph.values()) {
        if (item.hasMultipleSources) nodesWithSelections.add(item.node.id)
      }
    }
    for (const id of nodesWithSelections) {
      const node = this.nodesById.get(id)!
      this.initialPorts.set(id, { inputs: { ...node.inputValues }, outputs: { ...node.outputValues } })
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
    this.interruptions = new TaskInterrupts(taskId, (nodeId, delta) => {
      this.updateNodeActivity(nodeId, session, { interrupted: delta })
      this.notify('interrupts:changed')
    }, (interruptId, activationId, status) => {
      if (activationId !== undefined) this.trace?.record({ type: 'activation:interrupt', activationId, interruptId, status })
    })
    this.loops = new LoopController(this.nodesById, nodeExecutor, this.compiled, options, {
      taskId,
      progress: (nodeId, frameId, activationId) => this.createProgress(nodeId, frameId, activationId),
      trace: this.trace,
      signal: session.controller.signal,
      wait: (node, scope, signal, activationId) => this.waitForNode(node, node.graphId, session, scope, signal, activationId),
      activity: (nodeId, delta) => this.updateNodeActivity(nodeId, session, delta),
      skipped: (nodeId, activationId) => this.markSkipped(nodeId, session, activationId),
      interrupt: (node, scope, signal, isActive, activationId) => this.activateInterrupt(node, session, isActive, scope, signal, activationId),
      nodeState: callbacks.nodeState,
      readState: () => this.state.readSnapshot(),
      state: (nodeId, isActive, canUpdate, activationId) => this.activateState(nodeId, isActive, canUpdate, activationId),
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

  get interrupts() {
    return this.interruptions.list()
  }

  resumeInterrupt(id: string, answer: JsonValue) {
    return this.interruptions.resume(id, answer)
  }

  public getNodeStatus(nodeId: string): NodeExecutionStatus {
    return this.nodeStatuses.get(nodeId) ?? 'idle'
  }

  public getNodeStatuses(): ReadonlyMap<string, NodeExecutionStatus> {
    return new Map(this.nodeStatuses)
  }

  getActiveNodeIds() {
    return [...(this.session?.nodes ?? [])]
      .filter(([, activity]) => activity.pending > 0 || activity.running > 0)
      .map(([nodeId]) => nodeId)
  }

  /** Read completed port values or active breakpoint inputs for application execution previews. */
  public getNodeExecutionData(nodeId: string) {
    if (this.pausedNode?.nodeId === nodeId) {
      return { inputs: { ...this.pausedNode.inputs }, outputs: {} }
    }
    if (this.getNodeStatus(nodeId) !== 'completed') return undefined
    const frameData = this.loops.latestData.get(nodeId)
    if (frameData) return structuredClone(frameData)
    const node = this.nodesById.get(nodeId)
    if (!node) return undefined
    return {
      inputs: Object.fromEntries(
        node.inputs
          .filter((port) => isDataPort(port.type))
          .map((port) => [port.name, node.getInput(port.name)])
      ),
      outputs: Object.fromEntries(
        node.outputs
          .filter((port) => isDataPort(port.type))
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
    session: TaskExecutionState,
    delta: NodeActivity
  ) {
    if (!this.isActive(session)) return
    const activity = session.nodes.get(nodeId) ?? { pending: 0, running: 0, interrupted: 0 }
    activity.pending += delta.pending ?? 0
    activity.running += delta.running ?? 0
    activity.interrupted += delta.interrupted ?? 0
    activity.outcome = delta.outcome ?? activity.outcome
    session.nodes.set(nodeId, activity)
    // A node may run in concurrent event tasks; one completion must not overwrite other active tasks.
    this.setNodeStatus(
      nodeId,
      activity.interrupted > 0 ? 'interrupted' : activity.running > 0 ? 'running'
        : activity.pending > 0 ? 'pending' : activity.outcome ?? 'idle'
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
    const roots = this.roots.get(graphId) ?? new Set<string>()
    for (const id of ids) roots.add(id)
    this.roots.set(graphId, roots)
    for (const id of this.compiled.reachable(ids, graphId)) {
      const status = this.getNodeStatus(id)
      if (status === 'idle' || status === 'skipped') this.setNodeStatus(id, 'pending')
    }
  }

  private markSkipped(nodeId: string, session: TaskExecutionState, activationId?: number) {
    if (!this.isActive(session)) return
    const status = this.getNodeStatus(nodeId)
    if (status !== 'idle' && status !== 'pending') return
    if (session.nodes.get(nodeId)?.pending) return
    if (activationId !== undefined) this.trace?.record({ type: 'branch:skipped', activationId, nodeId })
    this.setNodeStatus(nodeId, 'skipped')
  }

  async runStartTask() {
    const session = this.session!
    this.markPending([...this.entryPorts].map((key) => this.flowStackGraph.get(key)!.node.id))
    await Promise.all(
      [...this.entryPorts].map(async (port) => {
        const entry = this.flowStackGraph.get(port)!
        const { node } = entry
        this.readyGraph.set(node.id, entry)
        const activationId = this.trace?.begin(node, entry.port.id, { kind: 'entry' })
        if (activationId !== undefined) this.producers.set(node.id, activationId)
        if (await this.prepareStartNode(node, '', session, activationId)) {
          const path = this.publishPath(node, undefined, undefined, activationId)
          this.traceHandoff(activationId, [entry.port.name])
          await this.executeEntry({ portId: port, path, parentActivationId: activationId }, '', session)
        }
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
    const node = this.nodesById.get(nodeId)
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

  async runEventTask(
    name: string,
    payload: unknown[],
    handlers: { nodeId: string; handler: NodeEventHandler; subscribed: () => boolean }[]
  ) {
    const session = this.session!
    await Promise.all([
      ...handlers.map(async (entry) => {
        const node = this.nodeForActivation(this.nodesById.get(entry.nodeId)!)
        if (!(await this.waitUntilRunning(session)) || !entry.subscribed()) return
        this.markPending([node.id], node.graphId)
        const tasks = new Set<Promise<void>>()
        const activationId = this.trace?.begin(node, 'out-event', { kind: 'event-handler' })
        const state = this.activateState(node.id, () => this.isActive(session), undefined, activationId)
        const report = this.errorReporter(node, session, activationId)
        const ctx = this.buildExecutionContext(node, session, state.state, undefined, false, undefined, activationId)
        let phase: 'pending' | 'running' | undefined = 'pending'
        this.updateNodeActivity(node.id, session, { pending: 1 })
        const interrupts = this.activateInterrupt(node, session, () => phase === 'running', undefined, undefined, activationId)
        ctx.interrupt = interrupts.request
        const complete = () => {
          if (!phase) return
          const completedPhase = phase
          phase = undefined
          interrupts.close()
          this.trace?.finish(activationId, 'completed', node)
          this.updateNodeActivity(node.id, session, { [completedPhase]: -1, outcome: 'completed' })
        }
        const graphNode: ExecutionPortEntry = {
          node,
          port: { id: 'out-event', name: 'event', type: 'exec' },
          direction: 'output',
          prev: [],
          next: [],
          dataInputs: {},
        }
        let executor: Promise<void> | undefined
        let selfRequested = false
        let handedOff = false
        const event = { name, payload: structuredClone(payload) }
        const eventCtx: NodeEventContext = Object.assign(ctx, {
          event,
          executeSelf: () => {
            if (executor) return executor
            if (!this.isActive(session) || phase !== 'running' || handedOff || selfRequested) return Promise.resolve()
            selfRequested = true
            const port = { id: 'in-event', name: 'event', type: 'exec' }
            state.commit()
            complete()
            executor = this.track(() => this.executeEntry({
              portId: graphPortKey(node.id, port.id),
              parentActivationId: activationId,
              initialOutputs: { ...node.outputValues },
              event: { name, payload: structuredClone(payload) },
              eventEntry: { node: this.nodesById.get(node.id)!, port, direction: 'input', prev: [], next: [], dataInputs: {} },
            }, node.graphId, session))
            return executor
          },
        })
        ctx.next = (nextExecs?: string[]) => {
          if (!this.isActive(session) || selfRequested) return Promise.resolve()
          handedOff = true
          const task = this.track(async () => {
            state.commit()
            complete()
            await this.advanceNode(graphNode, node.graphId, undefined, session, nextExecs, undefined, undefined, activationId)
          })
          tasks.add(task)
          void task.then(
            () => tasks.delete(task),
            (error) => {
              tasks.delete(task)
              state.discard()
              report(error)
            }
          )
          return task
        }
        try {
          if (!(await this.waitForNode(node, node.graphId, session, undefined, undefined, activationId)) || !entry.subscribed()) return
          this.loops.activate(node.id)
          this.trace?.start(activationId)
          this.updateNodeActivity(node.id, session, { pending: -1, running: 1 })
          phase = 'running'
          if (!this.isActive(session)) return
          if (!entry.subscribed()) return
          await entry.handler(eventCtx, ...structuredClone(payload))
          await executor
          state.commit()
          if (this.isActive(session)) {
            this.recordInputs(node)
            complete()
          }
          await Promise.all(tasks)
        } catch (error) {
          state.discard()
          report(error)
        } finally {
          await executor
          interrupts.close()
          if (phase) this.updateNodeActivity(node.id, session, { [phase]: -1 })
          this.trace?.finish(activationId, 'cancelled')
          phase = undefined
        }
      }),
      ...this.eventNodes.map(async (taskNode) => {
        const nodeId = taskNode.id
        if (!(await this.waitUntilRunning(session))) return
        const activationId = this.trace?.begin(taskNode, 'in-event', { kind: 'event-filter' })
        const state = this.activateState(nodeId, () => this.isActive(session), undefined, activationId)
        try {
          const node = this.nodeForActivation(taskNode)
          const ctx = this.buildExecutionContext(node, session, state.state, undefined, false, undefined, activationId)
          this.trace?.start(activationId)
          const response = node.onEvent!(name, ...structuredClone(payload), ctx)
          const triggered = Boolean(response?.trigger)
          if (activationId !== undefined) this.trace?.record({ type: 'activation:event-filter', activationId, triggered })
          if (!triggered || !this.isActive(session)) {
            this.trace?.finish(activationId, 'completed', node)
            return
          }
          state.commit()
          state.discard()
          this.trace?.finish(activationId, 'completed', node)
          this.markPending([nodeId], node.graphId)
          const inputs = node.inputs.filter((port) => port.type === 'exec')
          const initialOutputs = node === taskNode ? undefined : { ...node.outputValues }
          const execute = (portId: string) => this.executeEntry({ portId, initialOutputs, parentActivationId: activationId }, node.graphId, session)
          if (inputs.length)
            await Promise.all(inputs.map((port) => execute(graphPortKey(nodeId, port.id))))
          else {
            const graph = node.graphId ? this.subFlowStackGraph.get(node.graphId)! : this.flowStackGraph
            const key = graphPortKey(node.id, 'in-event')
            graph.set(key, {
              node: taskNode,
              port: { id: 'in-event', name: 'event', type: 'exec' },
              direction: 'input',
              prev: [],
              next: [],
              dataInputs: {},
            })
            await execute(key)
          }
        } catch (error) {
          this.errorReporter(taskNode, session, activationId)(error)
        } finally {
          state.discard()
        }
      }),
    ])
  }

  private activateState(nodeId: string, isActive: () => boolean, canUpdate = isActive, activationId?: number) {
    return this.state.activate(
      isActive,
      (commit) => this.reportStateCommit({ nodeId, ...commit }, activationId),
      canUpdate
    )
  }

  private reportStateCommit(commit: TaskStateCommit, activationId?: number) {
    this.trace?.record({ type: 'state:committed', nodeId: commit.nodeId, activationId, version: commit.version })
    this.notify('task:state:committed', commit)
  }

  private activateInterrupt(
    node: ExecutionNode, session: TaskExecutionState, isActive: () => boolean,
    scope?: Pick<BreakpointHit, 'frameId' | 'loop'>, signal = session.controller.signal, activationId?: number,
  ) {
    return this.interruptions.activate({ nodeId: node.id, subgraphId: node.graphId, ...scope }, signal,
      () => this.isActive(session) && isActive(), activationId)
  }

  private errorReporter(node: ExecutionNode, session: TaskExecutionState, activationId?: number) {
    const reported = new Set<unknown>()
    return (error: unknown, result = node) => {
      if (!this.isActive(session) || reported.has(error)) return
      reported.add(error)
      this.trace?.finish(activationId, 'failed', result, error)
      this.updateNodeActivity(node.id, session, { outcome: 'failed' })
      if (error instanceof LoopExecutionError && error.nodeId !== node.id) {
        this.updateNodeActivity(error.nodeId, session, { outcome: 'failed' })
      }
      this.notify('node:error', error, node.id)
    }
  }

  private createProgress(nodeId: string, frameId?: string, activationId?: number) {
    const executionId = ++this.executionSequence
    let sequence = 0
    return (channel: string, value: JsonValue) => {
      this.notify('task:node:progress', { nodeId, frameId, executionId, activationId, channel, sequence: ++sequence, value: structuredClone(value) })
    }
  }

  private buildExecutionContext(
    node: ExecutionNode, session: TaskExecutionState, state: TaskState, error?: unknown,
    isolated = false, active = () => true, activationId?: number,
  ): NodeExecutionContext {
    const taskNode = this.nodesById.get(node.id)!
    const ctx = createExecutionContext(node, {
      taskId: this.taskId,
      signal: session.controller.signal,
      context: this.options.context,
      error,
      nodeState: this.callbacks.nodeState(node.id),
      isActive: () => this.isActive(session) && active(),
      services: this.nodeExecutor.services,
      progress: this.createProgress(node.id, undefined, activationId),
      onOutput: isolated || node === taskNode ? undefined : (name, value) => { taskNode.outputValues[name] = value },
      emit: (name, ...payload) => {
        if (activationId !== undefined) this.trace?.record({ type: 'activation:emit', activationId, eventName: name })
        this.callbacks.emit(activationId, name, ...payload)
      },
    })
    return { ...ctx, state }
  }

  private isActive(session: TaskExecutionState) {
    return this.session === session && !session.controller.signal.aborted
  }

  private async waitUntilRunning(session: TaskExecutionState) {
    while (this.isActive(session) && session.pausePromise) {
      await session.pausePromise
    }
    return this.isActive(session)
  }

  private async waitForNode(node: ExecutionNode, subgraphId: string, session: TaskExecutionState, scope?: Pick<BreakpointHit, 'frameId' | 'loop'>, signal = session.controller.signal, activationId?: number) {
    while (this.isActive(session) && session.pausePromise) {
      await session.pausePromise
    }
    if (!this.isActive(session) || signal.aborted) return false
    if (session.debug && this.nodesById.get(node.id)?.breakpoint) {
      session.pausePromise = new Promise((resolve) => {
        session.resume = resolve
      })
      session.pausedAt = Date.now()
      session.pausedNode = {
        nodeId: node.id,
        nodeType: node.definitionId,
        subgraphId,
        inputs: { ...node.inputValues },
        ...scope,
      }
      if (activationId !== undefined) this.trace?.record({ type: 'activation:breakpoint', activationId })
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

  private async prepareStartNode(node: ExecutionNode, subgraphId: string, session: TaskExecutionState, activationId?: number) {
    try {
      this.loops.activate(node.id)
      this.updateNodeActivity(node.id, session, { pending: 1 })
      if (!(await this.waitForNode(node, subgraphId, session, undefined, undefined, activationId)) || !this.isActive(session)) return false
      this.trace?.start(activationId)
      this.trace?.finish(activationId, 'completed', node)
      this.updateNodeActivity(node.id, session, { pending: -1, outcome: 'completed' })
      return true
    } catch (error) {
      this.trace?.finish(activationId, 'failed', node, error)
      throw error
    }
  }

  public async executeSubgraph(
    graphNode: ExecutionPortEntry,
    ready: Map<string, ExecutionPortEntry>,
    error?: unknown,
    session = this.session,
    parentGraphId = '',
    onComplete?: () => void,
    path?: ExecutionPath,
    activationId?: number,
  ) {
    if (!session || !this.isActive(session)) return
    const { node } = graphNode
    const subgraphId = node.targetGraphId!
    const subEntryPort = this.subEntryPort.get(subgraphId)!
    const graph = this.subFlowStackGraph.get(subgraphId)!
    if (graph.has(subEntryPort)) {
      const subStartNodeGraph = graph.get(subEntryPort)!
      // Map parent call inputs by name to subgraph entry parameters.
      applySubgraphEntryParams(node, subStartNodeGraph.node)
      this.subReadyGraph.get(subgraphId)!.set(subStartNodeGraph.node.id, subStartNodeGraph)
      const entryId = this.trace?.begin(subStartNodeGraph.node, subStartNodeGraph.port.id, { kind: 'entry', parentActivationId: activationId })
      if (entryId !== undefined) this.producers.set(subStartNodeGraph.node.id, entryId)
      if (await this.prepareStartNode(subStartNodeGraph.node, subgraphId, session, entryId)) {
        const entryPath = this.publishPath(subStartNodeGraph.node, undefined, undefined, entryId)
        this.traceHandoff(entryId, [subStartNodeGraph.port.name])
        await this.executeEntry({ portId: subEntryPort, error, path: entryPath, parentActivationId: entryId }, subgraphId, session)
      }
    }
    if (!this.isActive(session)) return
    // Write subgraph exit parameters to parent call outputs.
    applySubgraphExitParams(node, this.findSubgraphExit(subgraphId))
    const taskNode = this.nodesById.get(node.id)!
    if (taskNode !== node) Object.assign(taskNode.outputValues, node.outputValues)
    onComplete?.()
    ready.set(node.id, { ...graphNode, node: taskNode })
    if (activationId !== undefined) this.producers.set(node.id, activationId)
    const nextPath = this.publishPath(node, path, undefined, activationId)
    const execPort = node.outputs.find((o) => o.type === 'exec')
    if (execPort) this.traceHandoff(activationId, [execPort.name])
    const pending = this.resumeWaiting(parentGraphId, session, true)
    if (execPort) {
      pending.push(this.executeEntry({ portId: graphPortKey(node.id, execPort.id), error, path: nextPath, parentActivationId: activationId }, parentGraphId, session))
    }
    await Promise.all(pending)
  }

  /** Subgraph end node; regions without an end do not return parameters. */
  private findSubgraphExit(subgraphId: string) {
    for (const item of this.subFlowStackGraph.get(subgraphId)?.values() ?? []) {
      if (item.node.kind === 'end') return item.node
    }
    return undefined
  }

  async waitForStreams() {
    while (this.streamWork.size) await Promise.all(this.streamWork)
  }

  private openStream(node: ExecutionNode, name: string, session: TaskExecutionState, outgoing: Map<string, StreamChannel>, activationId?: number) {
    const port = node.outputs.find(candidate => candidate.name === name)
    const type = port && node.dataTypes.getStream(port.type)
    if (!port || !type || outgoing.has(name)) throw new Error(`Cannot open stream "${node.id}.${name}".`)
    const target = this.compiled.streamTargets.get(graphPortKey(node.id, port.id))
    const validate = (value: unknown) => node.dataTypes.assertValue(portTypeId(type.item), value, `Stream ${node.id}.${name}`)
    const channel = new StreamChannel(session.controller.signal, validate, !!target)
    outgoing.set(name, channel)
    if (target) {
      const targetId = graphPortKey(target.node.id, target.port.id)
      const work = this.executeEntry({ portId: targetId, eventEntry: target, stream: channel, parentActivationId: activationId }, '', session)
        .finally(() => { channel.finishConsumer(); this.streamWork.delete(work) })
      this.streamWork.add(work)
      void work.catch(error => channel.fail(error))
    }
    return channel.writer()
  }

  private async executeEntry(attempt: WaitingEntry, subgraphId = '', session = this.session) {
    const { portId, error, path } = attempt
    if (!session || !this.isActive(session)) return
    const graph = subgraphId ? this.subFlowStackGraph.get(subgraphId)! : this.flowStackGraph
    const waiting = subgraphId ? this.subWaitingGraph.get(subgraphId)! : this.waitingGraph
    const ready = subgraphId ? this.subReadyGraph.get(subgraphId)! : this.readyGraph
    const entry = attempt.eventEntry ?? graph.get(portId)
    if (!entry) return

    const { port } = entry

    if (entry.direction === 'input') {
      if (entry.hasMultipleSources) attempt.selections ??= new Map()
      const waitingKey = attempt.selections ? attempt : portId
      const previous = waiting.get(waitingKey)
      if (attempt.activationId === undefined) {
        attempt.activationId = this.trace?.begin(entry.node, port.id, { kind: 'node', parentActivationId: attempt.parentActivationId })
        this.trace?.finish(previous?.activationId, 'superseded')
      }
      const activationId = attempt.activationId
      if (!waiting.has(waitingKey)) this.updateNodeActivity(entry.node.id, session, { pending: 1 })
      // Wait for dependencies before breakpoints so actual inputs are available.
      if (!this.dependenciesReady(entry, ready, attempt)) {
        waiting.set(waitingKey, attempt)
        return
      }

      waiting.delete(waitingKey)
      let node = this.nodeForActivation(entry.node, attempt.initialOutputs)
      const graphNode = node === entry.node ? entry : { ...entry, node }
      let phase: 'pending' | 'running' | undefined = 'pending'
      let activation: TaskStateActivation | undefined
      let interrupts: InterruptActivation | undefined
      const report = this.errorReporter(node, session, activationId)
      const completeNode = (result = node) => {
        if (!phase) return
        const completedPhase = phase
        phase = undefined
        interrupts?.close()
        this.recordInputs(node)
        this.trace?.finish(activationId, 'completed', result)
        this.updateNodeActivity(node.id, session, { [completedPhase]: -1, outcome: 'completed' })
      }
      try {
        this.loops.activate(node.id)
        const stateInputs = new Map<string, StateInput>()
        let sources = this.prepareInputs(graphNode, ready, attempt.selections, !!this.retries.limit(node.retryPolicy), stateInputs, activationId)
        // Preserve prepared inputs for breakpoints and handle a failed read inside the attempt.
        const initialReadError = this.refreshStateInputs(node, stateInputs, this.state.readSnapshot())
        if (initialReadError && (node.kind === 'loop' || node.kind === 'subgraph' || node.kind === 'end')) throw initialReadError
        if (attempt.event ? !(await this.waitUntilRunning(session)) : !(await this.waitForNode(node, subgraphId, session, undefined, undefined, activationId))) return
        this.trace?.start(activationId)
        if (node.kind === 'loop') {
          this.updateNodeActivity(node.id, session, { pending: -1, running: 1 })
          phase = 'running'
          if (!this.isActive(session)) return
          await this.loops.run(node, undefined, undefined, undefined, undefined, activationId)
          if (!this.isActive(session)) return
          this.loops.record(undefined, node)
          completeNode()
          await this.advanceNode(graphNode, subgraphId, error, session, ['done'], path, undefined, activationId)
          return
        }
        if (node.kind === 'subgraph' && node.targetGraphId) {
          this.updateNodeActivity(node.id, session, { pending: -1, running: 1 })
          phase = 'running'
          if (!this.isActive(session)) return
          await this.executeSubgraph(graphNode, ready, error, session, subgraphId, completeNode, path, activationId)
          completeNode()
          return
        }
        if (node.kind === 'end') {
          completeNode()
          return
        }

        const limit = this.retries.limit(node.retryPolicy)
        const initial = limit ? structuredClone({ inputs: node.inputValues, outputs: node.outputValues }) : undefined
        let retryInputs = initial?.inputs
        let refreshStateInputs = false
        let retryFrom: string | undefined
        let retryDeadline: number | undefined
        let previousFailure: NodeFailure | undefined
        let replay: PreparedReplay | undefined
        for (let retry = 0; await this.waitUntilRunning(session); retry++) {
          if (retry) this.loops.activate(node.id)
          if (initial) {
            node = this.copyForRetry(entry.node, replay?.inputs ?? retryInputs ?? initial.inputs, initial.outputs)
          }
          const current = node === entry.node ? graphNode : { ...entry, node }
          const state = replay
            ? replay.stage.store.activate(() => this.isActive(session), () => {})
            : this.activateState(node.id, () => this.isActive(session), undefined, activationId)
          activation = state
          const nextTasks = new Set<Promise<void>>()
          let handedOff = false
          let handoff: Promise<void> | undefined
          let attemptActive = true
          const ctx = this.buildExecutionContext(node, session, state.state, error, !!limit, () => attemptActive, activationId)
          let progressActive = true
          const emitProgress = ctx.emitProgress
          ctx.emitProgress = (channel, value) => { if (progressActive) emitProgress(channel, value) }
          const outgoingStreams = new Map<string, StreamChannel>()
          ctx.openStream = (name) => {
            if (!progressActive || handedOff || !this.isActive(session)) throw new Error('Stream producer is inactive.')
            return this.openStream(node, name, session, outgoingStreams, activationId)
          }
          if (attempt.stream) {
            ctx.getStream = (name) => {
              if (!progressActive || name !== port.name) throw new Error(`Stream input "${name}" is not connected.`)
              return attempt.stream!.read()
            }
          }
          if (attempt.event) ctx.event = structuredClone(attempt.event)
          interrupts = this.activateInterrupt(node, session, () => phase === 'running', undefined, undefined, activationId)
          ctx.interrupt = interrupts.request
          const publish = (nextExecs?: string[]) => {
            if (!this.isActive(session)) return
            state.commit()
            if (replay) {
              const commit = replay.stage.commit()
              if (commit) this.reportStateCommit({ nodeId: node.id, ...commit }, activationId)
              for (const [step, activation] of replay.activations) {
                const replayed = this.nodesById.get(step.entry.node.id)!
                replayed.inputValues = activation.inputs
                replayed.outputValues = activation.outputs
                ready.set(replayed.id, { ...step.entry, node: replayed })
                if (activation.activationId !== undefined) this.producers.set(replayed.id, activation.activationId)
                this.readyActivations.set(replayed.id, activation)
              }
              replay = undefined
            }
            if (limit) this.nodesById.get(node.id)!.outputValues = { ...node.outputValues }
            if (!nextExecs && !handedOff) return
            completeNode()
            const record = initial && recorded && inputSnapshot && {
              entry,
              attemptId: recorded.id,
              activationId,
              inputs: inputSnapshot,
              initialOutputs: initial.outputs,
              outputs: structuredClone(node.outputValues),
              sources,
              stateInputs: new Map(stateInputs),
              nextEntry: this.singleNextEntry(node, nextExecs),
            }
            return this.advanceNode(current, subgraphId, error, session, nextExecs, path, record, activationId)
          }
          ctx.next = (nextExecs?: string[]) => {
            if (!this.isActive(session) || !attemptActive) return Promise.resolve()
            for (const stream of outgoingStreams.values()) stream.close()
            if (limit && handedOff) return handoff
            handedOff = true
            const pending = this.track(async () => { await publish(nextExecs) })
            handoff = pending
            nextTasks.add(pending)
            void pending.then(
              () => nextTasks.delete(pending),
              (err) => {
                nextTasks.delete(pending)
                state.discard()
                report(err, node)
              }
            )
            return pending
          }
          if (phase === 'pending') {
            this.updateNodeActivity(node.id, session, { pending: -1, running: 1 })
            phase = 'running'
          }
          if (!this.isActive(session)) return
          let inputSnapshot: Record<string, unknown> | undefined
          const recorded = node.retryPolicy && this.retries.begin(node.id, retry, limit, retryFrom, previousFailure, activationId)
          if (recorded) ctx.retry = this.retries.context(recorded)
          try {
            if (!this.isActive(session)) return
            if (retry === 0 && initialReadError) throw initialReadError
            if (refreshStateInputs || replay) {
              const readError = this.refreshStateInputs(node, stateInputs, state.state.snapshot(), replay?.activations)
              if (readError) throw readError
              if (refreshStateInputs && !replay) retryInputs = structuredClone(node.inputValues)
              refreshStateInputs = false
            }
            if (node.retryPolicy) inputSnapshot = structuredClone(node.inputValues)
            await this.nodeExecutor.executeNode(node, ctx, () => { progressActive = false })
            for (const stream of outgoingStreams.values()) stream.close()
            const streamFailure = attempt.stream?.finishConsumer()
            if (streamFailure) throw streamFailure.reason
            if (!this.isActive(session)) {
              this.retries.finish(recorded, 'cancelled')
              return
            }
            if (handedOff) state.commit()
            else publish()
            completeNode()
            await Promise.all(nextTasks)
            if (limit) attemptActive = false
            this.retries.finish(recorded, this.isActive(session) ? 'completed' : 'cancelled', undefined, this.attemptData(node, inputSnapshot))
            return
          } catch (err) {
            for (const stream of outgoingStreams.values()) stream.fail(err)
            attempt.stream?.fail(err)
            const failedAt = performance.now()
            state.discard()
            if (node.retryPolicy) attemptActive = false
            const failure = describeFailure(err)
            const inputSource = failure.inputPort && sources.get(failure.inputPort)
            if (inputSource) {
              failure.inputSource = {
                nodeId: inputSource.producer.entry.node.id,
                port: inputSource.output,
                attemptId: inputSource.producer.attemptId,
              }
            }
            const stateInput = failure.inputPort ? stateInputs.get(failure.inputPort) : undefined
            if (stateInput) {
              const { nodeId, port, stateVersion } = stateInput
              failure.inputSource = { nodeId, port, stateVersion }
            }
            this.retries.finish(recorded, this.isActive(session) ? 'failed' : 'cancelled', failure, this.attemptData(node, inputSnapshot))
            interrupts.close()
            if (handedOff || !this.isActive(session)) throw err
            previousFailure = failure
            let terminalError = err
            const waitForRetry = async (retryIndex: number) => {
              const recordWait = (status: 'scheduled' | 'ready' | 'timeout') => {
                if (activationId !== undefined) this.trace?.record({
                  type: 'activation:retry-wait', activationId, nextAttempt: retryIndex + 2, status,
                })
              }
              retryDeadline ??= this.retries.deadline(failedAt)
              recordWait('scheduled')
              const readiness = await this.retries.wait(retryIndex, retryDeadline, session.controller.signal)
              if (readiness === 'cancelled') return false
              if (readiness === 'timeout') {
                recordWait('timeout')
                terminalError = new RetryTimeoutError(err)
                return false
              }
              if (!(await this.waitUntilRunning(session))) return false
              if (performance.now() >= retryDeadline) {
                recordWait('timeout')
                terminalError = new RetryTimeoutError(err)
                return false
              }
              recordWait('ready')
              return true
            }
            const canRetry = this.retries.canRetry(failure, node.retryPolicy, retry)
            if (canRetry && failure.kind === 'execution' && await waitForRetry(retry)) continue
            replay = undefined
            if (canRetry && failure.kind === 'input' && stateInput && await waitForRetry(retry)) {
              retryFrom = stateInput.nodeId
              refreshStateInputs = true
              continue
            }
            if (canRetry && failure.kind === 'input' && !stateInput && initial) {
              const steps = this.retries.trace(node, entry, sources, failure)
              if (steps && this.isIsolatedReplay(steps, node)) {
                retryFrom = steps[0].entry.node.id
                const replayLimit = steps.reduce((budget, step) =>
                  Math.min(budget, this.retries.limit(step.entry.node.retryPolicy)), limit)
                for (let number = retry + 1; number <= replayLimit && this.isActive(session); number++) {
                  if (!(await waitForRetry(number - 1))) break
                  const result = await this.replayInputs(steps, sources, initial.inputs, number, session, retryFrom, failure, activationId)
                  if (result?.ok) {
                    retry = number - 1
                    replay = result
                    sources = result.sources
                    break
                  }
                  if (result?.failure.kind !== 'execution' || !result.failure.retryable) break
                }
                if (replay) continue
              }
            }
            if (!this.isActive(session)) return
            const fallback = node.retryPolicy?.fallback
            if (!fallback || !node.outputs.some((port) => port.type === 'exec' && port.name === fallback.port)) throw terminalError
            const replacement = structuredClone(fallback.outputs ?? {})
            const fallbackNode = this.copyForRetry(entry.node, node.inputValues, {})
            for (const [name, value] of Object.entries(replacement)) fallbackNode.setOutput(name, value)
            this.nodesById.get(node.id)!.outputValues = { ...fallbackNode.outputValues }
            this.retries.handled(recorded)
            completeNode(fallbackNode)
            await this.advanceNode({ ...entry, node: fallbackNode }, subgraphId, terminalError, session, [fallback.port], path, undefined, activationId)
            return
          } finally {
            if (activationId !== undefined) {
              for (const [port, stream] of outgoingStreams) {
                this.trace?.record({ type: 'activation:stream', activationId, port, chunks: stream.chunks })
              }
            }
            if (limit) attemptActive = false
          }
        }
      } catch (err) {
        activation?.discard()
        attempt.stream?.fail(err)
        if (!this.isActive(session)) return
        console.error(`Node ${portId} execution failed`, err)
        report(err, node)
      } finally {
        interrupts?.close()
        if (phase) this.updateNodeActivity(node.id, session, { [phase]: -1 })
        this.trace?.finish(activationId, 'cancelled')
        phase = undefined
      }
    } else if (entry.direction === 'output') {
      if (!(await this.waitUntilRunning(session)) || !this.isActive(session)) return
      const tasks = entry.next.map((next) => {
        return this.executeEntry({ portId: next, error, path, parentActivationId: attempt.parentActivationId }, subgraphId, session)
      })
      await Promise.all(tasks)
    }
  }

  private attemptData(node: ExecutionNode, inputs = node.inputValues) {
    return { inputs, outputs: { ...node.outputValues } }
  }

  private copyForRetry(
    base: ExecutionNode, inputs: Record<string, unknown>, outputs: Record<string, unknown>,
  ): ExecutionNode {
    const node = Object.create(Object.getPrototypeOf(base), Object.getOwnPropertyDescriptors(base)) as ExecutionNode
    node.inputValues = structuredClone(inputs)
    node.outputValues = structuredClone(outputs)
    return node
  }

  private singleNextEntry(node: ExecutionNode, selected?: string[]) {
    const graph = this.compiled.graphs.get(node.graphId)
    const destinations = node.outputs
      .filter((port) => port.type === 'exec' && (!selected?.length || selected.includes(port.name)))
      .flatMap((port) => graph?.get(graphPortKey(node.id, port.id))?.next ?? [])
    return destinations.length === 1 ? destinations[0] : undefined
  }

  private isIsolatedReplay(steps: RetryActivation[], target: ExecutionNode) {
    const upstream = new Set(steps.map((step) => step.entry.node.id))
    const graph = this.compiled.graphs.get(target.graphId)!
    for (const { node, dataInputs } of graph.values()) {
      if (node.id === target.id || upstream.has(node.id)) continue
      if (Object.values(dataInputs).some((sources) => sources.some(({ dependency }) => dependency && upstream.has(dependency)))) {
        return false
      }
    }
    return true
  }

  private async replayInputs(
    steps: RetryActivation[],
    sources: ReadonlyMap<string, RetryInput>,
    initial: Record<string, unknown>,
    retry: number,
    session: TaskExecutionState,
    retryFrom: string,
    previousFailure: NodeFailure,
    parentActivationId?: number,
  ): Promise<({ ok: true } & PreparedReplay) | { ok: false; failure: NodeFailure } | undefined> {
    const stage = this.state.stage()
    const activations = new Map<RetryActivation, RetryActivation>()
    const replaceInputs = (inputs: Record<string, unknown>, origins: ReadonlyMap<string, RetryInput>) => {
      const values = structuredClone(inputs)
      for (const [name, source] of origins) {
        const replayed = activations.get(source.producer)
        if (replayed) values[name] = structuredClone(replayed.outputs[source.output])
      }
      return values
    }
    const replaceSources = (origins: ReadonlyMap<string, RetryInput>) =>
      new Map([...origins].map(([name, source]) => {
        const producer = activations.get(source.producer)
        return [name, producer ? { ...source, producer, value: producer.outputs[source.output] } : source]
      }))
    for (const [index, step] of steps.entries()) {
      const original = step.entry.node
      const limit = this.retries.limit(original.retryPolicy)
      if (!this.isActive(session)) return
      const node = this.copyForRetry(original, replaceInputs(step.inputs, step.sources), step.initialOutputs)
      const stateInputs = new Map(step.stateInputs)
      const readError = this.refreshStateInputs(node, stateInputs, stage.store.readSnapshot(), activations)
      const inputs = structuredClone(node.inputValues)
      const activationId = this.trace?.begin(node, step.entry.port.id, { kind: 'replay', parentActivationId })
      if (!(await this.waitForNode(node, node.graphId, session, undefined, undefined, activationId))) return
      this.trace?.start(activationId)
      const attempt = this.retries.begin(node.id, retry, limit, retryFrom, previousFailure, activationId)
      let active = true
      let handedOff = false
      let selected: string[] | undefined
      const state = stage.store.activate(() => active && this.isActive(session), () => {})
      const ctx = this.buildExecutionContext(node, session, state.state, undefined, true, () => active, activationId)
      ctx.retry = this.retries.context(attempt)
      const interrupts = this.activateInterrupt(node, session, () => active, undefined, undefined, activationId)
      ctx.interrupt = interrupts.request
      ctx.next = (ports) => {
        if (!active) return
        if (handedOff) throw new Error('A replayed node can advance only once.')
        handedOff = true
        selected = ports
        state.commit()
      }
      try {
        if (!this.isActive(session)) return
        if (readError) throw readError
        this.loops.activate(node.id)
        await this.nodeExecutor.executeNode(node, ctx)
        if (!this.isActive(session)) {
          this.retries.finish(attempt, 'cancelled')
          return
        }
        const target = steps[index + 1]?.entry
        const destination = target ? graphPortKey(target.node.id, target.port.id) : step.nextEntry
        if (!handedOff || this.singleNextEntry(node, selected) !== destination) {
          throw new Error('A replayed node must follow the original execution path.')
        }
        state.commit()
        const data = this.attemptData(node, inputs)
        activations.set(step, { ...step, ...data, activationId, attemptId: attempt.id, sources: replaceSources(step.sources), stateInputs })
        active = false
        this.trace?.finish(activationId, 'completed', node)
        this.retries.finish(attempt, 'completed', undefined, data)
      } catch (error) {
        active = false
        const failure = describeFailure(error)
        this.trace?.finish(activationId, this.isActive(session) ? 'failed' : 'cancelled', node, error)
        this.retries.finish(attempt, this.isActive(session) ? 'failed' : 'cancelled', failure, this.attemptData(node, inputs))
        return { ok: false, failure }
      } finally {
        active = false
        state.discard()
        interrupts.close()
      }
    }
    return { ok: true, stage, activations, inputs: replaceInputs(initial, sources), sources: replaceSources(sources) }
  }

  private async advanceNode(
    graphNode: ExecutionPortEntry,
    subgraphId: string,
    error: unknown,
    session: TaskExecutionState,
    nextExecs?: string[],
    path?: ExecutionPath,
    activation?: RetryActivation,
    activationId?: number,
  ) {
    const { node } = graphNode
    const ready = subgraphId ? this.subReadyGraph.get(subgraphId)! : this.readyGraph
    const values = this.compiled.selectionSources.has(node.id) ? structuredClone(node.outputValues) : undefined
    if (!(await this.waitUntilRunning(session)) || !this.isActive(session)) return
    this.recordInputs(node)
    ready.set(node.id, graphNode)
    if (activationId !== undefined) this.producers.set(node.id, activationId)
    if (activation) this.readyActivations.set(node.id, activation)
    else this.readyActivations.delete(node.id)
    const nextPath = this.publishPath(node, path, values, activationId)
    const execPorts = node.outputs.filter(
      (o) => o.type === 'exec' && (!nextExecs?.length || nextExecs.includes(o.name))
    )
    this.traceHandoff(activationId, execPorts.map(({ name }) => name))
    const pending = this.resumeWaiting(subgraphId, session, true)
    if (nextExecs?.length) {
      for (const id of this.compiled.unselectedNodes(node, nextExecs, this.roots)) this.markSkipped(id, session, activationId)
    }
    await Promise.all([
      ...pending,
      ...execPorts.map((outPort) => this.executeEntry(
        { portId: graphPortKey(node.id, outPort.id), error, path: nextPath, parentActivationId: activationId }, subgraphId, session
      )),
    ])
    if (!this.isActive(session)) return
    await Promise.all(this.resumeWaiting(subgraphId, session, false, error))
  }

  private resumeWaiting(subgraphId: string, session: TaskExecutionState, multipleSources: boolean, error?: unknown) {
    if (multipleSources && !this.initialPorts.size) return []
    const graph = subgraphId ? this.subFlowStackGraph.get(subgraphId)! : this.flowStackGraph
    const waiting = subgraphId ? this.subWaitingGraph.get(subgraphId)! : this.waitingGraph
    const ready = subgraphId ? this.subReadyGraph.get(subgraphId)! : this.readyGraph
    const pending: Promise<void>[] = []
    for (const attempt of waiting.values()) {
      if (Boolean(attempt.selections) !== multipleSources) continue
      const item = graph.get(attempt.portId)!
      if (this.dependenciesReady(item, ready, attempt)) {
        pending.push(this.executeEntry(multipleSources ? attempt : { ...attempt, error }, subgraphId, session))
      }
    }
    return pending
  }

  private dependenciesReady(item: ExecutionPortEntry, ready: Map<string, ExecutionPortEntry>, attempt: WaitingEntry) {
    const missing: WaitingInput[] | undefined = this.trace ? [] : undefined
    const result = inputsReady(item, (id) => ready.has(id), this.publications, attempt.path, attempt.selections, missing, this.producers)
    if (missing) this.trace?.waiting(attempt.activationId, missing)
    return result
  }

  private traceHandoff(activationId: number | undefined, ports: string[]) {
    if (activationId !== undefined) this.trace?.record({ type: 'activation:handoff', activationId, ports })
  }

  private publishPath(node: ExecutionNode, previous?: ExecutionPath, values?: PublishedValues, activationId?: number) {
    if (!this.compiled.selectionSources.has(node.id)) return previous
    const snapshot = values ?? structuredClone(node.outputValues)
    this.publications.set(node.id, snapshot)
    return { nodeId: node.id, values: snapshot, activationId, previous }
  }

  private nodeForActivation(node: ExecutionNode, outputs?: PublishedValues): ExecutionNode {
    if (node.kind === 'loop') return this.loops.createInvocationNode(node)
    const initial = this.initialPorts.get(node.id)
    // Keep overlapping executions' port values separate while preserving their task-owned resources.
    const activation = Object.create(Object.getPrototypeOf(node), Object.getOwnPropertyDescriptors(node)) as ExecutionNode
    activation.inputValues = { ...node.inputValues }
    activation.outputValues = { ...(outputs ?? initial?.outputs ?? node.outputValues) }
    return activation
  }

  private recordInputs(node: ExecutionNode) {
    if (node.kind === 'loop') return
    this.nodesById.get(node.id)!.inputValues = { ...node.inputValues }
  }

  private refreshStateInputs(
    node: ExecutionNode,
    inputs: Map<string, StateInput>,
    snapshot: TaskStateSnapshot,
    replayed?: ReadonlyMap<RetryActivation, RetryActivation>,
  ) {
    for (const [name, input] of inputs) {
      inputs.set(name, { ...input, stateVersion: snapshot.version })
      try {
        const value = input.read(snapshot, (id, port, original) => {
          for (const producer of replayed?.values() ?? []) {
            if (producer.entry.node.id === id) return producer.outputs[port]
          }
          return original
        })
        if (value === undefined) node.inputValues[name] = undefined
        else node.setInput(name, structuredClone(value))
      } catch (error) {
        node.inputValues[name] = undefined
        return new StateInputReadError(error, name, { nodeId: input.nodeId, port: input.port, stateVersion: snapshot.version })
      }
    }
  }

  private prepareInputs(
    { dataInputs, node }: ExecutionPortEntry, ready: Map<string, ExecutionPortEntry>,
    selections: InputSelections | undefined, trace: boolean,
    stateInputs: Map<string, StateInput>, activationId?: number,
  ) {
    const sources = new Map<string, RetryInput>()
    const inputSources: ActivationInputSource[] = []
    for (const [inputId, candidates] of Object.entries(dataInputs)) {
      const inputName = node.inputs.find((input) => input.id === inputId)!.name
      const selection = selections?.get(inputId)
      const { source, read } = bindInput(
        candidates, (id, name) => ready.get(id)!.node.getOutput(name), selection,
      )
      const stateVersion = source.stateSource ? this.state.readSnapshot().version : undefined
      if (activationId !== undefined) {
        inputSources.push(describeInputSource(inputId, source, stateVersion,
          selection ? selection.activationId : this.producers.get(source.dependency ?? '')))
        this.trace?.inputs(activationId, inputSources)
      }
      if (source.stateSource) {
        stateInputs.set(inputName, { ...source.stateSource, stateVersion: stateVersion!, read })
        continue
      }
      const value = read()
      const loopBoundary = node.kind === 'loop' ||
        (source.dependency !== undefined && ready.get(source.dependency)?.node.kind === 'loop')
      if (trace && !selection && source.dependency && source.output &&
          (value !== undefined || node.getInput(inputName) === undefined)) {
        const producer = this.readyActivations.get(source.dependency)
        if (producer) sources.set(inputName, { producer, output: source.output, value: structuredClone(value) })
      }
      if (value !== undefined || loopBoundary) {
        const isolate = selection || loopBoundary || source.valueOutput
        node.setInput(inputName, isolate ? structuredClone(value) : value)
      } else if (selection) {
        node.inputValues[inputName] = structuredClone(this.initialPorts.get(node.id)?.inputs[inputName])
      }
    }
    return sources
  }
}
