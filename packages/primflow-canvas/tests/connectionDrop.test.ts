// @vitest-environment jsdom
import './svg-shim'
import { afterEach, expect, test, vi } from 'vitest'
import { DataTypeRegistry, defineNode, NodeInstance } from '@lyx-pj/primflow-model'
import { Graph, type LinkInstanceType, type NodeInstanceType } from '../src/Graph'
import { OverlayLayer } from '../src/ui/OverlayLayer'
import { Palette } from '../src/ui/components/Palette'
import type { CanvasGraph } from '../src/ui/types'

const Source = defineNode({
  type: 'source',
  definition: {
    inputs: [] as const,
    outputs: [{ name: 'value', type: 'string' }] as const,
  },
})

const StringTarget = defineNode({
  type: 'string-target',
  definition: {
    inputs: [
      { name: 'hidden', type: 'string', showPort: false },
      { name: 'count', type: 'number' },
      { name: 'text', type: 'string' },
    ] as const,
    outputs: [] as const,
  },
})

const NumberTarget = defineNode({
  type: 'number-target',
  definition: {
    inputs: [{ name: 'count', type: 'number' }] as const,
    outputs: [] as const,
  },
})

const OutputOnly = defineNode({
  type: 'output-only',
  definition: {
    inputs: [] as const,
    outputs: [{ name: 'value', type: 'string' }] as const,
  },
})

type Harness = ReturnType<typeof createHarness>

function createHarness() {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const nodes: NodeInstanceType[] = []
  const links: LinkInstanceType[] = []
  const dataTypes = new DataTypeRegistry()

  const graph = {
    options: { language: 'en' },
    model: { subgraphStack: [{ id: 'root' }], isLoopBody: () => false },
    nodeRegistry: { dataTypes, getNodeClasses: () => [Source, StringTarget, NumberTarget, OutputOnly] },
    createNodeInstance: (nodeClass: typeof Source, options?: Record<string, unknown>) =>
      new NodeInstance(nodeClass as never, options as never, dataTypes),
    validateConnection: (
      _sourceNode: NodeInstanceType,
      sourcePort: { type: string },
      _targetNode: NodeInstanceType,
      targetPort: { type: string },
    ) => dataTypes.checkConnection(sourcePort.type, targetPort.type),
    addNode(nodeOrClass: unknown) {
      const node = nodeOrClass instanceof NodeInstance
        ? nodeOrClass as NodeInstanceType
        : new NodeInstance(nodeOrClass as never, undefined, dataTypes) as NodeInstanceType
      node.id ||= `node-${nodes.length + 1}`
      node.inputs.forEach((port, index) => { port.id ||= `${node.id}-in-${index}` })
      node.outputs.forEach((port, index) => { port.id ||= `${node.id}-out-${index}` })
      nodes.push(node)
      return node
    },
    addLink(link: LinkInstanceType) {
      links.push(link)
      return link
    },
    createLinkInstance(link: LinkInstanceType) {
      return Object.assign(new Graph.LinkInstance(link.source, link.target), link)
    },
    removeLinks(items: LinkInstanceType[]) {
      items.forEach((item) => {
        const index = links.indexOf(item)
        if (index >= 0) links.splice(index, 1)
      })
    },
    findNode: (id: string) => nodes.find((node) => node.id === id),
    getNodes: () => nodes,
    clientToGraphPoint: (x: number, y: number) => ({ x, y }),
    startTransaction: vi.fn(),
    commitTransaction: vi.fn(),
    skipsUndoManager: false,
  }

  const adapter = {
    getNodeSize: () => ({ width: 100, height: 40 }),
    promotePendingLink: vi.fn((id: string, ends: { source: { id: string; port: string }; target: { id: string; port: string } }) => {
      const link = Object.assign(new Graph.LinkInstance(ends.source, ends.target), { id })
      links.push(link)
      return link
    }),
    discardPendingLink: vi.fn(),
  }
  const overlay = new OverlayLayer(container)
  const palette = new Palette(
    graph as unknown as CanvasGraph,
    adapter as never,
    overlay,
    () => ({}),
  )
  const sourceNode = graph.addNode(Source) as NodeInstanceType

  return { container, graph, adapter, links, palette, overlay, sourceNode }
}

afterEach(() => {
  document.body.innerHTML = ''
})

function openConnection(
  harness: Harness,
  sourceNode = harness.sourceNode,
  replaceLink?: LinkInstanceType,
  pendingLinkId?: string,
) {
  return harness.palette.openForConnection({
    source: {
      node: sourceNode,
      port: sourceNode.outputs[0],
      direction: 'out',
    },
    replaceLink,
    pendingLinkId,
    clientX: 120,
    clientY: 80,
  })
}

