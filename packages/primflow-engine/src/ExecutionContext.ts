import type { ExecContext } from '@lyx-pj/primflow-model'
import type { NodeInstanceType } from './Runtime'

export type ContextOptions = {
  signal?: AbortSignal
  taskId?: string
  ctx?: unknown
  error?: unknown
  nodeState?: Record<string, unknown>
  isActive: () => boolean
  getService: (name: string) => unknown
  emit: (name: string, ...payload: unknown[]) => void
}

/** Bind each context to a specific task and node; async callbacks never rely on a global current task. */
export function createExecutionContext(node: NodeInstanceType, options: ContextOptions): ExecContext {
  return {
    taskId: options.taskId,
    signal: options.signal,
    state: node.state,
    nodeState: options.nodeState,
    ctx: options.ctx,
    error: options.error,
    data: node.data,
    getInput: <T = unknown>(name: string) => node.getInput(name) as T | undefined,
    setOutput: (name, value) => {
      if (options.isActive()) node.setOutput(name, options.taskId ? structuredClone(value) : value)
    },
    emitEvent: (name, ...payload) => {
      if (options.isActive()) options.emit(name, ...payload)
    },
    next: () => {},
    services: { get: options.getService },
    inputs: node.inputs.filter((port) => port.type !== 'exec' && port.type !== 'spacer'),
    outputs: node.outputs.filter((port) => port.type !== 'exec' && port.type !== 'spacer'),
  }
}
