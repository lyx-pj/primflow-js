import { dia, shapes, config, anchors, highlighters, linkTools } from '@joint/core'
import { BlueprintNode } from './nodes/BlueprintNode'
import { BlueprintNodeView } from './nodes/BlueprintNodeView'
import { ScrollerController } from './ScrollerController'
import { SelectionController } from './SelectionController'
import { GroupEffectController } from './GroupEffectController'
import { createSubgraphCardRenderer } from './nodes/subgraphCard'
import { createLoopCardRenderer } from './nodes/loopCard'
import { createObstacleAvoidingRouter, rectsIntersect, smartLinkConnector, type Rect2D } from './linkRouting'
import { resolveLinkColor } from '../../utils/portColors'
import type { GraphAdapter } from '..//GraphAdapter'
import type { NodeInstanceType } from '../../Graph'
import type { NodeStyle, LinkStyle } from '@lyx-pj/primflow-model'
import type { LinkEnds, LinkInstanceType } from '../../Graph'
import type { CanvasGraph } from '../../ui/types'

config.classNamePrefix = 'bpgraph-'

/**
 * Attributes for the transparent link hit path.
 *
 * JointJS draws a 10px invisible wrapper over every link for pointer events and
 * gives it round end caps. A round cap reaches 5px past the port anchor and
 * covers the outer half of a connected port, stealing its hover and drag. A
 * butt cap ends the hit path where the visible line ends, so the port keeps the
 * pointer while the rest of the link stays easy to select.
 */
const LINK_WRAPPER_ATTRS = { strokeLinecap: 'butt' as const }
const REROUTE_DIRTY_PAD = 60

const LINK_ENDPOINT_HANDLE_CHILDREN: dia.MarkupJSON = [
  {
    tagName: 'circle',
    selector: 'hit',
    attributes: { r: 11, fill: 'transparent', stroke: 'none' },
  },
  {
    tagName: 'circle',
    selector: 'halo',
    className: 'bpgraph-link-handle-halo',
    attributes: { r: 8.5 },
  },
  {
    tagName: 'circle',
    selector: 'knob',
    className: 'bpgraph-link-handle-knob',
    attributes: { r: 5 },
  },
  {
    tagName: 'circle',
    selector: 'core',
    className: 'bpgraph-link-handle-core',
    attributes: { r: 2 },
  },
]

const SourceEndpointHandle = linkTools.SourceArrowhead.extend({
  tagName: 'g',
  attributes: {
    class: 'source-arrowhead bpgraph-link-handle',
    cursor: 'grab',
  },
  children: LINK_ENDPOINT_HANDLE_CHILDREN,
  render() {
    this.renderChildren()
    return this
  },
})

const TargetEndpointHandle = linkTools.TargetArrowhead.extend({
  tagName: 'g',
  attributes: {
    class: 'target-arrowhead bpgraph-link-handle',
    cursor: 'grab',
  },
  children: LINK_ENDPOINT_HANDLE_CHILDREN,
  render() {
    this.renderChildren()
    return this
  },
})

export const custom = {
  BlueprintNode,
  BlueprintNodeView
} as const

const namespace = { custom, standard: shapes.standard };

type JointLinkEnd = { id?: string; port?: string; x?: number; y?: number }

interface IJointGraph {}

