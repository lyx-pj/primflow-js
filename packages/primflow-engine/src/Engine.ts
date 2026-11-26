import { validateGraphTypes } from '@lyx-pj/primflow-model'
import {
  EventEmitter,
  type JsonGraph,
  type JsonValue,
  type NodeClassType,
  type NodeOptions,
  type NodeRegistry,
  type NodeExecutionStatus,
} from '@lyx-pj/primflow-model'
import type { ExecutionNode } from './ExecutionNode'
import { createExecutionNode, loadGraphNodes } from './GraphLoader'
import { NodeExecutor } from './NodeExecutor'
import { NodeLifecycle } from './NodeLifecycle'
import { GraphCompiler } from './GraphCompiler'
import { TaskScheduler } from './TaskScheduler'
import { TaskRegistry } from './TaskRegistry'
import { resolveRetryTiming, type RetryTiming } from './RetryController'
import { createExecutionContext } from './ExecutionContext'
import { TaskStateStore } from './TaskStateStore'
import { resolveTraceOptions } from './TaskTrace'
import type { ExecutorDefinition } from './ExecutorDefinition'
import { resolveServices, type ServiceDefinition } from './ServiceDefinition'
import type {
  BreakpointHit, EngineEventPayloads, EngineStatus, EngineInitOptions, EngineOptions, StartOptions,
  TaskSnapshot, TaskStateCommit, TaskStateOptions,
} from './types'

type WorkflowSession = {
  controller: AbortController
  lifecycle?: NodeLifecycle
  ready: Promise<void>
  initialized: () => void
  debug: boolean
  retry: RetryTiming
}

class EngineEvents extends EventEmitter<EngineEventPayloads> {
  protected handleListenerError(error: unknown) {
    console.error('Engine event observer failed', error)
  }
}

/** Workflow session entry. Sessions own lifecycle resources; tasks own execution data. */
export class Engine<NodeDefs extends Record<string, NodeClassType>> {
  private readonly events = new EngineEvents()
  private readonly nodeExecutor: NodeExecutor
  private readonly registry: NodeRegistry<NodeDefs>
  private readonly serviceDefinitions: ReadonlySet<ServiceDefinition>
  options: EngineOptions
  private definition?: JsonGraph
  private loadedNodes: ExecutionNode[] = []
  private session?: WorkflowSession
  private stopping?: Promise<void>
  private tasks = new TaskRegistry<NodeDefs>()
  private currentStatus: EngineStatus = 'idle'

  constructor(registry: NodeRegistry<NodeDefs>, options: EngineInitOptions = {}) {
    this.registry = registry
    this.options = options
    this.historyLimit()
    resolveRetryTiming(options.retry)
    resolveTraceOptions(options.trace)
    const services = options.services ?? []
    this.serviceDefinitions = new Set(services)
    this.nodeExecutor = new NodeExecutor(resolveServices(services))
  }

  /** Register an executor after its declared services have been installed. */
  registerExecutor(executor: ExecutorDefinition) {
    if (typeof executor?.name !== 'string' || !executor.name.trim() || typeof executor.execute !== 'function') {
      throw new TypeError('Expected an executor definition with a name and an execute function.')
    }
    for (const service of executor.services ?? []) {
      if (!this.serviceDefinitions.has(service)) {
        throw new Error(`Executor "${executor.name}" requires service "${service.name}".`)
      }
    }
    this.nodeExecutor.registerExecutor(executor.name, executor.execute)
    return this
  }

  on<K extends keyof EngineEventPayloads>(event: K, handler: (...payload: EngineEventPayloads[K]) => void) {
    this.events.on(event, handler)
    return this
  }

  once<K extends keyof EngineEventPayloads>(event: K, handler: (...payload: EngineEventPayloads[K]) => void) {
    this.events.once(event, handler)
    return this
  }

