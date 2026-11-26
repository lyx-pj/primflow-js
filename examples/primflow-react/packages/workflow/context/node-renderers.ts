import { html, ref } from '@lyx-pj/primflow-canvas'
import type { NodeInstanceType, NodeRendererRegistry } from '@lyx-pj/primflow-canvas'
import { localize } from '../i18n'
import { storeFile, type AssetRef } from '../services/assets'
import { assetPreviewUrl } from './asset-preview'

const IMAGE_ACCEPT = 'image/png,image/jpeg'

/** Keep pointer handling inside the card instead of starting a canvas drag. */
function stopPointer(evt: Event) {
  evt.stopPropagation()
}

/**
 * Centered text button that picks the image for the node.
 *
 * The node's asset input is not connectable, so this button is the only way to
 * change the file from the card. The node panel keeps a full picker as well.
 */
function imagePicker(node: NodeInstanceType | undefined, asset: AssetRef | undefined) {
  return html`
    <div class="image-file-actions">
      <button
        type="button"
        class="image-file-button"
        ?disabled=${!node}
        @mousedown=${stopPointer}
        @click=${(evt: Event) => {
          evt.stopPropagation()
          const input = (evt.currentTarget as HTMLElement)
            .closest('.image-file-actions')
            ?.querySelector<HTMLInputElement>('input[type=file]')
          input?.click()
        }}
      >
        ${asset ? localize('Replace image', '更换图片') : localize('Choose image', '选择图片')}
      </button>
      <input
        class="image-file-input"
        type="file"
        accept=${IMAGE_ACCEPT}
        hidden
        @change=${async (evt: Event) => {
          const input = evt.currentTarget as HTMLInputElement
          const file = input.files?.[0]
          // Clear the value so picking the same file again still fires `change`.
          input.value = ''
          if (!file || !node) return
          try {
            node.inputValues = { asset: await storeFile(file) } as unknown as typeof node.inputValues
          } catch (error) {
            const button = input.closest('.image-file-actions')?.querySelector('button')
            if (button) button.title = String(error)
          }
        }}
      />
    </div>
  `
}

/** Thumbnail for a stored image, loaded once per asset and reused on re-renders. */
function imagePreview(asset: AssetRef) {
  return html`
    <img
      class="image-file-preview"
      alt=${localize('Image preview', '图片预览')}
      ${ref((element: Element | undefined) => {
        if (!(element instanceof HTMLImageElement)) return
        if (element.dataset.assetId === asset.assetId) return
        element.dataset.assetId = asset.assetId
        void assetPreviewUrl(asset)
          .then((url) => {
            if (element.isConnected) element.src = url
          })
          .catch(() => {
            element.hidden = true
          })
      })}
    />
  `
}

/**
 * Application-provided node renderers.
 *
 * The demo node replaces the built-in header and body with its own card. The
 * image node draws a card with a centered picker, the picked image, and a
 * small output port on its right edge. Ports and links keep working for both.
 */
export function registerNodeRenderers(renderers: NodeRendererRegistry) {
  renderers.register('DemoCard', {
    size: { width: 196, height: 104 },
    // Ports sit on the card border instead of the built-in rows.
    portPosition: ({ group, index, width }) => ({
      x: group === 'in' ? 0 : width,
      y: group === 'in' ? 34 + index * 40 : 52,
    }),
    render: ({ node }) => {
      const title = node?.title || node?.definition?.name || localize('Custom Node', '自定义节点')
      const caption = String(node?.inputValues?.label ?? '')
      return html`
        <div class="demo-card">
          <div class="demo-card-header">
            <span class="demo-card-dot"></span>
            <span class="demo-card-title">${title}</span>
          </div>
          <p class="demo-card-caption">${caption || localize('No caption', '未设置标题')}</p>
          <span class="demo-card-hint">${localize('Application-rendered', '应用自定义渲染')}</span>
        </div>
      `
    },
  })

  // The image node owns its card: a centered title and picker, the thumbnail
  // below them, and a small output port on the right edge.
  renderers.register('ImageFile', {
    size: { width: 196, height: 176 },
    portPosition: ({ group, width, height }) =>
      group === 'out' ? { x: width, y: height / 2 } : undefined,
    render: ({ node }) => {
      const title = node?.title || node?.definition?.name || localize('Image File', '图片文件')
      const asset = node?.inputValues?.asset as AssetRef | undefined
      return html`
        <div class="image-file-card">
          <div class="image-file-header">${title}</div>
          ${imagePicker(node, asset)}
          <div class="image-file-body">
            ${asset
              ? imagePreview(asset)
              : html`<p class="image-file-placeholder">${localize('No image selected', '尚未选择图片')}</p>`}
          </div>
        </div>
      `
    },
  })
}
