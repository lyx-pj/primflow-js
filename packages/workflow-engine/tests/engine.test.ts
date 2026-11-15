import { afterEach, expect, test, vi } from 'vitest'
import { Node, NodeRegistry, type ExecContext, type JsonGraph, type JsonNode } from '@lyx-pj/workflow-model'
import { Engine } from '../src/Engine'
import { Runtime } from '../src/Runtime'

class Step extends Node {
  static definition = {
    inputs: [{ name: 'exec', type: 'exec' }, { name: 'value', type: 'any' }] as const,
    outputs: [{ name: 'next', type: 'exec' }, { name: 'value', type: 'any' }] as const,
  }
}

const onEvent = vi.fn((event: string) => ({ trigger: event === 'ping' }))
class EventStep extends Step {
  static onEvent = onEvent
}

function node(id: string, nodeType = 'step', breakpoint = false): JsonNode {
  return {
    id, nodeType, type: nodeType === 'start' ? 'start' : 'default', breakpoint,
    position: { x: 0, y: 0 }, values: {},
    inputs: nodeType === 'start' ? [] : [
      { name: 'exec', type: 'exec', id: 'in-exec' },
      { name: 'value', type: 'any', id: 'in-value' },
    ],
    outputs: [
      { name: 'next', type: 'exec', id: 'out-exec' },
      ...(nodeType === 'start' ? [] : [{ name: 'value', type: 'any', id: 'out-value' }]),
    ],
  }
}

function link(source: string, target: string, data = false) {
  return {
    id: `${source}-${target}-${data}`,
    source: { id: source, port: data ? 'out-value' : 'out-exec' },
    target: { id: target, port: data ? 'in-value' : 'in-exec' },
  }
}

function graph(nodes: JsonNode[], links = nodes.slice(1).map((n, i) => link(nodes[i].id, n.id))): JsonGraph {
  return { nodes, links, variables: [], subgraphs: {}, viewport: { x: 0, y: 0, zoom: 1 } }
}

function setup(json: JsonGraph) {
  const registry = new NodeRegistry().register('step', Step).register('event-step', EventStep)
  const runtime = new Runtime(registry)
  const execute = vi.fn((ctx: ExecContext) => ctx.next())
  runtime.registerExecutor('step', execute).registerExecutor('event-step', execute)
  const engine = new Engine(runtime)
  engine.fromJSON(json)
  engines.push(engine)
  return { engine, runtime, execute }
}

/** Retain only stop capabilities for cleanup without invariant Engine generics across array elements. */
interface StoppableEngine {
  stop(): StoppableEngine
  whenStopped(): Promise<void>
}
const engines: StoppableEngine[] = []
afterEach(() => {
  for (const engine of engines.splice(0)) engine.stop()
  vi.clearAllMocks()
})

test('engine remains running after the first task, handles events, and ignores node events after stop', async () => {
  const { engine, execute } = setup(graph([node('start', 'start'), node('event', 'event-step'), node('tail')]))
  await engine.handleNodeEvents('ping')
  expect(onEvent).not.toHaveBeenCalled()
  await engine.process()
  expect(engine.status).toBe('running')
  expect(execute).toHaveBeenCalledTimes(2)
  engine.emit('ping')
  await vi.waitFor(() => expect(execute).toHaveBeenCalledTimes(4))
  engine.stop()
  await engine.handleNodeEvents('ping')
  expect(engine.status).toBe('stopped')
  expect(onEvent).toHaveBeenCalledTimes(1)
  expect(execute).toHaveBeenCalledTimes(4)
})

test('completed node queries expose data ports only and clear preview data on stop', async () => {
  const json = graph([node('start', 'start'), node('first'), node('second')])
  json.nodes[1].values = { value: 0 }
  json.links.push(link('first', 'second', true))
  const { engine, runtime } = setup(json)
  runtime.registerExecutor('step', ctx => {
    ctx.setOutput('value', { actual: ctx.getInput('value') })
    return ctx.next()
  })
  expect(engine.getNodeExecutionData('first')).toBeUndefined()
  await engine.process()
  expect(engine.getNodeExecutionData('first')).toEqual({ inputs: { value: 0 }, outputs: { value: { actual: 0 } } })
  expect(engine.getNodeExecutionData('second')).toEqual({
    inputs: { value: { actual: 0 } }, outputs: { value: { actual: { actual: 0 } } },
  })
  expect(engine.getNodeExecutionData('missing')).toBeUndefined()
  engine.stop()
  expect(engine.getNodeExecutionData('first')).toBeUndefined()
})

