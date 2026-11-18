import { Node } from '@lyx-pj/primflow-model'
import type { ExecutorFn } from '@lyx-pj/primflow-engine'
import { localize } from '../i18n'

export class IF extends Node {
  static get definition() {
    return {
      type: 'default',
      title: localize('Condition', '条件分支'),
      inputs: [
        { name: 'exec', type: 'exec' },
        { name: 'condition', type: 'boolean', label: localize('Condition', '条件') },
      ] as const,
      outputs: [
        { name: 'true', type: 'exec', label: localize('True', '满足') },
        { name: 'condition', type: 'boolean', label: localize('Condition', '条件') },
        { name: 'false', type: 'exec', label: localize('False', '不满足') },
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
  }

  static executor: ExecutorFn = ({ getInput, next, setOutput }) => {
    const condition = Boolean(getInput('condition'))
    setOutput('condition', condition)
    if (condition) {
      return next(['true'])
    } else {
      return next(['false'])
    }
  }
}
