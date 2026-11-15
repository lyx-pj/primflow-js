import type { dia } from '@joint/core'
import type { Graph, LinkInstanceType, NodeInstanceType } from '../Graph'
import type { GraphAdapter } from '../adapters/GraphAdapter'
import { OverlayLayer } from './OverlayLayer'
import { Palette } from './components/Palette'
import { ContextMenu } from './components/ContextMenu'
import { NodePanel } from './components/NodePanel'
import { DebugPanel } from './components/DebugPanel'
import { ReplayBanner } from './components/ReplayBanner'
import { Toolbar } from './components/Toolbar'
import { ZoomControls } from './components/ZoomControls'
import { Minimap } from './components/Minimap'
import { ExecutionEffects } from './components/ExecutionEffects'
import { NodeExecutionPreview } from './components/NodeExecutionPreview'
import type {
  CanvasGraph,
  ContextMenuOptions,
  DebugPanelOptions,
  NodePanelOptions,
  PaletteOptions,
  ToolbarOptions,
} from './types'

const NODE_CONTROL_SELECTOR = [
  'input',
  'textarea',
  'select',
  'button',
  'a[href]',
  '[contenteditable]:not([contenteditable="false"])',
  '[role="button"]',
  '[role="checkbox"]',
  '[role="combobox"]',
  '[role="textbox"]',
  '[port]',
  '[data-port-field]',
].join(',')

/** Double-click window covering adjustable system double-click speeds. */
const DOUBLE_CLICK_WINDOW_MS = 800
/** Delay first container panel opening briefly to avoid flicker on subgraph double-click. */
const CONTAINER_PANEL_DELAY_MS = 200
/** Wait for a second right click inside subgraphs before showing context menus. */
const BLANK_MENU_DELAY_MS = 300

/**
 * Canvas UI orchestration.
 *
 * Each toolbar, node panel, debug panel, palette, and context menu owns a lit layer
 * and manages its own state and rendering. CanvasUI only:
 *   - binds JointJS paper and Graph lifecycles;
 *   - routes double-click, context menu, and selection events to components.
 */
export class CanvasUI {
  private readonly graph: CanvasGraph
  private readonly adapter: GraphAdapter
  private readonly paper: dia.Paper
  private readonly overlay: OverlayLayer
  private readonly toolbar: Toolbar
  private readonly zoomControls: ZoomControls
  private readonly minimap: Minimap
  private readonly panel: NodePanel
  private readonly debugPanel: DebugPanel
  private readonly replayBanner: ReplayBanner
  private replayActive = false
  private previousInteractive: dia.Paper.Options['interactive'] = true
  private readonly palette: Palette
  private readonly contextMenu: ContextMenu
  private readonly executionEffects: ExecutionEffects
  private readonly executionPreview: NodeExecutionPreview
  private autoOpenPanel: boolean
  /** Pending node panel, delayed only for initial container opening. */
  private pendingPanelNode: NodeInstanceType | null = null
  private pendingPanelTimer: ReturnType<typeof setTimeout> | null = null
  /** Last clicked container, checked after selection notification to decide whether to delay. */
  private clickedContainerNode: NodeInstanceType | null = null
  private lastBlankRightClick = 0
  /** Latest blank right-button pointerdown, allowing double-click detection despite delayed contextmenu. */
  private lastRightPointerDown = 0
  private blankMenuTimer: ReturnType<typeof setTimeout> | null = null
  /** Whether a blank context menu is pending or open, for detecting the second click. */
  private blankMenuActive = false
  /** Suppress late contextmenu events briefly after right-button double-click navigation. */
  private suppressContextMenuUntil = 0

