import { Node } from '@lyx-pj/workflow-model'
import type { ExecutorFn } from '@lyx-pj/workflow-engine'
import { localize } from '../i18n'

export class Concat extends Node {
  static get definition() {
    return {
      type: 'default',
      title: localize('Concatenate Text', '拼接文本'),
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
  }

  static executor: ExecutorFn = ({ getInput, setOutput, next }) => {
    const string1 = getInput<string>('string1') ?? ''
    const string2 = getInput<string>('string2') ?? ''
    const result = string1 + (getInput<string>('separator') ?? '') + string2
    setOutput('result', result)
    next(['exec'])
  }
}
