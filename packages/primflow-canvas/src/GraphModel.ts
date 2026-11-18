import type { Graph, LinkInstanceType } from './Graph'
import type { Command } from './UndoManager'
import {
  EventEmitter,
  NodeInstance,
  ChangedEventType,
  VariableManager,
  DEFAULT_LOOP_CONFIG,
  type VariableDef,
  type NodeInstanceType,
  type JsonGraph
} from '@lyx-pj/primflow-model'
import { Util } from './utils'

export class GraphModel {
  undoStack: Command[] = []
  redoStack: Command[] = []
  id: string
  nodes: NodeInstanceType[] = []
  links: LinkInstanceType[] = []
  viewport: { x: number, y: number, scale: number } = { x: 0, y: 0, scale: 1 }
  constructor(id: string = '', nodes: NodeInstanceType[] = [], links: LinkInstanceType[] = []) {
    this.id = id
    this.nodes = nodes
    this.links = links
  }
}

type BlueprintModelEventsPayload = {
  addNodes: [NodeInstanceType[]]
  removeNodes: [NodeInstanceType[]]
  addLinks: [LinkInstanceType[]]
  removeLinks: [LinkInstanceType[]]
}
export class BlueprintModel extends EventEmitter<BlueprintModelEventsPayload> {

  public variableManager = new VariableManager()
  public activeGraph: GraphModel
  private graphStack: GraphModel[]
  private graph: Graph | null = null
  private _isSettingGraph = false
  public root: GraphModel = new GraphModel('root')
  public subgraphs: Map<string, GraphModel> = new Map() // key is subgraphId

  constructor(root: GraphModel = new GraphModel(), subgraphs: Map<string, GraphModel> = new Map()) {
    super()
    this.subgraphs = subgraphs
    this.root = root
    this.activeGraph = root
    this.graphStack = [root]
  }

  public get isSettingGraph() {
    return this._isSettingGraph
  }

  public get subgraphStack() {
    return this.graphStack
  }

  public get currentModel() {
    return this.activeGraph
  }

  public get nodes() {
    return this.activeGraph.nodes
  }

  setGraph(graph: Graph | null) {
    if (this.graph === graph) return
    if (this.graph) {
      this.graph.off('viewport:change', this.onViewportChange)
    }
    this.graph = graph
    if (this.graph) {
      // Loop bodies use dedicated entries; serialization must not insert ordinary Start nodes.
      const loopBodies = new Set(this.getAllNodes().filter(node => node.type === 'loop').map(node => node.subgraphId))
      for (const model of [this.root, ...this.subgraphs.values()]) {
        if (loopBodies.has(model.id)) continue
        if (!model.nodes.some(node => node.type === 'start')) {
          let id = `start-${model.id || 'root'}`
          while (model.nodes.some(node => node.id === id)) id += '-start'
          const start = new NodeInstance(this.graph.nodeRegistry.getStartNodeClass(), {
            id,
            position: { x: 300, y: 300 }
          })
          // Unmounted subgraphs may be saved immediately, so port IDs cannot depend on first render.
          for (const output of start.outputs) output.id ||= `out-${output.name}`
          model.nodes.push(start)
        }
      }
      this.graph.on('viewport:change', this.onViewportChange)
      this.graph.undoManager.clear()
      if (!this.activeGraph.nodes.length) return
      this._isSettingGraph = true
      const oldskips = this.graph.skipsUndoManager
      this.graph.skipsUndoManager = false
      this.graph.startTransaction()
      this.graph.addNodes(this.activeGraph.nodes)
      try {
        this.activeGraph.links = this.graph.addLinks(this.activeGraph.links)
      } catch (error) {
        console.error('Error adding links to graph:', error)
      }
      this.graph.commitTransaction()
      // Restore zoom and pan after the destination nodes are ready.
      this.graph.scale = this.activeGraph.viewport.scale
      this.graph.position = { x: this.activeGraph.viewport.x, y: this.activeGraph.viewport.y }
      this.graph.skipsUndoManager = oldskips
      this._isSettingGraph = false
    }
  }

  private onViewportChange = (viewport: { x: number, y: number, scale: number }) => {
    this.activeGraph.viewport = { x: viewport.x, y: viewport.y, scale: viewport.scale }
  }

