import type { JsonGraph, JsonValue, NodeExecutionStatus, LoopScope, NodeFailure, NodeRetryInfo, StateValues } from '@lyx-pj/primflow-model'
import type { TaskStateStore } from './TaskStateStore'
import type { ServiceDefinition } from './ServiceDefinition'

export interface StateField<T extends JsonValue = JsonValue> {
  initial?: T
  validate?(value: T): boolean
  reducer?(current: T | undefined, update: T): T
}

export type StateDefinition = Record<string, StateField>
export type TaskStateOptions = { initialState?: StateValues }
export type StartOptions = TaskStateOptions & Pick<EngineOptions, 'debug' | 'retry'>
export type TaskStateCommit = { nodeId: string; version: number; changes: Readonly<StateValues> }

export type RetryOptions = {
  /** Base interval before the first retry, in milliseconds. Defaults to 500. */
  initialIntervalMs?: number
  /** Maximum base interval, before jitter, in milliseconds. Defaults to 128000. */
  maxIntervalMs?: number
  /** Add up to one second of jitter to each interval. Defaults to true. */
  jitter?: boolean
  /** Time to start retries after the first failure, in milliseconds. Null disables the deadline. */
  timeoutMs?: number | null
}

export interface EngineOptions {
  strictDataTypes?: boolean
  context?: unknown
  state?: StateDefinition
  debug?: boolean
  retry?: RetryOptions
  /** Maximum retained finished tasks; active tasks are never evicted. */
  maxTaskHistory?: number
  /** Task diagnostics are enabled by default. Set false to disable recording. */
  trace?: false | TaskTraceOptions
  /** Engine hard limits; node configuration may only lower them. */
  maxLoopIterations?: number
  maxNodeActivations?: number
  maxLoopDepth?: number
  maxLoopIterationHistory?: number
}

export interface EngineInitOptions extends EngineOptions {
  /** Service definitions to resolve once for this engine, before it runs a workflow. */
  services?: readonly ServiceDefinition[]
}

export type EngineStatus = 'idle' | 'running' | 'paused' | 'stopped'
export type TaskStatus = 'running' | 'waiting' | 'paused' | 'interrupted' | 'completed' | 'failed' | 'cancelled'
export interface BreakpointHit {
  nodeId: string
  nodeType: string
  subgraphId: string
  inputs: Record<string, unknown>
  frameId?: string
  loop?: LoopScope
}
export type TaskInterrupt = Pick<BreakpointHit, 'nodeId' | 'subgraphId' | 'frameId' | 'loop'> & {
  id: string
  value: JsonValue
}
export type NodeAttempt = NodeRetryInfo & {
  id: number
  activationId?: number
  nodeId: string
  status: 'running' | 'completed' | 'failed' | 'cancelled'
  failure?: NodeFailure
  handled?: boolean
  inputs?: Record<string, unknown>
  outputs?: Record<string, unknown>
}

export interface TaskSnapshot {
  id: string
  parentTaskId?: string
  parentActivationId?: number
  trigger: { type: 'start' | 'event'; eventName?: string; payload?: unknown[] }
  status: TaskStatus
  startedAt: number
  endedAt?: number
  pausedNode: BreakpointHit | null
  interrupts: TaskInterrupt[]
  attempts?: NodeAttempt[]
  errors: { nodeId: string; message: string; frameId?: string; loop?: LoopScope; failure?: NodeFailure }[]
}
export type LoopInvocationSnapshot = {
  invocationId: string
  activationId?: number
  loopNodeId: string
  parentFrameId?: string
  status: 'running' | 'completed' | 'failed' | 'cancelled'
  iterations: number
  state?: unknown
  result?: unknown
  reason?: 'break' | 'limit'
  error?: string
}
export type LoopIterationSnapshot = {
  frameId: string
  graphId: string
  loop: LoopScope
  status: 'running' | 'completed' | 'failed' | 'cancelled'
  state?: unknown
  result?: unknown
  error?: string
}
export type NodeExecutionData = { inputs: Record<string, unknown>; outputs: Record<string, unknown> }

