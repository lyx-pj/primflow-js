import type { dia } from '@joint/core'
import { html } from 'lit-html'
import { OverlayComponent } from '../OverlayComponent'
import type { OverlayLayer } from '../OverlayLayer'
import type { CanvasGraph } from '../types'

const MIN_SCALE = 0.2
const MAX_SCALE = 5
const SCALE_STEP = 0.1

export class ZoomControls extends OverlayComponent {
  private readonly graph: CanvasGraph
  private readonly paper: dia.Paper

  refreshLanguage() {
    this.refresh()
  }

  constructor(graph: CanvasGraph, paper: dia.Paper, overlay: OverlayLayer) {
    super(overlay, 'bpgraph-zoom-layer', () => graph.options.language)
    this.graph = graph
    this.paper = paper
    this.paper.on('scale', this.refresh)
    this.refresh()
  }

  override destroy() {
    this.paper.off('scale', this.refresh)
    super.destroy()
  }

  private refresh = () => {
    const scale = this.paper.scale().sx
    this.commit(html`
      <div class="bpgraph-zoom-controls" role="group" aria-label=${this.t('Canvas zoom')} @wheel=${(evt: WheelEvent) => evt.stopPropagation()}>
        <button
          type="button"
          class="bpgraph-zoom-button"
          title=${this.t('Zoom out')}
          aria-label=${this.t('Zoom out')}
          ?disabled=${scale <= MIN_SCALE}
          @click=${() => this.zoom(scale - SCALE_STEP)}
        >−</button>
        <button
          type="button"
          class="bpgraph-zoom-button bpgraph-zoom-value"
          title=${this.t('Reset to 100%')}
          aria-label=${this.t('Current zoom {percent}%, reset to 100%', { percent: Math.round(scale * 100) })}
          @click=${() => this.zoom(1)}
        >${Math.round(scale * 100)}%</button>
        <button
          type="button"
          class="bpgraph-zoom-button"
          title=${this.t('Zoom in')}
          aria-label=${this.t('Zoom in')}
          ?disabled=${scale >= MAX_SCALE}
          @click=${() => this.zoom(scale + SCALE_STEP)}
        >+</button>
        <button
          type="button"
          class="bpgraph-zoom-button bpgraph-zoom-fit"
          title=${this.t('Fit to nodes')}
          aria-label=${this.t('Fit to nodes')}
          @click=${this.fitNodes}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M8 3H3v5M16 3h5v5M21 16v5h-5M8 21H3v-5M8 8h8v8H8z" />
          </svg>
        </button>
      </div>
    `)
  }

  private zoom(value: number) {
    const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, Number(value.toFixed(2))))
    if (scale === this.paper.scale().sx) return
    this.graph.zoom(scale)
    // Imperative zoom emits no viewport event; notify the model to preserve zoom across subgraph switches.
    this.graph.emit('viewport:change', { ...this.graph.position, scale })
  }

  private fitNodes = () => {
    const bounds = this.paper.model.getCellsBBox(this.paper.model.getElements())
    const { width, height } = this.overlay.rect()
    const padding = 48
    if (!bounds || width <= padding * 2 || height <= padding * 2) return
    // Add padding and cap at original size so a single small node is not enlarged excessively.
    const scale = Math.max(MIN_SCALE, Math.min(
      1,
      (width - padding * 2) / Math.max(bounds.width, 1),
      (height - padding * 2) / Math.max(bounds.height, 1)
    ))
    this.graph.zoom(scale)
    this.graph.position = {
      x: width / 2 - (bounds.x + bounds.width / 2) * scale,
      y: height / 2 - (bounds.y + bounds.height / 2) * scale,
    }
    this.graph.emit('viewport:change', { ...this.graph.position, scale })
  }
}
