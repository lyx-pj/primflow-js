import { defineNode } from '@lyx-pj/primflow-model'
import { localize } from '../i18n'

/**
 * Debug Output: writes a value to the console and the business log.
 *
 * The node declares only its ports. The executor lives in
 * `../executors` and is registered on the engine, so the node definition
 * carries no behavior.
 */
export const Print = defineNode({
  /** The executor the engine runs for this node. */
  executor: 'workflow.print',

  definition: {
    kind: 'default',
    get name() { return localize('Debug Output', '调试输出') },
    inputs: [
      { name: 'exec', type: 'exec' },
      { name: 'message', type: 'any', get label() { return localize('Content', '内容') } },
    ],
    outputs: [
      { name: 'done', type: 'exec' },
      { name: 'result', type: 'any', get label() { return localize('Content', '内容') } },
    ],
    style: {
      header: { background: '#4c647b', color: '#fff' },
    },
  },
})
