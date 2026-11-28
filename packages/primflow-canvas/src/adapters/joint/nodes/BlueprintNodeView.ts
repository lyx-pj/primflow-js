import type { CanvasLanguage } from '../../../ui/i18n'
import { html, nothing, render, type TemplateResult } from 'lit-html'
import { styleMap } from 'lit-html/directives/style-map.js'
import { dia } from '@joint/core'
import type { InputPort } from '@lyx-pj/primflow-model'
import { BlueprintNode } from './BlueprintNode'
import { isContainerCardRenderer } from './containerCard'
import { ensureUiStyles } from '../../../ui/styles'
import { registerPrimitives } from '../../../ui/primitives'
import { portEditorTemplate, type PortEditorHandlers } from '../../../ui/portEditors'
import { renderNodeHeader } from '../../../ui/nodeHeader'
import { renderNodeExecution } from '../../../ui/nodeExecution'
import { NodeOverlayHost } from '../../../ui/nodeOverlay'
import type { PortEditorContext } from '../../../ui/editors'
import type { NodeRendererContext } from '../../../ui/nodeRenderers'
import type { CanvasUIMountFn, CanvasUIMountHandle } from '../../../ui/slots'
import type { GraphAdapter } from '../../GraphAdapter'
import type { Graph, NodeInstanceType } from '../../../Graph'

type DropdownOption = { label: string; value: string }

type DropdownState = {
  inputId: string
  inputName: string
  options: readonly DropdownOption[]
  filter: string
  anchor?: { top: number; left: number; minWidth: number }
}

const STOPPED_EVENTS = ['mousedown', 'pointerdown', 'touchstart', 'click', 'dblclick', 'contextmenu'] as const

export class BlueprintNodeView extends dia.ElementView {
  private highlightedPorts = new Set<string>()
  private dropdowns = new Map<string, DropdownState>()
  private openDropdown: string | null = null
  private dropdownHost: HTMLDivElement | null = null
  /** Paper-level overlay host for application-provided port editors. */
  private overlay: NodeOverlayHost | null = null
  /** Active framework-agnostic custom port editor mounts, keyed by input name. */
  private readonly customPortMounts = new Map<
    string,
    {
      mount: CanvasUIMountFn<PortEditorContext>
      host: HTMLElement
      wrapper: HTMLDivElement
      handle: CanvasUIMountHandle<PortEditorContext> | null
    }
  >()
  /** Active framework-agnostic custom node body mount. */
  private customBodyMount: {
    mount: CanvasUIMountFn<NodeRendererContext>
    host: HTMLElement
    wrapper: HTMLDivElement
    handle: CanvasUIMountHandle<NodeRendererContext> | null
  } | null = null

  initialize(...args: Parameters<dia.ElementView['initialize']>) {
    super.initialize(...args)
    if (this.model.graph) this.listenTo(this.model.graph, 'change:language', this.refreshTitleBar)
    if (this.model.graph) this.listenTo(this.model.graph, 'change:language', this.renderCustomBody)
    this.listenTo(this.model, 'change:title', this.refreshTitle)
    this.listenTo(this.model, 'change:breakpoint', this.refreshTitle)
    this.listenTo(this.model, 'change:breakpoint', this.renderCustomBody)
    this.listenTo(this.model, 'change:executionStatus change:executionPaused', this.renderExecutionStatus)
    this.listenTo(this.model, 'change:size', this.refreshTitleBar)
    // A container card changes size when collapsed, and its content depends on that state.
    this.listenTo(this.model, 'change:size change:collapsed', this.renderCustomBody)
    // The loop card shows configured iteration and timeout limits.
    this.listenTo(this.model, 'change:loop', this.renderCustomBody)
    this.listenTo(this.model, 'change:inputs change:outputs', this.applyPortHighlights)
    // Application renderers may depend on node values, ports, or the title.
    this.listenTo(this.model, 'change:values change:title change:inputs change:outputs', this.renderCustomBody)
  }

