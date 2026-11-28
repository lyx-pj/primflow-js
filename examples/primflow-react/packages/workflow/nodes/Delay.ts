import { defineNode } from '@lyx-pj/primflow-model'
import { localize } from '../i18n'
import { headerStyle } from './theme'

export const Delay = defineNode({
  get definition() {
    return {
      name: localize('Delay', '等待'),
      inputs: [
        { name: 'exec', type: 'exec' },
        { name: 'duration', type: 'number', label: localize('Duration (ms)', '时长 (ms)') },
      ] as const,
      outputs: [{ name: 'exec', type: 'exec' }] as const,
      style: headerStyle('flow'),
    } as const
  },

  executor: async ({ getInput, next, signal }) => {
    const duration = getInput<number>('duration') ?? 500
    if (!Number.isFinite(duration) || duration < 0 || duration > 60_000) {
      throw new Error(localize('Delay must be between 0 and 60000 ms', '等待时间需在 0 至 60000 毫秒之间'))
    }
    if (signal?.aborted) return
    // Release the timer immediately on stop, which also releases the executor's wait.
    await new Promise<void>((resolve) => {
      const finish = () => {
        clearTimeout(timer)
        signal?.removeEventListener('abort', finish)
        resolve()
      }
      const timer = setTimeout(finish, duration)
      signal?.addEventListener('abort', finish, { once: true })
    })
    if (!signal?.aborted) next()
  },
})
