/* oxlint-disable typescript/no-explicit-any */
import type { NodeStyle, LinkStyle } from './NodeRegistry'

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
export type NodeExecutionStatus = 'idle' | 'pending' | 'running' | 'completed'

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

export type ExecContext = {
  /** Current task; absent for standalone node execution. */
  taskId?: string
  frameId?: string
  loop?: Readonly<LoopScope>
  /** Explicitly shared lifecycle resources; use state for temporary business data. */
  nodeState?: Record<string, unknown>
  /** Task-local and further isolated by frame inside loops; excluded from serialization. */
  state?: Record<string, unknown>
  /** Aborted on stop; async executors can cancel requests, timers, and other resources. */
  signal?: AbortSignal
  getInput: <T = unknown>(name: string) => T | undefined
  setOutput: (name: string, value: unknown) => void
  emitEvent: (eventName: string, ...args: unknown[]) => void
  /**
   * Hand off to downstream execution ports.
   *
   * The scheduler returns a Promise for downstream completion, allowing loops to await each iteration.
   */
  next: (nextExecs?: Array<string>) => void | Promise<void>
  data?: unknown
  services: { get: (name: string) => unknown }
  ctx?: unknown
  error?: unknown
  inputs: PortPrototype[]
  outputs: PortPrototype[]
}

export type ExecutorFn = (ctx: ExecContext) => Promise<any> | any

export type EventFn = (eventName: string, ...args: any[]) => { trigger?: boolean } | void

export type NodeEventHandler = (ctx: ExecContext, ...payload: unknown[]) => void | Promise<void>
export type NodeCleanup = () => void | Promise<void>

/** Lifecycle context without next; deactivation and destruction retain access to instance state and resources. */
export type NodeLifecycleContext = Omit<ExecContext, 'next' | 'state' | 'signal'> & {
  nodeId: string
  nodeType: string
  signal: AbortSignal
  state: Record<string, unknown>
  /** Subscribe to session business events; automatically unsubscribe on stop. */
  onEvent: (eventName: string, handler: NodeEventHandler) => () => void
  /** Register cleanup to run after deactivation and before destruction. */
  onCleanup: (cleanup: NodeCleanup) => void
}

export type NodeLifecycleHook = (ctx: NodeLifecycleContext) => void | Promise<void>

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
  position: { x: number; y: number }
  title?: string
  id: string
  type: string
  nodeType: string
  data?: unknown
  values: Record<string, unknown>
  subgraphId?: string
  loop?: LoopConfig
  inputs: {
    name: string
    id: string
    label?: string
    type?: string
    options?: { label: string; value: string }[]
    showPort?: boolean
    showInput?: boolean
  }[]
  outputs: {
    name: string
    id: string
    label?: string
    type?: string
    showPort?: boolean
  }[]
  style?: NodeStyle
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
  type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'any'
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