export type TaskTraceOptions = {
  /** Per-task limit for each of the timeline and terminal activation records. Defaults to 1000. */
  maxEntries?: number
  /** Store copies of node port values. Defaults to false. */
  captureData?: boolean
}
export type WaitingInput = {
  inputPortId: string
  /** Any of these producers can satisfy this input. All listed inputs must be satisfied. */
  sources: { nodeId: string; outputPort: string }[]
}
export type ActivationInputSource = {
  inputPortId: string
  producer?: { nodeId: string; outputPort: string; activationId?: number }
  state?: { nodeId: string; port: string; version: number }
}
export type NodeActivation = {
  id: number
  nodeId: string
  graphId: string
  portId: string
  kind: 'entry' | 'node' | 'event-handler' | 'event-filter' | 'replay'
  parentActivationId?: number
  frameId?: string
  status: 'pending' | 'waiting' | 'running' | 'completed' | 'failed' | 'cancelled' | 'superseded'
  startedAt?: number
  endedAt?: number
  waitingFor?: WaitingInput[]
  inputSources?: ActivationInputSource[]
  failure?: Pick<NodeFailure, 'kind' | 'code' | 'message' | 'retryable' | 'inputPort'>
  data?: NodeExecutionData
  dataUnavailable?: true
}
export type TaskTraceEvent = { sequence: number; at: number } & (
  | { type: 'task:status'; status: TaskStatus }
  | { type: 'activation:status'; activationId: number; status: NodeActivation['status']; waitingFor?: WaitingInput[] }
  | { type: 'activation:handoff'; activationId: number; ports: string[] }
  | { type: 'branch:skipped'; activationId: number; nodeId: string }
  | { type: 'activation:breakpoint'; activationId: number }
  | { type: 'activation:interrupt'; activationId: number; interruptId: string; status: 'requested' | 'resumed' | 'cancelled' }
  | { type: 'activation:attempt'; activationId: number; attemptId: number; status: NodeAttempt['status']; handled?: boolean }
  | { type: 'activation:retry-wait'; activationId: number; nextAttempt: number; status: 'scheduled' | 'ready' | 'timeout' }
  | { type: 'activation:stream'; activationId: number; port: string; chunks: number }
  | { type: 'activation:emit'; activationId: number; eventName: string }
  | { type: 'activation:event-filter'; activationId: number; triggered: boolean }
  | ({ type: 'loop:invocation' } & Pick<LoopInvocationSnapshot, 'activationId' | 'invocationId' | 'loopNodeId' | 'parentFrameId' | 'status' | 'reason' | 'error'>)
  | { type: 'loop:frame'; invocationId: string; frameId: string; graphId: string; index: number; status: LoopIterationSnapshot['status'] }
  | { type: 'state:committed'; nodeId: string; activationId?: number; version: number }
  | { type: 'task:error'; errorIndex: number; nodeId: string; frameId?: string }
)
export type TaskTrace = {
  taskId: string
  events: TaskTraceEvent[]
  activations: NodeActivation[]
  droppedEvents: number
  droppedActivations: number
}
export type NodeProgress = {
  nodeId: string
  frameId?: string
  activationId?: number
  executionId: number
  sequence: number
  channel: string
  value: JsonValue
}

export type EngineEventPayloads = {
  [eventName: string]: unknown[]
  'status:changed': [status: EngineStatus]
  'breakpoint:hit': [breakpoint: BreakpointHit]
  'node:error': [error: unknown, nodeId: string]
  'node:status:changed': [nodeId: string, status: NodeExecutionStatus]
  'task:created': [task: TaskSnapshot]
  'task:changed': [task: TaskSnapshot]
  'task:node:progress': [taskId: string, progress: NodeProgress]
  'task:node:attempt': [taskId: string, attempt: NodeAttempt]
  'task:node:status:changed': [taskId: string, nodeId: string, status: NodeExecutionStatus]
  'task:breakpoint:hit': [taskId: string, breakpoint: BreakpointHit]
  'task:error': [taskId: string, error: unknown, nodeId: string]
  'task:state:committed': [taskId: string, commit: TaskStateCommit]
  'loop:started': [taskId: string, invocation: LoopInvocationSnapshot]
  'loop:iteration:started': [taskId: string, iteration: LoopIterationSnapshot]
  'loop:iteration:completed': [taskId: string, iteration: LoopIterationSnapshot]
  'loop:finished': [taskId: string, invocation: LoopInvocationSnapshot]
}
export type TaskDefinition = {
  id: string
  parentTaskId?: string
  parentActivationId?: number
  trigger: TaskSnapshot['trigger']
  json: JsonGraph
  state: TaskStateStore
}
