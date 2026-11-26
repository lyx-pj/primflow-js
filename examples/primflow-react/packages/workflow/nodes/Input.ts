import { defineNode, type InputPort, type PortType } from '@lyx-pj/primflow-model'
import { localize } from '../i18n'

const style = { header: { background: '#315f9e', color: '#fff' } }

function valueInputDefinition(
  name: string,
  input: InputPort<PortType>,
  outputType: PortType,
  fallback: unknown,
  outputLabel = input.label,
) {
  return {
    name,
    inputs: [input],
    outputs: [{ name: 'value', type: outputType, label: outputLabel }],
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
      label: localize('Value', '数值'),
    }, 'number', 0)
  },
})

export const BooleanInput = defineNode({
  get definition() {
    return valueInputDefinition(localize('Toggle Input', '开关输入'), {
      name: 'value',
      type: 'boolean',
      label: localize('On', '开启'),
    }, 'boolean', false, localize('Toggle', '开关'))
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

export const MultilineTextInput = defineNode({
  get definition() {
    return valueInputDefinition(localize('Multiline Text Input', '多行文本输入'), {
      name: 'value',
      type: 'string',
      editor: 'textarea',
      label: localize('Text', '文本'),
    }, 'string', '')
  },
})

export const SelectInput = defineNode({
  get definition() {
    return valueInputDefinition(localize('Select Input', '下拉选择'), {
      name: 'value',
      type: 'string',
      editor: 'select',
      label: localize('Size', '尺寸'),
      options: [
        { label: localize('Small', '小'), value: 'small' },
        { label: localize('Medium', '中'), value: 'medium' },
        { label: localize('Large', '大'), value: 'large' },
      ],
    }, 'string', 'small')
  },
})