  off<K extends keyof EngineEventPayloads>(event: K, handler?: (...payload: EngineEventPayloads[K]) => void) {
    this.events.off(event, handler)
    return this
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
  getTaskTrace(taskId: string) {
    return this.tasks.get(taskId)?.trace?.snapshot()
  }
  getNodeActivation(taskId: string, activationId: number) {
    return this.tasks.get(taskId)?.trace?.get(activationId)
  }
  getTaskState(taskId: string) {
    return this.tasks.get(taskId)?.state.snapshot()
  }
  getTaskGraph(taskId: string) {
    return this.tasks.get(taskId)?.getGraph()
  }
  getNodeStatus(nodeId: string, taskId?: string) {
    return this.getNodeStatuses(taskId).get(nodeId) ?? 'idle'
  }
  getNodeStatuses(taskId?: string) {
    return !taskId && (!this.session || this.tasks.get()?.status === 'cancelled')
      ? new Map<string, import('@lyx-pj/primflow-model').NodeExecutionStatus>()
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

  /** Stop the current workflow and load and validate a new graph. */
  loadGraph(json: JsonGraph | string) {
    const definition = structuredClone(typeof json === 'string' ? (JSON.parse(json) as JsonGraph) : json)
    const issues = validateGraphTypes(definition, this.registry, { strict: this.options.strictDataTypes })
    const failure = issues.find(issue => issue.severity === 'error')
    if (failure) throw new TypeError(failure.message)
    this.stop()
    this.definition = definition
    try {
      this.instantiateSessionNodes()
    } catch (error) {
      this.definition = undefined
      this.stop()
      throw error
    }
  }

  private instantiateSessionNodes() {
    if (!this.definition) return
    const nodesById = new Map<string, ExecutionNode>()
    try {
      new GraphCompiler(loadGraphNodes(this.registry, structuredClone(this.definition), nodesById))
    } finally {
      // Stop must also destroy any nodes created before a load or validation error.
      this.loadedNodes = [...nodesById.values()]
    }
  }

  async start(options: StartOptions = {}) {
    if (this.session) throw new Error('Workflow is running; stop the current run first.')
    const retry = resolveRetryTiming(this.options.retry, options.retry)
    const state = new TaskStateStore(this.options.state, options.initialState)
    let initialized!: () => void
    const ready = new Promise<void>((resolve) => {
      initialized = resolve
    })
    const session: WorkflowSession = {
      controller: new AbortController(),
      ready,
      initialized,
      debug: options.debug ?? this.options.debug ?? false,
      retry,
    }
    this.session = session
    try {
      this.setStatus('running')
      if (this.stopping) await this.stopping
      if (!this.isActive(session)) return
      if (!this.loadedNodes.length) this.instantiateSessionNodes()
      session.lifecycle = this.createLifecycle(this.loadedNodes, session)
      await session.lifecycle.activate()
      if (!this.isActive(session)) return
      session.initialized()
      await this.runTask(session, { type: 'start' }, state)
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

  /** Deliver an application response to a specific suspended activation. */
  resumeInterrupt(taskId: string, interruptId: string, answer: JsonValue) {
    return this.tasks.get(taskId)?.resumeInterrupt(interruptId, answer) ?? false
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

  async dispatchEvent(eventName: string, ...payload: unknown[]) {
    return this.dispatch(eventName, payload)
  }

  async dispatchEventWithOptions(eventName: string, options: TaskStateOptions, ...payload: unknown[]) {
    return this.dispatch(eventName, payload, undefined, options)
  }

  private async dispatch(eventName: string, payload: unknown[], parentTaskId?: string, options?: TaskStateOptions, parentActivationId?: number) {
    const session = this.session
    if (!session) return
    // Clone before awaiting so later caller mutations cannot change submitted events.
    const isolatedPayload = structuredClone(payload)
    const state = new TaskStateStore(this.options.state, options?.initialState)
    await session.ready
    if (!this.isActive(session)) return
    return this.runTask(session, { type: 'event', eventName, payload: isolatedPayload }, state, parentTaskId, parentActivationId)
  }

  private async runTask(session: WorkflowSession, trigger: TaskSnapshot['trigger'], state: TaskStateStore, parentTaskId?: string, parentActivationId?: number) {
    if (!this.isActive(session)) return
    const json = this.definition ?? {
      nodes: [],
      links: [],
      subgraphs: {},
      variables: [],
      viewport: { x: 0, y: 0, zoom: 1 },
    }
    const options = { ...this.options, debug: session.debug, retry: session.retry, context: structuredClone(this.options.context ?? {}) }
    const nodeStates = new Map(this.loadedNodes.map((node) => [node.id, node.state]))
    const previousStatuses = this.getNodeStatuses()
    const task = this.tasks.create({ json, trigger, parentTaskId, parentActivationId, state }, resolveTraceOptions(options.trace),
      (event, ...args) => this.taskEvent(event, ...args))
    for (const id of previousStatuses.keys()) this.publish('node:status:changed', id, 'idle')
    this.updateStatus()
    this.publish('task:created', task.snapshot())
    try {
      const scheduler = new TaskScheduler(
        this.registry,
        this.nodeExecutor,
        json,
        options,
        task.id,
        task.state,
        task.callbacks({
          emit: (activationId, name, ...payload) => {
            void this.dispatch(name, payload, task.id, undefined, activationId).catch((error) => this.publish('error', error))
          },
          nodeState: (nodeId) => nodeStates.get(nodeId),
        }),
        this.loadedNodes
      )
      task.attach(scheduler)
      await task.run(async (runner) => {
        if (trigger.type === 'start') await runner.runStartTask()
        else await runner.runEventTask(
          trigger.eventName!, trigger.payload!,
          session.lifecycle?.subscriptions(trigger.eventName!) ?? [],
        )
        await runner.waitForStreams()
      })
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
    if (event === 'task:node:progress') {
      this.publish('task:node:progress', taskId as string, payload[0] as import('./types').NodeProgress)
      return
    }
    if (event === 'task:node:attempt') {
      this.publish('task:node:attempt', taskId as string, payload[0] as import('./types').NodeAttempt)
      return
    }
    if (event === 'task:state:committed') {
      this.publish('task:state:committed', taskId as string, payload[0] as TaskStateCommit)
      return
    } else if (event === 'node:status:changed') {
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
    const active = [...this.tasks.values()].filter((task) => ['running', 'waiting', 'paused', 'interrupted'].includes(task.status))
    this.setStatus(active.length && active.every((task) => task.status === 'paused') ? 'paused' : 'running')
  }
  private setStatus(status: EngineStatus) {
    if (status === this.currentStatus) return
    this.currentStatus = status
    this.publish('status:changed', status)
  }
  private publish<K extends keyof EngineEventPayloads>(name: K, ...payload: EngineEventPayloads[K]) {
    this.events.emit(name, ...payload)
  }
  private isActive(session: WorkflowSession) {
    return this.session === session && !session.controller.signal.aborted
  }
  private historyLimit(options = this.options) {
    const limit = options.maxTaskHistory ?? 100
    if (!Number.isInteger(limit) || limit < 0) throw new RangeError('maxTaskHistory must be a non-negative integer')
    return limit
  }
  setOptions(options: EngineOptions) {
    this.historyLimit(options)
    resolveRetryTiming(options.retry)
    resolveTraceOptions(options.trace)
    this.options = options
  }
  setContext(context: unknown) {
    this.options.context = context
  }

  private createLifecycle(nodes: ExecutionNode[], session?: WorkflowSession) {
    const controller = session?.controller ?? new AbortController()
    if (!session) controller.abort()
    return new NodeLifecycle(
      nodes,
      (node) => {
        const ctx = createExecutionContext(node, {
          signal: controller.signal,
          context: this.options.context,
          isActive: () => !!session && this.isActive(session),
          services: this.nodeExecutor.services,
          emit: (name, ...payload) => {
            void this.dispatchEvent(name, ...payload).catch((error) => this.publish('error', error))
          },
        })
        return {
          nodeId: node.id,
          nodeType: node.definitionId,
          signal: controller.signal,
          nodeState: node.state,
          getInput: ctx.getInput,
          setOutput: (name, value) => node.setOutput(name, value),
          emitEvent: ctx.emitEvent,
          services: ctx.services,
          data: ctx.data,
          context: ctx.context,
          inputs: ctx.inputs,
          outputs: ctx.outputs,
          error: ctx.error,
        }
      },
      (error, nodeId) => this.publish('node:error', error, nodeId)
    )
  }

  createNodeInstance<K extends keyof NodeDefs>(nodeType: K | NodeDefs[K], options?: NodeOptions<NodeDefs[K]>) {
    return createExecutionNode(this.registry, nodeType, options)
  }
  async executeNode(node: ExecutionNode, opt: TaskStateOptions & { context?: unknown; error?: unknown } = {}) {
    let active = true
    const state = new TaskStateStore(this.options.state, opt.initialState).activate(() => active, () => {})
    try {
      await this.nodeExecutor.executeNode(node, {
        ...createExecutionContext(node, {
          ...opt,
          isActive: () => true,
          services: this.nodeExecutor.services,
          emit: (name, ...payload) => {
            void this.dispatchEvent(name, ...payload).catch((error) => this.publish('error', error))
          },
        }),
        state: state.state,
        next: state.commit,
      })
      state.commit()
      return this
    } finally {
      active = false
      state.discard()
    }
  }
  async runNode<K extends keyof NodeDefs>(
    nodeType: K | NodeDefs[K],
    options?: NodeOptions<NodeDefs[K]>,
    opt?: TaskStateOptions & { context?: unknown; error?: unknown }
  ) {
    return this.executeNode(this.createNodeInstance(nodeType, options), opt)
  }
}
