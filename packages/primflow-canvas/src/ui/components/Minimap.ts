import type { dia } from '@joint/core'
import type { NodeStyle } from '@lyx-pj/primflow-model'
import { html, svg } from 'lit-html'
import { OverlayComponent } from '../OverlayComponent'
import type { OverlayLayer } from '../OverlayLayer'
import type { CanvasGraph, MinimapSlotContext, MinimapViewportRect } from '../types'
import { stopWheel } from '../helpers'
import { getMinimapBounds, type MinimapBounds } from '../minimapBounds'

const MODEL_EVENTS = 'add remove reset change:position change:size change:angle change:source change:target change:vertices change:style'

/**
 * Render simplified nodes, links, and a camera indicator without copying full
 * node DOM or creating another Paper. Consumers can replace or disable it via
 * `GraphOptions.ui.minimap`.
 */
export class Minimap extends OverlayComponent {
  private readonly graph: CanvasGraph
  private readonly paper: dia.Paper
  private frame: number | null = null
  private disposed = false
  private dragging = false
  private currentBounds: MinimapBounds | null = null

  refreshLanguage() {
    this.render()
  }

  refresh() {
    this.render()
  }

  constructor(graph: CanvasGraph, paper: dia.Paper, overlay: OverlayLayer) {
    super(overlay, 'bpgraph-minimap-layer', () => graph.options.language)
    this.graph = graph
    this.paper = paper
    paper.model.on(MODEL_EVENTS, this.schedule)
    paper.on('scale', this.schedule)
    paper.on('translate', this.schedule)
    this.render()
  }

  override destroy() {
    this.disposed = true
    this.stopDrag()
    this.paper.model.off(MODEL_EVENTS, this.schedule)
    this.paper.off('scale', this.schedule)
    this.paper.off('translate', this.schedule)
    if (this.frame !== null) cancelAnimationFrame(this.frame)
    super.destroy()
  }

  // Batch layout, viewport, and link changes within the same frame.
  private schedule = () => {
    if (this.disposed || this.frame !== null) return
    this.frame = requestAnimationFrame(() => {
      this.frame = null
      this.render()
    })
  }

  private viewportRect(): MinimapViewportRect {
    const rect = this.overlay.rect()
    const scale = this.paper.scale().sx || 1
    const translate = typeof this.paper.translate === 'function'
      ? this.paper.translate()
      : { tx: this.graph.position.x, ty: this.graph.position.y }
    return {
      x: -translate.tx / scale,
      y: -translate.ty / scale,
      width: rect.width / scale,
      height: rect.height / scale,
    }
  }

  private render() {
    const bounds = getMinimapBounds(this.paper.model)
    this.currentBounds = bounds
    const viewport = this.viewportRect()
    const nodes = this.paper.model.getElements()
    const links = this.paper.model.getLinks()

    const context: MinimapSlotContext = {
      graph: this.graph,
      language: this.currentLanguage(),
      t: this.t,
      bounds,
      viewport,
      nodes: nodes.map((node) => {
        const rect = node.getBBox()
        const style = node.get('style') as NodeStyle | undefined
        return {
          id: String(node.id),
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
          color: style?.header?.background ?? '#64748b',
        }
      }),
      links: links.map((link) => ({
        id: String(link.id),
        points: [link.getSourcePoint(), ...link.vertices(), link.getTargetPoint()],
      })),
      centerAt: (x, y) => this.centerAt(x, y),
    }

    if (this.syncSlot(this.graph.options.ui?.minimap, context)) {
      return
    }

    const showCamera = viewport.width > 0 && viewport.height > 0

    this.commit(html`
      <pf-surface
        variant="card"
        elevated
        class="bpgraph-minimap"
        @wheel=${stopWheel}
        @pointerdown=${(evt: PointerEvent) => this.onPointerDown(evt, bounds)}
        @click=${(evt: MouseEvent) => this.navigate(evt, bounds)}
      >
        <svg
          class="bpgraph-minimap-map"
          viewBox=${`${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}`}
          preserveAspectRatio="none"
          role="img"
          aria-label=${this.t('Graph overview')}
        >
          ${links.map((link) => {
            const points = [link.getSourcePoint(), ...link.vertices(), link.getTargetPoint()]
            return svg`<polyline class="bpgraph-minimap-link" points=${points.map((point) => `${point.x},${point.y}`).join(' ')} />`
          })}
          ${nodes.map((node) => {
            const rect = node.getBBox()
            const style = node.get('style') as NodeStyle | undefined
            return svg`<rect class="bpgraph-minimap-node" x=${rect.x} y=${rect.y} width=${rect.width} height=${rect.height} rx="6" fill=${style?.header?.background ?? '#64748b'} />`
          })}
          ${showCamera
            ? svg`<rect
                class="pf-minimap-camera"
                x=${viewport.x}
                y=${viewport.y}
                width=${viewport.width}
                height=${viewport.height}
                rx="8"
              />`
            : null}
        </svg>
      </pf-surface>
    `)
  }

  private onPointerDown(evt: PointerEvent, bounds: MinimapBounds) {
    if (evt.button !== 0) return
    this.dragging = true
    this.currentBounds = bounds
    window.addEventListener('pointermove', this.onPointerMove)
    window.addEventListener('pointerup', this.stopDrag)
    window.addEventListener('pointercancel', this.stopDrag)
  }

  private onPointerMove = (evt: PointerEvent) => {
    if (!this.dragging || !this.currentBounds) return
    const card = this.host.querySelector<HTMLElement>('.bpgraph-minimap')
    if (!card) return
    this.navigateFromClient(evt.clientX, evt.clientY, card, this.currentBounds)
  }

  private stopDrag = () => {
    if (!this.dragging) return
    this.dragging = false
    window.removeEventListener('pointermove', this.onPointerMove)
    window.removeEventListener('pointerup', this.stopDrag)
    window.removeEventListener('pointercancel', this.stopDrag)
  }

  private navigate(evt: MouseEvent, bounds: MinimapBounds) {
    this.navigateFromClient(evt.clientX, evt.clientY, evt.currentTarget as HTMLElement, bounds)
  }

  private navigateFromClient(clientX: number, clientY: number, card: HTMLElement, bounds: MinimapBounds) {
    const rect = card.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return
    // Map the full card to overview bounds without unclickable padding.
    const x = bounds.x + ((clientX - rect.left) / rect.width) * bounds.width
    const y = bounds.y + ((clientY - rect.top) / rect.height) * bounds.height
    this.centerAt(x, y)
  }

  private centerAt(x: number, y: number) {
    const { width, height } = this.overlay.rect()
    if (width === 0 || height === 0) return
    const scale = this.paper.scale().sx
    this.graph.position = {
      x: width / 2 - x * scale,
      y: height / 2 - y * scale,
    }
    this.graph.emit('viewport:change', { ...this.graph.position, scale })
  }
}