test.each([true, false])('old Start nodes discard data ports and links while preserving execution outputs (typed: %s)', async typed => {
  const start = node('start', 'start')
  start.values = { legacy: 'Old data' }
  start.inputs = [{ name: 'legacy', type: 'any', id: 'in-value' }]
  start.outputs.push({ name: 'result', type: 'any', id: 'out-value' })
  if (!typed) {
    start.inputs.forEach(port => { delete port.type })
    start.outputs.forEach(port => { delete port.type })
  }
  const step = node('step')
  step.values = { value: 'Node input' }
  const json = graph([start, step])
  json.links.push(link('start', 'step', true))
  const original = structuredClone(json)
  const { engine, runtime, execute } = setup(json)
  const loaded = runtime.fromJSON(json)
  expect(loaded.nodes[0].inputs).toEqual([])
  expect(loaded.nodes[0].outputs).toEqual([{ name: 'start', type: 'exec', id: 'out-exec' }])
  expect(loaded.nodes[0].inputValues).toEqual({})
  expect(loaded.links).toEqual([link('start', 'step')])
  await engine.process()
  expect(execute).toHaveBeenCalledTimes(1)
  expect(execute.mock.calls[0][0].getInput('value')).toBe('Node input')
  expect(engine.getNodeExecutionData('start')).toEqual({ inputs: {}, outputs: {} })
  expect(json).toEqual(original)
})

test('subgraph Start triggers execution without forwarding parent node data', async () => {
  const parent = node('sub', 'subgraph')
  parent.subgraphId = 'child'
  const json = graph([node('start', 'start'), node('producer'), parent, node('tail')])
  json.links.push(link('producer', 'sub', true))
  const childStart = node('child-start', 'start')
  childStart.outputs.push({ name: 'param', type: 'any', id: 'out-value' })
  const childStep = node('child-step')
  childStep.values = { value: 'Subgraph node input' }
  const child = graph([childStart, childStep, node('child-end', 'end')])
  child.links.push(link('child-start', 'child-step', true))
  json.subgraphs.child = { nodes: child.nodes, links: child.links, viewport: child.viewport }
  const { engine, runtime, execute } = setup(json)
  runtime.registerExecutor('step', ctx => {
    ctx.setOutput('value', 'Parent node data')
    return execute(ctx)
  })
  await engine.process()
  expect(execute).toHaveBeenCalledTimes(3)
  expect(execute.mock.calls[1][0].getInput('value')).toBe('Subgraph node input')
  expect(engine.getNodeExecutionData('child-start')).toEqual({ inputs: {}, outputs: {} })
})

test('delayed next remains valid after executor return until stop invalidates the context', async () => {
  const { engine, runtime, execute } = setup(graph([node('start', 'start'), node('delay', 'event-step'), node('tail')]))
  let saved!: ExecContext
  runtime.registerExecutor('event-step', ctx => { saved = ctx })
  await engine.process()
  expect(execute).not.toHaveBeenCalled()
  await saved.next()
  expect(execute).toHaveBeenCalledTimes(1)
  engine.stop()
  expect(saved.signal?.aborted).toBe(true)
  await saved.next()
  saved.emitEvent('ping')
  saved.setOutput('value', 'Old result')
  expect(execute).toHaveBeenCalledTimes(1)
  expect(onEvent).not.toHaveBeenCalled()
})

test('debug pauses before execution with prepared inputs and resumes downstream nodes', async () => {
  const json = graph([node('start', 'start'), node('first'), node('break', 'event-step', true), node('tail')])
  json.links.push(link('first', 'break', true))
  const { engine, runtime, execute } = setup(json)
  runtime.registerExecutor('step', ctx => { ctx.setOutput('value', 0); return execute(ctx) })
  const hit = vi.fn()
  engine.on('breakpoint:hit', hit)
  const process = engine.process({ debug: true })
  await vi.waitFor(() => expect(engine.status).toBe('paused'))
  expect(execute).toHaveBeenCalledTimes(1)
  expect(engine.pausedNode).toMatchObject({ nodeId: 'break', inputs: { value: 0 } })
  expect(engine.getNodeExecutionData('break')).toEqual({ inputs: { value: 0 }, outputs: {} })
  expect(engine.getNodeExecutionData('tail')).toBeUndefined()
  expect(hit).toHaveBeenCalledTimes(1)
  engine.resume()
  await process
  expect(execute).toHaveBeenCalledTimes(3)
  expect(engine.status).toBe('running')
  expect(engine.pausedNode).toBeNull()
  expect(engine.getNodeExecutionData('break')).toEqual({ inputs: { value: 0 }, outputs: { value: undefined } })
})