  /**
   * JointJS rebuilds ports synchronously in `render()` / `confirmUpdate()`.
   * Render lit editors and custom bodies only when geometry, attributes, or
   * ports changed; skip pure transforms such as dragging so embedded previews
   * stay mounted without flickering.
   */
  confirmUpdate(flag: number, opt: Record<string, unknown> = {}): number {
    const flags = dia.ElementView.Flags
    const needsPorts =
      this.hasFlag(flag, flags.RENDER) ||
      this.hasFlag(flag, flags.PORTS) ||
      this.hasFlag(flag, flags.RESIZE) ||
      this.hasFlag(flag, flags.UPDATE)
    const needsCustomBody =
      this.hasFlag(flag, flags.RENDER) ||
      this.hasFlag(flag, flags.RESIZE) ||
      this.hasFlag(flag, flags.UPDATE)
    const remaining = super.confirmUpdate(flag, opt)
    if (needsPorts) this.renderPortEditors()
    if (needsCustomBody) this.renderCustomBody()
    return remaining
  }

  renderMarkup() {
    super.renderMarkup()
    this.renderHeader()
    this.renderExecutionStatus()
    this.renderCustomBody()
    return this
  }

  onRender() {
    this.paper?.el.removeEventListener('click', this.otherClick)
    this.paper?.el.addEventListener('click', this.otherClick)
    this.renderPortEditors()
    this.renderCustomBody()

    const plus = this.findNode('switch-plus-rect')
    if (plus) {
      plus.addEventListener('click', (evt: Event) => {
        evt.stopPropagation()
        this.model.graph.trigger('node:switch:add-case', this.model)
      })
    }
  }

  otherClick = (evt: MouseEvent) => {
    const target = evt.target as Element
    if (this.el.contains(target) && target.closest('.bpgraph-port-select')) {
      return
    }
    if (this.openDropdown) {
      this.hideDropdown()
    }
  }

  onRemove() {
    this.destroyCustomPortMounts()
    this.destroyCustomBodyMount()
    this.overlay?.destroy()
    this.overlay = null
    super.onRemove()
  }

  private destroyCustomPortMounts() {
    for (const entry of this.customPortMounts.values()) {
      try {
        entry.handle?.destroy?.()
      } finally {
        // Detach the per-mount wrapper without clearing its children so deferred
        // framework unmounts (React portals / roots) can remove their own nodes.
        entry.wrapper.remove()
      }
    }
    this.customPortMounts.clear()
  }

  private destroyCustomBodyMount() {
    if (!this.customBodyMount) return
    const current = this.customBodyMount
    this.customBodyMount = null
    try {
      current.handle?.destroy?.()
    } finally {
      current.wrapper.remove()
    }
  }

  // ---- Port editors -----------------------------------------------------

  private readonly portHandlers: PortEditorHandlers = {
    input: (port, evt) => {
      if (port.editor === 'select') {
        this.filterDropdown(evt)
        return
      }
      const field = evt.target as HTMLInputElement
      if (port.type === 'number') this.sanitizeNumber(field)
      this.commitPortValue(port, field)
    },
    focus: (port, evt) => {
      if (port.editor === 'select') this.showDropdown(evt)
    },
    blur: (port, evt) => {
      if (port.type === 'number') this.validateNumberField(evt.target as HTMLInputElement)
    },
    toggle: (port) => this.commitPortValue(port),
    step: (port, delta) => this.stepNumber(port, delta),
  }

