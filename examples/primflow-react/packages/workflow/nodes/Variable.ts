import { defineNode, NodeExecutionError, type JsonValue, type TaskStateSnapshot } from '@lyx-pj/primflow-model'
import { localize } from '../i18n'

const style = { header: { background: '#365b79', color: '#fff' } } as const

function variableName(raw: string | undefined) {
  const name = raw?.trim()
  if (!name) {
    throw new NodeExecutionError(localize('Enter a variable name', '请填写变量名'), {
      kind: 'execution',
      code: 'VARIABLE_NAME_REQUIRED',
    })
  }
  return name
}

export const SetVariable = defineNode({
  get definition() {
    return {
      name: localize('Set Variable', '设置变量'),
      inputs: [
        { name: 'exec', type: 'exec' },
        { name: 'name', type: 'string', label: localize('Variable name', '变量名') },
        { name: 'value', type: 'any', label: localize('Value', '值') },
      ] as const,
      outputs: [{ name: 'exec', type: 'exec' }] as const,
      style,
    }
  },

  executor: ({ getInput, state, next }) => {
    const name = variableName(getInput<string>('name'))
    const value = getInput<JsonValue>('value')
    if (value === undefined) {
      throw new NodeExecutionError(localize('Provide a JSON value', '请提供一个 JSON 值'), {
        kind: 'execution',
        code: 'VARIABLE_VALUE_REQUIRED',
        details: { name },
      })
    }
    state.update({ [name]: value })
    return next()
  },
})

function readVariable(raw: unknown, state: TaskStateSnapshot) {
  const name = variableName(typeof raw === 'string' ? raw : undefined)
  if (!Object.hasOwn(state.values, name)) {
    throw new NodeExecutionError(localize(`Variable "${name}" is not set`, `尚未设置变量「${name}」`), {
      kind: 'execution',
      code: 'VARIABLE_NOT_FOUND',
      retryable: true,
      details: { name },
    })
  }
  return state.values[name]
}

export const GetVariable = defineNode({
  get definition() {
    return {
      name: localize('Get Variable', '获取变量'),
      inputs: [{ name: 'name', type: 'string', label: localize('Variable name', '变量名') }] as const,
      outputs: [{ name: 'value', type: 'any', label: localize('Value', '值') }] as const,
      valueOutputs: { value: { input: 'name', read: readVariable } },
      style,
    }
  },
})
