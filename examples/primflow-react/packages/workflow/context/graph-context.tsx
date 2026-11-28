import type { NodeWidgetContext } from '@lyx-pj/primflow-canvas'
import { createGraphContext, createReactMount } from '@lyx-pj/primflow-react'
import { createRegistry } from '../nodes'
import { demoPalette } from '../nodes/catalog'
import { getLanguage, toolbarLabels } from '../i18n'
import { registerAssetEditors } from './asset-editors'
import { registerNodeRenderers } from './node-renderers'
import { demoPanelSections } from './panel-sections'

const registry = createRegistry()
const language = getLanguage()
const toolbar = toolbarLabels(language)

/** Example ComfyUI-style quick preset chips rendered around selected nodes. */
function renderDemoNodeWidgets(ctx: NodeWidgetContext) {
  const defId = ctx.node.definitionId ?? ctx.node.nodeType ?? ctx.node.type
  if (defId === 'TextInput') {
    const presets = ['Hello, workflow!', 'Summarize this document', 'Extract key entities']
    return (
      <div className="flex flex-wrap gap-1.5">
        {presets.map((preset) => (
          <button
            key={preset}
            type="button"
            className="cursor-pointer rounded-full border border-slate-400/20 bg-slate-400/10 px-2.5 py-0.5 text-[11px] font-medium text-slate-200 transition hover:bg-slate-400/20"
            onClick={() => ctx.setInputValue('value', preset)}
          >
            {preset}
          </button>
        ))}
      </div>
    )
  }
  if (defId === 'Delay') {
    const presets = [
      { label: '250ms', ms: 250 },
      { label: '1s', ms: 1000 },
      { label: '3s', ms: 3000 },
    ]
    return (
      <div className="flex flex-wrap gap-1.5">
        {presets.map((preset) => {
          const active = Number(ctx.values.duration) === preset.ms
          return (
            <button
              key={preset.label}
              type="button"
              className={
                active
                  ? 'cursor-pointer rounded-full border border-sky-400/60 bg-sky-400/20 px-2.5 py-0.5 text-[11px] font-medium text-sky-300 transition hover:bg-sky-400/30'
                  : 'cursor-pointer rounded-full border border-slate-400/20 bg-slate-400/10 px-2.5 py-0.5 text-[11px] font-medium text-slate-200 transition hover:bg-slate-400/20'
              }
              onClick={() => ctx.setInputValue('duration', preset.ms)}
            >
              {preset.label}
            </button>
          )
        })}
      </div>
    )
  }
  return null
}

const canvasOptions = {
  language,
  theme: 'dark' as const,
  background: '#0b0e14',
  gridSize: 16,
  drawGrid: {
    size: 16,
    color: 'rgba(148, 163, 184, 0.16)',
    thickness: 1,
  },
  palette: demoPalette,
  // Demo node reshapes its own panel; other nodes keep the defaults.
  nodePanel: { sections: demoPanelSections },
  nodeWidgets: {
    placement: 'bottom' as const,
    mount: createReactMount(renderDemoNodeWidgets),
  },
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
