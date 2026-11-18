// @vitest-environment jsdom
import './language'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import type { JsonGraph } from '@lyx-pj/primflow-model'
import { AUTOSAVE_DELAY, useWorkflow } from '../packages/workflow/use-workflow'
import { fakeStorage, resetFakeStorage, seedView } from './fake-storage'

const { graph } = vi.hoisted(() => {
  const listeners = new Map<string, Set<(...args: unknown[]) => void>>()
  const json: JsonGraph = { nodes: [], links: [], variables: [], subgraphs: {}, viewport: { x: 0, y: 0, zoom: 1 } }
  const graph = {
    json,
    fromJSON: vi.fn(),
    toJSON: vi.fn(() => json),
    clear: vi.fn(),
    zoom: vi.fn(),
    setOptions: vi.fn(),
    position: { x: 0, y: 0 },
    isReplayMode: vi.fn(() => false),
    exitReplay: vi.fn(),
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
  return createElement(
    'div',
    { role: 'status' },
    `${hook.saveStatus.state}|${hook.saveStatus.message ?? ''}|${hook.loadError}`,
  )
}

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  vi.useFakeTimers()
  vi.clearAllMocks()
  resetFakeStorage()
  window.localStorage.clear()
  graph.isReplayMode.mockReturnValue(false)
  seedView({ id: 'a', name: '视图 A', data: graph.json, updatedAt: 10 })
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
  vi.useRealTimers()
})

/** Trigger a canvas event; it updates save state synchronously, so wrap it in act. */
async function emit(event: string, ...args: unknown[]) {
  await act(async () => {
    graph.emit(event, ...args)
  })
}

/** Advance the autosave debounce window. */
async function tickSave() {
  await act(async () => {
    vi.advanceTimersByTime(AUTOSAVE_DELAY)
  })
  // Persisting is async; run another tick so the save result lands.
  await act(async () => {})
}

test('内容变化后自动保存当前视图', async () => {
  await act(async () => root.render(createElement(Workflow)))
  expect(fakeStorage.saveView).not.toHaveBeenCalled()

  await emit('changed', { change: 'Property' })
  await tickSave()

  expect(fakeStorage.saveView).toHaveBeenCalledTimes(1)
  expect(fakeStorage.saveView).toHaveBeenCalledWith(
    expect.objectContaining({ id: 'a', name: '视图 A', data: graph.json }),
  )
  expect(container.textContent).toContain('saved')
})

test('连续变化只落盘一次，停止操作后保存最新画布', async () => {
  await act(async () => root.render(createElement(Workflow)))

  await emit('changed', { change: 'Property' })
  await act(async () => {
    vi.advanceTimersByTime(AUTOSAVE_DELAY / 2)
  })
  await emit('changed', { change: 'Property' })
  await act(async () => {
    vi.advanceTimersByTime(AUTOSAVE_DELAY / 2)
  })
  expect(fakeStorage.saveView).not.toHaveBeenCalled()

  await tickSave()
  expect(fakeStorage.saveView).toHaveBeenCalledTimes(1)
})

test('视口变化同样触发保存，缩放平移不会丢失', async () => {
  await act(async () => root.render(createElement(Workflow)))

  await emit('viewport:change', { x: 120, y: -80, scale: 1.5 })
  await tickSave()

  expect(fakeStorage.saveView).toHaveBeenCalledTimes(1)
})

test('存档恢复失败时不自动保存，保留原存档等待手动覆盖', async () => {
  const json: JsonGraph = {
    ...graph.json,
    subgraphs: {
      child: {
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
        links: [],
        viewport: { x: 0, y: 0, zoom: 1 },
      },
    },
  }
  resetFakeStorage()
  seedView({ id: 'a', name: '视图 A', data: json, updatedAt: 10 })

  await act(async () => root.render(createElement(Workflow)))
  await emit('changed', { change: 'Property' })
  await tickSave()

  expect(fakeStorage.saveView).not.toHaveBeenCalled()
  expect(container.textContent).toContain('自动保存已暂停')
})

test('保存失败时展示原因，后续变化会重试', async () => {
  fakeStorage.saveView.mockRejectedValueOnce(new Error('存储不可用'))
  await act(async () => root.render(createElement(Workflow)))

  await emit('changed', { change: 'Property' })
  await tickSave()
  expect(container.textContent).toContain('error')
  expect(container.textContent).toContain('存储不可用')

  await emit('changed', { change: 'Property' })
  await tickSave()
  expect(fakeStorage.saveView).toHaveBeenCalledTimes(2)
  expect(container.textContent).toContain('saved')
})

test('Ctrl/Cmd + S 立即保存，不等待防抖窗口', async () => {
  await act(async () => root.render(createElement(Workflow)))

  await act(async () => {
    hook.handleKeyDown({
      key: 's',
      ctrlKey: true,
      metaKey: false,
      preventDefault: vi.fn(),
    } as unknown as React.KeyboardEvent)
  })

  expect(fakeStorage.saveView).toHaveBeenCalledTimes(1)
})

test('组件卸载后不再保存', async () => {
  await act(async () => root.render(createElement(Workflow)))
  await emit('changed', { change: 'Property' })
  await act(async () => root.unmount())

  await act(async () => {
    vi.advanceTimersByTime(AUTOSAVE_DELAY)
  })
  expect(fakeStorage.saveView).not.toHaveBeenCalled()
})


test('回溯期间画布变更不写入当前视图', async () => {
  await act(async () => root.render(createElement(Workflow)))
  graph.isReplayMode.mockReturnValue(true)

  await emit('changed', { change: 'Property' })
  await tickSave()

  expect(fakeStorage.saveView).not.toHaveBeenCalled()
  graph.isReplayMode.mockReturnValue(false)
})

test('回溯期间 Ctrl/Cmd + S 不落盘也不提前退出回溯', async () => {
  await act(async () => root.render(createElement(Workflow)))
  graph.isReplayMode.mockReturnValue(true)

  await act(async () => {
    hook.handleKeyDown({ ctrlKey: true, key: 's', preventDefault: vi.fn() } as never)
  })

  expect(fakeStorage.saveView).not.toHaveBeenCalled()
  expect(graph.exitReplay).not.toHaveBeenCalled()
  graph.isReplayMode.mockReturnValue(false)
})
