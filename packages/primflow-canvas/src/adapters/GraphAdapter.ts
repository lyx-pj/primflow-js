import { JointGraph } from './joint/JointGraph'
import { type GraphOptions, Graph, type NodeInstanceType, type LinkInstanceType, type LinkEnds } from '../Graph'
import type { InputPort, OutputPort, NodeStyle, LinkStyle, NodeExecutionStatus } from '@lyx-pj/primflow-model'
import { BlueprintNode } from './joint/nodes/BlueprintNode'
import { isContainerCardRenderer, containerCardSize } from './joint/nodes/containerCard'
import { dia, mvc } from '@joint/core'
import { EventEmitter, mergeDeep } from '@lyx-pj/primflow-model'
import { KeyboardManager } from '../utils/KeyboardManager'
import { BlueprintNodeView } from './joint/nodes/BlueprintNodeView'
import { CanvasUI } from '../ui/CanvasUI'
import { nextSwitchCaseNumber, removeSwitchCasePorts } from '../utils/switchCases'

interface IGraphAdapter {
  addNode(node: NodeInstanceType): void
  addLink(link: LinkInstanceType): void
  destroy(): void
}

type AdpterEventPayload = {
  'node:click': [node: NodeInstanceType, evt: MouseEvent]
  'node:dblclick': [node: NodeInstanceType, evt: MouseEvent]
  'link:click': [link: LinkInstanceType, evt: MouseEvent]
  'link:dblclick': [link: LinkInstanceType, evt: MouseEvent]
  'blank:click': [evt: MouseEvent]
  'blank:dblclick': [evt: MouseEvent]
}

export class GraphAdapter extends EventEmitter<AdpterEventPayload> implements IGraphAdapter {
  public joint: JointGraph
  public cellsMap: Map<string, { cell: NodeInstanceType | LinkInstanceType, jointCell: BlueprintNode | dia.Link }> = new Map()
  public selection: Set<NodeInstanceType | LinkInstanceType> = new Set()
  private keyboardManager?: KeyboardManager
  public graph: Graph
  public jointSelection: Set<BlueprintNode | dia.Link> = new Set()
  public ui?: CanvasUI
  /** Hovered node id; clear on removal so delayed mouseout cannot access disposed instances. */
  private hoveredNodes = new Set<string>()
  /** Temporary JointJS-only link shown while the add-and-connect palette is open. */
  private pendingLinkId: string | null = null

  constructor(graph: Graph, options?: GraphOptions) {
    super()
    this.graph = graph
    const jointPaperOptions = {
      el: options?.container,
      width: options?.width ?? '100%',
      height: options?.height ?? '100%',
      gridSize: options?.gridSize ?? 10,
      drawGridSize: options?.drawGrid?.size ?? 10,
      background: {
        color: options?.background ?? '#fff',
      },
      drawGrid: options?.drawGrid ? {
        color: options.drawGrid.color ?? '#bbb',
        thickness: options.drawGrid.thickness ?? 1
      } : false,
    } as dia.Paper.Options

    this.joint = new JointGraph(this, jointPaperOptions)

    this.initGraphEvents()
    this.initializeTools()
    if (options?.container) this.mountUI()
  }

  get scale() {
    return this.joint.scrollerController.scale
  }
  set scale(value: number) {
    this.joint.scrollerController.scale = value
  }
  get position() {
    return this.joint.scrollerController.position
  }
  set position(value: { x: number; y: number }) {
    this.joint.scrollerController.position = value
  }

  public initializeTools() {
    if (this.joint.paper.el) {
      if (this.keyboardManager) {
        this.keyboardManager.destroy()
      }
      this.keyboardManager = new KeyboardManager(this.joint.paper.el)
      this.initKeyboardShortcuts()
    }
  }

  public setContainer(container: HTMLElement) {
    this.joint.setContainer(container)
    this.initializeTools()
    this.mountUI()
  }

  /** Recreate UI overlays with containers to avoid leaks on previous containers. */
  private mountUI() {
    this.ui?.destroy()
    this.ui = new CanvasUI(this.graph, this, this.joint.paper)
  }

