import {
  EventEmitter,
  type JsonGraph,
  type NodeClassType,
  type NodeOptions,
  type NodeExecutionStatus,
} from '@lyx-pj/workflow-model'
import { Runtime, type NodeInstanceType } from './Runtime'
import { NodeLifecycle } from './NodeLifecycle'
import { GraphCompiler } from './GraphCompiler'
import { TaskScheduler } from './TaskScheduler'
import { TaskRegistry } from './TaskRegistry'
import { createExecutionContext } from './ExecutionContext'
import type { BreakpointHit, EngineEventPayloads, EngineStatus, ProcessOptions, TaskSnapshot } from './types'

export type { ExecContext } from '@lyx-pj/workflow-model'
export type { EngineStatus, ProcessOptions, BreakpointHit } from './types'

type Session = {
  controller: AbortController
  lifecycle?: NodeLifecycle
  ready: Promise<void>
  initialized: () => void
  debug: boolean
}

/** Workflow session entry. Sessions own lifecycle resources; tasks own execution data. */
export class Engine<NodeDefs extends Record<string, NodeClassType>> extends EventEmitter<EngineEventPayloads> {
  runtime: Runtime<NodeDefs>
  options: ProcessOptions
  private definition?: JsonGraph
  private loadedNodes: NodeInstanceType[] = []
  private session?: Session
  private stopping?: Promise<void>
  private tasks = new TaskRegistry<NodeDefs>()
  private currentStatus: EngineStatus = 'idle'

  constructor(runtime: Runtime<NodeDefs>, options: ProcessOptions = {}) {
    super()
    this.runtime = runtime
    this.options = options
    this.historyLimit()
  }

  get status() {
    return this.currentStatus
  }
  get latestTaskId() {
    return this.tasks.latestId
  }
  get pausedNode() {
    return this.tasks.get()?.snapshot().pausedNode ?? null
  }

  getTasks(): TaskSnapshot[] {
    return this.tasks.list()
  }
  getTask(taskId: string) {
    return this.tasks.get(taskId)?.snapshot()
  }
  getTaskGraph(taskId: string) {
    return this.tasks.get(taskId)?.getGraph()
  }
  getNodeStatus(nodeId: string, taskId?: string) {
    return this.getNodeStatuses(taskId).get(nodeId) ?? 'idle'
  }
  getNodeStatuses(taskId?: string) {
    return !taskId && (!this.session || this.tasks.get()?.status === 'cancelled')
      ? new Map<string, import('@lyx-pj/workflow-model').NodeExecutionStatus>()
      : new Map(this.tasks.get(taskId)?.getNodeStatuses())
  }
  getNodeExecutionData(nodeId: string, taskId?: string) {
    return !taskId && (!this.session || this.tasks.get()?.status === 'cancelled')
      ? undefined
      : this.tasks.get(taskId)?.getNodeData(nodeId)
  }
  getLoopInvocations(taskId: string) {
    return this.tasks.get(taskId)?.getLoopInvocations() ?? []
  }
  getLoopIterations(taskId: string, invocationId: string) {
    return this.tasks.get(taskId)?.getLoopIterations(invocationId) ?? []
  }
  getFrameNodeExecutionData(taskId: string, frameId: string, nodeId: string) {
    return this.tasks.get(taskId)?.getFrameNodeData(frameId, nodeId)
  }

  fromJSON(json: JsonGraph | string) {
    const definition = structuredClone(typeof json === 'string' ? (JSON.parse(json) as JsonGraph) : json)
    this.stop()
    this.definition = definition
    try {
      this.loadGraph()
    } catch (error) {
      this.definition = undefined
      this.stop()
      throw error
    }
  }

  private loadGraph() {
    try {
      if (this.definition) new GraphCompiler(this.runtime.fromJSON(structuredClone(this.definition)))
    } finally {
      this.loadedNodes = [...this.runtime.nodes.values()]
    }
  }

  async process(options: Pick<ProcessOptions, 'debug'> = {}) {
    if (this.session) throw new Error('Workflow is running; stop the current run first.')
    let initialized!: () => void
    const ready = new Promise<void>((resolve) => {
      initialized = resolve
    })
    const session: Session = {
      controller: new AbortController(),
      ready,
      initialized,
      debug: options.debug ?? this.options.debug ?? false,
    }
    this.session = session
    try {
      this.setStatus('running')
      if (this.stopping) await this.stopping
      if (!this.isActive(session)) return
      if (!this.loadedNodes.length) this.loadGraph()
      session.lifecycle = this.createLifecycle(this.loadedNodes, session)
      await session.lifecycle.activate()
      if (!this.isActive(session)) return
      session.initialized()
      await this.runTask(session, { type: 'start' })
    } catch (error) {
      if (this.isActive(session)) this.stop()
      await this.whenStopped()
      throw error
    } finally {
      session.initialized()
    }
  }

