import { defineNode } from '@lyx-pj/primflow-model'
import { localize } from '../i18n'
import { headerStyle } from './theme'

export const ConcatText = defineNode({
  retryPolicy: { idempotent: true, maxRetries: 1 },

  get definition() {
    return {
      name: localize('Concat Text', '拼接文本'),
      inputs: [
        { name: 'exec', type: 'exec' },
        { name: 'a', type: 'string', label: localize('A', '文本 A') },
        { name: 'b', type: 'string', label: localize('B', '文本 B') },
        { name: 'separator', type: 'string', label: localize('Separator', '分隔符') },
      ] as const,
      outputs: [
        { name: 'exec', type: 'exec' },
        { name: 'result', type: 'string', label: localize('Result', '结果') },
      ] as const,
      style: headerStyle('text'),
    } as const
  },

  executor: ({ getInput, setOutput, next }) => {
    const a = getInput<string>('a') ?? ''
    const b = getInput<string>('b') ?? ''
    const separator = getInput<string>('separator') ?? ''
    setOutput('result', `${a}${separator}${b}`)
    next()
  },
})
