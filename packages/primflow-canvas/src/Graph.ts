import { validateGraphTypes, type GraphTypeDiagnostic } from '@lyx-pj/primflow-model'
import type { CanvasLanguage } from './ui/i18n'
import { GraphAdapter } from './adapters/GraphAdapter'
import {
  NodeRegistry,
  NodeInstance,
  EventEmitter,
  ChangedEvent,
  ChangedEventType,
  mergeDeep,
  type NodeOptions,
  type NodeClassType,
  type InputPort,
  type OutputPort,
  type NodeInstanceType,
  type NodeExecutionStatus,
  type JsonGraph
} from '@lyx-pj/primflow-model'
import { resolveLinkColor } from './utils/portColors'
import { UndoManager } from './UndoManager'
import { BlueprintModel } from './GraphModel'
import { Util } from './utils'
import { EditorRegistry } from './ui/editors'
import { NodeRendererRegistry } from './ui/nodeRenderers'
import { SubgraphPreviewManager } from './preview/SubgraphPreviewManager'
import type { SubgraphPreviewCacheAdapter } from './preview/previewCache'
import { renderThumbnail, type ThumbnailHandle, type ThumbnailOptions } from './preview/renderThumbnail'
import type { CanvasGraph } from './ui/types'
import type {
  CanvasExecutionStatus,
  ContextMenuOptions,
  DebugPanelOptions,
  NodeExecutionData,
  NodePanelOptions,
  PaletteOptions,
  ToolbarOptions,
} from './ui/types'

export type { NodeInstanceType }

export interface GraphOptions {
  /** Built-in UI language, supplied by the application; defaults to English. */
  language?: CanvasLanguage,
  container?: HTMLElement,
  width?: number | string,
  height?: number | string,
  background?: string,
  gridSize?: number,
  drawGrid?: {
    size?: number,
    color?: string,
    thickness?: number
  },
  /** Built-in palette: enabled by default; opens on blank double-click; false disables it. */
  palette?: boolean | PaletteOptions,
  /** Built-in context menu: enabled by default; false disables it. */
  contextMenu?: boolean | ContextMenuOptions,
  /** Built-in right-hand node panel: enabled and open by default; false disables it. */
  nodePanel?: boolean | NodePanelOptions,
  /** Right-hand debug panel; enabling it adds a toolbar visibility toggle. */
  debugPanel?: boolean | DebugPanelOptions,
  /** Transparent toolbar, shown when actions or panel toggles are configured. */
  toolbar?: boolean | ToolbarOptions,
  /** Host-managed return navigation for external views; embedded levels return first. */
  navigation?: {
    canGoBack: () => boolean,
    goBack: () => void | Promise<void>
  } | null
}

export interface ReplayOptions {
  /** Replay banner title, usually the execution record name. */
  label?: string
  /** Replay node statuses; unspecified nodes retain their normal appearance. */
  nodeStatuses?: Record<string, NodeExecutionStatus>
  /** Replay node inputs / outputs for hover previews. */
  nodeData?: Record<string, NodeExecutionData>
}

/** Live execution state saved before replay and restored to the editing graph on exit. */
interface ReplayExecutionSnapshot {
  status: CanvasExecutionStatus
  pausedNodeId: string | null
  nodeStatuses: Map<string, NodeExecutionStatus>
  nodeData: Map<string, NodeExecutionData>
}

export interface IGraph<NodeDefs extends Record<string, NodeClassType>> {
  /**
   * The registry of node definitions.
   */
  nodeRegistry: NodeRegistry<NodeDefs>

  /**
   * The current selected nodes and links in the graph.
   */
  selection: Set<NodeInstanceType | LinkInstanceType>

  /**
   * Adds a new node to the graph.
   * @param nodeType The node type string (registered name) or the registered node class to add.
   * @param options The options for adding the node.
   * @returns The instance of the added node.
   *
   * @example
   * ```
   * import { Graph, NodeRegistry, defineNode } from '@lyx-pj/primflow-canvas'
   * const NodeA = defineNode({ definition: { inputs: [], outputs: [] } })
   * const registry = new NodeRegistry()
   *  .register('nodeA', NodeA)
   * const graph = new Graph(registry, {
   *   el: document.createElement('div'),
   * })
   * const node1 = graph.addNode('nodeA')
   * const node2 = graph.addNode(NodeA)
   * const node3 = graph.createNodeInstance('nodeA')
   * graph.addNode(node3)
   * ```
   */
  addNode: <T extends keyof NodeDefs>(
    nodeType: T | NodeDefs[T] | NodeInstanceType,
    options?: NodeOptions<NodeDefs[T]>
  ) => NodeInstanceType

  /**
   * Adds a link to the graph.
   * @param link {@see LinkInstance} The link instance to add.
   * @returns The added link instance.
   */
  addLink: <T extends LinkInstance>(link: T) => T

  /**
   * Selects a node in the graph.
   * @param node The node instance to select.
   * @returns void
   */
  select: (node: NodeInstanceType) => void

  /**
   * Selects a collection of nodes and links in the graph.
   * @param items The collection of nodes and links to select.
   * @returns void
   * ```
   */
  selectCollection: (items: Array<NodeInstanceType | LinkInstanceType>) => void

  /**
   * Deletes the currently selected nodes and links from the graph.
   * @returns void
   */
  deleteSelection: () => void

  /** Whether selection includes removable nodes or links, for menu availability. */
  canDeleteSelection(): boolean

  /**
   * Remove specified nodes; retain one main Start and protect subgraph Start/End.
   * @param nodes The node instances to remove.
   */
  removeNodes(nodes: NodeInstanceType[]): void

  /**
   * Removes the specified link instances from the graph.
   * @param links The link instances to remove.
   */
  removeLinks(links: LinkInstance[]): void

  /**
   * Gets all nodes in the graph.
   * @returns An array of all node instances in the graph.
   */
  getNodes(): NodeInstanceType[]

  /**
   * Gets all links in the graph.
   * @returns An array of all link instances in the graph.
   */
  getLinks(): LinkInstance[]

  // Find a node by its ID.
  findNode(id: string): NodeInstanceType | undefined