  constructor(graph: Graph, adapter: GraphAdapter, paper: dia.Paper) {
    this.graph = graph as unknown as CanvasGraph
    this.autoOpenPanel = adapter.selection.size === 0
    this.adapter = adapter
    this.paper = paper
    this.overlay = new OverlayLayer(paper.el as HTMLElement)
    this.replayBanner = new ReplayBanner(this.overlay, () => this.graph.exitReplay(), () => this.graph.options.language)
    this.executionEffects = new ExecutionEffects(this.overlay)
    this.executionPreview = new NodeExecutionPreview(this.graph, this.overlay)
    this.refreshExecutionStatus()
    // Create the debug panel before the toolbar so initial visibility is correct.
    this.debugPanel = new DebugPanel(this.graph, this.overlay, () => this.debugPanelOptions, this.onDebugPanelVisibility)
    this.toolbar = new Toolbar(this.graph, this.overlay, () => this.toolbarOptions, {
      available: () => this.debugPanelOptions !== null,
      open: () => this.debugPanel.isOpen(),
      toggle: () => this.debugPanel.toggle(),
    })
    this.zoomControls = new ZoomControls(this.graph, paper, this.overlay)
    this.minimap = new Minimap(this.graph, paper, this.overlay)
    this.panel = new NodePanel(this.graph, this.overlay, () => this.nodePanelOptions)
    this.syncPanelLayout()
    this.palette = new Palette(this.graph, adapter, this.overlay, () => this.paletteOptions)
    this.contextMenu = new ContextMenu(this.graph, this.overlay, () => this.contextMenuOptions, (x, y) =>
      this.openPalette(x, y)
    )
    this.bind()
    // Synchronize replay banner and read-only state in case replay started before mounting.
    this.syncReplayState(this.graph.isReplayMode(), this.graph.replayLabel)
  }

  // ---- Public API -------------------------------------------------------

  refreshLanguage() {
    for (const component of [this.toolbar, this.zoomControls, this.minimap, this.panel,
      this.debugPanel, this.replayBanner, this.palette, this.contextMenu, this.executionPreview]) {
      component.refreshLanguage()
    }
  }

  refreshToolbar() {
    this.toolbar.refresh()
  }

  refreshExecutionStatus() {
    const status = this.graph.executionStatus ?? 'idle'
    this.paper.el.setAttribute('data-execution-status', status)
    this.executionEffects.refresh(status)
  }

  refreshNodeExecutionPreview(nodeId: string) {
    this.executionPreview.refresh(nodeId)
  }

  isDebugPanelOpen() {
    return this.debugPanel.isOpen()
  }

  openDebugPanel() {
    this.debugPanel.open()
  }

  closeDebugPanel() {
    this.debugPanel.close()
  }

  toggleDebugPanel() {
    this.debugPanel.toggle()
  }

  refreshDebugPanel() {
    this.debugPanel.refresh()
    this.syncPanelLayout()
  }

  openPalette(clientX?: number, clientY?: number) {
    if (this.graph.options.palette === false || this.graph.isReplayMode()) return
    this.palette.openAt(clientX, clientY)
  }

  close() {
    this.cancelBlankMenu()
    this.lastBlankRightClick = 0
    this.lastRightPointerDown = 0
    this.blankMenuActive = false
    this.palette.close()
    this.contextMenu.close()
    this.executionPreview.close()
  }

  destroy() {
    this.cancelBlankMenu()
    this.cancelPendingPanel()
    this.lastBlankRightClick = 0
    this.lastRightPointerDown = 0
    this.blankMenuActive = false
    this.suppressContextMenuUntil = 0
    this.unbind()
    if (this.replayActive) this.paper.options.interactive = this.previousInteractive
    this.replayBanner.destroy()
    this.toolbar.destroy()
    this.zoomControls.destroy()
    this.minimap.destroy()
    this.panel.destroy()
    this.debugPanel.destroy()
    this.palette.destroy()
    this.contextMenu.destroy()
    this.executionEffects.destroy()
    this.executionPreview.destroy()
    this.paper.el.removeAttribute('data-execution-status')
    this.overlay.dispose()
  }

  // ---- Lifecycle --------------------------------------------------------

