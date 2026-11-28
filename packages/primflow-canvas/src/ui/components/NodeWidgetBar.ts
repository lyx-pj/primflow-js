import type { dia } from '@joint/core'
import { isDataPort, type InputPort } from '@lyx-pj/primflow-model'
import { html, nothing, type TemplateResult } from 'lit-html'
import { keyed } from 'lit-html/directives/keyed.js'
import { live } from 'lit-html/directives/live.js'
import { styleMap } from 'lit-html/directives/style-map.js'
import type { NodeInstanceType } from '../../Graph'
import { OverlayComponent } from '../OverlayComponent'
import type { OverlayLayer } from '../OverlayLayer'
import { stopEvent, stopWheel } from '../helpers'
import { applyFloatingPosition } from '../primitives'
import { MountRegistry, type CanvasUIMountHandle } from '../slots'
import type {
  CanvasGraph,
  NodeWidgetBarSlotContext,
  NodeWidgetContext,
  NodeWidgetPlacement,
  NodeWidgetsOptions,
} from '../types'

/**
 * ComfyUI-style surrounding input widget tray anchored to a selected node.
 *
 * When a single node is selected, this floating tray renders rich, spacious
 * input controls adjacent to the node — either custom widgets supplied by the
 * application (`GraphOptions.nodeWidgets.render` / `.mount`) or modern built-in
 * editors for unconnected editable input ports. Consumers can also replace the
 * entire tray shell via `GraphOptions.ui.nodeWidgetBar`.
 */
export class NodeWidgetBar extends OverlayComponent {
  private readonly graph: CanvasGraph
  private readonly paper: dia.Paper
  private readonly options: () => NodeWidgetsOptions | null
  private readonly openQuickAddCallback: (node: NodeInstanceType, direction: 'in' | 'out') => void

  private node: NodeInstanceType | null = null
  /** Remembered open preference across node switches; null falls back to `defaultCollapsed === false`. */
  private open: boolean | null = null
  /** Remembered collapsed preference across node switches; null falls back to `defaultCollapsed`. */
  private collapsed: boolean | null = null
  private suppressed = false
  private rafId: number | null = null
  private resizeObserver: ResizeObserver | null = null
  private observedTray: Element | null = null

  private customMountNodeId: string | null = null
  private customMountFn: NodeWidgetsOptions['mount'] | undefined = undefined
  private customMountHost: HTMLDivElement | null = null
  private customMountRoot: HTMLDivElement | null = null
  private customMountHandle: CanvasUIMountHandle<NodeWidgetContext> | null = null
  private readonly editorMounts = new MountRegistry()
  private activeEditorMountKeys = new Set<string>()

  constructor(
    graph: CanvasGraph,
    paper: dia.Paper,
    overlay: OverlayLayer,
    options: () => NodeWidgetsOptions | null,
    openQuickAdd: (node: NodeInstanceType, direction: 'in' | 'out') => void
  ) {
    super(overlay, 'bpgraph-node-widget-layer', () => graph.options.language)
    this.graph = graph
    this.paper = paper
    this.options = options
    this.openQuickAddCallback = openQuickAdd
    this.graph.on('node:dragmove', this.schedulePosition)
    this.graph.on('node:changed', this.onNodeChanged)
    this.graph.on('viewport:change', this.schedulePosition)
    this.graph.on('link:created', this.onLinkChanged)
    this.graph.on('link:removed', this.onLinkChanged)
    this.paper.on('scale', this.schedulePosition)
    this.paper.on('translate', this.schedulePosition)
    this.paper.model.on('reset', this.onModelReset)
    this.paper.model.on('remove', this.onModelRemove)
  }

  refreshLanguage() {
    this.render()
  }

  refresh() {
    this.render()
  }

  setSuppressed(suppressed: boolean) {
    if (this.suppressed === suppressed) return
    this.suppressed = suppressed
    this.render()
  }

  private isOpenPreference(): boolean {
    if (this.open !== null) return this.open
    return Boolean(this.options()?.defaultCollapsed === false)
  }

  private isCollapsedPreference(): boolean {
    if (this.collapsed !== null) return this.collapsed
    return Boolean(this.options()?.defaultCollapsed)
  }

  setNode(node: NodeInstanceType | null) {
    if (node?.id !== this.node?.id) {
      this.cancelFrame()
      this.destroyCustomMount()
    }
    this.node = node
    this.render()
  }

