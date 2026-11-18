// @vitest-environment jsdom
import './language'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import type { JsonGraph } from '@lyx-pj/primflow-model'
import { useWorkflow } from '../packages/workflow/use-workflow'
import { fakeStorage, resetFakeStorage, seedView } from './fake-storage'

const { graph } = vi.hoisted(() => {
  const listeners = new Map<string, Set<(...args: unknown[]) => void>>()
  const json: JsonGraph = { nodes: [], links: [], variables: [], subgraphs: {}, viewport: { x: 0, y: 0, zoom: 1 } }
  const graph = {
    json,
    fromJSON: vi.fn(() => { graph.model.subgraphStack = [{ id: 'root' }] }),
    toJSON: vi.fn(() => json),
    clear: vi.fn(),
    zoom: vi.fn(),
    setOptions: vi.fn(),
    position: { x: 0, y: 0 },
    isReplayMode: vi.fn(() => false),
    exitReplay: vi.fn(),
    model: {
      subgraphStack: [{ id: 'root' }],
      hasSubgraph: vi.fn(() => true),
    },
    enterSubgraph: vi.fn((id: string) => { graph.model.subgraphStack.push({ id }) }),
    exitSubgraph: vi.fn(() => { graph.model.subgraphStack.pop() }),
    nodeRegistry: { isRegistered: vi.fn((type: string) => type !== 'OpenRouter') },
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
    emit(event: string, ...args: unknown[]) {
      listeners.get(event)?.forEach((handler) => handler(...args))
      return graph
    },
  }
  return { graph }
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
  return createElement('div', { role: 'status' }, hook.loadError)
}

function graphData(marker: string): JsonGraph {
  return {
    nodes: [],
    links: [],
    variables: [{ name: 'marker', type: 'string', value: marker }],
    subgraphs: {},
    viewport: { x: 0, y: 0, zoom: 1 },
  }
}

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  vi.clearAllMocks()
  graph.model.subgraphStack = [{ id: 'root' }]
  resetFakeStorage()
  window.localStorage.clear()
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
})

async function render() {
  await act(async () => root.render(createElement(Workflow)))
}

test('第一次打开会创建第一个视图并选中', async () => {
  await render()

  expect(fakeStorage.saveView).toHaveBeenCalledTimes(1)
  const created = fakeStorage.saveView.mock.calls[0][0]
  expect(created.name).toBe('视图 1')
  expect(created.data).toEqual(graph.json)
  expect(hook.views.map((view) => view.id)).toEqual([created.id])
  expect(hook.currentViewId).toBe(created.id)
})

test('本地视图读回前保持启动态，避免先显示默认画布', async () => {
  seedView({ id: 'a', name: '视图 A', data: graphData('a'), updatedAt: 10 })
  let resolveLoad!: (data: JsonGraph) => void
  fakeStorage.loadView.mockImplementationOnce(
    () => new Promise<JsonGraph | null>((resolve) => {
      resolveLoad = resolve
    }),
  )

  await render()
  expect(hook.booting).toBe(true)
  expect(hook.currentViewId).toBe('a')

  await act(async () => {
    resolveLoad(graphData('a'))
    await Promise.resolve()
  })
  expect(hook.booting).toBe(false)
  expect(graph.fromJSON).toHaveBeenCalledWith(graphData('a'))
})

test('打开时恢复上次使用的视图', async () => {
  seedView({ id: 'a', name: '视图 A', data: graphData('a'), updatedAt: 10 })
  seedView({ id: 'b', name: '视图 B', data: graphData('b'), updatedAt: 20 })
  window.localStorage.setItem('bpgraph:lastViewId', 'a')

  await render()

  expect(fakeStorage.loadView).toHaveBeenCalledWith('a')
  expect(graph.fromJSON).toHaveBeenCalledWith(graphData('a'))
  expect(hook.currentViewId).toBe('a')
})

test('没有历史记录时打开最近更新的视图', async () => {
  seedView({ id: 'a', name: '视图 A', data: graphData('a'), updatedAt: 10 })
  seedView({ id: 'b', name: '视图 B', data: graphData('b'), updatedAt: 20 })

  await render()

  expect(hook.currentViewId).toBe('b')
})

