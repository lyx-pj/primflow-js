// @vitest-environment jsdom
import { expect, test } from 'vitest'
import type { JsonNode } from '@lyx-pj/primflow-model'
import {
  SUBGRAPH_PREVIEW_CACHE_VERSION,
  parseCachedPreview,
  serializeCachedPreview,
  subgraphPreviewKey,
} from '../src/preview/previewCache'

function jsonNode(id: string, x = 0): JsonNode {
  return {
    id,
    definitionId: 'step',
    kind: 'default',
    position: { x, y: 0 },
    inputValues: {},
    inputs: [],
    outputs: [],
  }
}

function previewSvg(label: string): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.classList.add('bpgraph-subgraph-preview-svg')
  const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')
  text.textContent = label
  svg.appendChild(text)
  return svg
}

test('the preview key follows content and language', () => {
  const source = { nodes: [jsonNode('a')], links: [] }

  expect(subgraphPreviewKey(source, 'en')).toBe(subgraphPreviewKey({ nodes: [jsonNode('a')], links: [] }, 'en'))
  expect(subgraphPreviewKey(source, 'zh')).not.toBe(subgraphPreviewKey(source, 'en'))
  expect(subgraphPreviewKey({ nodes: [jsonNode('a', 10)], links: [] }, 'en'))
    .not.toBe(subgraphPreviewKey(source, 'en'))
})

test('a rendered preview round-trips through serialized cache data', () => {
  const payload = serializeCachedPreview({ svg: previewSvg('A'), omittedNodes: 3, omittedLinks: 1 }, 'cache-key')

  expect(payload.version).toBe(SUBGRAPH_PREVIEW_CACHE_VERSION)
  expect(payload.key).toBe('cache-key')
  expect(payload.svg).toContain('<text>A</text>')

  const parsed = parseCachedPreview(payload)
  expect(parsed?.omittedNodes).toBe(3)
  expect(parsed?.omittedLinks).toBe(1)
  expect(parsed?.svg.localName).toBe('svg')
  expect(parsed?.svg.classList.contains('bpgraph-subgraph-preview-svg')).toBe(true)
})

test('cached previews from another version or with invalid markup are rejected', () => {
  const payload = serializeCachedPreview({ svg: previewSvg('A'), omittedNodes: 0, omittedLinks: 0 }, 'key')

  expect(parseCachedPreview({ ...payload, version: 0 })).toBeNull()
  expect(parseCachedPreview({ ...payload, svg: '<div>not an svg</div>' })).toBeNull()
  expect(parseCachedPreview({ ...payload, svg: '<svg' })).toBeNull()
  expect(parseCachedPreview(null)).toBeNull()
})

test('scripts are stripped from parsed cache data', () => {
  const payload = serializeCachedPreview({ svg: previewSvg('A'), omittedNodes: 0, omittedLinks: 0 }, 'key')
  const withScript = payload.svg.replace('</svg>', '<script>alert(1)</script></svg>')

  const parsed = parseCachedPreview({ ...payload, svg: withScript })

  expect(parsed).not.toBeNull()
  expect(parsed?.svg.querySelector('script')).toBeNull()
})
