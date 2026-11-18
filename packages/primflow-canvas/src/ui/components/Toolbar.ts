import { html, nothing } from 'lit-html'
import type { CanvasGraph, ToolbarAction, ToolbarOptions } from '../types'
import { OverlayComponent } from '../OverlayComponent'
import type { OverlayLayer } from '../OverlayLayer'

let nextToolbarId = 0

type ToolbarItem = ToolbarAction & { iconPath?: string; pressed?: boolean }

/** Built-in debug toggle; CanvasUI supplies its state to avoid cross-component references. */
interface ToolbarDebugPanelControl {
  available: () => boolean
  open: () => boolean
  toggle: () => void
}

const DEBUG_PANEL_ACTION_ID = 'debug-panel'

const DEBUG_PANEL_ICON =
  'M4 4h16a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z M15 4v16'

/**
 * Transparent toolbar.
 *
 * Built-in undo/redo operate on canvas history; debug configuration adds a visibility toggle.
 * Application actions execute `run` or emit `toolbar:action` with the action id.
 */
export class Toolbar extends OverlayComponent {
  private readonly tooltipPrefix = `bpgraph-toolbar-tooltip-${++nextToolbarId}`
  private readonly graph: CanvasGraph
  private readonly options: () => ToolbarOptions | null
  private readonly debugPanel: ToolbarDebugPanelControl

  refreshLanguage() {
    this.render()
  }

  constructor(
    graph: CanvasGraph,
    overlay: OverlayLayer,
    options: () => ToolbarOptions | null,
    debugPanel: ToolbarDebugPanelControl = {
      available: () => false,
      open: () => false,
      toggle: () => {},
    }
  ) {
    super(overlay, 'bpgraph-toolbar-layer', () => graph.options.language)
    this.graph = graph
    this.options = options
    this.debugPanel = debugPanel
    this.graph.on('history:changed', this.refresh)
    this.graph.on('subgraph:enter', this.refresh)
    this.graph.on('subgraph:exit', this.refresh)
    this.render()
  }

  refresh = () => {
    this.render()
  }

  override destroy() {
    this.graph.off('history:changed', this.refresh)
    this.graph.off('subgraph:enter', this.refresh)
    this.graph.off('subgraph:exit', this.refresh)
    super.destroy()
  }

  private render() {
    const options = this.options()
    if (!options) {
      this.commit(nothing)
      return
    }
    const customActions = (typeof options.actions === 'function' ? options.actions(this.graph) : options.actions) ?? []
    const debugPanelAvailable = this.debugPanel.available()
    if (customActions.length === 0 && !debugPanelAvailable) {
      this.commit(nothing)
      return
    }
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
      // Keep the debug toggle last so application action changes do not move it.
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
    this.commit(html`
      <div class="bpgraph-toolbar is-${position}">
        ${options.status ? html`<span class="bpgraph-toolbar-status" role="status">${options.status}</span>` : nothing}
        ${items.map(
          (action, index) => html`
            <span class="bpgraph-toolbar-item">
              <button
                type="button"
                class=${`bpgraph-toolbar-button${action.iconClass || action.iconPath ? ' is-icon' : ''}${
                  action.pressed ? ' is-pressed' : ''
                }`}
                aria-label=${action.label}
                aria-pressed=${action.pressed === undefined ? nothing : String(action.pressed)}
                aria-describedby=${`${this.tooltipPrefix}-${index}`}
                ?disabled=${Boolean(action.disabled)}
                @click=${() => this.run(action)}
              >
                ${action.iconPath
                  ? html`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <path d=${action.iconPath} />
                    </svg>`
                  : action.iconClass ? html`<i class=${action.iconClass} aria-hidden="true"></i>` : action.label}
              </button>
              <span id=${`${this.tooltipPrefix}-${index}`} class="bpgraph-toolbar-tooltip" role="tooltip">
                ${action.title ?? action.label}
              </span>
            </span>
          `
        )}
      </div>
    `)
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
