import type { dia } from '@joint/core'
import { html } from 'lit-html'
import { OverlayComponent } from '../OverlayComponent'
import type { OverlayLayer } from '../OverlayLayer'
import type { CanvasGraph, ZoomControlsSlotContext } from '../types'

const MIN_SCALE = 0.2
const MAX_SCALE = 5
const SCALE_STEP = 0.1

/**
 * Floating bottom zoom bar.
 *
 * Tracks right-side panel inset so it stays centered inside the free canvas
 * region instead of colliding with open node/debug panels. Consumers can
 * replace or disable it via `GraphOptions.ui.zoomControls`.
 */
export class ZoomControls extends OverlayComponent {
  private readonly graph: CanvasGraph
  private readonly paper: dia.Paper
  private rightInset = 0

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

  /** Reserve the measured width of panels docked on the right side. */
  setRightInset(inset: number) {
    const next = Math.max(0, inset)
    this.host.style.setProperty('--bpgraph-zoom-inset', `${next}px`)
    if (this.rightInset === next) return
    this.rightInset = next
    this.refresh()
  }

  override destroy() {
    this.paper.off('scale', this.refresh)
    super.destroy()
  }

  refresh = () => {
    const scale = this.paper.scale().sx
    const percent = Math.round(scale * 100)
    const context: ZoomControlsSlotContext = {
      graph: this.graph,
      language: this.currentLanguage(),
      t: this.t,
      scale,
      percent,
      minScale: MIN_SCALE,
      maxScale: MAX_SCALE,
      rightInset: this.rightInset,
      zoomIn: () => this.zoom(scale + SCALE_STEP),
      zoomOut: () => this.zoom(scale - SCALE_STEP),
      resetZoom: () => this.zoom(1),
      setZoom: (value: number) => this.zoom(value),
      fitToNodes: this.fitNodes,
    }

    if (this.syncSlot(this.graph.options.ui?.zoomControls, context)) {
      return
    }

    this.commit(html`
      <pf-surface
        variant="pill"
        elevated
        class="bpgraph-zoom-controls"
        role="group"
        aria-label=${this.t('Canvas zoom')}
        @wheel=${(evt: WheelEvent) => evt.stopPropagation()}
      >
        <pf-tooltip content=${this.t('Zoom out')} placement="top" ?disabled=${scale <= MIN_SCALE}>
          <button
            type="button"
            class="bpgraph-zoom-button"
            title=${this.t('Zoom out')}
            aria-label=${this.t('Zoom out')}
            ?disabled=${scale <= MIN_SCALE}
            @click=${() => this.zoom(scale - SCALE_STEP)}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
              <path d="M5 12h14" />
            </svg>
          </button>
        </pf-tooltip>
        <pf-tooltip content=${this.t('Reset to 100%')} placement="top">
          <button
            type="button"
            class="bpgraph-zoom-button bpgraph-zoom-value"
            title=${this.t('Reset to 100%')}
            aria-label=${this.t('Current zoom {percent}%, reset to 100%', { percent })}
            @click=${() => this.zoom(1)}
          >${percent}%</button>
        </pf-tooltip>
        <pf-tooltip content=${this.t('Zoom in')} placement="top" ?disabled=${scale >= MAX_SCALE}>
          <button
            type="button"
            class="bpgraph-zoom-button"
            title=${this.t('Zoom in')}
            aria-label=${this.t('Zoom in')}
            ?disabled=${scale >= MAX_SCALE}
            @click=${() => this.zoom(scale + SCALE_STEP)}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        </pf-tooltip>
        <pf-divider vertical aria-hidden="true"></pf-divider>
        <pf-tooltip content=${this.t('Fit to nodes')} placement="top">
          <button
            type="button"
            class="bpgraph-zoom-button bpgraph-zoom-fit"
            title=${this.t('Fit to nodes')}
            aria-label=${this.t('Fit to nodes')}
            @click=${this.fitNodes}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M8 3H3v5M16 3h5v5M21 16v5h-5M8 21H3v-5M8 8h8v8H8z" />
            </svg>
          </button>
        </pf-tooltip>
      </pf-surface>
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
