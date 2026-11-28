import { nothing, render, type TemplateResult } from 'lit-html'

/**
 * Lifecycle handle returned by a framework-agnostic custom UI mounter.
 *
 * React, Vue, Svelte, or plain DOM consumers can mount into `container`,
 * receive reactive updates through `update`, and clean up in `destroy`.
 */
export interface CanvasUIMountHandle<TCtx> {
  update?: (context: TCtx) => void
  destroy?: () => void
}

/** Framework-agnostic DOM mount callback for custom UI controls. */
export type CanvasUIMountFn<TCtx> = (container: HTMLElement, context: TCtx) => CanvasUIMountHandle<TCtx> | void

/** Framework-agnostic DOM mounter for replacing any built-in canvas UI control. */
export interface CanvasUIMounter<TCtx> {
  mount: CanvasUIMountFn<TCtx>
}

/** Lightweight lit-html template renderer for replacing a built-in canvas UI control. */
export type CanvasUIRenderer<TCtx> = (context: TCtx) => TemplateResult | typeof nothing

/**
 * Pluggable replacement slot for any built-in canvas UI component.
 *
 * - `undefined`: render the built-in Lit Web Component UI.
 * - `false` or `null`: disable the control completely.
 * - function: render custom lit-html markup inside the component layer.
 * - `{ mount }`: mount arbitrary external UI (React Portal/Root, Vue, vanilla DOM).
 */
export type CanvasUISlot<TCtx> = false | null | CanvasUIRenderer<TCtx> | CanvasUIMounter<TCtx>

export function isCanvasUIMounter<TCtx>(
  value: CanvasUISlot<TCtx> | CanvasUIRenderer<TCtx> | CanvasUIMounter<TCtx> | undefined
): value is CanvasUIMounter<TCtx> {
  return typeof value === 'object' && value !== null && typeof value.mount === 'function'
}

interface KeyedMountEntry {
  mount: CanvasUIMountFn<any>
  element: HTMLDivElement
  handle: CanvasUIMountHandle<any> | null
}

/**
 * Manages keyed imperative DOM mount hosts inside lit-html templates.
 *
 * Each key owns a stable wrapper `<div style="display:contents">` that can be
 * embedded directly in a lit-html template via `keyed(key, element)`. Repeated
 * renders with the same key and mount function call `handle.update(ctx)`
 * instead of remounting; unused keys are pruned and destroyed after each render.
 */
export class MountRegistry {
  private readonly entries = new Map<string, KeyedMountEntry>()

  sync<TCtx>(key: string, mount: CanvasUIMountFn<TCtx>, context: TCtx): HTMLDivElement {
    const existing = this.entries.get(key)
    if (existing && (existing.mount === mount || typeof existing.handle?.update === 'function')) {
      existing.handle?.update?.(context)
      return existing.element
    }
    if (existing) {
      this.destroyEntry(existing)
      this.entries.delete(key)
    }
    const element = document.createElement('div')
    element.className = 'bpgraph-custom-mount'
    element.style.display = 'contents'
    const handle = mount(element, context) ?? null
    this.entries.set(key, { mount, element, handle })
    return element
  }

  /** Destroy every mounted entry whose key was not used in the latest render pass. */
  prune(activeKeys: ReadonlySet<string>) {
    for (const [key, entry] of [...this.entries]) {
      if (!activeKeys.has(key)) {
        this.destroyEntry(entry)
        this.entries.delete(key)
      }
    }
  }

  /** Destroy every active mount entry. */
  clear() {
    for (const entry of this.entries.values()) {
      this.destroyEntry(entry)
    }
    this.entries.clear()
  }

  private destroyEntry(entry: KeyedMountEntry) {
    try {
      entry.handle?.destroy?.()
    } finally {
      // Detach the wrapper without clearing its children so async framework unmounts
      // (such as React portals or deferred `root.unmount()`) can remove their own nodes.
      entry.element.remove()
    }
  }
}

/**
 * Manages mounting, updating, and disposing an external replacement slot
 * on top of an overlay host element.
 */
export class SlotHost<TCtx> {
  private readonly container: HTMLElement
  private activeSlot: CanvasUISlot<TCtx> | undefined = undefined
  private mountRoot: HTMLDivElement | null = null
  private handle: CanvasUIMountHandle<TCtx> | null = null
  private litRendered = false

  constructor(container: HTMLElement) {
    this.container = container
  }

  /**
   * Synchronize the external slot with the latest component state.
   *
   * Returns `true` when the slot owns the container (disabled or custom),
   * or `false` when the built-in control should render as usual.
   */
  sync(slot: CanvasUISlot<TCtx> | undefined, context: TCtx): boolean {
    if (slot === undefined) {
      this.clearExternal()
      return false
    }

    if (slot === false || slot === null) {
      this.clearExternal()
      render(nothing, this.container)
      return true
    }

    if (typeof slot === 'function') {
      if (this.mountRoot) this.clearMount()
      this.activeSlot = slot
      render(slot(context), this.container)
      this.litRendered = true
      return true
    }

    if (isCanvasUIMounter(slot)) {
      if (this.litRendered) {
        render(nothing, this.container)
        this.litRendered = false
      }
      if (this.activeSlot !== slot || !this.mountRoot) {
        this.clearMount()
        // Clear any previous built-in lit markup before handing the container over.
        render(nothing, this.container)
        const root = document.createElement('div')
        root.className = 'bpgraph-custom-slot'
        root.style.display = 'contents'
        this.container.appendChild(root)
        this.mountRoot = root
        this.activeSlot = slot
        this.handle = slot.mount(root, context) ?? null
      } else {
        this.handle?.update?.(context)
      }
      return true
    }

    return false
  }

  dispose() {
    this.clearExternal()
  }

  private clearExternal() {
    this.clearMount()
    if (this.litRendered) {
      render(nothing, this.container)
      this.litRendered = false
    }
    this.activeSlot = undefined
  }

  private clearMount() {
    if (this.handle) {
      try {
        this.handle.destroy?.()
      } finally {
        this.handle = null
      }
    }
    if (this.mountRoot) {
      this.mountRoot.remove()
      this.mountRoot = null
    }
    this.activeSlot = undefined
  }
}