  private bind() {
    this.paper.on('blank:pointerdblclick', this.onBlankDoubleClick)
    this.paper.on('blank:contextmenu', this.onBlankContextMenu)
    this.paper.on('element:contextmenu', this.onElementContextMenu)
    this.paper.on('link:contextmenu', this.onLinkContextMenu)
    ;(this.paper.el as HTMLElement).addEventListener('pointerdown', this.onPointerDown, true)
    ;(this.paper.el as HTMLElement).addEventListener('contextmenu', this.onContextMenu, true)
    document.addEventListener('keydown', this.onKeyDown)
    this.graph.on('viewport:change', this.onViewportChange)
    this.graph.on('selection:changed', this.onSelectionChanged)
    this.graph.on('node:click', this.onNodeClick)
    this.graph.on('node:dblclick', this.onNodeDoubleClick)
    this.graph.on('node:mouseenter', this.onNodeEnter)
    this.graph.on('node:mouseleave', this.onNodeLeave)
    this.graph.on('node:removed', this.executionPreview.close)
    this.graph.on('subgraph:enter', this.onSubgraphEnter)
    this.graph.on('subgraph:exit', this.executionPreview.close)
    this.graph.on('replay:changed', this.onReplayChanged)
  }

  private unbind() {
    this.paper.off('blank:pointerdblclick', this.onBlankDoubleClick)
    this.paper.off('blank:contextmenu', this.onBlankContextMenu)
    this.paper.off('element:contextmenu', this.onElementContextMenu)
    this.paper.off('link:contextmenu', this.onLinkContextMenu)
    ;(this.paper.el as HTMLElement).removeEventListener('pointerdown', this.onPointerDown, true)
    ;(this.paper.el as HTMLElement).removeEventListener('contextmenu', this.onContextMenu, true)
    document.removeEventListener('keydown', this.onKeyDown)
    this.graph.off('viewport:change', this.onViewportChange)
    this.graph.off('selection:changed', this.onSelectionChanged)
    this.graph.off('node:click', this.onNodeClick)
    this.graph.off('node:dblclick', this.onNodeDoubleClick)
    this.graph.off('node:mouseenter', this.onNodeEnter)
    this.graph.off('node:mouseleave', this.onNodeLeave)
    this.graph.off('node:removed', this.executionPreview.close)
    this.graph.off('subgraph:enter', this.onSubgraphEnter)
    this.graph.off('subgraph:exit', this.executionPreview.close)
    this.graph.off('replay:changed', this.onReplayChanged)
  }

  // ---- Canvas event routing ---------------------------------------------

  private onBlankDoubleClick = (evt: dia.Event, x: number, y: number) => {
    this.cancelBlankMenu()
    this.lastBlankRightClick = 0
    this.blankMenuActive = false
    if (this.graph.isReplayMode() || this.paletteOptions?.trigger === false) return
    if (this.palette.isOpen() || this.contextMenu.isOpen()) return
    const client = this.clientPoint(evt, x, y)
    this.openPalette(client.x, client.y)
  }

  private onBlankContextMenu = (evt: dia.Event, x: number, y: number) => {
    evt.preventDefault()
    if (this.graph.isReplayMode()) return
    // JointJS blank:contextmenu may fire before container capture; apply suppression here too.
    // Otherwise returning could still schedule a menu opening.
    if (Date.now() <= this.suppressContextMenuUntil) {
      this.suppressContextMenuUntil = 0
      this.cancelBlankMenu()
      this.blankMenuActive = false
      this.lastBlankRightClick = 0
      return
    }
    this.scheduleBlankMenu(this.clientPoint(evt, x, y))
  }

  /**
   * Inside subgraphs, delay blank context menus through the double-click window.
   * Opening immediately would cover the second click and prevent navigation.
   */
  private scheduleBlankMenu(client: { x: number; y: number }) {
    if (!this.graph.canGoBack()) {
      this.cancelBlankMenu()
      this.blankMenuActive = false
      this.contextMenu.open(client.x, client.y, { target: 'blank' })
      return
    }
    const now = Date.now()
    const doubleClick = now - this.lastBlankRightClick <= DOUBLE_CLICK_WINDOW_MS
    this.cancelBlankMenu()
    if (doubleClick) {
      this.goBackFromContextMenu()
      return
    }
    this.lastBlankRightClick = now
    this.blankMenuActive = true
    this.blankMenuTimer = setTimeout(() => {
      this.blankMenuTimer = null
      if (!this.graph.canGoBack() || !this.blankMenuActive) return
      this.contextMenu.open(client.x, client.y, { target: 'blank' })
    }, BLANK_MENU_DELAY_MS)
  }