  private renderPortEditors() {
    // JointJS hardcodes joint- port classes independently of config.classNamePrefix.
    for (const element of this.el.querySelectorAll('.joint-port, .joint-port-body, .joint-port-label')) {
      element.classList.replace('joint-port', 'bpgraph-port')
      element.classList.replace('joint-port-body', 'bpgraph-port-body')
      element.classList.replace('joint-port-label', 'bpgraph-port-label')
    }
    const node = this.model as BlueprintNode
    const inputs = node.get('inputs') || []
    const values = node.get('values') || {}
    const style = node.get('style') || {}
    registerPrimitives()
    ensureUiStyles()

    const activePortNames = new Set<string>()
    for (const input of inputs) {
      if (!input.id || input.showInput === false) continue
      activePortNames.add(input.name)
      const editor = this.findPortNode(input.id, 'portEditor') as HTMLElement | null
      if (!editor) continue
      const customMount = this.syncCustomPortMount(input, editor)
      if (customMount) continue
      if (editor.childElementCount > 0) continue
      const custom = this.customEditor(input)
      if (custom) {
        render(custom, editor)
        continue
      }
      render(portEditorTemplate(input, style, values, this.portHandlers), editor)
    }
    for (const [name, entry] of [...this.customPortMounts]) {
      if (!activePortNames.has(name)) {
        try {
          entry.handle?.destroy?.()
        } finally {
          entry.wrapper.remove()
          this.customPortMounts.delete(name)
        }
      }
    }
    this.syncDropdowns(inputs)
  }

  /**
   * Render application content for a node that registered its own renderer.
   *
   * The renderer owns the node content; the element, its ports, and its links
   * are unchanged, so connecting and selection keep working.
   *
   * Declared as a method: `initialize()` registers it as a listener before
   * class field initializers run, so an arrow field would still be undefined.
   */
  private renderCustomBody() {
    // A collapsed container card becomes a compact summary; its body turns
    // translucent so the canvas grid stays visible behind it.
    const collapsed = Boolean(this.model.get('collapsed'))
    this.el?.classList.toggle('is-container-collapsed', collapsed)
    this.el?.classList.toggle('is-subgraph-collapsed', collapsed && this.model.get('kind') === 'subgraph')
    const registration = (this.model as BlueprintNode).get('nodeRenderer')
    const cardVariant = isContainerCardRenderer(registration) ? registration.containerCard : undefined
    // The built-in loop card hides port labels, which would otherwise sit on
    // top of the preview. An application renderer keeps its own choices.
    this.el?.classList.toggle('is-loop-card', cardVariant === 'loop')
    if (!registration) {
      this.destroyCustomBodyMount()
      return
    }
    const root = this.findNode('nodeCustomRoot') as HTMLElement | null
    if (!root) return
    const { width, height } = this.model.size()
    const context: NodeRendererContext = {
      graph: this.canvasGraph(),
      node: this.nodeInstance(),
      width,
      height,
    }
    if (registration.mount) {
      if (
        this.customBodyMount &&
        this.customBodyMount.mount === registration.mount &&
        this.customBodyMount.host === root
      ) {
        this.customBodyMount.handle?.update?.(context)
        return
      }
      this.destroyCustomBodyMount()
      render(nothing, root)
      const wrapper = document.createElement('div')
      wrapper.className = 'bpgraph-custom-mount'
      wrapper.style.width = '100%'
      wrapper.style.height = '100%'
      root.appendChild(wrapper)
      const handle = registration.mount(wrapper, context) ?? null
      this.customBodyMount = { mount: registration.mount, host: root, wrapper, handle }
      return
    }
    this.destroyCustomBodyMount()
    if (registration.render) {
      render(registration.render(context), root)
    }
  }

  private portEditorContext(input: InputPort): PortEditorContext {
    return {
      graph: this.canvasGraph(),
      node: this.nodeInstance(),
      port: input,
      value: (this.model.get('values') || {})[input.name],
      setValue: (value) => this.setInputValue(input.name, value),
      style: this.model.get('style') || {},
      overlay: this.overlayHost,
    }
  }

