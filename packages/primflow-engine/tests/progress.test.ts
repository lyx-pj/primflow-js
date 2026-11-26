import { expect, it } from 'vitest'
import { defineNode, NodeRegistry, type JsonGraph, type NodeExecutionContext } from '@lyx-pj/primflow-model'
import { Engine } from '../src'

it('publishes live progress without a trace and ignores writes after cancellation', async () => {
  let release!: () => void
  const wait = new Promise<void>(resolve => { release = resolve })
  let context!: NodeExecutionContext
  let started!: () => void
  const ready = new Promise<void>(resolve => { started = resolve })
  const node = defineNode({
    definition: { inputs: [{ name: 'exec', type: 'exec' }], outputs: [] },
    async executor(ctx) {
      context = ctx
      started()
      ctx.emitProgress('text', 'Hello')
      ctx.emitProgress('text', ' world')
      await wait
    },
  })
  const graph: JsonGraph = {
    nodes: [
      { id: 'start', kind: 'start', definitionId: 'start', position: { x: 0, y: 0 },
        inputs: [], outputs: [{ name: 'next', id: 'out', type: 'exec' }], inputValues: {} },
      { id: 'generate', kind: 'default', definitionId: 'generate', position: { x: 0, y: 0 },
        inputs: [{ name: 'exec', id: 'in', type: 'exec' }], outputs: [], inputValues: {} },
    ],
    links: [{ id: 'run', source: { id: 'start', port: 'out' }, target: { id: 'generate', port: 'in' } }],
    variables: [], subgraphs: {}, viewport: { x: 0, y: 0, zoom: 1 },
  }
  const engine = new Engine(new NodeRegistry().register('generate', node), { trace: false })
  const seen: unknown[] = []
  engine.on('task:node:progress', (_taskId, event) => seen.push(event))
  engine.loadGraph(graph)
  const task = engine.start()
  await ready
  expect(seen).toEqual([
    expect.objectContaining({ nodeId: 'generate', executionId: expect.any(Number), sequence: 1, value: 'Hello' }),
    expect.objectContaining({ nodeId: 'generate', executionId: expect.any(Number), sequence: 2, value: ' world' }),
  ])
  engine.stop()
  context.emitProgress('text', 'late')
  expect(seen).toHaveLength(2)
  release()
  await task
})
