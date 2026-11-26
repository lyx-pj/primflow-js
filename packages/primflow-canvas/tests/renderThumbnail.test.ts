// @vitest-environment jsdom
import { afterEach, expect, test, vi } from 'vitest'
import type { JsonGraph } from '@lyx-pj/primflow-model'
import { buildPreview, type PreviewResult } from '../src/preview/previewGraph'
import { renderThumbnail } from '../src/preview/renderThumbnail'
import type { CanvasGraph } from '../src/ui/types'

vi.mock('../src/preview/previewGraph', () => ({
  buildPreview: vi.fn(),
}))

const emptyGraph = { nodes: [], links: [], variables: [], subgraphs: {}, viewport: { x: 0, y: 0, zoom: 1 } } as JsonGraph

function fakeSvg(): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.classList.add('bpgraph-subgraph-preview-svg')
  return svg
}

function fakeGraph() {
  return { options: { language: 'en' } } as unknown as CanvasGraph
}

const containers: HTMLElement[] = []

afterEach(() => {
  containers.splice(0).forEach((element) => element.remove())
  vi.mocked(buildPreview).mockReset()
})

function container() {
  const element = document.createElement('div')
  document.body.appendChild(element)
  containers.push(element)
  return element
}

test('renderThumbnail mounts the built preview and reports omitted nodes', async () => {
  const result: PreviewResult = { svg: fakeSvg(), omittedNodes: 5, omittedLinks: 2 }
  vi.mocked(buildPreview).mockResolvedValue(result)
  const host = container()

  const handle = renderThumbnail(fakeGraph(), emptyGraph, host)
  await handle.ready

  expect(buildPreview).toHaveBeenCalledTimes(1)
  expect(host.getAttribute('data-preview-state')).toBe('ready')
  expect(host.querySelector('.bpgraph-subgraph-preview-svg')).not.toBeNull()
  expect(host.querySelector('.bpgraph-subgraph-omitted')?.textContent).toBe('+5')
})

test('renderThumbnail shows an empty state when the JSON has no previewable nodes', async () => {
  vi.mocked(buildPreview).mockResolvedValue(null)
  const host = container()

  const handle = renderThumbnail(fakeGraph(), emptyGraph, host)
  await handle.ready

  expect(host.getAttribute('data-preview-state')).toBe('empty')
  expect(host.querySelector('.bpgraph-subgraph-preview-empty')?.textContent).toContain('No preview')
})

test('dispose clears the host and cancels a pending mount', async () => {
  let settle: (value: PreviewResult | null) => void = () => {}
  vi.mocked(buildPreview).mockReturnValue(new Promise((resolve) => { settle = resolve }))
  const host = container()

  const handle = renderThumbnail(fakeGraph(), emptyGraph, host)
  handle.dispose()
  settle({ svg: fakeSvg(), omittedNodes: 0, omittedLinks: 0 })
  await handle.ready

  expect(host.querySelector('.bpgraph-subgraph-preview-svg')).toBeNull()
  expect(host.hasAttribute('inert')).toBe(false)
})