  /**
   * Find a node across the main graph and all subgraphs.
   *
   * `findNode` searches only the displayed graph, not nodes in other regions.
   * Use this method for cross-region displays such as debug panels.
   */
  findNodeAnywhere(id: string): NodeInstanceType | undefined

  // Find a link by its ID.
  findLink(id: string): LinkInstanceType | undefined

  /**
   * Sets the container HTMLElement to render the graph into.
   * @param container The container HTMLElement to render the graph into.
   * @returns void
   * 
   * @example
   * ```
   * const container = document.getElementById('graph-container')
   * graph.setContainer(container)
   * ```
   */
  setContainer(container: HTMLElement): void

  /**
   * Zooms the graph in by a predefined step.
   */
  zoomIn(): void
  
  /**
   * Zooms the graph out by a predefined step.
   */
  zoomOut(): void

  /**
   * Zooms the graph to a specific scale.
   */
  zoom(value: number): void

  /**
   * Resets the zoom level to the default scale (1.0 or as configured).
   */
  resetZoom(): void

  /**
   * Destroys the graph and cleans up resources.
   */
  destroy: () => void

  /**
   * Validates the connection between two ports.
   * @param sourceNode The source node instance.
   * @param sourcePort The source port.
   * @param targetNode The target node instance.
   * @param targetPort The target port.
   * @returns Whether the connection is valid.
   */
  validateConnection: (sourceNode: NodeInstanceType, sourcePort: OutputPort, targetNode: NodeInstanceType, targetPort: InputPort) => boolean

  /**
   * Gets the link color when actively creating a connection by dragging on the canvas.
   * You can return a color string based on the current context or logic.
   * @returns The link color as a string.
   */
  getLinkColor(
    sourceNode: NodeInstanceType | null,
    targetNode: NodeInstanceType | null,
    sourcePort: OutputPort | null,
    targetPort: InputPort | null
  ): string

  /**
   * creates a new node instance of the specified node type.
   * @param nodeType The node type string (registered name) or the registered node class to create.
   * @param options The options for creating the node instance.
   * @returns The instance of the created node.
   */
  createNodeInstance<K extends keyof NodeDefs>(
    nodeType: K | NodeDefs[K],
    options?: NodeOptions<NodeDefs[K]>
  ): NodeInstanceType

  /**
   * Clear the canvas, return to the main graph, and create a Start node.
   */
  clear(): void

  /**
   * Gets the current graph as a JSON object.
   */
  toJSON(): JsonGraph

  /**
   * Loads the graph from a JSON object or string.
   * @param json The JSON object or string to load the graph from.
   * @param options `keepStartPorts` preserves explicitly defined Start data ports.
   *                Use it to preserve parameters when opening subgraph files.
   */
  fromJSON(json: JsonGraph | string, options?: { keepStartPorts?: boolean }): void

  /**
   * Replace the external-subgraph JSON used by call-card previews.
   *
   * The canvas does not read application storage; refresh an entry after
   * saving that subgraph file and remove it when the file is deleted.
   */
  setSubgraphSources(sources: Record<string, JsonGraph> | Map<string, JsonGraph>): void

  /** Update or remove one external-subgraph preview source. */
  updateSubgraphSource(id: string, json: JsonGraph | null): void

  /**
   * Install an application-owned cache for rendered card previews.
   *
   * The canvas decides when to save or drop entries; the application decides
   * where they live. Pass `null` to disable persistence and keep the in-memory
   * cache only. Call `preloadSubgraphPreviews` after setting the adapter.
   */
  setSubgraphPreviewCache(adapter: SubgraphPreviewCacheAdapter | null): void

  /**
   * Load persisted card previews into memory.
   *
   * Await this during startup, before restoring a view, so cards can mount
   * their cached image on the first paint.
   */
  preloadSubgraphPreviews(): Promise<void>

  /**
   * Render any view JSON into a container without modifying the live graph.
   * Nested subgraph calls use generic cards rather than recursing.
   */
  renderThumbnail(json: JsonGraph, container: HTMLElement, options?: ThumbnailOptions): ThumbnailHandle
}

type GraphEventPayload = {
  'changed': [event: ChangedEvent]
  'type:diagnostics': [diagnostics: GraphTypeDiagnostic[]]

  /** Notify UI after undo history updates to avoid reading pre-commit state. */
  'history:changed': []

  /** Canvas emits toolbar actions without run callbacks for the application to handle. */
  'toolbar:action': [id: string]

  /** Replay entry or exit; applications can pause autosave and other live behavior. */
  'replay:changed': [replaying: boolean, label: string]

  'node:click': [instance: NodeInstanceType, evt: MouseEvent]
  'node:dblclick': [instance: NodeInstanceType, evt: MouseEvent]
  'node:changed': [instance: NodeInstanceType, propertyName: string, oldvalue: unknown, newvalue: unknown]
  'node:dragstart': [instance: NodeInstanceType]
  'node:dragmove': [instance: NodeInstanceType]
  'node:dragend': [instance: NodeInstanceType]
  'node:mouseenter': [instance: NodeInstanceType, evt: MouseEvent]
  'node:mouseleave': [instance: NodeInstanceType, evt: MouseEvent]
  'node:removed': [instance: NodeInstanceType[], info: { type: 'removed' }]
  'node:created': [instance: NodeInstanceType[], info: { type: 'added' }]
  'node:mounted': [instance: NodeInstanceType]

  'link:click': [instance: LinkInstanceType, evt: MouseEvent]
  'link:dblclick': [instance: LinkInstanceType, evt: MouseEvent]
  'link:created': [instance: LinkInstanceType[], info: { type: 'added' }]
  'link:removed': [instance: LinkInstanceType[], info: { type: 'removed' }]
  
  'start:connecting': []

  'blank:dblclick': [evt: MouseEvent]
  'blank:click': [evt: MouseEvent]
  
  'selection:changed': [selection: Array<NodeInstanceType | LinkInstanceType>]
  
  'subgraph:enter': [subgraphId: string]
  'subgraph:exit': [subgraphId: string]
  
  'viewport:change': [viewport: { x: number, y: number, scale: number }]
  
}

/**
 * Interaction callbacks keyed by events emitted by Graph itself.
 * Framework adapters (React / Vue / ...) supply these callbacks.
 * Adapters need no JointJS event names or duplicate subscription management.
 */
