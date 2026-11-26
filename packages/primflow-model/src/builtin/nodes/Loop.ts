import { defineNode } from '../../Node'
import { getJsonNodeDefinitionId, type JsonNode, type LoopConfig } from '../../types'

/** Editor defaults for new loops; the body decides when to end. */
export const DEFAULT_LOOP_CONFIG: LoopConfig = {
  version: 1,
}

const loopStyle = {
  header: { background: '#7c3aed', color: '#fff' },
  ports: {
    // Loop calls render as compact cards; match the subgraph call port size.
    input: { port: { r: 4, strokeWidth: 1 } },
    output: { port: { r: 4, strokeWidth: 1 } },
  },
}
const entryStyle = { header: { background: '#6d28d9', color: '#fff' } }
const returnStyle = { header: { background: '#b45309', color: '#fff' } }
const initialOutput = { name: 'initialValue', type: 'any', id: 'out-initialValue', label: 'Initial value' } as const

/**
 * Loop node with one entry and one exit.
 *
 * One data input: the first iteration's entry value.
 * One data output: the final submitted value.
 * Iteration indices and completion reasons are internal, not exposed as ports.
 */
export const LoopNode = defineNode({
  type: 'loop',
  definition: {
    kind: 'loop',
    name: 'Loop',
    inputs: [
      { name: 'exec', type: 'exec', id: 'in-exec', label: 'Run' },
      { name: 'input', type: 'any', id: 'in-input', label: 'Initial value' },
    ] as const,
    outputs: [
      { name: 'done', type: 'exec', id: 'out-done', label: 'Done' },
      { name: 'output', type: 'any', id: 'out-output', label: 'Loop output' },
    ] as const,
    style: loopStyle,
  },
})

/**
 * Loop entry: the current iteration's entry value and the invocation's initial input.
 *
 * Use initial loop input first, then the previous return node's submitted value.
 */
export const LoopEntryNode = defineNode({
  type: 'loop-entry',
  definition: {
    kind: 'loop-entry',
    name: 'Loop Entry',
    inputs: [] as const,
    outputs: [
      { name: 'exec', type: 'exec', id: 'out-exec', label: 'Run' },
      { name: 'value', type: 'any', id: 'out-value', label: 'Iteration input' },
      initialOutput,
    ] as const,
    style: entryStyle,
  },
})

/**
 * Loop return: the iteration's only exit.
 *
 * The data port submits the result and next iteration's entry value.
 * Execution ports choose whether to continue or end the loop.
 */
export const LoopReturnNode = defineNode({
  type: 'loop-return',
  definition: {
    kind: 'loop-return',
    name: 'Loop Return',
    inputs: [
      { name: 'next', type: 'exec', id: 'in-next', label: 'Resume' },
      { name: 'break', type: 'exec', id: 'in-break', label: 'Break' },
      { name: 'value', type: 'any', id: 'in-value', label: 'Iteration result' },
    ] as const,
    outputs: [] as const,
    style: returnStyle,
  },
})

/** Supply the initial input on saved entries while preserving their existing port IDs and representation. */
export function normalizeLoopEntryOutputs(node: JsonNode): JsonNode['outputs'] {
  const { outputs } = node
  if (getJsonNodeDefinitionId(node) !== LoopEntryNode.type || outputs.some((port) => port.name === initialOutput.name)) return outputs

  const usedIds = new Set(outputs.map((port) => port.id))
  let id: string = initialOutput.id
  for (let suffix = 2; usedIds.has(id); suffix++) id = `${initialOutput.id}-${suffix}`
  const port = outputs.some((output) => output.type)
    ? { ...initialOutput, id }
    : { name: initialOutput.name, id }
  return [...outputs, port]
}