  public enterSubgraph(subgraphId: string) {
    const sub = this.subgraphs.get(subgraphId)
    if (!sub) return
    if (!this.graph) return
    this._isSettingGraph = true
    const undoStack = this.graph.undoManager.undoStack
    const redoStack = this.graph.undoManager.redoStack
    this.activeGraph.undoStack = undoStack
    this.activeGraph.redoStack = redoStack
    this.graph.undoManager.clear()
    const oldnodes = this.graph.getNodes()
    const oldlinks = this.graph.getLinks()
    const oldskips = this.graph.skipsUndoManager
    this.graph.skipsUndoManager = true
    this.activeGraph = sub
    this.graph.removeNodes(oldnodes)
    this.graph.removeLinks(oldlinks)
    this.graph.addNodes(this.activeGraph.nodes)
    this.graph.addLinks(this.activeGraph.links)
    this.graph.scale = this.activeGraph.viewport.scale
    this.graph.position = { x: this.activeGraph.viewport.x, y: this.activeGraph.viewport.y }
    this.graph.undoManager.undoStack = this.activeGraph.undoStack
    this.graph.undoManager.redoStack = this.activeGraph.redoStack
    this.graph.skipsUndoManager = oldskips
    this.graphStack.push(sub)
    this._isSettingGraph = false
  }

  public exitSubgraph() {
    if (this.graphStack.length > 1) {
      this._isSettingGraph = true
      if (!this.graph) return
      this.activeGraph.undoStack = this.graph.undoManager.undoStack
      this.graphStack.pop()
      const previousGraph = this.graphStack[this.graphStack.length - 1]
      if (!this.graph) return
      this.graph.undoManager.clear()

      const oldnodes = this.graph.getNodes()
      const oldlinks = this.graph.getLinks()
      
      this.activeGraph = previousGraph
      const oldskips = this.graph.skipsUndoManager
      this.graph.skipsUndoManager = true
      this.graph.removeNodes(oldnodes)
      this.graph.removeLinks(oldlinks)
      this.graph.addNodes(previousGraph.nodes)
      this.graph.addLinks(previousGraph.links)
      this.graph.scale = this.activeGraph.viewport.scale
      this.graph.position = { x: this.activeGraph.viewport.x, y: this.activeGraph.viewport.y }
      this.graph.undoManager.undoStack = this.activeGraph.undoStack
      this.graph.undoManager.redoStack = this.activeGraph.redoStack
      this.graph.skipsUndoManager = oldskips
      this._isSettingGraph = false
    }
  }

  public hasSubgraph(subgraphId: string) {
    return this.subgraphs.has(subgraphId)
  }

  /** Whether the current or specified region is a loop body. */
  public isLoopBody(graphId: string = this.activeGraph.id) {
    return this.getAllNodes().some((node) => node.type === 'loop' && node.subgraphId === graphId)
  }

  public createSubgraph(subgraphId: string) {
    if (!this.subgraphs.has(subgraphId)) {
      const sub = new GraphModel(subgraphId)
      this.subgraphs.set(subgraphId, sub)
      const StartNodeClass = this.graph?.nodeRegistry.getStartNodeClass()
      const startNode = this.graph!.createNodeInstance(StartNodeClass as unknown as never, {
        // Subgraph entries receive parent parameters and expose matching outputs internally.
        inputs: [{ id: 'in-input', name: 'input', type: 'any', label: 'Parameter' }],
        outputs: [
          { id: 'out-start', name: 'start', type: 'exec' },
          { id: 'out-input', name: 'input', type: 'any', label: 'Parameter' },
        ],
      } as never) as NodeInstanceType
      const EndNodeClass = this.graph?.nodeRegistry.getEndNodeClass()
      const endNode = this.graph!.createNodeInstance(EndNodeClass as unknown as never) as NodeInstanceType
      startNode.id = 'start-' + subgraphId
      startNode.position = { x: 300, y: 300 }
      endNode.id = 'end-' + subgraphId
      endNode.position = { x: 600, y: 300 }
      // Subgraph exits write results to the calling node's outputs in the parent graph.
      endNode.inputs = [
        ...endNode.inputs,
        { id: 'in-result', name: 'result', type: 'any', label: 'result' }
      ]
      sub.nodes.push(startNode)
      sub.nodes.push(endNode)
      return sub
    }
  }

