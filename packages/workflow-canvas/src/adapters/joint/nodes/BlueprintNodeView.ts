import type { CanvasLanguage } from '../../../ui/i18n'
import { html, nothing, render } from 'lit-html'
import { styleMap } from 'lit-html/directives/style-map.js'
import { dia } from '@joint/core'
import type { InputPort } from '@lyx-pj/workflow-model'
import { BlueprintNode } from './BlueprintNode'
import { ensureUiStyles } from '../../../ui/styles'
import { portEditorTemplate, type PortEditorHandlers } from '../../../ui/portEditors'
import { renderNodeHeader } from '../../../ui/nodeHeader'
import { renderNodeExecution } from '../../../ui/nodeExecution'

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

  initialize(...args: Parameters<dia.ElementView['initialize']>) {
    super.initialize(...args)
    if (this.model.graph) this.listenTo(this.model.graph, 'change:language', this.refreshTitleBar)
    this.listenTo(this.model, 'change:title', this.refreshTitle)
    this.listenTo(this.model, 'change:breakpoint', this.refreshTitle)
    this.listenTo(this.model, 'change:executionStatus change:executionPaused', this.renderExecutionStatus)
    this.listenTo(this.model, 'change:size', this.refreshTitleBar)
    this.listenTo(this.model, 'change:inputs change:outputs', this.applyPortHighlights)
  }

  /**
   * JointJS rebuilds ports synchronously in `render()` / `confirmUpdate()`.
   * Render lit editors after rebuilding, skipping ports that already have editors.
   */
  confirmUpdate(flag: number, opt: Record<string, unknown> = {}): number {
    const remaining = super.confirmUpdate(flag, opt)
    this.renderPortEditors()
    return remaining
  }

  renderMarkup() {
    super.renderMarkup()
    this.renderHeader()
    this.renderExecutionStatus()
    return this
  }

  onRender() {
    this.paper?.el.removeEventListener('click', this.otherClick)
    this.paper?.el.addEventListener('click', this.otherClick)
    this.renderPortEditors()

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

  // ---- Port editors -----------------------------------------------------

  private readonly portHandlers: PortEditorHandlers = {
    input: (port, evt) => {
      if (port.type === 'select') {
        this.filterDropdown(evt)
        return
      }
      const field = evt.target as HTMLInputElement
      if (port.type === 'number') this.sanitizeNumber(field)
      this.commitPortValue(port, field)
    },
    focus: (port, evt) => {
      if (port.type === 'select') this.showDropdown(evt)
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
    ensureUiStyles()

    for (const input of inputs) {
      if (!input.id || input.showInput === false) continue
      const editor = this.findPortNode(input.id, 'portEditor') as HTMLElement | SVGElement | null
      if (!editor || editor.childElementCount > 0) continue
      render(portEditorTemplate(input, style, values, this.portHandlers), editor)
    }
    this.syncDropdowns(inputs)
  }

  private syncDropdowns(inputs: readonly InputPort[]) {
    const selects = inputs.filter((input): input is InputPort & { id: string } => {
      return input.type === 'select' && Boolean(input.id)
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
    if (!field.value) return
    const style = (this.model as BlueprintNode).get('style') || {}
    const boxStyle = style.ports?.input?.editor?.box || {}
    field.style.borderColor = Number.isNaN(Number(field.value)) ? 'red' : boxStyle.borderColor || ''
  }

  private stepNumber(port: InputPort, delta: number) {
    const field = this.findPortField(port.id)
    if (!field) return
    field.value = String(Number(field.value || 0) + delta)
    this.sanitizeNumber(field)
    this.commitPortValue(port, field)
  }

  setInputValue(inputName: string, value: unknown) {
    this.model.set('values', {
      ...this.model.get('values'),
      [inputName]: value,
    })
    this.model.graph.trigger('node:values:changed', this, inputName, value)
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
    const field = editor.querySelector<HTMLInputElement>('[data-port-field]')
    // Keep caret and incomplete numbers during text editing; focused checkboxes still need checked updates.
    if (!field || (!force && input.type !== 'boolean' && field === document.activeElement)) return
    const value = values[input.name]
    if (input.type === 'number' && (typeof value !== 'number' || Number.isNaN(value))) return
    if ((input.type === 'string' || input.type === 'select') && typeof value !== 'string') return
    render(portEditorTemplate(input, (this.model as BlueprintNode).get('style') || {}, values, this.portHandlers), editor)
  }

  highlightPort(portId: string, retry = 0) {
    if (!this.highlightedPorts.has(portId)) this.highlightedPorts.add(portId)
    const portNode = this.findPortNode(portId, 'portBody')
    if (portNode) {
      const style = (this.model as BlueprintNode).get('style') || {}
      const portStyle = (portId.startsWith('in-') ? style.ports?.input : style.ports?.output) || {}
      const fill = portStyle.port?.highlightFill || 'rgba(255, 255, 255, 0.8)'
      const stroke = portStyle.port?.highlightStroke || 'rgba(255, 255, 255, 1)'
      const strokeWidth = portStyle.port?.highlightStrokeWidth ?? 1
      portNode.setAttribute('fill', fill)
      portNode.setAttribute('stroke', stroke)
      portNode.setAttribute('stroke-width', String(strokeWidth))
    } else if (retry < 10) {
      requestAnimationFrame(() => {
        setTimeout(() => {
          this.highlightPort(portId, retry + 1)
        }, 0)
      })
    }
  }

  unhighlightPort(portId: string) {
    const portNode = this.findPortNode(portId, 'portBody')
    if (portNode) {
      const style = (this.model as BlueprintNode).get('style') || {}
      const portStyle = (portId.startsWith('in-') ? style.ports?.input : style.ports?.output) || {}
      const fill = portStyle.port?.fill || 'rgba(255, 255, 255, 0.5)'
      const stroke = portStyle.port?.stroke || 'rgba(255, 255, 255, 0.8)'
      const strokeWidth = portStyle.port?.strokeWidth ?? 1
      portNode.setAttribute('fill', fill)
      portNode.setAttribute('stroke', stroke)
      portNode.setAttribute('stroke-width', String(strokeWidth))
    }
  }
}

function stopBubbling(evt: Event) {
  evt.stopPropagation()
}