test('normal execution ignores breakpoints and requires stopping before restarting', async () => {
  const { engine, execute } = setup(graph([node('start', 'start', true), node('step', 'step', true)]))
  await engine.process()
  expect(execute).toHaveBeenCalledTimes(1)
  expect(engine.status).toBe('running')
  await expect(engine.process()).rejects.toThrow('stop the current run first')
  engine.stop()
  await engine.process()
  expect(execute).toHaveBeenCalledTimes(2)
})

test('stopping while paused releases execution and resume cannot restart the session', async () => {
  const { engine, execute } = setup(graph([node('start', 'start'), node('step', 'step', true)]))
  const process = engine.process({ debug: true })
  await vi.waitFor(() => expect(engine.status).toBe('paused'))
  engine.stop().resume()
  expect(engine.getNodeExecutionData('step')).toBeUndefined()
  await process
  expect(engine.status).toBe('stopped')
  expect(execute).not.toHaveBeenCalled()
  engine.setBreakpoint('step', false)
  await engine.process({ debug: true })
  expect(execute).toHaveBeenCalledTimes(1)
})

test('events queued while paused run after resume and can hit the same breakpoint again', async () => {
  const { engine, execute } = setup(graph([node('start', 'start'), node('event', 'event-step', true)]))
  const process = engine.process({ debug: true })
  await vi.waitFor(() => expect(engine.status).toBe('paused'))
  const event = engine.handleNodeEvents('ping')
  expect(onEvent).not.toHaveBeenCalled()
  engine.resume()
  await vi.waitFor(() => expect(onEvent).toHaveBeenCalledTimes(1))
  await vi.waitFor(() => expect(engine.status).toBe('paused'))
  engine.resume()
  await Promise.all([process, event])
  expect(execute).toHaveBeenCalledTimes(2)
})

test('parallel branches hit breakpoints sequentially without overwriting pause waiters', async () => {
  const nodes = [node('start', 'start'), node('a', 'step', true), node('b', 'step', true)]
  const { engine, execute } = setup(graph(nodes, [link('start', 'a'), link('start', 'b')]))
  const process = engine.process({ debug: true })
  await vi.waitFor(() => expect(engine.pausedNode?.nodeId).toBe('a'))
  expect(execute).not.toHaveBeenCalled()
  engine.resume()
  await vi.waitFor(() => expect(engine.pausedNode?.nodeId).toBe('b'))
  engine.resume()
  await process
  expect(execute).toHaveBeenCalledTimes(2)
})

test('old async executors cannot trigger or contaminate restarted sessions', async () => {
  const { engine, runtime, execute } = setup(graph([node('start', 'start'), node('async', 'event-step'), node('tail')]))
  let finish!: () => void
  let oldContext!: ExecContext
  runtime.registerExecutor('event-step', async ctx => {
    oldContext = ctx
    await new Promise<void>(resolve => { finish = resolve })
    ctx.setOutput('value', 'Stale result')
    ctx.emitEvent('ping')
    await ctx.next()
  })
  const oldProcess = engine.process()
  await vi.waitFor(() => expect(oldContext).toBeDefined())
  engine.stop()
  runtime.registerExecutor('event-step', ctx => ctx.next())
  await engine.process()
  finish()
  await oldProcess
  expect(execute).toHaveBeenCalledTimes(1)
  expect(onEvent).not.toHaveBeenCalled()
  expect(oldContext.signal?.aborted).toBe(true)
  expect(engine.status).toBe('running')
})

test('reloading stops the prior session and cleans up event nodes and entries', async () => {
  const { engine, runtime, execute } = setup(graph([node('old-start', 'start'), node('event', 'event-step')]))
  await engine.process()
  engine.fromJSON(graph([node('new-start', 'start'), node('new-step')]))
  expect(engine.status).toBe('stopped')
  expect(runtime.nodeListeners.size).toBe(0)
  await engine.process()
  await engine.handleNodeEvents('ping')
  expect(execute).toHaveBeenCalledTimes(2)
  expect(onEvent).not.toHaveBeenCalled()
})

