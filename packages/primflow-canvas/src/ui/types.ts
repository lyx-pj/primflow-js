import { nothing, type TemplateResult } from 'lit-html'
import type { InputPort, NodeClassType, NodeExecutionStatus, NodeFailure, NodeOptions, NodeRetryInfo } from '@lyx-pj/primflow-model'
import type { Graph, LinkInstanceType, NodeInstanceType } from '../Graph'
import type { CanvasLanguage } from './i18n'
import type { MinimapBounds } from './minimapBounds'
import type { CanvasUIMountFn, CanvasUIMountHandle, CanvasUIMounter, CanvasUIRenderer, CanvasUISlot } from './slots'

/** Built-in visual theme preset for canvas UI primitives. */
export type CanvasTheme = 'dark' | 'light'

/** Canvas UI requires a Graph with concrete node definitions to reuse Graph.addNode overloads. */
export type CanvasGraph = Graph<Record<string, NodeClassType>>

export type CanvasExecutionStatus = 'idle' | 'running' | 'paused'

/** Temporary execution data supplied by the application, excluded from saving and undo. */
export interface NodeExecutionData {
  inputs: Record<string, unknown>
  outputs: Record<string, unknown>
  attempt?: Pick<NodeRetryInfo, 'number' | 'maxRetries' | 'remainingRetries'> & {
    failure?: Pick<NodeFailure, 'code' | 'message'>
    previousFailure?: Pick<NodeFailure, 'code' | 'message'>
  }
}

export interface PaletteItemDescription {
  /** Affects palette display only, not node titles on the canvas. */
  title?: string
  /** Defaults to Other nodes; categories follow first occurrence in the node list. */
  category?: string
  /** Description shown in palette tooltips and node panels, also searchable. */
  description?: string
  /** Icon font CSS class; the application loads the corresponding stylesheet. */
  iconClass?: string
  /** Legacy text icon option; iconClass takes precedence when both are supplied. */
  icon?: string
  keywords?: readonly string[]
}

/**
 * One application-provided palette entry.
 *
 * Unlike class-deduplicated `items`, entries may repeat the same node class.
 * For example, subgraph files share a call class but use distinct `subgraphId` defaults.
 * Each entry can supply its own title and creation defaults.
 */
export interface PaletteEntry extends PaletteItemDescription {
  nodeClass: NodeClassType
  /** Override global `defaults` for this entry. */
  defaults?: Omit<NodeOptions<NodeClassType>, 'position'>
}

export interface PaletteOptions {
  /** Open automatically on blank double-click; defaults to true. graph.openPalette() still works when disabled. */
  trigger?: boolean
  /**
   * Open the filtered add-and-connect palette when a connection drag ends outside
   * a valid port. Defaults to true; the palette must still be enabled.
   */
  connectOnDrop?: boolean
  /** Draggable nodes; defaults to all registered nodes. */
  items?: (graph: CanvasGraph) => NodeClassType[]
  /** Application-provided categories, descriptions, and search keywords; optional for registry-based use. */
  describe?: (nodeClass: NodeClassType, graph: CanvasGraph) => PaletteItemDescription | undefined
  /**
   * Inject business defaults when creating nodes, such as a default prompt.
   * Keep business defaults in application callbacks rather than the registry.
   */
  defaults?: (nodeClass: NodeClassType, graph: CanvasGraph) => Omit<NodeOptions<NodeClassType>, 'position'> | void
  /**
   * Append entries beyond `items`, allowing multiple instances per class such as subgraph files.
   * Entry defaults take precedence over global `defaults`.
   */
  entries?: (graph: CanvasGraph) => PaletteEntry[]
}

export interface ContextMenuContext {
  graph: CanvasGraph
  target: 'blank' | 'node' | 'link'
  node?: NodeInstanceType
  link?: LinkInstanceType
  clientX: number
  clientY: number
}

export interface ContextMenuItem {
  id: string
  label: string
  shortcut?: string
  /** Custom icon font class; the application loads its CSS. */
  iconClass?: string
  /** Show a separator before this item, except when it is first. */
  separatorBefore?: boolean
  disabled?: boolean
  danger?: boolean
  run: (context: ContextMenuContext) => void
}

