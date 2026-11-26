import { createRegistry } from '../nodes'
import { demoPalette } from '../nodes/catalog'
import { getLanguage, toolbarLabels } from '../i18n'
import { registerAssetEditors } from './asset-editors'
import { registerNodeRenderers } from './node-renderers'
import { demoPanelSections } from './panel-sections'
import { createGraphContext } from '@lyx-pj/primflow-react'

const registry = createRegistry()
const language = getLanguage()
const toolbar = toolbarLabels(language)

const canvasOptions = {
  language,
  background: '#000000',
  gridSize: 10,
  drawGrid: {
    size: 10,
    color: 'rgba(255, 255, 255, 0.2)',
    thickness: 1,
  },
  palette: demoPalette,
  // Demo node reshapes its own panel; other nodes keep the defaults.
  nodePanel: { sections: demoPanelSections },
  contextMenu: {
    icons: {
      'add-node': 'ri-add-circle-line',
      breakpoint: 'ri-bug-line',
      copy: 'ri-file-copy-line',
      paste: 'ri-clipboard-line',
      delete: 'ri-delete-bin-line',
    },
  },
  toolbar: {
    actions: [
      { id: 'run', label: toolbar.run, iconClass: 'ri-play-line' },
      { id: 'debug', label: toolbar.debug, iconClass: 'ri-bug-line' },
      { id: 'resume', label: toolbar.resume, iconClass: 'ri-play-circle-line', disabled: true },
      { id: 'stop', label: toolbar.stop, iconClass: 'ri-stop-line', disabled: true },
    ],
  },
}

export const { GraphProvider, useGraph } = createGraphContext(registry, {
  canvas: canvasOptions,
  // Editors decide how an asset value is edited, on the port and in the panel.
  editors: registerAssetEditors,
  // Renderers decide how a node definition looks on the canvas.
  nodeRenderers: registerNodeRenderers,
})
