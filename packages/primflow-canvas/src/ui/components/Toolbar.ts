import { html, nothing, type TemplateResult } from 'lit-html'
import type { CanvasGraph, ToolbarAction, ToolbarOptions } from '../types'
import { OverlayComponent } from '../OverlayComponent'
import type { OverlayLayer } from '../OverlayLayer'

let nextToolbarId = 0

type ToolbarItem = ToolbarAction & { iconPath?: string; pressed?: boolean }

/** Built-in side panel toggle; CanvasUI supplies state to avoid cross-component references. */
interface ToolbarPanelControl {
  available: () => boolean
  open: () => boolean
  toggle: () => void
}

interface ToolbarPanelControls {
  node: ToolbarPanelControl
  debug: ToolbarPanelControl
}

const NODE_PANEL_ACTION_ID = 'node-panel'
const DEBUG_PANEL_ACTION_ID = 'debug-panel'

const NODE_PANEL_ICON =
  'M4 4h16a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z M15 4v16'

const DEBUG_PANEL_ICON =
  'M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z M7 9l3 3-3 3 M13 15h4'

const MORE_BUTTON_WIDTH = 30

const unavailablePanelControl: ToolbarPanelControl = {
  available: () => false,
  open: () => false,
  toggle: () => {},
}

/**
 * Transparent toolbar.
 *
 * Built-in undo/redo operate on canvas history; node and debug panel
 * configuration adds visibility toggles. Application actions execute `run` or
 * emit `toolbar:action` with the action id.
 *
 * The layer reserves the measured width of open side panels, so a centered
 * toolbar stays inside the free canvas area. Actions that no longer fit move
 * into a More menu and the bar keeps a single row.
 */
export class Toolbar extends OverlayComponent {
  private readonly tooltipPrefix = `bpgraph-toolbar-tooltip-${++nextToolbarId}`
  private readonly graph: CanvasGraph
  private readonly options: () => ToolbarOptions | null
  private readonly nodePanel: ToolbarPanelControl
  private readonly debugPanel: ToolbarPanelControl
  private rightInset = 0
  private overflowOpen = false
  private readonly resizeObserver: ResizeObserver | null = null

  refreshLanguage() {
    this.render()
  }

  constructor(
    graph: CanvasGraph,
    overlay: OverlayLayer,
    options: () => ToolbarOptions | null,
    panels: Partial<ToolbarPanelControls> = {}
  ) {
    super(overlay, 'bpgraph-toolbar-layer', () => graph.options.language)
    this.graph = graph
    this.options = options
    this.nodePanel = panels.node ?? unavailablePanelControl
    this.debugPanel = panels.debug ?? unavailablePanelControl
    this.graph.on('history:changed', this.refresh)
    this.graph.on('subgraph:enter', this.refresh)
    this.graph.on('subgraph:exit', this.refresh)
    if (typeof ResizeObserver === 'function') {
      this.resizeObserver = new ResizeObserver(() => this.render())
      this.resizeObserver.observe(this.host)
    }
    this.render()
  }

  refresh = () => {
    this.render()
  }

  /** Reserve the measured width of panels docked on the right side. */
  setRightInset(inset: number) {
    const next = Math.max(0, inset)
    this.host.style.setProperty('--bpgraph-toolbar-inset', `${next}px`)
    if (this.rightInset === next) return
    this.rightInset = next
    this.render()
  }

  override destroy() {
    this.closeOverflowWith(false)
    this.resizeObserver?.disconnect()
    this.graph.off('history:changed', this.refresh)
    this.graph.off('subgraph:enter', this.refresh)
    this.graph.off('subgraph:exit', this.refresh)
    this.overlay.root.style.removeProperty('--bpgraph-toolbar-bottom')
    super.destroy()
  }

