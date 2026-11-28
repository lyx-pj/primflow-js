import { defineNode } from '@lyx-pj/primflow-model'
import { localize } from '../i18n'
import { headerStyle } from './theme'

/**
 * Print: writes a value to the console and the business log.
 *
 * The node declares only its ports. The executor lives in
 * `../executors` and is registered on the engine, so the node definition
 * carries no behavior.
 */
export const Print = defineNode({
  /** The executor the engine runs for this node. */
  executor: 'workflow.print',

  get definition() {
    return {
      name: localize('Print', '打印输出'),
      inputs: [
        { name: 'exec', type: 'exec' },
        { name: 'value', type: 'any', label: localize('Value', '内容') },
      ] as const,
      outputs: [
        { name: 'exec', type: 'exec' },
        { name: 'value', type: 'any', label: localize('Value', '内容') },
      ] as const,
      style: headerStyle('debug'),
    } as const
  },
})
