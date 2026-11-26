import { nothing, type TemplateResult } from 'lit-html'
import type { NodeClassType, NodeFailure, NodeOptions, NodeRetryInfo } from '@lyx-pj/primflow-model'
import type { Graph, LinkInstanceType, NodeInstanceType } from '../Graph'
import type { CanvasLanguage } from './i18n'

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
      render: (context: PanelSectionContext) => TemplateResult | typeof nothing
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
  render?: (context: PanelRenderContext) => TemplateResult | typeof nothing
  /**
   * Overview content shown in the Node tab when no single node is selected.
   *
   * Defaults to a list of nodes in the current view; clicking one centers the
   * viewport on it and makes it the single selection. Return nothing to leave
   * the content area empty.
   */
  overview?: (context: PanelOverviewContext) => TemplateResult | typeof nothing
  /**
   * Content of the Global settings tab.
   *
   * The canvas does not define global settings itself; without a renderer the
   * tab shows an empty state.
   */
  globalSettings?: (context: PanelGlobalSettingsContext) => TemplateResult | typeof nothing
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
