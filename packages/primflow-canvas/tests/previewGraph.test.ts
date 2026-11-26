// @vitest-environment jsdom
import './svg-shim'
import { expect, test } from 'vitest'
import type { JsonLink, JsonNode } from '@lyx-pj/primflow-model'
import { selectPreviewContent } from '../src/preview/previewGraph'

function node(id: string, x: number, y: number): JsonNode {
  return {
    id,
    definitionId: 'step',
    kind: 'default',
    position: { x, y },
    inputValues: {},
    inputs: [],
    outputs: [],
  }
}

function link(id: string, source: string, target: string): JsonLink {
  return { id, source: { id: source, port: 'out' }, target: { id: target, port: 'in' } }
}

test('preview content is selected in reading order', () => {
  const nodes = [node('c', 300, 200), node('a', 100, 0), node('b', 400, 0)]
  const selected = selectPreviewContent({ nodes, links: [] })

  expect(selected.nodes.map((item) => item.id)).toEqual(['a', 'b', 'c'])
  expect(selected.omittedNodes).toBe(0)
})

test('node and link caps keep a deterministic subset', () => {
  const nodes = [node('a', 0, 0), node('b', 100, 0), node('c', 200, 0)]
  const links = [link('ab', 'a', 'b'), link('bc', 'b', 'c'), link('ca', 'c', 'a')]
  const selected = selectPreviewContent({ nodes, links }, { maxNodes: 2, maxLinks: 1 })

  expect(selected.nodes.map((item) => item.id)).toEqual(['a', 'b'])
  // The "bc" link points at a dropped node; only "ab" remains and fits the cap.
  expect(selected.links.map((item) => item.id)).toEqual(['ab'])
  expect(selected.omittedNodes).toBe(1)
  expect(selected.omittedLinks).toBe(2)
})

test('links to omitted nodes are dropped before the link cap', () => {
  const nodes = [node('a', 0, 0), node('b', 100, 0), node('c', 200, 0)]
  const links = [link('bc', 'b', 'c'), link('ab', 'a', 'b')]
  const selected = selectPreviewContent({ nodes, links }, { maxNodes: 2, maxLinks: 4 })

  expect(selected.links.map((item) => item.id)).toEqual(['ab'])
  expect(selected.omittedNodes).toBe(1)
  // Only the dangling link is omitted; the retained link still counts as kept.
  expect(selected.omittedLinks).toBe(1)
})

test('an empty subgraph selects nothing', () => {
  const selected = selectPreviewContent({ nodes: [], links: [] })
  expect(selected.nodes).toEqual([])
  expect(selected.links).toEqual([])
})
