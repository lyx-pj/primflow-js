import { Node } from '../../Node'
import type { LoopConfig } from '../../types'

/** Editor defaults for new loops; the body decides when to end. */
export const DEFAULT_LOOP_CONFIG: LoopConfig = {
  version: 1,
}

const loopStyle = { header: { background: '#7c3aed', color: '#fff' } }
const entryStyle = { header: { background: '#6d28d9', color: '#fff' } }
const returnStyle = { header: { background: '#b45309', color: '#fff' } }

/**
 * Loop node with one entry and one exit.
 *
 * One data input: the first iteration's entry value.
 * One data output: the final submitted value.
 * Iteration indices and completion reasons are internal, not exposed as ports.
 */
export class LoopNode extends Node {
  static readonly type = 'loop'
  static definition = {
    type: 'loop',
    title: 'Loop',
    inputs: [
      { name: 'exec', type: 'exec', id: 'in-exec', label: 'Run' },
      { name: 'input', type: 'any', id: 'in-input', label: 'Initial value' },
    ] as const,
    outputs: [
      { name: 'done', type: 'exec', id: 'out-done', label: 'Done' },
      { name: 'output', type: 'any', id: 'out-output', label: 'Loop output' },
    ] as const,
    style: loopStyle,
  }
}

/**
 * Loop entry: the current iteration's entry value.
 *
 * Use initial loop input first, then the previous return node's submitted value.
 */
export class LoopEntryNode extends Node {
  static readonly type = 'loop-entry'
  static definition = {
    type: 'loop-entry',
    title: 'Loop Entry',
    inputs: [] as const,
    outputs: [
      { name: 'exec', type: 'exec', id: 'out-exec', label: 'Run' },
      { name: 'value', type: 'any', id: 'out-value', label: 'Iteration input' },
    ] as const,
    style: entryStyle,
  }
}

/**
 * Loop return: the iteration's only exit.
 *
 * The data port submits the result and next iteration's entry value.
 * Execution ports choose whether to continue or end the loop.
 */
export class LoopReturnNode extends Node {
  static readonly type = 'loop-return'
  static definition = {
    type: 'loop-return',
    title: 'Loop Return',
    inputs: [
      { name: 'next', type: 'exec', id: 'in-next', label: 'Resume' },
      { name: 'break', type: 'exec', id: 'in-break', label: 'Break' },
      { name: 'value', type: 'any', id: 'in-value', label: 'Iteration result' },
    ] as const,
    outputs: [] as const,
    style: returnStyle,
  }
}
