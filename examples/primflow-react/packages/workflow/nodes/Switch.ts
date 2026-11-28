import { defineNode } from '@lyx-pj/primflow-model'
import { localize } from '../i18n'
import { headerStyle } from './theme'

export const Switch = defineNode({
  get definition() {
    return {
      kind: 'switch',
      name: localize('Switch', '多路分支'),
      inputs: [
        { name: 'exec', type: 'exec' },
        { name: 'value', type: 'string', label: localize('Value', '匹配值') },
        { name: 'case_1_value', type: 'string' },
      ] as const,
      outputs: [
        { name: 'default', type: 'exec', label: localize('Default', '默认') },
        { name: 'value', type: 'string', label: localize('Value', '匹配值') },
        { name: 'case_1', type: 'exec' },
      ] as const,
      style: headerStyle('flow'),
    } as const
  },

  executor: ({ getInput, setOutput, next, inputs }) => {
    const value = getInput<string>('value') ?? ''
    setOutput('value', value)
    let matched = ''
    for (const input of inputs) {
      if (input.name.startsWith('case_') && value === getInput(input.name)) {
        matched = input.name.replace('_value', '')
      }
    }
    next([matched || 'default'])
  },
})
