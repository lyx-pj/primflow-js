import './language'
import { afterEach, expect, test, vi } from 'vitest'
import type { ExecContext } from '@lyx-pj/primflow-model'
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

test('节点目录覆盖全部可独立添加节点，按六类组织且不再注册 OpenRouter', () => {
  // Loop entry and return are generated when the canvas creates a body; subgraph entries come from standalone files; loop itself is addable.
  const addableTypes = registry.getNodeTypes().filter(type => !['loop-entry', 'loop-return', 'subgraph'].includes(type))
  expect(Object.keys(demoNodes).sort()).toEqual(addableTypes.sort())
  expect(new Set(Object.values(demoNodes).map((item) => item.category)).size).toBe(6)
  expect(registry.getNodeTypes()).not.toContain('OpenRouter')
})

test('英文浏览器语言下目录文案、演示默认值和节点定义都使用英文', () => {
  setLanguage('en')

  expect(demoNodes.TextInput.category).toBe('Basic input')
  expect(demoNodes.TextInput.description).toBe('Provide a text value as input for later steps')
  expect(demoNodes.TextInput.values).toEqual({ value: 'Hello, workflow' })
  expect(demoNodes.Switch.values).toEqual({ condition: 'pass', case_1_value: 'pass' })
  expect(Concat.definition.title).toBe('Concatenate Text')
  expect(Concat.definition.inputs.map((port) => port.label)).toEqual([
    undefined,
    'Text A',
    'Text B',
    'Separator',
  ])
  expect(registry.get('EventTrigger').definition.title).toBe('Event Emit')
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
  await instance.process()
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
      link('start', 'start', 'number'),
      link('number', 'exec', 'math'),
      link('math', 'exec', 'compare'),
      link('compare', 'exec', 'IF'),
      link('IF', 'true', 'yes'),
      link('IF', 'false', 'no'),
      link('number', 'value', 'math', 'a'),
      link('math', 'result', 'compare', 'a'),
      link('compare', 'result', 'IF', 'condition'),
    ]
  )
  await instance.process()
  expect(instance.getNodeExecutionData(expected === '满足' ? 'yes' : 'no')?.outputs.result).toBe(expected)
  expect(instance.getNodeExecutionData(expected === '满足' ? 'no' : 'yes')).toBeUndefined()
})

test.each(['通过', '未知'])('多路分支匹配「%s」，未命中时走默认出口', async (condition) => {
  vi.spyOn(console, 'log').mockImplementation(() => {})
  const instance = createEngine(
    [node('start'), node('Switch', 'switch', { condition }), node('Print', 'match'), node('Print', 'fallback')],
    [link('start', 'start', 'switch'), link('switch', 'case_1', 'match'), link('switch', 'default', 'fallback')]
  )
  await instance.process()
  expect(instance.getNodeStatus(condition === '通过' ? 'match' : 'fallback')).toBe('completed')
  expect(instance.getNodeExecutionData(condition === '通过' ? 'fallback' : 'match')).toBeUndefined()
})

function context(values: Record<string, unknown>, signal?: AbortSignal): ExecContext {
  return {
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
