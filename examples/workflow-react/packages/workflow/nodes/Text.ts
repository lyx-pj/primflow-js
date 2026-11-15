import { Node } from '@lyx-pj/workflow-model'
import type { ExecutorFn } from '@lyx-pj/workflow-engine'
import { localize } from '../i18n'

const style = { header: { background: '#6850a1', color: '#fff' } }

export class TextTemplate extends Node {
  static get definition() {
    return {
      title: localize('Text Template', '文本模板'),
      inputs: [
        { name: 'exec', type: 'exec' },
        { name: 'template', type: 'string', label: localize('Template', '模板') },
        { name: 'value', type: 'any', label: localize('Replacement value', '替换值') },
      ] as const,
      outputs: [
        { name: 'exec', type: 'exec' },
        { name: 'result', type: 'string', label: localize('Text', '文本') },
      ] as const,
      style,
    } as const
  }

  static executor: ExecutorFn = ({ getInput, setOutput, next }) => {
    const template = getInput<string>('template') ?? ''
    // Use a callback replacement so characters like $& in the input are not interpreted as replacement directives.
    setOutput(
      'result',
      template.replaceAll('{{value}}', () => String(getInput('value') ?? ''))
    )
    next()
  }
}

export class TextSplit extends Node {
  static get definition() {
    return {
      title: localize('Split Text', '拆分文本'),
      inputs: [
        { name: 'exec', type: 'exec' },
        { name: 'text', type: 'string', label: localize('Text', '文本') },
        { name: 'separator', type: 'string', label: localize('Separator', '分隔符') },
      ] as const,
      outputs: [
        { name: 'exec', type: 'exec' },
        { name: 'items', type: 'array', label: localize('List', '列表') },
        { name: 'count', type: 'number', label: localize('Count', '数量') },
      ] as const,
      style,
    } as const
  }

  static executor: ExecutorFn = ({ getInput, setOutput, next }) => {
    const items = (getInput<string>('text') ?? '').split(getInput<string>('separator') ?? ',')
    setOutput('items', items)
    setOutput('count', items.length)
    next()
  }
}