export class JointGraph implements IJointGraph {
  public graph: dia.Graph
  public paper: dia.Paper
  public scrollerController!: ScrollerController
  public selectionController!: SelectionController
  public groupEffectController!: GroupEffectController
  public adapter: GraphAdapter
  private readonly linkEndpointTools = new Map<string, dia.ToolsView>()
  private readonly pendingLinks = new Map<string, dia.Link>()
  private rerouteRafId: number | null = null
  private rerouteAllLinks = false
  private readonly dirtyElementIds = new Set<string>()
  private readonly dirtyRects: Rect2D[] = []
  constructor(adapter: GraphAdapter, options: dia.Paper.Options) {
    this.adapter = adapter
    this.graph = new dia.Graph({
      language: adapter.graph.options.language ?? 'en',
      // The canvas graph and its adapter let views reach node instances.
      canvasGraph: adapter.graph,
      adapter,
    })
    this.paper = new dia.Paper({
      model: this.graph,
      cellViewNamespace: namespace,
      frozen: false,
      async: true,
      clickThreshold: 5,
      snapLinks: { radius: 20 },
      linkPinning: false,
      preventDefaultViewAction: false,
      preventDefaultBlankAction: false,
      sorting: dia.Paper.sorting.APPROX,
      interactive: function(cellView) {
        return cellView.model.isElement()
      },
      defaultAnchor: (view, magnet, ...rest) => {
        const group = view.findAttribute("port-group", magnet);
        const anchorFn = group === "in" ? anchors.left : anchors.right;
        return anchorFn(view, magnet, ...rest);
      },
      defaultConnectionPoint: {
        name: "anchor"
      },
      defaultRouter: createObstacleAvoidingRouter(this.graph),
      defaultConnector: (sourcePoint, targetPoint, routePoints, opt, linkView) =>
        smartLinkConnector(sourcePoint, targetPoint, routePoints, opt, linkView as dia.LinkView),
      validateMagnet: () => {
        if (this.adapter.graph.isReplayMode()) return false
        this.adapter.graph.emit('start:connecting')
        return true
      },
      defaultLink: (cellView, magnet) => new shapes.standard.Link({
        attrs: {
          line: {
            strokeWidth: this.adapter.graph.nodeRegistry.linkStyle.strokeWidth ?? 1.75,
            stroke: this.resolveDragLinkStroke(cellView, magnet),
            targetMarker: { type: 'none' }
          },
          wrapper: { ...LINK_WRAPPER_ATTRS }
        }
      }),
      validateConnection: (sourceView, sourceMagnet, targetView, targetMagnet) => {
        if (sourceView === targetView) {
          return false;
        }

        const target = targetView.model
        if (target.isLink()) {
          return false
        }

        const sourceGroup = sourceView.findAttribute("port-group", sourceMagnet)
        const targetGroup = targetView.findAttribute("port-group", targetMagnet)
        if ((sourceGroup !== 'in' && sourceGroup !== 'out') ||
            (targetGroup !== 'in' && targetGroup !== 'out') || sourceGroup === targetGroup) return false

        const sourcePortId = sourceView.findAttribute('port', sourceMagnet)
        const targetPortId = targetView.findAttribute('port', targetMagnet)
        const sourceNode = this.adapter.findNode(sourceView.model.id as string) as NodeInstanceType
        const targetNode = this.adapter.findNode(targetView.model.id as string) as NodeInstanceType
        const outputNode = sourceGroup === 'out' ? sourceNode : targetNode
        const inputNode = sourceGroup === 'out' ? targetNode : sourceNode
        const output = outputNode?.outputs.find(port => port.id === (sourceGroup === 'out' ? sourcePortId : targetPortId))
        const input = inputNode?.inputs.find(port => port.id === (sourceGroup === 'out' ? targetPortId : sourcePortId))
        return Boolean(output && input && this.adapter.graph.validateConnection(outputNode, output, inputNode, input))
      },
      ...options
    })
    
    this.initialize()
  }

