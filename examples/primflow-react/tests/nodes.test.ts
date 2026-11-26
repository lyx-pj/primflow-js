import './language'
import { afterEach, expect, test, vi } from 'vitest'
import type { NodeExecutionContext, InputPort, NodeClassType } from '@lyx-pj/primflow-model'
import { demoNodes } from '../packages/workflow/nodes/catalog'
import { Concat } from '../packages/workflow/nodes/Concat'
import { setLanguage } from '../packages/workflow/i18n'
import { Delay } from '../packages/workflow/nodes/Delay'
import { MathOperation } from '../packages/workflow/nodes/Math'
import { TextTemplate } from '../packages/workflow/nodes/Text'
import { createEngine, link, node, registry, stopEngines } from './helpers'

afterEach(() => {
  stopEngines()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

test('节点目录覆盖全部可独立添加节点，按九类组织且不再注册 OpenRouter', () => {
  // Loop entry and return are generated when the canvas creates a body; subgraph entries come from standalone files; loop itself is addable.
  const addableTypes = registry.getNodeTypes().filter(type => !['loop-entry', 'loop-return', 'subgraph'].includes(type))
  expect(Object.keys(demoNodes).sort()).toEqual(addableTypes.sort())
  const categories = Object.values(demoNodes).map((item) => item.category).filter(category => category !== undefined)
  expect(new Set(categories).size).toBe(9)
  // DemoCard has no business category, so the palette groups it under Other nodes.
  expect(demoNodes.DemoCard.category).toBeUndefined()
  expect(registry.getNodeTypes()).not.toContain('OpenRouter')
  expect(registry.getNodeTypes()).not.toContain('AnyInput')
})

test.each([['zh', '网络', 'HTTP 请求'], ['en', 'Network', 'HTTP Request']] as const)(
  'HTTP 节点在 %s 下使用本地化名称和网络分类',
  (language, category, title) => {
    setLanguage(language)
    expect(demoNodes.HttpRequest.category).toBe(category)
    expect(registry.get('HttpRequest').definition.name).toBe(title)
    expect(demoNodes.HttpRequest.inputValues).toEqual({
      method: 'GET', url: expect.stringMatching(/\/http-example\.json$/),
    })
  },
)

test.each([['zh', '变量'], ['en', 'Variables']] as const)('变量节点在 %s 下使用单独分类', (language, category) => {
  setLanguage(language)
  expect(Object.entries(demoNodes)
    .filter(([, entry]) => entry.category === category)
    .map(([type]) => type)).toEqual(['SetVariable', 'GetVariable'])
})

test.each([true, false])('人工审批等待答复，并按结论 %s 选择执行出口', async (approved) => {
  vi.spyOn(console, 'log').mockImplementation(() => {})
  const instance = createEngine(
    [node('start'), node('ManualApproval', 'approval', { prompt: 'Approve order 42?' }),
      node('Print', 'approved'), node('Print', 'rejected')],
    [link('start', 'start', 'approval'), link('approval', 'approved', 'approved'),
      link('approval', 'rejected', 'rejected'), link('approval', 'decision', approved ? 'approved' : 'rejected', 'message')],
  )
  const run = instance.start()
  await vi.waitFor(() => expect(instance.getNodeStatus('approval')).toBe('interrupted'))
  const taskId = instance.latestTaskId!
  const [request] = instance.getTask(taskId)!.interrupts
  expect(request.value).toEqual({ kind: 'manual-approval', prompt: 'Approve order 42?' })
  expect(instance.resumeInterrupt(taskId, request.id, approved)).toBe(true)
  await run
  expect(instance.getNodeExecutionData('approval')?.outputs.decision).toBe(approved)
  expect(instance.getNodeStatus(approved ? 'approved' : 'rejected')).toBe('completed')
  expect(instance.getNodeStatus(approved ? 'rejected' : 'approved')).toBe('skipped')
})

test('抛出错误节点使用配置的消息让任务进入失败状态', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  const instance = createEngine(
    [node('start'), node('ThrowError', 'failure', { message: 'Order validation failed' })],
    [link('start', 'start', 'failure')],
  )
  await instance.start()
  expect(instance.getNodeStatus('failure')).toBe('failed')
  expect(instance.getTask(instance.latestTaskId!)).toMatchObject({
    status: 'failed', errors: [{ nodeId: 'failure', message: 'Error: Order validation failed' }],
  })
})

test.each([{ value: false }, { value: 0 }, { value: null }, { value: { items: ['ready', 2] } }])(
  '设置变量提交 JSON 值，获取变量读到 $value',
  async ({ value }) => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    const instance = createEngine(
      [node('start'), node('SetVariable', 'set', { name: ' token ', value }), node('GetVariable', 'get', { name: 'token' }),
        node('Print', 'read')],
      [link('start', 'start', 'set'), link('set', 'exec', 'read'), link('get', 'value', 'read', 'message')],
    )
    await instance.start()
    expect(instance.getTaskState(instance.latestTaskId!)?.values.token).toEqual(value)
    expect(instance.getNodeExecutionData('read')?.inputs.message).toEqual(value)
    expect(instance.getNodeStatus('get')).toBe('idle')
    expect(registry.get('GetVariable').definition.inputs.map(({ type }) => type)).toEqual(['string'])
    expect(registry.get('GetVariable').definition.outputs.map(({ type }) => type)).toEqual(['any'])
  },
)

