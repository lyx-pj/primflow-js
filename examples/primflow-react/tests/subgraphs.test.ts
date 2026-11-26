// @vitest-environment jsdom
import './language'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { NodeInstance, type JsonGraph, type JsonLink, type JsonNode } from '@lyx-pj/primflow-model'
import type { ViewMeta } from '../packages/workflow'
import {
  assembleExecutionGraph,
  buildSubgraphPaletteEntries,
} from '../packages/workflow/subgraphs'
import { useWorkflow } from '../packages/workflow/use-workflow'
import { ensureSubgraphStartId } from '../packages/workflow/views'
import { fakeStorage, resetFakeStorage, seedView } from './fake-storage'
import { createEngine, link, node, stopEngines } from './helpers'

function json(nodes: JsonNode[] = [], links: JsonLink[] = [], subgraphs: JsonGraph['subgraphs'] = {}): JsonGraph {
  return { nodes, links, subgraphs, variables: [], viewport: { x: 0, y: 0, zoom: 1 } }
}

function graphNode(id: string, type: string, nodeType = type, extra: Partial<JsonNode> = {}): JsonNode {
  return {
    id,
    kind: type,
    definitionId: nodeType,
    position: { x: 0, y: 0 },
    inputValues: {},
    inputs: [],
    outputs: [],
    ...extra,
  }
}

function callNode(id: string, subgraphId: string): JsonNode {
  return graphNode(id, 'subgraph', 'subgraph', { targetGraphId: subgraphId, title: '调用子图' })
}

function meta(id: string, name: string, type: ViewMeta['type'] = 'view'): ViewMeta {
  return { id, name, type, updatedAt: 1 }
}

const EndClass = {
  type: 'end',
  definition: { type: 'end', title: 'End', inputs: [], outputs: [], style: {} },
}

const { graph, state } = vi.hoisted(() => {
  const listeners = new Map<string, Set<(...args: unknown[]) => void>>()
  const SubgraphClass = {
    type: 'subgraph',
    definition: { type: 'subgraph', title: 'Subgraph', inputs: [], outputs: [], style: {} },
  }
  const state = {
    json: {
      nodes: [],
      links: [],
      variables: [],
      subgraphs: {},
      viewport: { x: 0, y: 0, zoom: 1 },
    } as JsonGraph,
  }
  const graph = {
    container: undefined as HTMLElement | undefined,
    scale: 1,
    position: { x: 0, y: 0 },
    model: {
      root: { id: 'root' },
      activeGraph: { id: 'root' },
      subgraphStack: [{ id: 'root' }],
      hasSubgraph: () => false,
    },
    fromJSON: vi.fn((data: JsonGraph) => {
      state.json = data
    }),
    toJSON: vi.fn(() => state.json),
    clear: vi.fn(() => {
      state.json = {
        nodes: [{ id: 'start-root', kind: 'start', definitionId: 'start', position: { x: 300, y: 300 }, inputValues: {}, inputs: [], outputs: [] }],
        links: [],
        variables: [],
        subgraphs: {},
        viewport: { x: 0, y: 0, zoom: 1 },
      }
    }),
    zoom: vi.fn(),
    setOptions: vi.fn(),
    setSubgraphSources: vi.fn(),
    setSubgraphPreviewCache: vi.fn(),
    preloadSubgraphPreviews: vi.fn(async () => {}),
    updateSubgraphSource: vi.fn(),
    emit: vi.fn(),
    getNodes: vi.fn(() => state.json.nodes),
    isReplayMode: vi.fn(() => false),
    exitReplay: vi.fn(),
    exitSubgraph: vi.fn(),
    startTransaction: vi.fn(),
    commitTransaction: vi.fn(),
    addNode: vi.fn((value: NodeInstance<typeof EndClass>) => {
      state.json.nodes.push({
        id: `end-${state.json.nodes.length}`,
        kind: 'end',
        definitionId: 'end',
        position: value.position,
        inputValues: {},
        inputs: [],
        outputs: [],
      })
      return value
    }),
    nodeRegistry: {
      registry: {},
      isRegistered: vi.fn(() => true),
      getEndNodeClass: vi.fn(() => EndClass),
      getNodeClass: vi.fn(() => SubgraphClass),
    },
    on(event: string, handler: (...args: unknown[]) => void) {
      if (!listeners.has(event)) listeners.set(event, new Set())
      listeners.get(event)!.add(handler)
      return graph
    },
    off(event: string, handler?: (...args: unknown[]) => void) {
      if (handler) listeners.get(event)?.delete(handler)
      else listeners.delete(event)
      return graph
    },
  }
  return { graph, state }
})