  private render() {
    this.closeOverflowWith(false)
    const options = this.options()
    if (!options) {
      this.commit(nothing)
      this.setToolbarBottom(0)
      return
    }
    const customActions = (typeof options.actions === 'function' ? options.actions(this.graph) : options.actions) ?? []
    const nodePanelAvailable = this.nodePanel.available()
    const debugPanelAvailable = this.debugPanel.available()
    if (customActions.length === 0 && !nodePanelAvailable && !debugPanelAvailable) {
      this.commit(nothing)
      this.setToolbarBottom(0)
      return
    }
    const nodePanelOpen = nodePanelAvailable && this.nodePanel.open()
    const debugPanelOpen = debugPanelAvailable && this.debugPanel.open()
    const actions: ToolbarItem[] = [
      // Provide a stable back button for subgraphs and loop bodies within the same view.
      ...(this.graph.canGoBack()
        ? [
            {
              id: 'back',
              label: this.t('Back'),
              iconPath: 'M15 18l-6-6 6-6 M9 12h12',
              run: () => this.graph.goBack(),
            },
          ]
        : []),
      {
        id: 'undo',
        label: this.t('Undo'),
        iconPath: 'M3 7v6h6 M21 17a9 9 0 0 0-15.5-6.3L3 13',
        disabled: !this.graph.undoManager.canUndo(),
        run: () => this.graph.undoManager.undo(),
      },
      {
        id: 'redo',
        label: this.t('Redo'),
        iconPath: 'M21 7v6h-6 M3 17a9 9 0 0 1 15.5-6.3L21 13',
        disabled: !this.graph.undoManager.canRedo(),
        run: () => this.graph.undoManager.redo(),
      },
      ...customActions,
      // Keep the side panel toggles last so application action changes do not move them.
      ...(nodePanelAvailable
        ? [
            {
              id: NODE_PANEL_ACTION_ID,
              label: nodePanelOpen ? this.t('Hide node panel') : this.t('Show node panel'),
              title: nodePanelOpen ? this.t('Hide node panel') : this.t('Show node panel'),
              iconPath: NODE_PANEL_ICON,
              pressed: nodePanelOpen,
              run: () => this.nodePanel.toggle(),
            },
          ]
        : []),
      ...(debugPanelAvailable
        ? [
            {
              id: DEBUG_PANEL_ACTION_ID,
              label: debugPanelOpen ? this.t('Hide debug panel') : this.t('Show debug panel'),
              title: debugPanelOpen ? this.t('Hide debug panel') : this.t('Show debug panel'),
              iconPath: DEBUG_PANEL_ICON,
              pressed: debugPanelOpen,
              run: () => this.debugPanel.toggle(),
            },
          ]
        : []),
    ]
    // Replay is read-only; disable toolbar actions except debug visibility to prevent editing or execution.
    const replayMode = this.graph.isReplayMode()
    const items = replayMode
      ? actions.map((action) =>
          action.id === DEBUG_PANEL_ACTION_ID ? action : { ...action, disabled: true }
        )
      : actions
    const position = (options.position ?? 'top-center').replace('top-', '')
    // Measure the full bar first; a second synchronous commit applies the overflow state
    // before the browser paints, so hidden actions never flash on screen.
    this.commit(this.toolbarTemplate(items, 0, position, options.status))
    const hidden = this.computeOverflow(items.length)
    if (hidden > 0) this.commit(this.toolbarTemplate(items, hidden, position, options.status))
    this.setToolbarBottom()
  }

  private toolbarTemplate(
    items: ToolbarItem[],
    hidden: number,
    position: string,
    status: string | undefined
  ): TemplateResult {
    const visible = hidden > 0 ? items.slice(0, items.length - hidden) : items
    const hiddenItems = hidden > 0 ? items.slice(items.length - hidden) : []
    return html`
      <div class="bpgraph-toolbar is-${position}">
        ${status ? html`<span class="bpgraph-toolbar-status" role="status">${status}</span>` : nothing}
        ${visible.map(
          (action, index) => html`
            <span class="bpgraph-toolbar-item">
              <button
                type="button"
                class=${`bpgraph-toolbar-button${action.iconClass || action.iconPath ? ' is-icon' : ''}${
                  action.pressed ? ' is-pressed' : ''
                }`}
                aria-label=${action.label}
                data-action=${action.id}
                aria-pressed=${action.pressed === undefined ? nothing : String(action.pressed)}
                aria-describedby=${`${this.tooltipPrefix}-${index}`}
                ?disabled=${Boolean(action.disabled)}
                @click=${() => this.run(action)}
              >
                ${this.actionIcon(action)}
              </button>
              <span id=${`${this.tooltipPrefix}-${index}`} class="bpgraph-toolbar-tooltip" role="tooltip">
                ${action.title ?? action.label}
              </span>
            </span>
          `
        )}
        ${hiddenItems.length > 0 ? this.moreTemplate(hiddenItems) : nothing}
      </div>
    `
  }

