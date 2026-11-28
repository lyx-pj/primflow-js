import type { EditorRegistry } from '@lyx-pj/primflow-canvas'
import { createReactMount, type GraphContextHelpers } from '@lyx-pj/primflow-react'
import { AssetPanelEditor, AssetPortEditor } from './asset-editor-views'

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

/**
 * Register the asset editors for every asset data type.
 *
 * The editors are keyed by data type, so a node that uses an asset type gets
 * the file control on its port and in the node panel without the canvas
 * knowing anything about files.
 */
export function registerAssetEditors(editors: EditorRegistry, helpers?: GraphContextHelpers) {
  const mount = helpers?.reactMount ?? createReactMount
  for (const type of Object.keys(ACCEPTED)) {
    const accept = acceptFor(type)
    const image = isImage(type)
    editors.register(type, {
      port: { mount: mount((ctx) => <AssetPortEditor {...ctx} accept={accept} />), width: 32 },
      panel: { mount: mount((ctx) => <AssetPanelEditor {...ctx} accept={accept} isImage={image} />) },
    })
  }
}
