// @vitest-environment jsdom
import './language'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import type { JsonGraph } from '@lyx-pj/primflow-model'
import { useWorkflow } from '../packages/workflow/use-workflow'
import { fakeStorage, resetFakeStorage, seedView } from './fake-storage'
import { link, node } from './helpers'

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

test.each(['OpenRouter', 'AnyInput'])('存档包含已移除的 %s 时，保留原文件并提示', async (removedType) => {
  graph.nodeRegistry.isRegistered = (type: string) => type !== removedType
  const json = savedGraph()
  json.subgraphs.child = {
    viewport: json.viewport,
    links: [],
    nodes: [
      {
        id: 'legacy',
        definitionId: removedType,
        kind: 'default',
        position: { x: 0, y: 0 },
        inputValues: {},
        inputs: [],
        outputs: [],
      },
    ],
  }
  seedView({ id: 'a', name: '视图 A', data: json, updatedAt: 10 })

  await act(async () => root.render(createElement(Workflow)))

  expect(container.textContent).toContain(`存档包含已移除的节点：${removedType}`)
  expect(container.textContent).toContain('原存档仍保留')
  expect(graph.fromJSON).not.toHaveBeenCalled()
  expect(fakeStorage.saveView).not.toHaveBeenCalled()
})

test.each([['TextInput', 'value', '你好，工作流'], ['GetVariable', 'name', 'status']] as const)(
  '旧存档绕过 %s 已移除的执行端口并保留数据线',
  async (nodeType, inputName, inputValue) => {
    const json = savedGraph()
    const legacyInput = (id: string) => {
      const input = node(nodeType, id)
      return {
        ...input,
        breakpoint: true,
        inputs: [{ name: 'exec', id: 'in-exec', type: 'exec' }, ...input.inputs.filter((port) => port.type !== 'exec')],
        outputs: [{ name: 'exec', id: 'out-exec', type: 'exec' }, ...input.outputs.filter((port) => port.type !== 'exec')],
      }
    }
    const data = link('second', 'value', 'Print', 'message')
    json.nodes = [node('start'), legacyInput('first'), legacyInput('second'), node('Print')]
    json.links = [link('start', 'start', 'first'), link('first', 'exec', 'second'), link('second', 'exec', 'Print'), data]
    json.subgraphs.child = { nodes: json.nodes, links: json.links, viewport: json.viewport }
    seedView({ id: 'a', name: '视图 A', data: json, updatedAt: 10 })

    await act(async () => root.render(createElement(Workflow)))

    const [[restored]] = graph.fromJSON.mock.calls as [[JsonGraph]]
    for (const region of [restored, restored.subgraphs.child]) {
      expect(region.links).toContainEqual(data)
      expect(region.links).toContainEqual(expect.objectContaining({ source: { id: 'start', port: 'out-start' }, target: { id: 'Print', port: 'in-exec' } }))
      expect(region.links).toHaveLength(2)
      expect(region.nodes.find((item) => item.id === 'first')).toMatchObject({
        breakpoint: false, inputValues: { [inputName]: inputValue },
        inputs: [{ name: inputName, id: `in-${inputName}` }], outputs: [{ name: 'value', id: 'out-value' }],
      })
    }
    expect(json.links).toHaveLength(4)
  },
)

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