// The factory is hoisted to the top of the file, so import dynamically inside it after module initialization.
vi.mock('../packages/workflow/storage', async () => {
  const { fakeStorage } = await import('./fake-storage')
  return fakeStorage
})
vi.mock('../packages/workflow/context/graph-context', () => ({ useGraph: () => graph }))
vi.mock('../packages/workflow/context/engine-context', () => ({ useEngine: () => null }))
vi.mock('../packages/workflow/events', () => ({ bindWorkflowEvents: () => () => {} }))

let root: Root
let container: HTMLDivElement
let hook: ReturnType<typeof useWorkflow>

function Workflow() {
  hook = useWorkflow()
  return createElement('div')
}

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  vi.clearAllMocks()
  resetFakeStorage()
  window.localStorage.clear()
  state.json = json()
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
  stopEngines()
  vi.restoreAllMocks()
})

async function render() {
  await act(async () => root.render(createElement(Workflow)))
}

test('子图文件的根 Start 改成跨文件唯一 id，连线同步更新', () => {
  const data = json(
    [graphNode('start-root', 'start'), graphNode('step', 'default')],
    [{ id: 'l1', source: { id: 'start-root', port: 'out-start' }, target: { id: 'step', port: 'in-exec' } }],
  )

  ensureSubgraphStartId(data, 'sub-1')

  expect(data.nodes.find((node) => node.kind === 'start')?.id).toBe('start-sub-1')
  expect(data.links[0].source.id).toBe('start-sub-1')
  // A file whose id is already unique is not renamed again.
  const old = data.nodes.find((node) => node.kind === 'start')!
  old.id = 'start-custom'
  ensureSubgraphStartId(data, 'sub-2')
  expect(data.nodes.find((node) => node.kind === 'start')?.id).toBe('start-custom')
})

test('添加面板按子图文件展开条目，排除当前文件', () => {
  const SubgraphClass = {
    type: 'subgraph',
    definition: { type: 'subgraph', title: 'Subgraph', inputs: [], outputs: [], style: {} },
  }
  const fake = { nodeRegistry: { getNodeClass: () => SubgraphClass } } as unknown as Parameters<
    typeof buildSubgraphPaletteEntries
  >[0]
  const files = [meta('v', '主流程'), meta('sub-a', '订单子图', 'subgraph'), meta('sub-b', '退款子图', 'subgraph')]

  const entries = buildSubgraphPaletteEntries(fake, files, 'sub-a')

  expect(entries).toHaveLength(1)
  expect(entries[0]).toMatchObject({
    nodeClass: SubgraphClass,
    title: '退款子图',
    category: '子图',
  })
  expect(entries[0].defaults).toEqual({ targetGraphId: 'sub-b', title: '退款子图' })
})

test('执行组装按引用递归读取独立子图文件，并带上子图文件里的循环体', async () => {
  const rootGraph = json(
    [graphNode('start', 'start'), callNode('call-b', 'sub-b')],
    [],
    { loop: { nodes: [graphNode('loop-entry', 'loop-entry')], links: [], viewport: { x: 0, y: 0, zoom: 1 } } },
  )
  const subB = json(
    [graphNode('start-b', 'start'), callNode('call-c', 'sub-c')],
    [],
    { 'loop-b': { nodes: [graphNode('loop-entry-b', 'loop-entry')], links: [], viewport: { x: 0, y: 0, zoom: 1 } } },
  )
  const subC = json([graphNode('start-c', 'start'), graphNode('end-c', 'end')])
  const files = [meta('v', '主流程'), meta('sub-b', 'B', 'subgraph'), meta('sub-c', 'C', 'subgraph')]
  const load = vi.fn(async (id: string) => ({ 'sub-b': subB, 'sub-c': subC })[id] ?? null)

  const merged = await assembleExecutionGraph({
    root: rootGraph,
    current: files[0],
    files,
    load,
    isRegistered: () => true,
  })

  expect(load).toHaveBeenCalledWith('sub-b')
  expect(load).toHaveBeenCalledWith('sub-c')
  expect(Object.keys(merged.subgraphs).sort()).toEqual(['loop', 'loop-b', 'sub-b', 'sub-c'])
  expect(merged.subgraphs['sub-b'].nodes.map((node) => node.id)).toContain('call-c')
  // Keep the current file's loop body and do not read it twice.
  expect(merged.subgraphs['loop'].nodes[0].id).toBe('loop-entry')
})