  /** Clear any stale selection box state. */
  public cancelSelection() {
    this.joint?.selectionController?.cancel()
  }

  /** Append Switch case input/output ports. */
  public addSwitchCase(instance: NodeInstanceType) {
    if (instance.type !== 'switch') return
    const caseNumber = nextSwitchCaseNumber(instance.inputs)
    instance.inputs = [
      ...instance.inputs,
      {
        name: `case_${caseNumber}_value`,
        type: 'string',
        id: this.generatePortId([...instance.inputs, ...instance.outputs]),
      },
    ]
    instance.outputs = [
      ...instance.outputs,
      {
        name: `case_${caseNumber}`,
        type: 'exec',
        id: this.generatePortId([...instance.inputs, ...instance.outputs]),
      },
    ]
  }

  /**
   * Remove a Switch case and all connections to its port.
   * Return false when attempting to remove the last case.
   */
  public removeSwitchCase(instance: NodeInstanceType, inputName: string): boolean {
    if (instance.type !== 'switch') return false
    const removed = removeSwitchCasePorts(instance.inputs, instance.outputs, inputName)
    if (!removed) return false

    if (removed.portIds.length > 0) {
      const portIds = new Set(removed.portIds)
      const links = this.graph.getLinks().filter((link) => {
        const sourceHit = link.source.id === instance.id && portIds.has(link.source.port)
        const targetHit = link.target.id === instance.id && portIds.has(link.target.port)
        return sourceHit || targetHit
      })
      if (links.length > 0) this.graph.removeLinks(links)
    }

    instance.inputs = removed.inputs
    instance.outputs = removed.outputs
    return true
  }

  public openPalette(clientX?: number, clientY?: number) {
    this.ui?.openPalette(clientX, clientY)
  }

  public closeMenus() {
    this.ui?.close()
  }

  /** Node dimensions in graph coordinates, independent of zoom, for centered palette dragging. */
  public getNodeSize(id: string) {
    const jointCell = this.cellsMap.get(id)?.jointCell
    return jointCell instanceof dia.Element ? jointCell.size() : undefined
  }

  /** Canvas node instance for a joint cell id. */
  public getNodeInstance(id: string): NodeInstanceType | undefined {
    const cell = this.cellsMap.get(id)?.cell
    return cell && !(cell as LinkInstanceType).source ? cell as NodeInstanceType : undefined
  }

  public select(item: NodeInstanceType | LinkInstanceType | string) {
    const id = typeof item === 'string' ? item : item.id || ''
    const cellObj = this.cellsMap.get(id)
    if (cellObj) {
      const instance = cellObj.cell
      if (!this.selection.has(instance)) {
        this.selection.add(instance)
      }
      if (!this.jointSelection.has(cellObj.jointCell)) {
        this.jointSelection.add(cellObj.jointCell)
      }
    }
    this.joint.groupCells([...this.jointSelection])
    this.syncLinkEndpointTools()
  }

  public selectCollection(items: Array<NodeInstanceType | LinkInstanceType>) {
    this.selection.clear()
    this.jointSelection.clear()
    items.forEach(item => {
      const cellObj = this.cellsMap.get(item.id || '')
      if (cellObj) {
        const instance = cellObj.cell
        if (!this.selection.has(instance)) {
          this.selection.add(instance)
        }
        if (!this.jointSelection.has(cellObj.jointCell)) {
          this.jointSelection.add(cellObj.jointCell)
        }
      }
    })
    this.joint.groupCells([...this.jointSelection])
    this.syncLinkEndpointTools()
  }

  public unselect(item: NodeInstanceType | LinkInstanceType | string) {
    const id = typeof item === 'string' ? item : item.id || ''
    const cellObj = this.cellsMap.get(id)
    if (cellObj) {
      const instance = cellObj.cell
      if (this.selection.has(instance)) {
        this.selection.delete(instance)
      }
      if (this.jointSelection.has(cellObj.jointCell)) {
        this.jointSelection.delete(cellObj.jointCell)
      }
    }
    this.joint.groupCells([...this.jointSelection])
    this.syncLinkEndpointTools()
  }

