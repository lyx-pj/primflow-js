// @vitest-environment jsdom
import './svg-shim'
import { expect, test } from 'vitest'
import type { LinkInstanceType, NodeInstanceType } from '../src/Graph'
import type { CanvasGraph } from '../src/ui/types'
import {
  SCHEMATIC_MAX_NODES,
  renderRegionSchematic,
  selectSchematicContent,
} from '../src/preview/regionSchematic'

function graph(): CanvasGraph {
  return {
    nodeRegistry: { nodeStyle: {} },
  } as unknown as CanvasGraph
}

function node(
  id: string,
  x: number,
  y: number,
  options: { kind?: string; collapsed?: boolean; background?: string; inputs?: number } = {},
): NodeInstanceType {
  const inputs = Array.from({ length: options.inputs ?? 0 }, (_, index) => ({
    id: `${id}-in-${index}`,
    name: `in${index}`,
    type: 'string',
  }))
  return {
    id,
    kind: options.kind ?? 'default',
    position: { x, y },
    collapsed: options.collapsed ?? false,
    definition: {
      style: { header: { background: options.background ?? '#56B4E9' } },
      inputs: [],
      outputs: [],
    },
    inputs,
    outputs: [],
  } as unknown as NodeInstanceType
}

function link(id: string, source: string, target: string): LinkInstanceType {
  return {
    id,
    source: { id: source, port: 'out' },
    target: { id: target, port: 'in' },
  } as unknown as LinkInstanceType
}

test('a schematic draws region links and nodes without a hidden paper', () => {
  const svg = renderRegionSchematic(graph(), {
    nodes: [node('a', 0, 0), node('b', 240, 0)],
    links: [link('ab', 'a', 'b')],
  })

  expect(svg).not.toBeNull()
  expect(svg!.tagName.toLowerCase()).toBe('svg')
  expect(svg!.classList.contains('bpgraph-region-schematic')).toBe(true)
  expect(svg!.getAttribute('aria-hidden')).toBe('true')
  expect(svg!.getAttribute('viewBox')).toMatch(/^-?\d/)
  expect(svg!.querySelectorAll('path[data-schematic-link]')).toHaveLength(1)
  expect(svg!.querySelectorAll('rect[data-schematic-node]')).toHaveLength(2)
  expect(svg!.getAttribute('data-schematic-nodes')).toBe('2')
  expect(svg!.getAttribute('data-schematic-links')).toBe('1')
})

test('schematic frames use card sizes for containers and row counts for nodes', () => {
  const svg = renderRegionSchematic(graph(), {
    nodes: [
      node('loop', 0, 0, { kind: 'loop' }),
      node('collapsed', 400, 0, { kind: 'loop', collapsed: true }),
      node('step', 800, 0, { inputs: 2 }),
    ],
    links: [],
  })!

  const rects = [...svg.querySelectorAll<SVGRectElement>('rect[data-schematic-node]')]
  const byId = new Map(rects.map((rect) => [rect.getAttribute('data-schematic-node'), rect]))
  expect(byId.get('loop')?.getAttribute('width')).toBe('280')
  expect(byId.get('loop')?.getAttribute('height')).toBe('180')
  expect(byId.get('collapsed')?.getAttribute('width')).toBe('200')
  expect(byId.get('collapsed')?.getAttribute('height')).toBe('56')
  // 44px base + two port rows at 12px.
  expect(byId.get('step')?.getAttribute('height')).toBe('68')
})

test('schematic nodes use their resolved header color', () => {
  const svg = renderRegionSchematic(graph(), {
    nodes: [
      node('loop', 0, 0, { kind: 'loop', background: '#7c3aed' }),
      node('step', 300, 0, { background: '#009E73' }),
    ],
    links: [],
  })!

  const fills = [...svg.querySelectorAll('rect[data-schematic-node]')]
    .map((rect) => rect.getAttribute('fill'))
  expect(fills).toEqual(['#7c3aed', '#009E73'])
})

test('schematic content keeps reading order and applies its own caps', () => {
  const nodes = [
    node('c', 200, 200),
    node('a', 0, 0),
    node('b', 100, 0),
    ...Array.from({ length: SCHEMATIC_MAX_NODES }, (_, index) =>
      node(`extra-${index}`, index * 10, 400)),
  ]
  const selected = selectSchematicContent({ nodes, links: [] })

  expect(selected.nodes).toHaveLength(SCHEMATIC_MAX_NODES)
  expect(selected.nodes[0].id).toBe('a')
  expect(selected.nodes[1].id).toBe('b')

  const svg = renderRegionSchematic(graph(), {
    nodes,
    links: [link('ab', 'a', 'b'), link('bc', 'b', 'c')],
  }, { maxNodes: 2, maxLinks: 1 })!
  expect(svg.querySelectorAll('rect[data-schematic-node]')).toHaveLength(2)
  expect(svg.querySelectorAll('path[data-schematic-link]')).toHaveLength(1)
  // The "bc" link points at a dropped node, so only "ab" can be kept.
  expect(svg.querySelector<SVGPathElement>('path[data-schematic-link]')?.getAttribute('data-schematic-link')).toBe('ab')
})

test('an empty region has no schematic', () => {
  expect(renderRegionSchematic(graph(), { nodes: [], links: [] })).toBeNull()
})