test('没有下游读取时不求值获取变量节点', async () => {
  const instance = createEngine([node('start'), node('GetVariable', 'get', { name: 'missing' })], [])
  await instance.start()
  expect(instance.getTask(instance.latestTaskId!)?.status).toBe('completed')
  expect(instance.getNodeStatus('get')).toBe('idle')
})

test('获取未设置的变量时报告变量名', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  const instance = createEngine(
    [node('start'), node('GetVariable', 'get', { name: 'missing' }), node('Print', 'read')],
    [link('start', 'start', 'read'), link('get', 'value', 'read', 'message')],
  )
  await instance.start()
  expect(instance.getTask(instance.latestTaskId!)?.errors[0]?.failure).toMatchObject({
    code: 'VARIABLE_NOT_FOUND',
    details: { name: 'missing' },
  })
})

test('字符串校验重试时按需读取另一分支提交的新值', async () => {
  vi.useFakeTimers()
  const instance = createEngine(
    [
      node('start'),
      node('SetVariable', 'initial', { name: 'status', value: 'wrong' }),
      node('Delay', 'wait', { duration: 100 }),
      node('SetVariable', 'correct', { name: 'status', value: 'ready' }),
      node('GetVariable', 'get', { name: 'status' }),
      node('CheckString', 'check', { expected: 'ready' }),
    ],
    [
      link('start', 'start', 'initial'),
      link('initial', 'exec', 'check'), link('get', 'value', 'check', 'value'),
      link('initial', 'exec', 'wait'), link('wait', 'exec', 'correct'),
    ],
  )
  const run = instance.start({ retry: { initialIntervalMs: 200, jitter: false, timeoutMs: 1_000 } })
  await vi.advanceTimersByTimeAsync(100)
  const taskId = instance.latestTaskId!
  expect(instance.getTaskState(taskId)?.values).toEqual({ status: 'ready' })
  expect(instance.getTask(taskId)?.attempts?.filter(({ nodeId }) => nodeId === 'check')).toMatchObject([
    { number: 1, inputs: { value: 'wrong' }, failure: { code: 'STRING_MISMATCH', inputSource: { nodeId: 'get', port: 'value', stateVersion: 1 } } },
  ])

  await vi.advanceTimersByTimeAsync(100)
  await run
  expect(instance.getTask(taskId)?.status).toBe('completed')
  expect(instance.getTask(taskId)?.attempts?.map(({ nodeId }) => nodeId)).toEqual(['check', 'check'])
  expect(instance.getTask(taskId)?.attempts?.filter(({ nodeId }) => nodeId === 'check')[1]).toMatchObject({
    retryFrom: 'get', status: 'completed', outputs: { value: 'ready' },
  })
})

