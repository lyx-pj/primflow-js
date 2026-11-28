// @vitest-environment jsdom
import { afterEach, expect, test, vi } from 'vitest'
import { ChangedEventType, type JsonGraph, type JsonNode } from '@lyx-pj/primflow-model'
import type { NodeInstanceType } from '../src/Graph'
import { SubgraphPreviewManager } from '../src/preview/SubgraphPreviewManager'
import { buildPreview, type PreviewResult } from '../src/preview/previewGraph'
import { serializeCachedPreview } from '../src/preview/previewCache'
import type { CanvasGraph } from '../src/ui/types'

vi.mock('../src/preview/previewGraph', () => ({
  buildPreview: vi.fn(),
}))

function jsonNode(id: string): JsonNode {
  return {
    id,
    definitionId: 'step',
    kind: 'default',
    position: { x: 0, y: 0 },
    inputValues: {},
    inputs: [],
    outputs: [],
  }
}

function source(...ids: string[]): JsonGraph['nodes'] {
  return ids.map(jsonNode)
}

function previewSvg(label: string): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.classList.add('bpgraph-subgraph-preview-svg')
  const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')
  text.textContent = label
  svg.appendChild(text)
  return svg
}

function preview(label: string): PreviewResult {
  return { svg: previewSvg(label), omittedNodes: 0, omittedLinks: 0 }
}

function fakeGraph(): CanvasGraph {
  return {
    options: { language: 'en' },
    container: null,
    on: vi.fn(),
    off: vi.fn(),
    model: { hasSubgraph: () => false, subgraphs: new Map() },
  } as unknown as CanvasGraph
}

function callNode(targetId = 'file'): NodeInstanceType {
  return { targetGraphId: targetId } as unknown as NodeInstanceType
}

const managers: SubgraphPreviewManager[] = []
const slots: HTMLElement[] = []

afterEach(() => {
  managers.splice(0).forEach((manager) => manager.destroy())
  slots.splice(0).forEach((slot) => slot.remove())
  vi.mocked(buildPreview).mockReset()
})

function setup() {
  const manager = new SubgraphPreviewManager(fakeGraph())
  managers.push(manager)
  return manager
}

function mountSlot() {
  const slot = document.createElement('div')
  document.body.appendChild(slot)
  slots.push(slot)
  return slot
}

function previewContent(slot: HTMLElement) {
  return slot.querySelector('.bpgraph-subgraph-preview-svg text')?.textContent ?? null
}

test('a rendered preview is reused when another card mounts after a graph switch', async () => {
  vi.mocked(buildPreview).mockResolvedValue(preview('A'))
  const manager = setup()
  manager.setSources({ file: { nodes: source('a'), links: [] } as JsonGraph })

  const first = mountSlot()
  manager.attach(first, callNode())
  await vi.waitFor(() => expect(first.getAttribute('data-preview-state')).toBe('ready'))
  expect(buildPreview).toHaveBeenCalledTimes(1)

  // A view switch bumps the manager revision; the cached image must still mount before rebuilding.
  manager.invalidate()
  const second = mountSlot()
  manager.attach(second, callNode())

  expect(second.querySelector('.bpgraph-subgraph-preview-svg')).not.toBeNull()
  expect(second.getAttribute('data-preview-cache')).toBe('hit')

  await vi.waitFor(() => expect(second.getAttribute('data-preview-state')).toBe('ready'))
  await vi.waitFor(() => expect(buildPreview).toHaveBeenCalledTimes(2))
})