  public initialize() {
    this.scrollerController = new ScrollerController({
      paper: this.paper,
      graph: this.adapter.graph
    })
    this.selectionController = new SelectionController({
      paper: this.paper,
      onSelected: (cells) => {
        this.paper.trigger('selection:changed', cells as Array<BlueprintNode | shapes.standard.Link>)
      }
    })
    this.groupEffectController = new GroupEffectController({
      adapter: this.adapter,
      paper: this.paper,
      className: 'selection-rectangle'
    })
    this.initializeControllers()

    this.paper.on('link:connect', (linkView) => {
      const source = linkView.model.get('source')
      const target = linkView.model.get('target')
      const sourceNodeView = this.paper.findViewByModel(source.id) as BlueprintNodeView
      const targetNodeView = this.paper.findViewByModel(target.id) as BlueprintNodeView
      const sourcePortId = source.port as string
      const targetPortId = target.port as string

      if (sourceNodeView && sourcePortId && targetNodeView && targetPortId) {
        sourceNodeView.highlightPort(sourcePortId)
        targetNodeView.highlightPort(targetPortId)
      }
    })

    // Keep dragged wire colour identical to its committed colour as soon as it snaps to a port.
    this.paper.on('link:snap:connect', (linkView: dia.LinkView) => {
      this.syncDraftLinkStroke(linkView.model)
    })
    this.paper.on('link:snap:disconnect', (linkView: dia.LinkView) => {
      this.syncDraftLinkStroke(linkView.model)
    })

    this.graph.on('remove', (cell) => {
      if (cell.isLink()) {
        const link = cell as dia.Link

        const source = link.get('source')
        const target = link.get('target')

        const sourceNodeView = this.paper.findViewByModel(source.id) as BlueprintNodeView
        const targetNodeView = this.paper.findViewByModel(target.id) as BlueprintNodeView
        const sourcePortId = source.port as string
        const targetPortId = target.port as string
        if (!sourcePortId || !targetPortId) return

        const sourceLinks = this.graph.getConnectedLinks(sourceNodeView.model, { inbound: true, outbound: true })
        const targetLinks = this.graph.getConnectedLinks(targetNodeView.model, { inbound: true, outbound: true })

        const stillConnectedFromSource = sourceLinks.some(l => 
          l.get('source').port === sourcePortId || l.get('target').port === sourcePortId
        )
        const stillConnectedFromTarget = targetLinks.some(l => 
          l.get('source').port === targetPortId || l.get('target').port === targetPortId
        )

        if (sourceNodeView && sourcePortId && !stillConnectedFromSource) {
          sourceNodeView.unhighlightPort(sourcePortId)
        }
        if (targetNodeView && targetPortId && !stillConnectedFromTarget) {
          targetNodeView.unhighlightPort(targetPortId)
        }
      } else if (cell.isElement()) {
        this.scheduleLinkReroute()
      }
    })

    // Re-route affected links when a node moves/resizes, or all links when a node enters the graph.
    this.graph.on('change:position change:size', (cell: dia.Cell) => {
      if (cell.isElement()) {
        this.scheduleElementLinkReroute(cell)
      }
    })
    this.graph.on('add', (cell: dia.Cell) => {
      if (cell.isElement()) {
        this.scheduleLinkReroute()
      }
    })
  }

  private scheduleElementLinkReroute(el: dia.Element) {
    const curr = el.getBBox()
    const prevPos = (el.previous('position') as { x?: number; y?: number } | undefined) ?? el.position()
    const prevSize = (el.previous('size') as { width?: number; height?: number } | undefined) ?? el.size()
    const prev: Rect2D = {
      x: typeof prevPos?.x === 'number' ? prevPos.x : curr.x,
      y: typeof prevPos?.y === 'number' ? prevPos.y : curr.y,
      width: typeof prevSize?.width === 'number' ? prevSize.width : curr.width,
      height: typeof prevSize?.height === 'number' ? prevSize.height : curr.height,
    }
    this.dirtyElementIds.add(String(el.id))
    this.dirtyRects.push(
      {
        x: curr.x - REROUTE_DIRTY_PAD,
        y: curr.y - REROUTE_DIRTY_PAD,
        width: curr.width + REROUTE_DIRTY_PAD * 2,
        height: curr.height + REROUTE_DIRTY_PAD * 2,
      },
      {
        x: prev.x - REROUTE_DIRTY_PAD,
        y: prev.y - REROUTE_DIRTY_PAD,
        width: prev.width + REROUTE_DIRTY_PAD * 2,
        height: prev.height + REROUTE_DIRTY_PAD * 2,
      }
    )
    this.enqueueLinkReroute()
  }

  private scheduleLinkReroute() {
    this.rerouteAllLinks = true
    this.enqueueLinkReroute()
  }

  private enqueueLinkReroute() {
    if (this.rerouteRafId !== null || typeof requestAnimationFrame === 'undefined') return
    if (!this.paper.el?.isConnected) return
    if (this.graph.getLinks().length === 0) return
    this.rerouteRafId = requestAnimationFrame(() => {
      this.rerouteRafId = null
      const rerouteAll = this.rerouteAllLinks
      const dirtyIds = new Set(this.dirtyElementIds)
      const dirtyRects = this.dirtyRects.splice(0, this.dirtyRects.length)
      this.rerouteAllLinks = false
      this.dirtyElementIds.clear()
      if (!this.paper.el?.isConnected) return
      for (const link of this.graph.getLinks()) {
        const view = this.paper.findViewByModel(link) as dia.LinkView | undefined
        if (!view) continue
        if (!rerouteAll) {
          const sourceId = link.source().id
          const targetId = link.target().id
          const touchesDirtyEndpoint =
            (sourceId !== undefined && dirtyIds.has(String(sourceId))) ||
            (targetId !== undefined && dirtyIds.has(String(targetId)))
          if (!touchesDirtyEndpoint) {
            const connBBox = view.getConnection()?.bbox()
            if (connBBox) {
              const linkRect: Rect2D = {
                x: connBBox.x,
                y: connBBox.y,
                width: connBBox.width,
                height: connBBox.height,
              }
              if (!dirtyRects.some((dirty) => rectsIntersect(linkRect, dirty))) continue
            }
          }
        }
        view.requestConnectionUpdate()
      }
    })
  }

