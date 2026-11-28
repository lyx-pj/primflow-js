import { nothing, render } from 'lit-html'
import type { OverlayPlacement, PortOverlayHost, PortOverlayOptions } from './editors'
import type { CanvasUIMountHandle } from './slots'

/**
 * Events that must not reach JointJS while an overlay is open.
 *
 * Without stopping them the canvas starts a selection or a node drag instead
 * of interacting with the overlay.
 */
const STOPPED_EVENTS = ['mousedown', 'pointerdown', 'touchstart', 'click', 'dblclick', 'contextmenu'] as const

/** Gap between an overlay and its anchor, and the smallest distance to the paper edge. */
const GAP = 4
const MARGIN = 4

function stopBubbling(evt: Event) {
  evt.stopPropagation()
}

/** Keep a value inside a range; when the range is inverted, prefer the minimum. */
function clamp(value: number, min: number, max: number) {
  if (max < min) return min
  return Math.min(Math.max(min, value), max)
}

interface OverlayEntry {
  content: HTMLDivElement
  anchor: HTMLElement
  outsideHandler: (evt: Event) => void
  mountHandle: CanvasUIMountHandle<void> | null
}

/**
 * Paper-level overlay host.
 *
 * Port editors render inside an SVG `foreignObject`, which clips any content
 * that overflows the port box. Overlays therefore render in a container
 * attached to the paper element, so a popover can extend beyond the node.
 *
 * Several overlays may be open at once, for example one per port. Each one is
 * positioned against its own anchor, flips to the opposite side when the
 * preferred side does not fit, and is clamped inside the paper so it never
 * runs off the edge.
 */
export class NodeOverlayHost implements PortOverlayHost {
  private host: HTMLDivElement | null = null
  private readonly overlays = new Set<OverlayEntry>()
  private readonly paperEl: HTMLElement

  constructor(paperEl: HTMLElement) {
    this.paperEl = paperEl
  }

  /** Open an overlay and return a function that closes only that overlay. */
  open(options: PortOverlayOptions): () => void {
    const host = this.ensureHost()
    const content = document.createElement('div')
    content.className = 'bpgraph-node-overlay'
    host.appendChild(content)
    let mountHandle: CanvasUIMountHandle<void> | null = null
    if (options.mount) {
      mountHandle = options.mount(content) ?? null
    } else if (options.render) {
      render(options.render(), content)
    }
    this.position(content, options.anchor, options.placement ?? 'above')

    const entry: OverlayEntry = {
      content,
      anchor: options.anchor,
      outsideHandler: () => {},
      mountHandle,
    }
    if (options.closeOnOutsideClick !== false) {
      entry.outsideHandler = (evt: Event) => {
        const target = evt.target as Node | null
        if (!target) return
        // Pressing the anchor again or interacting with the overlay keeps it open.
        if (content.contains(target) || options.anchor.contains(target)) return
        this.closeEntry(entry)
      }
      document.addEventListener('mousedown', entry.outsideHandler, true)
      document.addEventListener('click', entry.outsideHandler, true)
    }
    this.overlays.add(entry)
    return () => this.closeEntry(entry)
  }

  /** Close every open overlay. */
  close() {
    for (const entry of [...this.overlays]) this.closeEntry(entry)
  }

  /** Release the host element and every listener. */
  destroy() {
    this.close()
    this.host?.remove()
    this.host = null
  }

  private closeEntry(entry: OverlayEntry) {
    if (!this.overlays.delete(entry)) return
    document.removeEventListener('mousedown', entry.outsideHandler, true)
    document.removeEventListener('click', entry.outsideHandler, true)
    try {
      entry.mountHandle?.destroy?.()
    } finally {
      entry.mountHandle = null
      render(nothing, entry.content)
      entry.content.remove()
    }
  }

  private ensureHost() {
    if (!this.host || !this.host.isConnected) {
      const host = document.createElement('div')
      host.className = 'bpgraph-node-overlay-host'
      for (const event of STOPPED_EVENTS) host.addEventListener(event, stopBubbling)
      this.paperEl.appendChild(host)
      this.host = host
    }
    return this.host
  }

  /**
   * Position the overlay relative to its anchor.
   *
   * The preferred side is tried first, then the opposite side. The result is
   * clamped inside the paper, which also covers an anchor near a corner.
   */
  private position(content: HTMLElement, anchor: HTMLElement, placement: OverlayPlacement) {
    const paperRect = this.paperEl.getBoundingClientRect()
    const anchorRect = anchor.getBoundingClientRect()
    const left = anchorRect.left - paperRect.left
    const top = anchorRect.top - paperRect.top
    const right = anchorRect.right - paperRect.left
    const bottom = anchorRect.bottom - paperRect.top
    const width = content.offsetWidth
    const height = content.offsetHeight
    const paperWidth = paperRect.width
    const paperHeight = paperRect.height
    const maxLeft = paperWidth - width - MARGIN
    const maxTop = paperHeight - height - MARGIN

    let x: number
    let y: number
    switch (placement) {
      case 'below':
        x = left + (anchorRect.width - width) / 2
        y = bottom + GAP
        if (y > maxTop) y = top - height - GAP
        break
      case 'left':
        x = left - width - GAP
        y = top + (anchorRect.height - height) / 2
        if (x < MARGIN) x = right + GAP
        break
      case 'right':
        x = right + GAP
        y = top + (anchorRect.height - height) / 2
        if (x > maxLeft) x = left - width - GAP
        break
      default:
        x = left + (anchorRect.width - width) / 2
        y = top - height - GAP
        if (y < MARGIN) y = bottom + GAP
        break
    }

    content.style.left = `${clamp(x, MARGIN, maxLeft)}px`
    content.style.top = `${clamp(y, MARGIN, maxTop)}px`
  }
}
