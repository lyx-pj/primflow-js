import { defineNode } from '@lyx-pj/primflow-model'
import { localize } from '../i18n'

export const Concat = defineNode({
  retryPolicy: { idempotent: true, maxRetries: 1 },

  get definition() {
    return {
      kind: 'default',
      name: localize('Concatenate Text', '拼接文本'),
      inputs: [
        { name: 'exec', type: 'exec' },
        { name: 'string1', type: 'string', label: localize('Text A', '文本 A') },
        { name: 'string2', type: 'string', label: localize('Text B', '文本 B') },
        { name: 'separator', type: 'string', label: localize('Separator', '连接符') },
      ] as const,
      outputs: [
        { name: 'exec', type: 'exec' },
        { name: 'result', type: 'string', label: localize('Text', '文本') },
      ] as const,
      style: {
        header: { background: '#6850a1', color: '#fff' },
      },
    } as const
  },

  executor: (ctx) => {
    const string1 = ctx.getInput<string>('string1') ?? ''
    const string2 = ctx.getInput<string>('string2') ?? ''
    const result = string1 + (ctx.getInput<string>('separator') ?? '') + string2
    ctx.setOutput('result', result)
    ctx.next(['exec'])
  },
})