  /** Whether this node has surrounding controls that can be toggled open. */
  hasWidgetsFor(node: NodeInstanceType): boolean {
    const opts = this.options()
    if (!opts || this.graph.isReplayMode()) return false
    if (opts.shouldShow && !opts.shouldShow(node, this.graph)) return false
    if (opts.mount) return true
    if (opts.showPortEditors !== false && this.editableInputsFor(node).length > 0) return true
    if (opts.render) {
      const rendered = opts.render({
        graph: this.graph,
        node,
        editableInputs: this.editableInputsFor(node),
        values: { ...(node.inputValues ?? {}) },
        setInputValue: (name, value) => this.setInputValue(node, name, value),
        language: this.currentLanguage(),
        collapsed: this.isCollapsedPreference(),
        setCollapsed: () => {},
        openQuickAdd: (direction) => this.openQuickAddCallback(node, direction),
      })
      return rendered !== null && rendered !== nothing
    }
    return false
  }

  isOpenFor(node: NodeInstanceType): boolean {
    return this.isOpenPreference() && this.node?.id === node.id
  }

  openFor(node: NodeInstanceType) {
    if (this.node?.id !== node.id) {
      this.cancelFrame()
      this.destroyCustomMount()
      this.node = node
    }
    this.open = true
    this.collapsed = false
    this.render()
  }

  toggleFor(node: NodeInstanceType) {
    if (this.node?.id !== node.id) {
      this.openFor(node)
      return
    }
    const next = !this.isOpenPreference()
    this.open = next
    if (next) this.collapsed = false
    this.render()
  }

  close() {
    if (!this.isOpenPreference()) return
    this.open = false
    this.destroyCustomMount()
    this.render()
  }

  override destroy() {
    this.cancelFrame()
    this.disconnectResizeObserver()
    this.destroyCustomMount()
    this.editorMounts.clear()
    this.graph.off('node:dragmove', this.schedulePosition)
    this.graph.off('node:changed', this.onNodeChanged)
    this.graph.off('viewport:change', this.schedulePosition)
    this.graph.off('link:created', this.onLinkChanged)
    this.graph.off('link:removed', this.onLinkChanged)
    this.paper.off('scale', this.schedulePosition)
    this.paper.off('translate', this.schedulePosition)
    this.paper.model.off('reset', this.onModelReset)
    this.paper.model.off('remove', this.onModelRemove)
    super.destroy()
  }

  private onModelReset = () => {
    this.setNode(null)
  }

  private onModelRemove = (cell: dia.Cell) => {
    if (cell.isElement() && this.node && String(cell.id) === this.node.id) {
      this.setNode(null)
    }
  }

  private cancelFrame() {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
  }

  private onNodeChanged = (changedNode: NodeInstanceType, change: string) => {
    if (!this.node || this.node.id !== changedNode.id) return
    if (['inputValues', 'inputs', 'outputs', 'title'].includes(change)) {
      this.render()
    }
  }

  private onLinkChanged = () => {
    if (this.node) this.render()
  }

  private schedulePosition = () => {
    if (this.rafId !== null || !this.node || this.suppressed || this.graph.isReplayMode()) return
    this.rafId = requestAnimationFrame(() => {
      this.rafId = null
      this.positionTray()
    })
  }

  private anchorElement(node: NodeInstanceType): Element | null {
    return this.paper.findViewByModel(node.id)?.el ?? null
  }

  private editableInputsFor(node: NodeInstanceType): InputPort[] {
    const connected = new Set(
      this.graph
        .getLinks()
        .filter((link) => link.target.id === node.id)
        .map((link) => link.target.port)
    )
    return (node.inputs ?? []).filter((input) => {
      if (!isDataPort(input.type)) return false
      if (input.showInput === false) return false
      if (input.id && connected.has(input.id)) return false
      if (this.graph.nodeRegistry.dataTypes.getStream(input.type)) return false
      if (this.graph.editors?.has(input.type, 'panel')) return true
      const editor = input.editor ?? input.type
      return ['string', 'number', 'boolean', 'select', 'textarea'].includes(editor)
    })
  }

  private setInputValue(node: NodeInstanceType, name: string, value: unknown) {
    node.inputValues = { [name]: value } as unknown as typeof node.inputValues
  }