test('执行组装拦截循环引用和缺失的子图文件', async () => {
  const rootGraph = json([callNode('call-b', 'sub-b')])
  const subB = json([callNode('back', 'v')])
  const files = [meta('v', '主流程'), meta('sub-b', 'B', 'subgraph')]

  await expect(
    assembleExecutionGraph({
      root: rootGraph,
      current: files[0],
      files,
      load: async (id) => (id === 'sub-b' ? subB : null),
      isRegistered: () => true,
    }),
  ).rejects.toThrow('子图循环引用：主流程 → B → 主流程')

  await expect(
    assembleExecutionGraph({
      root: json([callNode('call-missing', 'missing')]),
      current: files[0],
      files,
      load: async () => null,
      isRegistered: () => true,
    }),
  ).rejects.toThrow('引用的子图文件不存在：missing')

  // Returning to an already loaded file is still a cycle and must not be skipped because it is loaded.
  await expect(
    assembleExecutionGraph({
      root: json([callNode('call-b', 'sub-b')]),
      current: files[0],
      files: [...files, meta('sub-c', 'C', 'subgraph')],
      load: async (id) =>
        id === 'sub-b' ? json([callNode('to-c', 'sub-c')]) : json([callNode('back-b', 'sub-b')]),
      isRegistered: () => true,
    }),
  ).rejects.toThrow('子图循环引用：主流程 → B → C → B')
})

test('组装后的独立子图文件可以直接交给引擎执行', async () => {
  vi.spyOn(console, 'log').mockImplementation(() => {})
  const call = node('subgraph', 'call-sub')
  call.targetGraphId = 'sub'
  const rootGraph = json(
    [node('start', 'main-start'), call, node('Print', 'after')],
    [link('main-start', 'start', 'call-sub', 'subgraph'), link('call-sub', 'subgraph', 'after')],
  )
  const subGraph = json(
    [node('start', 'sub-start'), node('Print', 'sub-print')],
    [link('sub-start', 'start', 'sub-print')],
  )
  const files = [meta('main', '主流程'), meta('sub', '订单子图', 'subgraph')]

  const merged = await assembleExecutionGraph({
    root: rootGraph,
    current: files[0],
    files,
    load: async (id) => (id === 'sub' ? subGraph : null),
    isRegistered: () => true,
  })
  const instance = createEngine(merged.nodes, merged.links, merged.subgraphs)
  await instance.start()

  expect(instance.getNodeStatus('sub-print')).toBe('completed')
  expect(instance.getNodeStatus('after')).toBe('completed')
})

test('新建子图会保存为独立文件、带 Start + End，并出现在文件列表', async () => {
  seedView({ id: 'a', name: '视图 A', type: 'view', data: json(), updatedAt: 10 })
  await render()

  await act(async () => {
    await hook.createSubgraph('订单校验')
  })

  const saved = fakeStorage.saveView.mock.calls.at(-1)![0]
  expect(saved).toMatchObject({ name: '订单校验', type: 'subgraph' })
  expect(saved.data.nodes.map((node) => node.kind).sort()).toEqual(['end', 'start'])
  expect(saved.data.nodes.find((node) => node.kind === 'start')?.id).toBe(`start-${saved.id}`)
  expect(hook.views.find((view) => view.id === saved.id)?.type).toBe('subgraph')
  expect(hook.currentViewId).toBe(saved.id)
})

test('执行前通过当前文件组装引用子图，文件列表驱动添加面板条目', async () => {
  const main = json([graphNode('start', 'start'), callNode('call-sub', 'sub')])
  seedView({ id: 'a', name: '视图 A', type: 'view', data: main, updatedAt: 10 })
  seedView({
    id: 'sub',
    name: '订单子图',
    type: 'subgraph',
    data: json([graphNode('start-sub', 'start'), graphNode('end-sub', 'end')]),
    updatedAt: 5,
  })
  await render()

  const execution = await act(async () => hook.buildExecutionGraph())
  expect(execution.subgraphs.sub).toBeDefined()
  expect(execution.subgraphs.sub.nodes.map((node) => node.id)).toContain('end-sub')

  const paletteOptions = graph.setOptions.mock.calls.map(([options]) => options).find((options) => options.palette?.entries)!
  const entries = paletteOptions.palette.entries(graph)
  expect(entries.map((entry: { title: string }) => entry.title)).toEqual(['订单子图'])
})
