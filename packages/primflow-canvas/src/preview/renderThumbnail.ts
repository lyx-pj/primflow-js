import type { JsonGraph } from '@lyx-pj/primflow-model'
import { translate } from '../ui/i18n'
import { ensureUiStyles } from '../ui/styles'
import type { CanvasGraph } from '../ui/types'
import { buildPreview, type PreviewResult } from './previewGraph'

export interface ThumbnailOptions {
  /** Container width applied to the thumbnail host. */
  width?: number
  /** Container height applied to the thumbnail host. */
  height?: number
  /** Maximum nodes drawn; defaults to 200. */
  maxNodes?: number
  /** Maximum links drawn; defaults to 400. */
  maxLinks?: number
  /** Asset wait before cloning custom-renderer content; defaults to 250ms. */
  waitMs?: number
}

export interface ThumbnailHandle {
  /** Resolves once the preview is mounted or replaced by the empty state. */
  readonly ready: Promise<void>
  /** Cancel a pending render and clear the container. */
  dispose(): void
}

/**
 * Render one view JSON into a caller-provided container.
 *
 * This is the canvas-level API for previews of any view, not just subgraphs.
 * It never touches the live graph, and nested subgraph calls inside the JSON
 * use generic cards (previews do not recurse).
 */
export function renderThumbnail(
  graph: CanvasGraph,
  json: JsonGraph,
  container: HTMLElement,
  options: ThumbnailOptions = {},
): ThumbnailHandle {
  let disposed = false
  let settle: () => void = () => {}
  const ready = new Promise<void>((resolve) => { settle = resolve })

  ensureUiStyles()
  container.replaceChildren()
  container.classList.add('bpgraph-standalone-preview')
  if (getComputedStyle(container).position === 'static') container.style.position = 'relative'
  container.setAttribute('data-preview-state', 'pending')
  container.setAttribute('inert', '')
  if (options.width !== undefined) container.style.width = `${options.width}px`
  if (options.height !== undefined) container.style.height = `${options.height}px`

  const showEmpty = () => {
    if (disposed) return
    container.setAttribute('data-preview-state', 'empty')
    const span = document.createElement('span')
    span.className = 'bpgraph-subgraph-preview-empty'
    span.textContent = translate('No preview', graph.options.language ?? 'en')
    container.replaceChildren(span)
  }

  const mount = (result: PreviewResult) => {
    if (disposed) return
    const svg = result.svg.cloneNode(true) as SVGSVGElement
    container.setAttribute('data-preview-state', 'ready')
    container.replaceChildren(svg)
    if (result.omittedNodes > 0) {
      const badge = document.createElement('span')
      badge.className = 'bpgraph-subgraph-omitted'
      badge.textContent = `+${result.omittedNodes}`
      badge.title = translate('Nodes hidden in this preview', graph.options.language ?? 'en', {
        count: result.omittedNodes,
      })
      container.appendChild(badge)
    }
  }

  void buildPreview(graph, { nodes: json.nodes, links: json.links }, options)
    .then((result) => {
      if (disposed) return
      if (result) mount(result)
      else showEmpty()
      settle()
    })
    .catch(() => {
      if (disposed) return
      showEmpty()
      settle()
    })

  return {
    ready,
    dispose() {
      if (disposed) return
      disposed = true
      container.replaceChildren()
      container.removeAttribute('data-preview-state')
      container.removeAttribute('inert')
      container.classList.remove('bpgraph-standalone-preview')
      if (container.style.position === 'relative') container.style.position = ''
      settle()
    },
  }
}
