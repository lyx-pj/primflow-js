import type { NodeCleanup, NodeEventHandler, NodeLifecycleContext } from '@lyx-pj/primflow-model'
import type { ExecutionNode } from './ExecutionNode'

type Entry = {
  node: ExecutionNode
  context: NodeLifecycleContext
  active: boolean
  destroyed: boolean
  subscriptions: Map<string, Set<NodeEventHandler>>
  cleanups: NodeCleanup[]
}

/** Manage session node resources independently of execution ports or activation counts. */
export class NodeLifecycle {
  private entries: Entry[]
  private activation?: Promise<void>
  private disposal?: Promise<void>
  private reportError: (error: unknown, nodeId: string) => void

  constructor(
    nodes: ExecutionNode[],
    createContext: (node: ExecutionNode) => Omit<NodeLifecycleContext, 'on' | 'once' | 'onCleanup'>,
    reportError: (error: unknown, nodeId: string) => void
  ) {
    this.reportError = reportError
    this.entries = [...new Set(nodes)].map((node) => {
      const on: NodeLifecycleContext['on'] = (name, handler) => {
        if (node.inLoopBody) throw new Error(`Loop bodies cannot register session event subscriptions: ${node.id}`)
        if (entry.context.signal.aborted) return () => {}
        let handlers = entry.subscriptions.get(name)
        if (!handlers) {
          handlers = new Set()
          entry.subscriptions.set(name, handlers)
        }
        handlers.add(handler)
        return () => {
          handlers.delete(handler)
        }
      }
      const entry: Entry = {
        node,
        active: false,
        destroyed: false,
        subscriptions: new Map(),
        cleanups: [],
        context: {
          ...createContext(node),
          on,
          once: (name, handler) => {
            const unsubscribe = on(name, (ctx, ...payload) => {
              unsubscribe()
              return handler(ctx, ...payload)
            })
            return unsubscribe
          },
          onCleanup: (cleanup) => {
            if (entry.destroyed) {
              void this.attempt(node.id, cleanup)
            } else {
              entry.cleanups.push(cleanup)
            }
          },
        },
      }
      return entry
    })
  }

  activate() {
    // Store the Promise before user hooks so stop inside a hook can await initialization.
    return (this.activation ??= Promise.resolve().then(async () => {
      for (const entry of this.entries) {
        if (entry.context.signal.aborted) return
        entry.active = true
        try {
          await entry.node.onActive?.(entry.context)
        } catch (error) {
          if (entry.context.signal.aborted) return
          this.reportError(error, entry.node.id)
          throw error
        }
      }
    }))
  }

  subscriptions(name: string) {
    return this.entries.flatMap((entry) =>
      [...(entry.subscriptions.get(name) ?? [])].map((handler) => ({
        nodeId: entry.node.id,
        handler,
        subscribed: () => entry.subscriptions.get(name)?.has(handler) ?? false,
      }))
    )
  }

  destroy() {
    return (this.disposal ??= this.dispose())
  }

  private async attempt(nodeId: string, action: NodeCleanup) {
    try {
      await action()
    } catch (error) {
      this.reportError(error, nodeId)
    }
  }

  private async dispose() {
    // Wait for initialization to exit, even on failure or cancellation, before destroying resources.
    await this.activation?.catch(() => {})
    const entries = [...this.entries].reverse()
    for (const entry of entries) {
      entry.subscriptions.clear()
      if (entry.active) {
        await this.attempt(entry.node.id, () => entry.node.onDeactivate?.(entry.context))
      }
      while (entry.cleanups.length) {
        await this.attempt(entry.node.id, entry.cleanups.pop()!)
      }
    }
    for (const entry of entries) {
      await this.attempt(entry.node.id, () => entry.node.onDestroy?.(entry.context))
      while (entry.cleanups.length) {
        await this.attempt(entry.node.id, entry.cleanups.pop()!)
      }
      entry.destroyed = true
      // Do not reuse lifecycle state across runs or modify graph configuration and shared services.
      for (const key of Object.keys(entry.node.state)) delete entry.node.state[key]
      entry.node.inputValues = {}
      entry.node.outputValues = {}
      entry.node.data = undefined
      entry.node.error = undefined
    }
    this.entries = []
  }
}
