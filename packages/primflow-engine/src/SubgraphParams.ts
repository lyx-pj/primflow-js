import { isDataPort as isDataPortType } from '@lyx-pj/primflow-model'
import type { ExecutionNode } from './ExecutionNode'

type PortLike = { name: string; type: string }

/** Only data ports participate in parameters; exclude execution and spacer ports. */
function isDataPort(port: PortLike) {
  return isDataPortType(port.type)
}

/**
 * Pair two sets of data ports by name.
 *
 * If each side has one unmatched port, pair them by position.
 * This supports different default names such as input / result.
 */
function pairDataPorts(source: PortLike[], target: PortLike[]) {
  const pairs: Array<[PortLike, PortLike]> = []
  const used = new Set<PortLike>()
  for (const from of source) {
    const match = target.find((port) => !used.has(port) && port.name === from.name)
    if (!match) continue
    used.add(match)
    pairs.push([from, match])
  }
  const rest = source.filter((port) => !pairs.some(([from]) => from === port))
  const restTargets = target.filter((port) => !used.has(port))
  if (rest.length === 1 && restTargets.length === 1) pairs.push([rest[0], restTargets[0]])
  return pairs
}

/**
 * Check whether a parameter can be transferred.
 *
 * Skip incompatible types instead of interrupting the execution chain.
 * Skip undefined unless the target accepts any.
 */
function canCopy(node: ExecutionNode, source: PortLike, target: PortLike, value: unknown) {
  if (value === undefined && target.type !== 'any') return false
  return node.dataTypes.checkConnection(source.type, target.type)
}

/**
 * Pass parent call input parameters to the subgraph entry.
 *
 * Synchronize matching entry outputs so internal nodes can read the parameters.
 */
export function applySubgraphEntryParams(parent: ExecutionNode, entry: ExecutionNode) {
  // Loop entries use their own iteration values, outside subgraph parameter mapping.
  if (entry.type !== 'start') return
  const parentInputs = parent.inputs.filter(isDataPort)
  const entryInputs = entry.inputs.filter(isDataPort)
  for (const [from, to] of pairDataPorts(parentInputs, entryInputs)) {
    const value = parent.inputValues[from.name]
    if (!canCopy(parent, from, to, value)) continue
    entry.setInput(to.name, value)
  }
  const entryOutputs = entry.outputs.filter(isDataPort)
  for (const [from, to] of pairDataPorts(entryInputs, entryOutputs)) {
    const value = entry.inputValues[from.name]
    if (!canCopy(parent, from, to, value)) continue
    entry.setOutput(to.name, value)
  }
}

/**
 * Write subgraph exit parameters to the parent call's output ports.
 *
 * Call after subgraph completion so downstream parent nodes can read the returned values.
 */
export function applySubgraphExitParams(parent: ExecutionNode, exit: ExecutionNode | undefined) {
  if (!exit || exit.type !== 'end') return
  const exitInputs = exit.inputs.filter(isDataPort)
  const parentOutputs = parent.outputs.filter(isDataPort)
  for (const [from, to] of pairDataPorts(exitInputs, parentOutputs)) {
    const value = exit.inputValues[from.name]
    if (!canCopy(parent, from, to, value)) continue
    parent.setOutput(to.name, value)
  }
}
