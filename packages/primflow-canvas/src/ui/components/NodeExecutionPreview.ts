import { html, nothing } from 'lit-html'
import { styleMap } from 'lit-html/directives/style-map.js'
import type { NodeInstanceType } from '../../Graph'
import type { CanvasGraph, NodeExecutionPreviewSlotContext } from '../types'
import { OverlayComponent } from '../OverlayComponent'
import type { OverlayLayer } from '../OverlayLayer'
import { stopWheel } from '../helpers'
import { executionAttempt, executionPorts, executionStatus } from './executionDetails'
import { applyFloatingPosition } from '../primitives'

/** Live execution status and available port data for the hovered node. */
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

  refresh(nodeId?: string) {
    if (nodeId !== undefined && this.node?.id !== nodeId) return
    this.render()
  }

  isOpen() {
    return this.host.childElementCount > 0 && this.node !== null
  }

  close = () => {
    this.cancelHide()
    this.node = null
    this.anchor = null
    this.nodeHovered = false
    this.cardHovered = false
    if (this.syncSlot(this.graph.options.ui?.nodeExecutionPreview, this.emptySlotContext())) return
    this.commit(nothing)
  }

  override destroy() {
    this.close()
    super.destroy()
  }

  private emptySlotContext(): NodeExecutionPreviewSlotContext {
    return {
      graph: this.graph,
      language: this.currentLanguage(),
      t: this.t,
      open: false,
      node: null,
      status: null,
      data: undefined,
      anchor: null,
      close: this.close,
    }
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
    const status = this.graph.getNodeExecutionStatus(nodeId)
    return status === 'idle' && this.graph.executionStatus === 'idle' && !this.graph.isReplayMode() ? null : status
  }

  private render() {
    if (!this.node || !this.anchor) {
      this.syncSlot(this.graph.options.ui?.nodeExecutionPreview, this.emptySlotContext())
      return
    }
    const status = this.previewStatus(this.node.id)
    if (status === null) {
      if (!this.nodeHovered) this.close()
      else {
        this.cardHovered = false
        if (!this.syncSlot(this.graph.options.ui?.nodeExecutionPreview, this.emptySlotContext())) {
          this.commit(nothing)
        }
      }
      return
    }
    const stored = this.graph.getNodeExecutionData(this.node.id)
    const showData = this.node.type !== 'start' && (status === 'completed' || status === 'paused' || !!stored?.attempt)
    const data = showData ? stored : undefined

    const slotContext: NodeExecutionPreviewSlotContext = {
      graph: this.graph,
      language: this.currentLanguage(),
      t: this.t,
      open: true,
      node: this.node,
      status,
      data,
      anchor: this.anchor,
      close: this.close,
    }
    if (this.syncSlot(this.graph.options.ui?.nodeExecutionPreview, slotContext)) {
      return
    }

    const language = this.graph.options.language
    const nodeName = this.node.title || this.node.nodeType
    const bounds = this.overlay.rect()
    const anchor = this.anchor.getBoundingClientRect()
    this.commit(html`
      <pf-surface
        variant="panel"
        elevated
        class=${showData ? 'bpgraph-node-preview' : 'bpgraph-node-preview is-status-only'}
        role="tooltip"
        aria-label=${this.t(showData ? '{node} execution data' : '{node} execution status', { node: nodeName })}
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
          <strong>${nodeName}</strong>
          ${executionStatus(status, language)}
        </header>
        ${data ? html`
          ${data.attempt ? executionAttempt(data.attempt, status, language) : nothing}
          ${executionPorts('Inputs', data.inputs, language)}
          ${status === 'paused' ? nothing : executionPorts('Outputs', data.outputs, language)}
        ` : showData ? html`<p class="bpgraph-node-preview-empty">${this.t('No execution data')}</p>` : nothing}
      </pf-surface>
    `)
    const card = this.host.querySelector<HTMLElement>('.bpgraph-node-preview')!
    const width = card.offsetWidth
    const height = card.offsetHeight
    const right = anchor.right - bounds.left + 12
    const left = right + width <= bounds.width - 12 ? right : anchor.left - bounds.left - width - 12
    card.style.left = `${Math.max(12, Math.min(left, bounds.width - width - 12))}px`
    card.style.top = `${Math.max(12, Math.min(anchor.top - bounds.top, bounds.height - height - 12))}px`
    if (bounds.width > 0 && bounds.height > 0) {
      void applyFloatingPosition(this.anchor, card, {
        placement: 'right-start',
        offset: 12,
        padding: 12,
        boundary: this.overlay.root,
      })
    }
  }
}
