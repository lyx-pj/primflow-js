import { html, nothing, type TemplateResult } from 'lit-html'
import { styleMap } from 'lit-html/directives/style-map.js'
import { live } from 'lit-html/directives/live.js'
import { keyed } from 'lit-html/directives/keyed.js'
import { ifDefined } from 'lit-html/directives/if-defined.js'
import { isBuiltinDataType, isDataPort, type InputPort, type NodeClassType } from '@lyx-pj/primflow-model'
import type { NodeInstanceType } from '../../Graph'
import type { CanvasGraph, NodePanelOptions, PanelSection, PanelSectionContext, PanelSectionId } from '../types'
import { OverlayComponent } from '../OverlayComponent'
import type { OverlayLayer } from '../OverlayLayer'
import { switchCasePorts } from '../../utils/switchCases'
import { stopWheel } from '../helpers'
import { JsonCodeEditor } from './JsonCodeEditor'
import { executionAttempt, executionPorts, executionStatus } from './executionDetails'
import { UI_GAP } from '../layout'

/** Built-in sections in their default order. */
const DEFAULT_PANEL_SECTIONS: PanelSection[] = [
  'meta',
  'extra',
  'loopLimits',
  'inputs',
  'outputs',
  'retry',
  'description',
  'execution',
  'progress',
]

type NodePanelTab = 'node' | 'global'

let nextNodePanelId = 0

/**
 * Right-hand panel with Node and Global settings tabs.
 *
 * Visibility is controlled by the toolbar or the Graph API, not by selection.
 * The Node tab shows a single selected node, or a graph overview without one.
 */
export class NodePanel extends OverlayComponent {
  private node: NodeInstanceType | null = null
  private expanded: boolean
  private activeTab: NodePanelTab = 'node'
  private extraNodeId: string | null = null
  private extraContent: HTMLElement | string | null = null
  private offset = 0
  private compact = false
  /** JSON editors keyed by input name; kept across re-renders of the same node. */
  private readonly jsonEditors = new Map<string, JsonCodeEditor>()
  private readonly idPrefix = `bpgraph-node-panel-${++nextNodePanelId}`

  private readonly graph: CanvasGraph
  private readonly options: () => NodePanelOptions | null
  private readonly onVisibilityChange: () => void
  private readonly locateNode: (node: NodeInstanceType) => void

  refreshLanguage() {
    this.render()
  }

  constructor(
    graph: CanvasGraph,
    overlay: OverlayLayer,
    options: () => NodePanelOptions | null,
    onVisibilityChange: () => void = () => {},
    locateNode: (node: NodeInstanceType) => void = () => {}
  ) {
    super(overlay, 'bpgraph-panel-layer', () => graph.options.language)
    this.graph = graph
    this.options = options
    this.onVisibilityChange = onVisibilityChange
    this.locateNode = locateNode
    const panelOptions = options()
    this.expanded = panelOptions ? panelOptions.open ?? true : false
    this.graph.on('node:changed', this.onNodeChanged)
    this.render()
  }

  setNode(node: NodeInstanceType | null) {
    if (node?.id !== this.node?.id) {
      this.extraNodeId = null
      this.extraContent = null
      this.destroyJsonEditors()
      // Selecting a node always brings its settings forward, even while closed.
      if (node) this.activeTab = 'node'
    }
    this.node = node
    if (this.expanded && this.activeTab === 'node') this.render()
  }

  isOpen() {
    return this.expanded
  }

  /** Configured shell width; the debug panel uses it to shift this panel left. */
  get width() {
    return this.options()?.width ?? 320
  }

  /** Docked sheet below the toolbar in the compact layout. */
  setCompact(compact: boolean) {
    if (this.compact === compact) return
    this.compact = compact
    if (this.expanded) this.render()
  }

  open() {
    this.setOpen(true)
  }

  close() {
    this.setOpen(false)
  }

  toggle() {
    this.setOpen(!this.expanded)
  }

  /** Reevaluate application content; close the panel if its configuration is removed. */
  refresh() {
    if (!this.options()) {
      this.setOpen(false)
      return
    }
    if (this.expanded) this.render()
  }

