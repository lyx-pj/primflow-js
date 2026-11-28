import { defineNode } from '@lyx-pj/primflow-model'
import type { NodeExecutionContext } from '@lyx-pj/primflow-engine'
import { localize } from '../i18n'
import { headerStyle } from './theme'

const MAX_INTERVAL_SECONDS = 24 * 60 * 60

/** Parse and validate interval seconds, failing loudly on invalid values. */
export function resolveTimerIntervalMs(raw: unknown): number {
  if (typeof raw !== 'number' || !Number.isInteger(raw) || raw < 1 || raw > MAX_INTERVAL_SECONDS) {
    throw new Error(localize('Interval must be an integer between 1 and 86400 seconds', '间隔需为 1 至 86400 之间的整数秒'))
  }
  return raw * 1000
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
 * Timer: repeatedly triggers downstream on a fixed interval (in seconds).
 * The executor stays pending for the session; stopping cancels the wait through the task signal.
 */
export const Timer = defineNode({
  get definition() {
    return {
      executionMode: 'source' as const,
      name: localize('Timer', '定时器'),
      inputs: [
        { name: 'exec', type: 'exec' },
        { name: 'interval', type: 'number', label: localize('Interval (s)', '间隔 (秒)') },
      ] as const,
      outputs: [
        { name: 'exec', type: 'exec' },
        { name: 'time', type: 'string', label: localize('Time', '时间') },
        { name: 'count', type: 'number', label: localize('Count', '次数') },
      ] as const,
      style: headerStyle('flow'),
    } as const
  },

  executor: async ({ getInput, setOutput, next, signal }: NodeExecutionContext) => {
    const delayMs = resolveTimerIntervalMs(getInput('interval'))
    let count = 0
    while (!signal?.aborted) {
      await wait(delayMs, signal)
      if (signal?.aborted) return
      count += 1
      setOutput('time', formatClock(new Date()))
      setOutput('count', count)
      next()
    }
  },
})