  initializeControllers() {
    if (this.paper.el) {
      this.scrollerController.stopListening()
      this.selectionController.stopListening()
      this.groupEffectController.stopListening()
      this.scrollerController.startListening()
      this.selectionController.startListening()
      this.groupEffectController.startListening()
      this.paper.el.removeEventListener('keydown', this.onKeyDown)
      this.paper.el.removeEventListener('keyup', this.onKeyUp)
      this.paper.el.addEventListener('keydown', this.onKeyDown)
      this.paper.el.addEventListener('keyup', this.onKeyUp)
    }
  }

  public addNode(instance: NodeInstanceType, style?: NodeStyle) {
    const inputs = instance.inputs
    const outputs = instance.outputs
    const appRenderer = this.adapter.graph.nodeRenderers.get(instance.definitionId)
    // Container call nodes use a card unless the application registered its own renderer.
    const nodeRenderer = appRenderer ?? (instance.kind === 'subgraph'
      ? createSubgraphCardRenderer(this.adapter.graph as unknown as CanvasGraph, instance)
      : instance.kind === 'loop'
        ? createLoopCardRenderer(this.adapter.graph as unknown as CanvasGraph, instance)
        : undefined)

    const node = new custom.BlueprintNode({
      id: instance.id,
      title: instance.title ?? '',
      breakpoint: instance.breakpoint,
      collapsed: instance.collapsed,
      executionStatus: this.adapter.graph.getNodeExecutionStatus(instance.id),
      executionPaused: this.adapter.graph.pausedNodeId === instance.id,
      position: { x: instance.position?.x ?? 0, y: instance.position?.y ?? 0 },
      style: style ?? {},
      inputs: inputs,
      outputs: outputs,
      kind: instance.kind,
      values: { ...instance.inputValues },
      loop: instance.loop,
      editors: this.adapter.graph.editors,
      nodeRenderer,
    }) as BlueprintNode
    this.graph.addCell(node)
    return node
  }

  public setContainer(container: HTMLElement) {
    this.paper.setElement(container)
    this.paper.render()
    // Remount existing nodes after rebuilding Paper layers so initial Start nodes remain visible after React mounting.
    this.graph.resetCells(this.graph.getCells())
    this.initializeControllers()
  }

  public addLink(link: LinkInstanceType, style?: LinkStyle) {
    const jointLink = this.createLinkModel(
      link.id,
      { id: link.source.id, port: link.source.port },
      { id: link.target.id, port: link.target.port },
      style
    )

    const source = jointLink.get('source')
    const target = jointLink.get('target')

    const sourceNodeView = this.paper.findViewByModel(source.id) as BlueprintNodeView
    const targetNodeView = this.paper.findViewByModel(target.id) as BlueprintNodeView
    const sourcePortId = source.port as string
    const targetPortId = target.port as string

    if (sourceNodeView && sourcePortId && targetNodeView && targetPortId) {
      sourceNodeView.highlightPort(sourcePortId)
      targetNodeView.highlightPort(targetPortId)
    }

    this.graph.addCell(jointLink)
    return jointLink
  }

  private resolvePortType(nodeId?: string, portId?: string): string | undefined {
    if (!nodeId || !portId) return undefined
    const node = this.adapter.findNode(nodeId)
    if (!node) return undefined
    const port =
      node.outputs.find((p) => p.id === portId) ??
      node.inputs.find((p) => p.id === portId)
    return port?.type
  }

  private resolveDragLinkStroke(cellView?: dia.CellView, magnet?: SVGElement): string {
    const fallback = this.adapter.graph.nodeRegistry.linkStyle.stroke || 'rgba(203, 213, 225, 0.55)'
    if (!cellView || !magnet) return fallback
    const portId = cellView.findAttribute('port', magnet) ?? undefined
    const portType = this.resolvePortType(String(cellView.model.id), portId)
    if (!portType) return fallback
    return resolveLinkColor(
      this.adapter.graph.nodeRegistry.nodeStyle.ports?.colors,
      fallback,
      portType,
      portType
    )
  }

