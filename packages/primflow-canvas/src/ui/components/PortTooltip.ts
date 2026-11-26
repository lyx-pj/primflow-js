import { html, nothing } from 'lit-html'
import { OverlayComponent } from '../OverlayComponent'
import type { OverlayLayer } from '../OverlayLayer'

/** Elements that identify one port on hover: its shape and its label. */
const PORT_PIECE = '[data-port-type]'

/** Gap between the tooltip and the port, and the smallest distance to the canvas edge. */
const GAP = 8
const MARGIN = 8

/**
 * Delay before a hovered port shows its tooltip.
 *
 * Crossing the canvas moves the pointer over many small ports; showing at once
 * would make cards flash without the pointer ever resting on a port.
 */
const SHOW_DELAY = 300

let nextTooltipId = 0

/**
 * Tooltip for a node port.
 *
 * The port shape carries the display name and type as data attributes, so the
 * tooltip works for rebuilt ports and custom renderers without reading the
 * model. It renders in the canvas overlay instead of an SVG `foreignObject`, so
 * the card is not clipped by the node or the port box.
 */
export class PortTooltip extends OverlayComponent {
  private readonly id = `bpgraph-port-tooltip-${++nextTooltipId}`
  private hovered: Element | null = null
  private described: Element | null = null
  private timer?: ReturnType<typeof setTimeout>
  private pending: { anchor: Element; name: string; type: string; side: 'left' | 'right' } | null = null

  constructor(overlay: OverlayLayer) {
    super(overlay, 'bpgraph-port-tooltip-layer')
  }

  /** Show the tooltip for a pointer that entered `target`, if it is a port. */
  enter(target: Element | null) {
    const piece = target?.closest?.(PORT_PIECE) ?? null
    if (!piece) {
      this.hide()
      return
    }
    const port = piece.closest('.bpgraph-port') ?? piece
    if (port === this.hovered) return
    const name = piece.getAttribute('data-port-label') || piece.getAttribute('data-port-name') || ''
    const type = piece.getAttribute('data-port-type') ?? ''
    if (!name && !type) {
      this.hide()
      return
    }
    this.hovered = port
    // A label sits inside the node body; anchor the card to the port shape so
    // both halves of the port show the tooltip in the same place.
    const anchor = port.querySelector('[data-port-kind]') ?? piece
    const direction = piece.getAttribute('data-port-direction')
    // Drop a card left over from the previous port instead of showing it while
    // the pointer is already somewhere else.
    this.clear()
    this.pending = { anchor, name, type, side: direction === 'out' ? 'right' : 'left' }
    this.schedule()
  }

  /** Hide the tooltip once the pointer leaves the port it belongs to. */
  leave(target: Element | null, relatedTarget: Element | null = null) {
    const piece = target?.closest?.(PORT_PIECE) ?? null
    if (!piece) return
    const port = piece.closest('.bpgraph-port') ?? piece
    if (port !== this.hovered) return
    // Sliding between the port shape and its label stays inside one port.
    if (relatedTarget && port.contains(relatedTarget)) return
    this.hide()
  }

  hide = () => {
    this.cancelTimer()
    this.pending = null
    this.hovered = null
    this.clear()
  }

  override destroy() {
    this.hide()
    super.destroy()
  }

  /** Show the pending card once the pointer has rested on the port long enough. */
  private schedule() {
    this.cancelTimer()
    this.timer = setTimeout(() => {
      this.timer = undefined
      const pending = this.pending
      this.pending = null
      if (!pending || !pending.anchor.isConnected) return
      this.show(pending.anchor, pending.name, pending.type, pending.side)
    }, SHOW_DELAY)
  }

  private cancelTimer() {
    if (this.timer === undefined) return
    clearTimeout(this.timer)
    this.timer = undefined
  }

  /** Remove the rendered card and the accessibility link without touching hover state. */
  private clear() {
    if (this.described) {
      this.described.removeAttribute('aria-describedby')
      this.described = null
    }
    if (this.host.childElementCount > 0) this.commit(nothing)
  }

  private show(anchor: Element, name: string, type: string, side: 'left' | 'right') {
    this.clear()
    this.commit(html`
      <div id=${this.id} class="bpgraph-port-tooltip" role="tooltip">
        <span class="bpgraph-port-tooltip-name">${name}</span>
        <span class="bpgraph-port-tooltip-type">${type}</span>
      </div>
    `)
    const card = this.host.querySelector<HTMLElement>('.bpgraph-port-tooltip')
    if (!card) return
    const bounds = this.overlay.rect()
    const rect = anchor.getBoundingClientRect()
    const width = card.offsetWidth
    const height = card.offsetHeight
    const right = rect.right - bounds.left + GAP
    const left = rect.left - bounds.left - width - GAP
    let x = side === 'right' ? right : left
    // Flip to the other side of the port when the preferred side lacks room.
    if (side === 'right' && x + width > bounds.width - MARGIN) x = left
    if (side === 'left' && x < MARGIN) x = right
    const y = rect.top - bounds.top + (rect.height - height) / 2
    card.style.left = `${Math.max(MARGIN, Math.min(x, bounds.width - width - MARGIN))}px`
    card.style.top = `${Math.max(MARGIN, Math.min(y, bounds.height - height - MARGIN))}px`
    anchor.setAttribute('aria-describedby', this.id)
    this.described = anchor
  }
}
