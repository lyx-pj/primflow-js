import './language'
import { afterEach, expect, test, vi } from 'vitest'
import {
  DEFAULT_LOOP_CONFIG,
  type JsonGraph,
  type JsonLink,
  type JsonNode,
  type LoopConfig,
} from '@lyx-pj/primflow-model'
import { demoNodes, demoPalette } from '../packages/workflow/nodes/catalog'
import { createEngine, link, node, registry, stopEngines } from './helpers'

afterEach(() => {
  stopEngines()
  vi.restoreAllMocks()
})

const config: LoopConfig = { ...DEFAULT_LOOP_CONFIG, maxIterations: 10 }

/** The loop node holds targetGraphId and loop config; its ports come from the built-in loop definition. */
function loopNode(
  id: string,
  bodyId: string,
  values: Record<string, unknown> = {},
  loopConfig: LoopConfig = config
): JsonNode {
  return { ...node('loop', id, values), targetGraphId: bodyId, loop: loopConfig }
}

function body(nodes: JsonNode[], links: JsonLink[]): JsonGraph['subgraphs'] {
  return { 'loop-body': { nodes, links, viewport: { x: 0, y: 0, zoom: 1 } } }
}

/** A loop body that counts and checks the exit condition: increment → greater than 3 → true ends the loop. */
function countingBody(): JsonGraph['subgraphs'] {
  return body(
    [
      node('loop-entry', 'entry'),
      node('MathOperation', 'math', { b: 1 }),
      node('Compare', 'compare', { b: 3, operation: 'gt' }),
      node('IF', 'branch'),
      node('loop-return', 'return'),
    ],
    [
      link('entry', 'exec', 'math', 'exec'),
      link('entry', 'value', 'math', 'a'),
      link('math', 'exec', 'compare', 'exec'),
      link('math', 'result', 'compare', 'a'),
      link('compare', 'exec', 'branch', 'exec'),
      link('compare', 'result', 'branch', 'condition'),
      link('branch', 'true', 'return', 'break'),
      link('branch', 'false', 'return', 'next'),
      link('math', 'result', 'return', 'value'),
    ]
  )
}

test('循环节点使用内置 loop 定义，端口契约与面板默认配置一致', () => {
  expect(demoNodes.loop.category).toBe('流程控制')
  expect(demoNodes.loop.loop).toEqual(DEFAULT_LOOP_CONFIG)

  const definition = registry.get('loop').definition
  expect(definition.kind).toBe('loop')
  expect(definition.inputs.filter((port) => port.type === 'exec').map((port) => port.name)).toEqual(['exec'])
  expect(definition.outputs.filter((port) => port.type === 'exec').map((port) => port.name)).toEqual(['done'])
  // The loop has one data input and one data output; other state is maintained inside the loop.
  expect(definition.inputs.filter((port) => port.type !== 'exec').map((port) => port.name)).toEqual(['input'])
  expect(definition.outputs.filter((port) => port.type !== 'exec').map((port) => port.name)).toEqual(['output'])

  const defaults = demoPalette.defaults?.(registry.get('loop'), {} as never)
  expect(defaults?.loop).toEqual(DEFAULT_LOOP_CONFIG)
})

test('循环体反复执行，结束条件由循环体自己决定，输出是最后一轮提交的值', async () => {
  const instance = createEngine(
    [
      node('start'),
      loopNode('loop', 'loop-body', { input: 0 }),
      node('Print', 'done', { message: 'done' }),
    ],
    [link('start', 'start', 'loop'), link('loop', 'done', 'done')],
    countingBody()
  )

  await instance.start()

  // Initial value 0, increment each round: 1, 2, 3 continue; round 4 satisfies the condition and ends.
  expect(instance.getNodeExecutionData('loop')?.outputs).toMatchObject({ output: 4 })
  expect(instance.getLoopInvocations(instance.latestTaskId!)[0]).toMatchObject({
    iterations: 4,
    reason: 'break',
    state: 4,
  })
})

