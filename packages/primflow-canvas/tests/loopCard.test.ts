// @vitest-environment jsdom
import './svg-shim'
import { afterEach, expect, test, vi } from 'vitest'
import { render } from 'lit-html'
import { defineNode, NodeRegistry } from '@lyx-pj/primflow-model'
import { Graph, type LinkInstanceType, type NodeInstanceType } from '../src/Graph'
import {
  CONTAINER_CARD_COLLAPSED_HEIGHT,
  CONTAINER_CARD_COLLAPSED_WIDTH,
  CONTAINER_CARD_HEIGHT,
  CONTAINER_CARD_WIDTH,
  containerCardPortPosition,
} from '../src/adapters/joint/nodes/containerCard'
import {
  createLoopCardRenderer,
  createLoopPlaceholderRenderer,
  formatLoopTimeout,
  loopLimitSummary,
} from '../src/adapters/joint/nodes/loopCard'
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
  const node = graph.addNode('loop', { title: 'Retry' })
  const container = document.createElement('div')
  document.body.appendChild(container)
  containers.push(container)
  return { graph, node, container }
}

function fakeGraph(replaying = false): CanvasGraph {
  return {
    options: { language: 'en' },
    isReplayMode: () => replaying,
    subgraphPreviews: {
      attach: vi.fn(),
      detach: vi.fn(),
    },
  } as unknown as CanvasGraph
}

function renderCard(
  container: HTMLElement,
  graph: CanvasGraph,
  node: NodeInstanceType,
  renderer = createLoopCardRenderer(graph, node),
) {
  render(renderer.render({
    graph,
    node,
    width: node.collapsed ? CONTAINER_CARD_COLLAPSED_WIDTH : CONTAINER_CARD_WIDTH,
    height: node.collapsed ? CONTAINER_CARD_COLLAPSED_HEIGHT : CONTAINER_CARD_HEIGHT,
  }), container)
  return renderer
}

test('a loop node creates its body and starts as an expanded card', () => {
  const { graph, node } = setup()

  expect(node.collapsed).toBe(false)
  expect(node.targetGraphId).toBeTruthy()
  expect(graph.model.hasSubgraph(node.targetGraphId!)).toBe(true)
  const renderer = createLoopCardRenderer(fakeGraph(), node)
  expect(renderer.size).toEqual({ width: CONTAINER_CARD_WIDTH, height: CONTAINER_CARD_HEIGHT })
})

test('the loop card shows a violet variant, title, glyph, and preview slot', () => {
  const { node, container } = setup()
  const graph = fakeGraph()
  renderCard(container, graph, node)

  const card = container.querySelector('.bpgraph-subgraph-card')
  expect(card?.classList.contains('is-loop')).toBe(true)
  expect(card?.getAttribute('data-container-card')).toBe('loop')
  expect(container.querySelector('.bpgraph-subgraph-title-text')?.textContent).toBe('Retry')
  expect(container.querySelector('.bpgraph-loop-glyph')).not.toBeNull()
  expect(container.querySelector('.bpgraph-subgraph-preview')).not.toBeNull()
  expect(container.querySelector('.bpgraph-subgraph-toggle')).not.toBeNull()
  expect(graph.subgraphPreviews?.attach).toHaveBeenCalledTimes(1)
})

test('configured limits appear as a compact chip and update with the node', () => {
  const { node, container } = setup()
  const graph = fakeGraph()
  const renderer = createLoopCardRenderer(graph, node)

  renderCard(container, graph, node, renderer)
  expect(container.querySelector('.bpgraph-loop-limit')).toBeNull()

  node.loop = { version: 1, maxIterations: 3, timeoutMs: 1500 }
  renderCard(container, graph, node, renderer)
  const chip = container.querySelector('.bpgraph-loop-limit')
  expect(chip?.textContent).toBe('×3 · 1.5s')
  expect(chip?.getAttribute('title')).toContain('Maximum iterations: 3')
  expect(chip?.getAttribute('title')).toContain('Timeout: 1.5s')

  node.loop = { version: 1 }
  renderCard(container, graph, node, renderer)
  expect(container.querySelector('.bpgraph-loop-limit')).toBeNull()
})