export interface ContextMenuOptions {
  /** Override icons by menu item id; use built-in SVG icons by default. */
  icons?: Record<string, string>
  /** Return custom menu items; an empty array hides the menu. Defaults to built-in items. */
  items?: (context: ContextMenuContext) => ContextMenuItem[] | void
}

/** Built-in node panel sections. */
export type PanelSectionId =
  | 'meta'
  | 'extra'
  | 'loopLimits'
  | 'inputs'
  | 'outputs'
  | 'retry'
  | 'description'
  | 'execution'
  | 'progress'

export interface PanelSectionContext {
  graph: CanvasGraph
  node: NodeInstanceType
}

/** Context passed to a panel-wide renderer. */
export interface PanelRenderContext {
  graph: CanvasGraph
  node: NodeInstanceType
  /** Close the panel, leaving the selection unchanged. */
  close: () => void
  /** Active canvas language, for content that mixes built-in and application copy. */
  language?: CanvasLanguage
}

/** Context passed to the overview renderer shown without a single node. */
export interface PanelOverviewContext {
  graph: CanvasGraph
  /** Close the panel, leaving the selection unchanged. */
  close: () => void
  /** Center the viewport on a node and make it the single selection. */
  locateNode: (node: NodeInstanceType) => void
  /** Active canvas language, for content that mixes built-in and application copy. */
  language?: CanvasLanguage
}

/** Context passed to the Global settings renderer. */
export interface PanelGlobalSettingsContext {
  graph: CanvasGraph
  /** Close the panel, leaving the selection unchanged. */
  close: () => void
  /** Active canvas language, for content that mixes built-in and application copy. */
  language?: CanvasLanguage
}

/**
 * One node panel section.
 *
 * A built-in id renders the default section. An object renders application
 * content instead, without a wrapper, so the application controls the markup.
 */
export type PanelSection =
  | PanelSectionId
  | {
      /** Application section id, used as a stable key. */
      id: string
      render?: (context: PanelSectionContext) => TemplateResult | typeof nothing
      mount?: CanvasUIMountFn<PanelSectionContext>
    }

export interface NodePanelOptions {
  /** Panel width; defaults to 320. */
  width?: number
  /** Whether the panel starts open; defaults to true. The toolbar controls subsequent visibility. */
  open?: boolean
  /**
   * Application-specific settings, such as a node's API key.
   * Rendered between Type/ID and Inputs; evaluated once when switching nodes.
   */
  extra?: (node: NodeInstanceType, graph: CanvasGraph) => HTMLElement | string | null
  /**
   * Order and visibility of the sections in the Node tab.
   *
   * Omit a built-in id to hide that section, reorder the ids to change the
   * layout, and add objects to insert application sections. Returning an empty
   * array leaves only the panel header. Defaults to every built-in section in
   * the standard order.
   *
   * Return nothing to keep the default sections for that node, which lets an
   * application customize a single node definition.
   */
  sections?: (node: NodeInstanceType, graph: CanvasGraph) => PanelSection[] | void
  /**
   * Replace the whole Node tab content area.
   *
   * The shell is unchanged: width, position, scrolling, the header and its
   * close button, the tabs, the offset applied while the debug panel is open,
   * and the active language all still belong to the canvas. Providing `render`
   * takes precedence over `sections`, which is not called in that case.
   */
  render?: CanvasUIRenderer<PanelRenderContext> | CanvasUIMounter<PanelRenderContext>
  /**
   * Overview content shown in the Node tab when no single node is selected.
   *
   * Defaults to a list of nodes in the current view; clicking one centers the
   * viewport on it and makes it the single selection. Return nothing to leave
   * the content area empty.
   */
  overview?: CanvasUIRenderer<PanelOverviewContext> | CanvasUIMounter<PanelOverviewContext>
  /**
   * Content of the Global settings tab.
   *
   * The canvas does not define global settings itself; without a renderer the
   * tab shows an empty state.
   */
  globalSettings?: CanvasUIRenderer<PanelGlobalSettingsContext> | CanvasUIMounter<PanelGlobalSettingsContext>
}