  private cancelBlankMenu() {
    if (this.blankMenuTimer === null) return
    clearTimeout(this.blankMenuTimer)
    this.blankMenuTimer = null
  }

  private goBackFromContextMenu() {
    this.close()
    // Viewport changes from async file switching must not clear the suppression window in close().
    this.suppressContextMenuUntil = Date.now() + DOUBLE_CLICK_WINDOW_MS
    this.graph.goBack()
  }

  private onElementContextMenu = (view: dia.ElementView, evt: dia.Event, x: number, y: number) => {
    evt.preventDefault()
    if (this.graph.isReplayMode()) return
    this.cancelBlankMenu()
    this.lastBlankRightClick = 0
    this.blankMenuActive = false
    const node = this.adapter.findNode(view.model.id as string)
    if (!node) return
    this.prepareSelection(node)
    const client = this.clientPoint(evt, x, y)
    this.contextMenu.open(client.x, client.y, { target: 'node', node })
  }

  private onLinkContextMenu = (view: dia.LinkView, evt: dia.Event, x: number, y: number) => {
    evt.preventDefault()
    if (this.graph.isReplayMode()) return
    this.cancelBlankMenu()
    this.lastBlankRightClick = 0
    this.blankMenuActive = false
    const link = this.adapter.findLink(view.model.id as string)
    if (!link) return
    this.prepareSelection(link)
    const client = this.clientPoint(evt, x, y)
    this.contextMenu.open(client.x, client.y, { target: 'link', link })
  }

  private onPointerDown = (evt: PointerEvent) => {
    if (evt.button === 2 && this.graph.canGoBack()) {
      const target = evt.target as Element | null
      const overCell = Boolean(target?.closest?.('.joint-element, .joint-link'))
      const insideMenu = Boolean(target?.closest?.('.bpgraph-context'))
      const insideOtherOverlay = Boolean(target?.closest?.('.bpgraph-overlay')) && !insideMenu
      // The first click must be on blank space; the second may land on blank space or an open menu.
      // Do not require a second contextmenu; macOS may delay or coalesce it.
      if (!overCell && !insideOtherOverlay) {
        const now = Date.now()
        if (now - this.lastRightPointerDown <= DOUBLE_CLICK_WINDOW_MS) {
          this.goBackFromContextMenu()
          return
        }
        this.lastRightPointerDown = now
      } else {
        this.lastRightPointerDown = 0
      }
    }
    this.cancelBlankMenu()
    // Left clicks cancel pending menus; right clicks retain timestamps for double-click detection.
    if (evt.button !== 2) {
      this.lastRightPointerDown = 0
      this.lastBlankRightClick = 0
      this.blankMenuActive = false
    }
    if (!this.palette.isOpen() && !this.contextMenu.isOpen() && !this.executionPreview.isOpen()) return
    if (this.overlay.root.contains(evt.target as Node)) return
    this.close()
  }

  /**
   * Suppress native menus during container capture because overlays and controls may stop bubbling.
   * Support slower double-clicks: the second right click can return even with an open menu.
   */
  private onContextMenu = (evt: MouseEvent) => {
    evt.preventDefault()
    if (Date.now() <= this.suppressContextMenuUntil) {
      this.suppressContextMenuUntil = 0
      this.cancelBlankMenu()
      this.blankMenuActive = false
      this.lastBlankRightClick = 0
      this.contextMenu.close()
      evt.stopPropagation()
      return
    }
    if (
      this.contextMenu.isOpen() &&
      this.blankMenuActive &&
      this.graph.canGoBack() &&
      Date.now() - this.lastBlankRightClick <= DOUBLE_CLICK_WINDOW_MS
    ) {
      evt.stopPropagation()
      this.goBackFromContextMenu()
    }
  }

