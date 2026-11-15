import type { NodeClassType, NodeExecutionStatus, NodeOptions } from '@lyx-pj/workflow-model'
import type { Graph, LinkInstanceType, NodeInstanceType } from '../Graph'

/** Canvas UI requires a Graph with concrete node definitions to reuse Graph.addNode overloads. */
export type CanvasGraph = Graph<Record<string, NodeClassType>>

export type CanvasExecutionStatus = 'idle' | 'running' | 'paused'

/** Temporary execution data supplied by the application, excluded from saving and undo. */
export interface NodeExecutionData {
  inputs: Record<string, unknown>
  outputs: Record<string, unknown>
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

export interface NodePanelOptions {
  /** Panel width; defaults to 320. */
  width?: number
  /**
   * Application-specific settings, such as a node's API key.
   * Rendered between Type/ID and Inputs; evaluated once when switching nodes.
   */
  extra?: (node: NodeInstanceType, graph: CanvasGraph) => HTMLElement | string | null
}

export type DebugRecordStatus = 'waiting' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled'

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

/** Execution chain role distinguishing main graph and subgraph nodes. */
export type DebugChainKind = 'node' | 'subgraph' | 'subgraph-start' | 'subgraph-end'

/** Debug log; canvas displays it while the application owns generation and retention. */
export interface DebugLogEntry {
  time: number
  message: string
  level?: DebugLogLevel
  /** Display the node title when available; fall back to its id after deletion. */
  nodeId?: string
  /** Owning subgraph; the panel prefixes messages with [subgraph name]. */
  scope?: DebugScope
}

/** One execution chain node; loops may include the same node repeatedly. */
export interface DebugChainItem {
  nodeId: string
  /** Defaults to the current canvas node title, falling back to nodeId. */
  label?: string
  status?: NodeExecutionStatus
  /** Owning subgraph for indentation; omit for main graph nodes. */
  scope?: DebugScope
  /** Node role; omitted values display as ordinary nodes. */
  kind?: DebugChainKind
}

/** Debug panel data; call `graph.refreshDebugPanel()` after updates. */
export interface DebugPanelData {
  /** Execution records in application-supplied order. */
  records?: readonly DebugRecord[]
  logs?: readonly DebugLogEntry[]
  chain?: readonly DebugChainItem[]
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
