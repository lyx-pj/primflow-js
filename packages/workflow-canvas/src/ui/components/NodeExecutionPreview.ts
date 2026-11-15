import { html, nothing } from 'lit-html'
import { styleMap } from 'lit-html/directives/style-map.js'
import type { NodeInstanceType } from '../../Graph'
import type { CanvasGraph } from '../types'
import { OverlayComponent } from '../OverlayComponent'
import type { OverlayLayer } from '../OverlayLayer'
import { stopWheel } from '../helpers'
import { formatExecutionValue } from '../executionFormat'

/** Execution previews for completed or active breakpoint nodes; delay closing for card entry. */
export class NodeExecutionPreview extends OverlayComponent {
  private readonly graph: CanvasGraph
  private node: NodeInstanceType | null = null
  private anchor: Element | null = null
  private hideTimer?: ReturnType<typeof setTimeout>
  private nodeHovered = false
  private cardHovered = false

  refreshLanguage() {
    this.render()
  }

  constructor(graph: CanvasGraph, overlay: OverlayLayer) {
    super(overlay, 'bpgraph-preview-layer', () => graph.options.language)
    this.graph = graph
  }

  open(node: NodeInstanceType, anchor: Element) {
    this.close()
    if (node.type === 'start') return
    if (!this.previewStatus(node.id)) return
    this.node = node
    this.anchor = anchor
    this.nodeHovered = true
    this.render()
  }

  leave(node: NodeInstanceType | undefined) {
    // Subgraph changes or removal may dispose nodes before delayed mouseleave events arrive.
    if (!node || this.node?.id !== node.id) return
    this.nodeHovered = false
    this.scheduleHide()
  }

  refresh(nodeId: string) {
    if (this.node?.id !== nodeId) return
    if (!this.previewStatus(nodeId)) this.close()
    else this.render()
  }

  isOpen() {
    return this.node !== null
  }

  close = () => {
    this.cancelHide()
    this.node = null
    this.anchor = null
    this.nodeHovered = false
    this.cardHovered = false
    this.commit(nothing)
  }

  destroy() {
    this.close()
    super.destroy()
  }

  private cancelHide = () => {
    clearTimeout(this.hideTimer)
    this.hideTimer = undefined
  }

  private scheduleHide = () => {
    this.cancelHide()
    if (this.nodeHovered || this.cardHovered || this.host.contains(document.activeElement)) return
    this.hideTimer = setTimeout(this.close, 250)
  }

  private onCardEnter = () => {
    this.cardHovered = true
    this.cancelHide()
  }

  private onCardLeave = () => {
    this.cardHovered = false
    this.scheduleHide()
  }

  private onFocusOut = (evt: FocusEvent) => {
    if (!this.host.contains(evt.relatedTarget as globalThis.Node | null)) this.scheduleHide()
  }

  private previewStatus(nodeId: string) {
    if (this.graph.executionStatus === 'paused' && this.graph.pausedNodeId === nodeId) return 'paused'
    return this.graph.getNodeExecutionStatus(nodeId) === 'completed' ? 'completed' : null
  }

  private render() {
    if (!this.node || !this.anchor) return
    const bounds = this.overlay.rect()
    const anchor = this.anchor.getBoundingClientRect()
    const data = this.graph.getNodeExecutionData(this.node.id)
    const paused = this.previewStatus(this.node.id) === 'paused'
    this.commit(html`
      <div
        class="bpgraph-node-preview"
        role="tooltip"
        aria-label=${this.t('{node} execution data', { node: this.node.title || this.node.nodeType })}
        tabindex="0"
        style=${styleMap({
          maxWidth: `${Math.max(0, bounds.width - 24)}px`,
          maxHeight: `${Math.max(0, bounds.height - 24)}px`,
        })}
        @mouseenter=${this.onCardEnter}
        @mouseleave=${this.onCardLeave}
        @focusin=${this.cancelHide}
        @focusout=${this.onFocusOut}
        @wheel=${stopWheel}
      >
        <header class="bpgraph-node-preview-header">
          <strong>${this.node.title || this.node.nodeType}</strong>
          <span class=${paused ? 'is-paused' : ''}>${paused ? this.t('Paused at breakpoint') : this.t('Completed')}</span>
        </header>
        ${data ? html`
          ${this.section(this.t('Inputs'), data.inputs)}
          ${paused ? nothing : this.section(this.t('Outputs'), data.outputs)}
        ` : html`<p class="bpgraph-node-preview-empty">${this.t('No execution data')}</p>`}
      </div>
    `)
    const card = this.host.querySelector<HTMLElement>('.bpgraph-node-preview')!
    const width = card.offsetWidth
    const height = card.offsetHeight
    const right = anchor.right - bounds.left + 12
    const left = right + width <= bounds.width - 12 ? right : anchor.left - bounds.left - width - 12
    card.style.left = `${Math.max(12, Math.min(left, bounds.width - width - 12))}px`
    card.style.top = `${Math.max(12, Math.min(anchor.top - bounds.top, bounds.height - height - 12))}px`
  }

  private section(label: string, values: Record<string, unknown>) {
    const entries = Object.entries(values)
    return html`
      <section class="bpgraph-node-preview-section">
        <h4>${label}</h4>
        ${entries.length ? html`<dl>
          ${entries.map(([name, value]) => html`
            <div><dt>${name}</dt><dd><pre>${formatExecutionValue(value, this.graph.options.language)}</pre></dd></div>
          `)}
        </dl>` : html`<p class="bpgraph-node-preview-empty">${this.t('No data ports')}</p>`}
      </section>
    `
  }
}
