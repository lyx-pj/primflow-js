import {
  createContext,
  useCallback,
  useContext,
  type ReactNode,
} from 'react'
import { createRoot, type Root } from 'react-dom/client'
import type { CanvasUIMounter, CanvasUIMountFn } from '@lyx-pj/primflow-canvas'
import { ReactMountBridge } from './canvas-portal-host'

export type ReactMountFactory = <TCtx>(render: (context: TCtx) => ReactNode) => CanvasUIMountFn<TCtx>

interface PortalEntry {
  id: number
  container: HTMLElement
  element: ReactNode
}

/**
 * External store tracking active React portals mounted into canvas DOM containers.
 *
 * Rendering through portals keeps custom port editors, node cards, and panel
 * sections inside the host React tree so they inherit React Context (theme,
 * i18n, router, store, `useGraph`, `useEngine`).
 */
export class ReactPortalRegistry {
  private nextId = 1
  private entries: PortalEntry[] = []
  private readonly listeners = new Set<() => void>()

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  getSnapshot = (): readonly PortalEntry[] => this.entries

  mount<TCtx>(render: (context: TCtx) => ReactNode): CanvasUIMountFn<TCtx> {
    return (container, initialContext) => {
      const id = this.nextId++
      this.upsert(id, container, <ReactMountBridge render={render} context={initialContext} />)
      return {
        update: (nextContext) => {
          this.upsert(id, container, <ReactMountBridge render={render} context={nextContext} />)
        },
        destroy: () => {
          this.remove(id)
        },
      }
    }
  }

  private upsert(id: number, container: HTMLElement, element: ReactNode) {
    const idx = this.entries.findIndex((entry) => entry.id === id)
    if (idx === -1) {
      this.entries = [...this.entries, { id, container, element }]
    } else {
      const next = this.entries.slice()
      next[idx] = { id, container, element }
      this.entries = next
    }
    this.emit()
  }

  private remove(id: number) {
    const next = this.entries.filter((entry) => entry.id !== id)
    if (next.length === this.entries.length) return
    this.entries = next
    this.emit()
  }

  private emit() {
    for (const listener of this.listeners) listener()
  }
}

export function createReactPortalRegistry(): ReactPortalRegistry {
  return new ReactPortalRegistry()
}

export const PortalRegistryContext = createContext<ReactPortalRegistry | null>(null)

/**
 * Create a standalone React `CanvasUIMountFn` backed by `createRoot`.
 *
 * Works anywhere (including module-level static `GraphOptions` outside a React
 * tree). For components that need access to outer React Context, prefer
 * `useReactMount()` inside `GraphProvider`.
 */
export function createReactMount<TCtx>(render: (context: TCtx) => ReactNode): CanvasUIMountFn<TCtx> {
  return (container, initialContext) => {
    let root: Root | null = createRoot(container)
    root.render(<ReactMountBridge render={render} context={initialContext} />)
    return {
      update: (nextContext) => {
        root?.render(<ReactMountBridge render={render} context={nextContext} />)
      },
      destroy: () => {
        const current = root
        root = null
        if (!current) return
        // Defer unmount to avoid React warnings when triggered synchronously inside a render pass.
        queueMicrotask(() => {
          current.unmount()
        })
      },
    }
  }
}

/** Convenience wrapper returning `{ mount }` for `CanvasUISlot` / `NodePanelOptions`. */
export function createReactSlot<TCtx>(render: (context: TCtx) => ReactNode): CanvasUIMounter<TCtx> {
  return { mount: createReactMount(render) }
}

/**
 * Returns a `reactMount` helper that mounts React JSX into canvas containers
 * via portals attached to the enclosing `GraphProvider` (or falls back to
 * `createReactMount` when called outside a `GraphProvider`).
 */
export function useReactMount(): ReactMountFactory {
  const registry = useContext(PortalRegistryContext)
  return useCallback(
    <TCtx,>(render: (context: TCtx) => ReactNode): CanvasUIMountFn<TCtx> => {
      return registry ? registry.mount(render) : createReactMount(render)
    },
    [registry]
  )
}
