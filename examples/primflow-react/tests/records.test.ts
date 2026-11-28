import './language'
import { expect, test, vi } from 'vitest'
import type { DebugPanelData, Graph } from '@lyx-pj/primflow-canvas'
import type { JsonGraph } from '@lyx-pj/primflow-model'
import { bindWorkflowEvents } from '../packages/workflow/events'
import { setLanguage } from '../packages/workflow/i18n'
import { findEventNodes, formatOriginTitle, pickListenerNode } from '../packages/workflow/records'
import { createRegistry } from '../packages/workflow/nodes'
import type { ViewMeta } from '../packages/workflow/storage'
import { createEngine, link, node, type DemoEngine } from './helpers'

type DemoDefs = ReturnType<typeof createRegistry>['registry']

test('普通视图执行按视图名命名，子图文件多标一个【子图】', () => {
  expect(formatOriginTitle({ kind: 'flow', viewName: '订单流程', viewType: 'view' })).toBe(
    '执行【订单流程】',
  )
  expect(formatOriginTitle({ kind: 'flow', viewName: '订单子图', viewType: 'subgraph' })).toBe(
    '执行【子图】【订单子图】',
  )
})

test('事件执行带上监听节点与事件名', () => {
  expect(formatOriginTitle({ kind: 'event', nodeName: '监听事件', eventName: 'demo' })).toBe(
    '执行事件【监听事件】【demo】',
  )
})

test('按事件名找出节点，子图区域里的节点也参与匹配', () => {
  const json: JsonGraph = {
    nodes: [node('EmitEvent', 'trigger'), node('OnEvent', 'listener')],
    links: [],
    variables: [],
    subgraphs: {
      child: {
        nodes: [node('OnEvent', 'child-listener', { event: 'demo:other' })],
        links: [],
        viewport: { x: 0, y: 0, zoom: 1 },
      },
    },
    viewport: { x: 0, y: 0, zoom: 1 },
  }

  expect(findEventNodes(json, 'demo').map((item) => item.id)).toEqual([
    'trigger',
    'listener',
  ])
  expect(findEventNodes(json, 'demo:other').map((item) => item.id)).toEqual(['child-listener'])
})

test('同名节点里优先选 source 型的监听节点', () => {
  const json: JsonGraph = {
    nodes: [node('EmitEvent', 'trigger'), node('OnEvent', 'listener')],
    links: [],
    variables: [],
    subgraphs: {},
    viewport: { x: 0, y: 0, zoom: 1 },
  }
  const matched = findEventNodes(json, 'demo')
  const isSource = (nodeType: string) => nodeType === 'OnEvent'

  expect(pickListenerNode(matched, isSource)?.id).toBe('listener')
  // Fall back to the first match when no source node exists, so the title is not empty.
  expect(pickListenerNode(matched, () => false)?.id).toBe('trigger')
})

/**
 * Bind the example events to a real engine and expose the debug panel data.
 *
 * Use a minimal canvas stub: panel data arrives through setOptions, and the test only needs to retain it.
 */
function bindPanel(engine: DemoEngine, view: ViewMeta) {
  const registry = createRegistry()
  let panel: { data?: () => DebugPanelData } | undefined
  const graph = {
    nodeRegistry: registry,
    findNodeAnywhere: () => undefined,
    setOptions: (options: Record<string, unknown>) => {
      if (options.debugPanel && typeof options.debugPanel === 'object') panel = options.debugPanel
    },
    refreshDebugPanel: () => {},
    clearNodeProgress: () => {},
    isReplayMode: () => false,
    exitReplay: () => {},
    enterReplay: () => {},
    setExecutionStatus: () => {},
    resetNodeExecutionStatuses: () => {},
    setNodeExecutionStatus: () => {},
    on: () => {},
    off: () => {},
  }

  const dispose = bindWorkflowEvents(graph as unknown as Graph<DemoDefs>, engine, {
    getCurrentView: () => view,
  })
  return { dispose, records: () => panel?.data?.().records ?? [] }
}

/**
 * Run the real engine once and pull the debug panel records.
 */
async function runRecords(view: ViewMeta) {
  const engine = createEngine(
    [node('start'), node('EmitEvent', 'trigger'), node('OnEvent', 'listener')],
    [link('start', 'start', 'trigger')],
  )
  const { dispose, records } = bindPanel(engine, view)
  await engine.start()
  // Event emission starts another task; wait for it to be created before reading records.
  await vi.waitFor(() => expect(engine.getTasks().length).toBe(2))
  engine.stop()
  const list = records()
  dispose()
  return list
}

test('英文浏览器语言下执行记录使用英文标题', () => {
  setLanguage('en')

  expect(formatOriginTitle({ kind: 'flow', viewName: 'Order flow', viewType: 'view' })).toBe(
    'Run [Order flow]',
  )
  expect(formatOriginTitle({ kind: 'flow', viewName: 'Order subgraph', viewType: 'subgraph' })).toBe(
    'Run [Subgraph] [Order subgraph]',
  )
  expect(formatOriginTitle({ kind: 'event', nodeName: 'On Event', eventName: 'demo' })).toBe(
    'Run event [On Event] [demo]',
  )
})

test('执行记录按发起它的视图命名：普通视图、子图文件、事件各有一种', async () => {
  const view: ViewMeta = { id: 'view-1', name: '订单流程', type: 'view', updatedAt: 0 }
  const records = await runRecords(view)
  expect(records.map((record) => record.title)).toEqual([
    '执行事件【监听事件】【demo】',
    '执行【订单流程】',
  ])

  const subgraphRecords = await runRecords({ ...view, name: '订单子图', type: 'subgraph' })
  expect(subgraphRecords.map((record) => record.title)).toEqual([
    '执行事件【监听事件】【demo】',
    '执行【子图】【订单子图】',
  ])
})

test('执行中的任务出现在执行记录里，状态为运行中且不可回溯', async () => {
  const view: ViewMeta = { id: 'view-1', name: '订单流程', type: 'view', updatedAt: 0 }
  // The delay node keeps the task running while the records are read.
  const engine = createEngine(
    [node('start'), node('Delay', 'delay', { duration: 5000 })],
    [link('start', 'start', 'delay')],
  )
  const { dispose, records } = bindPanel(engine, view)
  void engine.start()
  await vi.waitFor(() => expect(engine.getTasks().length).toBe(1))

  const running = records()
  expect(running).toHaveLength(1)
  expect(running[0]).toMatchObject({
    title: '执行【订单流程】',
    status: 'running',
    selectable: false,
  })
  // A running task has no final snapshot yet, so it offers no duration.
  expect(running[0].endedAt).toBeUndefined()

  dispose()
})

test('任务结束后仍在执行记录里，状态更新为已完成并可回溯', async () => {
  const view: ViewMeta = { id: 'view-1', name: '订单流程', type: 'view', updatedAt: 0 }
  const engine = createEngine(
    [node('start'), node('Delay', 'delay', { duration: 10 })],
    [link('start', 'start', 'delay')],
  )
  const { dispose, records } = bindPanel(engine, view)
  await engine.start()
  await vi.waitFor(() => expect(engine.getTasks()[0]?.status).toBe('completed'))

  const finished = records()
  expect(finished).toHaveLength(1)
  expect(finished[0]).toMatchObject({
    title: '执行【订单流程】',
    status: 'completed',
    selectable: true,
  })

  dispose()
})
