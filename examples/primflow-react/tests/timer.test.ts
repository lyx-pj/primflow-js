import './language'
import { afterEach, expect, test, vi } from 'vitest'
import type { NodeExecutionContext } from '@lyx-pj/primflow-model'
import { demoNodes } from '../packages/workflow/nodes/catalog'
import { Delay } from '../packages/workflow/nodes/Delay'
import { Timer, nextTimerDelay, resolveTimerSchedule } from '../packages/workflow/nodes/Timer'
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
  expect(demoNodes.TimerEvent.category).toBe('流程控制')
  expect(Timer.definition.name).toBe('定时器')
  expect(Timer.definition.style.header.background).toBe(Delay.definition.style.header.background)
})

test('解析间隔（秒/分/时）与每天定时的触发计划', () => {
  expect(resolveTimerSchedule({ mode: 'interval', interval: 5, unit: 'second' })).toEqual({
    type: 'interval',
    delay: 5000,
  })
  expect(resolveTimerSchedule({ mode: 'interval', interval: 2, unit: 'minute' })).toEqual({
    type: 'interval',
    delay: 120_000,
  })
  expect(resolveTimerSchedule({ mode: 'interval', interval: 1, unit: 'hour' })).toEqual({
    type: 'interval',
    delay: 3_600_000,
  })
  expect(resolveTimerSchedule({ mode: 'daily', time: ' 09:30 ' })).toEqual({
    type: 'daily',
    hour: 9,
    minute: 30,
  })
})

test.each([
  [{ mode: 'interval', interval: 0, unit: 'second' }, '间隔需为不小于 1 的整数'],
  [{ mode: 'interval', interval: 1.5, unit: 'second' }, '间隔需为不小于 1 的整数'],
  [{ mode: 'interval', interval: 1, unit: 'day' }, '间隔单位需为秒、分或时'],
  [{ mode: 'interval', interval: 25, unit: 'hour' }, '触发间隔需在 1 秒至 24 小时之间'],
  [{ mode: 'daily', time: '9:30' }, '每天触发时间需为 HH:mm 格式，例如 09:30'],
  [{ mode: 'daily', time: '24:00' }, '每天触发时间需为 HH:mm 格式，例如 09:30'],
  [{ mode: 'cron' }, '请选择有效的触发方式'],
])('非法配置 %j 抛出可诊断错误', (config, message) => {
  expect(() => resolveTimerSchedule(config)).toThrow(message)
})

test('每天定时计算下一次触发，已过当天时刻时顺延到第二天', () => {
  const schedule = resolveTimerSchedule({ mode: 'daily', time: '09:30' })
  const morning = new Date('2026-01-01T08:00:00')
  const evening = new Date('2026-01-01T10:00:00')
  const exact = new Date('2026-01-01T09:30:00')

  const expectedMorning = new Date(morning)
  expectedMorning.setHours(9, 30, 0, 0)
  const expectedEvening = new Date(evening)
  expectedEvening.setDate(expectedEvening.getDate() + 1)
  expectedEvening.setHours(9, 30, 0, 0)
  const expectedNextDay = new Date(exact)
  expectedNextDay.setDate(expectedNextDay.getDate() + 1)

  expect(nextTimerDelay(schedule, morning)).toBe(expectedMorning.getTime() - morning.getTime())
  expect(nextTimerDelay(schedule, evening)).toBe(expectedEvening.getTime() - evening.getTime())
  expect(nextTimerDelay(schedule, exact)).toBe(expectedNextDay.getTime() - exact.getTime())
})

test('定时器按间隔反复触发下游，停止时取消等待', async () => {
  vi.useFakeTimers()
  const controller = new AbortController()
  const { ctx, setOutput, next } = timerContext({ mode: 'interval', interval: 2, unit: 'second' }, controller.signal)
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
  const { ctx } = timerContext({ mode: 'daily', time: '9:3' })
  await expect(Timer.executor(ctx)).rejects.toThrow('每天触发时间需为 HH:mm 格式，例如 09:30')
})

test('定时器接入执行链后反复执行下游，停止运行后不再触发', async () => {
  vi.useFakeTimers()
  const log = vi.spyOn(console, 'log').mockImplementation(() => {})
  const instance = createEngine(
    [
      node('start'),
      node('TimerEvent', 'timer', { mode: 'interval', interval: 1, unit: 'second' }),
      node('Print', 'print'),
    ],
    [link('start', 'start', 'timer'), link('timer', 'exec', 'print'), link('timer', 'time', 'print', 'message')]
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
