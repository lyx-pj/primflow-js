import { Node } from '@lyx-pj/workflow-model'
import type { ExecContext, ExecutorFn } from '@lyx-pj/workflow-engine'
import { localize } from '../i18n'

const style = { header: { background: '#297964', color: '#fff' } }

const UNIT_MS = { second: 1000, minute: 60_000, hour: 3_600_000 } as const
type IntervalUnit = keyof typeof UNIT_MS

const MAX_INTERVAL = 24 * 60 * 60 * 1000
const DAILY_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/

/** Trigger schedule: fixed interval or a daily time. */
export type TimerSchedule =
  | { type: 'interval'; delay: number }
  | { type: 'daily'; hour: number; minute: number }

export interface TimerConfig {
  mode?: unknown
  interval?: unknown
  unit?: unknown
  time?: unknown
}

/** Parse node config and fail loudly on invalid values instead of silently not triggering. */
export function resolveTimerSchedule(config: TimerConfig): TimerSchedule {
  const mode = config.mode ?? 'interval'
  if (mode === 'daily') {
    const time = typeof config.time === 'string' ? config.time.trim() : ''
    const matched = DAILY_PATTERN.exec(time)
    if (!matched) {
      throw new Error(
        localize('Daily trigger time must use HH:mm, for example 09:30', '每天触发时间需为 HH:mm 格式，例如 09:30'),
      )
    }
    return { type: 'daily', hour: Number(matched[1]), minute: Number(matched[2]) }
  }
  if (mode !== 'interval') throw new Error(localize('Choose a valid trigger mode', '请选择有效的触发方式'))

  const interval = config.interval
  if (typeof interval !== 'number' || !Number.isInteger(interval) || interval < 1) {
    throw new Error(localize('Interval must be an integer of at least 1', '间隔需为不小于 1 的整数'))
  }
  const unit = typeof config.unit === 'string' ? config.unit : 'second'
  if (!(unit in UNIT_MS)) {
    throw new Error(localize('Interval unit must be seconds, minutes, or hours', '间隔单位需为秒、分或时'))
  }
  const delay = interval * UNIT_MS[unit as IntervalUnit]
  if (delay > MAX_INTERVAL) {
    throw new Error(localize('Trigger interval must be between 1 second and 24 hours', '触发间隔需在 1 秒至 24 小时之间'))
  }
  return { type: 'interval', delay }
}

/** Milliseconds until the next trigger; a passed daily time rolls over to the next day. */
export function nextTimerDelay(schedule: TimerSchedule, now: Date): number {
  if (schedule.type === 'interval') return schedule.delay
  const next = new Date(now)
  next.setHours(schedule.hour, schedule.minute, 0, 0)
  if (next.getTime() <= now.getTime()) next.setDate(next.getDate() + 1)
  return next.getTime() - now.getTime()
}

function formatClock(date: Date) {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

/** A wait that can be interrupted by the task's abort signal; stopping releases the timer immediately. */
function wait(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve) => {
    const finish = () => {
      clearTimeout(timer)
      signal?.removeEventListener('abort', finish)
      resolve()
    }
    const timer = setTimeout(finish, ms)
    signal?.addEventListener('abort', finish, { once: true })
  })
}

/**
 * Timer: attached after an execution output, repeatedly triggers downstream on an interval (seconds/minutes/hours) or daily HH:mm.
 * On each trigger it calls next() to execute connected downstream nodes directly, without subscriptions or events.
 * The executor stays pending for the session; stopping cancels the wait through the task signal.
 */
export class Timer extends Node {
  static get definition() {
    return {
      executionMode: 'source' as const,
      title: localize('Timer', '定时器'),
      inputs: [
        { name: 'exec', type: 'exec' },
        {
          name: 'mode',
          type: 'select',
          label: localize('Trigger mode', '触发方式'),
          options: localize(
            [
              { label: 'Interval', value: 'interval' },
              { label: 'Daily', value: 'daily' },
            ],
            [
              { label: '按间隔', value: 'interval' },
              { label: '每天定时', value: 'daily' },
            ],
          ),
        },
        { name: 'interval', type: 'number', label: localize('Interval', '间隔') },
        {
          name: 'unit',
          type: 'select',
          label: localize('Interval unit', '间隔单位'),
          options: localize(
            [
              { label: 'Seconds', value: 'second' },
              { label: 'Minutes', value: 'minute' },
              { label: 'Hours', value: 'hour' },
            ],
            [
              { label: '秒', value: 'second' },
              { label: '分', value: 'minute' },
              { label: '时', value: 'hour' },
            ],
          ),
        },
        { name: 'time', type: 'string', label: localize('Daily time HH:mm', '每天时间 HH:mm') },
      ] as const,
      outputs: [
        { name: 'exec', type: 'exec' },
        { name: 'time', type: 'string', label: localize('Triggered at', '触发时间') },
        { name: 'count', type: 'number', label: localize('Trigger count', '触发次数') },
      ] as const,
      style,
    } as const
  }

  static executor: ExecutorFn = async ({ getInput, setOutput, next, signal }: ExecContext) => {
    const schedule = resolveTimerSchedule({
      mode: getInput('mode'),
      interval: getInput('interval'),
      unit: getInput('unit'),
      time: getInput('time'),
    })
    let count = 0
    while (!signal?.aborted) {
      await wait(nextTimerDelay(schedule, new Date()), signal)
      if (signal?.aborted) return
      count += 1
      setOutput('time', formatClock(new Date()))
      setOutput('count', count)
      // Run connected downstream nodes on every trigger until the task stops.
      next()
    }
  }
}