  private onNodeClick = (node: NodeInstanceType, evt: MouseEvent) => {
    const target = evt.target
    // node:click precedes selection notifications; control clicks may select without opening panels.
    if (evt.button !== 0 || (target instanceof Element && target.closest(NODE_CONTROL_SELECTOR))) {
      this.autoOpenPanel = false
      this.clickedContainerNode = null
      // Control interactions also cancel any pending panel opening.
      this.cancelPendingPanel()
      return
    }
    // Only initial container panel opening waits to avoid flicker when double-clicking subgraphs.
    // An already open panel updates immediately when selection changes.
    this.clickedContainerNode = this.isContainerNode(node) ? node : null
  }

  private onNodeDoubleClick = (node: NodeInstanceType) => {
    if (!this.isContainerNode(node)) return
    // External subgraphs open asynchronously; do not rely on selection clearing or subgraph:enter to close panels.
    this.clickedContainerNode = null
    this.cancelPendingPanel()
    this.panel.setNode(null)
  }

  private onViewportChange = () => this.close()

  private onNodeEnter = (node: NodeInstanceType | undefined) => {
    // Show node data only in hover cards, without changing debug panel content.
    if (!node) return
    const view = this.paper.findViewByModel(node.id)
    if (view) this.executionPreview.open(node, view.el)
  }

  private onNodeLeave = (node: NodeInstanceType | undefined) => {
    if (!node) return
    this.executionPreview.leave(node)
  }

  /** Entering a subgraph replaces canvas content, so cancel pending panels. */
  private onSubgraphEnter = () => {
    this.cancelPendingPanel()
    this.executionPreview.close()
  }

  private onKeyDown = (evt: KeyboardEvent) => {
    if (evt.key !== 'Escape') return
    const overlayOpen =
      this.palette.isOpen() ||
      this.contextMenu.isOpen() ||
      this.executionPreview.isOpen() ||
      this.debugPanel.isOpen()
    if (overlayOpen) {
      evt.stopPropagation()
      this.close()
      this.debugPanel.close()
      return
    }
    // Esc exits replay before handling subgraph navigation.
    if (this.graph.isReplayMode()) {
      evt.stopPropagation()
      this.graph.exitReplay()
      return
    }
    // Without overlays, Esc returns one level; leave main-graph handling to the host.
    if (!this.graph.canGoBack()) return
    evt.stopPropagation()
    evt.preventDefault()
    this.cancelBlankMenu()
    this.lastBlankRightClick = 0
    this.blankMenuActive = false
    this.graph.goBack()
  }

  private onSelectionChanged = (selection: Array<NodeInstanceType | LinkInstanceType>) => {
    if (this.graph.isReplayMode()) {
      this.cancelPendingPanel()
      this.panel.setNode(null)
      return
    }
    // Treat pending panels as open so selecting another node does not cancel its new opening.
    const panelOpen = this.panel.isOpen()
    const showPanel = panelOpen || this.autoOpenPanel || this.pendingPanelNode !== null
    // Preserve panel visibility intent while selected; clearing selection permits automatic opening again.
    this.autoOpenPanel = selection.length === 0
    if (!this.nodePanelOptions || !showPanel) {
      this.cancelPendingPanel()
      this.panel.setNode(null)
      return
    }
    const nodes = selection.filter((item): item is NodeInstanceType => {
      return this.adapter.findNode(item.id ?? '') === item
    })
    const node = nodes.length === 1 ? nodes[0] : null
    const clicked = this.clickedContainerNode
    this.clickedContainerNode = null
    if (node && clicked && clicked.id === node.id && !panelOpen) {
      // Delay initial container panel opening briefly to avoid flashing before subgraph entry.
      // Open panels bypass the delay and render newly selected nodes immediately.
      this.schedulePendingPanel(node)
      return
    }
    this.cancelPendingPanel()
    this.panel.setNode(node)
  }

