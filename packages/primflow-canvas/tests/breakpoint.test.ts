// @vitest-environment jsdom
import { expect, test, vi } from 'vitest'
import { defineNode, NodeInstance, NodeRegistry } from '@lyx-pj/primflow-model'
import type { Graph } from '../src/Graph'
import { deserializeNodes, serializeNodes } from '../src/utils/serializer'

const DebugNode = defineNode({
  definition: { inputs: [], outputs: [] },
})

test('breakpoints survive serialization and are absent by default in older graphs', () => {
  const nodeRegistry = new NodeRegistry().register('debug-node', DebugNode)
  const node = new NodeInstance(DebugNode, { id: 'node-1', breakpoint: true })
  const json = serializeNodes([node])
  expect(json[0].breakpoint).toBe(true)
  const graph = {
    nodeRegistry,
    createNodeInstance: (_type: string, options: ConstructorParameters<typeof NodeInstance>[1]) =>
      new NodeInstance(DebugNode, options),
  } as unknown as Graph
  expect(deserializeNodes(graph, json)[0].breakpoint).toBe(true)
  delete json[0].breakpoint
  expect(deserializeNodes(graph, json)[0].breakpoint).toBe(false)
})

test('breakpoint changes emit node updates only when the value changes', () => {
  const node = new NodeInstance(DebugNode)
  const host = { emit: vi.fn(), raiseChangedEvent: vi.fn() }
  node.setGraph(host)
  host.emit.mockClear()
  node.breakpoint = true
  node.breakpoint = true
  expect(host.emit).toHaveBeenCalledExactlyOnceWith('node:changed', node, 'breakpoint', false, true)
})