test('changed source content still shows the old preview until the new one is ready', async () => {
  vi.mocked(buildPreview)
    .mockResolvedValueOnce(preview('old'))
    .mockResolvedValueOnce(preview('new'))
  const manager = setup()
  manager.setSources({ file: { nodes: source('a'), links: [] } as JsonGraph })

  const first = mountSlot()
  manager.attach(first, callNode())
  await vi.waitFor(() => expect(previewContent(first)).toBe('old'))

  manager.updateSource('file', { nodes: source('b'), links: [] } as JsonGraph)
  const second = mountSlot()
  manager.attach(second, callNode())

  expect(previewContent(second)).toBe('old')
  expect(second.getAttribute('data-preview-cache')).toBe('hit')

  await vi.waitFor(() => expect(previewContent(second)).toBe('new'))
  await vi.waitFor(() => expect(second.getAttribute('data-preview-state')).toBe('ready'))
})

test('preloaded entries mount on the first paint and are revalidated afterwards', async () => {
  vi.mocked(buildPreview).mockResolvedValue(preview('live'))
  const manager = setup()
  const payload = serializeCachedPreview(preview('cached'), 'key')
  const adapter = {
    load: vi.fn(async () => ({ file: payload })),
    save: vi.fn(),
    remove: vi.fn(),
  }
  manager.setCacheAdapter(adapter)
  manager.setSources({ file: { nodes: source('a'), links: [] } as JsonGraph })
  await manager.preload()

  const slot = mountSlot()
  manager.attach(slot, callNode())

  expect(previewContent(slot)).toBe('cached')
  expect(slot.getAttribute('data-preview-cache')).toBe('hit')

  await vi.waitFor(() => expect(slot.getAttribute('data-preview-state')).toBe('ready'))
  await vi.waitFor(() => expect(buildPreview).toHaveBeenCalledTimes(1))
})

test('rendered external previews are saved and removed through the adapter', async () => {
  vi.mocked(buildPreview).mockResolvedValue(preview('A'))
  const manager = setup()
  const adapter = {
    load: vi.fn(async () => ({})),
    save: vi.fn(),
    remove: vi.fn(),
  }
  manager.setCacheAdapter(adapter)
  manager.setSources({ file: { nodes: source('a'), links: [] } as JsonGraph })

  const slot = mountSlot()
  manager.attach(slot, callNode())
  await vi.waitFor(() => expect(adapter.save).toHaveBeenCalledTimes(1))

  const [targetId, payload] = adapter.save.mock.calls[0] as [string, ReturnType<typeof serializeCachedPreview>]
  expect(targetId).toBe('file')
  expect(payload.version).toBe(1)
  expect(payload.svg).toContain('<text>A</text>')

  manager.updateSource('file', null)
  expect(adapter.remove).toHaveBeenCalledWith('file')
  expect(adapter.save).toHaveBeenCalledTimes(1)
})

test('entries from another cache version are ignored during preload', async () => {
  vi.mocked(buildPreview).mockResolvedValue(preview('live'))
  const manager = setup()
  const payload = serializeCachedPreview(preview('cached'), 'key')
  const adapter = {
    load: vi.fn(async () => ({ file: { ...payload, version: 0 } })),
    save: vi.fn(),
    remove: vi.fn(),
  }
  manager.setCacheAdapter(adapter)
  manager.setSources({ file: { nodes: source('a'), links: [] } as JsonGraph })
  await manager.preload()

  const slot = mountSlot()
  manager.attach(slot, callNode())

  expect(previewContent(slot)).toBeNull()
  await vi.waitFor(() => expect(previewContent(slot)).toBe('live'))
})

function regionNode(id: string): NodeInstanceType {
  return {
    id,
    definitionId: 'step',
    kind: 'default',
    position: { x: 0, y: 0 },
    inputValues: {},
    inputs: [],
    outputs: [],
    states: {},
    collapsed: false,
    definition: { name: 'Step', style: {}, inputs: [], outputs: [] },
  } as unknown as NodeInstanceType
}

function embeddedGraph(): CanvasGraph {
  return {
    options: { language: 'en' },
    container: null,
    on: vi.fn(),
    off: vi.fn(),
    model: {
      hasSubgraph: (id: string) => id === 'body',
      subgraphs: new Map([['body', { nodes: [regionNode('inside')], links: [] }]]),
    },
    nodeRegistry: { nodeStyle: {} },
  } as unknown as CanvasGraph
}

