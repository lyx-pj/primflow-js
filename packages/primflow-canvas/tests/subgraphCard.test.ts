// @vitest-environment jsdom
import './svg-shim'
import { afterEach, expect, test, vi } from 'vitest'
import { render } from 'lit-html'
import { defineNode, NodeRegistry } from '@lyx-pj/primflow-model'
import { Graph, type LinkInstanceType, type NodeInstanceType } from '../src/Graph'
import {
  SUBGRAPH_CARD_COLLAPSED_HEIGHT,
  SUBGRAPH_CARD_COLLAPSED_WIDTH,
  SUBGRAPH_CARD_HEIGHT,
  SUBGRAPH_CARD_WIDTH,
  createSubgraphCardRenderer,
  createSubgraphPlaceholderRenderer,
  subgraphCardPortPosition,
  subgraphCardSize,
} from '../src/adapters/joint/nodes/subgraphCard'
import type { CanvasGraph } from '../src/ui/types'

vi.mock('../src/adapters/GraphAdapter', () => ({
  GraphAdapter: class {
    position = { x: 0, y: 0 }
    scale = 1
    selection = new Set<NodeInstanceType | LinkInstanceType>()
    on = vi.fn()
    setOptions = vi.fn()
    destroy = vi.fn()
    addNode(node: NodeInstanceType) {
      node.id ||= 'node'
      node.inputs.forEach((port, index) => { port.id ||= `in-${index}` })
      node.outputs.forEach((port, index) => { port.id ||= `out-${index}` })
    }
    addLink() {}
    removeCells() {}
    selectCollection() {}
    clear() {}
  },
}))

const Step = defineNode({
  definition: {
    inputs: [{ name: 'exec', type: 'exec' }] as const,
    outputs: [{ name: 'exec', type: 'exec' }] as const,
  },
})

const graphs: Graph[] = []
const containers: HTMLElement[] = []

afterEach(() => {
  graphs.splice(0).forEach((graph) => graph.destroy())
  containers.splice(0).forEach((element) => element.remove())
  vi.restoreAllMocks()
})

function setup() {
  const graph = new Graph(new NodeRegistry().register('step', Step))
  graphs.push(graph)
  const node = graph.addNode('subgraph', { title: 'Extract details' })
  const container = document.createElement('div')
  document.body.appendChild(container)
  containers.push(container)
  const renderer = createSubgraphCardRenderer(graph as unknown as CanvasGraph, node)
  return { graph, node, container, renderer }
}

function renderCard(container: HTMLElement, renderer: ReturnType<typeof createSubgraphCardRenderer>, graph: Graph, node: NodeInstanceType) {
  render(renderer.render({ graph: graph as unknown as CanvasGraph, node, width: SUBGRAPH_CARD_WIDTH, height: SUBGRAPH_CARD_HEIGHT }), container)
}

test('subgraph cards start expanded and expose the fixed card sizes', () => {
  const { node, renderer } = setup()

  expect(node.collapsed).toBe(false)
  expect(renderer.size).toEqual({ width: SUBGRAPH_CARD_WIDTH, height: SUBGRAPH_CARD_HEIGHT })

  expect(subgraphCardSize(true)).toEqual({
    width: SUBGRAPH_CARD_COLLAPSED_WIDTH,
    height: SUBGRAPH_CARD_COLLAPSED_HEIGHT,
  })
  // The adapter writes the new size back into the registration when the card toggles.
  node.collapsed = true
  renderer.size = subgraphCardSize(true)
  expect(renderer.size).toEqual({
    width: SUBGRAPH_CARD_COLLAPSED_WIDTH,
    height: SUBGRAPH_CARD_COLLAPSED_HEIGHT,
  })
})

test('collapsed cards keep their two ports on each edge a 24px target apart', () => {
  const { node } = setup()
  node.collapsed = true
  const position = (portIndex: number, group: 'in' | 'out') => subgraphCardPortPosition(node, {
    port: (group === 'in' ? node.inputs : node.outputs)[portIndex],
    group,
    width: SUBGRAPH_CARD_COLLAPSED_WIDTH,
    height: SUBGRAPH_CARD_COLLAPSED_HEIGHT,
  })

  const firstIn = position(0, 'in')
  const secondIn = position(1, 'in')
  expect(secondIn.x).toBe(firstIn.x)
  expect(Math.abs(secondIn.y - firstIn.y)).toBe(24)
  // The port centre sits on the card edge, so half of the dot stays outside.
  expect(firstIn.x).toBe(0)

  const firstOut = position(0, 'out')
  const secondOut = position(1, 'out')
  expect(Math.abs(secondOut.y - firstOut.y)).toBe(24)
  expect(firstOut.x).toBe(SUBGRAPH_CARD_COLLAPSED_WIDTH)

  node.collapsed = false
  const expandedFirst = subgraphCardPortPosition(node, {
    port: node.inputs[0],
    group: 'in',
    width: SUBGRAPH_CARD_WIDTH,
    height: SUBGRAPH_CARD_HEIGHT,
  })
  const expandedSecond = subgraphCardPortPosition(node, {
    port: node.inputs[1],
    group: 'in',
    width: SUBGRAPH_CARD_WIDTH,
    height: SUBGRAPH_CARD_HEIGHT,
  })
  expect(Math.abs(expandedSecond.y - expandedFirst.y)).toBe(70)
  expect(expandedFirst.x).toBe(0)
  expect(subgraphCardPortPosition(node, {
    port: node.outputs[0],
    group: 'out',
    width: SUBGRAPH_CARD_WIDTH,
    height: SUBGRAPH_CARD_HEIGHT,
  }).x).toBe(SUBGRAPH_CARD_WIDTH)
})

