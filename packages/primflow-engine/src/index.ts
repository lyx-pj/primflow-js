export { Engine } from './Engine'
export type { ProcessOptions, EngineStatus, BreakpointHit } from './Engine'
export type { TaskSnapshot, TaskStatus, NodeExecutionData, LoopInvocationSnapshot, LoopIterationSnapshot } from './types'
export { LoopExecutionError } from './LoopController'
export { Runtime } from './Runtime'
export type { ExecContext, ExecutorFn, EventFn, PortPrototype } from './Runtime'

// Reexport model definitions required by runtime consumers.
// NodeInstanceType refers to model's NodeInstance, not Runtime's reduced implementation.
// Keep node types consistent between engine and canvas consumers.
export {
  NodeRegistry,
  Node,
  VariableManager,
  ChangedEvent,
  ChangedEventType,
  LoopNode,
  LoopEntryNode,
  LoopReturnNode,
  DEFAULT_LOOP_CONFIG
} from '@lyx-pj/primflow-model'
export type {
  LoopConfig,
  LoopScope,
  NodeExecutionStatus,
  NodeEventHandler,
  NodeCleanup,
  NodeLifecycleContext,
  NodeLifecycleHook,
  NodeClassType,
  NodeInstanceType,
  NodeStyle,
  LinkStyle,
  JsonGraph,
  JsonLink,
} from '@lyx-pj/primflow-model'