export type DebugRecordStatus = 'waiting' | 'running' | 'paused' | 'interrupted' | 'completed' | 'failed' | 'cancelled'

/** Execution summary, usually an engine task, supplied by the application. */
export interface DebugRecord {
  id: string
  title: string
  status: DebugRecordStatus
  startedAt: number
  endedAt?: number
  /** Additional details such as errors or triggering event names. */
  detail?: string
  /** Whether replay is allowed; defaults to true. Applications may disable it while other tasks run. */
  selectable?: boolean
}

export type DebugLogLevel = 'debug' | 'info' | 'success' | 'warn' | 'error'

/**
 * Subgraph scope.
 *
 * Main graph nodes have no scope; subgraph nodes identify their owning region.
 * The panel uses scope for indentation and [subgraph name] log prefixes.
 */
export interface DebugScope {
  /** Subgraph region id. */
  subgraphId: string
  /** Subgraph name, usually the calling node's title. */
  title: string
  /** Nesting depth: main graph is 0, first subgraph is 1. */
  depth: number
}

/**
 * Debug log entry.
 *
 * One entry mirrors one engine execution-log event: the application reads the
 * engine's task trace and maps every event to an entry, so the panel shows the
 * engine's own log vocabulary instead of a separately collected stream.
 */
export interface DebugLogEntry {
  /** Event timestamp in milliseconds, taken from the engine trace. */
  time: number
  message: string
  level?: DebugLogLevel
  /** Engine trace event type, such as `activation:status` or `task:status`. */
  type?: string
  /** Node the entry belongs to; the panel resolves the display title. */
  nodeId?: string
  /** Owning subgraph; the panel prefixes messages with [subgraph name]. */
  scope?: DebugScope
  /** Engine activation id, used to correlate entries about the same node run. */
  activationId?: number
}

/** Debug panel data; call `graph.refreshDebugPanel()` after updates. */
export interface DebugPanelData {
  /** Execution records in application-supplied order. */
  records?: readonly DebugRecord[]
  /** Unified log stream, ordered by the engine trace timeline. */
  logs?: readonly DebugLogEntry[]
}

export interface DebugPanelOptions {
  /** Panel width; defaults to 340. */
  width?: number
  /** Whether to open on first mount; defaults to false. Toolbar controls subsequent visibility. */
  open?: boolean
  /** Current debug data, as a snapshot or a function evaluated for each render. */
  data?: DebugPanelData | (() => DebugPanelData)
  /** Selected execution record; synchronize when selecting records or exiting replay. */
  activeRecordId?: string | null
  /**
   * Record selection callback; a record opens its execution, null exits.
   * Active records cannot be selected, preventing live updates from replacing replay data.
   */
  onRecordSelect?: (record: DebugRecord | null) => void
}

export interface ToolbarContext {
  graph: CanvasGraph
}

export interface ToolbarAction {
  id: string
  label: string
  title?: string
  /** Icon font CSS class; when set, show only the icon and use label as its accessible name. */
  iconClass?: string
  disabled?: boolean
  /** Without a callback, canvas emits `toolbar:action` for the application. */
  run?: (context: ToolbarContext) => void
}

export interface ToolbarOptions {
  /** Application-supplied runtime description; canvas does not interpret it. */
  status?: string
  actions: ToolbarAction[] | ((graph: CanvasGraph) => ToolbarAction[])
  /** Defaults to top-center. */
  position?: 'top-left' | 'top-center' | 'top-right'
}

// ---- ComfyUI-style floating node controls ---------------------------------

export interface NodeFloatingAction {
  id: string
  label: string
  title?: string
  iconClass?: string
  /** Optional inline SVG path string (24x24 viewBox) for icon-only buttons. */
  iconPath?: string
  active?: boolean
  danger?: boolean
  disabled?: boolean
  run: (context: { graph: CanvasGraph; node: NodeInstanceType }) => void
}