  /** Sync a framework-agnostic `mount` port editor; returns true when the port uses `mount`. */
  private syncCustomPortMount(input: InputPort, editor: HTMLElement): boolean {
    const registration = (this.model as BlueprintNode).get('editors')?.get(input.type, 'port')
    if (!registration?.mount) {
      const stale = this.customPortMounts.get(input.name)
      if (stale) {
        try {
          stale.handle?.destroy?.()
        } finally {
          stale.wrapper.remove()
          this.customPortMounts.delete(input.name)
        }
      }
      return false
    }
    const context = this.portEditorContext(input)
    const existing = this.customPortMounts.get(input.name)
    if (existing && existing.mount === registration.mount && existing.host === editor) {
      existing.handle?.update?.(context)
      return true
    }
    if (existing) {
      try {
        existing.handle?.destroy?.()
      } finally {
        existing.wrapper.remove()
        this.customPortMounts.delete(input.name)
      }
    }
    render(nothing, editor)
    const wrapper = document.createElement('div')
    wrapper.className = 'bpgraph-custom-mount'
    wrapper.style.display = 'contents'
    editor.appendChild(wrapper)
    const handle = registration.mount(wrapper, context) ?? null
    this.customPortMounts.set(input.name, { mount: registration.mount, host: editor, wrapper, handle })
    return true
  }

  /**
   * Application-provided editor for a port, or undefined when the port uses a
   * built-in control.
   */
  private customEditor(input: InputPort): TemplateResult | typeof nothing | undefined {
    const registration = (this.model as BlueprintNode).get('editors')?.get(input.type, 'port')
    if (!registration?.render) return undefined
    return registration.render(this.portEditorContext(input))
  }

  /** The canvas graph behind this view. */
  private canvasGraph(): Graph | undefined {
    return this.model.graph?.get('canvasGraph') as Graph | undefined
  }

  /** The canvas node instance behind this view, when the adapter exposes it. */
  private nodeInstance(): NodeInstanceType | undefined {
    const adapter = this.model.graph?.get('adapter') as GraphAdapter | undefined
    return adapter?.getNodeInstance(this.model.id as string)
  }

  /** Paper-level overlay host used by application-provided port editors. */
  private get overlayHost(): NodeOverlayHost {
    if (!this.overlay) {
      const paperEl = this.paper?.el as HTMLElement | undefined
      this.overlay = new NodeOverlayHost(paperEl ?? document.body)
    }
    return this.overlay
  }

  private syncDropdowns(inputs: readonly InputPort[]) {
    const selects = inputs.filter((input): input is InputPort & { id: string } => {
      return input.editor === 'select' && Boolean(input.id)
    })
    const names = new Set(selects.map((input) => input.name))
    for (const name of [...this.dropdowns.keys()]) {
      if (!names.has(name)) this.dropdowns.delete(name)
    }
    for (const input of selects) {
      const options = input._options ?? []
      const existing = this.dropdowns.get(input.name)
      if (existing) {
        existing.inputId = input.id
        existing.options = options
        continue
      }
      this.dropdowns.set(input.name, {
        inputId: input.id,
        inputName: input.name,
        options,
        filter: '',
      })
    }
  }

  private findPortField(inputId?: string) {
    if (!inputId) return null
    const editor = this.findPortNode(inputId, 'portEditor') as Element | null
    return editor?.querySelector<HTMLInputElement>('[data-port-field]') ?? null
  }

  private commitPortValue(port: InputPort, field?: HTMLInputElement | null) {
    const values = this.model.get('values') || {}
    let value: unknown = field?.value ?? ''
    if (port.type === 'number') {
      value = field?.value ? Number(field.value) : NaN
    } else if (port.type === 'boolean') {
      value = !values[port.name]
      const checkbox = this.findPortField(port.id)
      const sw = checkbox?.closest('pf-switch') as (HTMLElement & { checked?: boolean }) | null
      if (sw) sw.checked = Boolean(value)
    }
    if (field && typeof value === 'string') field.title = value
    this.setInputValue(port.name, value)
  }

  private sanitizeNumber(field: HTMLInputElement) {
    const value = field.value
    if (!value) return
    const filtered = value.replace(/[^\d.-]/g, '')
    if (filtered !== value) field.value = filtered
  }