function itemTitles(harness: Harness) {
  return [...harness.container.querySelectorAll<HTMLElement>('.bpgraph-palette-item')]
    .map((item) => item.dataset.type)
}

test('connection palette only lists nodes with a visible compatible port', () => {
  const harness = createHarness()
  openConnection(harness)

  expect(harness.container.querySelector('.bpgraph-palette')?.getAttribute('data-mode')).toBe('connect')
  expect(harness.container.querySelector('.bpgraph-palette-header p')).toBeNull()
  expect(harness.container.querySelector('.bpgraph-connection-backdrop')).toBeTruthy()
  expect(itemTitles(harness)).toEqual(['string-target'])
})

test('connecting uses the first visible compatible port and closes the palette', () => {
  const harness = createHarness()
  openConnection(harness)
  harness.container.querySelector<HTMLButtonElement>('.bpgraph-palette-item')!
    .dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }))

  expect(harness.graph.startTransaction).toHaveBeenCalledTimes(1)
  expect(harness.graph.commitTransaction).toHaveBeenCalledTimes(1)
  expect(harness.links).toHaveLength(1)
  expect(harness.links[0].source.id).toBe(harness.sourceNode.id)
  const target = harness.graph.findNode(harness.links[0].target.id)!
  expect(target.inputs.find((port) => port.id === harness.links[0].target.port)?.name).toBe('text')
  expect(harness.container.querySelector('.bpgraph-palette')).toBeNull()
})

test('an input source connects the new output back to the existing input', () => {
  const harness = createHarness()
  const target = harness.graph.addNode(StringTarget) as NodeInstanceType
  harness.palette.openForConnection({
    source: { node: target, port: target.inputs[2], direction: 'in' },
    clientX: 120,
    clientY: 80,
  })

  expect(itemTitles(harness)).toEqual(['source', 'output-only'])
  harness.container.querySelector<HTMLButtonElement>('.bpgraph-palette-item')!
    .dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }))

  expect(harness.links).toHaveLength(1)
  const source = harness.graph.findNode(harness.links[0].source.id)!
  expect(source.inputs).toHaveLength(0)
  expect(source.outputs[0].type).toBe('string')
  expect(harness.links[0].target.id).toBe(target.id)
  expect(harness.links[0].target.port).toBe(target.inputs[2].id)
})

test('replacing a link adds the node and replaces the original link', () => {
  const harness = createHarness()
  const target = harness.graph.addNode(StringTarget) as NodeInstanceType
  const replaceLink = harness.graph.createLinkInstance({
    source: { id: harness.sourceNode.id, port: harness.sourceNode.outputs[0].id! },
    target: { id: target.id, port: target.inputs[2].id! },
  })
  harness.graph.addLink(replaceLink)
  openConnection(harness, harness.sourceNode, replaceLink)
  harness.container.querySelector<HTMLButtonElement>('.bpgraph-palette-item')!
    .dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }))

  expect(harness.links).toHaveLength(1)
  expect(harness.links[0]).not.toBe(replaceLink)
  expect(harness.links[0].target.id).not.toBe(target.id)
})

test('Escape closes the connection palette without changing the graph', () => {
  const harness = createHarness()
  openConnection(harness)
  const search = harness.container.querySelector<HTMLInputElement>('.bpgraph-palette-search')!
  search.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))

  expect(harness.container.querySelector('.bpgraph-palette')).toBeNull()
  expect(harness.graph.startTransaction).not.toHaveBeenCalled()
  expect(harness.links).toHaveLength(0)
})

test('a pending draft link is promoted instead of recreated', () => {
  const harness = createHarness()
  const create = vi.spyOn(harness.graph, 'createLinkInstance')
  openConnection(harness, harness.sourceNode, undefined, 'draft-1')
  harness.container.querySelector<HTMLButtonElement>('.bpgraph-palette-item')!
    .dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }))

  expect(harness.adapter.promotePendingLink).toHaveBeenCalledWith('draft-1', expect.anything())
  expect(create).not.toHaveBeenCalled()
  expect(harness.links).toHaveLength(1)
})

test('cancelling a connection discards the pending draft link', () => {
  const harness = createHarness()
  openConnection(harness, harness.sourceNode, undefined, 'draft-1')
  const search = harness.container.querySelector<HTMLInputElement>('.bpgraph-palette-search')!
  search.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))

  expect(harness.adapter.discardPendingLink).toHaveBeenCalledWith('draft-1')
  expect(harness.links).toHaveLength(0)
})