  public removeSubgraph(subgraphId: string) {
    this.subgraphs.delete(subgraphId)
  }

  public resetToRoot() {
    this.graphStack = [this.root]
    this.activeGraph = this.root
  }

  public findNode(id: string) {
    return this.activeGraph.nodes.find(node => node.id === id)
  }

  /** Find nodes across the main graph and subgraphs for cross-region displays. */
  public findNodeAnywhere(id: string) {
    return this.getAllNodes().find(node => node.id === id)
  }

  public findLink(id: string) {
    return this.activeGraph.links.find(link => link.id === id)
  }

  public getNodes() {
    return this.activeGraph.nodes
  }

  public getLinks() {
    return this.activeGraph.links
  }

  public addNodes(nodes: NodeInstanceType[]) {
    if (this.isSettingGraph) return
    if (nodes.length === 0) return
    if (!this.graph) return
    this.activeGraph.nodes.push(...nodes)
    for (const node of nodes) {
      if (node.definition.type === 'subgraph') {
        this.handleSubgraphNode(node)
      } else if (node.definition.type === 'loop') {
        this.handleLoopNode(node)
      }
    }
    this.raiseChanged(ChangedEventType.Insert, 'nodes', nodes, null, nodes)
  }

  public removeNodes(nodes: NodeInstanceType[]) {
    if (this.isSettingGraph) return
    if (nodes.length === 0) return
    if (!this.graph) return
    const doRemoveLinks: LinkInstanceType[] = []
    const links = this.getLinks()
    const removeSubgraphIds: string[] = []
    nodes.forEach(node => {
      links.forEach(link => {
        if (link.source.id === node.id || link.target.id === node.id) {
          doRemoveLinks.push(link)
        }
      })
      if (node.subgraphId && this.hasSubgraph(node.subgraphId)) {
        removeSubgraphIds.push(node.subgraphId)
      }
    })
    if (removeSubgraphIds.length > 0) {
      // Removed containers may reference nested bodies that also require cleanup.
      for (let index = 0; index < removeSubgraphIds.length; index += 1) {
        const nested = this.subgraphs.get(removeSubgraphIds[index])
        for (const child of nested?.nodes ?? []) {
          if (child.subgraphId && this.hasSubgraph(child.subgraphId) && !removeSubgraphIds.includes(child.subgraphId)) {
            removeSubgraphIds.push(child.subgraphId)
          }
        }
      }
      // Remove only subgraphs without live references; ignore nodes inside removed regions.
      const survivingNodes = [this.root, ...this.subgraphs.values()]
        .filter((model) => !removeSubgraphIds.includes(model.id))
        .flatMap((model) => model.nodes)
        .filter((node) => !nodes.includes(node))
      for (const node of survivingNodes) {
        const index = node.subgraphId ? removeSubgraphIds.indexOf(node.subgraphId) : -1
        if (index > -1) removeSubgraphIds.splice(index, 1)
      }
      removeSubgraphIds.forEach((id) => this.removeSubgraph(id))
    }
    this.activeGraph.nodes = this.activeGraph.nodes.filter(n => !nodes.includes(n))
    if (!this.graph) return
    this.graph.startTransaction()
    if (doRemoveLinks.length > 0) {
      this.graph.removeLinks(doRemoveLinks)
    }
    this.graph.commitTransaction()
    this.raiseChanged(ChangedEventType.Delete, 'nodes', nodes, nodes, null)
  }

  public addLinks(links: LinkInstanceType[]) {
    if (this.isSettingGraph) return
    if (links.length === 0) return
    if (!this.graph) return
    this.activeGraph.links.push(...links)
    this.raiseChanged(ChangedEventType.Insert, 'links', links, null, links)
  }
  
  public removeLinks(links: LinkInstanceType[]) {
    if (this.isSettingGraph) return
    if (links.length === 0) return
    if (!this.graph) return
    this.activeGraph.links = this.activeGraph.links.filter(l => !links.includes(l))
    this.raiseChanged(ChangedEventType.Delete, 'links', links, links, null)
  }

  getAllNodes() {
    const allNodes: NodeInstanceType[] = []
    allNodes.push(...this.root.nodes)
    for (const subgraph of this.subgraphs.values()) {
      allNodes.push(...subgraph.nodes)
    }
    return allNodes
  }