test('subgraph breakpoints pause execution and return to the parent after resume', async () => {
  const parent = node('sub', 'subgraph')
  parent.subgraphId = 'child'
  const json = graph([node('start', 'start'), parent, node('tail')])
  const child = graph([node('child-start', 'start'), node('child-step', 'step', true), node('child-end', 'end')])
  json.subgraphs.child = { nodes: child.nodes, links: child.links, viewport: child.viewport }
  const { engine, execute } = setup(json)
  const process = engine.process({ debug: true })
  await vi.waitFor(() => expect(engine.status).toBe('paused'))
  expect(engine.pausedNode).toMatchObject({ nodeId: 'child-step', subgraphId: 'child' })
  expect(engine.getNodeExecutionData('child-step')).toEqual({ inputs: {}, outputs: {} })
  expect(execute).not.toHaveBeenCalled()
  engine.resume()
  await process
  expect(execute).toHaveBeenCalledTimes(2)
})

test('initial completion retains node markers; explicit stop clears all statuses', async () => {
  const { engine, runtime } = setup(graph([node('start', 'start'), node('async', 'event-step'), node('tail'), node('unused')],
    [link('start', 'async'), link('async', 'tail')]))
  let finish!: () => void
  runtime.registerExecutor('event-step', async ctx => {
    await new Promise<void>(resolve => { finish = resolve })
    ctx.next()
  })
  const changed = vi.fn()
  engine.on('node:status:changed', changed)
  const process = engine.process()
  await vi.waitFor(() => expect(engine.getNodeStatus('async')).toBe('running'))
  expect(engine.getNodeStatus('start')).toBe('completed')
  expect(engine.getNodeStatus('tail')).toBe('pending')
  finish()
  await process
  expect(engine.getNodeStatus('async')).toBe('completed')
  expect(engine.getNodeStatus('tail')).toBe('completed')
  expect(engine.getNodeStatus('unused')).toBe('idle')
  expect(changed.mock.calls.filter(([id]) => id === 'async').map(([, status]) => status))
    .toEqual(['pending', 'running', 'completed'])
  engine.stop()
  expect(engine.getNodeStatus('async')).toBe('idle')
  expect(engine.getNodeStatus('start')).toBe('idle')
  expect(engine.getNodeStatus('tail')).toBe('idle')
  expect(engine.getNodeStatuses().size).toBe(0)
})

test('breakpoint nodes remain pending; stop resets visuals and restart clears prior markers', async () => {
  const { engine } = setup(graph([node('start', 'start'), node('break', 'step', true)]))
  const process = engine.process({ debug: true })
  await vi.waitFor(() => expect(engine.status).toBe('paused'))
  expect(engine.getNodeStatus('break')).toBe('pending')
  engine.stop()
  await process
  expect(engine.getNodeStatus('break')).toBe('idle')
  expect(engine.getNodeStatus('start')).toBe('idle')
  expect(engine.getNodeStatuses().size).toBe(0)
  engine.setBreakpoint('start', true)
  const restart = engine.process({ debug: true })
  await vi.waitFor(() => expect(engine.status).toBe('paused'))
  expect(engine.getNodeStatus('start')).toBe('pending')
  expect(engine.getNodeStatus('break')).toBe('pending')
  engine.stop()
  await restart
})

test('one concurrent task completing does not mark a still-running node completed', async () => {
  const { engine, runtime } = setup(graph([node('start', 'start'), node('event', 'event-step')]))
  const finishes: (() => void)[] = []
  runtime.registerExecutor('event-step', () => new Promise<void>(resolve => { finishes.push(resolve) }))
  const first = engine.process()
  await vi.waitFor(() => expect(finishes).toHaveLength(1))
  const second = engine.handleNodeEvents('ping')
  await vi.waitFor(() => expect(finishes).toHaveLength(2))
  finishes[0]()
  await first
  expect(engine.getNodeStatus('event')).toBe('running')
  finishes[1]()
  await second
  expect(engine.getNodeStatus('event')).toBe('completed')
})

