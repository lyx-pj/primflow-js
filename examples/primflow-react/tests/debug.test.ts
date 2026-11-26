import './language'
import { afterEach, expect, test, vi } from 'vitest'
import type { TaskTrace } from '@lyx-pj/primflow-engine'
import {
  appendBusinessLog,
  getBusinessLogs,
  mergeTaskLogs,
  resetBusinessLogs,
  taskLogEntries,
  traceToLogEntries,
} from '../packages/workflow/debug'
import { buildNodeExecutionInfo } from '../packages/workflow/scopes'
import { createEngine, link, node, stopEngines } from './helpers'

afterEach(() => {
  resetBusinessLogs()
  stopEngines()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

function trace(): TaskTrace {
  return {
    taskId: 'task-1',
    events: [
      { sequence: 1, at: 1000, type: 'task:status', status: 'running' },
      { sequence: 2, at: 1100, type: 'activation:status', activationId: 1, status: 'running' },
      { sequence: 3, at: 1200, type: 'activation:status', activationId: 1, status: 'completed' },
      { sequence: 4, at: 1300, type: 'task:status', status: 'completed' },
    ],
    activations: [
      { id: 1, nodeId: 'node-a', graphId: '', portId: 'exec', kind: 'node', status: 'completed' },
    ],
    droppedEvents: 0,
    droppedActivations: 0,
  }
}

test('引擎执行日志按事件逐条转换，保留引擎事件类型', () => {
  const entries = traceToLogEntries(trace())

  expect(entries.map((entry) => entry.type)).toEqual([
    'task:status',
    'activation:status',
    'activation:status',
    'task:status',
  ])
  expect(entries.map((entry) => entry.time)).toEqual([1000, 1100, 1200, 1300])
  expect(entries[0].message).toBe('Task running')
  expect(entries[1].message).toBe('Activation 1 running')
  expect(entries[1].nodeId).toBe('node-a')
  expect(entries[1].activationId).toBe(1)
})

test('任务与执行状态决定日志级别', () => {
  const entries = traceToLogEntries(trace())
  expect(entries[0].level).toBe('info')
  expect(entries[2].level).toBe('success')
  expect(entries[3].level).toBe('success')

  const failed = traceToLogEntries({
    ...trace(),
    events: [
      { sequence: 1, at: 1000, type: 'task:status', status: 'failed' },
      { sequence: 2, at: 1100, type: 'task:error', errorIndex: 0, nodeId: 'node-a' },
    ],
  })
  expect(failed[0].level).toBe('error')
  expect(failed[1].level).toBe('error')
})

test('没有执行日志时返回空列表', () => {
  expect(traceToLogEntries(undefined)).toEqual([])
})

test('子图节点带上作用域，面板据此显示 [子图名]', () => {
  const scope = { subgraphId: 'child', title: '订单子图', depth: 1 }
  const entries = traceToLogEntries(trace(), new Map([['node-a', { title: 'A', nodeType: 'step', scope }]]))

  expect(entries[1].scope).toEqual(scope)
})

test('业务日志按任务隔离，与引擎日志合并后按时间排序', () => {
  appendBusinessLog('task-1', '业务输出')
  appendBusinessLog('task-2', '另一个任务的输出')

  expect(getBusinessLogs('task-1').map((entry) => entry.message)).toEqual(['业务输出'])
  expect(getBusinessLogs('missing')).toEqual([])

  const merged = mergeTaskLogs(trace(), [
    { time: 1050, message: '业务输出' },
    { time: 900, message: '更早的业务输出' },
  ])

  expect(merged.map((entry) => entry.message)).toEqual([
    '更早的业务输出',
    'Task running',
    '业务输出',
    'Activation 1 running',
    'Activation 1 completed',
    'Task completed',
  ])
  // Business lines are marked so the panel can tell them apart from engine events.
  expect(merged[0].type).toBe('app:log')
  expect(merged[1].type).toBe('task:status')
})

test('没有任务标识时业务日志被丢弃', () => {
  appendBusinessLog(undefined, '无任务')
  expect(getBusinessLogs(undefined)).toEqual([])
})

test('节点名称优先用节点类型的默认标题，其次用节点 ID', () => {
  const entries = traceToLogEntries(
    {
      ...trace(),
      events: [
        { sequence: 1, at: 1000, type: 'activation:attempt', activationId: 1, attemptId: 1, status: 'failed' },
      ],
    },
    new Map([['node-a', { title: undefined, nodeType: 'Print' }]]),
    [
      {
        id: 1,
        nodeId: 'node-a',
        number: 1,
        maxRetries: 2,
        remainingRetries: 1,
        status: 'failed',
        failure: { kind: 'execution', code: 'DEMO_RETRY', message: 'boom', retryable: true },
      },
    ],
    (nodeId) => `title:${nodeId}`,
  )

  expect(entries[0].message).toBe('Attempt 1 failed (DEMO_RETRY): boom')
})

test('节点执行失败时显示引擎记录的错误码和消息', () => {
  const entries = traceToLogEntries({
    ...trace(),
    events: [{ sequence: 1, at: 1000, type: 'activation:status', activationId: 1, status: 'failed' }],
    activations: [
      {
        id: 1,
        nodeId: 'node-a',
        graphId: '',
        portId: 'exec',
        kind: 'node',
        status: 'failed',
        failure: { kind: 'execution', code: 'DEMO_RETRY', message: 'Order 42 rejected', retryable: false },
      },
    ],
  })

  expect(entries[0].message).toBe('Activation 1 failed (DEMO_RETRY): Order 42 rejected')
  expect(entries[0].level).toBe('error')
})

test('面板日志直接来自引擎执行日志，包含每次节点执行', async () => {
  const engine = createEngine(
    [node('start'), node('Print', 'output')],
    [link('start', 'start', 'output', 'exec')],
  )
  await engine.start()

  const task = engine.getTasks()[0]
  const nodes = buildNodeExecutionInfo(engine.getTaskGraph(task.id)!)
  const entries = taskLogEntries(task, engine.getTaskTrace(task.id), nodes)

  // Every entry keeps the engine event type, so the panel shows the engine log format.
  expect(entries.map((entry) => entry.type)).toContain('task:status')
  expect(entries.map((entry) => entry.type)).toContain('activation:status')
  expect(entries.map((entry) => entry.type)).toContain('activation:handoff')
  // Node runs are attributed to the node they belong to.
  const activation = entries.find((entry) => entry.type === 'activation:status' && entry.nodeId === 'output')
  expect(activation?.message).toContain('Activation')
  expect(activation?.activationId).toBeTypeOf('number')
  // The business output joins the same stream as one application line.
  expect(entries.map((entry) => entry.message)).toContain('工作流执行完成')
  expect(entries.find((entry) => entry.message === '工作流执行完成')?.type).toBe('app:log')
})

test('重试失败的原因来自引擎的尝试记录', async () => {
  vi.useFakeTimers()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  const engine = createEngine(
    [node('start'), node('GetVariable', 'get', { name: 'status' }), node('CheckString', 'check', { expected: 'ready' })],
    [link('start', 'start', 'check', 'exec'), link('get', 'value', 'check', 'value')],
  )
  const run = engine.start({ retry: { initialIntervalMs: 200, jitter: false, timeoutMs: 1_000 } })
  await vi.advanceTimersByTimeAsync(2_000)
  await run

  const task = engine.getTasks()[0]
  const nodes = buildNodeExecutionInfo(engine.getTaskGraph(task.id)!)
  const entries = taskLogEntries(task, engine.getTaskTrace(task.id), nodes)
  const messages = entries.map((entry) => entry.message)

  expect(messages.some((message) => message.includes('Attempt 1 failed (VARIABLE_NOT_FOUND)'))).toBe(true)
  expect(messages.some((message) => message.includes('Attempt 2 failed (VARIABLE_NOT_FOUND)'))).toBe(true)
  // The failure detail comes from the engine attempt record, not from collected logs.
  expect(messages.some((message) => message.includes('尚未设置变量「status」'))).toBe(true)
})