  private render() {
    const opts = this.options()
    const rawNode = !this.suppressed && !this.graph.isReplayMode() && opts ? this.node : null
    const node = rawNode && this.graph.findNode(rawNode.id) === rawNode ? rawNode : null
    const anchor = node ? this.anchorElement(node) : null
    const placement: NodeWidgetPlacement = opts?.placement ?? 'bottom'

    const editableInputs = node ? this.editableInputsFor(node) : []
    const values = node ? { ...(node.inputValues ?? {}) } : {}
    const customRender = opts?.render
    const customMount = opts?.mount
    const showPortEditors = opts?.showPortEditors !== false
    const open = this.isOpenPreference()
    const collapsed = this.isCollapsedPreference()

    const widgetContext: NodeWidgetContext | null = node
      ? {
          graph: this.graph,
          node,
          editableInputs,
          values,
          setInputValue: (name, value) => this.setInputValue(node, name, value),
          language: this.currentLanguage(),
          collapsed,
          setCollapsed: (next) => {
            if (this.isCollapsedPreference() === next) return
            this.collapsed = next
            this.render()
          },
          openQuickAdd: (direction) => this.openQuickAddCallback(node, direction),
        }
      : null

    let renderedCustom: TemplateResult | typeof nothing | null = null
    if (widgetContext && customRender) {
      renderedCustom = customRender(widgetContext)
    }

    const hasBuiltinEditors = showPortEditors && editableInputs.length > 0
    const hasCustomContent = Boolean(customMount) || (renderedCustom !== null && renderedCustom !== nothing)
    const allowedByFilter = !node || !opts?.shouldShow || opts.shouldShow(node, this.graph)
    const visible = Boolean(open && opts && node && anchor && allowedByFilter && (hasCustomContent || hasBuiltinEditors))

    const slotContext: NodeWidgetBarSlotContext = {
      graph: this.graph,
      language: this.currentLanguage(),
      t: this.t,
      visible,
      node: visible ? node : null,
      anchor: visible ? anchor : null,
      placement,
      collapsed,
      setCollapsed: (next) => {
        if (this.isCollapsedPreference() === next) return
        this.collapsed = next
        this.render()
      },
      editableInputs,
      values,
      setInputValue: (name, value) => {
        if (node) this.setInputValue(node, name, value)
      },
      openQuickAdd: (direction) => {
        if (node) this.openQuickAddCallback(node, direction)
      },
    }

    if (this.syncSlot(this.graph.options.ui?.nodeWidgetBar, slotContext)) {
      this.disconnectResizeObserver()
      this.destroyCustomMount()
      this.editorMounts.clear()
      return
    }

    if (!visible || !node || !anchor || !widgetContext) {
      this.disconnectResizeObserver()
      this.destroyCustomMount()
      this.editorMounts.clear()
      this.commit(nothing)
      return
    }

    const accent = node.definition?.style?.header?.background ?? 'var(--pf-accent, #38bdf8)'
    const title = node.title || node.definition?.name || node.definition?.title || node.nodeType
    const collapsible = opts?.collapsible !== false
    this.activeEditorMountKeys = new Set()

    this.commit(html`
      <pf-surface
        variant="panel"
        elevated
        class=${`pf-node-widget-bar${collapsed ? ' is-collapsed' : ''}`}
        role="region"
        aria-label=${this.t('Node controls')}
        data-node-id=${node.id}
        @pointerdown=${stopEvent}
        @mousedown=${stopEvent}
        @click=${stopEvent}
        @wheel=${stopWheel}
      >
        <header class="pf-node-widget-header">
          <div class="pf-node-widget-title-wrap">
            <span class="pf-node-widget-dot" style=${styleMap({ background: accent })} aria-hidden="true"></span>
            <span class="pf-node-widget-title">${title}</span>
            ${editableInputs.length > 0
              ? html`<pf-badge tone="neutral" class="pf-node-widget-count">${editableInputs.length}</pf-badge>`
              : nothing}
          </div>
          <div class="pf-node-widget-header-actions">
            ${collapsible
              ? html`
                  <pf-tooltip
                    content=${collapsed ? this.t('Expand quick inputs') : this.t('Collapse quick inputs')}
                    placement="top"
                  >
                    <button
                      type="button"
                      class="pf-node-widget-toggle"
                      aria-expanded=${String(!collapsed)}
                      aria-label=${collapsed ? this.t('Expand quick inputs') : this.t('Collapse quick inputs')}
                      @click=${() => {
                        this.collapsed = !collapsed
                        this.render()
                      }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <path d=${collapsed ? 'M6 9l6 6 6-6' : 'M18 15l-6-6-6 6'} />
                      </svg>
                    </button>
                  </pf-tooltip>
                `
              : nothing}
          </div>
        </header>
        ${collapsed
          ? nothing
          : html`
              <div class="pf-node-widget-body">
                ${customMount ? html`<div class="pf-node-widget-custom-mount"></div>` : nothing}
                ${renderedCustom && renderedCustom !== nothing
                  ? html`<div class="pf-node-widget-custom">${renderedCustom}</div>`
                  : nothing}
                ${hasBuiltinEditors
                  ? html`
                      <div class="pf-node-widget-fields">
                        ${editableInputs.map((input) => this.widgetFieldTemplate(node, input, values[input.name]))}
                      </div>
                    `
                  : nothing}
              </div>
            `}
      </pf-surface>
    `)

    if (!collapsed && customMount) {
      const mountHost = this.host.querySelector<HTMLDivElement>('.pf-node-widget-custom-mount')
      if (mountHost) {
        this.syncCustomMount(mountHost, node.id, customMount, widgetContext)
      }
    } else {
      this.destroyCustomMount()
    }
    this.editorMounts.prune(this.activeEditorMountKeys)

    this.observeTraySize()
    this.positionTray()
  }

  private observeTraySize() {
    if (typeof ResizeObserver === 'undefined') return
    const tray = this.host.querySelector('.pf-node-widget-bar')
    if (tray === this.observedTray) return
    this.disconnectResizeObserver()
    if (!tray) return
    if (!this.resizeObserver) {
      this.resizeObserver = new ResizeObserver(() => {
        this.schedulePosition()
      })
    }
    this.resizeObserver.observe(tray)
    this.observedTray = tray
  }

  private disconnectResizeObserver() {
    this.resizeObserver?.disconnect()
    this.observedTray = null
  }

  private syncCustomMount(
    container: HTMLDivElement,
    nodeId: string,
    mountFn: NonNullable<NodeWidgetsOptions['mount']>,
    context: NodeWidgetContext
  ) {
    if (
      this.customMountNodeId === nodeId &&
      this.customMountFn === mountFn &&
      this.customMountHost === container
    ) {
      this.customMountHandle?.update?.(context)
      return
    }
    this.destroyCustomMount()
    this.customMountNodeId = nodeId
    this.customMountFn = mountFn
    this.customMountHost = container
    const wrapper = document.createElement('div')
    wrapper.className = 'bpgraph-custom-mount'
    wrapper.style.display = 'contents'
    container.appendChild(wrapper)
    this.customMountRoot = wrapper
    this.customMountHandle = mountFn(wrapper, context) ?? null
  }

  private destroyCustomMount() {
    if (this.customMountHandle) {
      try {
        this.customMountHandle.destroy?.()
      } finally {
        this.customMountHandle = null
      }
    }
    if (this.customMountRoot) {
      // Detach the per-mount wrapper without clearing its children so deferred
      // framework unmounts (React portals / roots) can remove their own nodes.
      this.customMountRoot.remove()
      this.customMountRoot = null
    }
    this.customMountHost = null
    this.customMountNodeId = null
    this.customMountFn = undefined
  }

  private widgetFieldTemplate(node: NodeInstanceType, input: InputPort, value: unknown): TemplateResult {
    const label = input.label ?? input.name
    const customPanel = this.graph.editors?.get(input.type, 'panel')
    if (customPanel) {
      const context = {
        graph: this.graph,
        node,
        port: input,
        value,
        setValue: (next: unknown) => this.setInputValue(node, input.name, next),
      }
      if (customPanel.mount) {
        const key = `widget:editor:${node.id}:${input.name}`
        this.activeEditorMountKeys.add(key)
        const el = this.editorMounts.sync(key, customPanel.mount, context)
        return html`
          <div class="pf-node-widget-field" data-widget-field=${input.name}>
            <div class="pf-node-widget-label">
              <span>${label}</span>
              <span class="pf-node-widget-type">${input.type}</span>
            </div>
            ${keyed(key, el)}
          </div>
        `
      }
      const rendered = customPanel.render?.(context) ?? nothing
      if (rendered !== nothing) {
        return html`
          <div class="pf-node-widget-field" data-widget-field=${input.name}>
            <div class="pf-node-widget-label">
              <span>${label}</span>
              <span class="pf-node-widget-type">${input.type}</span>
            </div>
            ${rendered}
          </div>
        `
      }
    }

    const kind = input.editor ?? input.type
    if (kind === 'boolean') {
      const checked = Boolean(value)
      return html`
        <label class="pf-node-widget-field is-inline" data-widget-field=${input.name}>
          <span class="pf-node-widget-label">
            <span>${label}</span>
            <span class="pf-node-widget-type">${checked ? 'true' : 'false'}</span>
          </span>
          <pf-switch size="md" ?checked=${checked}>
            <input
              type="checkbox"
              aria-label=${label}
              .checked=${live(checked)}
              @change=${(evt: Event) =>
                this.setInputValue(node, input.name, (evt.currentTarget as HTMLInputElement).checked)}
            />
          </pf-switch>
        </label>
      `
    }

    if (kind === 'number') {
      const num = typeof value === 'number' && Number.isFinite(value) ? value : Number(value ?? 0)
      return html`
        <div class="pf-node-widget-field" data-widget-field=${input.name}>
          <div class="pf-node-widget-label">
            <span>${label}</span>
            <span class="pf-node-widget-type">${input.type}</span>
          </div>
          <div class="pf-node-widget-number">
            <button
              type="button"
              class="pf-node-widget-step"
              aria-label=${`Decrease ${label}`}
              @click=${() => this.setInputValue(node, input.name, (Number.isFinite(num) ? num : 0) - 1)}
            >−</button>
            <pf-field size="sm">
              <input
                type="number"
                aria-label=${label}
                .value=${live(String(value ?? ''))}
                @input=${(evt: Event) => {
                  const raw = (evt.currentTarget as HTMLInputElement).value
                  if (raw !== '' && !Number.isNaN(Number(raw))) {
                    this.setInputValue(node, input.name, Number(raw))
                  }
                }}
              />
            </pf-field>
            <button
              type="button"
              class="pf-node-widget-step"
              aria-label=${`Increase ${label}`}
              @click=${() => this.setInputValue(node, input.name, (Number.isFinite(num) ? num : 0) + 1)}
            >+</button>
          </div>
        </div>
      `
    }

    if (kind === 'select') {
      return html`
        <div class="pf-node-widget-field" data-widget-field=${input.name}>
          <div class="pf-node-widget-label">
            <span>${label}</span>
            <span class="pf-node-widget-type">${input.type}</span>
          </div>
          <pf-field size="sm">
            <select
              aria-label=${label}
              @change=${(evt: Event) =>
                this.setInputValue(node, input.name, (evt.currentTarget as HTMLSelectElement).value)}
            >
              ${(input._options ?? []).map(
                (option) => html`<option value=${option.value} ?selected=${String(value ?? '') === option.value}>
                  ${option.label}
                </option>`
              )}
            </select>
            <svg slot="suffix" class="bpgraph-node-panel-select-arrow" viewBox="0 0 12 12" aria-hidden="true">
              <path d="M2 4 L6 8 L10 4" stroke="currentColor" stroke-width="1.5" fill="none" />
            </svg>
          </pf-field>
        </div>
      `
    }

    const strVal = String(value ?? '')
    const isMultiline = kind === 'textarea' || strVal.length > 24 || strVal.includes('\n')
    return html`
      <div class="pf-node-widget-field" data-widget-field=${input.name}>
        <div class="pf-node-widget-label">
          <span>${label}</span>
          <span class="pf-node-widget-type">${input.type}</span>
        </div>
        ${isMultiline
          ? html`
              <pf-field multiline>
                <textarea
                  rows="2"
                  aria-label=${label}
                  .value=${live(strVal)}
                  @input=${(evt: Event) =>
                    this.setInputValue(node, input.name, (evt.currentTarget as HTMLTextAreaElement).value)}
                ></textarea>
              </pf-field>
            `
          : html`
              <pf-field size="sm">
                <input
                  type="text"
                  aria-label=${label}
                  .value=${live(strVal)}
                  @input=${(evt: Event) =>
                    this.setInputValue(node, input.name, (evt.currentTarget as HTMLInputElement).value)}
                />
              </pf-field>
            `}
      </div>
    `
  }

  private positionTray() {
    if (!this.node) return
    const anchor = this.anchorElement(this.node)
    const tray = this.host.querySelector<HTMLElement>('.pf-node-widget-bar')
    if (!anchor || !tray) return

    const placement = this.options()?.placement ?? 'bottom'
    const bounds = this.overlay.rect()
    const rect = anchor.getBoundingClientRect()
    const x = rect.left - bounds.left + rect.width / 2 - tray.offsetWidth / 2
    const y = placement === 'top'
      ? rect.top - bounds.top - tray.offsetHeight - 12
      : rect.bottom - bounds.top + 12
    tray.style.left = `${Math.max(8, Math.round(x))}px`
    tray.style.top = `${Math.max(8, Math.round(y))}px`

    if (bounds.width > 0 && bounds.height > 0) {
      void applyFloatingPosition(anchor, tray, {
        placement,
        offset: 12,
        padding: 10,
        boundary: this.overlay.root,
      })
    }
  }
}
