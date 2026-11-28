import { defineNode, type InputPort, type PortType } from '@lyx-pj/primflow-model'
import { localize } from '../i18n'
import { headerStyle } from './theme'

const style = headerStyle('inputs')

function valueInputDefinition(
  name: string,
  input: InputPort<PortType>,
  outputType: PortType,
  fallback: unknown,
) {
  return {
    name,
    inputs: [input],
    outputs: [{ name: 'value', type: outputType, label: input.label }],
    valueOutputs: { value: { input: 'value', fallback } },
    style,
  } as const
}

export const TextInput = defineNode({
  get definition() {
    return valueInputDefinition(localize('Text Input', '文本输入'), {
      name: 'value',
      type: 'string',
      label: localize('Text', '文本'),
    }, 'string', '')
  },
})

export const NumberInput = defineNode({
  get definition() {
    return valueInputDefinition(localize('Number Input', '数字输入'), {
      name: 'value',
      type: 'number',
      label: localize('Number', '数值'),
    }, 'number', 0)
  },
})

export const BooleanInput = defineNode({
  get definition() {
    return valueInputDefinition(localize('Boolean Input', '布尔输入'), {
      name: 'value',
      type: 'boolean',
      label: localize('Boolean', '布尔值'),
    }, 'boolean', false)
  },
})

export const ArrayInput = defineNode({
  get definition() {
    return valueInputDefinition(localize('Array Input', '数组输入'), {
      name: 'value',
      type: 'array',
      label: localize('Array', '数组'),
    }, 'array', [])
  },
})

export const ObjectInput = defineNode({
  get definition() {
    return valueInputDefinition(localize('Object Input', '对象输入'), {
      name: 'value',
      type: 'object',
      label: localize('Object', '对象'),
    }, 'object', {})
  },
})

export const MultilineInput = defineNode({
  get definition() {
    return valueInputDefinition(localize('Multiline Input', '多行输入'), {
      name: 'value',
      type: 'string',
      editor: 'textarea',
      label: localize('Text', '文本'),
    }, 'string', '')
  },
})

export const SelectInput = defineNode({
  get definition() {
    return valueInputDefinition(localize('Select Input', '下拉输入'), {
      name: 'value',
      type: 'string',
      editor: 'select',
      label: localize('Option', '选项'),
      options: [
        { label: localize('Small', '小'), value: 'small' },
        { label: localize('Medium', '中'), value: 'medium' },
        { label: localize('Large', '大'), value: 'large' },
      ],
    }, 'string', 'small')
  },
})
