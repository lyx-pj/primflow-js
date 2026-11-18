import { nothing, render, type TemplateResult } from 'lit-html'
import { ensureUiStyles } from './styles'

/**
 * Native events intercepted at the overlay root.
 *
 * JointJS selection/dragging uses native `mousedown`, mapped to `blank:pointerdown`.
 * Stopping only pointerdown would let menu presses start canvas selection.
 * Without the paired pointerup, the selection box would keep following the cursor.
 */
const BUBBLING_EVENTS = ['mousedown', 'pointerdown', 'touchstart', 'click', 'dblclick', 'contextmenu'] as const

/**
 * Overlay view root inside the canvas container.
 *
 * Canvas UI such as palettes, context menus, and floating tools renders here.
 * Use declarative lit-html templates instead of separate imperative DOM construction.
 * This layer does not inherit JointJS zoom/pan; coordinates are container viewport coordinates.
 */
export class OverlayLayer {
  readonly root: HTMLDivElement
  private readonly container: HTMLElement
  private readonly previousPosition: string
  private disposed = false

  constructor(container: HTMLElement) {
    ensureUiStyles()
    this.container = container
    this.previousPosition = container.style.position
    if (getComputedStyle(container).position === 'static') {
      container.style.position = 'relative'
    }
    this.root = document.createElement('div')
    this.root.className = 'bpgraph-overlay'
    for (const event of BUBBLING_EVENTS) {
      this.root.addEventListener(event, this.stopBubbling)
    }
    container.appendChild(this.root)
  }

  /** Menu interactions belong to the menu and must not bubble to the canvas. */
  private stopBubbling = (evt: Event) => evt.stopPropagation()

  /** Viewport coordinates to container coordinates. */
  localPoint(clientX: number, clientY: number) {
    const rect = this.rect()
    return { x: clientX - rect.left, y: clientY - rect.top }
  }

  /** Canvas container position and dimensions in the viewport. */
  rect() {
    return this.container.getBoundingClientRect()
  }

  /**
   * Create an independent rendering layer for a UI component.
   * Each component owns a lit root; typing in panels does not rerender menus.
   */
  createHost(className: string) {
    const host = document.createElement('div')
    host.className = `bpgraph-layer ${className}`
    this.root.appendChild(host)
    return host
  }

  render(template: TemplateResult | typeof nothing) {
    if (this.disposed) return
    render(template, this.root)
  }

  dispose() {
    if (this.disposed) return
    this.disposed = true
    for (const event of BUBBLING_EVENTS) {
      this.root.removeEventListener(event, this.stopBubbling)
    }
    render(nothing, this.root)
    this.root.remove()
    this.container.style.position = this.previousPosition
  }
}
