import './language'
import { expect, test } from 'vitest'
import type { JsonGraph } from '@lyx-pj/workflow-model'
import { buildNodeExecutionInfo } from '../packages/workflow/scopes'

function json(): JsonGraph {
  return {
    nodes: [
      { id: 'start', nodeType: 'start', type: 'start', title: '开始', position: { x: 0, y: 0 }, values: {}, inputs: [], outputs: [] },
      { id: 'call', nodeType: 'subgraph', type: 'subgraph', title: '订单子图', subgraphId: 'child',
        position: { x: 0, y: 0 }, values: {}, inputs: [], outputs: [] },
    ],
    links: [],
    variables: [],
    subgraphs: {
      child: {
        nodes: [
          { id: 'child-start', nodeType: 'start', type: 'start', title: '子图开始', position: { x: 0, y: 0 }, values: {}, inputs: [], outputs: [] },
          { id: 'child-end', nodeType: 'end', type: 'end', title: '子图结束', position: { x: 0, y: 0 }, values: {}, inputs: [], outputs: [] },
          { id: 'child-call', nodeType: 'subgraph', type: 'subgraph', title: '退款子图', subgraphId: 'grand',
            position: { x: 0, y: 0 }, values: {}, inputs: [], outputs: [] },
        ],
        links: [],
        viewport: { x: 0, y: 0, zoom: 1 },
      },
      grand: {
        nodes: [
          { id: 'grand-step', nodeType: 'step', type: 'default', title: '退款节点', position: { x: 0, y: 0 }, values: {}, inputs: [], outputs: [] },
        ],
        links: [],
        viewport: { x: 0, y: 0, zoom: 1 },
      },
    },
    viewport: { x: 0, y: 0, zoom: 1 },
  }
}

test('主图节点没有作用域，子图调用节点标出子图角色', () => {
  const infos = buildNodeExecutionInfo(json())
  expect(infos.get('start')).toEqual({ title: '开始', nodeType: 'start', scope: undefined, kind: 'node' })
  expect(infos.get('call')).toEqual({ title: '订单子图', nodeType: 'subgraph', scope: undefined, kind: 'subgraph' })
})

test('子图节点带上作用域，入口和出口与主图区分', () => {
  const infos = buildNodeExecutionInfo(json())
  expect(infos.get('child-start')).toEqual({
    title: '子图开始',
    nodeType: 'start',
    scope: { subgraphId: 'child', title: '订单子图', depth: 1 },
    kind: 'subgraph-start',
  })
  expect(infos.get('child-end')?.kind).toBe('subgraph-end')
})

test('嵌套子图按层级累加作用域', () => {
  const infos = buildNodeExecutionInfo(json())
  expect(infos.get('child-call')).toEqual({
    title: '退款子图',
    nodeType: 'subgraph',
    scope: { subgraphId: 'child', title: '订单子图', depth: 1 },
    kind: 'subgraph',
  })
  expect(infos.get('grand-step')?.scope).toEqual({
    subgraphId: 'grand',
    title: '退款子图',
    depth: 2,
  })
})

test('没有自定义标题时标题留空，由调用方回退到节点类型的默认标题', () => {
  const info = buildNodeExecutionInfo(json())
  const graph = info.get('grand-step')
  expect(graph?.title).toBe('退款节点')
  const withoutTitle = buildNodeExecutionInfo({
    ...json(),
    nodes: [{ id: 'plain', nodeType: 'step', type: 'default', position: { x: 0, y: 0 }, values: {}, inputs: [], outputs: [] }],
  })
  expect(withoutTitle.get('plain')?.title).toBeUndefined()
})