export type GraphViewHandlers = {
  [K in keyof GraphEventPayload]?: (...payload: GraphEventPayload[K]) => void
}

/** Default interaction subscriptions; additional handler keys are subscribed automatically. */
const VIEW_EVENTS = [
  'node:click',
  'node:dblclick',
  'node:dragstart',
  'node:dragmove',
  'node:dragend',
  'link:click',
  'link:dblclick',
  'blank:click',
  'blank:dblclick',
  'start:connecting',
  'selection:changed',
  'viewport:change',
] as const satisfies readonly (keyof GraphEventPayload)[]

export class Graph<NodeDefs extends Record<string, NodeClassType> = {}> extends EventEmitter<GraphEventPayload> implements IGraph<NodeDefs> {
  public undoManager = new UndoManager(this)
  public skipsUndoManager = false
  public container?: HTMLElement
  public _model!: BlueprintModel
  public nodeRegistry: NodeRegistry<NodeDefs>
  /** Application-provided editors for port and panel controls, keyed by data type. */
  public readonly editors = new EditorRegistry()
  /** Application-provided node renderers, keyed by definition ID. */
  public readonly nodeRenderers = new NodeRendererRegistry()
  /** Container card previews; external subgraph sources are supplied by the application. */
  public readonly subgraphPreviews: SubgraphPreviewManager
  private _defaultScale = 1
  private adapter: GraphAdapter
  private viewDispose?: () => void
  public options: GraphOptions
  private currentExecutionStatus: CanvasExecutionStatus = 'idle'
  private currentPausedNodeId: string | null = null
  private nodeExecutionStatuses = new Map<string, NodeExecutionStatus>()
  private readonly nodeProgress = new Map<string, string>()
  private nodeExecutionData = new Map<string, NodeExecutionData>()
  /** Editing graph saved before replay; null when replay is inactive. */
  private replayBackup: {
    json: JsonGraph
    scale: number
    position: { x: number; y: number }
    subgraphs: string[]
    execution: ReplayExecutionSnapshot
  } | null = null
  private replayLabelValue = ''

  public get executionStatus() {
    return this.currentExecutionStatus
  }

  public get pausedNodeId() {
    return this.currentPausedNodeId
  }

  /** Update temporary visuals only, without changing configuration, JSON, or undo history. */
  public setExecutionStatus(status: CanvasExecutionStatus, pausedNodeId?: string) {
    const previousPausedNodeId = this.currentPausedNodeId
    this.currentPausedNodeId = status === 'paused' ? pausedNodeId ?? null : null
    this.currentExecutionStatus = status
    if (previousPausedNodeId !== this.currentPausedNodeId) {
      if (previousPausedNodeId) {
        this.adapter?.setNodeExecutionPaused(previousPausedNodeId, false)
        // After resume, discard breakpoint inputs and wait for completed execution data.
        if (this.getNodeExecutionStatus(previousPausedNodeId) !== 'completed') {
          this.nodeExecutionData.delete(previousPausedNodeId)
        }
        this.adapter?.ui?.refreshNodeExecutionPreview(previousPausedNodeId)
      }
      if (this.currentPausedNodeId) this.adapter?.setNodeExecutionPaused(this.currentPausedNodeId, true)
    }
    if (status === 'idle') this.resetNodeExecutionStatuses()
    this.adapter?.ui?.refreshExecutionStatus()
  }

  public getNodeExecutionStatus(nodeId: string): NodeExecutionStatus {
    return this.nodeExecutionStatuses.get(nodeId) ?? 'idle'
  }

  public getNodeExecutionData(nodeId: string): NodeExecutionData | undefined {
    return this.nodeExecutionData.get(nodeId)
  }

  public getNodeProgress(nodeId: string): string | undefined {
    return this.isReplayMode() ? undefined : this.nodeProgress.get(nodeId)
  }

  public setNodeProgress(nodeId: string, text: string) {
    this.nodeProgress.set(nodeId, text)
    this.adapter?.ui?.refreshNodeExecutionPreview(nodeId)
  }

  public clearNodeProgress() {
    const ids = [...this.nodeProgress.keys()]
    this.nodeProgress.clear()
    for (const id of ids) this.adapter?.ui?.refreshNodeExecutionPreview(id)
  }

  /** Synchronize states and actual port values; clear stale data on rerun. */
  public setNodeExecutionStatus(nodeId: string, status: NodeExecutionStatus, data?: NodeExecutionData) {
    const paused = this.currentExecutionStatus === 'paused' && this.currentPausedNodeId === nodeId
    if (data && (status === 'completed' || paused || (status !== 'idle' && data.attempt))) {
      this.nodeExecutionData.set(nodeId, data)
    } else if (status !== 'completed') {
      this.nodeExecutionData.delete(nodeId)
    }
    if (status === this.getNodeExecutionStatus(nodeId)) {
      this.adapter?.ui?.refreshNodeExecutionPreview(nodeId)
      return
    }
    if (status === 'idle') this.nodeExecutionStatuses.delete(nodeId)
    else this.nodeExecutionStatuses.set(nodeId, status)
    this.adapter?.setNodeExecutionStatus(nodeId, status)
    this.adapter?.ui?.refreshNodeExecutionPreview(nodeId)
  }

  public resetNodeExecutionStatuses() {
    for (const nodeId of this.nodeExecutionStatuses.keys()) this.setNodeExecutionStatus(nodeId, 'idle')
  }

  /**
   * Replace the canvas with a historical graph and enter read-only replay.
   *
   * Save editing graph, viewport, and live state on first entry; later entries switch snapshots.
   * Exit restores editing and live state. Recreated node instances require clearing undo history.
   */
  public enterReplay(json: JsonGraph | string, options: ReplayOptions = {}) {
    if (!this.replayBackup) {
      this.replayBackup = {
        json: this.toJSON(),
        scale: this.scale,
        position: { ...this.position },
        subgraphs: this.model.subgraphStack.slice(1).map((model) => model.id),
        execution: this.snapshotExecutionState(),
      }
    }
    this.replayLabelValue = options.label ?? ''
    this.fromJSON(json)
    this.undoManager.clear()
    this.applyReplayExecution(options)
    this.clearSelection()
    this.emit('replay:changed', true, this.replayLabelValue)
    return this
  }