  private syncDraftLinkStroke(link: dia.Link) {
    const fallback = this.adapter.graph.nodeRegistry.linkStyle.stroke || 'rgba(203, 213, 225, 0.55)'
    const source = link.source()
    const target = link.target()
    const sourceType = this.resolvePortType(
      source.id !== undefined ? String(source.id) : undefined,
      source.port !== undefined ? String(source.port) : undefined
    )
    const targetType = this.resolvePortType(
      target.id !== undefined ? String(target.id) : undefined,
      target.port !== undefined ? String(target.port) : undefined
    )
    if (!sourceType && !targetType) return
    const stroke = resolveLinkColor(
      this.adapter.graph.nodeRegistry.nodeStyle.ports?.colors,
      fallback,
      sourceType ?? targetType ?? 'any',
      targetType ?? sourceType ?? 'any'
    )
    link.attr('line/stroke', stroke)
  }

  private createLinkModel(
    id: string | undefined,
    source: JointLinkEnd,
    target: JointLinkEnd,
    style?: LinkStyle
  ): dia.Link {
    return new shapes.standard.Link({
      id,
      source,
      target,
      attrs: {
        line: {
          stroke: style?.stroke ?? this.adapter.graph.nodeRegistry.linkStyle.stroke ?? '#e2e8f0',
          strokeWidth: style?.strokeWidth ?? this.adapter.graph.nodeRegistry.linkStyle.strokeWidth ?? 1.75,
          targetMarker: { type: 'none' }
        },
        wrapper: { ...LINK_WRAPPER_ATTRS }
      }
    }) as dia.Link
  }

  /** Draw a temporary link while the add-and-connect palette is open. */
  public addPendingLink(id: string, source: JointLinkEnd, target: JointLinkEnd, style?: LinkStyle) {
    const existing = this.pendingLinks.get(id)
    if (existing) this.graph.removeCells([existing])
    const jointLink = this.createLinkModel(id, source, target, style)
    this.graph.addCell(jointLink)
    this.pendingLinks.set(id, jointLink)
    return jointLink
  }

  /** Promote a pending link without recreating its JointJS cell. */
  public releasePendingLink(id: string) {
    const link = this.pendingLinks.get(id)
    this.pendingLinks.delete(id)
    return link
  }

  /** Remove a pending link that the user cancelled. */
  public discardPendingLink(id: string) {
    const link = this.pendingLinks.get(id)
    this.pendingLinks.delete(id)
    if (link) this.graph.removeCells([link])
  }

  /**
   * Show source/target handles on a single selected link.
   *
   * Handles are selection-scoped so they never cover a port during ordinary
   * connection dragging. Replay mode has no editable endpoints.
   */
  public showLinkEndpointTools(link: LinkInstanceType | null) {
    const selectedId = this.adapter.graph.isReplayMode() ? null : link?.id ?? null
    for (const id of [...this.linkEndpointTools.keys()]) {
      if (id === selectedId) continue
      const view = this.paper.findViewByModel(id)
      if (view) view.removeTools()
      this.linkEndpointTools.delete(id)
    }
    if (!selectedId || this.linkEndpointTools.has(selectedId)) return

    const jointLink = this.adapter.cellsMap.get(selectedId)?.jointCell
    if (!(jointLink instanceof dia.Link)) return
    const view = this.paper.findViewByModel(jointLink) as dia.LinkView | undefined
    if (!view) return

    const tools = new dia.ToolsView({
      tools: [
        new SourceEndpointHandle(),
        new TargetEndpointHandle(),
      ],
    })
    view.addTools(tools)
    this.linkEndpointTools.set(selectedId, tools)
  }

  /** Reconcile port highlights after a link endpoint changes. */
  public syncPortHighlights(ends: LinkEnds) {
    for (const end of [ends.source, ends.target]) {
      const view = this.paper.findViewByModel(end.id) as BlueprintNodeView | undefined
      if (!view || !end.port) continue
      const used = this.adapter.graph.getLinks().some((link) =>
        (link.source.id === end.id && link.source.port === end.port) ||
        (link.target.id === end.id && link.target.port === end.port)
      )
      if (used) view.highlightPort(end.port)
      else view.unhighlightPort(end.port)
    }
  }

