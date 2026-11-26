import './language'
import { afterEach, expect, test, vi } from 'vitest'
import { Engine } from '@lyx-pj/primflow-engine'
import { printExecutor } from '../packages/workflow/executors'
import { createRegistry } from '../packages/workflow/nodes'
import { Print } from '../packages/workflow/nodes/Print'
import { createEngine, link, node, stopEngines } from './helpers'

afterEach(() => {
  stopEngines()
  vi.restoreAllMocks()
})

test('节点只声明定义与执行器名称，执行逻辑放在执行器目录', () => {
  expect(Print.executor).toBe('workflow.print')
  expect(typeof Print.executor).toBe('string')
  expect(printExecutor.name).toBe(Print.executor)
  expect(printExecutor.execute).toBeTypeOf('function')
})

test('引擎按节点声明的名称找到已注册的执行器并执行', async () => {
  vi.spyOn(console, 'log').mockImplementation(() => {})
  const instance = createEngine(
    [node('start'), node('Print', 'read', { message: 'hello' })],
    [link('start', 'start', 'read')],
  )
  await instance.start()
  expect(instance.getNodeStatus('read')).toBe('completed')
  expect(instance.getNodeExecutionData('read')?.outputs.result).toBe('hello')
  expect(console.log).toHaveBeenCalledWith('hello')
})

test('执行器未注册时节点失败，并指出缺失的执行器', async () => {
  const instance = new Engine(createRegistry())
  instance.loadGraph({
    nodes: [node('start'), node('Print', 'read')],
    links: [link('start', 'start', 'read')],
    subgraphs: {},
    variables: [],
    viewport: { x: 0, y: 0, zoom: 1 },
  })
  const errors: string[] = []
  instance.on('node:error', (error: unknown) => errors.push(String(error)))
  try {
    await instance.start()
    expect(instance.getNodeStatus('read')).toBe('failed')
    expect(errors.join('\n')).toMatch(/no executor/i)
  } finally {
    await instance.stop().whenStopped()
  }
})