test.each([100, 800])('变量尚未设置时记录校验尝试，在写入延迟 %i 毫秒时遵守重试预算', async (duration) => {
  vi.useFakeTimers()
  vi.spyOn(console, 'log').mockImplementation(() => {})
  const error = vi.spyOn(console, 'error').mockImplementation(() => {})
  const instance = createEngine(
    [node('start'), node('Delay', 'wait', { duration }), node('SetVariable', 'set', { name: 'status' }),
      node('TextInput', 'text', { value: 'ready' }), node('GetVariable', 'get', { name: 'status' }),
      node('CheckString', 'check', { expected: 'ready' }), node('Print', 'read')],
    [link('start', 'start', 'wait'), link('wait', 'exec', 'set'), link('text', 'value', 'set', 'value'),
      link('start', 'start', 'check'), link('get', 'value', 'check', 'value'), link('check', 'exec', 'read'),
      link('check', 'value', 'read', 'message')],
  )
  const run = instance.start({ retry: { initialIntervalMs: 200, jitter: false } })
  await vi.advanceTimersByTimeAsync(0)
  const taskId = instance.latestTaskId!
  const firstFailure = {
    kind: 'input', code: 'VARIABLE_NOT_FOUND', retryable: true, inputPort: 'value',
    inputSource: { nodeId: 'get', port: 'value', stateVersion: 0 }, details: { name: 'status' },
  }
  expect(instance.getTask(taskId)?.attempts).toMatchObject([
    { nodeId: 'check', number: 1, status: 'failed', remainingRetries: 2, failure: firstFailure },
  ])
  expect(error).not.toHaveBeenCalled()

  await vi.advanceTimersByTimeAsync(duration + 200)
  await run
  const task = instance.getTask(taskId)
  if (duration < 200) {
    expect(task?.status).toBe('completed')
    expect(task?.attempts).toHaveLength(2)
    expect(task?.attempts?.[1]).toMatchObject({
      nodeId: 'check', number: 2, status: 'completed', retryFrom: 'get', inputs: { value: 'ready' },
    })
    expect(instance.getNodeExecutionData('read', taskId)?.inputs.message).toBe('ready')
    expect(error).not.toHaveBeenCalled()
  } else {
    expect(task?.status).toBe('failed')
    expect(task?.attempts?.map(({ status }) => status)).toEqual(['failed', 'failed', 'failed'])
    expect(task?.attempts?.[2]).toMatchObject({ number: 3, remainingRetries: 0, failure: firstFailure })
    expect(task?.errors[0]?.failure).toMatchObject({ code: 'VARIABLE_NOT_FOUND', inputPort: 'value' })
    expect(instance.getNodeExecutionData('read', taskId)).toBeUndefined()
  }
})

const basicInputTypes = {
  string: 'TextInput',
  number: 'NumberInput',
  boolean: 'BooleanInput',
  array: 'ArrayInput',
  object: 'ObjectInput',
  textarea: 'MultilineTextInput',
  select: 'SelectInput',
} as const satisfies Record<Exclude<InputPort['type'], 'exec' | 'spacer' | 'any'>, string>

test.each(Object.entries(basicInputTypes))('基础输入目录包含 %s 输入节点 %s', (inputType, nodeType) => {
  const item = demoNodes[nodeType]
  expect(item?.category).toBe('基础输入')
  const definition: NodeClassType['definition'] = registry.get(nodeType).definition
  const editor = inputType === 'select' || inputType === 'textarea' ? inputType : undefined
  expect(definition.inputs).toEqual([expect.objectContaining({
    name: 'value',
    type: editor ? 'string' : inputType,
    ...(editor ? { editor } : {}),
  })])
  expect(definition.outputs).toEqual([expect.objectContaining({
    name: 'value',
    type: inputType === 'select' || inputType === 'textarea' ? 'string' : inputType,
  })])
  expect(registry.get(nodeType).executor).toBeUndefined()
  if (inputType === 'select') {
    const valuePort = definition.inputs.find((port) => port.name === 'value')
    expect(valuePort?.options).toContainEqual(expect.objectContaining({ value: item.inputValues?.value }))
  }
  setLanguage('en')
  expect(demoNodes[nodeType].category).toBe('Basic input')
})

