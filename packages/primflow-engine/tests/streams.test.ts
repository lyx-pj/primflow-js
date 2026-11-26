import { expect, it } from 'vitest'
import {
  defineDataType, defineNode, defineStreamType, NodeRegistry, schema,
  type JsonGraph, type NodeExecutionContext,
} from '@lyx-pj/primflow-model'
import { Engine } from '../src'

const Chunk = defineDataType({ id: 'demo.chunk@1', schema: schema.object({ text: schema.string() }) })
const Stream = defineStreamType({ id: 'demo.stream@1', item: Chunk })

function setup(produce: (ctx: NodeExecutionContext) => Promise<void>, consume: (ctx: NodeExecutionContext) => Promise<void>) {
  const Producer = defineNode({
    definition: { inputs: [{ name: 'exec', type: 'exec' }], outputs: [{ name: 'deltas', type: Stream }] },
    executor: produce,
  })
  const Consumer = defineNode({
    definition: { executionMode: 'stream', inputs: [{ name: 'text', type: Stream }], outputs: [] },
    executor: consume,
  })
  const registry = new NodeRegistry().registerDataType(Chunk).registerDataType(Stream)
    .register('produce', Producer).register('consume', Consumer)
  const graph: JsonGraph = {
    nodes: [
      { id: 'start', kind: 'start', definitionId: 'start', position: { x: 0, y: 0 },
        inputs: [], outputs: [{ name: 'next', id: 'out', type: 'exec' }], inputValues: {} },
      { id: 'producer', kind: 'default', definitionId: 'produce', position: { x: 0, y: 0 },
        inputs: [{ name: 'exec', id: 'exec' }], outputs: [{ name: 'deltas', id: 'deltas' }], inputValues: {} },
      { id: 'consumer', kind: 'default', definitionId: 'consume', position: { x: 0, y: 0 },
        inputs: [{ name: 'text', id: 'text' }], outputs: [], inputValues: {} },
    ],
    links: [
      { id: 'run', source: { id: 'start', port: 'out' }, target: { id: 'producer', port: 'exec' } },
      { id: 'flow', source: { id: 'producer', port: 'deltas' }, target: { id: 'consumer', port: 'text' } },
    ],
    variables: [], subgraphs: {}, viewport: { x: 0, y: 0, zoom: 1 },
  }
  return { graph, engine: new Engine(registry) }
}

it('starts the consumer before the producer finishes and waits for both', async () => {
  const seen: unknown[] = []
  let acknowledged!: () => void
  const ack = new Promise<void>(resolve => { acknowledged = resolve })
  const { engine, graph } = setup(async (ctx) => {
    const output = ctx.openStream('deltas')
    await output.write({ text: 'first' })
    await ack
    seen.push('producer finished')
    await output.write({ text: 'second' })
    output.close()
  }, async (ctx) => {
    for await (const chunk of ctx.getStream('text')) {
      seen.push(chunk)
      acknowledged()
    }
    seen.push('consumer finished')
  })
  engine.loadGraph(graph)
  await engine.start()
  expect(engine.getTask(engine.latestTaskId!)?.status).toBe('completed')
  expect(seen).toEqual([{ text: 'first' }, 'producer finished', { text: 'second' }, 'consumer finished'])
})

it('propagates invalid chunks to the consumer and fails the task', async () => {
  let readError: unknown
  const { engine, graph } = setup(async (ctx) => {
    await ctx.openStream('deltas').write({ text: 42 })
  }, async (ctx) => {
    try {
      const reader = ctx.getStream('text')[Symbol.asyncIterator]()
      await reader.next()
    } catch (error) {
      readError = error
      throw error
    }
  })
  engine.loadGraph(graph)
  await engine.start()
  expect(engine.getTask(engine.latestTaskId!)?.status).toBe('failed')
  expect(String(readError)).toMatch(/deltas.text/)
})

it('unblocks a writer when a task is cancelled under backpressure', async () => {
  let notifyBlocked!: () => void
  const blocked = new Promise<void>(resolve => { notifyBlocked = resolve })
  let notifyUnblocked!: () => void
  const unblocked = new Promise<void>(resolve => { notifyUnblocked = resolve })
  let releaseConsumer!: () => void
  const consumerWait = new Promise<void>(resolve => { releaseConsumer = resolve })
  let writes = 0
  const { engine, graph } = setup(async (ctx) => {
    const writer = ctx.openStream('deltas')
    try {
      for (let i = 0; i < 17; i++) {
        if (i === 16) notifyBlocked()
        await writer.write({ text: String(i) })
        writes++
      }
    } finally {
      notifyUnblocked()
    }
  }, async () => {
    await consumerWait
  })
  engine.loadGraph(graph)
  const task = engine.start()
  await blocked
  expect(writes).toBe(16)
  engine.stop()
  await unblocked
  releaseConsumer()
  await task
  expect(writes).toBe(16)
})

it('rejects multiple consumers for one stream output', () => {
  const { engine, graph } = setup(async () => {}, async () => {})
  graph.nodes.push({ ...graph.nodes[2]!, id: 'second-consumer' })
  graph.links.push({ ...graph.links[1]!, id: 'second-flow', target: { id: 'second-consumer', port: 'text' } })
  expect(() => engine.loadGraph(graph)).toThrow(/one producer and one consumer/)
})
