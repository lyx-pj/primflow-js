import type { NodeRendererRegistry } from '@lyx-pj/primflow-canvas'
import { createReactMount, type GraphContextHelpers } from '@lyx-pj/primflow-react'
import { localize } from '../i18n'
import type { AssetRef } from '../services/assets'
import { CustomCardView, ImageFileView } from './node-renderer-views'

/**
 * Application-provided node renderers.
 *
 * `CustomCard` and `ImageFile` draw their own card bodies while matching the
 * header bar, surface tone, and border geometry of standard nodes. Ports and
 * links keep working for both.
 */
export function registerNodeRenderers(renderers: NodeRendererRegistry, helpers?: GraphContextHelpers) {
  const mount = helpers?.reactMount ?? createReactMount

  renderers.register('CustomCard', {
    size: { width: 196, height: 104 },
    // Ports sit on the card border below the header bar.
    portPosition: ({ group, index, width }) => ({
      x: group === 'in' ? 0 : width,
      y: group === 'in' ? 46 + index * 32 : 62,
    }),
    mount: mount((ctx) => <CustomCardView {...ctx} />),
  })

  renderers.register('ImageFile', {
    size: { width: 196, height: 176 },
    portPosition: ({ group, width, height }) =>
      group === 'out' ? { x: width, y: (height + 26) / 2 } : undefined,
    mount: mount(({ node }) => {
      const title = node?.title || node?.definition?.name || localize('Image File', '图片文件')
      const asset = node?.inputValues?.asset as AssetRef | undefined
      return (
        <ImageFileView
          title={title}
          asset={asset}
          disabled={!node}
          onSelectAsset={(nextAsset) => {
            if (!node) return
            node.inputValues = { asset: nextAsset } as unknown as typeof node.inputValues
          }}
        />
      )
    }),
  })
}