test('limit summaries only include explicit configuration', () => {
  const { node } = setup()
  expect(loopLimitSummary(node, 'en')).toBeNull()

  node.loop = { version: 1, maxIterations: 4 }
  expect(loopLimitSummary(node, 'en')).toEqual({
    compact: '×4',
    title: 'Maximum iterations: 4',
  })

  node.loop = { version: 1, timeoutMs: 750 }
  expect(loopLimitSummary(node, 'en')).toEqual({
    compact: '750ms',
    title: 'Timeout: 750ms',
  })

  expect(formatLoopTimeout(1500)).toBe('1.5s')
  expect(formatLoopTimeout(2000)).toBe('2s')
  expect(formatLoopTimeout(0)).toBe('')
})

test('the toggle collapses the loop card, hides the preview, and keeps the chip', () => {
  const { node, container } = setup()
  node.loop = { version: 1, maxIterations: 3 }
  const graph = fakeGraph()
  const renderer = createLoopCardRenderer(graph, node)
  renderCard(container, graph, node, renderer)

  container.querySelector<HTMLButtonElement>('.bpgraph-subgraph-toggle')?.click()
  expect(node.collapsed).toBe(true)

  renderer.size = { width: CONTAINER_CARD_COLLAPSED_WIDTH, height: CONTAINER_CARD_COLLAPSED_HEIGHT }
  renderCard(container, graph, node, renderer)

  expect(container.querySelector('.bpgraph-subgraph-card')?.classList.contains('is-collapsed')).toBe(true)
  expect(container.querySelector('.bpgraph-subgraph-preview')).toBeNull()
  expect(container.querySelector('.bpgraph-loop-limit')?.textContent).toBe('×3')
  expect(container.querySelector('.bpgraph-subgraph-toggle')?.getAttribute('aria-expanded')).toBe('false')
})

test('the collapse toggle is disabled during replay', () => {
  const { node, container } = setup()
  renderCard(container, fakeGraph(true), node)

  const toggle = container.querySelector<HTMLButtonElement>('.bpgraph-subgraph-toggle')
  expect(toggle?.disabled).toBe(true)
  expect(toggle?.getAttribute('title')).toBe('Collapse is disabled during replay')
})

test('collapsed loop ports keep the compact card geometry', () => {
  const { node } = setup()
  node.collapsed = true
  const position = (index: number, group: 'in' | 'out') => containerCardPortPosition(node, {
    port: (group === 'in' ? node.inputs : node.outputs)[index],
    group,
    width: CONTAINER_CARD_COLLAPSED_WIDTH,
    height: CONTAINER_CARD_COLLAPSED_HEIGHT,
  })

  const firstIn = position(0, 'in')
  const secondIn = position(1, 'in')
  expect(firstIn.x).toBe(0)
  expect(Math.abs(secondIn.y - firstIn.y)).toBe(24)
  expect(position(0, 'out').x).toBe(CONTAINER_CARD_COLLAPSED_WIDTH)

  node.collapsed = false
  const expandedFirst = containerCardPortPosition(node, {
    port: node.inputs[0],
    group: 'in',
    width: CONTAINER_CARD_WIDTH,
    height: CONTAINER_CARD_HEIGHT,
  })
  const expandedSecond = containerCardPortPosition(node, {
    port: node.inputs[1],
    group: 'in',
    width: CONTAINER_CARD_WIDTH,
    height: CONTAINER_CARD_HEIGHT,
  })
  expect(Math.abs(expandedSecond.y - expandedFirst.y)).toBe(70)
})

test('a nested loop renders as a generic card without a preview slot', () => {
  const { node, container } = setup()
  const graph = fakeGraph()
  const renderer = createLoopPlaceholderRenderer(graph, node)

  renderCard(container, graph, node, renderer)

  expect(container.querySelector('.bpgraph-subgraph-card.is-generic.is-loop')).not.toBeNull()
  expect(container.querySelector('.bpgraph-subgraph-badge')?.textContent).toBe('Loop')
  expect(container.querySelector('.bpgraph-subgraph-preview')).toBeNull()
  expect(container.querySelector('.bpgraph-subgraph-toggle')).toBeNull()
  expect(graph.subgraphPreviews?.attach).not.toHaveBeenCalled()
})