  /** Exit replay and restore the prior editing graph, zoom, pan, and live state. */
  public exitReplay() {
    const backup = this.replayBackup
    if (!backup) return this
    this.replayBackup = null
    this.replayLabelValue = ''
    this.fromJSON(backup.json)
    this.scale = backup.scale
    this.position = backup.position
    // Imperative zoom/pan does not emit viewport:change; synchronize the model before saving.
    this.model.currentModel.viewport = { x: backup.position.x, y: backup.position.y, scale: backup.scale }
    // Replay model changes reset execution state; reapply saved live state to the editing graph.
    this.restoreExecutionState(backup.execution)
    // Restore the previous subgraph; if a region was removed, stop at its surviving parent.
    for (const subgraphId of backup.subgraphs) {
      if (!this.model.hasSubgraph(subgraphId)) break
      this.enterSubgraph(subgraphId)
    }
    this.undoManager.clear()
    this.clearSelection()
    this.emit('replay:changed', false, '')
    return this
  }

  public isReplayMode() {
    return this.replayBackup !== null
  }

  public get replayLabel() {
    return this.replayLabelValue
  }

  private snapshotExecutionState(): ReplayExecutionSnapshot {
    return {
      status: this.currentExecutionStatus,
      pausedNodeId: this.currentPausedNodeId,
      nodeStatuses: new Map(this.nodeExecutionStatuses),
      nodeData: new Map(this.nodeExecutionData),
    }
  }

  /** Restore the status map before visuals; refreshExecutionVisuals handles mounted subgraphs. */
  private restoreExecutionState(state: ReplayExecutionSnapshot) {
    this.nodeExecutionStatuses = state.nodeStatuses
    this.nodeExecutionData = state.nodeData
    this.setExecutionStatus(state.status, state.pausedNodeId ?? undefined)
    this.refreshExecutionVisuals()
  }

  private applyReplayExecution(options: ReplayOptions) {
    const data = options.nodeData ?? {}
    const statuses = options.nodeStatuses ?? {}
    for (const [nodeId, nodeData] of Object.entries(data)) {
      this.setNodeExecutionStatus(nodeId, statuses[nodeId] ?? 'completed', nodeData)
    }
    for (const [nodeId, status] of Object.entries(statuses)) {
      if (!(nodeId in data)) this.setNodeExecutionStatus(nodeId, status)
    }
  }
  
  static NodeInstance: typeof NodeInstance
  static LinkInstance: typeof LinkInstance
  
  private clipboard: {
    nodes: JsonGraph['nodes']
    links: JsonGraph['links']
  } = { nodes: [], links: [] }
  
  constructor(registry: NodeRegistry<NodeDefs>, options?: GraphOptions) {
    super()
    this.options = options || {}
    this.nodeRegistry = registry
    this.container = options?.container
    if (this.container) {
      this.container.setAttribute('tabindex', '0')
      this.container.style.outline = 'none'
      this.container.focus()
    }
    this.adapter = new GraphAdapter(this as unknown as Graph<{}>, options)
    this.model = new BlueprintModel(undefined, undefined, registry.dataTypes)
    this.subgraphPreviews = new SubgraphPreviewManager(this as unknown as CanvasGraph)
    this.initialize()
  }

  // Get the current selected nodes and links in the graph
  get selection() {
    return this.adapter.selection || new Set()
  }

  // Get the current zoom level of the viewport
  get scale() {
    return this.adapter.scale || 1
  }
  // Set the current zoom level of the viewport
  set scale(value: number) {
    if (this.adapter) this.adapter.scale = value
  }

  // Get the current position of the viewport
  get position() {
    return this.adapter.position || { x: 0, y: 0 }
  }
  // Set the current position of the viewport
  set position(value: { x: number, y: number }) {
    if (this.adapter) this.adapter.position = value
  }

  // Get or set the default zoom scale
  get defaultScale() {
    return this._defaultScale
  }
  set defaultScale(value: number) {
    this._defaultScale = value
  }

  get model() {
    return this._model
  }
  set model(value: BlueprintModel) {
    // A new model keeps rendered previews so switching views can mount them instantly.
    this.reset({ keepPreviewCache: true })
    this._model?.setGraph(null)
    this._model = value
    value.setGraph(this as unknown as Graph<{}>)
  }

  protected initialize() {
    this.initAdapterEvents()
  }

  /** @inheritdoc {@link IGraph.addNode} */
  public addNode<T extends keyof NodeDefs>(
    nodeType: T | NodeDefs[T] | NodeInstanceType,
    options?: NodeOptions<NodeDefs[T]>
  ): NodeInstance<NodeDefs[T]> {
    const nodeInstance = nodeType instanceof NodeInstance ?
      nodeType as NodeInstance<NodeDefs[T]> :
      this.createNodeInstance(nodeType, options)

    const style = mergeDeep(mergeDeep(
      (this.nodeRegistry.nodeStyle) as Record<string, unknown>,
      (nodeInstance.definition.style ?? {}) as Record<string, unknown>
    ), (nodeInstance.style ?? {}) as Record<string, unknown>)
    // nodeInstance.setGraph(this as unknown as Graph<{}>)
    this._validateNodes([nodeInstance])
    this.adapter.addNode(nodeInstance, style)
    nodeInstance.setGraph(this as unknown as Graph<{}>)
    this.model.addNodes([nodeInstance])
    return nodeInstance
  }

  /** @inheritdoc {@link IGraph.addLink} */
  public addLink<T extends LinkInstance>(link: T): LinkInstance & T {
    const linkInstance = link instanceof LinkInstance ? link : this.createLinkInstance(link)
    const style = mergeDeep(
      (this.nodeRegistry.linkStyle) as Record<string, unknown>,
      linkInstance.style ?? {} as Record<string, unknown>
    )
    if (this._validateLinkConnection(linkInstance)) {
      this.adapter.addLink(linkInstance, style)
      this.model.addLinks([linkInstance])
    }
    return linkInstance
  }