  private removeLinkEndpointTools(id: string) {
    const tools = this.linkEndpointTools.get(id)
    if (!tools) return
    const view = this.paper.findViewByModel(id)
    if (view) view.removeTools()
    this.linkEndpointTools.delete(id)
  }

  public removeCells(cells: dia.Cell[]) {
    for (const cell of cells) {
      if (cell.isLink()) this.removeLinkEndpointTools(cell.id as string)
    }
    this.graph.removeCells(cells)
    this.ungroupCells(cells as Array<dia.Element | dia.Link>)
  }

  public findNode(id: string) {
    return this.graph.getCell(id) as BlueprintNode
  }

  public highlightCells(cells: dia.Cell[]) {
    const defaultNodeStyle = this.adapter.graph.nodeRegistry.nodeStyle
    const defaultLinkStyle = this.adapter.graph.nodeRegistry.linkStyle
    cells.forEach(cell => {
      if (cell instanceof dia.Element) {
        const elementView = this.paper.findViewByModel(cell)
        if (!elementView) return
        // A custom renderer may not draw the built-in body, so it keeps a
        // transparent selection shape for the highlighter.
        const selector = (cell as BlueprintNode).get('nodeRenderer')
          ? 'base-node-selection'
          : 'base-node-body'
        highlighters.mask.add(elementView, selector, 'highlighter-selected', {
          layer: dia.Paper.Layers.FRONT,
          padding: 2,
          attrs: {
            stroke: defaultNodeStyle.highlightStroke ?? '#38bdf8',
            "stroke-width": defaultNodeStyle.highlightStrokeWidth ?? 1.5
          }
        })
      } else if (cell instanceof dia.Link) {
        const linkView = this.paper.findViewByModel(cell)
        if (!linkView) return
        highlighters.mask.add(linkView, 'line', 'highlighter-selected', {
          layer: dia.Paper.Layers.FRONT,
          padding: 2,
          attrs: {
            stroke: defaultLinkStyle.highlightStroke ?? '#38bdf8',
            "stroke-width": defaultLinkStyle.highlightStrokeWidth ?? 1.5
          }
        })
      }
    })
  }

  public unhighlightCells(cells: dia.Cell[]) {
    cells.forEach(cell => {
      if (cell instanceof dia.Element) {
        const elementView = this.paper.findViewByModel(cell)
        if (!elementView) return
        highlighters.mask.remove(elementView)
      } else if (cell instanceof dia.Link) {
        const linkView = this.paper.findViewByModel(cell)
        if (!linkView) return
        highlighters.mask.remove(linkView)
      }
    })
  }

  public groupCells(cells: Array<dia.Element | dia.Link>) {
    this.groupEffectController.groupCells(cells)
  }

  public ungroupCells(cells: Array<dia.Element | dia.Link>) {
    this.groupEffectController.ungroupCells(cells)
  }

  public clearGroups() {
    this.groupEffectController.clearGroups()
  }

  public clearHighlights() {
    highlighters.mask.removeAll(this.paper)
  }

  private cancelLinkReroute() {
    if (this.rerouteRafId !== null && typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(this.rerouteRafId)
      this.rerouteRafId = null
    }
    this.rerouteAllLinks = false
    this.dirtyElementIds.clear()
    this.dirtyRects.length = 0
  }

  public destroy() {
    this.cancelLinkReroute()
    this.scrollerController.stopListening()
    this.selectionController.stopListening()
    this.groupEffectController.stopListening()
    this.linkEndpointTools.clear()
    this.pendingLinks.clear()
    this.graph.clear()
    this.paper.remove()
    window.removeEventListener('keydown', this.onKeyDown)
    window.removeEventListener('keyup', this.onKeyUp)
  }

  public clear() {
    this.cancelLinkReroute()
    this.linkEndpointTools.clear()
    this.pendingLinks.clear()
    this.graph.clear()
    this.clearHighlights()
  }

  private onKeyDown = (e: KeyboardEvent) => {
    if (e.code === 'Space') {
      this.selectionController.stopListening()
    }
  }

  private onKeyUp = (e: KeyboardEvent) => {
    if (e.code === 'Space') {
      this.selectionController.startListening()
    }
  }
}
