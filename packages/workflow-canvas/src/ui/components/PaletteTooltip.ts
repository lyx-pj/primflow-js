import { html, nothing } from 'lit-html'
import { styleMap } from 'lit-html/directives/style-map.js'
import { OverlayComponent } from '../OverlayComponent'
import type { OverlayLayer } from '../OverlayLayer'
import { stopWheel } from '../helpers'

type TooltipTarget = { anchor: HTMLElement; text: string }
type TooltipSource = 'hover' | 'focus'
let nextTooltipId = 0

/** Separate overlay prevents descriptions from being clipped by scrolling lists. */
export class PaletteTooltip extends OverlayComponent {
  private readonly id = `bpgraph-palette-tooltip-${++nextTooltipId}`
  private hovered: TooltipTarget | null = null
  private focused: TooltipTarget | null = null
  private target: TooltipTarget | null = null
  private source: TooltipSource = 'hover'
  private cardHovered = false
  private visible = false
  private timer?: ReturnType<typeof setTimeout>

  constructor(overlay: OverlayLayer) {
    super(overlay, 'bpgraph-palette-tooltip-layer')
  }

  enter(anchor: HTMLElement, text: string | undefined, source: TooltipSource) {
    this.source = source
    const target = text ? { anchor, text } : null
    if (source === 'hover') this.hovered = target
    else this.focused = target
    this.refresh()
  }

  leave(anchor: HTMLElement, source: TooltipSource) {
    if (source === 'hover' && this.hovered?.anchor === anchor) this.hovered = null
    if (source === 'focus' && this.focused?.anchor === anchor) this.focused = null
    this.refresh()
  }

  close = () => {
    this.hovered = null
    this.focused = null
    this.hide()
  }

  destroy() {
    this.close()
    super.destroy()
  }

  private refresh() {
    clearTimeout(this.timer)
    const preferred = this.source === 'hover' ? (this.hovered ?? this.focused) : (this.focused ?? this.hovered)
    const target = preferred ?? (this.cardHovered ? this.target : null)
    if (!target) {
      if (this.visible) this.timer = setTimeout(() => this.hide(), 120)
      else this.hide()
      return
    }
    if (target.anchor === this.target?.anchor && target.text === this.target.text && this.visible) return
    this.hide()
    this.target = target
    if (this.hovered) this.timer = setTimeout(() => this.show(), 180)
    else this.show()
  }

  private hide() {
    clearTimeout(this.timer)
    this.timer = undefined
    this.target?.anchor.removeAttribute('aria-describedby')
    this.target = null
    this.visible = false
    this.cardHovered = false
    this.commit(nothing)
  }

  private show() {
    const target = this.target
    if (!target?.anchor.isConnected) {
      this.close()
      return
    }
    const bounds = this.overlay.rect()
    const anchor = target.anchor.getBoundingClientRect()
    this.commit(html`
      <div
        id=${this.id}
        class="bpgraph-palette-tooltip"
        role="tooltip"
        style=${styleMap({
          maxWidth: `${Math.max(0, Math.min(240, bounds.width - 16))}px`,
          maxHeight: `${Math.max(0, bounds.height - 16)}px`,
        })}
        @wheel=${stopWheel}
        @mouseenter=${() => {
          this.cardHovered = true
          clearTimeout(this.timer)
        }}
        @mouseleave=${() => {
          this.cardHovered = false
          this.refresh()
        }}
      >
        ${target.text}
      </div>
    `)
    const card = this.host.querySelector<HTMLElement>('.bpgraph-palette-tooltip')!
    const width = card.offsetWidth
    const height = card.offsetHeight
    const right = anchor.right - bounds.left + 10
    const left = anchor.left - bounds.left - width - 10
    let x = right
    let y = anchor.top - bounds.top + (anchor.height - height) / 2
    if (right + width > bounds.width - 8) {
      if (left >= 8) x = left
      else {
        x = anchor.left - bounds.left + (anchor.width - width) / 2
        const below = anchor.bottom - bounds.top + 8
        y = below + height <= bounds.height - 8 ? below : anchor.top - bounds.top - height - 8
      }
    }
    card.style.left = `${Math.max(8, Math.min(x, bounds.width - width - 8))}px`
    card.style.top = `${Math.max(8, Math.min(y, bounds.height - height - 8))}px`
    target.anchor.setAttribute('aria-describedby', this.id)
    this.visible = true
  }
}
