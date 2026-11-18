import { Node } from '@lyx-pj/primflow-model'
import type { ExecutorFn } from '@lyx-pj/primflow-engine'
import { localize } from '../i18n'

const style = { header: { background: '#315f9e', color: '#fff' } }

export class TextInput extends Node {
  static get definition() {
    return {
      title: localize('Text Input', '文本输入'),
      inputs: [
        { name: 'exec', type: 'exec' },
        { name: 'value', type: 'string', label: localize('Text', '文本') },
      ] as const,
      outputs: [
        { name: 'exec', type: 'exec' },
        { name: 'value', type: 'string', label: localize('Text', '文本') },
      ] as const,
      style,
    } as const
  }

  static executor: ExecutorFn = ({ getInput, setOutput, next }) => {
    setOutput('value', getInput<string>('value') ?? '')
    next()
  }
}

export class NumberInput extends Node {
  static get definition() {
    return {
      title: localize('Number Input', '数字输入'),
      inputs: [
        { name: 'exec', type: 'exec' },
        { name: 'value', type: 'number', label: localize('Value', '数值') },
      ] as const,
      outputs: [
        { name: 'exec', type: 'exec' },
        { name: 'value', type: 'number', label: localize('Value', '数值') },
      ] as const,
      style,
    } as const
  }

  static executor: ExecutorFn = ({ getInput, setOutput, next }) => {
    setOutput('value', getInput<number>('value') ?? 0)
    next()
  }
}

export class BooleanInput extends Node {
  static get definition() {
    return {
      title: localize('Toggle Input', '开关输入'),
      inputs: [
        { name: 'exec', type: 'exec' },
        { name: 'value', type: 'boolean', label: localize('On', '开启') },
      ] as const,
      outputs: [
        { name: 'exec', type: 'exec' },
        { name: 'value', type: 'boolean', label: localize('Toggle', '开关') },
      ] as const,
      style,
    } as const
  }

  static executor: ExecutorFn = ({ getInput, setOutput, next }) => {
    setOutput('value', getInput<boolean>('value') ?? false)
    next()
  }
}
