import { html, nothing, type TemplateResult } from 'lit-html'
import { styleMap } from 'lit-html/directives/style-map.js'
import { live } from 'lit-html/directives/live.js'
import type { InputPort } from '@lyx-pj/workflow-model'
import type { NodeInstanceType } from '../../Graph'
import type { CanvasGraph, NodePanelOptions } from '../types'
import { OverlayComponent } from '../OverlayComponent'
import type { OverlayLayer } from '../OverlayLayer'
import { switchCasePorts } from '../../utils/switchCases'
import { stopWheel } from '../helpers'

/** Right-hand node panel shown for a single selection. */
export class NodePanel extends OverlayComponent {
  private node: NodeInstanceType | null = null
  private extraNodeId: string | null = null
  private extraContent: HTMLElement | string | null = null
  private offset = 0

  private readonly graph: CanvasGraph
  private readonly options: () => NodePanelOptions | null

  refreshLanguage() {
    this.render()
  }

  constructor(graph: CanvasGraph, overlay: OverlayLayer, options: () => NodePanelOptions | null) {
    super(overlay, 'bpgraph-panel-layer', () => graph.options.language)
    this.graph = graph
    this.options = options
    this.graph.on('node:changed', this.onNodeChanged)
  }

  setNode(node: NodeInstanceType | null) {
    if (node?.id !== this.node?.id) {
      this.extraNodeId = null
      this.extraContent = null
    }
    this.node = node
    this.render()
  }

  isOpen() {
    return this.node !== null
  }

  /** Shift left by this pixel amount to make room for other panels. */
  setOffset(offset: number) {
    if (this.offset === offset) return
    this.offset = offset
    this.render()
  }

  destroy() {
    this.graph.off('node:changed', this.onNodeChanged)
    super.destroy()
  }

  private onNodeChanged = (node: NodeInstanceType, change: string) => {
    if (!this.node || this.node.id !== node.id) return
    if (!['values', 'inputs', 'outputs', 'title'].includes(change)) return
    this.render()
  }

  private render() {
    this.commit(this.node ? this.template(this.node) : nothing)
  }

  private template(node: NodeInstanceType): TemplateResult {
    const options = this.options() ?? {}
    const inputs = (node.inputs || []).filter((input) => input.type !== 'exec' && input.type !== 'spacer')
    const outputs = (node.outputs || []).filter((output) => output.type !== 'exec' && output.type !== 'spacer')
    const values = node.values || {}
    const caseCount = switchCasePorts(node.inputs || []).length
    const extra = this.getExtra(node)
    const description = this.getDescription(node)

    return html`
      <aside
        class="bpgraph-node-panel"
        style=${styleMap({
          width: `${options.width ?? 320}px`,
          right: `${8 + this.offset}px`,
          maxWidth: `calc(100% - ${16 + this.offset}px)`,
        })}
        @wheel=${stopWheel}
      >
        <header class="bpgraph-node-panel-header">
          <h2 class="bpgraph-node-panel-title">${node.title || node.nodeType}</h2>
          <button type="button" class="bpgraph-node-panel-close" aria-label=${this.t('Close')} @click=${this.close}>
            ×
          </button>
        </header>
        <div class="bpgraph-node-panel-scroll">
          <div class="bpgraph-node-panel-meta">
            <span>${this.t('Type')}: ${node.nodeType}</span>
            <span>ID: ${node.id}</span>
          </div>
          ${extra ? html`<div class="bpgraph-node-panel-extra">${extra}</div>` : nothing}
          ${node.type === 'start'
            ? nothing
            : html`
                <section class="bpgraph-node-panel-section">
                  <h4 class="bpgraph-node-panel-section-title">${this.t('Inputs')}</h4>
                  ${inputs.length > 0
                    ? inputs.map((input) => this.fieldTemplate(node, input, values, caseCount))
                    : html`<p class="bpgraph-node-panel-empty">${this.t('No inputs')}</p>`}
                </section>
                <section class="bpgraph-node-panel-section">
                  <h4 class="bpgraph-node-panel-section-title">${this.t('Outputs')}</h4>
                  ${outputs.length > 0
                    ? html`<ul class="bpgraph-node-panel-outputs">
                        ${outputs.map((output) => html`<li>${output.name} (${output.type})</li>`)}
                      </ul>`
                    : html`<p class="bpgraph-node-panel-empty">${this.t('No outputs')}</p>`}
                </section>
              `}
          ${description
            ? html`<div class="bpgraph-node-panel-section">
                <p class="bpgraph-node-panel-description">${description}</p>
              </div>`
            : nothing}
        </div>
      </aside>
    `
  }