  public clearSelection() {
    this.selection.clear()
    this.jointSelection.clear()
    this.joint.clearGroups()
    this.syncLinkEndpointTools()
  }

  public addNode(instance: NodeInstanceType, style?: NodeStyle) {
    instance.id = instance.id || this.generateNodeId()
    const ports = [...instance.inputs, ...instance.outputs]
    const usedIds = new Set<string>()
    for (const port of ports) {
      if (!port.id) continue
      if (usedIds.has(port.id)) throw new Error(`Duplicate port ID "${port.id}" in node "${instance.id}".`)
      usedIds.add(port.id)
    }
    for (const port of ports) port.id ||= this.generatePortId(ports)

    const jointNode = this.joint.addNode(instance, style)

    instance._bbox = this.getElementBBox(this.joint.paper.findViewByModel(jointNode) as dia.ElementView)

    this.cellsMap.set(instance.id, { cell: instance, jointCell: jointNode })
  }

  public setNodeExecutionStatus(nodeId: string, status: NodeExecutionStatus) {
    const cell = this.cellsMap.get(nodeId)?.jointCell
    if (cell?.isElement()) (cell as BlueprintNode).set('executionStatus', status)
  }

  public setNodeExecutionPaused(nodeId: string, paused: boolean) {
    const cell = this.cellsMap.get(nodeId)?.jointCell
    if (cell?.isElement()) (cell as BlueprintNode).set('executionPaused', paused)
  }

  public addLink(link: LinkInstanceType, style?: LinkStyle) {
    link.id = link.id || this.generateLinkId()
    const jointLink = this.joint.addLink(link, style)
    this.cellsMap.set(link.id as string, { cell: link, jointCell: jointLink })
    this.applyLinkColor(jointLink)
  }

  /** Apply a model endpoint change to the matching JointJS link. */
  public updateLink(link: LinkInstanceType) {
    const jointCell = this.cellsMap.get(link.id as string)?.jointCell
    if (!(jointCell instanceof dia.Link)) return
    jointCell.set({
      source: { ...link.source },
      target: { ...link.target },
    })
    this.applyLinkColor(jointCell)
  }

  /** Highlight ports used by `ends` and clear stale highlights. */
  public syncPortHighlights(ends: LinkEnds) {
    this.joint.syncPortHighlights(ends)
  }

  /** Keep a dangling draft link visible until the user chooses a node or cancels. */
  public createPendingLink(
    source: { id: string; port: string },
    target: { x: number; y: number },
    style?: LinkStyle
  ) {
    this.discardPendingLink()
    const id = this.generateLinkId()
    this.joint.addPendingLink(id, source, target, style)
    this.pendingLinkId = id
    return id
  }

  /** Remove the draft link and its model-free JointJS cell. */
  public discardPendingLink(id: string | null = this.pendingLinkId) {
    if (!id) return
    this.joint.discardPendingLink(id)
    if (this.pendingLinkId === id) this.pendingLinkId = null
  }

  /**
   * Turn the draft link into a model link without recreating its JointJS cell.
   *
   * The caller owns the surrounding transaction; this method only raises the
   * model insert that records the link in undo history.
   */
  public promotePendingLink(id: string, ends: LinkEnds): LinkInstanceType | null {
    const jointLink = this.joint.releasePendingLink(id)
    if (!jointLink) return null
    if (this.pendingLinkId === id) this.pendingLinkId = null
    try {
      jointLink.set({
        source: { ...ends.source },
        target: { ...ends.target },
      })
      const linkInstance = this.graph.createLinkInstance({
        id,
        source: ends.source,
        target: ends.target,
      })
      this.cellsMap.set(id, { cell: linkInstance, jointCell: jointLink })
      this.applyLinkColor(jointLink)
      linkInstance.style = mergeDeep(linkInstance.style ?? {}, {
        strokeWidth: jointLink.attr('line/strokeWidth'),
      }) as LinkStyle
      this.graph.model.addLinks([linkInstance])
      this.joint.syncPortHighlights(ends)
      return linkInstance
    } catch (error) {
      this.cellsMap.delete(id)
      this.joint.removeCells([jointLink])
      throw error
    }
  }