  /** Adds multiple nodes to the graph. */
  public addNodes(nodes: NodeInstanceType[]): NodeInstanceType[] {
    this._validateNodes(nodes)
    nodes.forEach(node => {
      const style = mergeDeep(mergeDeep(
        (this.nodeRegistry.nodeStyle) as Record<string, unknown>,
        (node.definition.style ?? {}) as Record<string, unknown>
      ), (node.style || {}) as Record<string, unknown>)
      this.adapter.addNode(node, style)
      node.setGraph(this as unknown as Graph<{}>)
    })
    this.model.addNodes(nodes)
    return nodes
  }

  /** Adds multiple links to the graph. */
  public addLinks(links: LinkInstanceType[]): LinkInstanceType[] {
    const errors: Error[] = []
    links = links.filter(link => {
      try {
        return this._validateLinkConnection(link)
      } catch (error: unknown) {
        errors.push(error as Error)
        return false
      }
    })
    links.forEach(link => {
      const style = mergeDeep(
        (this.nodeRegistry.linkStyle) as Record<string, unknown>,
        link.style ?? {} as Record<string, unknown>
      )
      this.adapter.addLink(link, style)
    })
    this.model.addLinks(links)
    if (errors.length > 0) {
      throw new Error(`Some links could not be added:\n${errors.map(e => (e).message).join('\n')}`)
    }
    return links
  }

  /**
   * Replace both ends of an existing link.
   *
   * Adapters use this for endpoint reconnection. The change is not recorded
   * here; callers decide whether it belongs to an undo transaction.
   */
  public applyLinkEnds(link: LinkInstanceType, ends: LinkEnds) {
    const before: LinkEnds = {
      source: { ...link.source },
      target: { ...link.target },
    }
    if (
      before.source.id === ends.source.id && before.source.port === ends.source.port &&
      before.target.id === ends.target.id && before.target.port === ends.target.port
    ) {
      return
    }
    link.source = { ...ends.source }
    link.target = { ...ends.target }
    this.adapter?.updateLink(link)
    this.adapter?.syncPortHighlights(before)
    this.adapter?.syncPortHighlights(ends)
    this.raiseChangedEvent(ChangedEventType.Property, 'connection', link, before, ends)
  }

  /** @inheritdoc {@link IGraph.select} */
  public select(item: NodeInstanceType | LinkInstance) {
    this.adapter.select(item)
    this.emit('selection:changed', Array.from(this.selection))
  }

  /** @inheritdoc {@link IGraph.selectCollection} */
  public selectCollection(items: Array<NodeInstanceType | LinkInstance>) {
    this.adapter.selectCollection(items)
    this.emit('selection:changed', Array.from(this.selection))
  }

  public clearSelection() {
    this.adapter.clearSelection()
    this.emit('selection:changed', [])
  }

  /** @inheritdoc {@link IGraph.destroy} */
  public destroy() {
    this.replayBackup = null
    this.replayLabelValue = ''
    this.subgraphPreviews.destroy()
    this.reset()
    if (this.adapter) this.adapter.destroy()
  }

  /** Add one case port to a Switch node. */
  public addSwitchCase(node: NodeInstanceType) {
    this.adapter.addSwitchCase(node)
  }

  /**
   * Remove one case port from a Switch node.
   * Return false when attempting to remove the last case.
   */
  public removeSwitchCase(node: NodeInstanceType, inputName: string) {
    return this.adapter.removeSwitchCase(node, inputName)
  }

  /** Open the built-in palette; default to the canvas top-left without coordinates. */
  public openPalette(clientX?: number, clientY?: number) {
    this.adapter.openPalette(clientX, clientY)
  }

  /** Close built-in menus (palette / context menu). */
  public closeMenus() {
    this.adapter.closeMenus()
  }

  /** Whether the debug panel is open; always false without `debugPanel` configuration. */
  public isDebugPanelOpen() {
    return this.adapter?.ui?.isDebugPanelOpen() ?? false
  }

  /** Open the right-hand debug panel. */
  public openDebugPanel() {
    this.adapter?.ui?.openDebugPanel()
  }

  /** Close the debug panel without changing node selection. */
  public closeDebugPanel() {
    this.adapter?.ui?.closeDebugPanel()
  }

  /** Toggle debug panel visibility. */
  public toggleDebugPanel() {
    this.adapter?.ui?.toggleDebugPanel()
  }

  /** Refresh debug panel data; do not evaluate data while closed. */
  public refreshDebugPanel() {
    this.adapter?.ui?.refreshDebugPanel()
  }

  /** Whether the right-hand node panel is open; always false without `nodePanel` configuration. */
  public isNodePanelOpen() {
    return this.adapter?.ui?.isNodePanelOpen() ?? false
  }

  /** Open the right-hand panel; the Node tab shows the current selection or the overview. */
  public openNodePanel() {
    this.adapter?.ui?.openNodePanel()
  }

  /** Close the right-hand panel without changing node selection. */
  public closeNodePanel() {
    this.adapter?.ui?.closeNodePanel()
  }

  /** Toggle right-hand panel visibility. */
  public toggleNodePanel() {
    this.adapter?.ui?.toggleNodePanel()
  }

  /** Re-render the right-hand panel content; skipped while closed. */
  public refreshNodePanel() {
    this.adapter?.ui?.refreshNodePanel()
  }

  /**
   * Replace the external-subgraph source map used by card previews.
   *
   * Applications own storage; the canvas only renders the supplied JSON.
   */
  public setSubgraphSources(sources: Record<string, JsonGraph> | Map<string, JsonGraph>) {
    this.subgraphPreviews.setSources(sources)
  }

  /** Update or remove one external-subgraph source. */
  public updateSubgraphSource(id: string, json: JsonGraph | null) {
    this.subgraphPreviews.updateSource(id, json)
  }

  /** @inheritdoc {@link IGraph.setSubgraphPreviewCache} */
  public setSubgraphPreviewCache(adapter: SubgraphPreviewCacheAdapter | null) {
    this.subgraphPreviews.setCacheAdapter(adapter)
  }

  /** @inheritdoc {@link IGraph.preloadSubgraphPreviews} */
  public preloadSubgraphPreviews(): Promise<void> {
    return this.subgraphPreviews.preload()
  }

  /**
   * Render any view JSON into a container.
   *
   * The preview never modifies the current graph and does not recurse into
   * nested subgraph nodes.
   */
  public renderThumbnail(json: JsonGraph, container: HTMLElement, options?: ThumbnailOptions): ThumbnailHandle {
    return renderThumbnail(this as unknown as CanvasGraph, json, container, options)
  }