test('nodes stay pending until required data arrives and execution completes', async () => {
  const json = graph([node('start', 'start'), node('consumer'), node('producer', 'event-step')],
    [link('start', 'consumer'), link('start', 'producer'), link('producer', 'consumer', true)])
  const { engine, runtime } = setup(json)
  let finish!: () => void
  runtime.registerExecutor('event-step', async ctx => {
    await new Promise<void>(resolve => { finish = resolve })
    ctx.setOutput('value', 0)
    await ctx.next()
  })
  const process = engine.process()
  await vi.waitFor(() => expect(engine.getNodeStatus('producer')).toBe('running'))
  expect(engine.getNodeStatus('consumer')).toBe('pending')
  finish()
  await process
  expect(engine.getNodeStatus('consumer')).toBe('completed')
})

test.each(['return', 'await'] as const)('%s next completes the upstream node at handoff without waiting for the final node', async mode => {
  const { engine, runtime } = setup(graph([node('start', 'start'), node('middle'), node('last', 'event-step')]))
  runtime.registerExecutor('step', mode === 'return' ? ctx => ctx.next() : async ctx => { await ctx.next() })
  let finish!: () => void
  runtime.registerExecutor('event-step', () => new Promise<void>(resolve => { finish = resolve }))
  const process = engine.process()
  await vi.waitFor(() => expect(engine.getNodeStatus('last')).toBe('running'))
  expect(engine.getNodeStatus('start')).toBe('completed')
  expect(engine.getNodeStatus('middle')).toBe('completed')
  finish()
  await process
  expect(engine.getNodeStatus('last')).toBe('completed')
})

test('upstream nodes stay completed while the final node pauses at a breakpoint', async () => {
  const { engine } = setup(graph([node('start', 'start'), node('middle'), node('last', 'step', true)]))
  const process = engine.process({ debug: true })
  await vi.waitFor(() => expect(engine.status).toBe('paused'))
  expect(engine.getNodeStatus('middle')).toBe('completed')
  expect(engine.getNodeStatus('last')).toBe('pending')
  engine.resume()
  await process
})

test('subgraph calls complete before the final parent node finishes', async () => {
  const parent = node('sub', 'subgraph')
  parent.subgraphId = 'child'
  const json = graph([node('start', 'start'), parent, node('last', 'event-step')])
  const child = graph([node('child-start', 'start'), node('child-step'), node('child-end', 'end')])
  json.subgraphs.child = { nodes: child.nodes, links: child.links, viewport: child.viewport }
  const { engine, runtime } = setup(json)
  let finish!: () => void
  runtime.registerExecutor('event-step', () => new Promise<void>(resolve => { finish = resolve }))
  const process = engine.process()
  await vi.waitFor(() => expect(engine.getNodeStatus('last')).toBe('running'))
  expect(engine.getNodeStatus('sub')).toBe('completed')
  expect(engine.getNodeStatus('child-step')).toBe('completed')
  expect(engine.getNodeExecutionData('child-step')).toEqual({
    inputs: { value: undefined }, outputs: { value: undefined },
  })
  finish()
  await process
})

test('reachable nodes stay pending after breakpoints while unreachable nodes stay idle', async () => {
  const json = graph([
    node('start', 'start'), node('first'), node('break', 'step', true), node('last'), node('outside'),
  ], [link('start', 'first'), link('first', 'break'), link('break', 'last')])
  const { engine } = setup(json)
  const process = engine.process({ debug: true })
  await vi.waitFor(() => expect(engine.status).toBe('paused'))
  expect(engine.getNodeStatus('first')).toBe('completed')
  expect(engine.getNodeStatus('break')).toBe('pending')
  expect(engine.getNodeStatus('last')).toBe('pending')
  expect(engine.getNodeStatus('outside')).toBe('idle')
  engine.resume()
  await process
  expect(engine.getNodeStatus('last')).toBe('completed')
  engine.stop()
  expect(engine.getNodeStatuses().size).toBe(0)
})

/** Subgraph call inputs pass parameters; outputs hold returned values. */
function subgraphCall(id: string, subgraphId: string, input = 'param', output = 'result'): JsonNode {
  return {
    id, nodeType: 'subgraph', type: 'subgraph', position: { x: 0, y: 0 }, values: {},
    subgraphId,
    inputs: [{ name: 'exec', type: 'exec', id: 'in-exec' }, { name: input, type: 'any', id: 'in-param' }],
    outputs: [{ name: 'exec', type: 'exec', id: 'out-exec' }, { name: output, type: 'any', id: 'out-result' }],
  }
}

