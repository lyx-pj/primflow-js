import { defineDataType, defineNode, schema } from '@lyx-pj/primflow-model'
import { localize } from '../i18n'
import { NODE_COLORS } from './theme'

export const Image = defineDataType({
  id: 'media.image@1',
  schema: schema.object({ assetId: schema.string(), mediaType: schema.enum(['image/png', 'image/jpeg']) }),
})

export const ImageFile = defineNode({
  get definition() {
    return {
      name: localize('Image File', '图片文件'),
      inputs: [{
        name: 'asset',
        type: Image,
        // The card picks the file with its own button, so the asset port is not
        // connectable and shows neither a port dot nor an inline editor.
        showPort: false,
        showLabel: false,
        showInput: false,
      }],
      outputs: [{ name: 'asset', type: Image, showLabel: false }],
      valueOutputs: { asset: { input: 'asset', fallback: undefined } },
      // Keep the category header color for the palette and minimap, with a compact right-edge port.
      style: {
        header: { background: NODE_COLORS.files, color: '#ffffff' },
        ports: { output: { port: { r: 4 } } },
      },
    } as const
  },
})
