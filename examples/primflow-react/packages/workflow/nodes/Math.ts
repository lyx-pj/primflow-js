import { defineNode } from '@lyx-pj/primflow-model'
import { localize } from '../i18n'

const style = { header: { background: '#94642a', color: '#fff' } }

export const MathOperation = defineNode({
  get definition() {
    return {
      name: localize('Arithmetic', '四则运算'),
      inputs: [
        { name: 'exec', type: 'exec' },
        { name: 'a', type: 'number', label: localize('Value A', '数值 A') },
        {
          name: 'operation',
          type: 'string',
          editor: 'select',
          label: localize('Operation', '运算'),
          options: localize(
            [
              { label: 'Add +', value: 'add' },
              { label: 'Subtract −', value: 'subtract' },
              { label: 'Multiply ×', value: 'multiply' },
              { label: 'Divide ÷', value: 'divide' },
            ],
            [
              { label: '加法 +', value: 'add' },
              { label: '减法 −', value: 'subtract' },
              { label: '乘法 ×', value: 'multiply' },
              { label: '除法 ÷', value: 'divide' },
            ],
          ),
        },
        { name: 'b', type: 'number', label: localize('Value B', '数值 B') },
      ] as const,
      outputs: [
        { name: 'exec', type: 'exec' },
        { name: 'result', type: 'number', label: localize('Result', '结果') },
      ] as const,
      style,
    } as const
  },

  executor: ({ getInput, setOutput, next }) => {
    const a = getInput<number>('a') ?? 0
    const b = getInput<number>('b') ?? 0
    let result: number
    switch (getInput<string>('operation') ?? 'add') {
      case 'add':
        result = a + b
        break
      case 'subtract':
        result = a - b
        break
      case 'multiply':
        result = a * b
        break
      case 'divide':
        if (b === 0) throw new Error(localize('Cannot divide by zero', '除数不能为 0'))
        result = a / b
        break
      default:
        throw new Error(localize('Choose a valid operation', '请选择有效的运算方式'))
    }
    setOutput('result', result)
    next()
  },
})

export const Compare = defineNode({
  get definition() {
    return {
      name: localize('Numeric Comparison', '数值比较'),
      inputs: [
        { name: 'exec', type: 'exec' },
        { name: 'a', type: 'number', label: localize('Value A', '数值 A') },
        {
          name: 'operation',
          type: 'string',
          editor: 'select',
          label: localize('Condition', '条件'),
          options: localize(
            [
              { label: 'Greater than >', value: 'gt' },
              { label: 'Greater than or equal ≥', value: 'gte' },
              { label: 'Equal =', value: 'eq' },
              { label: 'Less than <', value: 'lt' },
            ],
            [
              { label: '大于 >', value: 'gt' },
              { label: '大于等于 ≥', value: 'gte' },
              { label: '等于 =', value: 'eq' },
              { label: '小于 <', value: 'lt' },
            ],
          ),
        },
        { name: 'b', type: 'number', label: localize('Value B', '数值 B') },
      ] as const,
      outputs: [
        { name: 'exec', type: 'exec' },
        { name: 'result', type: 'boolean', label: localize('Satisfied', '是否满足') },
      ] as const,
      style,
    } as const
  },

  executor: ({ getInput, setOutput, next }) => {
    const a = getInput<number>('a') ?? 0
    const b = getInput<number>('b') ?? 0
    let result: boolean
    switch (getInput<string>('operation') ?? 'gt') {
      case 'gt':
        result = a > b
        break
      case 'gte':
        result = a >= b
        break
      case 'eq':
        result = a === b
        break
      case 'lt':
        result = a < b
        break
      default:
        throw new Error(localize('Choose a valid comparison', '请选择有效的比较条件'))
    }
    setOutput('result', result)
    next()
  },
})
