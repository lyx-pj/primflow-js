import { defineNode } from '@lyx-pj/primflow-model'
import { localize } from '../i18n'
import { NODE_COLORS } from './theme'

/**
 * Custom Card: demo node with an application-drawn body.
 *
 * The node keeps standard execution ports, but the example renders its own
 * card instead of the built-in header and body. See `context/node-renderers.tsx`.
 */
export const CustomCard = defineNode({
  get definition() {
    return {
      name: localize('Custom Card', '自定义卡片'),
      inputs: [
        { name: 'exec', type: 'exec' },
        // The card draws its own captions and value display, so the canvas
        // hides both the port label and the inline input control.
        {
          name: 'label',
          type: 'string',
          label: localize('Label', '标题'),
          showLabel: false,
          showInput: false,
        },
      ] as const,
      outputs: [{ name: 'exec', type: 'exec' }] as const,
      // Keep a header accent for the palette and minimap, with compact border ports.
      style: {
        header: { background: NODE_COLORS.custom, color: '#ffffff' },
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