  /**
   * Paint one link with the colour of the port it joins.
   *
   * A link carries no colour of its own, so loading a graph always matches the
   * current port colours rather than a colour stored with the file.
   */
  private applyLinkColor(jointLink: dia.Link) {
    const source = jointLink.source()
    const target = jointLink.target()
    const from = this.findNode(String(source.id))
    const to = this.findNode(String(target.id))
    const reversed = from?.inputs.some(port => port.id === source.port)
    const sourceNode = reversed ? to : from
    const targetNode = reversed ? from : to
    const output = sourceNode?.outputs.find(port => port.id === (reversed ? target : source).port)
    const input = targetNode?.inputs.find(port => port.id === (reversed ? source : target).port)
    if (!sourceNode || !targetNode || !output || !input) return
    jointLink.attr('line/stroke', this.graph.getLinkColor(sourceNode, targetNode, output, input))
  }

  public removeCells(nodes: Array<NodeInstanceType | LinkInstanceType>) {
    const removeCells: Array<BlueprintNode | dia.Link> = []
    nodes.forEach(node => {
      const cellObj = this.cellsMap.get(node.id || '')
      if (cellObj) {
        removeCells.push(cellObj.jointCell)
        this.cellsMap.delete(node.id || '')
        this.selection.delete(node)
        this.jointSelection.delete(cellObj.jointCell)
        if (node.id) this.hoveredNodes.delete(node.id)
      }
    })
    this.joint.removeCells(removeCells)

    this.selectionChanged()
  }

  public destroy() {
    this.keyboardManager?.destroy()
    this.ui?.destroy()
    this.ui = undefined
    this.discardPendingLink()
    this.joint.destroy()
    this.joint = null as unknown as JointGraph
  }

  public getLinks(): LinkInstanceType[] {
    const links: LinkInstanceType[] = []
    this.cellsMap.forEach(({ cell }) => {
      if (cell instanceof Graph.LinkInstance) {
        links.push(cell)
      }
    })
    return links
  }

  public getNodes(): NodeInstanceType[] {
    const nodes: NodeInstanceType[] = []
    this.cellsMap.forEach(({ cell }) => {
      if (cell instanceof Graph.NodeInstance) {
        nodes.push(cell)
      }
    })
    return nodes
  }

  public findNode(id: string): NodeInstanceType | undefined {
    const cellObj = this.cellsMap.get(id)
    if (cellObj && cellObj.cell instanceof Graph.NodeInstance) {
      return cellObj.cell
    }
    return undefined
  }

  public findLink(id: string): LinkInstanceType | undefined {
    const cellObj = this.cellsMap.get(id)
    if (cellObj && cellObj.cell instanceof Graph.LinkInstance) {
      return cellObj.cell
    }
    return undefined
  }

  public zoomIn() {
    this.joint.scrollerController.scale += 0.1
  }

  public zoomOut() {
    this.joint.scrollerController.scale -= 0.1
  }

  public zoom(value: number) {
    this.joint.scrollerController.scale = value
  }

  public resetZoom(defaultScale = 1) {
    this.joint.scrollerController.scale = defaultScale
    this.joint.scrollerController.position = { x: 0, y: 0 }
  }

  public clientToGraphPoint(clientX: number, clientY: number) {
    return this.joint.paper.clientToLocalPoint(clientX, clientY)
  }

