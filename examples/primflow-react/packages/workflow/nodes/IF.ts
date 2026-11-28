import { defineNode } from '@lyx-pj/primflow-model'
import { localize } from '../i18n'
import { headerStyle } from './theme'

export const If = defineNode({
  get definition() {
    return {
      name: localize('If', '条件分支'),
      inputs: [
        { name: 'exec', type: 'exec' },
        { name: 'condition', type: 'boolean', label: localize('Condition', '条件') },
      ] as const,
      outputs: [
        { name: 'true', type: 'exec', label: localize('True', '是') },
        { name: 'false', type: 'exec', label: localize('False', '否') },
        { name: 'condition', type: 'boolean', label: localize('Condition', '条件') },
      ] as const,
      style: headerStyle('flow'),
    } as const
  },

  executor: ({ getInput, setOutput, next }) => {
    const condition = Boolean(getInput('condition'))
    setOutput('condition', condition)
    return next([condition ? 'true' : 'false'])
  },
})