  private moreTemplate(hiddenItems: ToolbarItem[]): TemplateResult {
    return html`
      <span class="bpgraph-toolbar-item">
        <button
          type="button"
          class="bpgraph-toolbar-button is-icon"
          aria-label=${this.t('More actions')}
          aria-haspopup="menu"
          aria-expanded=${String(this.overflowOpen)}
          data-action="more"
          @click=${(event: Event) => this.toggleOverflow(event.currentTarget as HTMLButtonElement)}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <circle cx="5" cy="12" r="1.6" />
            <circle cx="12" cy="12" r="1.6" />
            <circle cx="19" cy="12" r="1.6" />
          </svg>
        </button>
        <dialog class="bpgraph-toolbar-overflow" role="menu" aria-label=${this.t('More actions')}>
          ${hiddenItems.map(
            (action) => html`
              <button
                type="button"
                class="bpgraph-toolbar-overflow-item"
                role="menuitem"
                data-overflow-action=${action.id}
                ?disabled=${Boolean(action.disabled)}
                @click=${() => {
                  this.closeOverflowWith(false)
                  this.run(action)
                }}
              >
                ${action.iconPath || action.iconClass
                  ? html`<span class="bpgraph-toolbar-overflow-icon">${this.actionIcon(action)}</span>`
                  : nothing}
                <span>${action.label}</span>
              </button>
            `
          )}
        </dialog>
      </span>
    `
  }

  private actionIcon(action: ToolbarItem): TemplateResult | string {
    if (action.iconPath) {
      return html`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d=${action.iconPath} />
      </svg>`
    }
    if (action.iconClass) return html`<i class=${action.iconClass} aria-hidden="true"></i>`
    return action.label
  }

  /**
   * Number of trailing actions that do not fit next to the reserved panel width.
   * Returns 0 when layout is unavailable, such as in tests without a browser.
   */
  private computeOverflow(itemCount: number): number {
    const host = this.host
    const bar = host.querySelector<HTMLElement>('.bpgraph-toolbar')
    if (!bar || !host.clientWidth || typeof getComputedStyle !== 'function') return 0
    const hostStyle = getComputedStyle(host)
    const available = host.clientWidth
      - (parseFloat(hostStyle.paddingLeft) || 0)
      - (parseFloat(hostStyle.paddingRight) || 0)
    if (available <= 0) return 0
    const barStyle = getComputedStyle(bar)
    const gap = parseFloat(barStyle.columnGap || barStyle.gap) || 6
    const barPadding = (parseFloat(barStyle.paddingLeft) || 0) + (parseFloat(barStyle.paddingRight) || 0)
    const itemElements = [...bar.querySelectorAll<HTMLElement>('.bpgraph-toolbar-item')]
    const widths = itemElements.map((item) => item.offsetWidth)
    if (widths.length !== itemCount || widths.length === 0) return 0
    const status = bar.querySelector<HTMLElement>('.bpgraph-toolbar-status')
    const statusWidth = status ? status.offsetWidth + gap : 0
    // The More button uses the same icon-button sizing as any leading icon action.
    const iconItem = itemElements.find((item) => item.querySelector('.bpgraph-toolbar-button.is-icon'))
    const moreWidth = iconItem?.offsetWidth || MORE_BUTTON_WIDTH
    const fixed = barPadding + statusWidth
    const total = fixed + widths.reduce((sum, width) => sum + width, 0) + gap * (widths.length - 1)
    if (total <= available) return 0
    for (let hidden = 0; hidden <= widths.length; hidden += 1) {
      const visible = widths.length - hidden
      const visibleWidth = widths.slice(0, visible).reduce((sum, width) => sum + width, 0)
        + (visible > 0 ? gap * (visible - 1) : 0)
      const needed = fixed + visibleWidth + (visible > 0 ? gap : 0) + moreWidth
      if (needed <= available) return hidden
    }
    return widths.length
  }

