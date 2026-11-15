import './language'
import { afterEach, expect, test } from 'vitest'
import {
  appendDebugLog,
  getTaskTrace,
  resetDebugTrace,
  setActiveDebugTask,
  traceNodeExecution,
} from '../packages/workflow/debug'

afterEach(() => {
  resetDebugTrace()
})

test('日志按任务隔离，没有任务时可退回最近一次执行', () => {
  appendDebugLog('第一条', { taskId: 'task-1' })
  appendDebugLog('第二条', { taskId: 'task-2' })
  setActiveDebugTask('task-2')
  appendDebugLog('退回写入')

  expect(getTaskTrace('task-1').logs.map((entry) => entry.message)).toEqual(['第一条'])
  expect(getTaskTrace('task-2').logs.map((entry) => entry.message)).toEqual(['第二条', '退回写入'])
  expect(getTaskTrace('missing').logs).toEqual([])
})

test('执行链只记录 running 与 completed，同一节点连续更新为同一项', () => {
  traceNodeExecution('task-1', 'node-a', 'pending', 'A')
  traceNodeExecution('task-1', 'node-a', 'running', 'A')
  traceNodeExecution('task-1', 'node-a', 'completed', 'A')
  traceNodeExecution('task-1', 'node-b', 'running', 'B')
  traceNodeExecution('task-1', 'node-a', 'running', 'A')

  const chain = getTaskTrace('task-1').chain
  expect(chain).toEqual([
    { nodeId: 'node-a', status: 'completed', label: 'A' },
    { nodeId: 'node-b', status: 'running', label: 'B' },
    { nodeId: 'node-a', status: 'running', label: 'A' },
  ])
})

test('子图节点完成晚于内部节点，执行链原地更新不会停在执行中', () => {
  const scope = { subgraphId: 'child', title: '订单子图', depth: 1 }
  traceNodeExecution('task-1', 'call', 'running', '调用子图', undefined, 'subgraph')
  traceNodeExecution('task-1', 'child-step', 'running', '内部节点', scope)
  traceNodeExecution('task-1', 'child-step', 'completed', '内部节点', scope)
  traceNodeExecution('task-1', 'call', 'completed', '调用子图', undefined, 'subgraph')

  const chain = getTaskTrace('task-1').chain
  expect(chain).toEqual([
    { nodeId: 'call', status: 'completed', label: '调用子图', scope: undefined, kind: 'subgraph' },
    { nodeId: 'child-step', status: 'completed', label: '内部节点', scope, kind: undefined },
  ])
})

test('子图日志带上作用域，面板据此显示 [子图名]', () => {
  const scope = { subgraphId: 'child', title: '订单子图', depth: 1 }
  appendDebugLog('内部节点执行完成', { taskId: 'task-1', nodeId: 'child-step', scope })

  expect(getTaskTrace('task-1').logs[0]).toMatchObject({ nodeId: 'child-step', scope })
})
