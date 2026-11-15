// @vitest-environment jsdom
import './language'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import type { JsonGraph } from '@lyx-pj/workflow-model'
import { useWorkflow } from '../packages/workflow/use-workflow'
import { fakeStorage, resetFakeStorage, seedView } from './fake-storage'

const { graph } = vi.hoisted(() => ({
  graph: {
    fromJSON: vi.fn(),
    toJSON: vi.fn(() => ({ nodes: [], links: [], variables: [], subgraphs: {}, viewport: { x: 0, y: 0, zoom: 1 } })),
    clear: vi.fn(),
    zoom: vi.fn(),
    setOptions: vi.fn(),
    position: { x: 0, y: 0 },
    isReplayMode: vi.fn(() => false),
    exitReplay: vi.fn(),
    nodeRegistry: { isRegistered: (type: string) => type !== 'OpenRouter' },
    // Autosave subscribes to canvas events; only a placeholder is needed here.
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
  },
}))

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

function Workflow() {
  const { loadError } = useWorkflow()
  return createElement('div', { role: 'status' }, loadError)
}

function savedGraph(): JsonGraph {
  return { nodes: [], links: [], variables: [], subgraphs: {}, viewport: { x: 0, y: 0, zoom: 1 } }
}

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  vi.clearAllMocks()
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

test('视图包含已移除节点时，明确提示且不部分恢复或覆盖存档', async () => {
  const json = savedGraph()
  json.subgraphs.child = {
    viewport: json.viewport,
    links: [],
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
  seedView({ id: 'a', name: '视图 A', data: json, updatedAt: 10 })

  await act(async () => root.render(createElement(Workflow)))

  expect(container.textContent).toContain('存档包含已移除的节点：OpenRouter')
  expect(container.textContent).toContain('原存档仍保留')
  expect(graph.fromJSON).not.toHaveBeenCalled()
  expect(fakeStorage.saveView).not.toHaveBeenCalled()
})

test('正常存档照常恢复，读取失败时展示原因', async () => {
  const json = savedGraph()
  seedView({ id: 'a', name: '视图 A', data: json, updatedAt: 10 })

  await act(async () => root.render(createElement(Workflow)))
  expect(graph.fromJSON).toHaveBeenCalledWith(json)
  expect(container.textContent).toBe('')
  await act(async () => root.unmount())

  root = createRoot(container)
  fakeStorage.loadView.mockRejectedValueOnce(new Error('存储不可用'))
  await act(async () => root.render(createElement(Workflow)))
  expect(container.textContent).toContain('存储不可用')
})

test('组件卸载后才返回的存档不再恢复到画布', async () => {
  let resolve!: (value: JsonGraph) => void
  fakeStorage.loadView.mockImplementationOnce(
    () =>
      new Promise((done) => {
        resolve = done
      }),
  )
  seedView({ id: 'a', name: '视图 A', data: savedGraph(), updatedAt: 10 })

  await act(async () => root.render(createElement(Workflow)))
  await act(async () => root.unmount())
  await act(async () => resolve(savedGraph()))
  expect(graph.fromJSON).not.toHaveBeenCalled()
})
