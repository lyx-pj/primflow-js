import type { StreamWriter } from './DataTypes'
import type { NodeRetryInfo } from './NodeExecutionError'
/* oxlint-disable typescript/no-explicit-any */
import type { NodeStyle, LinkStyle } from './NodeRegistry'
import type { JsonValue, TaskState } from './TaskState'
import type { AnyServiceMap, ServiceContext, ServiceMap } from './Services'

/**
 * Change event types.
 *
 * Keep these types in model so the node host contract
 * (NodeHost) does not depend on canvas. Canvas Graph produces the events;
 * model defines only their shape.
 */
export const ChangedEventType = {
  Property: 1,
  Insert: 2,
  Delete: 3,
} as const

export type ChangedEventType = (typeof ChangedEventType)[keyof typeof ChangedEventType]

/** Temporary execution state, excluded from persistent graph configuration. */
export type NodeExecutionStatus = 'idle' | 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'skipped' | 'interrupted'

/** Minimal port description shared by execution contexts and serialization. */
export interface PortPrototype {
  name: string
  id: string
  type: string
}

/**
 * Save loop configuration explicitly; do not infer missing defaults at runtime.
 *
 * Loops have one form: the body repeats and decides when to end.
 * Body nodes implement traversal, counting, and other business behavior.
 */
export type LoopConfig = {
  version: 1
  /** Optional iteration cap, limited by the engine; omitted values use the engine cap. */
  maxIterations?: number
  timeoutMs?: number
}

export type LoopScope = {
  invocationId: string
  loopNodeId: string
  index: number
  parentFrameId?: string
}

export type NodeEvent = { readonly name: string; readonly payload: readonly unknown[] }

export type NodeRetryPolicy = {
  /** The node can repeat the same logical operation safely, including external effects. */
  idempotent: boolean
  /** Number of additional executions after the first failure. Defaults to zero. */
  maxRetries?: number
  /** Execution output used when an error remains after recovery. */
  fallback?: { port: string; outputs?: Readonly<Record<string, JsonValue>> }
}

export type NodeExecutionContext<S extends ServiceMap = AnyServiceMap> = {
  /** Present when the executor was activated by a business event. */
  event?: NodeEvent
  /** Attempt information for scheduled executors with an explicit retry policy. */
  retry?: NodeRetryInfo
  /** Current task; absent for standalone node execution. */
  taskId?: string
  frameId?: string
  loop?: Readonly<LoopScope>
  /** Shared business state owned by the current task. */
  state: TaskState
  /** Explicitly shared lifecycle resources; use taskState for temporary business data. */
  nodeState?: Record<string, unknown>
  /** Task-local and further isolated by frame inside loops; excluded from serialization. */
  taskState?: Record<string, unknown>
  /** Aborted on stop; async executors can cancel requests, timers, and other resources. */
  signal?: AbortSignal
  getInput: <T = unknown>(name: string) => T | undefined
  setOutput: (name: string, value: unknown) => void
  emitEvent: (eventName: string, ...args: unknown[]) => void
  openStream: (name: string) => StreamWriter
  getStream: (name: string) => AsyncIterable<unknown>
  emitProgress: (channel: string, value: JsonValue) => void
  /**
   * Hand off to downstream execution ports.
   *
   * The scheduler returns a Promise for downstream completion, allowing loops to await each iteration.
   */
  next: (nextExecs?: Array<string>) => void | Promise<void>
  /** Suspend this scheduled activation until the application supplies a value. */
  interrupt: (value: JsonValue) => Promise<JsonValue>
  /** Application configuration stored with the node. */
  data?: JsonValue
  /** Services registered on the engine, typed by the application's service map. */
  services: ServiceContext<S>
  context?: unknown
  error?: unknown
  inputs: PortPrototype[]
  outputs: PortPrototype[]
}

export type ExecutorFn<S extends ServiceMap = AnyServiceMap> = (ctx: NodeExecutionContext<S>) => Promise<any> | any

export type EventFn = (eventName: string, ...args: any[]) => { trigger?: boolean } | void

export type NodeEventContext<S extends ServiceMap = AnyServiceMap> = NodeExecutionContext<S> & {
  /** Request an executor activation in this event task. */
  executeSelf: () => Promise<void>
}

