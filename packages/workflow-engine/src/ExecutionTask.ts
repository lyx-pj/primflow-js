import type { JsonGraph, NodeClassType, NodeExecutionStatus } from '@lyx-pj/workflow-model'
import type { TaskCallbacks, TaskScheduler } from './TaskScheduler'
import type { NodeExecutionData, TaskDefinition, TaskSnapshot, LoopInvocationSnapshot, LoopIterationSnapshot } from './types'
import { LoopExecutionError } from './LoopController'

/** Observable execution instance; separate scheduling from records so snapshots survive stop. */
export class ExecutionTask<NodeDefs extends Record<string, NodeClassType>> {
  readonly id: string
  private info: TaskSnapshot
  private scheduler?: TaskScheduler<NodeDefs>
  private operations = 0
  private disposed = false
  private statuses = new Map<string, NodeExecutionStatus>()
  private data = new Map<string, NodeExecutionData>()
  private notify: (event: string, ...payload: unknown[]) => void
  private cancelled: Promise<void>
  private cancel!: () => void
  private graph: JsonGraph
  private reportedErrors = 0
  private loops: LoopInvocationSnapshot[] = []
  private iterations: LoopIterationSnapshot[] = []
  private frames = new Map<string, Map<string, NodeExecutionData>>()

  constructor(definition: TaskDefinition, notify: (event: string, ...payload: unknown[]) => void) {
    this.id = definition.id
    this.notify = notify
    this.graph = structuredClone(definition.json)
    this.cancelled = new Promise((resolve) => {
      this.cancel = resolve
    })
    this.info = {
      id: this.id,
      parentTaskId: definition.parentTaskId,
      trigger: definition.trigger,
      status: 'running',
      startedAt: Date.now(),
      pausedNode: null,
      errors: [],
    }
  }

  callbacks(base: Pick<TaskCallbacks, 'emit' | 'nodeState'>): TaskCallbacks {
    return {
      ...base,
      activity: (delta) => {
        if (this.disposed) return
        this.operations += delta
        this.refresh()
      },
      notify: (event, ...payload) => {
        if (this.disposed) return
        if (event === 'node:error') {
          const error = payload[0]
          this.info.errors.push({
            nodeId: error instanceof LoopExecutionError ? error.nodeId : payload[1] as string,
            message: String(error),
            ...(error instanceof LoopExecutionError ? { frameId: error.frameId, loop: error.loop } : {}),
          })
        }
        this.refresh()
        this.notify(event, this.id, ...payload)
      },
    }
  }

  attach(scheduler: TaskScheduler<NodeDefs>) {
    if (this.disposed) scheduler.stop()
    else this.scheduler = scheduler
  }

  async run(action: (scheduler: TaskScheduler<NodeDefs>) => Promise<void>) {
    if (this.disposed) return
    this.operations++
    try {
      await Promise.race([action(this.scheduler!), this.cancelled])
    } catch (error) {
      this.fail(error)
    } finally {
      this.operations--
      if (!this.disposed) this.refresh()
    }
  }

  private refresh() {
    if (this.disposed) return
    const previous = this.info.status
    const previousPause = this.info.pausedNode
    this.info.pausedNode = this.scheduler?.pausedNode ?? null
    this.info.status =
      this.scheduler?.status === 'paused'
        ? 'paused'
        : this.operations > 0
          ? 'running'
          : this.info.errors.length
            ? 'failed'
            : this.scheduler?.waiting
              ? 'waiting'
              : 'completed'
    this.info.endedAt = ['completed', 'failed'].includes(this.info.status)
      ? (this.info.endedAt ?? Date.now())
      : undefined
    if (
      previous !== this.info.status ||
      previousPause !== this.info.pausedNode ||
      this.reportedErrors !== this.info.errors.length
    ) {
      this.reportedErrors = this.info.errors.length
      this.notify('task:changed', this.snapshot())
    }
  }

  get status() {
    return this.info.status
  }
  get endedAt() {
    return this.info.endedAt
  }
  getGraph() {
    return structuredClone(this.graph)
  }
  snapshot(): TaskSnapshot {
    return structuredClone(this.info)
  }
  getNodeStatuses() {
    return this.scheduler?.getNodeStatuses() ?? new Map(this.statuses)
  }
  getNodeData(nodeId: string) {
    const data = this.scheduler?.getNodeExecutionData(nodeId) ?? this.data.get(nodeId)
    return data ? structuredClone(data) : undefined
  }
  getLoopInvocations() {
    return structuredClone(this.scheduler ? [...this.scheduler.loops.invocations.values()] : this.loops)
  }
  getLoopIterations(invocationId: string) {
    const iterations = this.scheduler ? [...this.scheduler.loops.iterations.values()] : this.iterations
    return structuredClone(iterations.filter(i => i.loop.invocationId === invocationId))
  }
  getFrameNodeData(frameId: string, nodeId: string): NodeExecutionData | undefined {
    const paused = this.scheduler?.pausedNode
    if (paused?.frameId === frameId && paused.nodeId === nodeId) return structuredClone({ inputs: paused.inputs, outputs: {} })
    const data = (this.scheduler?.loops.frameData ?? this.frames).get(frameId)?.get(nodeId)
    return data ? structuredClone(data) : undefined
  }
  resume() {
    this.scheduler?.resume()
  }
  setBreakpoint(nodeId: string, enabled: boolean) {
    this.scheduler?.setBreakpoint(nodeId, enabled)
  }
  fail(error: unknown) {
    if (this.disposed) return
    this.info.errors.push({ nodeId: '', message: String(error) })
    this.info.status = 'failed'
    this.info.endedAt = Date.now()
    this.notify('task:changed', this.snapshot())
    this.notify('node:error', this.id, error, '')
  }

  stop() {
    if (this.disposed) return
    const before = this.info.status
    this.statuses = new Map(this.scheduler?.getNodeStatuses())
    for (const id of this.statuses.keys()) {
      const data = this.scheduler?.getNodeExecutionData(id)
      if (data) this.data.set(id, structuredClone(data))
    }
    this.disposed = true
    this.cancel()
    this.scheduler?.stop()
    if (this.scheduler) {
      this.loops = structuredClone([...this.scheduler.loops.invocations.values()])
      this.iterations = structuredClone([...this.scheduler.loops.iterations.values()])
      for (const loop of this.loops) if (loop.status === 'running') loop.status = 'cancelled'
      for (const frame of this.iterations) if (frame.status === 'running') frame.status = 'cancelled'
      this.frames = structuredClone(this.scheduler.loops.frameData)
    }
    this.scheduler = undefined
    this.info.pausedNode = null
    this.info.endedAt ??= Date.now()
    if (before === 'running' || before === 'waiting' || before === 'paused') this.info.status = 'cancelled'
    this.notify('task:changed', this.snapshot())
  }
}