/** Subgraph entries receive parent parameters and expose matching outputs. */
function subgraphEntry(id: string, param = 'param'): JsonNode {
  return {
    id, nodeType: 'start', type: 'start', position: { x: 0, y: 0 }, values: {},
    inputs: [{ name: param, type: 'any', id: 'in-param' }],
    outputs: [{ name: 'start', type: 'exec', id: 'out-start' }, { name: param, type: 'any', id: 'out-param' }],
  }
}

/** Subgraph exits receive values to return to the parent. */
function subgraphExit(id: string, result = 'result'): JsonNode {
  return {
    id, nodeType: 'end', type: 'end', position: { x: 0, y: 0 }, values: {},
    inputs: [{ name: 'exec', type: 'exec', id: 'in-exec' }, { name: result, type: 'any', id: 'in-result' }],
    outputs: [],
  }
}

function subgraphGraph(entry: JsonNode, step: JsonNode, exit: JsonNode): JsonGraph['subgraphs'][string] {
  return {
    nodes: [entry, step, exit],
    links: [
      { id: 'c-exec', source: { id: entry.id, port: 'out-start' }, target: { id: step.id, port: 'in-exec' } },
      { id: 'c-param', source: { id: entry.id, port: 'out-param' }, target: { id: step.id, port: 'in-value' } },
      { id: 'c-next', source: { id: step.id, port: 'out-exec' }, target: { id: exit.id, port: 'in-exec' } },
      { id: 'c-result', source: { id: step.id, port: 'out-value' }, target: { id: exit.id, port: 'in-result' } },
    ],
    viewport: { x: 0, y: 0, zoom: 1 },
  }
}

test('subgraph entries receive parameters and exits write parent call outputs', async () => {
  const producer = node('producer')
  producer.values = { value: 'Parent parameter' }
  const parent = subgraphCall('sub', 'child')
  const json = graph([node('start', 'start'), producer, parent, node('tail')], [
    link('start', 'producer'),
    link('producer', 'sub'),
    { id: 'param', source: { id: 'producer', port: 'out-value' }, target: { id: 'sub', port: 'in-param' } },
    link('sub', 'tail'),
    { id: 'result', source: { id: 'sub', port: 'out-result' }, target: { id: 'tail', port: 'in-value' } },
  ])
  json.subgraphs.child = subgraphGraph(subgraphEntry('child-start'), node('child-step'), subgraphExit('child-end'))
  const { engine, runtime, execute } = setup(json)
  runtime.registerExecutor('step', ctx => {
    ctx.setOutput('value', ctx.getInput('value'))
    return execute(ctx)
  })
  await engine.process()
  // Internal nodes receive parameters from the parent call node.
  expect(engine.getNodeExecutionData('child-step')).toEqual({
    inputs: { value: 'Parent parameter' }, outputs: { value: 'Parent parameter' },
  })
  // After subgraph completion, exit parameters populate the parent call outputs.
  expect(engine.getNodeExecutionData('sub')).toEqual({
    inputs: { param: 'Parent parameter' }, outputs: { result: 'Parent parameter' },
  })
  expect(engine.getNodeExecutionData('tail')).toEqual({
    inputs: { value: 'Parent parameter' }, outputs: { value: 'Parent parameter' },
  })
})

test('single unmatched data ports pair by position when names differ', async () => {
  const producer = node('producer')
  producer.values = { value: 'Parent parameter' }
  const parent = subgraphCall('sub', 'child', 'param', 'output')
  const json = graph([node('start', 'start'), producer, parent], [
    link('start', 'producer'),
    link('producer', 'sub'),
    { id: 'param', source: { id: 'producer', port: 'out-value' }, target: { id: 'sub', port: 'in-param' } },
  ])
  // The exit's value and the parent's output pair because each side has one data port.
  json.subgraphs.child = subgraphGraph(subgraphEntry('child-start'), node('child-step'), subgraphExit('child-end', 'value'))
  const { engine, runtime, execute } = setup(json)
  runtime.registerExecutor('step', ctx => {
    ctx.setOutput('value', ctx.getInput('value'))
    return execute(ctx)
  })
  await engine.process()
  expect(engine.getNodeExecutionData('sub')).toEqual({
    inputs: { param: 'Parent parameter' }, outputs: { output: 'Parent parameter' },
  })
})
