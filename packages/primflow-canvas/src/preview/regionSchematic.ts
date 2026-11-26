import { isSpacerPort } from '@lyx-pj/primflow-model'
import type { NodeInstanceType, LinkInstanceType } from '../Graph'
import type { CanvasGraph } from '../ui/types'
import { containerCardSize } from '../adapters/joint/nodes/containerCard'
import { resolveNodeStyle } from './previewStyle'

/** Nodes drawn in one schematic; deliberately lower than the full preview cap. */
export const SCHEMATIC_MAX_NODES = 80
/** Links drawn in one schematic. */
export const SCHEMATIC_MAX_LINKS = 160

const SCHEMATIC_PADDING = 16
const STANDARD_NODE_WIDTH = 180
const STANDARD_NODE_BASE_HEIGHT = 44
const STANDARD_NODE_ROW_HEIGHT = 12
const STANDARD_NODE_MAX_ROWS = 6
const FALLBACK_NODE_COLOR = '#64748b'

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg'

const KIND_FALLBACK_COLORS: Record<string, string> = {
  start: '#4CAF50',
  end: '#F44336',
  subgraph: '#2196F3',
  loop: '#7c3aed',
  'loop-entry': '#6d28d9',
  'loop-return': '#b45309',
}

export interface RegionSchematicOptions {
  /** Maximum nodes drawn; defaults to `SCHEMATIC_MAX_NODES`. */
  maxNodes?: number
  /** Maximum links drawn; defaults to `SCHEMATIC_MAX_LINKS`. */
  maxLinks?: number
}

export interface RegionSchematicSource {
  nodes: readonly NodeInstanceType[]
  links: readonly LinkInstanceType[]
}

interface Frame {
  x: number
  y: number
  width: number
  height: number
}

/**
 * Select schematic content in reading order.
 *
 * The same deterministic order as the full preview keeps the first frame
 * stable when the graph is serialized again.
 */
export function selectSchematicContent(
  region: RegionSchematicSource,
  options: RegionSchematicOptions = {},
): { nodes: NodeInstanceType[]; links: LinkInstanceType[] } {
  const maxNodes = Math.max(1, options.maxNodes ?? SCHEMATIC_MAX_NODES)
  const maxLinks = Math.max(0, options.maxLinks ?? SCHEMATIC_MAX_LINKS)
  const ordered = [...region.nodes].sort((a, b) =>
    a.position.y - b.position.y || a.position.x - b.position.x)
  const nodes = ordered.slice(0, maxNodes)
  const kept = new Set(nodes.map((node) => node.id))
  const links = region.links
    .filter((link) => kept.has(link.source.id) && kept.has(link.target.id))
    .slice(0, maxLinks)
  return { nodes, links }
}

function svgElement<K extends keyof SVGElementTagNameMap>(tag: K): SVGElementTagNameMap[K] {
  return document.createElementNS(SVG_NAMESPACE, tag) as SVGElementTagNameMap[K]
}

function frameOf(node: NodeInstanceType): Frame {
  // Container nodes keep the same footprint as their expanded/collapsed card,
  // so the schematic already shows where nested bodies sit.
  if (node.kind === 'subgraph' || node.kind === 'loop') {
    return { ...node.position, ...containerCardSize(node.collapsed) }
  }
  const rows = Math.max(
    node.inputs.filter((port) => !isSpacerPort(port.type)).length,
    node.outputs.filter((port) => !isSpacerPort(port.type)).length,
  )
  return {
    ...node.position,
    width: STANDARD_NODE_WIDTH,
    height: STANDARD_NODE_BASE_HEIGHT
      + Math.min(rows, STANDARD_NODE_MAX_ROWS) * STANDARD_NODE_ROW_HEIGHT,
  }
}

function colorOf(graph: CanvasGraph, node: NodeInstanceType): string {
  const background = resolveNodeStyle(graph, node).header?.background
  if (typeof background === 'string' && background.trim() !== '') return background
  return KIND_FALLBACK_COLORS[node.kind] ?? FALLBACK_NODE_COLOR
}

/**
 * Build the synchronous first-frame thumbnail for one embedded region.
 *
 * This is intentionally a schematic, not the full preview: it reads the region
 * model directly and draws plain SVG without a hidden JointJS paper, fonts, or
 * image waits. The preview manager replaces it with the live preview once that
 * is ready. No DOM outside the returned element is touched.
 */
export function renderRegionSchematic(
  graph: CanvasGraph,
  region: RegionSchematicSource,
  options: RegionSchematicOptions = {},
): SVGSVGElement | null {
  const selected = selectSchematicContent(region, options)
  if (selected.nodes.length === 0) return null

  const frames = new Map<string, Frame>()
  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY
  for (const node of selected.nodes) {
    const frame = frameOf(node)
    frames.set(node.id, frame)
    minX = Math.min(minX, frame.x)
    minY = Math.min(minY, frame.y)
    maxX = Math.max(maxX, frame.x + frame.width)
    maxY = Math.max(maxY, frame.y + frame.height)
  }

  const svg = svgElement('svg')
  svg.classList.add('bpgraph-region-schematic')
  svg.setAttribute('aria-hidden', 'true')
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet')
  svg.setAttribute('viewBox', [
    minX - SCHEMATIC_PADDING,
    minY - SCHEMATIC_PADDING,
    Math.max(1, maxX - minX + SCHEMATIC_PADDING * 2),
    Math.max(1, maxY - minY + SCHEMATIC_PADDING * 2),
  ].join(' '))
  svg.setAttribute('data-schematic-nodes', String(selected.nodes.length))
  svg.setAttribute('data-schematic-links', String(selected.links.length))

  const linkGroup = svgElement('g')
  const nodeGroup = svgElement('g')
  for (const link of selected.links) {
    const source = frames.get(link.source.id)
    const target = frames.get(link.target.id)
    if (!source || !target) continue
    const sourceX = source.x + source.width
    const sourceY = source.y + source.height / 2
    const targetX = target.x
    const targetY = target.y + target.height / 2
    const curve = Math.max(24, Math.abs(targetX - sourceX) / 2)
    const path = svgElement('path')
    path.setAttribute('data-schematic-link', link.id ?? '')
    path.setAttribute('d',
      `M${sourceX},${sourceY} C${sourceX + curve},${sourceY} ${targetX - curve},${targetY} ${targetX},${targetY}`)
    path.setAttribute('fill', 'none')
    path.setAttribute('stroke', 'rgba(255, 255, 255, 0.35)')
    path.setAttribute('stroke-width', '1')
    path.setAttribute('stroke-linecap', 'round')
    linkGroup.appendChild(path)
  }
  for (const node of selected.nodes) {
    const frame = frames.get(node.id)
    if (!frame) continue
    const rect = svgElement('rect')
    rect.setAttribute('data-schematic-node', node.id)
    rect.setAttribute('x', String(frame.x))
    rect.setAttribute('y', String(frame.y))
    rect.setAttribute('width', String(frame.width))
    rect.setAttribute('height', String(frame.height))
    rect.setAttribute('rx', '4')
    rect.setAttribute('fill', colorOf(graph, node))
    rect.setAttribute('fill-opacity', '0.88')
    rect.setAttribute('stroke', 'rgba(255, 255, 255, 0.18)')
    rect.setAttribute('stroke-width', '1')
    nodeGroup.appendChild(rect)
  }
  svg.appendChild(linkGroup)
  svg.appendChild(nodeGroup)
  return svg
}