  /** Cancel synchronously; use whenStopped to await complete resource cleanup. */
  stop() {
    const session = this.session
    const nodes = this.loadedNodes
    if (!session && !nodes.length) return this
    const previousStatuses = this.getNodeStatuses()
    this.session = undefined
    this.loadedNodes = []
    const lifecycle = session?.lifecycle ?? this.createLifecycle(nodes)
    const stopping = Promise.resolve(this.stopping).then(() => lifecycle.destroy())
    this.stopping = stopping
    void stopping.then(() => {
      if (this.stopping === stopping) this.stopping = undefined
    })
    for (const node of nodes) {
      if (this.runtime.nodes.get(node.id) === node) this.runtime.nodes.delete(node.id)
      if (this.runtime.nodeListeners.get(node.id) === node) this.runtime.nodeListeners.delete(node.id)
    }
    for (const task of this.tasks.values()) task.stop()
    session?.controller.abort()
    session?.initialized()
    for (const id of previousStatuses.keys()) this.publish('node:status:changed', id, 'idle')
    if (!this.session) this.setStatus('stopped')
    return this
  }

  whenStopped(): Promise<void> {
    return this.stopping ?? Promise.resolve()
  }
  stopTask(taskId: string) {
    const task = this.tasks.get(taskId)
    const statuses = task?.getNodeStatuses()
    task?.stop()
    if (taskId === this.latestTaskId) {
      for (const id of statuses?.keys() ?? []) this.publish('node:status:changed', id, 'idle')
    }
    return this
  }
  resume(taskId?: string) {
    if (taskId) this.tasks.get(taskId)?.resume()
    else for (const task of this.tasks.values()) task.resume()
    return this
  }

  setBreakpoint(nodeId: string, enabled: boolean) {
    if (this.definition) {
      for (const node of [
        ...this.definition.nodes,
        ...Object.values(this.definition.subgraphs ?? {}).flatMap((graph) => graph.nodes),
      ]) {
        if (node.id === nodeId) node.breakpoint = enabled
      }
    }
    const node = this.loadedNodes.find((node) => node.id === nodeId)
    if (node) node.breakpoint = enabled
    for (const task of this.tasks.values()) task.setBreakpoint(nodeId, enabled)
    return this
  }

  emit(...args: Parameters<EventEmitter<EngineEventPayloads>['emit']>) {
    const [name, ...payload] = args
    void this.dispatchEvent(String(name), ...payload).catch((error) => this.publish('error', error))
    this.publish(name, ...payload)
    return this
  }

  async dispatchEvent(eventName: string, ...payload: unknown[]) {
    return this.dispatch(eventName, payload)
  }
  async handleNodeEvents(eventName: string, ...payload: unknown[]) {
    await this.dispatch(eventName, payload)
  }

  private async dispatch(eventName: string, payload: unknown[], parentTaskId?: string) {
    const session = this.session
    if (!session) return
    // Clone before awaiting so later caller mutations cannot change submitted events.
    const isolatedPayload = structuredClone(payload)
    await session.ready
    if (!this.isActive(session)) return
    return this.runTask(session, { type: 'event', eventName, payload: isolatedPayload }, parentTaskId)
  }

  private async runTask(session: Session, trigger: TaskSnapshot['trigger'], parentTaskId?: string) {
    if (!this.isActive(session)) return
    const json = this.definition ?? {
      nodes: [],
      links: [],
      subgraphs: {},
      variables: [],
      viewport: { x: 0, y: 0, zoom: 1 },
    }
    const options = { ...this.options, debug: session.debug, ctx: structuredClone(this.options.ctx ?? {}) }
    const nodeStates = new Map(this.loadedNodes.map((node) => [node.id, node.state]))
    const previousStatuses = this.getNodeStatuses()
    const task = this.tasks.create({ json, trigger, parentTaskId }, (event, ...args) => this.taskEvent(event, ...args))
    for (const id of previousStatuses.keys()) this.publish('node:status:changed', id, 'idle')
    this.updateStatus()
    this.publish('task:created', task.snapshot())
    try {
      const scheduler = new TaskScheduler(
        this.runtime.fork(),
        json,
        options,
        task.id,
        task.callbacks({
          emit: (name, ...payload) => {
            void this.dispatch(name, payload, task.id).catch((error) => this.publish('error', error))
          },
          nodeState: (nodeId) => nodeStates.get(nodeId),
        }),
        this.loadedNodes
      )
      task.attach(scheduler)
      await task.run((runner) =>
        trigger.type === 'start'
          ? runner.process()
          : runner.handleNodeEvents(
              trigger.eventName!,
              trigger.payload!,
              session.lifecycle?.subscriptions(trigger.eventName!) ?? []
            )
      )
      return task.snapshot()
    } catch (error) {
      task.fail(error)
      return task.snapshot()
    } finally {
      this.tasks.prune(this.historyLimit())
    }
  }