test('上一轮提交的值成为下一轮的入口值，循环体可以自己记状态', async () => {
  const log = vi.spyOn(console, 'log').mockImplementation(() => {})
  const instance = createEngine(
    [
      node('start'),
      loopNode('loop', 'loop-body', { input: 0 }),
      node('Print', 'done', { message: 'done' }),
    ],
    [link('start', 'start', 'loop'), link('loop', 'done', 'done')],
    body(
      [
        node('loop-entry', 'entry'),
        node('Print', 'body'),
        node('MathOperation', 'math', { b: 1 }),
        node('Compare', 'compare', { b: 3, operation: 'gt' }),
        node('IF', 'branch'),
        node('loop-return', 'return'),
      ],
      [
        link('entry', 'exec', 'body', 'exec'),
        link('entry', 'value', 'body', 'message'),
        link('body', 'done', 'math', 'exec'),
        link('body', 'result', 'math', 'a'),
        link('math', 'exec', 'compare', 'exec'),
        link('math', 'result', 'compare', 'a'),
        link('compare', 'exec', 'branch', 'exec'),
        link('compare', 'result', 'branch', 'condition'),
        link('branch', 'true', 'return', 'break'),
        link('branch', 'false', 'return', 'next'),
        link('math', 'result', 'return', 'value'),
      ]
    )
  )

  await instance.start()

  // Each round's entry value is the previous round's submitted value: 0, 1, 2, 3.
  expect(log.mock.calls.map((call) => call[0])).toEqual([0, 1, 2, 3, 'done'])
  expect(instance.getNodeExecutionData('loop')?.outputs).toMatchObject({ output: 4 })
})

test('循环体用 break 结束，结束原因和最后一轮提交的值都能查询', async () => {
  const log = vi.spyOn(console, 'log').mockImplementation(() => {})
  const instance = createEngine(
    [node('start'), loopNode('loop', 'loop-body', { input: 'A' }), node('Print', 'done', { message: 'done' })],
    [link('start', 'start', 'loop'), link('loop', 'done', 'done')],
    body(
      [
        node('loop-entry', 'entry'),
        node('Print', 'body', { message: 'round' }),
        node('loop-return', 'return'),
      ],
      [
        link('entry', 'exec', 'body'),
        link('body', 'done', 'return', 'break'),
        link('body', 'result', 'return', 'value'),
      ]
    )
  )

  await instance.start()

  expect(log.mock.calls.map((call) => call[0])).toEqual(['round', 'done'])
  expect(instance.getNodeExecutionData('loop')?.outputs).toMatchObject({ output: 'round' })
  expect(instance.getLoopInvocations(instance.latestTaskId!)[0]).toMatchObject({
    iterations: 1,
    reason: 'break',
    state: 'round',
  })
})

test('循环体按需读取基础输入，可直接把对象作为循环结果', async () => {
  const value = { enabled: false, items: [1, 2] }
  const instance = createEngine(
    [node('start'), loopNode('loop', 'loop-body')],
    [link('start', 'start', 'loop')],
    body(
      [node('loop-entry', 'entry'), node('ObjectInput', 'input', { value }), node('loop-return', 'return')],
      [link('entry', 'exec', 'return', 'break'), link('input', 'value', 'return', 'value')],
    ),
  )

  await instance.start()
  expect(instance.getNodeExecutionData('loop')?.outputs).toEqual({ output: value })
  expect(instance.getNodeStatus('input')).toBe('idle')
})

test('画布新建循环体自带的入口→返回连线没有结束条件，会一直执行到轮数上限', async () => {
  const log = vi.spyOn(console, 'log').mockImplementation(() => {})
  const instance = createEngine(
    [
      node('start'),
      loopNode('loop', 'loop-body', { input: 'A' }),
      node('Print', 'done', { message: 'done' }),
    ],
    [link('start', 'start', 'loop'), link('loop', 'done', 'done')],
    body(
      [node('loop-entry', 'entry'), node('loop-return', 'return')],
      [link('entry', 'exec', 'return', 'next')]
    )
  )

  await instance.start()

  // Without an exit condition, partial results are not published and the done branch is not reached.
  expect(log.mock.calls.map((call) => call[0])).toEqual([])
  expect(instance.getTasks()[0].errors[0].message).toContain('LoopLimitExceeded')
  expect(instance.getLoopInvocations(instance.latestTaskId!)[0]).toMatchObject({
    iterations: 10,
    reason: 'limit',
    status: 'failed',
  })
})