test('切换视图会先落盘当前视图，再把目标视图读回画布', async () => {
  seedView({ id: 'a', name: '视图 A', data: graphData('a'), updatedAt: 10 })
  seedView({ id: 'b', name: '视图 B', data: graphData('b'), updatedAt: 20 })
  await render()
  vi.clearAllMocks()

  await act(async () => {
    await hook.switchView('a')
  })

  // Save the current view first so unsaved changes are not written into the new view.
  expect(fakeStorage.saveView.mock.calls[0][0].id).toBe('b')
  expect(graph.fromJSON).toHaveBeenCalledWith(graphData('a'))
  expect(hook.currentViewId).toBe('a')
})

function seedNavigationViews() {
  seedView({ id: 'a', name: '视图 A', data: graphData('a'), updatedAt: 30 })
  seedView({ id: 'b', name: '子图 B', type: 'subgraph', data: graphData('b'), updatedAt: 20 })
  seedView({ id: 'c', name: '子图 C', type: 'subgraph', data: graphData('c'), updatedAt: 10 })
}

function navigation() {
  return graph.setOptions.mock.calls.map(([options]) => options.navigation).filter(Boolean).at(-1)!
}

test('双击打开外部子图后可逐层返回来源文件，并先保存当前修改', async () => {
  seedNavigationViews()
  await render()
  expect(navigation().canGoBack()).toBe(false)
  await act(async () => hook.openSubgraph('b'))
  await act(async () => hook.openSubgraph('c'))
  expect(hook.currentViewId).toBe('c')
  expect(navigation().canGoBack()).toBe(true)

  fakeStorage.saveView.mockClear()
  await act(async () => navigation().goBack())
  expect(hook.currentViewId).toBe('b')
  expect(fakeStorage.saveView.mock.calls[0][0].id).toBe('c')
  await act(async () => navigation().goBack())
  expect(hook.currentViewId).toBe('a')
  expect(navigation().canGoBack()).toBe(false)
})

test.each(['b', 'c'])('文件列表直接选择 %s 会清空子图返回路径', async (id) => {
  seedNavigationViews()
  await render()
  await act(async () => hook.openSubgraph('b'))
  await act(async () => hook.switchView(id))
  expect(navigation().canGoBack()).toBe(false)
})

test('返回时保存失败会留在当前子图，保留路径供重试', async () => {
  seedNavigationViews()
  await render()
  await act(async () => hook.openSubgraph('b'))
  fakeStorage.saveView.mockRejectedValueOnce(new Error('存储不可用'))
  await act(async () => navigation().goBack())
  expect(hook.currentViewId).toBe('b')
  expect(navigation().canGoBack()).toBe(true)
  expect(hook.saveStatus).toMatchObject({ state: 'error', message: '存储不可用' })
  await act(async () => navigation().goBack())
  expect(hook.currentViewId).toBe('a')
})

test('从循环体打开外部子图后，返回时恢复来源的内嵌层级', async () => {
  seedNavigationViews()
  await render()
  graph.model.subgraphStack.push({ id: 'loop-body' })
  await act(async () => hook.openSubgraph('b'))
  expect(graph.model.subgraphStack).toEqual([{ id: 'root' }])
  await act(async () => navigation().goBack())
  expect(hook.currentViewId).toBe('a')
  expect(graph.model.subgraphStack).toEqual([{ id: 'root' }, { id: 'loop-body' }])
})

test('外部子图加载失败仍能返回来源，失败存档不会被覆盖', async () => {
  seedNavigationViews()
  await render()
  fakeStorage.loadView.mockRejectedValueOnce(new Error('读取失败'))
  await act(async () => hook.openSubgraph('b'))
  expect(hook.loadError).toContain('读取失败')
  expect(navigation().canGoBack()).toBe(true)
  fakeStorage.saveView.mockClear()
  await act(async () => navigation().goBack())
  expect(hook.currentViewId).toBe('a')
  expect(fakeStorage.saveView).not.toHaveBeenCalled()
})

