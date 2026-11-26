import { defineNode } from '@lyx-pj/primflow-model'
import { localize } from '../i18n'

export const Switch = defineNode({
  get definition() {
    return {
      kind: 'switch',
      name: localize('Switch', '多路分支'),
      inputs: [
        { name: 'exec', type: 'exec' },
        { name: 'condition', type: 'string', label: localize('Match value', '匹配值') },
        { name: 'case_1_value', type: 'string' },
      ] as const,
      outputs: [
        { name: 'default', type: 'exec', label: localize('Default', '默认') },
        { name: 'condition', type: 'string', label: localize('Match value', '匹配值') },
        { name: 'case_1', type: 'exec' },
      ] as const,
      style: {
        header: { background: '#297964', color: '#fff' },
        ports: {
          input: {
            editor: {
              box: { width: 80 },
            },
          },
        },
      },
    } as const
  },

  executor: ({ getInput, setOutput, next, inputs }) => {
    const condition = getInput<string>('condition') ?? ''
    let outputKey = ''
    setOutput('condition', condition)
    for (const input of inputs) {
      if (input.name.startsWith('case_')) {
        const caseKey = input.name
        const caseValue = getInput(caseKey)
        if (condition === caseValue) {
          outputKey = caseKey.replace('_value', '')
        }
      }
    }
    if (outputKey) {
      next([outputKey])
    } else {
      next(['default'])
    }
  },
})
