import { createRegistry } from '../nodes'
import { demoPalette } from '../nodes/catalog'
import { getLanguage, toolbarLabels } from '../i18n'
import { createGraphContext } from '@lyx-pj/workflow-react'

const registry = createRegistry()
const language = getLanguage()
const toolbar = toolbarLabels(language)

const graphOptions = {
  language,
  background: '#000000',
  gridSize: 10,
  drawGrid: {
    size: 10,
    color: 'rgba(255, 255, 255, 0.2)',
    thickness: 1,
  },
  palette: demoPalette,
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

export const { GraphProvider, useGraph } = createGraphContext(registry, graphOptions)