  refreshExecution(nodeId: string) {
    if (this.node?.id === nodeId && this.expanded && this.activeTab === 'node') this.render()
  }

  /** Shift left by this pixel amount to make room for other panels. */
  setOffset(offset: number) {
    if (this.offset === offset) return
    this.offset = offset
    if (this.expanded) this.render()
  }

  destroy() {
    this.graph.off('node:changed', this.onNodeChanged)
    this.destroyJsonEditors()
    super.destroy()
  }

  /** Release every JSON editor instance and remove its DOM. */
  private destroyJsonEditors() {
    for (const editor of this.jsonEditors.values()) {
      editor.destroy()
    }
    this.jsonEditors.clear()
  }

  private setOpen(next: boolean) {
    // Stay closed without nodePanel configuration so isOpen matches the DOM.
    if (next && !this.options()) return
    if (this.expanded === next) return
    this.expanded = next
    this.render()
    this.onVisibilityChange()
  }

  /**
   * Get or create the JSON editor for one input.
   *
   * The editor owns imperative DOM, so it is created once per input and
   * reused across panel re-renders. Switching nodes destroys every editor.
   */
  private jsonEditor(node: NodeInstanceType, input: InputPort, value: unknown): JsonCodeEditor {
    const existing = this.jsonEditors.get(input.name)
    if (existing) {
      existing.sync(value)
      return existing
    }
    const editor = new JsonCodeEditor(input, value, (next) => {
      node.inputValues = { [input.name]: next } as unknown as typeof node.inputValues
    }, this.graph.nodeRegistry.dataTypes)
    this.jsonEditors.set(input.name, editor)
    editor.mount()
    return editor
  }

  private onNodeChanged = (node: NodeInstanceType, change: string) => {
    if (!this.node || this.node.id !== node.id) return
    if (!['inputValues', 'inputs', 'outputs', 'title', 'loop'].includes(change)) return
    // Values changed outside the editor (undo, graph load); push them back in.
    if (change === 'inputValues') {
      const values = node.inputValues || {}
      for (const [name, editor] of this.jsonEditors) {
        editor.sync(values[name])
      }
    }
    if (this.expanded && this.activeTab === 'node') this.render()
  }

  private selectTab(tab: NodePanelTab) {
    if (this.activeTab === tab) return
    this.activeTab = tab
    this.render()
    // Rendering replaces the tab buttons, so restore focus to the active tab.
    this.host.querySelector<HTMLButtonElement>(`[data-tab="${tab}"]`)?.focus()
  }