  private fieldTemplate(
    node: NodeInstanceType,
    input: InputPort,
    values: Record<string, unknown>,
    caseCount: number
  ): TemplateResult {
    const canRemove = switchCasePorts([input]).length > 0 && caseCount > 1
    return html`
      <div class="bpgraph-node-panel-field">
        <label class="bpgraph-node-panel-label">
          <span>${input.label ?? input.name}</span>
          <span class="bpgraph-node-panel-label-meta">${input.name} · ${input.type}</span>
          ${canRemove
            ? html`<button
                type="button"
                class="bpgraph-node-panel-danger"
                title=${this.t('Delete this case')}
                @click=${() => this.graph.removeSwitchCase(node, input.name)}
              >
                ×
              </button>`
            : nothing}
        </label>
        ${this.controlTemplate(node, input, values[input.name])}
      </div>
    `
  }

  private controlTemplate(node: NodeInstanceType, input: InputPort, value: unknown): TemplateResult {
    switch (input.type) {
      case 'number':
        return html`<input
          class="bpgraph-node-panel-input"
          data-field=${input.name}
          type="number"
          .value=${live(String(value ?? ''))}
          @change=${(evt: Event) => this.setValue(node, input, evt)}
        />`
      case 'textarea':
        return html`<textarea
          class="bpgraph-node-panel-input"
          data-field=${input.name}
          rows="3"
          .value=${live(String(value ?? ''))}
          @input=${(evt: Event) => this.setValue(node, input, evt)}
        ></textarea>`
      case 'boolean':
        return html`<input
          class="bpgraph-node-panel-checkbox"
          data-field=${input.name}
          type="checkbox"
          .checked=${live(Boolean(value))}
          @change=${(evt: Event) => this.setValue(node, input, evt)}
        />`
      case 'select':
        return html`<div class="bpgraph-node-panel-select">
          <select
            class="bpgraph-node-panel-input"
            data-field=${input.name}
            @change=${(evt: Event) => this.setValue(node, input, evt)}
          >
            ${(input._options ?? []).map(
              (option) => html`<option value=${option.value} ?selected=${String(value ?? '') === option.value}>
                ${option.label}
              </option>`
            )}
          </select>
          <svg class="bpgraph-node-panel-select-arrow" viewBox="0 0 12 12" aria-hidden="true">
            <path d="M2 4 L6 8 L10 4" stroke="currentColor" stroke-width="1.5" fill="none" />
          </svg>
        </div>`
      default:
        return html`<input
          class="bpgraph-node-panel-input"
          data-field=${input.name}
          type="text"
          .value=${live(String(value ?? ''))}
          @input=${(evt: Event) => this.setValue(node, input, evt)}
        />`
    }
  }

  private setValue(node: NodeInstanceType, input: InputPort, evt: Event) {
    const target = evt.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    let value: unknown = target.value
    if (input.type === 'number') value = Number(target.value)
    else if (input.type === 'boolean') value = (target as HTMLInputElement).checked
    node.values = { [input.name]: value } as unknown as typeof node.values
  }

  private close = () => {
    this.setNode(null)
  }

  private getDescription(node: NodeInstanceType): string {
    const palette = this.graph.options.palette
    if (!palette || typeof palette !== 'object' || !palette.describe) return ''
    // Reuse palette descriptions rather than maintaining separate node text.
    const nodeClass = this.graph.nodeRegistry.getNodeClasses().find(nodeClass => nodeClass.type === node.nodeType)
    return nodeClass ? palette.describe(nodeClass, this.graph)?.description?.trim() ?? '' : ''
  }

  private getExtra(node: NodeInstanceType) {
    const options = this.options()
    if (!options?.extra) return null
    if (this.extraNodeId !== node.id) {
      this.extraNodeId = node.id
      this.extraContent = options.extra(node, this.graph) ?? null
    }
    return this.extraContent
  }
}
