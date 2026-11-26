import { defineNode, NodeExecutionError } from '@lyx-pj/primflow-model'
import { localize } from '../i18n'

const style = { header: { background: '#6850a1', color: '#fff' } }

export const TextTemplate = defineNode({
  get definition() {
    return {
      name: localize('Text Template', '文本模板'),
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
  },

  executor: ({ getInput, setOutput, next }) => {
    const template = getInput<string>('template') ?? ''
    // Use a callback replacement so characters like $& in the input are not interpreted as replacement directives.
    setOutput(
      'result',
      template.replaceAll('{{value}}', () => String(getInput('value') ?? ''))
    )
    next()
  },
})

export const TextSplit = defineNode({
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
        { name: 'items', type: 'array', label: localize('List', '列表') },
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


export const CheckString = defineNode({
  retryPolicy: { idempotent: true, maxRetries: 2 },

  get definition() {
    return {
      name: localize('Check String', '校验字符串'),
      inputs: [
        { name: 'exec', type: 'exec' },
        { name: 'value', type: 'any', label: localize('Actual value', '实际值') },
        { name: 'expected', type: 'string', label: localize('Expected string', '期望字符串') },
      ] as const,
      outputs: [
        { name: 'exec', type: 'exec' },
        { name: 'value', type: 'string', label: localize('Validated string', '通过校验的字符串') },
      ] as const,
      style,
    } as const
  },

  executor: ({ getInput, setOutput, next }) => {
    const value = getInput('value')
    const expected = getInput<string>('expected') ?? ''
    if (value !== expected) {
      throw new NodeExecutionError(localize('The value does not match the expected string', '实际值与期望字符串不一致'), {
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