test('a collapsed subgraph card survives serialization', () => {
  const { graph, node } = setup()
  node.collapsed = true

  const json = graph.toJSON()
  expect(json.nodes.find((item) => item.id === node.id)?.collapsed).toBe(true)

  graph.fromJSON(json)
  expect(graph.getNodes().find((item) => item.id === node.id)?.collapsed).toBe(true)
})

test('expanded cards are not serialized with a collapsed field', () => {
  const { graph, node } = setup()
  const json = graph.toJSON()
  expect(json.nodes.find((item) => item.id === node.id)).not.toHaveProperty('collapsed')
})

test('the card renders a title, toggle, breakpoint marker, and preview slot', () => {
  const { graph, node, container, renderer } = setup()
  node.breakpoint = true
  node.collapsed = true
  node.collapsed = false

  renderCard(container, renderer, graph, node)

  expect(container.querySelector('.bpgraph-subgraph-card')).not.toBeNull()
  expect(container.querySelector('.bpgraph-subgraph-title')?.textContent).toContain('Extract details')
  const toggle = container.querySelector<HTMLButtonElement>('.bpgraph-subgraph-toggle')
  expect(toggle?.getAttribute('aria-expanded')).toBe('true')
  expect(container.querySelector('.bpgraph-subgraph-breakpoint')).not.toBeNull()
  expect(container.querySelector('.bpgraph-subgraph-preview')).not.toBeNull()
})

test('the toggle collapses the card and hides the preview', () => {
  const { graph, node, container, renderer } = setup()
  renderCard(container, renderer, graph, node)

  container.querySelector<HTMLButtonElement>('.bpgraph-subgraph-toggle')?.click()
  renderCard(container, renderer, graph, node)

  expect(node.collapsed).toBe(true)
  expect(container.querySelector('.bpgraph-subgraph-card')?.classList.contains('is-collapsed')).toBe(true)
  expect(container.querySelector('.bpgraph-subgraph-preview')).toBeNull()
  expect(container.querySelector('.bpgraph-subgraph-toggle')?.getAttribute('aria-expanded')).toBe('false')
})

test('an expanded card starts with a loading state instead of an empty message', () => {
  const { node, container } = setup()
  // A graph without the preview host keeps the initial markup from being replaced by attach().
  const graph = {
    options: { language: 'en' },
    isReplayMode: () => false,
  } as unknown as CanvasGraph
  const renderer = createSubgraphCardRenderer(graph, node)

  render(renderer.render({ graph, node, width: SUBGRAPH_CARD_WIDTH, height: SUBGRAPH_CARD_HEIGHT }), container)

  const preview = container.querySelector('.bpgraph-subgraph-preview')
  expect(preview?.getAttribute('data-preview-state')).toBe('pending')
  expect(preview?.querySelector('.bpgraph-subgraph-preview-empty')).toBeNull()
})

test('the card re-renders after the preview host replaces the slot content', () => {
  const { node, container } = setup()
  // Start without a target so the slot renders the empty message, then let the
  // host replace it with a mounted preview before the next card render.
  delete node.targetGraphId
  const attach = vi.fn((slot: HTMLElement) => {
    slot.setAttribute('data-preview-state', 'ready')
    slot.replaceChildren(document.createElementNS('http://www.w3.org/2000/svg', 'svg'))
  })
  const detach = vi.fn()
  const graph = {
    options: { language: 'en' },
    isReplayMode: () => false,
    subgraphPreviews: { attach, detach },
  } as unknown as CanvasGraph
  const renderer = createSubgraphCardRenderer(graph, node)
  const renderCard = () => render(
    renderer.render({ graph, node, width: SUBGRAPH_CARD_WIDTH, height: SUBGRAPH_CARD_HEIGHT }),
    container,
  )

  renderCard()
  expect(container.querySelector('.bpgraph-subgraph-preview > svg')).not.toBeNull()
  expect(attach).toHaveBeenCalledTimes(1)
  expect(detach).not.toHaveBeenCalled()

  // Re-rendering with the same target (e.g. title or breakpoint change) must
  // keep the preview slot mounted without detaching or re-attaching it.
  node.title = 'Renamed'
  renderCard()
  expect(attach).toHaveBeenCalledTimes(1)
  expect(detach).not.toHaveBeenCalled()

  // Changing targetGraphId re-attaches the existing slot with the new target.
  node.targetGraphId = 'file'
  expect(() => renderCard()).not.toThrow()
  expect(attach).toHaveBeenCalledTimes(2)
  expect(detach).not.toHaveBeenCalled()
})

test('the nested preview placeholder never renders a preview slot', () => {
  const { graph, node, container } = setup()
  const renderer = createSubgraphPlaceholderRenderer(graph as unknown as CanvasGraph, node)

  renderCard(container, renderer, graph, node)

  expect(container.querySelector('.bpgraph-subgraph-card.is-generic')).not.toBeNull()
  expect(container.querySelector('.bpgraph-subgraph-badge')?.textContent).toContain('Subgraph')
  expect(container.querySelector('.bpgraph-subgraph-preview')).toBeNull()
  expect(container.querySelector('.bpgraph-subgraph-toggle')).toBeNull()
})
