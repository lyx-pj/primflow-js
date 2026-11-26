import { dia, shapes, config, anchors, connectors, highlighters, linkTools } from '@joint/core'
import { BlueprintNode } from './nodes/BlueprintNode'
import { BlueprintNodeView } from './nodes/BlueprintNodeView'
import { ScrollerController } from './ScrollerController'
import { SelectionController } from './SelectionController'
import { GroupEffectController } from './GroupEffectController'
import type { GraphAdapter } from '..//GraphAdapter'
import type { NodeInstanceType } from '../../Graph'
import type { NodeStyle, LinkStyle } from '@lyx-pj/primflow-model'
import type { LinkEnds, LinkInstanceType } from '../../Graph'

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
      defaultConnector: (sourcePoint, targetPoint, routePoints, opt, linkView) => {
        const link = (linkView as dia.LinkView).model as dia.Link
        const source = link.source()
        const element = link.getSourceElement()
        const group = source.port === undefined ? undefined : element?.getPort(source.port)?.group
        if (group === 'in') {
          opt!.sourceDirection = connectors.curve.TangentDirections.LEFT
          opt!.targetDirection = connectors.curve.TangentDirections.RIGHT
        } else if (group === 'out') {
          opt!.sourceDirection = connectors.curve.TangentDirections.RIGHT
          opt!.targetDirection = connectors.curve.TangentDirections.LEFT
        }

        return connectors.curve(sourcePoint, targetPoint, routePoints, opt, linkView);
      },
      validateMagnet: () => {
        if (this.adapter.graph.isReplayMode()) return false
        this.adapter.graph.emit('start:connecting')
        return true
      },
      defaultLink: () => new shapes.standard.Link({
        attrs: {
          line: {
            strokeWidth: this.adapter.graph.nodeRegistry.linkStyle.strokeWidth || 1,
            stroke: this.adapter.graph.nodeRegistry.linkStyle.stroke || 'rgba(255,255,255,0.5)',
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
    const node = new custom.BlueprintNode({
      id: instance.id,
      title: instance.title ?? '',
      breakpoint: instance.breakpoint,
      executionStatus: this.adapter.graph.getNodeExecutionStatus(instance.id),
      executionPaused: this.adapter.graph.pausedNodeId === instance.id,
      position: { x: instance.position?.x ?? 0, y: instance.position?.y ?? 0 },
      style: style ?? {},
      inputs: inputs,
      outputs: outputs,
      kind: instance.kind,
      values: { ...instance.inputValues },
      editors: this.adapter.graph.editors,
      nodeRenderer: this.adapter.graph.nodeRenderers.get(instance.definitionId),
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
          stroke: style?.stroke ?? this.adapter.graph.nodeRegistry.linkStyle.stroke ?? '#ffffff',
          strokeWidth: style?.strokeWidth ?? this.adapter.graph.nodeRegistry.linkStyle.strokeWidth ?? 2,
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
        new linkTools.SourceArrowhead({ scale: 0.75 }),
        new linkTools.TargetArrowhead({ scale: 0.75 }),
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
            stroke: defaultNodeStyle.highlightStroke ?? '#0077B6',
            "stroke-width": defaultNodeStyle.highlightStrokeWidth ?? 1
          }
        })
      } else if (cell instanceof dia.Link) {
        const linkView = this.paper.findViewByModel(cell)
        if (!linkView) return
        highlighters.mask.add(linkView, 'line', 'highlighter-selected', {
          layer: dia.Paper.Layers.FRONT,
          padding: 2,
          attrs: {
            stroke: defaultLinkStyle.highlightStroke ?? '#0077B6',
            "stroke-width": defaultLinkStyle.highlightStrokeWidth ?? 1
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

  public destroy() {
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
