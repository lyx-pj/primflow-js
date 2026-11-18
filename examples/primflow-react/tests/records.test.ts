import './language'
import { expect, test, vi } from 'vitest'
import type { DebugPanelData, Graph } from '@lyx-pj/primflow-canvas'
import type { JsonGraph } from '@lyx-pj/primflow-model'
import { bindWorkflowEvents } from '../packages/workflow/events'
import { setLanguage } from '../packages/workflow/i18n'
import { findEventNodes, formatOriginTitle, pickListenerNode } from '../packages/workflow/records'
import { createRegistry } from '../packages/workflow/nodes'
import type { ViewMeta } from '../packages/workflow/storage'
import { createEngine, link, node } from './helpers'

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
  expect(formatOriginTitle({ kind: 'event', nodeName: '事件监听', eventName: 'demo:message' })).toBe(
    '执行事件【事件监听】【demo:message】',
  )
})

test('按事件名找出节点，子图区域里的节点也参与匹配', () => {
  const json: JsonGraph = {
    nodes: [node('EventTrigger', 'trigger'), node('EventListener', 'listener')],
    links: [],
    variables: [],
    subgraphs: {
      child: {
        nodes: [node('EventListener', 'child-listener', { event: 'demo:other' })],
        links: [],
        viewport: { x: 0, y: 0, zoom: 1 },
      },
    },
    viewport: { x: 0, y: 0, zoom: 1 },
  }

  expect(findEventNodes(json, 'demo:message').map((item) => item.id)).toEqual([
    'trigger',
    'listener',
  ])
  expect(findEventNodes(json, 'demo:other').map((item) => item.id)).toEqual(['child-listener'])
})

test('同名节点里优先选 source 型的监听节点', () => {
  const json: JsonGraph = {
    nodes: [node('EventTrigger', 'trigger'), node('EventListener', 'listener')],
    links: [],
    variables: [],
    subgraphs: {},
    viewport: { x: 0, y: 0, zoom: 1 },
  }
  const matched = findEventNodes(json, 'demo:message')
  const isSource = (nodeType: string) => nodeType === 'EventListener'

  expect(pickListenerNode(matched, isSource)?.id).toBe('listener')
  // Fall back to the first match when no source node exists, so the title is not empty.
  expect(pickListenerNode(matched, () => false)?.id).toBe('trigger')
})

/**
 * Run the real engine once and pull the debug panel records.
 *
 * Use a minimal canvas stub: panel data arrives through setOptions, and the test only needs to retain it.
 */
async function runRecords(view: ViewMeta) {
  const registry = createRegistry()
  const engine = createEngine(
    [node('start'), node('EventTrigger', 'trigger'), node('EventListener', 'listener')],
    [link('start', 'start', 'trigger')],
  )
  let panel: { data?: () => DebugPanelData } | undefined
  const graph = {
    nodeRegistry: { getNodeClass: (type: string) => registry.getNodeClass(type) },
    findNodeAnywhere: () => undefined,
    setOptions: (options: Record<string, unknown>) => {
      if (options.debugPanel && typeof options.debugPanel === 'object') panel = options.debugPanel
    },
    refreshDebugPanel: () => {},
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
  await engine.process()
  // Event emission starts another task; wait for it to be created before reading records.
  await vi.waitFor(() => expect(engine.getTasks().length).toBe(2))
  // Only after Stop does the current session's task enter history.
  engine.stop()
  const records = panel?.data?.().records ?? []
  dispose()
  return records
}

test('英文浏览器语言下执行记录使用英文标题', () => {
  setLanguage('en')

  expect(formatOriginTitle({ kind: 'flow', viewName: 'Order flow', viewType: 'view' })).toBe(
    'Run [Order flow]',
  )
  expect(formatOriginTitle({ kind: 'flow', viewName: 'Order subgraph', viewType: 'subgraph' })).toBe(
    'Run [Subgraph] [Order subgraph]',
  )
  expect(formatOriginTitle({ kind: 'event', nodeName: 'Event Listen', eventName: 'demo:message' })).toBe(
    'Run event [Event Listen] [demo:message]',
  )
})

test('执行记录按发起它的视图命名：普通视图、子图文件、事件各有一种', async () => {
  const view: ViewMeta = { id: 'view-1', name: '订单流程', type: 'view', updatedAt: 0 }
  const records = await runRecords(view)
  expect(records.map((record) => record.title)).toEqual([
    '执行事件【事件监听】【demo:message】',
    '执行【订单流程】',
  ])

  const subgraphRecords = await runRecords({ ...view, name: '订单子图', type: 'subgraph' })
  expect(subgraphRecords.map((record) => record.title)).toEqual([
    '执行事件【事件监听】【demo:message】',
    '执行【子图】【订单子图】',
  ])
})
