import { anchors, dia, shapes } from '@joint/core'
import { createObstacleAvoidingRouter, smartLinkConnector } from '../adapters/joint/linkRouting'
import {
  NodeInstance,
  defineNode,
  mergeDeep,
  normalizeStartNodes,
  type InputPort,
  type JsonGraph,
  type JsonLink,
  type JsonNode,
  type LinkStyle,
  type OutputPort,
} from '@lyx-pj/primflow-model'
import { BlueprintNode } from '../adapters/joint/nodes/BlueprintNode'
import { BlueprintNodeView } from '../adapters/joint/nodes/BlueprintNodeView'
import { createSubgraphPlaceholderRenderer } from '../adapters/joint/nodes/subgraphCard'
import { createLoopPlaceholderRenderer } from '../adapters/joint/nodes/loopCard'
import { deserializeNodes } from '../utils/serializer'
import { PREVIEW_LINK_STROKE, resolveNodeStyle } from './previewStyle'
import type { NodeInstanceType } from '../Graph'
import type { CanvasGraph } from '../ui/types'

/** Hide the construction container without skipping layout or image loading. */
const HIDDEN_STYLE = [
  'position:fixed',
  'left:-100000px',
  'top:0',
  'width:6000px',
  'height:6000px',
  'opacity:0',
  'pointer-events:none',
  'z-index:-1',
  'overflow:visible',
].join(';')

/** Paper viewport used while the preview DOM is assembled. */
const PREVIEW_PAPER_SIZE = 6000
/** Padding around the captured subgraph content, in graph units. */
export const PREVIEW_PADDING = 24
/** Wait for custom-renderer images and fonts before cloning the DOM. */
export const PREVIEW_ASSET_WAIT_MS = 250

export interface PreviewLimits {
  /** Maximum nodes drawn in one preview; defaults to 200. */
  maxNodes?: number
  /** Maximum links drawn in one preview; defaults to 400. */
  maxLinks?: number
}

export interface PreviewResult {
  svg: SVGSVGElement
  omittedNodes: number
  omittedLinks: number
}

interface PreviewAdapter {
  getNodeInstance: (id: string) => NodeInstanceType | undefined
}

interface PreviewBuildOptions extends PreviewLimits {
  waitMs?: number
}

/**
 * Select preview content deterministically.
 *
 * Reading order (top-to-bottom, then left-to-right) keeps the visible subset
 * stable when the graph is reserialized. Links whose endpoints were dropped are
 * discarded so the preview never shows dangling lines.
 */
export function selectPreviewContent(
  json: Pick<JsonGraph, 'nodes' | 'links'>,
  limits: PreviewLimits = {},
): { nodes: JsonNode[]; links: JsonLink[]; omittedNodes: number; omittedLinks: number } {
  const maxNodes = Math.max(1, limits.maxNodes ?? 200)
  const maxLinks = Math.max(0, limits.maxLinks ?? 400)
  const ordered = [...json.nodes].sort((a, b) =>
    a.position.y - b.position.y || a.position.x - b.position.x)
  const nodes = ordered.slice(0, maxNodes)
  const kept = new Set(nodes.map((node) => node.id))
  const links = json.links
    .filter((link) => kept.has(link.source.id) && kept.has(link.target.id))
    .slice(0, maxLinks)
  return {
    nodes,
    links,
    omittedNodes: json.nodes.length - nodes.length,
    omittedLinks: json.links.length - links.length,
  }
}

function linkStyleOf(mainGraph: CanvasGraph, link: JsonLink): LinkStyle {
  return mergeDeep(
    (mainGraph.nodeRegistry.linkStyle ?? {}) as Record<string, unknown>,
    (link.style ?? {}) as Record<string, unknown>,
  ) as LinkStyle
}

function fillPortIds(nodes: NodeInstanceType[]) {
  for (const node of nodes) {
    // Port IDs only need to be unique within one node; links reference the node id too.
    const used = new Set<string>()
    for (const [index, port] of [...node.inputs, ...node.outputs].entries()) {
      if (port.id && !used.has(port.id)) {
        used.add(port.id)
        continue
      }
      let id = `preview-${node.id}-${index}`
      let suffix = 0
      while (used.has(id)) id = `preview-${node.id}-${index}-${++suffix}`
      port.id = id
      used.add(id)
    }
  }
}

