import { html, ref, type TemplateResult } from '@lyx-pj/primflow-canvas'
import type { EditorRegistry, PanelEditorContext, PortEditorContext } from '@lyx-pj/primflow-canvas'
import { localize } from '../i18n'
import { storeFile, type AssetRef } from '../services/assets'
import { assetPreviewUrl } from './asset-preview'

/**
 * Media types accepted by each asset data type.
 *
 * The asset data type id decides which files the picker accepts, so a custom
 * type can narrow the accepted formats.
 */
const ACCEPTED: Record<string, string> = {
  'media.image@1': 'image/png,image/jpeg',
}

function acceptFor(type: string) {
  return ACCEPTED[type] ?? ''
}

function isImage(type: string) {
  return type === 'media.image@1'
}

/** Keep pointer handling inside the control instead of starting a canvas drag. */
function stopPointer(evt: Event) {
  evt.stopPropagation()
}

/**
 * Port editor for asset types.
 *
 * The canvas port has little room, so the control is a compact button that
 * opens the browser file picker directly. The node panel keeps the full
 * control, and the image node draws its thumbnail in the node body.
 */
function assetPortEditor(context: PortEditorContext): TemplateResult {
  const { port, value, setValue } = context
  const asset = value as AssetRef | undefined

  return html`
    <div class="bpgraph-asset-port">
      <button
        type="button"
        class="bpgraph-asset-port-button"
        data-port-field=${port.name}
        aria-label=${localize('Choose file', '选择文件')}
        title=${asset?.assetId ?? localize('Choose file', '选择文件')}
        @mousedown=${stopPointer}
        @click=${(evt: Event) => {
          evt.stopPropagation()
          const input = (evt.currentTarget as HTMLElement)
            .closest('.bpgraph-asset-port')
            ?.querySelector<HTMLInputElement>('input[type=file]')
          input?.click()
        }}
      >
        ${asset ? '📎' : '＋'}
      </button>
      <input
        class="bpgraph-asset-port-input"
        type="file"
        accept=${acceptFor(port.type)}
        hidden
        @change=${async (evt: Event) => {
          const input = evt.currentTarget as HTMLInputElement
          const file = input.files?.[0]
          // Clear the value so picking the same file again still fires `change`.
          input.value = ''
          if (!file) return
          try {
            setValue(await storeFile(file))
          } catch (error) {
            const button = input.closest('.bpgraph-asset-port')?.querySelector('button')
            if (button) button.title = String(error)
          }
        }}
      />
    </div>
  `
}

/**
 * Panel editor for asset types.
 *
 * The panel has room for the full control: a file picker, the stored asset id
 * and an image preview.
 */
function assetPanelEditor(context: PanelEditorContext): TemplateResult {
  const { port, value, setValue } = context
  const accepted = acceptFor(port.type)
  const image = isImage(port.type)
  const asset = value as AssetRef | undefined

  return html`
    <div class="bpgraph-asset-panel">
      <label class="bpgraph-asset-panel-label">
        <span>${localize('Choose file', '选择文件')}</span>
        <input
          type="file"
          accept=${accepted}
          @change=${async (evt: Event) => {
            const input = evt.currentTarget as HTMLInputElement
            const file = input.files?.[0]
            input.value = ''
            if (!file) return
            const panel = input.closest('.bpgraph-asset-panel')
            try {
              setValue(await storeFile(file))
            } catch (error) {
              const status = panel?.querySelector('.bpgraph-asset-panel-status')
              if (status) status.textContent = String(error)
            }
          }}
        />
      </label>
      ${asset ? html`<p class="bpgraph-asset-panel-name">${asset.assetId}</p>` : html``}
      ${image && asset
        ? html`<img
            class="bpgraph-asset-panel-preview"
            alt=${localize('Image preview', '图片预览')}
            ${ref((element: Element | undefined) => {
              // The preview loads after the element is in the DOM.
              if (!(element instanceof HTMLImageElement) || element.src) return
              void assetPreviewUrl(asset)
                .then((url) => {
                  element.src = url
                })
                .catch((error) => {
                  element.hidden = true
                  const status = element.closest('.bpgraph-asset-panel')?.querySelector('.bpgraph-asset-panel-status')
                  if (status) status.textContent = String(error)
                })
            })}
          />`
        : html``}
      <p class="bpgraph-asset-panel-status" role="status"></p>
    </div>
  `
}

/**
 * Register the asset editors for every asset data type.
 *
 * The editors are keyed by data type, so a node that uses an asset type gets
 * the file control on its port and in the node panel without the canvas
 * knowing anything about files.
 */
export function registerAssetEditors(editors: EditorRegistry) {
  for (const type of Object.keys(ACCEPTED)) {
    editors.register(type, {
      port: { render: assetPortEditor, width: 32 },
      panel: { render: assetPanelEditor },
    })
  }
}