test.each([
  ['TextInput', ''],
  ['NumberInput', 0],
  ['BooleanInput', false],
  ['ArrayInput', [0, false, { name: 'item' }]],
  ['ObjectInput', { enabled: false, items: [1, 2] }],
  ['MultilineTextInput', 'first line\nsecond line'],
  ['SelectInput', 'large'],
] as const)('%s 按需为下游节点提供配置值 %j', async (nodeType, value) => {
  vi.spyOn(console, 'log').mockImplementation(() => {})
  const instance = createEngine(
    [node('start'), node(nodeType, 'input', { value }), node('Print')],
    [link('start', 'start', 'Print'), link('input', 'value', 'Print', 'message')],
  )
  await instance.start()
  expect(instance.getNodeExecutionData('Print')?.outputs.result).toEqual(value)
  expect(instance.getNodeStatus('input')).toBe('idle')
  expect(instance.getNodeExecutionData('input')).toBeUndefined()
})

test('基础输入可以逐层转发连线上的数据，并等待实际生产数据的节点', async () => {
  vi.spyOn(console, 'log').mockImplementation(() => {})
  const value = ['apple', 'banana']
  const instance = createEngine(
    [node('start'), node('TextSplit', 'split', { text: value.join(',') }), node('ArrayInput', 'first'), node('ArrayInput', 'second'), node('Print')],
    [link('start', 'start', 'Print'), link('start', 'start', 'split'), link('split', 'items', 'first', 'value'),
      link('first', 'value', 'second', 'value'), link('second', 'value', 'Print', 'message')],
  )
  await instance.start()
  expect(instance.getNodeExecutionData('Print')?.outputs.result).toEqual(value)
})

test('引擎拒绝下游使用的循环取值依赖', () => {
  expect(() => createEngine(
    [node('start'), node('TextInput', 'first'), node('TextInput', 'second'), node('Print')],
    [link('start', 'start', 'Print'), link('first', 'value', 'second', 'value'),
      link('second', 'value', 'first', 'value'), link('first', 'value', 'Print', 'message')],
  )).toThrow('Circular value output dependency')
})

test('英文浏览器语言下目录文案、演示默认值和节点定义都使用英文', () => {
  setLanguage('en')

  expect(demoNodes.TextInput.category).toBe('Basic input')
  expect(demoNodes.TextInput.description).toBe('Provide a text value as input for later steps')
  expect(demoNodes.TextInput.inputValues).toEqual({ value: 'Hello, workflow' })
  expect(demoNodes.Switch.inputValues).toEqual({ condition: 'pass', case_1_value: 'pass' })
  expect(Concat.definition.name).toBe('Concatenate Text')
  expect(Concat.definition.inputs.map((port) => port.label)).toEqual([
    undefined,
    'Text A',
    'Text B',
    'Separator',
  ])
  expect(registry.get('EventTrigger').definition.name).toBe('Event Emit')
})

test('文本拆分 → 模板 → 输出可通过真实引擎执行，数组数量可用于文本模板', async () => {
  vi.spyOn(console, 'log').mockImplementation(() => {})
  const instance = createEngine(
    [node('start'), node('TextSplit'), node('TextTemplate'), node('Print')],
    [
      link('start', 'start', 'TextSplit'),
      link('TextSplit', 'exec', 'TextTemplate'),
      link('TextTemplate', 'exec', 'Print'),
      link('TextSplit', 'count', 'TextTemplate', 'value'),
      link('TextTemplate', 'result', 'Print', 'message'),
    ]
  )
  await instance.start()
  expect(instance.getNodeExecutionData('TextSplit')?.outputs).toEqual({ items: ['苹果', '香蕉', '橙子'], count: 3 })
  expect(instance.getNodeExecutionData('Print')?.outputs.result).toBe('处理结果：3')
})