/**
 * Build a generic node for a definition this canvas does not know.
 *
 * The preview still shows its title, ports, and links instead of dropping it.
 */
function placeholderInstance(mainGraph: CanvasGraph, jsonNode: JsonNode): NodeInstanceType {
  const inputs = (jsonNode.inputs ?? []).map((port) => ({ ...port, type: port.type ?? 'any' })) as InputPort[]
  const outputs = (jsonNode.outputs ?? []).map((port) => ({ ...port, type: port.type ?? 'any' })) as OutputPort[]
  const PlaceholderNode = defineNode({
    definition: {
      name: jsonNode.definitionId,
      kind: jsonNode.kind || 'default',
      inputs: inputs as never,
      outputs: outputs as never,
      style: {},
    },
  })
  return new NodeInstance(PlaceholderNode, {
    id: jsonNode.id,
    position: jsonNode.position,
    title: jsonNode.title,
    kind: jsonNode.kind,
    inputValues: jsonNode.inputValues,
    inputs,
    outputs,
    breakpoint: false,
    collapsed: jsonNode.collapsed,
    targetGraphId: jsonNode.targetGraphId,
  } as never, mainGraph.nodeRegistry.dataTypes) as NodeInstanceType
}

function previewAdapter(instances: Map<string, NodeInstanceType>): PreviewAdapter {
  return {
    getNodeInstance: (id: string) => instances.get(id),
  }
}

/**
 * Build a preview DOM for one subgraph JSON without touching the main graph.
 *
 * The preview is rendered in a hidden JointJS paper that shares the main
 * graph's node registry, editors, and node renderers, so custom node cards and
 * port controls look like the canvas. Nested subgraph nodes use the generic
 * placeholder renderer: previews never recurse.
 */