  /** @inheritdoc {@link IGraph.setContainer} */
  public setContainer(container: HTMLElement) {
    container.setAttribute('tabindex', '0')
    container.style.outline = 'none'
    container.focus()
    this.container = container
    if (this.adapter) this.adapter.setContainer(container)
  }

  /**
   * Mount the graph and interaction handlers; return a disposer.
   *
   * Framework adapters use this single lifecycle entry point.
   * Call it on mount and dispose on unmount without duplicating subscriptions.
   * Additional framework adapters do not require canvas changes.
   *
   * @param container DOM container for the graph
   * @param handlers Callback map or reader evaluated whenever an event fires.
   *                 Readers avoid stale closures; React adapters can read from a ref.
   * @param options Graph options merged at mount time
   * @returns An idempotent disposer
   */
  public mount(
    container: HTMLElement,
    handlers: GraphViewHandlers | (() => GraphViewHandlers) = {},
    options?: Partial<GraphOptions>
  ): () => void {
    // Dispose prior listeners before repeated mounts, including React StrictMode remounts.
    this.viewDispose?.()

    if (options) {
      this.setOptions({ ...options, container })
    } else {
      this.setContainer(container)
    }

    const resolveHandlers = typeof handlers === 'function' ? handlers : () => handlers
    const offs: Array<() => void> = []

    const bind = <K extends keyof GraphEventPayload>(event: K) => {
      const listener = (...payload: GraphEventPayload[K]) => {
        resolveHandlers()[event]?.(...payload)
      }
      this.on(event, listener)
      offs.push(() => this.off(event, listener))
    }

    for (const event of VIEW_EVENTS) bind(event)
    // Include caller-provided Graph events beyond the standard list.
    const extraEvents = Object.keys(resolveHandlers()) as Array<keyof GraphEventPayload>
    for (const event of extraEvents) {
      if (!(VIEW_EVENTS as readonly string[]).includes(event)) bind(event)
    }

    let disposed = false
    const dispose = () => {
      if (disposed) return
      disposed = true
      this.adapter.closeMenus()
      offs.forEach(off => off())
      if (this.viewDispose === dispose) this.viewDispose = undefined
    }
    this.viewDispose = dispose
    return dispose
  }

  /** @inheritdoc {@link IGraph.deleteSelection} */
  public deleteSelection() {
    const deleteCells = Array.from(this.selection)
    const deleteNodes = deleteCells.filter(c => c instanceof Graph.NodeInstance) as NodeInstanceType[]
    const deleteLinks = deleteCells.filter(c => c instanceof Graph.LinkInstance) as LinkInstanceType[]


    const oldskips = this.skipsUndoManager
    if (!oldskips) this.startTransaction()
    this.removeNodes(deleteNodes)
    this.removeLinks(deleteLinks)
    if (!oldskips) this.commitTransaction()
  }

  /** @inheritdoc {@link IGraph.removeNodes} */
  public removeNodes(nodes: NodeInstanceType[]) {
    nodes = this.getRemovableNodes(nodes)
    if (nodes.length === 0) return
    if (this.adapter) this.adapter.removeCells(nodes)
    this.model.removeNodes(nodes)
  }

  /** @inheritdoc {@link IGraph.canDeleteSelection} */
  public canDeleteSelection(): boolean {
    const selection = [...this.selection]
    const nodes = selection.filter(cell => cell instanceof Graph.NodeInstance) as NodeInstanceType[]
    return this.getRemovableNodes(nodes).length > 0 || selection.some(cell =>
      cell instanceof Graph.LinkInstance && this.getLinks().includes(cell)
    )
  }

  private getRemovableNodes(nodes: NodeInstanceType[]) {
    if (!this.model.isSettingGraph) {
      const startNodes = this.getNodes().filter(node => node.type === 'start')
      const removing = new Set(nodes)
      // Bulk deletion preserves one original Start and records only actual removals.
      if (startNodes.length > 0 && startNodes.every(node => removing.has(node))) {
        removing.delete(startNodes[0])
      }
      nodes = [...removing]
    }
    if (this.model.currentModel.id !== this.model.root.id) {
      nodes = nodes.filter(n => {
        // Subgraph entries and loop controls define regions and can only be removed with their containers.
        if (
          ['start', 'end', 'loop-entry', 'loop-return'].includes(n.type) &&
          !this.model.isSettingGraph
        ) {
          return false
        }
        return true
      })
    }
    return nodes
  }

  /** @inheritdoc {@link IGraph.removeLinks} */
  public removeLinks(links: LinkInstance[]) {
    if (!this.model.isSettingGraph) {
      const currentLinks = new Set(this.getLinks())
      // Do not record cascaded link removals twice when nodes and links are selected together.
      links = [...new Set(links)].filter(link => currentLinks.has(link))
    }
    if (links.length === 0) return
    if (this.adapter) this.adapter.removeCells(links)
    this.model.removeLinks(links)
  }

  public copySelection() {
    this.copyCells([...this.selection])
  }

  public copyCells(cells: Array<NodeInstanceType | LinkInstanceType>) {
    const nodes = cells.filter(c => c instanceof Graph.NodeInstance)
    const links = cells.filter(c => c instanceof Graph.LinkInstance)
      .filter(l => {
        return nodes.find(n => n.id === l.source.id) && nodes.find(n => n.id === l.target.id)
      })
    const serializedNodes = Util.serializeNodes(nodes)
    const serializedLinks = Util.serializeLinks(links)
    this.clipboard.nodes = serializedNodes
    this.clipboard.links = serializedLinks
  }

  public pasteClipboard() {
    if (this.clipboard.nodes.length === 0) return
    if (!this.adapter) return
    const oldnodeIdMap = new Map<string, string>()
    const nodes = Util.deserializeNodes(this as unknown as Graph<{}>, this.clipboard.nodes.map(n => {
      const oldId = n.id
      const newId = this.adapter!.generateNodeId()
      oldnodeIdMap.set(oldId, newId)
      n.position = { x: n.position.x + 20, y: n.position.y + 20 }
      return {
        ...n,
        id: newId,
      }
    }))
    const links = Util.deserializeLinks(this as unknown as Graph<{}>, this.clipboard.links.map(l => {
      l.id = this.adapter!.generateLinkId()
      const newSourceId = oldnodeIdMap.get(l.source.id)!
      const newTargetId = oldnodeIdMap.get(l.target.id)!
      return {
        id: l.id,
        source: {
          id: newSourceId,
          port: l.source.port
        },
        target: {
          id: newTargetId,
          port: l.target.port
        }
      }
    }))

    this.clearSelection()
    this.startTransaction()
    this.addNodes(nodes)
    this.addLinks(links)
    this.selectCollection([...nodes, ...links])
    this.commitTransaction()
  }