test.each([
  [5, '不满足'],
  [42, '满足'],
] as const)('数字 %s 经计算和比较后走「%s」分支', async (value, expected) => {
  vi.spyOn(console, 'log').mockImplementation(() => {})
  const instance = createEngine(
    [
      node('start'),
      node('NumberInput', 'number', { value }),
      node('MathOperation', 'math', { b: 1 }),
      node('Compare', 'compare', { b: 10 }),
      node('IF'),
      node('Print', 'yes', { message: '满足' }),
      node('Print', 'no', { message: '不满足' }),
    ],
    [
      link('start', 'start', 'math'),
      link('math', 'exec', 'compare'),
      link('compare', 'exec', 'IF'),
      link('IF', 'true', 'yes'),
      link('IF', 'false', 'no'),
      link('number', 'value', 'math', 'a'),
      link('math', 'result', 'compare', 'a'),
      link('compare', 'result', 'IF', 'condition'),
    ]
  )
  await instance.start()
  expect(instance.getNodeExecutionData(expected === '满足' ? 'yes' : 'no')?.outputs.result).toBe(expected)
  expect(instance.getNodeExecutionData(expected === '满足' ? 'no' : 'yes')).toBeUndefined()
})

test.each(['通过', '未知'])('多路分支匹配「%s」，未命中时走默认出口', async (condition) => {
  vi.spyOn(console, 'log').mockImplementation(() => {})
  const instance = createEngine(
    [node('start'), node('Switch', 'switch', { condition }), node('Print', 'match'), node('Print', 'fallback')],
    [link('start', 'start', 'switch'), link('switch', 'case_1', 'match'), link('switch', 'default', 'fallback')]
  )
  await instance.start()
  expect(instance.getNodeStatus(condition === '通过' ? 'match' : 'fallback')).toBe('completed')
  expect(instance.getNodeExecutionData(condition === '通过' ? 'fallback' : 'match')).toBeUndefined()
})

function context(values: Record<string, unknown>, signal?: AbortSignal): NodeExecutionContext {
  return {
    state: { get: () => undefined, snapshot: () => ({ version: 0, values: {} }), update: vi.fn() },
    getInput: <T>(name: string) => values[name] as T | undefined,
    setOutput: vi.fn(),
    next: vi.fn(),
    emitEvent: vi.fn(),
    inputs: [],
    outputs: [],
    services: { get: vi.fn() },
    signal,
  }
}

test('文本模板替换全部占位符，并保留替换值中的 $& 与 HTML 文本', () => {
  const ctx = context({ template: '{{value}} / {{value}}', value: '$&<b>内容</b>' })
  TextTemplate.executor(ctx)
  expect(ctx.setOutput).toHaveBeenCalledWith('result', '$&<b>内容</b> / $&<b>内容</b>')
})

test('除零给出可诊断错误，不向后执行', () => {
  const ctx = context({ a: 12, b: 0, operation: 'divide' })
  expect(() => MathOperation.executor(ctx)).toThrow('除数不能为 0')
  expect(ctx.next).not.toHaveBeenCalled()
})

test('等待节点按时继续，停止时清理定时器且不继续执行', async () => {
  vi.useFakeTimers()
  const controller = new AbortController()
  const cancelled = context({ duration: 500 }, controller.signal)
  const pending = Delay.executor(cancelled)
  controller.abort()
  await pending
  expect(vi.getTimerCount()).toBe(0)
  expect(cancelled.next).not.toHaveBeenCalled()

  const normal = context({ duration: 500 })
  const running = Delay.executor(normal)
  await vi.advanceTimersByTimeAsync(499)
  expect(normal.next).not.toHaveBeenCalled()
  await vi.advanceTimersByTimeAsync(1)
  await running
  expect(normal.next).toHaveBeenCalledOnce()
})