export async function buildPreview(
  mainGraph: CanvasGraph,
  json: Pick<JsonGraph, 'nodes' | 'links'>,
  options: PreviewBuildOptions = {},
): Promise<PreviewResult | null> {
  const selected = selectPreviewContent(json, options)
  if (selected.nodes.length === 0) return null

  const normalized = normalizeStartNodes(selected.nodes, selected.links, { keepDataPorts: true })
  const container = document.createElement('div')
  container.style.cssText = HIDDEN_STYLE
  document.body.appendChild(container)
  let paper: dia.Paper | null = null

  try {
    const instances = new Map<string, NodeInstanceType>()
    const diaGraph = new dia.Graph({
      language: mainGraph.options.language ?? 'en',
      canvasGraph: mainGraph,
      adapter: previewAdapter(instances),
    })
    paper = new dia.Paper({
      el: container,
      model: diaGraph,
      cellViewNamespace: { custom: { BlueprintNode, BlueprintNodeView } },
      width: PREVIEW_PAPER_SIZE,
      height: PREVIEW_PAPER_SIZE,
      async: false,
      gridSize: 1,
      drawGrid: false,
      interactive: false,
      linkPinning: false,
      sorting: dia.Paper.sorting.NONE,
      defaultConnectionPoint: { name: 'anchor' },
      defaultAnchor: (view, magnet, ...rest) => {
        const group = view.findAttribute('port-group', magnet)
        const anchorFn = group === 'in' ? anchors.left : anchors.right
        return anchorFn(view, magnet, ...rest)
      },
      defaultRouter: createObstacleAvoidingRouter(diaGraph),
      defaultConnector: (sourcePoint, targetPoint, routePoints, opt, linkView) =>
        smartLinkConnector(sourcePoint, targetPoint, routePoints, opt, linkView as dia.LinkView),
      defaultLink: () => new shapes.standard.Link({
        attrs: {
          line: {
            stroke: mainGraph.nodeRegistry.linkStyle?.stroke ?? PREVIEW_LINK_STROKE,
            strokeWidth: mainGraph.nodeRegistry.linkStyle?.strokeWidth ?? 1,
            targetMarker: { type: 'none' },
          },
        },
      }),
    })

    // Build node instances without touching the main model. Unknown definitions
    // become generic nodes so the preview still shows their title, ports, and links.
    const previewInstances: NodeInstanceType[] = []
    for (const jsonNode of normalized.nodes) {
      try {
        const [instance] = deserializeNodes(mainGraph as never, [jsonNode])
        if (instance) previewInstances.push(instance)
      } catch {
        previewInstances.push(placeholderInstance(mainGraph, jsonNode))
      }
    }
    if (previewInstances.length === 0) return null
    fillPortIds(previewInstances)

    const sorted = [...previewInstances].sort((a, b) =>
      a.position.y - b.position.y || a.position.x - b.position.x)
    const minX = Math.min(...sorted.map((node) => node.position.x))
    const minY = Math.min(...sorted.map((node) => node.position.y))
    const offsetX = PREVIEW_PADDING - minX
    const offsetY = PREVIEW_PADDING - minY
    const placed = new Map<string, { instance: NodeInstanceType; joint: BlueprintNode }>()

    for (const instance of sorted) {
      // Container calls inside a preview never recurse; loop and subgraph cards
      // both become generic labelled cards.
      const renderer = instance.kind === 'subgraph'
        ? createSubgraphPlaceholderRenderer(mainGraph, instance)
        : instance.kind === 'loop'
          ? createLoopPlaceholderRenderer(mainGraph, instance)
          : mainGraph.nodeRenderers.get(instance.definitionId)
      const joint = new BlueprintNode({
        id: instance.id,
        title: instance.title ?? '',
        // Previews are static appearance only; no breakpoint or execution state.
        breakpoint: false,
        collapsed: instance.collapsed,
        executionStatus: 'idle',
        executionPaused: false,
        position: { x: instance.position.x + offsetX, y: instance.position.y + offsetY },
        style: resolveNodeStyle(mainGraph, instance),
        inputs: instance.inputs,
        outputs: instance.outputs,
        kind: instance.kind,
        values: { ...instance.inputValues },
        editors: mainGraph.editors,
        nodeRenderer: renderer,
      }) as BlueprintNode
      diaGraph.addCell(joint)
      instances.set(instance.id, instance)
      placed.set(instance.id, { instance, joint })
    }

    for (const jsonLink of selected.links) {
      const source = placed.get(jsonLink.source.id)
      const target = placed.get(jsonLink.target.id)
      if (!source || !target) continue
      const style = linkStyleOf(mainGraph, jsonLink)
      const link = new shapes.standard.Link({
        id: jsonLink.id,
        source: { id: jsonLink.source.id, port: jsonLink.source.port },
        target: { id: jsonLink.target.id, port: jsonLink.target.port },
        attrs: {
          line: {
            stroke: style.stroke ?? PREVIEW_LINK_STROKE,
            strokeWidth: style.strokeWidth ?? 1,
            targetMarker: { type: 'none' },
          },
        },
      })
      diaGraph.addCell(link)
    }

    await new Promise((resolve) => setTimeout(resolve, options.waitMs ?? PREVIEW_ASSET_WAIT_MS))

    const bbox = paper.getContentBBox()
    const padding = PREVIEW_PADDING
    const viewBox = {
      x: bbox.x - padding,
      y: bbox.y - padding,
      width: Math.max(1, bbox.width + padding * 2),
      height: Math.max(1, bbox.height + padding * 2),
    }
    const svg = paper.svg.cloneNode(true) as SVGSVGElement
    svg.removeAttribute('width')
    svg.removeAttribute('height')
    svg.style.position = 'absolute'
    svg.style.inset = '0'
    svg.setAttribute('viewBox', `${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`)
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet')
    svg.setAttribute('aria-hidden', 'true')
    svg.classList.add('bpgraph-subgraph-preview-svg')
    // Strip interactive port metadata from decorative thumbnails so queries and
    // hover tooltips on the host call card target only the card's own ports.
    for (const el of svg.querySelectorAll('[data-port-kind], [data-port-type], [magnet]')) {
      el.removeAttribute('data-port-kind')
      el.removeAttribute('data-port-type')
      el.removeAttribute('data-port-name')
      el.removeAttribute('data-port-label')
      el.removeAttribute('data-port-direction')
      el.removeAttribute('magnet')
    }

    return {
      svg,
      omittedNodes: selected.omittedNodes,
      omittedLinks: selected.omittedLinks,
    }
  } finally {
    try {
      paper?.remove()
    } finally {
      container.remove()
    }
  }
}