  /** Containers include embedded subgraphs and external references opened by the host. */
  private isContainerNode(node: NodeInstanceType) {
    return Boolean(node.subgraphId && (node.type === 'subgraph' || this.graph.model.hasSubgraph(node.subgraphId)))
  }

  /** Delay container panel opening; subgraph double-click cancels it first. */
  private schedulePendingPanel(node: NodeInstanceType) {
    this.cancelPendingPanel()
    this.pendingPanelNode = node
    this.pendingPanelTimer = setTimeout(() => {
      this.pendingPanelTimer = null
      this.pendingPanelNode = null
      // Do not open if selection or subgraph changed while waiting.
      if (!this.adapter.selection.has(node)) return
      this.panel.setNode(node)
    }, CONTAINER_PANEL_DELAY_MS)
  }

  /** Cancel pending panel opening. */
  private cancelPendingPanel() {
    if (this.pendingPanelTimer !== null) {
      clearTimeout(this.pendingPanelTimer)
      this.pendingPanelTimer = null
    }
    this.pendingPanelNode = null
  }

  /** Select an unselected element before opening its menu so delete/copy target it. */
  private prepareSelection(item: NodeInstanceType | LinkInstanceType) {
    this.autoOpenPanel = false
    if (this.graph.selection.has(item)) return
    this.adapter.clearSelection()
    this.adapter.select(item)
    this.adapter.selectionChanged()
  }

  // ---- Replay state -----------------------------------------------------

  private onReplayChanged = (replaying: boolean, label: string) => {
    this.syncReplayState(replaying, label)
  }

  private syncReplayState(replaying: boolean, label: string) {
    if (this.replayActive === replaying) {
      if (replaying) this.replayBanner.show(label)
      return
    }
    this.replayActive = replaying
    if (replaying) {
      this.previousInteractive = this.paper.options.interactive ?? true
      // Replay is read-only: disable node dragging and linking, retaining pan, zoom, and hover.
      this.paper.options.interactive = false
      this.paper.el.setAttribute('data-replay', 'true')
      this.close()
      this.cancelPendingPanel()
      this.panel.setNode(null)
      this.replayBanner.show(label)
    } else {
      this.paper.options.interactive = this.previousInteractive
      this.paper.el.removeAttribute('data-replay')
      this.replayBanner.hide()
    }
    this.toolbar.refresh()
  }

  // ---- Panel layout -----------------------------------------------------

  private onDebugPanelVisibility = () => {
    this.syncPanelLayout()
    this.toolbar.refresh()
  }

  /** Shift node panels left when the debug panel occupies the right side. */
  private syncPanelLayout() {
    this.panel.setOffset(this.debugPanel.isOpen() ? this.debugPanel.width + 8 : 0)
  }

  // ---- Configuration ----------------------------------------------------

  private get paletteOptions(): PaletteOptions | null {
    const value = this.graph.options.palette
    return value === false ? null : typeof value === 'object' ? value : {}
  }

  private get contextMenuOptions(): ContextMenuOptions | null {
    const value = this.graph.options.contextMenu
    return value === false ? null : typeof value === 'object' ? value : {}
  }

  private get nodePanelOptions(): NodePanelOptions | null {
    const value = this.graph.options.nodePanel
    return value === false ? null : typeof value === 'object' ? value : {}
  }

  private get debugPanelOptions(): DebugPanelOptions | null {
    const value = this.graph.options.debugPanel
    if (value === undefined || value === false) return null
    return value === true ? {} : value
  }

  private get toolbarOptions(): ToolbarOptions | null {
    const value = this.graph.options.toolbar
    // Explicitly disabling the toolbar hides debug toggles; unspecified toolbars use default positioning.
    if (value === false) return null
    if (value === undefined || value === true) return { actions: [] }
    return value
  }

  private clientPoint(evt: dia.Event, x: number, y: number) {
    const rect = (this.paper.el as HTMLElement).getBoundingClientRect()
    return { x: evt.clientX ?? rect.left + x, y: evt.clientY ?? rect.top + y }
  }
}
