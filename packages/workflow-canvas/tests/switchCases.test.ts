import { expect, test } from 'vitest'
import type { InputPort, OutputPort } from '@lyx-pj/workflow-model'
import {
  canRemoveSwitchCase,
  nextSwitchCaseNumber,
  removeSwitchCasePorts,
  switchCasePorts,
} from '../src/utils/switchCases'

const inputs = [
  { name: 'exec', type: 'exec', id: 'in-0' },
  { name: 'condition', type: 'string', id: 'in-1' },
  { name: 'case_1_value', type: 'string', id: 'in-2' },
  { name: 'case_2_value', type: 'string', id: 'in-3' },
] as unknown as InputPort[]

const outputs = [
  { name: 'default', type: 'exec', id: 'out-0' },
  { name: 'condition', type: 'string', id: 'out-1' },
  { name: 'case_1', type: 'exec', id: 'out-2' },
  { name: 'case_2', type: 'exec', id: 'out-3' },
] as unknown as OutputPort[]

test('only case input ports are counted', () => {
  expect(switchCasePorts(inputs).map((port) => port.name)).toEqual(['case_1_value', 'case_2_value'])
})

test('new cases use the largest index plus one without reusing removed middle indices', () => {
  expect(nextSwitchCaseNumber(inputs)).toBe(3)
  const onlySecond = inputs.filter((port) => port.name !== 'case_1_value')
  expect(nextSwitchCaseNumber(onlySecond)).toBe(3)
})

test('the last case cannot be deleted', () => {
  expect(canRemoveSwitchCase(inputs)).toBe(true)
  expect(canRemoveSwitchCase(inputs.filter((port) => port.name !== 'case_2_value'))).toBe(false)

  const removed = removeSwitchCasePorts(inputs, outputs, 'case_1_value')
  expect(removed).not.toBeNull()
  expect(removed!.inputs.map((port) => port.name)).toEqual(['exec', 'condition', 'case_2_value'])
  expect(removed!.outputs.map((port) => port.name)).toEqual(['default', 'condition', 'case_2'])
  expect(removed!.portIds).toEqual(['in-2', 'out-2'])
})

test('non-case and missing ports cannot be deleted', () => {
  expect(removeSwitchCasePorts(inputs, outputs, 'condition')).toBeNull()
  expect(removeSwitchCasePorts(inputs, outputs, 'case_9_value')).toBeNull()
})