  private taskEvent(event: string, ...args: unknown[]) {
    if (event === 'task:changed') {
      const task = args[0] as TaskSnapshot
      this.publish('task:changed', task)
      this.updateStatus()
      if (['completed', 'failed', 'cancelled'].includes(task.status)) this.tasks.prune(this.historyLimit())
      return
    }
    const [taskId, ...payload] = args
    if (event === 'node:status:changed') {
      this.publish(
        'task:node:status:changed',
        taskId as string,
        payload[0] as string,
        payload[1] as NodeExecutionStatus
      )
      if (taskId === this.latestTaskId && this.session)
        this.publish('node:status:changed', payload[0] as string, payload[1] as NodeExecutionStatus)
    } else if (event === 'node:error') {
      this.publish('task:error', taskId as string, payload[0], payload[1] as string)
      this.publish('node:error', payload[0], payload[1] as string)
    } else if (event === 'breakpoint:hit') {
      this.publish('task:breakpoint:hit', taskId as string, payload[0] as BreakpointHit)
      this.publish('breakpoint:hit', payload[0] as BreakpointHit)
    } else if (event.startsWith('loop:')) {
      this.publish(event, taskId, ...payload)
    }
    this.updateStatus()
  }

  private updateStatus() {
    if (!this.session) return
    const active = [...this.tasks.values()].filter((task) => ['running', 'waiting', 'paused'].includes(task.status))
    this.setStatus(active.length && active.every((task) => task.status === 'paused') ? 'paused' : 'running')
  }
  private setStatus(status: EngineStatus) {
    if (status === this.currentStatus) return
    this.currentStatus = status
    this.publish('status:changed', status)
  }
  private publish<K extends keyof EngineEventPayloads>(name: K, ...payload: EngineEventPayloads[K]) {
    try {
      super.emit(name, ...payload)
    } catch (error) {
      console.error('Engine event observer failed', error)
    }
  }
  protected handleListenerError(error: unknown) {
    console.error('Engine event observer failed', error)
  }
  private isActive(session: Session) {
    return this.session === session && !session.controller.signal.aborted
  }
  private historyLimit(options = this.options) {
    const limit = options.maxTaskHistory ?? 100
    if (!Number.isInteger(limit) || limit < 0) throw new RangeError('maxTaskHistory must be a non-negative integer')
    return limit
  }
  setOptions(options: ProcessOptions) {
    this.historyLimit(options)
    this.options = options
  }
  setCtx(ctx: unknown) {
    this.options.ctx = ctx
  }

  private createLifecycle(nodes: NodeInstanceType[], session?: Session) {
    const controller = session?.controller ?? new AbortController()
    if (!session) controller.abort()
    return new NodeLifecycle(
      nodes,
      (node) => {
        const ctx = createExecutionContext(node, {
          signal: controller.signal,
          ctx: this.options.ctx,
          isActive: () => !!session && this.isActive(session),
          getService: (name) => this.runtime.getService(name),
          emit: (name, ...payload) => {
            this.emit(name, ...payload)
          },
        })
        return {
          nodeId: node.id,
          nodeType: node.nodeType,
          signal: controller.signal,
          state: node.state,
          getInput: ctx.getInput,
          setOutput: (name, value) => node.setOutput(name, value),
          emitEvent: ctx.emitEvent,
          services: ctx.services,
          data: ctx.data,
          ctx: ctx.ctx,
          inputs: ctx.inputs,
          outputs: ctx.outputs,
          error: ctx.error,
        }
      },
      (error, nodeId) => this.publish('node:error', error, nodeId)
    )
  }

  createNodeInstance(...args: Parameters<Runtime<NodeDefs>['createNodeInstance']>) {
    return this.runtime.createNodeInstance(...args)
  }
  async executeNode(node: NodeInstanceType, opt: { ctx?: unknown; error?: unknown } = {}) {
    await this.runtime.executeNode(
      node,
      createExecutionContext(node, {
        ...opt,
        isActive: () => true,
        getService: (name) => this.runtime.getService(name),
        emit: (name, ...payload) => {
          this.emit(name, ...payload)
        },
      })
    )
    return this
  }
  async runNode<K extends keyof NodeDefs>(
    nodeType: K | NodeDefs[K],
    options?: NodeOptions<NodeDefs[K]>,
    opt?: { ctx?: unknown; error?: unknown }
  ) {
    return this.executeNode(this.createNodeInstance(nodeType, options), opt)
  }
}
