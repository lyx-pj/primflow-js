import { defineNode, NodeExecutionError } from '@lyx-pj/primflow-model'
import { localize } from '../i18n'
import { headerStyle } from './theme'

const style = headerStyle('text')

export const TextTemplate = defineNode({
  get definition() {
    return {
      name: localize('Text Template', '文本模板'),
      inputs: [
        { name: 'exec', type: 'exec' },
        { name: 'template', type: 'string', label: localize('Template', '模板') },
        { name: 'value', type: 'any', label: localize('Value', '值') },
      ] as const,
      outputs: [
        { name: 'exec', type: 'exec' },
        { name: 'result', type: 'string', label: localize('Result', '结果') },
      ] as const,
      style,
    } as const
  },

  executor: ({ getInput, setOutput, next }) => {
    const template = getInput<string>('template') ?? ''
    // Use a callback replacement so characters like $& in the input are not interpreted as replacement directives.
    setOutput(
      'result',
      template.replaceAll('{{value}}', () => String(getInput('value') ?? '')),
    )
    next()
  },
})

export const SplitText = defineNode({
  get definition() {
    return {
      name: localize('Split Text', '拆分文本'),
      inputs: [
        { name: 'exec', type: 'exec' },
        { name: 'text', type: 'string', label: localize('Text', '文本') },
        { name: 'separator', type: 'string', label: localize('Separator', '分隔符') },
      ] as const,
      outputs: [
        { name: 'exec', type: 'exec' },
        { name: 'items', type: 'array', label: localize('Items', '列表') },
        { name: 'count', type: 'number', label: localize('Count', '数量') },
      ] as const,
      style,
    } as const
  },

  executor: ({ getInput, setOutput, next }) => {
    const items = (getInput<string>('text') ?? '').split(getInput<string>('separator') ?? ',')
    setOutput('items', items)
    setOutput('count', items.length)
    next()
  },
})

export const CheckText = defineNode({
  retryPolicy: { idempotent: true, maxRetries: 2 },

  get definition() {
    return {
      name: localize('Check Text', '校验文本'),
      inputs: [
        { name: 'exec', type: 'exec' },
        { name: 'value', type: 'any', label: localize('Value', '值') },
        { name: 'expected', type: 'string', label: localize('Expected', '期望值') },
      ] as const,
      outputs: [
        { name: 'exec', type: 'exec' },
        { name: 'value', type: 'string', label: localize('Value', '值') },
      ] as const,
      style,
    } as const
  },

  executor: ({ getInput, setOutput, next }) => {
    const value = getInput('value')
    const expected = getInput<string>('expected') ?? ''
    if (value !== expected) {
      throw new NodeExecutionError(localize('Value does not match expected text', '实际值与期望文本不一致'), {
        kind: 'input',
        code: 'STRING_MISMATCH',
        inputPort: 'value',
        retryable: true,
        details: { expected },
      })
    }
    setOutput('value', value)
    return next()
  },
})