  /** @inheritdoc {@link IGraph.getLinks} */
  public getLinks(): LinkInstance[] {
    return this.model.getLinks()
  }

  /** @inheritdoc {@link IGraph.getNodes} */
  public getNodes(): NodeInstanceType[] {
    return this.model.getNodes()
  }

  /** @inheritdoc {@link IGraph.findLink} */
  public findNode(id: string): NodeInstanceType | undefined {
    return this.model.findNode(id)
  }

  /** @inheritdoc {@link IGraph.findNodeAnywhere} */
  public findNodeAnywhere(id: string): NodeInstanceType | undefined {
    return this.model.findNodeAnywhere(id)
  }

  /** @inheritdoc {@link IGraph.findLink} */
  public findLink(id: string): LinkInstanceType | undefined {
    return this.model.findLink(id)
  }

  /** @inheritdoc {@link IGraph.zoomIn} */
  public zoomIn() {
    if (this.adapter) this.adapter.zoomIn()
  }

  /** @inheritdoc {@link IGraph.zoomOut} */
  public zoomOut() {
    if (this.adapter) this.adapter.zoomOut()
  }

  /** @inheritdoc {@link IGraph.zoom} */
  public zoom(value: number) {
    if (this.adapter) this.adapter.zoom(value)
  }

  /** @inheritdoc {@link IGraph.resetZoom} */
  public resetZoom() {
    if (this.adapter) this.adapter.resetZoom(this.defaultScale)
  }

  /** @inheritdoc {@link IGraph.createNodeInstance} */
  public createNodeInstance<K extends keyof NodeDefs>(
    nodeType: K | NodeDefs[K],
    options?: NodeOptions<NodeDefs[K]>
  ): NodeInstance<NodeDefs[K]> {
    if (!this.nodeRegistry.isRegistered(nodeType)) {
      if (typeof nodeType === 'string') {
        throw new Error(`Node type "${nodeType}" is not registered.`)
      } else if (nodeType.constructor && 'name' in nodeType.constructor) {
        throw new Error(`Node type "${nodeType.constructor.name}" is not registered.`)
      }
    }
    let NodeClass: NodeDefs[K]
    if (typeof nodeType === 'string') {
      NodeClass = this.nodeRegistry.get(nodeType as K)
    } else {
      NodeClass = nodeType as NodeDefs[K]
    }

    return new Graph.NodeInstance(NodeClass, options, this.nodeRegistry.dataTypes)
  }

  /** @inheritdoc {@link IGraph.createLinkInstance} */
  public createLinkInstance<T extends LinkInstance>(link: T): LinkInstance & T {
    const linkInstance = new LinkInstance(link.source, link.target)
    return Object.assign(linkInstance, link)
  }

  /** @inheritdoc {@link IGraph.getLinkColor} */
  public getLinkColor(
    _sourceNode: NodeInstanceType,
    _targetNode: NodeInstanceType,
    sourcePort: OutputPort,
    targetPort: InputPort): string
  {
    return resolveLinkColor(
      this.nodeRegistry.nodeStyle.ports?.colors,
      this.nodeRegistry.linkStyle.stroke || 'rgba(255,255,255,0.5)',
      sourcePort.type,
      targetPort.type
    )
  }

  public enterSubgraph(subgraphId: string) {
    this.model.enterSubgraph(subgraphId)
    this.refreshExecutionVisuals()
    this.emit('subgraph:enter', subgraphId)
  }

  public exitSubgraph() {
    const subgraphId = this.model.activeGraph.id
    if (subgraphId === this.model.root.id) return
    this.model.exitSubgraph()
    this.refreshExecutionVisuals()
    this.emit('subgraph:exit', subgraphId)
  }

  /** Whether an embedded parent or host-managed source view is available. */
  public canGoBack() {
    return !this.isReplayMode() &&
      (this.model.subgraphStack.length > 1 || Boolean(this.options.navigation?.canGoBack()))
  }

  /** Exit embedded subgraphs before delegating file-root navigation to the host. */
  public goBack() {
    if (!this.canGoBack()) return
    if (this.model.subgraphStack.length > 1) this.exitSubgraph()
    else void this.options.navigation?.goBack()
  }

  /** Reapply temporary execution states after mounting subgraph nodes. */
  private refreshExecutionVisuals() {
    for (const [nodeId, status] of this.nodeExecutionStatuses) {
      this.adapter?.setNodeExecutionStatus(nodeId, status)
    }
    if (this.currentPausedNodeId) this.adapter?.setNodeExecutionPaused(this.currentPausedNodeId, true)
  }

  public clientToGraphPoint(clientX: number, clientY: number) {
    if (!this.adapter) return { x: clientX, y: clientY }
    return this.adapter.clientToGraphPoint(clientX, clientY)
  }

  /** @inheritdoc {@link IGraph.startTransaction} */
  public startTransaction() {
    this.undoManager.startTransaction()
  }

  /** @inheritdoc {@link IGraph.commitTransaction} */
  public commitTransaction() {
    this.undoManager.commitTransaction()
  }

  /** @inheritdoc {@link IGraph.commit} */
  public commit(...args: Parameters<UndoManager['commit']>) {
    this.undoManager.commit(...args)
  }

  /** @inheritdoc {@link IGraph.validateConnection} */
  public validateConnection(_sourceNode: NodeInstanceType, sourcePort: OutputPort, _targetNode: NodeInstanceType, targetPort: InputPort): boolean {
    return this.nodeRegistry.dataTypes.checkConnection(sourcePort.type, targetPort.type)
  }