  private setToolbarBottom(value?: number) {
    const bar = this.host.querySelector<HTMLElement>('.bpgraph-toolbar')
    const bottom = value ?? (bar
      ? Math.max(0, bar.getBoundingClientRect().bottom - this.overlay.root.getBoundingClientRect().top)
      : 0)
    this.overlay.root.style.setProperty('--bpgraph-toolbar-bottom', `${bottom}px`)
  }

  private toggleOverflow(button: HTMLButtonElement) {
    const dialog = this.host.querySelector<HTMLDialogElement>('.bpgraph-toolbar-overflow')
    if (!dialog || typeof dialog.show !== 'function') return
    if (dialog.open) {
      this.closeOverflowWith(true)
      return
    }
    this.overflowOpen = true
    button.setAttribute('aria-expanded', 'true')
    dialog.show()
    this.positionOverflow(dialog, button)
    document.addEventListener('pointerdown', this.onOverflowPointerDown, true)
    document.addEventListener('keydown', this.onOverflowKeyDown, true)
    window.addEventListener('resize', this.closeOverflow)
    window.addEventListener('scroll', this.closeOverflow, true)
    dialog.querySelector<HTMLButtonElement>('.bpgraph-toolbar-overflow-item:not(:disabled)')?.focus()
  }

  private positionOverflow(dialog: HTMLDialogElement, button: HTMLButtonElement) {
    const rect = button.getBoundingClientRect()
    const gap = 6
    const margin = 8
    dialog.style.left = `${margin}px`
    dialog.style.top = `${margin}px`
    const width = dialog.offsetWidth
    const height = dialog.offsetHeight
    const left = Math.min(
      Math.max(margin, rect.left),
      Math.max(margin, window.innerWidth - width - margin)
    )
    const below = rect.bottom + gap
    const top = below + height > window.innerHeight - margin
      ? Math.max(margin, rect.top - gap - height)
      : below
    dialog.style.left = `${left}px`
    dialog.style.top = `${top}px`
  }

  private closeOverflow = () => {
    this.closeOverflowWith(false)
  }

  private closeOverflowWith(restoreFocus: boolean) {
    const dialog = this.host.querySelector<HTMLDialogElement>('.bpgraph-toolbar-overflow')
    if (dialog?.open) dialog.close()
    this.overflowOpen = false
    const button = this.host.querySelector<HTMLButtonElement>('[data-action="more"]')
    button?.setAttribute('aria-expanded', 'false')
    document.removeEventListener('pointerdown', this.onOverflowPointerDown, true)
    document.removeEventListener('keydown', this.onOverflowKeyDown, true)
    window.removeEventListener('resize', this.closeOverflow)
    window.removeEventListener('scroll', this.closeOverflow, true)
    if (restoreFocus) button?.focus()
  }

  private onOverflowPointerDown = (event: Event) => {
    const target = event.target as Node | null
    const dialog = this.host.querySelector<HTMLDialogElement>('.bpgraph-toolbar-overflow')
    if (dialog?.contains(target)) return
    if (this.host.querySelector('[data-action="more"]')?.contains(target)) return
    this.closeOverflowWith(false)
  }

  private onOverflowKeyDown = (event: KeyboardEvent) => {
    const dialog = this.host.querySelector<HTMLDialogElement>('.bpgraph-toolbar-overflow')
    if (!dialog?.open) return
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      this.closeOverflowWith(true)
      return
    }
    if (event.key === 'Tab') {
      this.closeOverflowWith(false)
      return
    }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
    const items = [...dialog.querySelectorAll<HTMLButtonElement>('.bpgraph-toolbar-overflow-item:not(:disabled)')]
    if (items.length === 0) return
    event.preventDefault()
    const current = items.indexOf(document.activeElement as HTMLButtonElement)
    let next = current
    if (event.key === 'ArrowDown') next = current < 0 ? 0 : (current + 1) % items.length
    if (event.key === 'ArrowUp') next = current < 0 ? items.length - 1 : (current - 1 + items.length) % items.length
    if (event.key === 'Home') next = 0
    if (event.key === 'End') next = items.length - 1
    items[next]?.focus()
  }

  private run(action: ToolbarAction) {
    if (action.disabled) return
    if (action.run) {
      action.run({ graph: this.graph })
      return
    }
    this.graph.emit('toolbar:action', action.id)
  }
}