test('an embedded region paints a schematic before the live preview is ready', async () => {
  let resolveBuild!: (result: PreviewResult | null) => void
  const pending = new Promise<PreviewResult | null>((resolve) => { resolveBuild = resolve })
  vi.mocked(buildPreview).mockReturnValue(pending)
  const manager = new SubgraphPreviewManager(embeddedGraph())
  managers.push(manager)
  const slot = mountSlot()

  manager.attach(slot, callNode('body'))

  expect(slot.querySelector('.bpgraph-region-schematic')).not.toBeNull()
  expect(slot.getAttribute('data-preview-state')).toBe('schematic')
  expect(previewContent(slot)).toBeNull()

  resolveBuild(preview('live'))
  await vi.waitFor(() => expect(slot.getAttribute('data-preview-state')).toBe('ready'))
  expect(slot.querySelector('.bpgraph-region-schematic')).toBeNull()
  expect(previewContent(slot)).toBe('live')
})

test('a failed live build keeps the embedded schematic instead of showing an empty state', async () => {
  vi.mocked(buildPreview).mockRejectedValue(new Error('render failed'))
  const manager = new SubgraphPreviewManager(embeddedGraph())
  managers.push(manager)
  const slot = mountSlot()

  manager.attach(slot, callNode('body'))

  await vi.waitFor(() => expect(buildPreview).toHaveBeenCalledTimes(1))
  await vi.waitFor(() => expect(slot.getAttribute('data-preview-state')).toBe('schematic'))
  expect(slot.querySelector('.bpgraph-region-schematic')).not.toBeNull()
  expect(slot.querySelector('.bpgraph-subgraph-preview-empty')).toBeNull()
})

test('embedded regions never write to the application preview cache', async () => {
  vi.mocked(buildPreview).mockResolvedValue(preview('live'))
  const manager = new SubgraphPreviewManager(embeddedGraph())
  managers.push(manager)
  const adapter = {
    load: vi.fn(async () => ({})),
    save: vi.fn(),
    remove: vi.fn(),
  }
  manager.setCacheAdapter(adapter)
  const slot = mountSlot()

  manager.attach(slot, callNode('body'))
  await vi.waitFor(() => expect(slot.getAttribute('data-preview-state')).toBe('ready'))

  expect(adapter.save).not.toHaveBeenCalled()
  expect(adapter.remove).not.toHaveBeenCalled()
})

test('moving a container node in the parent graph does not invalidate its preview', async () => {
  vi.mocked(buildPreview).mockResolvedValue(preview('live'))
  const listeners = new Map<string, (event: unknown) => void>()
  const graph = embeddedGraph()
  graph.on = vi.fn((event: string, listener: (payload: unknown) => void) => {
    listeners.set(event, listener)
  }) as unknown as CanvasGraph['on']
  const manager = new SubgraphPreviewManager(graph)
  managers.push(manager)
  const slot = mountSlot()
  const container = callNode('body')

  manager.attach(slot, container)
  await vi.waitFor(() => expect(slot.getAttribute('data-preview-state')).toBe('ready'))
  expect(buildPreview).toHaveBeenCalledTimes(1)

  const onChanged = listeners.get('changed')
  expect(onChanged).toBeDefined()

  // Dragging the container node updates its position in the parent graph.
  onChanged?.({
    change: ChangedEventType.Property,
    propertyName: 'position',
    object: container,
    oldValue: { x: 0, y: 0 },
    newValue: { x: 100, y: 50 },
  })
  await Promise.resolve()
  expect(buildPreview).toHaveBeenCalledTimes(1)

  // Editing a node inside the embedded region still invalidates the preview.
  onChanged?.({
    change: ChangedEventType.Property,
    propertyName: 'position',
    object: { graphId: 'body' },
  })
  await vi.waitFor(() => expect(buildPreview).toHaveBeenCalledTimes(2))
})