  private initKeyboardShortcuts() {
    if (!this.keyboardManager) return
    this.keyboardManager.registerShortcut('delete', () => {
      if (this.graph.isReplayMode()) return
      this.graph.deleteSelection()
    })
    this.keyboardManager.registerShortcut('backspace', () => {
      if (this.graph.isReplayMode()) return
      this.graph.deleteSelection()
    })
    this.keyboardManager.registerShortcut('mod+z', () => {
      if (this.graph.isReplayMode()) return
      this.graph.undoManager.undo()
    })
    this.keyboardManager.registerShortcut('mod+y', () => {
      if (this.graph.isReplayMode()) return
      this.graph.undoManager.redo()
    })
    this.keyboardManager.registerShortcut('mod+shift+z', () => {
      if (this.graph.isReplayMode()) return
      this.graph.undoManager.redo()
    })
    this.keyboardManager.registerShortcut('mod+a', (e) => {
      e.preventDefault()
      this.clearSelection()
      const allNodes = this.getNodes()
      const allLinks = this.getLinks()
      this.selectCollection([...allNodes, ...allLinks])
      this.selectionChanged()
    })
    this.keyboardManager.registerShortcut('mod+c', (e) => {
      if (e.target !== this.graph.container) return
      e.preventDefault()
      this.graph.copySelection()
    })
    this.keyboardManager.registerShortcut('mod+v', (e) => {
      if (e.target !== this.graph.container || this.graph.isReplayMode()) return
      e.preventDefault()
      this.graph.pasteClipboard()
    })
  }

  private generatePortId(list: readonly (OutputPort | InputPort)[]): string {
    const id = `port-${Math.random().toString(36).slice(2, 11)}`
    if (list.some(port => port.id === id)) {
      return this.generatePortId(list)
    }
    return id
  }

  public generateNodeId(): string {
    const id = 'node-' + Math.random().toString(36).slice(2, 11)
    if (this.cellsMap.has(id)) {
      return this.generateNodeId()
    }
    return id
  }

  public generateLinkId(): string {
    const id = 'link-' + Math.random().toString(36).slice(2, 11)
    if (this.cellsMap.has(id)) {
      return this.generateLinkId()
    }
    return id
  }

  public setOptions(options: Partial<GraphOptions>) {
    const language = options.language ?? 'en'
    if (this.joint.graph.get('language') !== language) {
      this.joint.graph.set('language', language)
      this.ui?.refreshLanguage()
    }
    if (options.toolbar !== undefined || options.debugPanel !== undefined || options.nodePanel !== undefined || options.navigation !== undefined) this.ui?.refreshToolbar()
    if (options.debugPanel !== undefined) this.ui?.refreshDebugPanel()
    if (options.nodePanel !== undefined) this.ui?.refreshNodePanel()
    if (options.width) this.joint.paper.options.width = options.width
    if (options.height) this.joint.paper.options.height = options.height
    if (options.gridSize !== undefined) this.joint.paper.options.gridSize = options.gridSize
    if (options.background) this.joint.paper.options.background = { color: options.background }
    if (options.drawGrid) {
      this.joint.paper.options.drawGridSize = options.drawGrid.size ?? 10
      this.joint.paper.options.drawGrid = {
        color: options.drawGrid.color ?? '#bbb',
        thickness: options.drawGrid.thickness ?? 1
      }
    }
  }

