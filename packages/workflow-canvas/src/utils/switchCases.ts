import type { InputPort, OutputPort } from '@lyx-pj/workflow-model'

const CASE_INPUT_PATTERN = /^case_(\d+)_value$/

/** Count only Switch case input ports, not arbitrary fields with a `case_` prefix. */
export function switchCasePorts(inputs: readonly InputPort[]) {
  return inputs.filter((input) => CASE_INPUT_PATTERN.test(input.name))
}

/**
 * Use the largest existing case index plus one, not the case count plus one.
 * This avoids duplicate port names after deleting a middle case.
 */
export function nextSwitchCaseNumber(inputs: readonly InputPort[]) {
  const numbers = switchCasePorts(inputs).map((input) => Number(CASE_INPUT_PATTERN.exec(input.name)?.[1] ?? 0))
  return Math.max(0, ...numbers) + 1
}

/** Retain at least one case; the last cannot be deleted. */
export function canRemoveSwitchCase(inputs: readonly InputPort[]) {
  return switchCasePorts(inputs).length > 1
}

export type RemovedSwitchCase = {
  inputs: InputPort[]
  outputs: OutputPort[]
  /** Deleted port ids used to remove their connections */
  portIds: string[]
}

/**
 * Compute inputs/outputs after deleting one case.
 * Return null for non-case, missing, or last-case deletion attempts.
 */
export function removeSwitchCasePorts(
  inputs: readonly InputPort[],
  outputs: readonly OutputPort[],
  inputName: string
): RemovedSwitchCase | null {
  const match = CASE_INPUT_PATTERN.exec(inputName)
  if (!match) return null
  if (!canRemoveSwitchCase(inputs)) return null
  const input = inputs.find((item) => item.name === inputName)
  if (!input) return null

  const outputName = `case_${match[1]}`
  const output = outputs.find((item) => item.name === outputName)

  return {
    inputs: inputs.filter((item) => item.name !== inputName),
    outputs: outputs.filter((item) => item.name !== outputName),
    portIds: [input.id, output?.id].filter((id): id is string => Boolean(id)),
  }
}