test('返回来源时加载失败保留路径，再次返回可重试且不会覆盖失败存档', async () => {
  seedNavigationViews()
  await render()
  await act(async () => hook.openSubgraph('b'))
  fakeStorage.loadView.mockRejectedValueOnce(new Error('读取失败'))
  await act(async () => navigation().goBack())
  expect(hook.loadError).toContain('读取失败')
  expect(navigation().canGoBack()).toBe(true)
  fakeStorage.saveView.mockClear()
  await act(async () => navigation().goBack())
  expect(hook.currentViewId).toBe('a')
  expect(hook.loadError).toBe('')
  expect(navigation().canGoBack()).toBe(false)
  expect(fakeStorage.saveView).not.toHaveBeenCalled()
})

test('文件切换期间的重复进入不会增加返回层级', async () => {
  seedNavigationViews()
  await render()
  let finishSave!: () => void
  fakeStorage.saveView.mockImplementationOnce(() => new Promise<void>((resolve) => { finishSave = resolve }))
  await act(async () => {
    const opening = hook.openSubgraph('b')
    await hook.openSubgraph('c')
    finishSave()
    await opening
  })
  expect(hook.currentViewId).toBe('b')
  await act(async () => navigation().goBack())
  expect(hook.currentViewId).toBe('a')
  expect(navigation().canGoBack()).toBe(false)
})

test('新增视图会清空画布并切换过去', async () => {
  seedView({ id: 'a', name: '视图 A', data: graphData('a'), updatedAt: 10 })
  await render()
  vi.clearAllMocks()

  await act(async () => {
    await hook.createView('新视图')
  })

  expect(graph.clear).toHaveBeenCalled()
  const created = fakeStorage.saveView.mock.calls.at(-1)![0]
  expect(created.name).toBe('新视图')
  expect(hook.views.map((view) => view.name)).toEqual(['视图 A', '新视图'])
  expect(hook.currentViewId).toBe(created.id)
})

test('重命名视图会更新列表和存储，不影响当前视图', async () => {
  seedView({ id: 'a', name: '视图 A', data: graphData('a'), updatedAt: 10 })
  seedView({ id: 'b', name: '视图 B', data: graphData('b'), updatedAt: 20 })
  await render()
  vi.clearAllMocks()

  await act(async () => {
    await hook.renameView('a', '订单流程')
  })

  expect(fakeStorage.renameView).toHaveBeenCalledWith('a', '订单流程')
  expect(hook.views.map((view) => view.name)).toEqual(['视图 B', '订单流程'])
  expect(hook.currentViewId).toBe('b')
})

test('重命名当前视图后，落盘使用新名称', async () => {
  seedView({ id: 'a', name: '视图 A', data: graphData('a'), updatedAt: 10 })
  seedView({ id: 'b', name: '视图 B', data: graphData('b'), updatedAt: 20 })
  await render()
  vi.clearAllMocks()

  await act(async () => {
    await hook.renameView('b', '订单流程')
  })
  // The current view is saved before switching; names must use the renamed value so the old name is not written back.
  await act(async () => {
    await hook.switchView('a')
  })

  const persisted = fakeStorage.saveView.mock.calls.find(([view]) => view.id === 'b')
  expect(persisted?.[0].name).toBe('订单流程')
})

test('空名称、同名和未知视图都不会触发重命名', async () => {
  seedView({ id: 'a', name: '视图 A', data: graphData('a'), updatedAt: 10 })
  await render()
  vi.clearAllMocks()

  await act(async () => {
    await hook.renameView('a', '   ')
    await hook.renameView('a', '视图 A')
    await hook.renameView('missing', '新名字')
  })

  expect(fakeStorage.renameView).not.toHaveBeenCalled()
})