export type NodeEventHandler<S extends ServiceMap = AnyServiceMap> = (ctx: NodeEventContext<S>, ...payload: unknown[]) => void | Promise<void>
export type NodeCleanup = () => void | Promise<void>

/** Lifecycle context for instance state and resources. */
export type NodeLifecycleContext<S extends ServiceMap = AnyServiceMap> = Omit<NodeExecutionContext<S>, 'next' | 'interrupt' | 'openStream' | 'getStream' | 'emitProgress' | 'state' | 'taskState' | 'nodeState' | 'signal'> & {
  nodeId: string
  nodeType: string
  signal: AbortSignal
  nodeState: Record<string, unknown>
  /** Subscribe to session business events; automatically unsubscribe on stop. */
  on: (eventName: string, handler: NodeEventHandler<S>) => () => void
  once: (eventName: string, handler: NodeEventHandler<S>) => () => void
  /** Register cleanup to run after deactivation and before destruction. */
  onCleanup: (cleanup: NodeCleanup) => void
}

export type NodeLifecycleHook<S extends ServiceMap = AnyServiceMap> = (ctx: NodeLifecycleContext<S>) => void | Promise<void>

/**
 * Minimal Node requirements for its canvas host.
 *
 * model must not import canvas Graph, which would reverse the dependency direction.
 * Declare only the two methods Node actually calls.
 * Canvas Graph implements this contract through TypeScript structural typing.
 */
export interface NodeHost {
  emit(event: string, ...args: any[]): void
  raiseChangedEvent(
    change: ChangedEventType,
    propertyName: string,
    object: unknown,
    oldValue?: unknown,
    newValue?: unknown
  ): void
}

/** Minimal floating toolbar contract; canvas NodeToolsView provides the implementation. */
export interface ToolsViewHost {
  show(): void
  hide(): void
  remove(): void
  configure(node: unknown): void
}

// ---------------------------------------------------------------------------
// Shared serialization contract for engine and canvas, defined in model.
// ---------------------------------------------------------------------------

export interface JsonNode {
  breakpoint?: boolean
  /** Collapsed presentation for a container card; omitted means expanded. */
  collapsed?: boolean
  position: { x: number; y: number }
  title?: string
  id: string
  definitionId: string
  kind: string
  data?: JsonValue
  inputValues: Record<string, unknown>
  targetGraphId?: string
  loop?: LoopConfig
  inputs: {
    name: string
    id: string
    label?: string
    type?: string
    editor?: 'select' | 'textarea'
    editorWidth?: number
    options?: { label: string; value: string }[]
    showPort?: boolean
    showInput?: boolean
    showLabel?: boolean
    labelPosition?: { x?: number; y?: number }
  }[]
  outputs: {
    name: string
    id: string
    label?: string
    type?: string
    showPort?: boolean
    showLabel?: boolean
    labelPosition?: { x?: number; y?: number }
  }[]
  style?: NodeStyle
}

/** Read and validate the definition ID of a graph node. */
export function getJsonNodeDefinitionId(node: JsonNode): string {
  if (typeof node.definitionId !== 'string' || !node.definitionId.trim()) {
    throw new Error(`Node "${node.id}" has no definition ID.`)
  }
  return node.definitionId
}

export function validateJsonNode(node: JsonNode): void {
  getJsonNodeDefinitionId(node)
  if (typeof node.kind !== 'string' || !node.kind.trim()) {
    throw new Error(`Node "${node.id}" has no kind.`)
  }
  if (!node.inputValues || typeof node.inputValues !== 'object' || Array.isArray(node.inputValues)) {
    throw new Error(`Node "${node.id}" must have an inputValues object.`)
  }
}

export interface JsonLink {
  id: string
  source: {
    id: string
    port: string
  }
  target: {
    id: string
    port: string
  }
  style?: LinkStyle
}

export interface JsonVariable {
  name: string
  type: string
  value: unknown
}

export interface JsonGraph {
  nodes: JsonNode[]
  links: JsonLink[]
  variables: JsonVariable[]
  subgraphs: Record<string, { nodes: JsonNode[]; links: JsonLink[]; viewport: { x: number; y: number; zoom: number } }>
  viewport: {
    x: number
    y: number
    zoom: number
  }
}
