import { isDataPort } from '@lyx-pj/primflow-model'
import type { ExecutionNode } from './ExecutionNode'
import { describeFailure } from './RetryController'
import type { ActivationInputSource, LoopInvocationSnapshot, LoopIterationSnapshot, NodeActivation, TaskStatus, TaskTrace, TaskTraceEvent, TaskTraceOptions, WaitingInput } from './types'

type EventBody<T = TaskTraceEvent> = T extends TaskTraceEvent ? Omit<T, 'sequence' | 'at'> : never
type ActivationOptions = Pick<NodeActivation, 'kind' | 'parentActivationId' | 'frameId'>

export function resolveTraceOptions(options: false | TaskTraceOptions | undefined): false | Required<TaskTraceOptions> {
  if (options === false) return false
  const maxEntries = options?.maxEntries ?? 1000
  if (!Number.isSafeInteger(maxEntries) || maxEntries <= 0) {
    throw new RangeError('trace.maxEntries must be a positive safe integer')
  }
  return { maxEntries, captureData: options?.captureData ?? false }
}

/** Task-owned diagnostics. Scheduling always uses the scheduler's own state. */
export class TaskTraceRecorder {
  private activations = new Map<number, NodeActivation>()
  private active = new Map<number, NodeActivation>()
  private ended = new Set<number>()
  private events = new Map<number, TaskTraceEvent>()
  private nextActivation = 0
  private sequence = 0
  private droppedActivations = 0
  private closed = false
  private taskId: string
  private options: Required<TaskTraceOptions>

  constructor(taskId: string, options: Required<TaskTraceOptions>) {
    this.taskId = taskId
    this.options = options
    this.record({ type: 'task:status', status: 'running' })
  }

  snapshot(): TaskTrace {
    return structuredClone({
      taskId: this.taskId,
      events: [...this.events.values()],
      activations: [...this.activations.values()],
      droppedEvents: this.sequence - this.events.size,
      droppedActivations: this.droppedActivations,
    })
  }

  get(id: number) {
    const activation = this.activations.get(id)
    return activation && structuredClone(activation)
  }

  record(event: EventBody) {
    if (this.closed) return
    const sequence = ++this.sequence
    this.events.set(sequence, { ...event, sequence, at: Date.now() })
    if (this.events.size > this.options.maxEntries) this.events.delete(this.events.keys().next().value!)
  }

  loop({ activationId, invocationId, loopNodeId, parentFrameId, status, reason, error }: LoopInvocationSnapshot) {
    this.record({ type: 'loop:invocation', activationId, invocationId, loopNodeId, parentFrameId, status, reason, error })
  }

  frame({ frameId, graphId, loop, status }: LoopIterationSnapshot) {
    this.record({ type: 'loop:frame', invocationId: loop.invocationId, frameId, graphId, index: loop.index, status })
  }

  begin(node: ExecutionNode, portId: string, options: ActivationOptions) {
    if (this.closed) return
    const id = ++this.nextActivation
    const activation: NodeActivation = {
      id, nodeId: node.id, graphId: node.graphId, portId, ...options, status: 'pending',
    }
    this.activations.set(id, activation)
    this.active.set(id, activation)
    this.record({ type: 'activation:status', activationId: id, status: 'pending' })
    return id
  }

  waiting(id: number | undefined, waitingFor: WaitingInput[]) {
    const activation = id === undefined ? undefined : this.active.get(id)
    if (!activation) return
    const previous = activation.waitingFor ?? []
    if (previous.length === waitingFor.length && previous.every((input, index) => input.inputPortId === waitingFor[index].inputPortId)) return
    activation.status = waitingFor.length ? 'waiting' : 'pending'
    activation.waitingFor = waitingFor.length ? waitingFor : undefined
    this.record({ type: 'activation:status', activationId: activation.id, status: activation.status, waitingFor: activation.waitingFor })
  }

  start(id: number | undefined) {
    const activation = id === undefined ? undefined : this.active.get(id)
    if (!activation) return
    activation.status = 'running'
    activation.startedAt = Date.now()
    this.record({ type: 'activation:status', activationId: activation.id, status: 'running' })
  }

  inputs(id: number | undefined, inputSources: ActivationInputSource[]) {
    const activation = id === undefined ? undefined : this.active.get(id)
    if (activation && inputSources.length) activation.inputSources = inputSources
  }

  finish(id: number | undefined, status: 'completed' | 'failed' | 'cancelled' | 'superseded', node?: ExecutionNode, error?: unknown) {
    const activation = id === undefined ? undefined : this.activations.get(id)
    if (!activation || this.closed || (activation.endedAt !== undefined &&
      (activation.status !== 'completed' || status !== 'failed'))) return
    if (status === 'failed') {
      try {
        const { kind, code, message, retryable, inputPort } = describeFailure(error)
        activation.failure = { kind, code, message, retryable, inputPort }
      } catch {
        activation.failure = { kind: 'execution', code: 'NODE_EXECUTION_FAILED', message: 'Error details unavailable.', retryable: false }
      }
    }
    if (node && this.options.captureData) this.capture(activation, node)
    activation.status = status
    activation.endedAt = Date.now()
    this.active.delete(activation.id)
    this.ended.add(activation.id)
    this.record({ type: 'activation:status', activationId: activation.id, status })
    if (this.ended.size > this.options.maxEntries) {
      const oldest = this.ended.values().next().value!
      this.ended.delete(oldest)
      this.activations.delete(oldest)
      this.droppedActivations++
    }
  }

  private capture(activation: NodeActivation, node: ExecutionNode) {
    try {
      const values = (ports: ExecutionNode['inputs'], read: (name: string) => unknown) => Object.fromEntries(
        ports.filter(({ type }) => isDataPort(type)).map(({ name }) => [name, read(name)]),
      )
      activation.data = structuredClone({
        inputs: values(node.inputs, (name) => node.getInput(name)),
        outputs: values(node.outputs, (name) => node.getOutput(name)),
      })
      activation.dataUnavailable = undefined
    } catch {
      activation.data = undefined
      activation.dataUnavailable = true
    }
  }

  /** Cancel the activation that is still running, without ending the whole trace. */
  cancelActive() {
    for (const id of [...this.active.keys()]) this.finish(id, 'cancelled')
  }

  close(status: TaskStatus) {
    for (const id of this.active.keys()) this.finish(id, 'cancelled')
    if (status === 'cancelled') this.record({ type: 'task:status', status })
    this.closed = true
  }
}
