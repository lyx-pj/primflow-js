import { isDataPort } from '@lyx-pj/primflow-model'
import type { JsonValue, NodeExecutionContext, ServiceContext } from '@lyx-pj/primflow-model'
import type { ExecutionNode } from './ExecutionNode'

export type ContextOptions = {
  signal?: AbortSignal
  taskId?: string
  context?: unknown
  error?: unknown
  nodeState?: Record<string, unknown>
  isActive: () => boolean
  services: ReadonlyMap<string, unknown>
  progress?: (channel: string, value: JsonValue) => void
  onOutput?: (name: string, value: unknown) => void
  emit: (name: string, ...payload: unknown[]) => void
}

function createServiceContext(services: ReadonlyMap<string, unknown>): ServiceContext {
  return {
    get: (name) => services.get(name),
    require(name) {
      if (!services.has(name)) throw new Error(`No service registered with name "${name}".`)
      return services.get(name)
    },
  }
}

/** Bind each context to a specific task and node; async callbacks never rely on a global current task. */
export function createExecutionContext(
  node: ExecutionNode,
  options: ContextOptions,
): Omit<NodeExecutionContext, 'state'> {
  return {
    taskId: options.taskId,
    signal: options.signal,
    taskState: node.state,
    nodeState: options.nodeState,
    context: options.context,
    error: options.error,
    data: node.data,
    getInput: <T = unknown>(name: string) => node.getInput(name) as T | undefined,
    setOutput: (name, value) => {
      if (!options.isActive()) return
      const output = options.taskId ? structuredClone(value) : value
      node.setOutput(name, output)
      options.onOutput?.(name, output)
    },
    emitEvent: (name, ...args) => {
      if (options.isActive()) options.emit(name, ...args)
    },
    openStream: () => { throw new Error('Streams require a scheduled root-graph execution.') },
    getStream: () => { throw new Error('Streams require a scheduled stream input.') },
    emitProgress: (channel, value) => {
      if (options.isActive()) options.progress?.(channel, value)
    },
    next: () => {},
    interrupt: () => { throw new Error('Interrupts require a scheduled node activation.') },
    services: createServiceContext(options.services),
    inputs: node.inputs.filter((port) => isDataPort(port.type)),
    outputs: node.outputs.filter((port) => isDataPort(port.type)),
  }
}
