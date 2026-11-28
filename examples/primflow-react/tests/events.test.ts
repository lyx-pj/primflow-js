import './language'
import { afterEach, expect, test, vi } from 'vitest'
import type { NodeExecutionContext, NodeLifecycleContext } from '@lyx-pj/primflow-model'
import { EmitEvent, OnEvent } from '../packages/workflow/nodes/Event'
import { createEngine, link, node, stopEngines } from './helpers'

afterEach(() => {
  stopEngines()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

function execContext(values: Record<string, unknown>): NodeExecutionContext & {
  setOutput: ReturnType<typeof vi.fn>
  next: ReturnType<typeof vi.fn>
  emitEvent: ReturnType<typeof vi.fn>
} {
  return {
    state: { get: () => undefined, snapshot: () => ({ version: 0, values: {} }), update: vi.fn() },
    getInput: <T>(name: string) => values[name] as T | undefined,
    setOutput: vi.fn(),
    next: vi.fn(),
    emitEvent: vi.fn(),
    inputs: [],
    outputs: [],
    services: { get: vi.fn() },
  }
}

function lifecycleContext(values: Record<string, unknown>) {
  const cleanups: (() => void)[] = []
  const emitEvent = vi.fn()
  const subscribed: string[] = []
  const unsubscribes: ReturnType<typeof vi.fn>[] = []
  const state: Record<string, unknown> = {}
  const ctx = {
    getInput: (name: string) => values[name],
    nodeState: state,
    emitEvent,
    onCleanup: (cleanup: () => void) => cleanups.push(cleanup),
    on: (name: string) => {
      subscribed.push(name)
      const unsubscribe = vi.fn()
      unsubscribes.push(unsubscribe)
      return unsubscribe
    },
  } as unknown as NodeLifecycleContext
  return { ctx, cleanups, emitEvent, state, subscribed, unsubscribes }
}

test('发送事件发出配置的事件与数据，并继续执行自己的下游', () => {
  const ctx = execContext({ event: 'demo', payload: { text: '你好' } })
  EmitEvent.executor(ctx)
  expect(ctx.emitEvent).toHaveBeenCalledExactlyOnceWith('demo', { text: '你好' })
  expect(ctx.setOutput).toHaveBeenCalledWith('payload', { text: '你好' })
  expect(ctx.next).toHaveBeenCalledOnce()
})

test('发送事件未配置事件名时给出可诊断错误，不发出事件也不继续执行', () => {
  const ctx = execContext({ event: '  ', payload: 'x' })
  expect(() => EmitEvent.executor(ctx)).toThrow('发送事件需要配置事件名')
  expect(ctx.emitEvent).not.toHaveBeenCalled()
  expect(ctx.next).not.toHaveBeenCalled()
})

test('监听事件激活时按配置的事件名订阅，停用时退订并清空生命周期状态', () => {
  const { ctx, state, subscribed, unsubscribes } = lifecycleContext({ event: 'demo' })
  OnEvent.onActive(ctx)
  expect(subscribed).toEqual(['demo'])
  expect(state).toMatchObject({ count: 0, eventName: 'demo' })

  OnEvent.onDeactivate(ctx)
  expect(unsubscribes[0]).toHaveBeenCalledOnce()
  expect(state.unsubscribe).toBeUndefined()

  OnEvent.onDestroy(ctx)
  expect(state).toEqual({})
})

test('监听事件未配置事件名时不建立订阅', () => {
  const { ctx, state, subscribed } = lifecycleContext({ event: '   ' })
  OnEvent.onActive(ctx)
  expect(subscribed).toEqual([])
  expect(state).toEqual({})
})

test('发送事件后监听节点在独立任务中执行下游，事件数据与累计次数随事件更新', async () => {
  vi.spyOn(console, 'log').mockImplementation(() => {})
  const instance = createEngine(
    [
      node('start'),
      node('EmitEvent', 'trigger'),
      node('Print', 'trigger-print'),
      node('OnEvent', 'listener'),
      node('Print', 'listener-print'),
    ],
    [
      link('start', 'start', 'trigger'),
      link('trigger', 'exec', 'trigger-print'),
      link('trigger', 'payload', 'trigger-print', 'value'),
      link('listener', 'exec', 'listener-print'),
      link('listener', 'payload', 'listener-print', 'value'),
    ]
  )
  await instance.start()
  await vi.waitFor(() => {
    expect(instance.getNodeExecutionData('listener')?.outputs).toMatchObject({
      payload: '你好',
      count: 1,
    })
  })
  expect(instance.getNodeExecutionData('listener-print')?.outputs.value).toBe('你好')
  // The emitter's own downstream belongs to the first task and does not wait for event tasks.
  const startTask = instance.getTasks().find((task) => task.trigger.type === 'start')!
  expect(instance.getNodeExecutionData('trigger-print', startTask.id)?.outputs.value).toBe('你好')

  const second = await instance.dispatchEvent('demo', '第二条')
  expect(second?.status).toBe('completed')
  expect(instance.getNodeExecutionData('listener')?.outputs).toMatchObject({ payload: '第二条', count: 2 })
  expect(instance.getNodeExecutionData('listener-print')?.outputs.value).toBe('第二条')
})

test('停止运行后监听退订，重新执行时在新会话中重新订阅且计数归零', async () => {
  vi.spyOn(console, 'log').mockImplementation(() => {})
  const instance = createEngine(
    [node('start'), node('OnEvent', 'listener'), node('Print', 'print')],
    [link('listener', 'exec', 'print'), link('listener', 'payload', 'print', 'value')]
  )
  await instance.start()
  expect((await instance.dispatchEvent('demo', '第一次'))?.status).toBe('completed')
  expect(instance.getNodeExecutionData('listener')?.outputs).toMatchObject({ payload: '第一次', count: 1 })

  instance.stop()
  await instance.whenStopped()
  expect(await instance.dispatchEvent('demo', '停止后')).toBeUndefined()

  await instance.start()
  expect((await instance.dispatchEvent('demo', '第二次运行'))?.status).toBe('completed')
  expect(instance.getNodeExecutionData('listener')?.outputs).toMatchObject({ payload: '第二次运行', count: 1 })
})