  private validateNumberField(field: HTMLInputElement) {
    const invalid = Boolean(field.value) && Number.isNaN(Number(field.value))
    const wrapper = field.closest('pf-field') as (HTMLElement & { invalid?: boolean }) | null
    if (wrapper) {
      wrapper.invalid = invalid
      return
    }
    if (!field.value) return
    const style = (this.model as BlueprintNode).get('style') || {}
    const boxStyle = style.ports?.input?.editor?.box || {}
    field.style.borderColor = invalid ? 'red' : boxStyle.borderColor || ''
  }

  private stepNumber(port: InputPort, delta: number) {
    const field = this.findPortField(port.id)
    if (!field) return
    field.value = String(Number(field.value || 0) + delta)
    this.sanitizeNumber(field)
    this.commitPortValue(port, field)
  }

  setInputValue(inputName: string, value: unknown) {
    // Update the node instance first. The adapter then writes the full value
    // map back to the joint model, so value-dependent renderers re-render with
    // the instance already updated.
    this.model.graph.trigger('node:values:changed', this, inputName, value)
    this.model.set('values', {
      ...this.model.get('values'),
      [inputName]: value,
    })
  }

  // ---- Dropdown ---------------------------------------------------------

  private ensureDropdownHost() {
    const paperEl = this.paper?.el as HTMLElement | undefined
    if (!paperEl) return null
    if (!this.dropdownHost || !this.dropdownHost.isConnected) {
      ensureUiStyles()
      const host = document.createElement('div')
      host.className = 'bpgraph-node-dropdown-host'
      // Prevent dropdown mousedown/click from reaching JointJS, as with other overlays.
      for (const event of STOPPED_EVENTS) host.addEventListener(event, stopBubbling)
      paperEl.appendChild(host)
      this.dropdownHost = host
    }
    return this.dropdownHost
  }

  updateOptions(inputId: string, inputName: string, options: readonly DropdownOption[]) {
    const state = this.dropdowns.get(inputName)
    if (!state) return
    state.inputId = inputId
    state.options = options
    if (this.openDropdown === inputName) this.renderDropdown()
  }

  showDropdown = (evt: Event) => {
    const fieldEl = evt.target as HTMLInputElement
    const inputName = fieldEl.dataset.portField
    if (!inputName) return
    const state = this.dropdowns.get(inputName)
    if (!state) return
    const paperEl = this.paper?.el as HTMLElement | undefined
    const paperRect = paperEl?.getBoundingClientRect()
    const fieldRect = fieldEl.getBoundingClientRect()
    state.anchor = {
      top: fieldRect.bottom - (paperRect?.top ?? 0) + 4,
      left: fieldRect.left - (paperRect?.left ?? 0),
      minWidth: fieldRect.width,
    }
    state.filter = ''
    this.openDropdown = inputName
    this.renderDropdown()
  }

  hideDropdown = () => {
    if (!this.openDropdown) return
    this.openDropdown = null
    this.renderDropdown()
  }

  filterDropdown(evt: Event) {
    const fieldEl = evt.target as HTMLInputElement
    const inputName = fieldEl.dataset.portField
    if (!inputName) return
    const state = this.dropdowns.get(inputName)
    if (!state || this.openDropdown !== inputName) return
    state.filter = fieldEl.value
    this.renderDropdown()
  }

  private chooseOption(evt: Event, state: DropdownState) {
    const optionEl = evt.currentTarget as HTMLElement
    this.setInputValue(state.inputName, optionEl.dataset.value)
    this.refreshDomValue(state.inputName, true)
    this.hideDropdown()
  }

  private renderDropdown() {
    const host = this.ensureDropdownHost()
    if (!host) return
    const state = this.openDropdown ? this.dropdowns.get(this.openDropdown) : undefined
    if (!state?.anchor) {
      render(nothing, host)
      return
    }
    const theme = this.dropdownTheme()
    render(
      html`
        <div
          class="bpgraph-node-dropdown"
          style=${styleMap({
            ...theme,
            top: `${state.anchor.top}px`,
            left: `${state.anchor.left}px`,
            minWidth: `${state.anchor.minWidth}px`,
          })}
          @wheel=${this.stopWheel}
        >
          ${state.options.map(
            (option) => html`
              <div
                role="option"
                class="bpgraph-node-dropdown-option"
                style=${styleMap({ display: this.matchOption(option.label, state.filter) ? 'block' : 'none' })}
                data-value=${option.value}
                @click=${(evt: Event) => this.chooseOption(evt, state)}
              >
                ${option.label}
              </div>
            `
          )}
        </div>
      `,
      host
    )
  }