  private onTabKeyDown = (event: KeyboardEvent) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const target: NodePanelTab = event.key === 'ArrowLeft' || event.key === 'Home' ? 'node' : 'global'
    this.selectTab(target)
  }

  private render() {
    if (!this.expanded || !this.options()) {
      this.commit(nothing)
      return
    }
    const content = this.activeTab === 'node' ? this.nodeTabContent() : this.globalTabContent()
    this.commit(this.template(content))
  }

  private template(content: TemplateResult | typeof nothing): TemplateResult {
    const options = this.options() ?? {}
    return html`
      <aside
        class=${`bpgraph-node-panel${this.compact ? ' is-compact' : ''}`}
        role="region"
        aria-label=${this.t('Node panel')}
        style=${styleMap(this.compact
          ? {
              width: 'auto',
              left: `${UI_GAP}px`,
              right: `${UI_GAP}px`,
              maxWidth: 'none',
            }
          : {
              width: `${options.width ?? 320}px`,
              right: `${UI_GAP + this.offset}px`,
              maxWidth: `calc(100% - ${UI_GAP * 2 + this.offset}px)`,
            })}
        @wheel=${stopWheel}
      >
        <header class="bpgraph-node-panel-header">
          <div class="bpgraph-node-panel-heading">
            <h2 class="bpgraph-node-panel-title">${this.panelTitle()}</h2>
            <button type="button" class="bpgraph-node-panel-close" aria-label=${this.t('Close')} @click=${this.closePanel}>
              ×
            </button>
          </div>
          <div
            class="bpgraph-node-panel-tabs"
            role="tablist"
            aria-label=${this.t('Panel tabs')}
            @keydown=${this.onTabKeyDown}
          >
            ${this.tabTemplate('node', this.t('Node'))}
            ${this.tabTemplate('global', this.t('Global settings'))}
          </div>
        </header>
        <div
          class="bpgraph-node-panel-scroll"
          id=${`${this.idPrefix}-panel`}
          role="tabpanel"
          aria-labelledby=${`${this.idPrefix}-tab-${this.activeTab}`}
        >
          ${content}
        </div>
      </aside>
    `
  }

  private tabTemplate(tab: NodePanelTab, label: string): TemplateResult {
    const active = this.activeTab === tab
    return html`
      <button
        type="button"
        id=${`${this.idPrefix}-tab-${tab}`}
        class=${`bpgraph-node-panel-tab${active ? ' is-active' : ''}`}
        role="tab"
        aria-selected=${String(active)}
        aria-controls=${`${this.idPrefix}-panel`}
        tabindex=${active ? 0 : -1}
        data-tab=${tab}
        @click=${() => this.selectTab(tab)}
      >
        ${label}
      </button>
    `
  }

  private panelTitle() {
    if (this.activeTab === 'global') return this.t('Global settings')
    if (!this.node) return this.t('Graph overview')
    return this.nodeLabel(this.node)
  }

  private nodeLabel(node: NodeInstanceType) {
    const definitionName = node.definition?.name ?? node.definition?.title
    return node.title || definitionName || node.definitionId || node.nodeType
  }

  private nodeTabContent(): TemplateResult | typeof nothing {
    return this.node ? this.nodeContent(this.node) : this.overviewContent()
  }

  private overviewContent(): TemplateResult | typeof nothing {
    const render = this.options()?.overview
    if (render) {
      return render({
        graph: this.graph,
        close: this.closePanel,
        locateNode: this.locateNode,
        language: this.graph.options.language,
      })
    }
    const nodes = this.graph.getNodes()
    return html`
      <div class="bpgraph-node-panel-overview">
        ${nodes.length > 0
          ? html`<ul class="bpgraph-node-panel-overview-list" aria-label=${this.t('Nodes in this view')}>
              ${nodes.map((node) => html`
                <li>
                  <button
                    type="button"
                    class="bpgraph-node-panel-overview-item"
                    data-node-id=${node.id}
                    @click=${() => this.locateNode(node)}
                  >
                    ${this.nodeLabel(node)}
                  </button>
                </li>
              `)}
            </ul>`
          : html`<p class="bpgraph-node-panel-empty">${this.t('No nodes in this view')}</p>`}
      </div>
    `
  }

  private globalTabContent(): TemplateResult | typeof nothing {
    const render = this.options()?.globalSettings
    if (render) {
      return render({
        graph: this.graph,
        close: this.closePanel,
        language: this.graph.options.language,
      })
    }
    return html`<p class="bpgraph-node-panel-empty bpgraph-node-panel-empty-block">${this.t('No global settings')}</p>`
  }

  private nodeContent(node: NodeInstanceType): TemplateResult {
    const options = this.options() ?? {}
    const inputs = (node.inputs || []).filter((input) => isDataPort(input.type))
    const outputs = (node.outputs || []).filter((output) => isDataPort(output.type))
    const values = node.inputValues || {}
    const caseCount = switchCasePorts(node.inputs || []).length
    const extra = this.getExtra(node)
    const definitionId = node.definitionId ?? node.nodeType
    const definitionName = node.definition?.name ?? node.definition?.title
    const title = this.nodeLabel(node)
    const nodeClass = this.graph.nodeRegistry.getNodeClasses().find((candidate) => candidate.definitionId === definitionId)
    const description = this.getDescription(nodeClass)
    const retry = nodeClass?.retryPolicy
    const kind = node.kind ?? node.type
    const behavior = kind === 'loop' ? 'Loop' : kind === 'subgraph' ? 'Subgraph' : undefined

    /** Built-in sections; each returns nothing when it does not apply. */
    const builtin: Record<PanelSectionId, () => TemplateResult | typeof nothing> = {
      meta: () => html`
        <div class="bpgraph-node-panel-meta">
          ${definitionName && definitionName !== title
            ? html`<span>${this.t('Definition name')}: ${definitionName}</span>`
            : nothing}
          <span>${this.t('Definition ID')}: ${definitionId}</span>
          <span>${this.t('Instance ID')}: ${node.id}</span>
          ${behavior ? html`<span>${this.t('Behavior')}: ${this.t(behavior)}</span>` : nothing}
        </div>
      `,
      extra: () => extra ? html`<div class="bpgraph-node-panel-extra">${extra}</div>` : nothing,
      loopLimits: () => kind === 'loop' && node.loop ? html`
        <section class="bpgraph-node-panel-section">
          <h4 class="bpgraph-node-panel-section-title">${this.t('Loop limits')}</h4>
          ${this.loopLimitField(node, 'maxIterations', 'Maximum iterations', 'Engine default')}
          ${this.loopLimitField(node, 'timeoutMs', 'Timeout (ms)', 'No timeout')}
        </section>
      ` : nothing,
      inputs: () => kind === 'start' ? nothing : html`
        <section class="bpgraph-node-panel-section">
          <h4 class="bpgraph-node-panel-section-title">${this.t('Inputs')}</h4>
          ${inputs.length > 0
            ? inputs.map((input) => this.fieldTemplate(node, input, values, caseCount))
            : html`<p class="bpgraph-node-panel-empty">${this.t('No inputs')}</p>`}
        </section>
      `,
      outputs: () => kind === 'start' ? nothing : html`
        <section class="bpgraph-node-panel-section">
          <h4 class="bpgraph-node-panel-section-title">${this.t('Outputs')}</h4>
          ${outputs.length > 0
            ? html`<ul class="bpgraph-node-panel-outputs">
                ${outputs.map((output) => html`<li>${output.name} (${output.type})</li>`)}
              </ul>`
            : html`<p class="bpgraph-node-panel-empty">${this.t('No outputs')}</p>`}
        </section>
      `,
      retry: () => retry ? html`
        <section class="bpgraph-node-panel-section">
          <h4 class="bpgraph-node-panel-section-title">${this.t('Retry policy')}</h4>
          <ul class="bpgraph-node-panel-outputs">
            <li>${this.t(retry.idempotent ? 'Safe to rerun' : 'Reruns disabled')}</li>
            <li>${this.t('Maximum retries: {count}', { count: retry.idempotent ? retry.maxRetries ?? 0 : 0 })}</li>
            ${retry.fallback ? html`<li>${this.t('Fallback: {port}', { port: retry.fallback.port })}</li>` : nothing}
          </ul>
        </section>
      ` : nothing,
      description: () => description
        ? html`<div class="bpgraph-node-panel-section">
            <p class="bpgraph-node-panel-description">${description}</p>
          </div>`
        : nothing,
      execution: () => this.executionTemplate(node),
      progress: () => this.progressTemplate(node),
    }

    const sectionContext: PanelSectionContext = { graph: this.graph, node }

    // An application renderer owns the whole content area; sections are not
    // consulted then, because its callback may have side effects.
    const content = options.render
      ? options.render({
          graph: this.graph,
          node,
          close: this.closePanel,
          language: this.graph.options.language,
        })
      : (options.sections?.(node, this.graph) ?? DEFAULT_PANEL_SECTIONS).map((section) =>
          typeof section === 'string'
            ? builtin[section]?.() ?? nothing
            : section.render(sectionContext))

    return html`${content}`
  }

  private loopLimitField(
    node: NodeInstanceType,
    key: 'maxIterations' | 'timeoutMs',
    label: string,
    placeholder: string,
  ) {
    const isIterationLimit = key === 'maxIterations'
    const fieldLabel = this.t(label)
    return html`
      <label class="bpgraph-node-panel-field bpgraph-node-panel-limit-field">
        <span class="bpgraph-node-panel-label">${fieldLabel}</span>
        <input
          class="bpgraph-node-panel-input"
          aria-label=${fieldLabel}
          type="number"
          min=${isIterationLimit ? 1 : Number.MIN_VALUE}
          max=${ifDefined(isIterationLimit ? Number.MAX_SAFE_INTEGER : undefined)}
          step=${isIterationLimit ? '1' : 'any'}
          placeholder=${this.t(placeholder)}
          .value=${live(String(node.loop?.[key] ?? ''))}
          @change=${(event: Event) => {
            const input = event.currentTarget as HTMLInputElement
            const config = node.loop
            if (!config || !input.validity.valid) return
            const value = input.value === '' ? undefined : input.valueAsNumber
            if (config[key] === value) return
            const next = { ...config }
            if (value === undefined) delete next[key]
            else next[key] = value
            node.loop = next
          }}
        />
        <span class="bpgraph-node-panel-limit-error">
          ${this.t(isIterationLimit ? 'Enter a positive whole number.' : 'Enter a time greater than zero.')}
        </span>
      </label>
    `
  }

  private progressTemplate(node: NodeInstanceType) {
    const text = this.graph.getNodeProgress(node.id)
    return text === undefined ? nothing : html`
      <div class="bpgraph-node-panel-section" aria-label=${this.t('Live output')}>
        <pre style="white-space:pre-wrap;overflow-wrap:anywhere">${text}</pre>
      </div>
    `
  }

  private executionTemplate(node: NodeInstanceType) {
    const data = this.graph.getNodeExecutionData(node.id)
    if (node.type === 'start' || !data) return nothing
    const paused = this.graph.pausedNodeId === node.id
    const status = paused ? 'paused' : this.graph.getNodeExecutionStatus(node.id)
    const language = this.graph.options.language
    return html`
      <section class="bpgraph-node-panel-section" aria-label=${this.t('Execution')}>
        <header class="bpgraph-node-panel-execution-header">
          <h4 class="bpgraph-node-panel-section-title">${this.t('Execution')}</h4>
          ${executionStatus(status, language)}
        </header>
        ${data.attempt ? executionAttempt(data.attempt, status, language) : nothing}
        ${executionPorts('Inputs', data.inputs, language)}
        ${paused ? nothing : executionPorts('Outputs', data.outputs, language)}
      </section>
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
    if (this.graph.nodeRegistry.dataTypes.getStream(input.type)) return html``
    const custom = this.customControl(node, input, value)
    if (custom) return custom
    if (!isBuiltinDataType(input.type) && this.graph.nodeRegistry.dataTypes.has(input.type)) {
      return html`${keyed(`${node.id}:${input.name}`, this.jsonEditor(node, input, value).element)}`
    }
    switch (input.editor ?? input.type) {
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
      case 'array':
      case 'object':
        return html`${keyed(
          `${node.id}:${input.name}`,
          this.jsonEditor(node, input, value).element
        )}`
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
    node.inputValues = { [input.name]: value } as unknown as typeof node.inputValues
  }

  /**
   * Application-provided panel editor for a port, or undefined when the port
   * uses a built-in control.
   *
   * A registered panel editor takes precedence over the built-in controls, so
   * an application can replace the control of a builtin type and can provide a
   * control for a custom type.
   */
  private customControl(node: NodeInstanceType, input: InputPort, value: unknown): TemplateResult | undefined {
    const registration = this.graph.editors?.get(input.type, 'panel')
    if (!registration) return undefined
    const template = registration.render({
      graph: this.graph,
      node,
      port: input,
      value,
      setValue: (next) => {
        node.inputValues = { [input.name]: next } as unknown as typeof node.inputValues
      },
    })
    if (template === nothing) return undefined
    return template
  }

  private closePanel = () => {
    this.setOpen(false)
  }

  private getDescription(nodeClass: NodeClassType | undefined): string {
    const palette = this.graph.options.palette
    if (!palette || typeof palette !== 'object' || !palette.describe) return ''
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
