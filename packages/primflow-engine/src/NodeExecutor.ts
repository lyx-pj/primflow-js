import type { ExecutorFn, NodeExecutionContext } from '@lyx-pj/primflow-model'
import type { ExecutionNode } from './ExecutionNode'

/** Holds the executors and resolved services of an engine. */
export class NodeExecutor {
  private executors = new Map<string, ExecutorFn>()
  readonly services: ReadonlyMap<string, unknown>

  constructor(services: ReadonlyMap<string, unknown>) {
    this.services = services
  }

  registerExecutor(name: string, executor: ExecutorFn) {
    this.executors.set(name, executor)
  }

  async executeNode(node: ExecutionNode, ctx: NodeExecutionContext, onSettled?: () => void): Promise<void> {
    const executor = this.getExecutorForNode(node)
    if (!executor) throw new Error(`No executor for ${node.definitionId}`)
    const settle = () => {
      const callback = onSettled
      onSettled = undefined
      callback?.()
    }
    try {
      const result = executor(ctx)
      // Close synchronous frame contexts immediately on return without an extra microtask window.
      if (!result || typeof result.then !== 'function') settle()
      await result
      if (!ctx.signal?.aborted) node.error = undefined
    } catch (err) {
      if (!ctx.signal?.aborted) node.error = err
      throw err
    } finally {
      settle()
    }
  }

  private getExecutorForNode(node: ExecutionNode): ExecutorFn | undefined {
    if (typeof node.executor === 'function') return node.executor
    return this.executors.get(node.executor ?? '') ?? this.executors.get(node.definitionId)
  }
}