export interface NodeFloatingBarOptions {
  /** Show quick-add `+` handles on node sides to add & connect upstream/downstream nodes. Defaults to true. */
  quickAdd?: boolean
  /** Preferred side for the action pill relative to the node. Defaults to 'top'. */
  placement?: 'top' | 'bottom'
  /** Override or extend the floating toolbar actions for a node. */
  actions?: (node: NodeInstanceType, graph: CanvasGraph) => NodeFloatingAction[]
}

export type NodeWidgetPlacement = 'bottom' | 'top' | 'left' | 'right'

/** Context passed to custom surrounding node widget renderers or mounters. */
export interface NodeWidgetContext {
  graph: CanvasGraph
  node: NodeInstanceType
  /** Editable, unconnected input ports on the selected node. */
  editableInputs: readonly InputPort[]
  /** Current input values of the node. */
  values: Record<string, unknown>
  /** Update one input value on the node (participates in undo history). */
  setInputValue: (name: string, value: unknown) => void
  /** Active canvas language. */
  language?: CanvasLanguage
  /** Collapse or expand the widget tray. */
  collapsed: boolean
  setCollapsed: (collapsed: boolean) => void
  /** Trigger a quick-add connection palette from this node. */
  openQuickAdd: (direction: 'in' | 'out') => void
}

export interface NodeWidgetsOptions {
  /** Preferred side around the selected node. Defaults to 'bottom'. */
  placement?: NodeWidgetPlacement
  /** Allow collapsing the surrounding widget tray. Defaults to true. */
  collapsible?: boolean
  /** Start collapsed when selecting a node. Defaults to false. */
  defaultCollapsed?: boolean
  /** Automatically render modern editors for unconnected editable input ports. Defaults to true. */
  showPortEditors?: boolean
  /** Filter which nodes display the surrounding widget tray. */
  shouldShow?: (node: NodeInstanceType, graph: CanvasGraph) => boolean
  /** Custom lit-html template rendered inside the surrounding widget tray. */
  render?: (context: NodeWidgetContext) => TemplateResult | typeof nothing | null
  /** Framework-agnostic DOM mounter (React/Vue/vanilla) for custom node widgets. */
  mount?: (container: HTMLElement, context: NodeWidgetContext) => CanvasUIMountHandle<NodeWidgetContext> | void
}

// ---- External UI slot replacement contexts --------------------------------

export interface BaseSlotContext {
  graph: CanvasGraph
  language?: CanvasLanguage
  t: (message: string, values?: Record<string, string | number>) => string
}

export interface ToolbarSlotAction extends ToolbarAction {
  pressed?: boolean
}

export interface ToolbarSlotContext extends BaseSlotContext {
  actions: readonly ToolbarSlotAction[]
  status?: string
  position: 'left' | 'center' | 'right'
  rightInset: number
  replayMode: boolean
  runAction: (action: ToolbarSlotAction) => void
}

export interface ZoomControlsSlotContext extends BaseSlotContext {
  scale: number
  percent: number
  minScale: number
  maxScale: number
  rightInset: number
  zoomIn: () => void
  zoomOut: () => void
  resetZoom: () => void
  setZoom: (scale: number) => void
  fitToNodes: () => void
}

export interface MinimapViewportRect {
  x: number
  y: number
  width: number
  height: number
}

export interface MinimapNodeSnapshot {
  id: string
  x: number
  y: number
  width: number
  height: number
  color: string
}

export interface MinimapLinkSnapshot {
  id: string
  points: ReadonlyArray<{ x: number; y: number }>
}

export interface MinimapSlotContext extends BaseSlotContext {
  bounds: MinimapBounds
  viewport: MinimapViewportRect
  nodes: readonly MinimapNodeSnapshot[]
  links: readonly MinimapLinkSnapshot[]
  centerAt: (graphX: number, graphY: number) => void
}

export interface PaletteSlotItem extends PaletteItemDescription {
  nodeClass: NodeClassType
  title: string
  category: string
}