  private initGraphEvents() {
    this.graph.on('node:mounted', (node) => {
      node.inputs.forEach(async input => {
        if (input.editor !== 'select') return
        const jointCell = this.cellsMap.get(node.id || '')?.jointCell
        if (!jointCell) return
        const elementView = this.joint.paper.findViewByModel(jointCell) as BlueprintNodeView
        if (typeof input.options === 'function') {
          const options = await input.options(node.inputValues)
          if (options === input._options || !Array.isArray(options)) return
          input._options = options
          jointCell.get('inputs').find((i: InputPort) => i.name === input.name)._options = input._options
          elementView.updateOptions(input.id || '', input.name, input._options || [])
          if (!node.inputValues[input.name]) node.inputValues[input.name] = input._options?.[0]?.value
          elementView.refreshDomValue(input.name)
        }
      })
    })
    // Node changed
    this.graph.on('node:changed', (node, change, _oldValue, newvalue) => {
      const pair = this.cellsMap.get(node.id)
      if (!pair) return
      const { jointCell } = pair
      if (!jointCell) return
      switch (change) {
        case 'breakpoint':
          (jointCell as BlueprintNode).set('breakpoint', node.breakpoint)
          break
        case 'collapsed': {
          const jointNode = jointCell as BlueprintNode
          jointNode.set('collapsed', node.collapsed)
          const renderer = jointNode.get('nodeRenderer')
          if (isContainerCardRenderer(renderer)) renderer.size = containerCardSize(node.collapsed)
          jointNode.updateSizeByContent()
          jointNode.buildPortItems()
          node._bbox = this.getElementBBox(this.joint.paper.findViewByModel(jointCell) as dia.ElementView)
          break
        }
        case 'loop':
          (jointCell as BlueprintNode).set('loop', node.loop)
          break
        case 'position':
          jointCell.position(node.position.x, node.position.y)
          node._bbox = this.getElementBBox(this.joint.paper.findViewByModel(jointCell) as dia.ElementView)
          break
        case 'title':
          (jointCell as BlueprintNode).title(node.title)
          break
        case 'style':
          (jointCell as BlueprintNode).setStyle(
            mergeDeep(
              ((jointCell as BlueprintNode).get('style') ?? {}) as Record<string, unknown>,
              (node.style ?? {}) as Record<string, unknown>
            ) as NodeStyle
          )
          break
        case 'inputValues':
          (jointCell as BlueprintNode).setValues(node.inputValues);
          {
            const elementView = this.joint.paper.findViewByModel(jointCell) as BlueprintNodeView
            for (const name of Object.keys(newvalue || {})) {
              elementView.refreshDomValue(name)
              node.inputs.forEach(async input => {
                if (input.editor !== 'select') return
                if (input.name === name) {
                  return
                }
                if (typeof input.options === 'function') {
                  const options = await input.options(node.inputValues)
                  if (options === input._options || !Array.isArray(options)) return
                  input._options = options
                  jointCell.get('inputs').find((i: InputPort) => i.name === input.name)._options = input._options
                  elementView.updateOptions(input.id || '', input.name, input._options || [])
                  node.inputValues = { [input.name]: input._options?.[0]?.value }
                }
              })
            }
          }
          break
        case 'inputs':
          (jointCell as BlueprintNode).set('inputs', node.inputs)
          break
        case 'outputs':
          (jointCell as BlueprintNode).set('outputs', node.outputs)
          break
      }
    })

    const listener = new mvc.Listener()

    listener.listenTo(this.joint.graph, 'node:switch:add-case', (jointNode: BlueprintNode) => {
      const instance = this.cellsMap.get(jointNode.id as string)?.cell as NodeInstanceType
      if (!instance) return
      this.addSwitchCase(instance)
    })

    listener.listenTo(this.joint.graph, 'node:values:changed', (elementView, name, value) => {
      const instance = this.cellsMap.get(elementView.model.id as string)?.cell as NodeInstanceType
      instance.inputValues = { [name]: value }
    })

    // Element click
    listener.listenTo(this.joint.paper, 'element:pointerclick', (elementView, evt) => {
      const jointNode = elementView.model as BlueprintNode
      const instance = this.cellsMap.get(jointNode.id as string)?.cell as NodeInstanceType
      if (!instance) return
      this.emit('node:click', instance, evt)
      const alreadySelected = this.selection.has(instance) && this.selection.size === 1
      if (!evt.shiftKey && alreadySelected) {
        return
      }
      if (evt.shiftKey && this.selection.has(instance)) {
        this.unselect(instance)
        this.selectionChanged()
        return
      }
      if (!evt.shiftKey) {
        this.clearSelection()
      }
      this.select(instance)
      this.selectionChanged()
    })

    // Element double click
    listener.listenTo(this.joint.paper, 'element:pointerdblclick', (elementView, evt) => {
      const jointNode = elementView.model as BlueprintNode
      const instance = this.cellsMap.get(jointNode.id as string)?.cell as NodeInstanceType
      if (!instance) return
      this.emit('node:dblclick', instance, evt)
      if (instance.subgraphId && this.graph.model.hasSubgraph(instance.subgraphId)) {
        // Subgraph double-click is navigation, not selection; clear selection and close panels.
        this.clearSelection()
        this.selectionChanged()
        this.graph.enterSubgraph(instance.subgraphId)
      }
    })

    // Blank click
    listener.listenTo(this.joint.paper, 'blank:pointerclick', (evt: MouseEvent) => {
      this.emit('blank:click', evt)
      if (!evt.shiftKey) {
        if (this.selection.size > 0) {
          this.clearSelection()
          this.selectionChanged()
        }
      }
    })

    // Blank double click
    listener.listenTo(this.joint.paper, 'blank:pointerdblclick', (evt: MouseEvent) => {
      this.emit('blank:dblclick', evt)
    })

    // Link click
    listener.listenTo(this.joint.paper, 'link:pointerclick', (linkView, evt: MouseEvent) => {
      const jointLink = linkView.model as dia.Link
      const instance = this.cellsMap.get(jointLink.id as string)?.cell as LinkInstanceType
      if (!instance) return
      this.emit('link:click', instance, evt)
      if (!evt.shiftKey && this.selection.has(instance) && this.selection.size === 1) {
        return
      }
      if (evt.shiftKey && this.selection.has(instance)) {
        this.unselect(instance)
        this.selectionChanged()
        return
      }
      if (!evt.shiftKey) {
        this.clearSelection()
      }
      this.select(instance)
      this.selectionChanged()
    })

    // Link double click
    listener.listenTo(this.joint.paper, 'link:pointerdblclick', (linkView, evt: MouseEvent) => {
      const jointLink = linkView.model as dia.Link
      const instance = this.cellsMap.get(jointLink.id as string)?.cell as LinkInstanceType
      if (!instance) return
      this.emit('link:dblclick', instance, evt)
    })

    // Link connected
    listener.listenTo(this.joint.paper, 'link:connect', (linkView) => {
      const jointLink = linkView.model as dia.Link
      const source = jointLink.source()
      const target = jointLink.target()
      const from = this.findNode(String(source.id))
      const to = this.findNode(String(target.id))
      const reversed = from?.inputs.some(port => port.id === source.port)
      const sourceNode = reversed ? to : from
      const targetNode = reversed ? from : to
      const outputEnd = reversed ? target : source
      const inputEnd = reversed ? source : target
      const output = sourceNode?.outputs.find(port => port.id === outputEnd.port)
      const input = targetNode?.inputs.find(port => port.id === inputEnd.port)
      if (!sourceNode || !targetNode || !output || !input) return
      if (reversed) jointLink.set({ source: outputEnd, target: inputEnd })

      const ends: LinkEnds = {
        source: { id: sourceNode.id, port: output.id! },
        target: { id: targetNode.id, port: input.id! },
      }
      const existing = this.findLink(jointLink.id as string)
      if (existing) {
        const before: LinkEnds = {
          source: { ...existing.source },
          target: { ...existing.target },
        }
        if (
          before.source.id === ends.source.id && before.source.port === ends.source.port &&
          before.target.id === ends.target.id && before.target.port === ends.target.port
        ) {
          return
        }
        this.graph.startTransaction()
        this.graph.undoManager.recordLinkEnds(existing, before, ends)
        this.graph.applyLinkEnds(existing, ends)
        this.graph.commitTransaction()
        return
      }

      const linkInstance = this.graph.createLinkInstance({
        id: jointLink.id as string,
        source: ends.source,
        target: ends.target,
      })
      this.cellsMap.set(linkInstance.id as string, { cell: linkInstance, jointCell: jointLink })

      // The colour is derived from the ports, so it is not stored on the link.
      this.applyLinkColor(jointLink)
      linkInstance.style = mergeDeep(linkInstance.style ?? {}, {
        strokeWidth: linkView.model.attr('line/strokeWidth')
      }) as LinkStyle

      this.graph.startTransaction()
      this.graph.model.addLinks([linkInstance])
      this.graph.commitTransaction()
    })
    
    // Selection changed
    listener.listenTo(this.joint.paper, 'selection:changed', (cells: Array<BlueprintNode | dia.Link>) => {
      this.clearSelection()
      this.selectCollection(cells.map(cell => {
        const instance = this.cellsMap.get(cell.id as string)?.cell
        return instance
      }).filter(i => !!i) as Array<NodeInstanceType | LinkInstanceType>)
      this.selectionChanged()
    })

    
    // Node drag and drop
    // let dragStart: { x: number, y: number } | null = null
    // listener.listenTo(this.joint.paper, 'element:pointerdown', (elementView) => {
    //   dragStart = { ...elementView.model.position() }
    //   this.graph.trigger('node:dragstart', this.cellsMap.get(elementView.model.id as string)?.cell as NodeInstanceType)
    // })
    // listener.listenTo(this.joint.paper, 'element:pointermove', (elementView) => {
    //   const node = this.cellsMap.get(elementView.model.id as string)?.cell as NodeInstanceType
    //   if (!node) return
    //   node._bbox = this.getElementBBox(elementView)
    //   this.graph.trigger('node:dragmove', node)
    // })
    // listener.listenTo(this.joint.paper, 'element:pointerup', (elementView) => {
    //   if (!dragStart) return
    //   const dragEnd = elementView.model.position()
    //   if (dragEnd.x !== dragStart.x || dragEnd.y !== dragStart.y) {
    //     dragStart = null
    //     const node = this.cellsMap.get(elementView.model.id as string)?.cell as NodeInstanceType
    //     if (!node) return
    //     this.graph.startTransaction()
    //     node.position = { x: dragEnd.x, y: dragEnd.y }
    //     this.graph.commitTransaction()
    //     node._bbox = this.getElementBBox(elementView)
    //     this.graph.trigger('node:dragend', node)
    //   }
    // })

    // Node mouse enter / leave
    this.joint.paper.on('cell:mouseover', (cellView, evt) => {
      if (!(cellView.model instanceof BlueprintNode)) return
      const id = cellView.model.id as string
      const instance = this.cellsMap.get(id)?.cell
      if (!instance) {
        // Ignore delayed hover events for nodes removed during subgraph switching or deletion.
        this.hoveredNodes.delete(id)
        return
      }
      if (!this.hoveredNodes.has(id)) {
        this.hoveredNodes.add(id)
        this.graph.emit('node:mouseenter', instance as NodeInstanceType, evt as unknown as MouseEvent)
      }
    })
    this.joint.paper.on('cell:mouseout', (cellView, evt) => {
      const id = cellView.model.id as string
      const mouseEvt = evt as unknown as MouseEvent
      if (this.hoveredNodes.has(id) && !cellView.el.contains(mouseEvt.relatedTarget as Node)) {
        this.hoveredNodes.delete(id)
        const instance = this.cellsMap.get(id)?.cell
        // Subgraph switching removes nodes before mouseleave; stop reporting missing instances.
        // Otherwise hover previews would read id from an undefined node.
        if (instance) this.graph.emit('node:mouseleave', instance as NodeInstanceType, mouseEvt)
      }
    })
  }