  getAllLinks() {
    const allLinks: LinkInstanceType[] = []
    allLinks.push(...this.root.links)
    for (const subgraph of this.subgraphs.values()) {
      allLinks.push(...subgraph.links)
    }
    return allLinks
  }

  public clear() {
    if (this.isSettingGraph) return
    this.resetToRoot()
    this.root.nodes = []
    this.root.links = []
    this.subgraphs.clear()
  }

  public toJSON() {
    return Util.toJSON(this)
  }

  public static fromJSON(
    graph: Graph,
    json: JsonGraph | string,
    options: { keepStartPorts?: boolean } = {}
  ): BlueprintModel {
    const model = new BlueprintModel()
    if (typeof json === 'string') {
      json = JSON.parse(json)
    }
    const { subgraphs, nodes, links, variables, viewport } = Util.fromJSON(graph as Graph, json, options)
    model.root.nodes = nodes
    model.root.links = links
    model.root.viewport = { x: viewport.x, y: viewport.y, scale: viewport.zoom }
    for (const variable of variables) {
      model.variableManager.setVariable({
        name: variable.name,
        type: variable.type,
        value: variable.value
      } as VariableDef)
    }
    for (const subgraphId in subgraphs) {
      const subgraphData = subgraphs[subgraphId]
      const subgraphModel = new GraphModel(subgraphId, subgraphData.nodes, subgraphData.links)
      subgraphModel.viewport = { x: subgraphData.viewport.x, y: subgraphData.viewport.y, scale: subgraphData.viewport.zoom }
      model.subgraphs.set(subgraphId, subgraphModel)
    }
    return model
  }

  public raiseChanged(change: ChangedEventType, propertyName: string, object: unknown, oldValue: unknown, newValue: unknown) {
    if (!this.graph) return
    this.graph.raiseChangedEvent(change, propertyName, object, oldValue, newValue)
  }

  private generateSubgraphId(): string {
    const id = 'sg_' + Math.random().toString(36).slice(2, 11)
    if (this.subgraphs.has(id)) {
      return this.generateSubgraphId()
    }
    return id
  }

  private handleSubgraphNode(node: NodeInstanceType) {
    // Nodes without subgraphId create embedded regions, including direct addNode('subgraph') calls.
    // A subgraphId without a matching region identifies an external file reference.
    // The host stores and executes external content; canvas does not create empty regions for it.
    if (!node.subgraphId) {
      node.subgraphId = this.generateSubgraphId()
      this.createSubgraph(node.subgraphId)
    }
  }

  private handleLoopNode(node: NodeInstanceType) {
    node.subgraphId ||= this.generateSubgraphId()
    node.loop ||= { ...DEFAULT_LOOP_CONFIG }
    if (!this.hasSubgraph(node.subgraphId)) {
      this.createLoopBody(node.subgraphId)
    }
  }

  /**
   * Loop bodies live in subgraphs but use dedicated entry and return controls.
   * Entries have one data output; returns expose next and break execution inputs.
   */
  private createLoopBody(subgraphId: string) {
    if (!this.graph) return
    const sub = new GraphModel(subgraphId)
    this.subgraphs.set(subgraphId, sub)
    const registry = this.graph.nodeRegistry
    const entryClass = registry.getNodeClass('loop-entry')
    const entry = new NodeInstance(entryClass, {
      id: `loop-entry-${subgraphId}`,
      position: { x: 300, y: 300 },
    })
    const returnClass = registry.getNodeClass('loop-return')
    const loopReturn = new NodeInstance(returnClass, {
      id: `loop-return-${subgraphId}`,
      position: { x: 600, y: 300 },
    })
    sub.nodes.push(entry, loopReturn)
    // Connect entry to return initially to satisfy engine structure validation.
    // Replace this connection after adding business nodes.
    sub.links.push({
      id: `loop-link-${subgraphId}`,
      source: { id: entry.id, port: entry.outputs.find((port) => port.name === 'exec')!.id! },
      target: { id: loopReturn.id, port: loopReturn.inputs.find((port) => port.name === 'next')!.id! },
    } as LinkInstanceType)
    return sub
  }
}