  public raiseChangedEvent(change: ChangedEventType, propertyName: string, object: unknown, oldValue: unknown, newValue: unknown) {
    const e = new ChangedEvent()
    e.change = change
    e.graph = this as unknown as Graph<{}>
    e.propertyName = propertyName
    e.oldValue = oldValue
    e.newValue = newValue
    e.object = object
    this.callChangedListeners(e)
  }

  public setOptions(options: Partial<GraphOptions> = {}) {
    const previousLanguage = this.options.language
    this.options = mergeDeep(
      this.options as Record<string, unknown>,
      options
    )
    if (this.adapter) this.adapter.setOptions(this.options)
    if (options.container) this.setContainer(options.container)
    if (this.subgraphPreviews && options.language !== undefined && options.language !== previousLanguage) {
      this.subgraphPreviews.invalidate()
    }
  }

  public toString(details: number = 0) {
    let name = '';
    if (this.container && this.container.id) name = this.container.id
    let str = `Graph "${name ? '' + name : ''}"`
    if (details > 0) {
      const nodes = this.getNodes()
      const links = this.getLinks()
      const total = nodes.length + links.length
      str += '\n ' + total + ': '
      str += nodes.length + ' Nodes '
      str += links.length + ' Links'

      for (const node of nodes) {
        str += '\n   ' + 'Node#' + node.id + `(${node.nodeType})`
      }

      for (const link of links) {
        str += '\n   ' + 'Link#' + link.id + `(${link.source.id} ${link.target.id})` + ` ${link.source.port} ${link.target.port}`
      }
    }
    return str
  }

  /** @inheritdoc {@link IGraph.toJSON} */
  public toJSON() {
    return this.model.toJSON()
  }

  public getTypeDiagnostics(json: JsonGraph = this.toJSON()) {
    return validateGraphTypes(json, this.nodeRegistry)
  }

  /** @inheritdoc {@link IGraph.fromJSON} */
  public fromJSON(json: JsonGraph | string, options: { keepStartPorts?: boolean } = {}) {
    const model = BlueprintModel.fromJSON(this as unknown as Graph<{}>, json, options)
    this.model.setGraph(null)
    this.model = model
    this.subgraphPreviews.invalidate()
    this.clearNodeProgress()
    this.emit('type:diagnostics', this.getTypeDiagnostics())
    return this.model
  }

  /** @inheritdoc {@link IGraph.clear} */
  public clear() {
    this.reset()
    // Remount an empty model to insert Start; model replacement and destroy only reset it.
    this.model.setGraph(null)
    this.model.setGraph(this as unknown as Graph<{}>)
  }

  private reset(options: { keepPreviewCache?: boolean } = {}) {
    this.clearNodeProgress()
    this.resetNodeExecutionStatuses()
    this.setExecutionStatus('idle')
    if (this.subgraphPreviews) this.subgraphPreviews.resetSlots({ keepCache: options.keepPreviewCache })
    if (this.model) this.model.clear()
    if (this.adapter) this.adapter.clear()
    this.undoManager.clear()
  }

  private initAdapterEvents() {
    this.adapter.on('node:click', (instance, evt) => {
      this.emit('node:click', instance, evt)
    })
    this.adapter.on('node:dblclick', (instance, evt) => {
      this.emit('node:dblclick', instance, evt)
    })
    this.adapter.on('blank:click', (evt) => {
      this.emit('blank:click', evt)
    })
    this.adapter.on('blank:dblclick', (evt) => {
      this.emit('blank:dblclick', evt)
    })
    this.adapter.on('link:click', (instance, evt) => {
      this.emit('link:click', instance, evt)
    })
    this.adapter.on('link:dblclick', (instance, evt) => {
      this.emit('link:dblclick', instance, evt)
    })
  }

  private callChangedListeners(e: ChangedEvent) {
    if (!this.skipsUndoManager) {
      this.undoManager.handleChanged(e);
    }
    this.emit('changed', e)
  }

  private _validateLinkConnection(link: LinkInstance) {
    const sourceNode = this.findNode(link.source.id)
    const targetNode = this.findNode(link.target.id)
    if (!sourceNode) {
      throw new Error(`Source node with id "${link.source.id}" not found.`)
    }
    if (!targetNode) {
      throw new Error(`Target node with id "${link.target.id}" not found.`)
    }
    if (sourceNode.id === targetNode.id) {
      throw new Error(`Cannot connect a node to itself: "${sourceNode.id}".`)
    }
    const sourcePortId = link.source.port!
    const targetPortId = link.target.port!
    if (!sourcePortId || !targetPortId) throw new Error(`Both source port and target port must be specified in the link.`)
    const sourcePort = sourceNode.outputs.find(port => port.id === sourcePortId)
    if (!sourcePort) throw new Error(`Source output port "${sourcePortId}" not found in node "${sourceNode}".`)
    const targetPort = targetNode.inputs.find(port => port.id === targetPortId)
    if (!targetPort) throw new Error(`Target input port "${targetPortId}" not found in node "${targetNode}".`)
    if (!this.validateConnection(sourceNode, sourcePort, targetNode, targetPort)) {
      throw new Error(
        `Port type mismatch: cannot connect ${sourceNode} [${sourcePort.name}:${sourcePort.type}] to ${targetNode} [${targetPort.name}:${targetPort.type}].`
      )
    }
    return true
  }

  private _validateNodes(nodes: NodeInstanceType[]) {
    if (!this.model.isSettingGraph && this.model.subgraphStack.length > 1) {
      if (nodes.some(n => n.type === 'start') && this.getNodes().some(n => n.type === 'start')) {
        throw new Error('A subgraph cannot contain another start node.')
      }
    }
    return true
  }
}

export interface LinkEnds {
  source: { id: string, port: string }
  target: { id: string, port: string }
}

class LinkInstance {
  style?: { stroke?: string, strokeWidth?: number }
  id?: string
  source: LinkEnds['source']
  target: LinkEnds['target']
  constructor(source: LinkEnds['source'], target: LinkEnds['target']) {
    this.source = source
    this.target = target
  }
  public toString() {
    return `Link#${this.id}(${this.source.id} ${this.target.id}) ${this.source.port} ${this.target.port}`
  }
}

Graph.NodeInstance = NodeInstance
Graph.LinkInstance = LinkInstance

export type LinkInstanceType = InstanceType<typeof Graph.LinkInstance>
