import type { dia } from '@joint/core'
import type { Graph, LinkEnds, LinkInstanceType, NodeInstanceType } from '../Graph'
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
import { PortTooltip } from './components/PortTooltip'
import { NodeFloatingBar, pickQuickAddPort } from './components/NodeFloatingBar'
import { NodeWidgetBar } from './components/NodeWidgetBar'
import { resolveSourcePort, type ConnectionSource } from './connectionTargets'
import { COMPACT_UI_WIDTH, UI_GAP } from './layout'
import type {
  CanvasGraph,
  ContextMenuOptions,
  DebugPanelOptions,
  NodeFloatingBarOptions,
  NodePanelOptions,
  NodeWidgetsOptions,
  PaletteOptions,
  ToolbarOptions,
} from './types'

/** Double-click window covering adjustable system double-click speeds. */
const DOUBLE_CLICK_WINDOW_MS = 800
/** Wait for a second right click inside subgraphs before showing context menus. */
const BLANK_MENU_DELAY_MS = 300
/** Ignore endpoint/port presses that did not become a drag. */
const LINK_DROP_MIN_DISTANCE = 5

interface LinkDragState {
  client: { x: number; y: number }
  endpoint?: 'source' | 'target'
  linkId?: string
  before?: LinkEnds
}

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
  private compact = false
  private resizeObserver: ResizeObserver | null = null
  private previousInteractive: dia.Paper.Options['interactive'] = true
  private readonly palette: Palette
  private readonly contextMenu: ContextMenu
  private readonly executionEffects: ExecutionEffects
  private readonly executionPreview: NodeExecutionPreview
  private readonly portTooltip: PortTooltip
  private readonly nodeFloatingBar: NodeFloatingBar
  private readonly nodeWidgetBar: NodeWidgetBar
  private lastBlankRightClick = 0
  /** Latest blank right-button pointerdown, allowing double-click detection despite delayed contextmenu. */
  private lastRightPointerDown = 0
  private blankMenuTimer: ReturnType<typeof setTimeout> | null = null
  /** Whether a blank context menu is pending or open, for detecting the second click. */
  private blankMenuActive = false
  /** Suppress late contextmenu events briefly after right-button double-click navigation. */
  private suppressContextMenuUntil = 0
  /** Active link/port drag, including endpoint-handle drags on selected links. */
  private linkDrag: LinkDragState | null = null

  constructor(graph: Graph, adapter: GraphAdapter, paper: dia.Paper) {
    this.graph = graph as unknown as CanvasGraph
    this.adapter = adapter
    this.paper = paper
    this.overlay = new OverlayLayer(paper.el as HTMLElement, this.graph.options.theme ?? 'dark')
    this.replayBanner = new ReplayBanner(
      this.overlay,
      () => this.graph.exitReplay(),
      () => this.graph.options.language,
      this.graph
    )
    this.executionEffects = new ExecutionEffects(this.overlay)
    this.executionPreview = new NodeExecutionPreview(this.graph, this.overlay)
    this.portTooltip = new PortTooltip(this.overlay, this.graph)
    this.nodeWidgetBar = new NodeWidgetBar(
      this.graph,
      paper,
      this.overlay,
      () => this.nodeWidgetsOptions,
      (node, direction) => this.openQuickAddFromNode(node, direction)
    )
    this.nodeFloatingBar = new NodeFloatingBar(
      this.graph,
      paper,
      this.overlay,
      () => this.nodeFloatingBarOptions,
      {
        openQuickAdd: (node, direction, triggerEl) => this.openQuickAddFromNode(node, direction, triggerEl),
        inspectNode: (node) => {
          this.prepareSelection(node)
          this.openNodePanel()
        },
        selectOnly: (node) => this.prepareSelection(node),
        canToggleWidgets: (node) => this.nodeWidgetBar.hasWidgetsFor(node),
        isWidgetsOpen: (node) => this.nodeWidgetBar.isOpenFor(node),
        openWidgets: (node) => this.nodeWidgetBar.openFor(node),
        closeWidgets: () => this.nodeWidgetBar.close(),
        toggleWidgets: (node) => this.nodeWidgetBar.toggleFor(node),
      }
    )
    this.refreshExecutionStatus()
    // Create the panels before the toolbar so initial visibility and pressed states match.
    this.debugPanel = new DebugPanel(this.graph, this.overlay, () => this.debugPanelOptions, this.onDebugPanelVisibility)
    this.panel = new NodePanel(
      this.graph,
      this.overlay,
      () => this.nodePanelOptions,
      this.onNodePanelVisibility,
      this.locateNode
    )
    this.syncNodePanelSelection()
    this.toolbar = new Toolbar(this.graph, this.overlay, () => this.toolbarOptions, {
      node: {
        available: () => this.nodePanelOptions !== null,
        open: () => this.panel.isOpen(),
        toggle: () => this.toggleNodePanel(),
      },
      debug: {
        available: () => this.debugPanelOptions !== null,
        open: () => this.debugPanel.isOpen(),
        toggle: () => this.toggleDebugPanel(),
      },
    })
    this.zoomControls = new ZoomControls(this.graph, paper, this.overlay)
    this.minimap = new Minimap(this.graph, paper, this.overlay)
    this.syncLayout()
    this.observeLayout()
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
      this.debugPanel, this.replayBanner, this.palette, this.contextMenu, this.executionPreview,
      this.nodeFloatingBar, this.nodeWidgetBar]) {
      component.refreshLanguage()
    }
    // Port labels come from the application, so a language refresh may rebuild
    // the ports under the pointer; drop the card instead of showing stale text.
    this.portTooltip.hide()
  }

  refreshTheme() {
    this.overlay.setTheme(this.graph.options.theme ?? 'dark')
  }

  /** Re-evaluate every UI control after `ui` slots or floating widget options change. */
  refreshAll() {
    this.refreshTheme()
    this.toolbar.refresh()
    this.zoomControls.refresh()
    this.minimap.refresh()
    this.panel.refresh()
    this.debugPanel.refresh()
    this.replayBanner.refresh()
    this.palette.refresh()
    this.contextMenu.refresh()
    this.portTooltip.refresh()
    this.executionPreview.refresh()
    this.nodeFloatingBar.refresh()
    this.nodeWidgetBar.refresh()
    this.syncPanelLayout()
  }

  refreshToolbar() {
    this.toolbar.refresh()
  }

  refreshExecutionStatus() {
    const status = this.graph.executionStatus ?? 'idle'
    this.paper.el.setAttribute('data-execution-status', status)
    this.executionEffects.refresh(status)
    this.executionPreview.refresh()
    this.nodeFloatingBar.refresh()
  }

  refreshNodeExecutionPreview(nodeId: string) {
    this.executionPreview.refresh(nodeId)
    this.panel.refreshExecution(nodeId)
  }

  isDebugPanelOpen() {
    return this.debugPanel.isOpen()
  }

  openDebugPanel() {
    if (this.compact && this.panel.isOpen()) this.panel.close()
    this.debugPanel.open()
  }

  closeDebugPanel() {
    this.debugPanel.close()
  }

  toggleDebugPanel() {
    if (!this.debugPanel.isOpen() && this.compact && this.panel.isOpen()) this.panel.close()
    this.debugPanel.toggle()
  }

  refreshDebugPanel() {
    this.debugPanel.refresh()
    this.syncPanelLayout()
  }

  isNodePanelOpen() {
    return this.panel.isOpen()
  }

  openNodePanel() {
    // Replay data is read-only; do not expose editable node settings there.
    if (this.graph.isReplayMode()) return
    if (this.compact && this.debugPanel.isOpen()) this.debugPanel.close()
    this.panel.open()
  }

  closeNodePanel() {
    this.panel.close()
  }

  toggleNodePanel() {
    if (this.graph.isReplayMode()) return
    if (!this.panel.isOpen() && this.compact && this.debugPanel.isOpen()) this.debugPanel.close()
    this.panel.toggle()
  }

  refreshNodePanel() {
    this.panel.refresh()
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
    this.portTooltip.hide()
    this.nodeFloatingBar.clear()
    this.nodeWidgetBar.close()
  }

  destroy() {
    this.cancelBlankMenu()
    this.lastBlankRightClick = 0
    this.lastRightPointerDown = 0
    this.blankMenuActive = false
    this.suppressContextMenuUntil = 0
    this.linkDrag = null
    this.unbind()
    this.resizeObserver?.disconnect()
    this.resizeObserver = null
    ;(this.paper.el as HTMLElement).removeAttribute('data-bpgraph-compact')
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
    this.portTooltip.destroy()
    this.nodeFloatingBar.destroy()
    this.nodeWidgetBar.destroy()
    this.paper.el.removeAttribute('data-execution-status')
    this.paper.el.removeAttribute('data-pf-theme')
    ;(this.paper.el as HTMLElement).style.removeProperty('--bpgraph-right-inset')
    this.overlay.dispose()
  }

  // ---- Lifecycle --------------------------------------------------------

  private bind() {
    this.paper.on('blank:pointerdblclick', this.onBlankDoubleClick)
    this.paper.on('blank:contextmenu', this.onBlankContextMenu)
    this.paper.on('element:contextmenu', this.onElementContextMenu)
    this.paper.on('link:contextmenu', this.onLinkContextMenu)
    this.paper.on('link:pointerdown', this.onLinkPointerDown)
    this.paper.on('link:pointerup', this.onLinkPointerUp)
    ;(this.paper.el as HTMLElement).addEventListener('pointerdown', this.onPointerDown, true)
    ;(this.paper.el as HTMLElement).addEventListener('contextmenu', this.onContextMenu, true)
    ;(this.paper.el as HTMLElement).addEventListener('mouseover', this.onPortEnter)
    ;(this.paper.el as HTMLElement).addEventListener('mouseout', this.onPortLeave)
    document.addEventListener('keydown', this.onKeyDown)
    this.graph.on('viewport:change', this.onViewportChange)
    this.graph.on('selection:changed', this.onSelectionChanged)
    this.graph.on('node:mouseenter', this.onNodeEnter)
    this.graph.on('node:mouseleave', this.onNodeLeave)
    this.graph.on('node:removed', this.onNodeRemoved)
    this.graph.on('subgraph:enter', this.onSubgraphEnter)
    this.graph.on('subgraph:exit', this.onSubgraphExit)
    this.graph.on('replay:changed', this.onReplayChanged)
  }

  private unbind() {
    this.paper.off('blank:pointerdblclick', this.onBlankDoubleClick)
    this.paper.off('blank:contextmenu', this.onBlankContextMenu)
    this.paper.off('element:contextmenu', this.onElementContextMenu)
    this.paper.off('link:contextmenu', this.onLinkContextMenu)
    this.paper.off('link:pointerdown', this.onLinkPointerDown)
    this.paper.off('link:pointerup', this.onLinkPointerUp)
    ;(this.paper.el as HTMLElement).removeEventListener('pointerdown', this.onPointerDown, true)
    ;(this.paper.el as HTMLElement).removeEventListener('contextmenu', this.onContextMenu, true)
    ;(this.paper.el as HTMLElement).removeEventListener('mouseover', this.onPortEnter)
    ;(this.paper.el as HTMLElement).removeEventListener('mouseout', this.onPortLeave)
    document.removeEventListener('keydown', this.onKeyDown)
    this.graph.off('viewport:change', this.onViewportChange)
    this.graph.off('selection:changed', this.onSelectionChanged)
    this.graph.off('node:mouseenter', this.onNodeEnter)
    this.graph.off('node:mouseleave', this.onNodeLeave)
    this.graph.off('node:removed', this.onNodeRemoved)
    this.graph.off('subgraph:enter', this.onSubgraphEnter)
    this.graph.off('subgraph:exit', this.onSubgraphExit)
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

  private onLinkPointerDown = (linkView: dia.LinkView, evt: dia.Event, x: number, y: number) => {
    const target = evt.target as Element | null
    const endpoint: LinkDragState['endpoint'] = target?.closest?.('.target-arrowhead')
      ? 'target'
      : target?.closest?.('.source-arrowhead')
        ? 'source'
        : undefined
    const link = this.graph.findLink(String(linkView.model.id))
    this.linkDrag = {
      client: this.clientPoint(evt, x, y),
      endpoint,
      linkId: link?.id,
      before: link
        ? { source: { ...link.source }, target: { ...link.target } }
        : undefined,
    }
  }

  private onLinkPointerUp = (linkView: dia.LinkView, evt: dia.Event, x: number, y: number) => {
    const drag = this.linkDrag
    this.linkDrag = null
    if (!drag || this.graph.isReplayMode()) return
    const client = this.clientPoint(evt, x, y)
    if (Math.hypot(client.x - drag.client.x, client.y - drag.client.y) < LINK_DROP_MIN_DISTANCE) return

    if (drag.endpoint) {
      this.openReplacementPalette(linkView, evt, drag, client)
      return
    }

    // A linked cell means the drag connected or touched an existing link.
    if (this.paper.model.getCell(linkView.model.id)) return
    const source = linkView.model.get('source') as { id?: string; port?: string } | undefined
    if (!source?.id || !source.port) return
    const node = this.graph.findNode(String(source.id))
    const resolved = node ? resolveSourcePort(node, String(source.port)) : null
    if (!node || !resolved) return
    if (!this.paletteOptions || this.paletteOptions.connectOnDrop === false) return
    const target = linkView.model.get('target') as { id?: string; x?: number; y?: number } | undefined
    if (target?.id) return
    const point =
      typeof target?.x === 'number' && typeof target?.y === 'number'
        ? { x: target.x, y: target.y }
        : this.paper.clientToLocalPoint(client.x, client.y)
    const stroke = linkView.model.attr('line/stroke')
    const strokeWidth = linkView.model.attr('line/strokeWidth')
    const pendingLinkId = this.adapter.createPendingLink(
      { id: String(source.id), port: String(source.port) },
      point,
      {
        ...(typeof stroke === 'string' ? { stroke } : {}),
        ...(typeof strokeWidth === 'number' ? { strokeWidth } : {}),
      }
    )
    this.openConnectionPalette(
      { node, port: resolved.port, direction: resolved.direction },
      undefined,
      client,
      pendingLinkId
    )
  }

  /** Re-route an existing link: drop the endpoint on blank space to choose a new node. */
  private openReplacementPalette(
    linkView: dia.LinkView,
    evt: dia.Event,
    drag: LinkDragState,
    client: { x: number; y: number }
  ) {
    const link = drag.linkId ? this.graph.findLink(drag.linkId) : undefined
    if (!link) return
    // `magnetUnderPointer` is set only when the drop passed validateConnection.
    const data = linkView.eventData(evt) as { magnetUnderPointer?: Element | null } | undefined
    if (data?.magnetUnderPointer) return
    if (
      drag.before &&
      (drag.before.source.id !== link.source.id || drag.before.source.port !== link.source.port ||
        drag.before.target.id !== link.target.id || drag.before.target.port !== link.target.port)
    ) {
      return
    }
    const remaining = drag.endpoint === 'target' ? link.source : link.target
    const node = this.graph.findNode(remaining.id)
    const resolved = node ? resolveSourcePort(node, remaining.port) : null
    if (!node || !resolved) return
    if (!this.paletteOptions || this.paletteOptions.connectOnDrop === false) return
    this.openConnectionPalette(
      { node, port: resolved.port, direction: resolved.direction },
      link,
      client
    )
  }

  private openConnectionPalette(
    source: ConnectionSource,
    replaceLink: LinkInstanceType | undefined,
    client: { x: number; y: number },
    pendingLinkId?: string
  ) {
    this.cancelBlankMenu()
    this.lastBlankRightClick = 0
    this.lastRightPointerDown = 0
    this.blankMenuActive = false
    this.contextMenu.close()
    this.executionPreview.close()
    this.portTooltip.hide()
    this.palette.openForConnection({
      source,
      replaceLink,
      pendingLinkId,
      clientX: client.x,
      clientY: client.y,
    })
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
    this.portTooltip.hide()
    // The connection palette is modal; outside presses must not close or edit the canvas.
    if (this.palette.isConnectionMode()) return
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

  private onViewportChange = () => this.close()

  private onPortEnter = (evt: MouseEvent) => {
    this.portTooltip.enter(evt.target as Element | null)
  }

  private onPortLeave = (evt: MouseEvent) => {
    this.portTooltip.leave(evt.target as Element | null, evt.relatedTarget as Element | null)
  }

  private onNodeRemoved = () => {
    this.executionPreview.close()
    this.portTooltip.hide()
    this.nodeFloatingBar.clear()
    this.nodeWidgetBar.refresh()
  }

  private onNodeEnter = (node: NodeInstanceType | undefined) => {
    if (!node) return
    const view = this.paper.findViewByModel(node.id)
    if (view) this.executionPreview.open(node, view.el)
    this.nodeFloatingBar.enterNode(node)
  }

  private onNodeLeave = (node: NodeInstanceType | undefined) => {
    if (!node) return
    this.executionPreview.leave(node)
    this.nodeFloatingBar.leaveNode(node)
  }

  /** Entering a subgraph replaces canvas content, so the previous selection no longer applies. */
  private onSubgraphEnter = () => {
    this.palette.close()
    this.panel.setNode(null)
    this.nodeFloatingBar.setSelectedNode(null)
    this.nodeFloatingBar.clear()
    this.nodeWidgetBar.setNode(null)
    this.executionPreview.close()
    this.portTooltip.hide()
  }

  /** Leaving a subgraph restores another graph, so clear the previous node until selection changes. */
  private onSubgraphExit = () => {
    this.palette.close()
    this.panel.setNode(null)
    this.nodeFloatingBar.setSelectedNode(null)
    this.nodeFloatingBar.clear()
    this.nodeWidgetBar.setNode(null)
    this.executionPreview.close()
    this.portTooltip.hide()
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
      this.panel.setNode(null)
      this.nodeFloatingBar.setSelectedNode(null)
      this.nodeWidgetBar.setNode(null)
      return
    }
    this.syncNodePanelSelection(selection)
  }

  /** Show a single selected node; any other selection falls back to the overview. */
  private syncNodePanelSelection(selection: Array<NodeInstanceType | LinkInstanceType> = Array.from(this.adapter.selection)) {
    const nodes = selection.filter((item): item is NodeInstanceType => {
      return this.adapter.findNode(item.id ?? '') === item
    })
    const single = nodes.length === 1 ? nodes[0] : null
    this.panel.setNode(single)
    this.nodeWidgetBar.setNode(single)
    this.nodeFloatingBar.setSelectedNode(single)
  }

  /** Open the filtered connection palette from a node's quick-add `+` button. */
  private openQuickAddFromNode(node: NodeInstanceType, direction: 'in' | 'out', triggerEl?: HTMLElement) {
    if (this.graph.isReplayMode() || !this.paletteOptions) return
    const port = pickQuickAddPort(node, direction)
    if (!port?.id) {
      this.openPalette()
      return
    }
    const view = this.paper.findViewByModel(node.id)
    const rect = (triggerEl ?? view?.el)?.getBoundingClientRect()
    const bounds = this.overlay.rect()
    const offset = direction === 'out' ? 160 : -160
    const clientX = rect
      ? Math.max(bounds.left + 40, Math.min(rect.left + rect.width / 2 + offset, bounds.right - 40))
      : bounds.left + bounds.width / 2
    const clientY = rect ? rect.top + rect.height / 2 : bounds.top + bounds.height / 2
    const localPoint = this.paper.clientToLocalPoint(clientX, clientY)
    const pendingLinkId = this.adapter.createPendingLink(
      { id: node.id, port: port.id },
      localPoint
    )
    this.openConnectionPalette(
      { node, port, direction },
      undefined,
      { x: clientX, y: clientY },
      pendingLinkId
    )
  }

  /** Select one overview node and center the viewport on it. */
  private locateNode = (node: NodeInstanceType) => {
    if (this.graph.selection.size !== 1 || !this.graph.selection.has(node)) {
      this.adapter.clearSelection()
      this.adapter.select(node)
      this.adapter.selectionChanged()
    }
    this.centerViewportOnNode(node)
  }

  private centerViewportOnNode(node: NodeInstanceType) {
    const size = this.adapter.getNodeSize(node.id)
    const rect = (this.paper.el as HTMLElement).getBoundingClientRect()
    if (!size || rect.width === 0 || rect.height === 0) return
    const scale = this.graph.scale
    this.graph.position = {
      x: rect.width / 2 - (node.position.x + size.width / 2) * scale,
      y: rect.height / 2 - (node.position.y + size.height / 2) * scale,
    }
    this.graph.emit('viewport:change', { ...this.graph.position, scale })
  }

  /** Select an unselected element before opening its menu so delete/copy target it. */
  private prepareSelection(item: NodeInstanceType | LinkInstanceType) {
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
      this.linkDrag = null
      this.previousInteractive = this.paper.options.interactive ?? true
      // Replay is read-only: disable node dragging and linking, retaining pan, zoom, and hover.
      this.paper.options.interactive = false
      this.paper.el.setAttribute('data-replay', 'true')
      this.close()
      // The node panel exposes editable settings, which replay data does not allow.
      this.panel.close()
      this.panel.setNode(null)
      this.nodeFloatingBar.setSelectedNode(null)
      this.nodeFloatingBar.clear()
      this.nodeWidgetBar.setNode(null)
      this.replayBanner.show(label)
    } else {
      this.paper.options.interactive = this.previousInteractive
      this.paper.el.removeAttribute('data-replay')
      this.replayBanner.hide()
      this.nodeFloatingBar.refresh()
      this.nodeWidgetBar.refresh()
    }
    this.adapter.refreshLinkEndpointTools()
    this.toolbar.refresh()
  }

  // ---- Panel layout -----------------------------------------------------

  private onDebugPanelVisibility = () => {
    this.syncPanelLayout()
    this.toolbar.refresh()
  }

  private onNodePanelVisibility = () => {
    this.syncPanelLayout()
    this.toolbar.refresh()
  }

  private observeLayout() {
    if (typeof ResizeObserver !== 'function') return
    this.resizeObserver = new ResizeObserver(() => this.syncLayout())
    this.resizeObserver.observe(this.paper.el as HTMLElement)
  }

  private syncLayout() {
    const container = this.paper.el as HTMLElement
    const width = container.clientWidth || container.getBoundingClientRect().width
    const compact = width > 0 && width < COMPACT_UI_WIDTH
    if (compact !== this.compact) this.setCompact(compact)
    this.syncPanelLayout()
  }

  private setCompact(compact: boolean) {
    this.compact = compact
    const container = this.paper.el as HTMLElement
    if (compact) container.setAttribute('data-bpgraph-compact', 'true')
    else container.removeAttribute('data-bpgraph-compact')
    this.panel.setCompact(compact)
    this.debugPanel.setCompact(compact)
    // Compact sheets are full width, so two side panels cannot stay open together.
    if (compact && this.panel.isOpen() && this.debugPanel.isOpen()) this.debugPanel.close()
  }

  /**
   * Shift the node panel left when the debug panel occupies the right side, then
   * reserve the measured width of the rightmost panels for the toolbar.
   */
  private syncPanelLayout() {
    const nodeOpen = this.panel.isOpen()
    const debugOpen = this.debugPanel.isOpen()
    const offset = !this.compact && debugOpen ? this.debugPanel.width + UI_GAP : 0
    this.panel.setOffset(offset)
    if (this.compact) {
      this.toolbar.setRightInset(0)
      this.zoomControls.setRightInset(0)
      ;(this.paper.el as HTMLElement).style.setProperty('--bpgraph-right-inset', '0px')
      this.overlay.root.style.setProperty('--bpgraph-right-inset', '0px')
      return
    }
    const rootRect = this.overlay.rect()
    const nodeRect = this.overlay.root.querySelector<HTMLElement>('.bpgraph-node-panel')?.getBoundingClientRect()
    const debugRect = this.overlay.root.querySelector<HTMLElement>('.bpgraph-debug-panel')?.getBoundingClientRect()
    const measurable = rootRect.width > 0
    const nodeInset = measurable && nodeRect && nodeRect.width > 0
      ? rootRect.right - nodeRect.left
      : nodeOpen ? UI_GAP + offset + this.panel.width : 0
    const debugInset = measurable && debugRect && debugRect.width > 0
      ? rootRect.right - debugRect.left
      : debugOpen ? UI_GAP + this.debugPanel.width : 0
    const rightInset = Math.max(nodeInset, debugInset)
    this.toolbar.setRightInset(rightInset)
    this.zoomControls.setRightInset(rightInset)
    ;(this.paper.el as HTMLElement).style.setProperty('--bpgraph-right-inset', `${rightInset}px`)
    this.overlay.root.style.setProperty('--bpgraph-right-inset', `${rightInset}px`)
  }

  // ---- Configuration ----------------------------------------------------

  private get nodeFloatingBarOptions(): NodeFloatingBarOptions | null {
    const value = this.graph.options.nodeFloatingBar
    return value === false ? null : typeof value === 'object' ? value : {}
  }

  private get nodeWidgetsOptions(): NodeWidgetsOptions | null {
    const value = this.graph.options.nodeWidgets
    return value === false ? null : typeof value === 'object' ? value : {}
  }

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
    // Explicitly disabling the toolbar hides panel toggles; unspecified toolbars use default positioning.
    if (value === false) return null
    if (value === undefined || value === true) return { actions: [] }
    return value
  }

  private clientPoint(evt: dia.Event, x: number, y: number) {
    const rect = (this.paper.el as HTMLElement).getBoundingClientRect()
    return { x: evt.clientX ?? rect.left + x, y: evt.clientY ?? rect.top + y }
  }
}
