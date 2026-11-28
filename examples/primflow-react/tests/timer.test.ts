import './language'
import { afterEach, expect, test, vi } from 'vitest'
import type { NodeExecutionContext } from '@lyx-pj/primflow-model'
import { demoNodes } from '../packages/workflow/nodes/catalog'
import { Delay } from '../packages/workflow/nodes/Delay'
import { Timer, resolveTimerIntervalMs } from '../packages/workflow/nodes/Timer'
import { createEngine, link, node, stopEngines } from './helpers'

afterEach(() => {
  stopEngines()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

function timerContext(values: Record<string, unknown>, signal?: AbortSignal) {
  const setOutput = vi.fn()
  const next = vi.fn()
  const ctx = {
    state: { get: () => undefined, snapshot: () => ({ version: 0, values: {} }), update: vi.fn() },
    getInput: <T>(name: string) => values[name] as T | undefined,
    setOutput,
    next,
    emitEvent: vi.fn(),
    inputs: [],
    outputs: [],
    services: { get: vi.fn() },
    signal,
  } satisfies NodeExecutionContext
  return { ctx, setOutput, next }
}

test('定时器归入流程控制并使用流程控制配色', () => {
  expect(demoNodes.Timer.category).toBe('流程控制')
  expect(Timer.definition.name).toBe('定时器')
  expect(Timer.definition.style.header.background).toBe(Delay.definition.style.header.background)
})

test('解析间隔秒数配置', () => {
  expect(resolveTimerIntervalMs(1)).toBe(1000)
  expect(resolveTimerIntervalMs(5)).toBe(5000)
  expect(resolveTimerIntervalMs(60)).toBe(60_000)
})

test.each([0, -1, 1.5, 86_401, '5', undefined])('非法间隔 %j 抛出可诊断错误', (interval) => {
  expect(() => resolveTimerIntervalMs(interval)).toThrow('间隔需为 1 至 86400 之间的整数秒')
})

test('定时器按间隔反复触发下游，停止时取消等待', async () => {
  vi.useFakeTimers()
  const controller = new AbortController()
  const { ctx, setOutput, next } = timerContext({ interval: 2 }, controller.signal)
  const running = Timer.executor(ctx)

  await vi.advanceTimersByTimeAsync(1999)
  expect(next).not.toHaveBeenCalled()
  await vi.advanceTimersByTimeAsync(1)
  expect(next).toHaveBeenCalledTimes(1)
  expect(setOutput).toHaveBeenCalledWith('count', 1)
  expect(String(setOutput.mock.calls.find(([name]) => name === 'time')?.[1])).toMatch(/^\d{2}:\d{2}:\d{2}$/)

  await vi.advanceTimersByTimeAsync(2000)
  expect(next).toHaveBeenCalledTimes(2)
  expect(setOutput).toHaveBeenCalledWith('count', 2)

  controller.abort()
  await running
  expect(vi.getTimerCount()).toBe(0)
  await vi.advanceTimersByTimeAsync(5000)
  expect(next).toHaveBeenCalledTimes(2)
})

test('定时器配置非法时拒绝启动', async () => {
  const { ctx } = timerContext({ interval: 0 })
  await expect(Timer.executor(ctx)).rejects.toThrow('间隔需为 1 至 86400 之间的整数秒')
})

test('定时器接入执行链后反复执行下游，停止运行后不再触发', async () => {
  vi.useFakeTimers()
  const log = vi.spyOn(console, 'log').mockImplementation(() => {})
  const instance = createEngine(
    [
      node('start'),
      node('Timer', 'timer', { interval: 1 }),
      node('Print', 'print'),
    ],
    [link('start', 'start', 'timer'), link('timer', 'exec', 'print'), link('timer', 'time', 'print', 'value')]
  )

  const running = instance.start()
  await vi.advanceTimersByTimeAsync(500)
  expect(log).not.toHaveBeenCalled()
  await vi.advanceTimersByTimeAsync(500)
  expect(log).toHaveBeenCalledTimes(1)
  expect(String(log.mock.calls[0][0])).toMatch(/^\d{2}:\d{2}:\d{2}$/)

  await vi.advanceTimersByTimeAsync(1000)
  expect(log).toHaveBeenCalledTimes(2)
  expect(instance.getNodeExecutionData('timer')?.outputs.count).toBe(2)

  instance.stop()
  await running
  await vi.advanceTimersByTimeAsync(5000)
  expect(log).toHaveBeenCalledTimes(2)
})