  private stopWheel = (evt: WheelEvent) => {
    // Prevent canvas zoom while retaining native scrolling.
    evt.stopPropagation()
  }

  private matchOption(label: string, filter: string) {
    if (!filter) return true
    const pattern = filter
      .toLowerCase()
      .split('')
      .map((char) => char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('.*')
    return new RegExp(pattern, 'i').test(label)
  }

  private dropdownTheme() {
    const style = (this.model as BlueprintNode).get('style') || {}
    const dropdownStyle = style.ports?.input?.editor?.dropdown || {}
    return {
      background: dropdownStyle.background || '#222',
      border: `1px solid ${dropdownStyle.borderColor || 'rgba(120, 130, 140, 0.3)'}`,
      color: dropdownStyle.color || '#fff',
      borderRadius: `${dropdownStyle.borderRadius || 4}px`,
      position: 'absolute',
      zIndex: '9999',
      fontSize: '12px',
      maxHeight: '200px',
      overflow: 'auto',
      boxShadow: '0 2px 6px rgba(0, 0, 0, 0.2)',
    }
  }

  // ---- Port highlighting / value synchronization ------------------------

  applyPortHighlights() {
    requestAnimationFrame(() => {
      setTimeout(() => {
        this._applyPortHighlights()
      }, 0)
    })
  }

  _applyPortHighlights() {
    const ports = (this.model as BlueprintNode).getPorts()
    const portIds = ports.map((port) => port.id)
    const toRemove = [] as string[]
    for (const portId of this.highlightedPorts) {
      if (!portIds.includes(portId)) {
        toRemove.push(portId)
        continue
      }
      this.highlightPort(portId)
    }

    for (const portId of toRemove) {
      this.highlightedPorts.delete(portId)
      this.unhighlightPort(portId)
    }
  }

  refreshTitle() {
    this.renderHeader()
  }

  /**
   * Header paths depend on node size; redraw after resizing.
   * Otherwise the body may narrow while the header retains its old width.
   */
  refreshTitleBar() {
    this.renderHeader()
    this.renderExecutionStatus()
  }

  private renderExecutionStatus() {
    const node = this.model as BlueprintNode
    const status = node.get('executionStatus') ?? 'idle'
    this.el.setAttribute('data-node-execution-status', status)
    const group = this.findNode('execution-effects') as SVGGElement | null
    if (!group) return
    ensureUiStyles()
    const { width, height } = node.size()
    renderNodeExecution(group, {
      language: node.graph?.get('language') as CanvasLanguage | undefined,
      id: this.cid,
      status,
      paused: node.get('executionPaused'),
      width, height, radius: node.get('style')?.borderRadius ?? 6,
    })
  }

  private renderHeader() {
    const group = this.findNode('base-node-title') as SVGGElement | null
    if (!group) return
    const node = this.model as BlueprintNode
    const attrs = node.get('attrs') || {}
    renderNodeHeader(group, {
      language: node.graph?.get('language') as CanvasLanguage | undefined,
      title: node.get('title') || '',
      breakpoint: node.get('breakpoint'),
      size: node.size(),
      style: node.get('style') || {},
      rx: attrs['base-node-body']?.rx,
      ry: attrs['base-node-body']?.ry,
    })
  }

  refreshDomValue(name: string, force = false) {
    const values = this.model.get('values') || {}
    const inputs = (this.model as BlueprintNode).get('inputs') || []
    const input = inputs.find((item) => item.name === name)
    if (!input?.id) return
    const editor = this.findPortNode(input.id, 'portEditor') as HTMLElement | null
    if (!editor) return
    // A registered editor owns its markup, so re-render or update it instead of
    // clearing the mount with the built-in template.
    if ((this.model as BlueprintNode).get('editors')?.has(input.type, 'port')) {
      if (!this.syncCustomPortMount(input, editor)) {
        render(this.customEditor(input) ?? nothing, editor)
      }
      return
    }
    const field = editor.querySelector<HTMLInputElement>('[data-port-field]')
    // Keep caret and incomplete numbers during text editing; focused checkboxes still need checked updates.
    if (!field || (!force && input.type !== 'boolean' && field === document.activeElement)) return
    const value = values[input.name]
    if (input.type === 'number' && (typeof value !== 'number' || Number.isNaN(value))) return
    if (input.type === 'string' && typeof value !== 'string') return
    render(portEditorTemplate(input, (this.model as BlueprintNode).get('style') || {}, values, this.portHandlers), editor)
  }

  highlightPort(portId: string, retry = 0) {
    if (!this.highlightedPorts.has(portId)) this.highlightedPorts.add(portId)
    const portNode = this.findPortNode(portId, 'portBody')
    if (portNode) {
      const style = (this.model as BlueprintNode).get('style') || {}
      const portStyle = ((this.model as BlueprintNode).getPort(portId)?.group === 'in' ? style.ports?.input : style.ports?.output) || {}
      // A connected port fills with its type colour, which is what tells port
      // kinds apart once they leave the resting outline state. The outline
      // keeps the same colour, so the port reads as one solid shape.
      const typeColor = style.ports?.colors?.[this.portType(portId) ?? '']
      const fill = typeColor || portStyle.port?.highlightFill || 'rgba(255, 255, 255, 0.8)'
      const stroke = typeColor || portStyle.port?.highlightStroke || 'rgba(255, 255, 255, 1)'
      const strokeWidth = portStyle.port?.highlightStrokeWidth ?? 1
      portNode.setAttribute('fill', fill)
      portNode.setAttribute('stroke', stroke)
      portNode.setAttribute('stroke-width', String(strokeWidth))
      // A connected port reads at full strength.
      portNode.setAttribute('stroke-opacity', '1')
    } else if (retry < 10) {
      requestAnimationFrame(() => {
        setTimeout(() => {
          this.highlightPort(portId, retry + 1)
        }, 0)
      })
    }
  }

  /** Data type of one port, used to resolve its colour. */
  private portType(portId: string) {
    const node = this.model as BlueprintNode
    const ports = [...(node.get('inputs') || []), ...(node.get('outputs') || [])]
    return ports.find((port) => port.id === portId)?.type
  }

  unhighlightPort(portId: string) {
    const portNode = this.findPortNode(portId, 'portBody')
    if (portNode) {
      const style = (this.model as BlueprintNode).get('style') || {}
      const port = (this.model as BlueprintNode).getPort(portId)
      const portStyle = (port?.group === 'in' ? style.ports?.input : style.ports?.output) || {}
      // The port carries its own resolved colours, which restores the type
      // outline after a highlight is cleared.
      const own = port?.attrs?.portBody as
        | { fill?: string; stroke?: string; strokeOpacity?: number }
        | undefined
      const fill = own?.fill ?? portStyle.port?.fill ?? 'rgba(255, 255, 255, 0.5)'
      const stroke = own?.stroke ?? portStyle.port?.stroke ?? 'rgba(255, 255, 255, 0.8)'
      const strokeWidth = portStyle.port?.strokeWidth ?? 1
      const strokeOpacity = own?.strokeOpacity ?? 1
      portNode.setAttribute('fill', fill)
      portNode.setAttribute('stroke', stroke)
      portNode.setAttribute('stroke-width', String(strokeWidth))
      portNode.setAttribute('stroke-opacity', String(strokeOpacity))
    }
  }
}

function stopBubbling(evt: Event) {
  evt.stopPropagation()
}