test('重命名落盘失败时回滚名称并提示原因', async () => {
  seedView({ id: 'a', name: '视图 A', data: graphData('a'), updatedAt: 10 })
  seedView({ id: 'b', name: '视图 B', data: graphData('b'), updatedAt: 20 })
  await render()
  fakeStorage.renameView.mockRejectedValueOnce(new Error('存储不可用'))

  await act(async () => {
    await hook.renameView('b', '订单流程')
  })

  expect(hook.views.find((view) => view.id === 'b')?.name).toBe('视图 B')
  expect(hook.saveStatus).toMatchObject({ state: 'error', message: '存储不可用' })
  // Roll back the in-memory current view name too; later saves must not use a failed new name.
  await act(async () => {
    await hook.switchView('a')
  })
  expect(fakeStorage.saveView.mock.calls.find(([view]) => view.id === 'b')?.[0].name).toBe('视图 B')
})

test('删除当前视图后切到剩下的视图', async () => {
  seedView({ id: 'a', name: '视图 A', data: graphData('a'), updatedAt: 10 })
  seedView({ id: 'b', name: '视图 B', data: graphData('b'), updatedAt: 20 })
  await render()
  expect(hook.currentViewId).toBe('b')

  await act(async () => {
    await hook.deleteView('b')
  })

  expect(fakeStorage.deleteView).toHaveBeenCalledWith('b')
  expect(hook.views.map((view) => view.id)).toEqual(['a'])
  expect(hook.currentViewId).toBe('a')
  expect(graph.fromJSON).toHaveBeenCalledWith(graphData('a'))
})

test('删除非当前视图不会改变当前视图', async () => {
  seedView({ id: 'a', name: '视图 A', data: graphData('a'), updatedAt: 10 })
  seedView({ id: 'b', name: '视图 B', data: graphData('b'), updatedAt: 20 })
  await render()
  expect(hook.currentViewId).toBe('b')

  await act(async () => {
    await hook.deleteView('a')
  })

  expect(hook.views.map((view) => view.id)).toEqual(['b'])
  expect(hook.currentViewId).toBe('b')
})

test('删除最后一个视图会新建空白视图', async () => {
  seedView({ id: 'a', name: '视图 A', data: graphData('a'), updatedAt: 10 })
  await render()

  await act(async () => {
    await hook.deleteView('a')
  })

  expect(hook.views).toHaveLength(1)
  expect(hook.views[0].name).toBe('视图 1')
  expect(hook.currentViewId).toBe(hook.views[0].id)
  expect(graph.clear).toHaveBeenCalled()
})

test('视图里的节点类型已被移除时提示失败且不覆盖存档', async () => {
  const broken: JsonGraph = {
    ...graphData('a'),
    nodes: [
      {
        id: 'legacy',
        nodeType: 'OpenRouter',
        type: 'default',
        position: { x: 0, y: 0 },
        values: {},
        inputs: [],
        outputs: [],
      },
    ],
  }
  // The failed view has the newest update time, so opening lands on it first.
  seedView({ id: 'a', name: '视图 A', data: broken, updatedAt: 30 })
  seedView({ id: 'b', name: '视图 B', data: graphData('b'), updatedAt: 20 })
  await render()

  expect(container.textContent).toContain('存档包含已移除的节点：OpenRouter')
  expect(graph.fromJSON).not.toHaveBeenCalled()
  expect(fakeStorage.saveView).not.toHaveBeenCalled()
})

test('恢复失败的视图在切换时不会被空画布覆盖', async () => {
  const broken: JsonGraph = {
    ...graphData('a'),
    nodes: [
      {
        id: 'legacy',
        nodeType: 'OpenRouter',
        type: 'default',
        position: { x: 0, y: 0 },
        values: {},
        inputs: [],
        outputs: [],
      },
    ],
  }
  // The failed view has the newest update time, so opening lands on it first.
  seedView({ id: 'a', name: '视图 A', data: broken, updatedAt: 30 })
  seedView({ id: 'b', name: '视图 B', data: graphData('b'), updatedAt: 20 })
  await render()
  expect(container.textContent).toContain('存档包含已移除的节点：OpenRouter')

  await act(async () => {
    await hook.switchView('b')
  })

  // Only the target view is written during the switch; the failed view stays unchanged.
  expect(fakeStorage.saveView.mock.calls.map((call) => call[0].id)).not.toContain('a')
  expect(hook.currentViewId).toBe('b')
  expect(graph.fromJSON).toHaveBeenCalledWith(graphData('b'))
})