  getElementBBox(elementView: dia.ElementView) {
    const pos = elementView.model.position()
    const size = elementView.model.size()
    const scale = this.joint.scrollerController.scale
    const pan = this.joint.scrollerController.position
    const paperEl = this.joint.paper.el as HTMLElement
    const rect = paperEl.getBoundingClientRect()

    const left = rect.left + (pos.x * scale) + pan.x
    const top = rect.top + (pos.y * scale) + pan.y
    const width = size.width * scale
    const height = size.height * scale

    return { left, top, width, height, x: left, y: top }
  }
  
  selectionChanged() {
    this.graph.emit('selection:changed', Array.from(this.selection))
    this.joint.groupCells(Array.from(this.jointSelection))
    this.syncLinkEndpointTools()
  }

  /** Refresh handles after replay toggles or selection changes outside the adapter. */
  public refreshLinkEndpointTools() {
    this.syncLinkEndpointTools()
  }

  /** Endpoint handles are only available for a single selected link. */
  private syncLinkEndpointTools() {
    const selected = Array.from(this.selection)
    const link = selected.length === 1 && selected[0] instanceof Graph.LinkInstance
      ? selected[0] as LinkInstanceType
      : null
    this.joint.showLinkEndpointTools(link)
  }

  clear() {
    this.cellsMap.clear()
    this.selection.clear()
    this.jointSelection.clear()
    this.hoveredNodes.clear()
    this.discardPendingLink()
    this.joint.clear()
    this.joint.showLinkEndpointTools(null)
  }
}
