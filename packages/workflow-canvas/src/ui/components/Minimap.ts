import type { dia } from '@joint/core'
import type { NodeStyle } from '@lyx-pj/workflow-model'
import { html, svg } from 'lit-html'
import { OverlayComponent } from '../OverlayComponent'
import type { OverlayLayer } from '../OverlayLayer'
import type { CanvasGraph } from '../types'
import { stopWheel } from '../helpers'
import { getMinimapBounds, type MinimapBounds } from '../minimapBounds'

const MODEL_EVENTS = 'add remove reset change:position change:size change:angle change:source change:target change:vertices change:style'

/** Render simplified nodes and links without copying full node DOM or creating another Paper. */
export class Minimap extends OverlayComponent {
  private readonly graph: CanvasGraph
  private readonly paper: dia.Paper
  private frame: number | null = null
  private disposed = false

  refreshLanguage() {
    this.render()
  }

  constructor(graph: CanvasGraph, paper: dia.Paper, overlay: OverlayLayer) {
    super(overlay, 'bpgraph-minimap-layer', () => graph.options.language)
    this.graph = graph
    this.paper = paper
    paper.model.on(MODEL_EVENTS, this.schedule)
    this.render()
  }

  override destroy() {
    this.disposed = true
    this.paper.model.off(MODEL_EVENTS, this.schedule)
    if (this.frame !== null) cancelAnimationFrame(this.frame)
    super.destroy()
  }

  // Batch layout and link changes within the same frame.
  private schedule = () => {
    if (this.disposed || this.frame !== null) return
    this.frame = requestAnimationFrame(() => {
      this.frame = null
      this.render()
    })
  }

  private render() {
    const bounds = getMinimapBounds(this.paper.model)
    const nodes = this.paper.model.getElements()

    this.commit(html`
      <div class="bpgraph-minimap" @wheel=${stopWheel} @click=${(evt: MouseEvent) => this.navigate(evt, bounds)}>
        <svg
          class="bpgraph-minimap-map"
          viewBox=${`${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}`}
          preserveAspectRatio="none"
          role="img"
          aria-label=${this.t('Graph overview')}
        >
          ${this.paper.model.getLinks().map(link => {
            const points = [link.getSourcePoint(), ...link.vertices(), link.getTargetPoint()]
            return svg`<polyline class="bpgraph-minimap-link" points=${points.map(point => `${point.x},${point.y}`).join(' ')} />`
          })}
          ${nodes.map(node => {
            const rect = node.getBBox()
            const style = node.get('style') as NodeStyle | undefined
            return svg`<rect class="bpgraph-minimap-node" x=${rect.x} y=${rect.y} width=${rect.width} height=${rect.height} rx="4" fill=${style?.header?.background ?? '#64748b'} />`
          })}
        </svg>
      </div>
    `)
  }

  private navigate(evt: MouseEvent, bounds: MinimapBounds) {
    const rect = (evt.currentTarget as HTMLElement).getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return
    // Map the full card to overview bounds without unclickable padding.
    const x = bounds.x + (evt.clientX - rect.left) / rect.width * bounds.width
    const y = bounds.y + (evt.clientY - rect.top) / rect.height * bounds.height
    this.centerAt(x, y)
  }

  private centerAt(x: number, y: number) {
    const { width, height } = this.overlay.rect()
    if (width === 0 || height === 0) return
    const scale = this.paper.scale().sx
    this.graph.position = {
      x: width / 2 - x * scale, y: height / 2 - y * scale,
    }
    this.graph.emit('viewport:change', { ...this.graph.position, scale })
  }
}
