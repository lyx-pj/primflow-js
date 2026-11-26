import { defineNode } from '@lyx-pj/primflow-model'
import { localize } from '../i18n'

/**
 * Demo node with an application-drawn body.
 *
 * The node keeps standard execution ports, but the example renders its own
 * card instead of the built-in header and body. See `context/node-renderers.ts`.
 */
export const DemoCard = defineNode({
  get definition() {
    return {
      name: localize('Custom Node', '自定义节点'),
      inputs: [
        { name: 'exec', type: 'exec' },
        // The card draws its own captions and value display, so the canvas
        // hides both the port label and the inline input control.
        {
          name: 'label',
          type: 'string',
          label: localize('Caption', '标题文字'),
          showLabel: false,
          showInput: false,
        },
      ] as const,
      outputs: [{ name: 'exec', type: 'exec' }] as const,
      // The card is small, so it uses smaller ports than the default.
      style: {
        ports: {
          input: { port: { r: 4 } },
          output: { port: { r: 4 } },
        },
      },
    } as const
  },

  executor: async ({ next }) => {
    await next()
  },
})