export interface PaletteSlotContext extends BaseSlotContext {
  open: boolean
  mode: 'add' | 'connect'
  point: { x: number; y: number }
  query: string
  category: string | null
  categories: readonly string[]
  items: readonly PaletteSlotItem[]
  setQuery: (query: string) => void
  setCategory: (category: string | null) => void
  selectItem: (item: PaletteSlotItem) => void
  close: () => void
}

export interface ContextMenuSlotContext extends BaseSlotContext {
  open: boolean
  point: { x: number; y: number }
  context: ContextMenuContext | null
  items: readonly ContextMenuItem[]
  runItem: (item: ContextMenuItem) => void
  close: () => void
}

export interface NodePanelSlotContext extends BaseSlotContext {
  open: boolean
  compact: boolean
  offset: number
  width: number
  node: NodeInstanceType | null
  nodes: readonly NodeInstanceType[]
  close: () => void
  locateNode: (node: NodeInstanceType) => void
}

export interface DebugPanelSlotContext extends BaseSlotContext {
  open: boolean
  compact: boolean
  width: number
  data: Required<DebugPanelData>
  activeRecordId: string | null
  selectRecord: (record: DebugRecord | null) => void
  close: () => void
}

export interface ReplayBannerSlotContext extends BaseSlotContext {
  visible: boolean
  label: string
  exitReplay: () => void
}

export interface PortTooltipSlotContext extends BaseSlotContext {
  open: boolean
  name: string
  type: string
  side: 'left' | 'right'
  anchor: Element | null
}

export interface NodeExecutionPreviewSlotContext extends BaseSlotContext {
  open: boolean
  node: NodeInstanceType | null
  status: NodeExecutionStatus | 'paused' | null
  data: NodeExecutionData | undefined
  anchor: Element | null
  close: () => void
}

export interface NodeFloatingBarSlotContext extends BaseSlotContext {
  visible: boolean
  node: NodeInstanceType | null
  anchor: Element | null
  actions: readonly NodeFloatingAction[]
  canQuickAddIn: boolean
  canQuickAddOut: boolean
  runAction: (action: NodeFloatingAction) => void
  openQuickAdd: (direction: 'in' | 'out', triggerEl?: HTMLElement) => void
}

export interface NodeWidgetBarSlotContext extends BaseSlotContext {
  visible: boolean
  node: NodeInstanceType | null
  anchor: Element | null
  placement: NodeWidgetPlacement
  collapsed: boolean
  setCollapsed: (collapsed: boolean) => void
  editableInputs: readonly InputPort[]
  values: Record<string, unknown>
  setInputValue: (name: string, value: unknown) => void
  openQuickAdd: (direction: 'in' | 'out') => void
}

/**
 * Per-control replacement slots for every built-in canvas UI widget.
 *
 * Pass `false` or `null` to disable a built-in widget, a `lit-html` render
 * function for lightweight overrides, or `{ mount(container, ctx) }` to plug
 * in any external UI framework (React, Vue, Svelte, Web Components, etc.).
 */
export interface CanvasUISlots {
  toolbar?: CanvasUISlot<ToolbarSlotContext>
  zoomControls?: CanvasUISlot<ZoomControlsSlotContext>
  minimap?: CanvasUISlot<MinimapSlotContext>
  palette?: CanvasUISlot<PaletteSlotContext>
  contextMenu?: CanvasUISlot<ContextMenuSlotContext>
  nodePanel?: CanvasUISlot<NodePanelSlotContext>
  debugPanel?: CanvasUISlot<DebugPanelSlotContext>
  replayBanner?: CanvasUISlot<ReplayBannerSlotContext>
  portTooltip?: CanvasUISlot<PortTooltipSlotContext>
  nodeExecutionPreview?: CanvasUISlot<NodeExecutionPreviewSlotContext>
  nodeFloatingBar?: CanvasUISlot<NodeFloatingBarSlotContext>
  nodeWidgetBar?: CanvasUISlot<NodeWidgetBarSlotContext>
}
