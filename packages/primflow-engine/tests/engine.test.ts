import { afterEach, expect, test, vi } from 'vitest'
import { defineNode, NodeRegistry, type NodeExecutionContext, type JsonGraph, type JsonNode } from '@lyx-pj/primflow-model'
import { Engine } from '../src/Engine'
import { loadGraphNodes } from '../src/GraphLoader'
import { defineService } from '../src'

const Step = defineNode({
  definition: {
    inputs: [{ name: 'exec', type: 'exec' }, { name: 'value', type: 'any' }] as const,
    outputs: [{ name: 'next', type: 'exec' }, { name: 'value', type: 'any' }] as const,
  },
})

const onEvent = vi.fn((event: string) => ({ trigger: event === 'ping' }))
const EventStep = defineNode({
  ...Step,
  definition: Step.definition,
  onEvent: onEvent,
})

function node(id: string, nodeType = 'step', breakpoint = false): JsonNode {
  return {
    id, definitionId: nodeType, kind: nodeType === 'start' ? 'start' : 'default', breakpoint,
    position: { x: 0, y: 0 }, inputValues: {},
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

test('registered definitions have a stable ID independent of their display name and kind', () => {
  const NamedStep = defineNode({
    ...Step,
    definition: { ...Step.definition, name: 'Read Input', kind: 'default' },
  })
  const registry = new NodeRegistry().register('example.read', NamedStep)
  expect(registry.getDefinition('example.read')).toMatchObject({
    id: 'example.read', name: 'Read Input', kind: 'default',
  })
  expect(registry.register('example.read', NamedStep)).toBe(registry)
  expect(() => registry.register('example.read', Step)).toThrow(/already registered/i)
  expect(() => registry.register('example.alias', NamedStep)).toThrow(/already registered/i)
  expect(registry.isRegistered('example.alias' as never)).toBe(false)
})

test('loading a graph separates node ownership from the called graph', () => {
  const registry = new NodeRegistry().register('step', Step)
  const parent = { ...node('parent-call', 'subgraph'), definitionId: 'subgraph', kind: 'subgraph', targetGraphId: 'child' }
  const step = node('inside')
  const newCall = { ...node('new-call', 'subgraph'), definitionId: 'subgraph', kind: 'subgraph', targetGraphId: 'leaf' }
  const json = graph([parent], [])
  json.subgraphs.child = { nodes: [step, newCall], links: [], viewport: json.viewport }
  json.subgraphs.leaf = { nodes: [], links: [], viewport: json.viewport }
  const { nodesById } = loadGraphNodes(registry, json)
  expect(nodesById.get('parent-call')).toMatchObject({ definitionId: 'subgraph', targetGraphId: 'child' })
  expect(nodesById.get('inside')).toMatchObject({ definitionId: 'step', kind: 'default', graphId: 'child' })
  expect(nodesById.get('inside')?.targetGraphId).toBeUndefined()
  expect(nodesById.get('new-call')).toMatchObject({ graphId: 'child', targetGraphId: 'leaf' })
})

test('loading a graph rejects a node with only a legacy type key', () => {
  const legacyNode = { ...node('old'), nodeType: 'step', definitionId: undefined } as unknown as JsonNode
  const registry = new NodeRegistry().register('step', Step)
  expect(() => loadGraphNodes(registry, graph([legacyNode], []))).toThrow('Node "old" has no definition ID.')
})

test('executes links from output to input regardless of the spelling of port IDs', async () => {
  const start = node('group:start', 'start')
  start.outputs[0].id = 'in-go:now'
  const step = node('step')
  step.inputs[0].id = 'out-receive'
  const connection = {
    id: 'arbitrary-ids',
    source: { id: start.id, port: 'in-go:now' },
    target: { id: step.id, port: 'out-receive' },
  }
  const { engine, execute } = setup(graph([start, step], [connection]))
  await engine.start()
  expect(execute).toHaveBeenCalledTimes(1)
  expect(() => engine.loadGraph(graph([start, step], [
    { ...connection, source: connection.target, target: connection.source },
  ]))).toThrow(/output to an input/)
})

test.each([false, 0, '', null])('passes node configuration data %j to the executor', async (data) => {
  const start = node('start', 'start')
  const step = node('step')
  step.data = data
  const { engine, execute } = setup(graph([start, step]))
  await engine.start()
  expect(execute).toHaveBeenCalledWith(expect.objectContaining({ data }))
})

function setup(json: JsonGraph) {
  const registry = new NodeRegistry().register('step', Step).register('event-step', EventStep)
  const engine = new Engine(registry)
  const execute = vi.fn((ctx: NodeExecutionContext) => ctx.next())
  engine.registerExecutor({ name: 'step', execute: execute }).registerExecutor({ name: 'event-step', execute: execute })
  engine.loadGraph(json)
  engines.push(engine)
  return { engine, execute, registry }
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

test('engines sharing node definitions load and stop their own graphs and use their own services', async () => {
  const registry = new NodeRegistry().register('step', Step)
  const firstService = { label: () => 'first' }
  const secondService = { label: () => 'second' }
  const first = new Engine(registry, { services: [defineService('source', { value: firstService })] })
  const second = new Engine(registry, { services: [defineService('source', { value: secondService })] })
  engines.push(first, second)
  for (const [engine, service] of [[first, firstService], [second, secondService]] as const) {
    engine.registerExecutor({ name: 'step', execute: (ctx) => {
      expect(ctx.services.get('source')).toBe(service)
      ctx.setOutput('value', [ctx.getInput('value'), service.label()])
      return ctx.next()
    } })
  }

  const firstGraph = graph([node('start', 'start'), node('step')])
  firstGraph.nodes[1].inputValues = { value: 'A' }
  const secondGraph = structuredClone(firstGraph)
  secondGraph.nodes[1].inputValues = { value: 'B' }
  first.loadGraph(firstGraph)
  second.loadGraph(secondGraph)
  await first.start()
  await second.start()
  expect(first.getNodeExecutionData('step')?.outputs.value).toEqual(['A', 'first'])
  expect(second.getNodeExecutionData('step')?.outputs.value).toEqual(['B', 'second'])
  await first.stop().whenStopped()
  expect(second.status).toBe('running')
  expect(second.getNodeExecutionData('step')?.outputs.value).toEqual(['B', 'second'])
})

test('independent node registries keep their custom registrations separate', () => {
  const PrivateStep = defineNode({
    ...Step,
    definition: Step.definition,
  })
  const first = new NodeRegistry().register('private-step', PrivateStep)
  const second = new NodeRegistry()
  expect(first.isRegistered(PrivateStep)).toBe(true)
  expect(second.isRegistered(PrivateStep)).toBe(false)
})

test('engine remains running after the first task, handles events, and ignores node events after stop', async () => {
  const { engine, execute } = setup(graph([node('start', 'start'), node('event', 'event-step'), node('tail')]))
  await engine.dispatchEvent('ping')
  expect(onEvent).not.toHaveBeenCalled()
  await engine.start()
  expect(engine.status).toBe('running')
  expect(execute).toHaveBeenCalledTimes(2)
  await engine.dispatchEvent('ping')
  expect(execute).toHaveBeenCalledTimes(4)
  engine.stop()
  await engine.dispatchEvent('ping')
  expect(engine.status).toBe('stopped')
  expect(onEvent).toHaveBeenCalledTimes(1)
  expect(execute).toHaveBeenCalledTimes(4)
})

test('completed node queries expose data ports only and clear preview data on stop', async () => {
  const json = graph([node('start', 'start'), node('first'), node('second')])
  json.nodes[1].inputValues = { value: 0 }
  json.links.push(link('first', 'second', true))
  const { engine } = setup(json)
  engine.registerExecutor({ name: 'step', execute: ctx => {
    ctx.setOutput('value', { actual: ctx.getInput('value') })
    return ctx.next()
  } })
  expect(engine.getNodeExecutionData('first')).toBeUndefined()
  await engine.start()
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
  start.inputValues = { legacy: 'Old data' }
  start.inputs = [{ name: 'legacy', type: 'any', id: 'in-value' }]
  start.outputs.push({ name: 'result', type: 'any', id: 'out-value' })
  if (!typed) {
    start.inputs.forEach(port => { delete port.type })
    start.outputs.forEach(port => { delete port.type })
  }
  const step = node('step')
  step.inputValues = { value: 'Node input' }
  const json = graph([start, step])
  json.links.push(link('start', 'step', true))
  const original = structuredClone(json)
  const { engine, execute, registry } = setup(json)
  const loaded = loadGraphNodes(registry, json)
  expect(loaded.nodes[0].inputs).toEqual([])
  expect(loaded.nodes[0].outputs).toEqual([{ name: 'start', type: 'exec', id: 'out-exec' }])
  expect(loaded.nodes[0].inputValues).toEqual({})
  expect(loaded.links).toEqual([link('start', 'step')])
  await engine.start()
  expect(execute).toHaveBeenCalledTimes(1)
  expect(execute.mock.calls[0][0].getInput('value')).toBe('Node input')
  expect(engine.getNodeExecutionData('start')).toEqual({ inputs: {}, outputs: {} })
  expect(json).toEqual(original)
})

test('subgraph Start triggers execution without forwarding parent node data', async () => {
  const parent = node('sub', 'subgraph')
  parent.targetGraphId = 'child'
  const json = graph([node('start', 'start'), node('producer'), parent, node('tail')])
  json.links.push(link('producer', 'sub', true))
  const childStart = node('child-start', 'start')
  childStart.outputs.push({ name: 'param', type: 'any', id: 'out-value' })
  const childStep = node('child-step')
  childStep.inputValues = { value: 'Subgraph node input' }
  const child = graph([childStart, childStep, node('child-end', 'end')])
  child.links.push(link('child-start', 'child-step', true))
  json.subgraphs.child = { nodes: child.nodes, links: child.links, viewport: child.viewport }
  const { engine, execute } = setup(json)
  engine.registerExecutor({ name: 'step', execute: ctx => {
    ctx.setOutput('value', 'Parent node data')
    return execute(ctx)
  } })
  await engine.start()
  expect(execute).toHaveBeenCalledTimes(3)
  expect(execute.mock.calls[1][0].getInput('value')).toBe('Subgraph node input')
  expect(engine.getNodeExecutionData('child-start')).toEqual({ inputs: {}, outputs: {} })
})

test('delayed next remains valid after executor return until stop invalidates the context', async () => {
  const { engine, execute } = setup(graph([node('start', 'start'), node('delay', 'event-step'), node('tail')]))
  let saved!: NodeExecutionContext
  engine.registerExecutor({ name: 'event-step', execute: ctx => { saved = ctx } })
  await engine.start()
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
  const { engine, execute } = setup(json)
  engine.registerExecutor({ name: 'step', execute: ctx => { ctx.setOutput('value', 0); return execute(ctx) } })
  const hit = vi.fn()
  engine.on('breakpoint:hit', hit)
  const process = engine.start({ debug: true })
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
  await engine.start()
  expect(execute).toHaveBeenCalledTimes(1)
  expect(engine.status).toBe('running')
  await expect(engine.start()).rejects.toThrow('stop the current run first')
  engine.stop()
  await engine.start()
  expect(execute).toHaveBeenCalledTimes(2)
})

test('stopping while paused releases execution and resume cannot restart the session', async () => {
  const { engine, execute } = setup(graph([node('start', 'start'), node('step', 'step', true)]))
  const process = engine.start({ debug: true })
  await vi.waitFor(() => expect(engine.status).toBe('paused'))
  engine.stop().resume()
  expect(engine.getNodeExecutionData('step')).toBeUndefined()
  await process
  expect(engine.status).toBe('stopped')
  expect(execute).not.toHaveBeenCalled()
  engine.setBreakpoint('step', false)
  await engine.start({ debug: true })
  expect(execute).toHaveBeenCalledTimes(1)
})

test('events queued while paused run after resume and can hit the same breakpoint again', async () => {
  const { engine, execute } = setup(graph([node('start', 'start'), node('event', 'event-step', true)]))
  const process = engine.start({ debug: true })
  await vi.waitFor(() => expect(engine.status).toBe('paused'))
  const event = engine.dispatchEvent('ping')
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
  const process = engine.start({ debug: true })
  await vi.waitFor(() => expect(engine.pausedNode?.nodeId).toBe('a'))
  expect(execute).not.toHaveBeenCalled()
  engine.resume()
  await vi.waitFor(() => expect(engine.pausedNode?.nodeId).toBe('b'))
  engine.resume()
  await process
  expect(execute).toHaveBeenCalledTimes(2)
})

test('old async executors cannot trigger or contaminate restarted sessions', async () => {
  const { engine, execute } = setup(graph([node('start', 'start'), node('async', 'event-step'), node('tail')]))
  let finish!: () => void
  let oldContext!: NodeExecutionContext
  engine.registerExecutor({ name: 'event-step', execute: async ctx => {
    oldContext = ctx
    await new Promise<void>(resolve => { finish = resolve })
    ctx.setOutput('value', 'Stale result')
    ctx.emitEvent('ping')
    await ctx.next()
  } })
  const oldProcess = engine.start()
  await vi.waitFor(() => expect(oldContext).toBeDefined())
  engine.stop()
  engine.registerExecutor({ name: 'event-step', execute: ctx => ctx.next() })
  await engine.start()
  finish()
  await oldProcess
  expect(execute).toHaveBeenCalledTimes(1)
  expect(onEvent).not.toHaveBeenCalled()
  expect(oldContext.signal?.aborted).toBe(true)
  expect(engine.status).toBe('running')
})

test('reloading stops the prior session and cleans up event nodes and entries', async () => {
  const { engine, execute } = setup(graph([node('old-start', 'start'), node('event', 'event-step')]))
  await engine.start()
  engine.loadGraph(graph([node('new-start', 'start'), node('new-step')]))
  expect(engine.status).toBe('stopped')
  await engine.start()
  await engine.dispatchEvent('ping')
  expect(execute).toHaveBeenCalledTimes(2)
  expect(onEvent).not.toHaveBeenCalled()
})

test('subgraph breakpoints pause execution and return to the parent after resume', async () => {
  const parent = node('sub', 'subgraph')
  parent.targetGraphId = 'child'
  const json = graph([node('start', 'start'), parent, node('tail')])
  const child = graph([node('child-start', 'start'), node('child-step', 'step', true), node('child-end', 'end')])
  json.subgraphs.child = { nodes: child.nodes, links: child.links, viewport: child.viewport }
  const { engine, execute } = setup(json)
  const process = engine.start({ debug: true })
  await vi.waitFor(() => expect(engine.status).toBe('paused'))
  expect(engine.pausedNode).toMatchObject({ nodeId: 'child-step', subgraphId: 'child' })
  expect(engine.getNodeExecutionData('child-step')).toEqual({ inputs: {}, outputs: {} })
  expect(execute).not.toHaveBeenCalled()
  engine.resume()
  await process
  expect(execute).toHaveBeenCalledTimes(2)
})

test('initial completion retains node markers; explicit stop clears all statuses', async () => {
  const { engine } = setup(graph([node('start', 'start'), node('async', 'event-step'), node('tail'), node('unused')],
    [link('start', 'async'), link('async', 'tail')]))
  let finish!: () => void
  engine.registerExecutor({ name: 'event-step', execute: async ctx => {
    await new Promise<void>(resolve => { finish = resolve })
    ctx.next()
  } })
  const changed = vi.fn()
  engine.on('node:status:changed', changed)
  const process = engine.start()
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
  const process = engine.start({ debug: true })
  await vi.waitFor(() => expect(engine.status).toBe('paused'))
  expect(engine.getNodeStatus('break')).toBe('pending')
  engine.stop()
  await process
  expect(engine.getNodeStatus('break')).toBe('idle')
  expect(engine.getNodeStatus('start')).toBe('idle')
  expect(engine.getNodeStatuses().size).toBe(0)
  engine.setBreakpoint('start', true)
  const restart = engine.start({ debug: true })
  await vi.waitFor(() => expect(engine.status).toBe('paused'))
  expect(engine.getNodeStatus('start')).toBe('pending')
  expect(engine.getNodeStatus('break')).toBe('pending')
  engine.stop()
  await restart
})

test('one concurrent task completing does not mark a still-running node completed', async () => {
  const { engine } = setup(graph([node('start', 'start'), node('event', 'event-step')]))
  const finishes: (() => void)[] = []
  engine.registerExecutor({ name: 'event-step', execute: () => new Promise<void>(resolve => { finishes.push(resolve) }) })
  const first = engine.start()
  await vi.waitFor(() => expect(finishes).toHaveLength(1))
  const second = engine.dispatchEvent('ping')
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
  const { engine } = setup(json)
  let finish!: () => void
  engine.registerExecutor({ name: 'event-step', execute: async ctx => {
    await new Promise<void>(resolve => { finish = resolve })
    ctx.setOutput('value', 0)
    await ctx.next()
  } })
  const process = engine.start()
  await vi.waitFor(() => expect(engine.getNodeStatus('producer')).toBe('running'))
  expect(engine.getNodeStatus('consumer')).toBe('pending')
  finish()
  await process
  expect(engine.getNodeStatus('consumer')).toBe('completed')
})

test('each branch reads its own connected output without waiting for another candidate', async () => {
  const b = node('b')
  const c = node('c', 'event-step')
  b.data = 'B'
  c.inputValues.value = 'C'
  const json = graph([node('start', 'start'), b, c, node('e')], [
    link('start', 'b'), link('start', 'c'), link('b', 'e'), link('c', 'e'),
    link('b', 'e', true), link('c', 'e', true),
  ])
  const { engine } = setup(json)
  const seen: unknown[] = []
  let finish!: () => void
  engine.registerExecutor({ name: 'step', execute: (ctx) => {
    if (ctx.data === 'B') {
      ctx.setOutput('value', ctx.data)
      return ctx.next()
    }
    seen.push(ctx.getInput('value'))
  } })
  engine.registerExecutor({ name: 'event-step', execute: async (ctx) => {
    await new Promise<void>((resolve) => { finish = resolve })
    ctx.setOutput('value', ctx.getInput('value'))
    await ctx.next()
  } })
  const running = engine.start()
  try {
    await vi.waitFor(() => expect(seen).toEqual(['B']))
  } finally {
    finish?.()
    await running
  }
  expect(seen).toEqual(['B', 'C'])
})

test('the nearest source on the execution path wins even when its link appears first', async () => {
  const a = node('a')
  const b = node('b', 'event-step')
  a.data = 'A'
  b.data = 'B'
  const json = graph([node('start', 'start'), a, b, node('e')], [
    link('start', 'a'), link('a', 'b'), link('b', 'e'), link('b', 'e', true), link('a', 'e', true),
  ])
  const { engine } = setup(json)
  const seen = vi.fn()
  const execute = (ctx: NodeExecutionContext) => {
    if (!ctx.data) return seen(ctx.getInput('value'))
    ctx.setOutput('value', ctx.data)
    return ctx.next()
  }
  engine.registerExecutor({ name: 'step', execute: execute }).registerExecutor({ name: 'event-step', execute: execute })
  await engine.start()
  expect(seen).toHaveBeenCalledExactlyOnceWith('B')
})

test('an unselected branch is skipped without skipping a merge or losing delayed handoffs', async () => {
  const choice = node('choice', 'event-step')
  choice.outputs.push({ name: 'alternate', type: 'exec', id: 'out-alternate' })
  const alternateLink = link('choice', 'alternate')
  alternateLink.source.port = 'out-alternate'
  const { engine, execute } = setup(graph(
    [node('start', 'start'), choice, node('selected'), node('alternate'), node('alternate-tail'), node('merge')],
    [link('start', 'choice'), link('choice', 'selected'), alternateLink, link('selected', 'merge'),
      link('alternate', 'alternate-tail'), link('alternate-tail', 'merge')],
  ))
  const changed = vi.fn()
  engine.on('node:status:changed', changed)
  let chooseAgain!: NodeExecutionContext['next']
  engine.registerExecutor({ name: 'event-step', execute: (ctx) => {
    chooseAgain = ctx.next
    return ctx.next(['next'])
  } })
  await engine.start()
  expect(engine.getNodeStatus('alternate')).toBe('skipped')
  expect(engine.getNodeStatus('alternate-tail')).toBe('skipped')
  expect(engine.getNodeStatus('merge')).toBe('completed')
  expect(changed).not.toHaveBeenCalledWith('merge', 'skipped')
  expect(execute).toHaveBeenCalledTimes(2)
  await chooseAgain(['alternate'])
  expect(engine.getNodeStatus('alternate')).toBe('completed')
  expect(engine.getNodeStatus('alternate-tail')).toBe('completed')
  expect(engine.getNodeStatus('selected')).toBe('completed')
  expect(execute).toHaveBeenCalledTimes(5)
})

test('off-path sources use the last ready link and keep that value while another input waits', async () => {
  const e = node('e')
  e.inputs.push({ id: 'in-gate', name: 'gate', type: 'any' })
  const producers = ['one', 'two', 'three', 'gate'].map((id) => ({ ...node(id, 'event-step'), data: id }))
  const json = graph([node('start', 'start'), e, ...producers], [
    ...producers.map(({ id }) => link('start', id)), link('start', 'e'),
    ...producers.slice(0, 3).map(({ id }) => link(id, 'e', true)),
    { ...link('gate', 'e', true), target: { id: 'e', port: 'in-gate' } },
  ])
  const { engine } = setup(json)
  const pending = new Map<string, NodeExecutionContext>()
  const received = vi.fn()
  engine.registerExecutor({ name: 'event-step', execute: (ctx) => { pending.set(ctx.data as string, ctx) } })
  engine.registerExecutor({ name: 'step', execute: (ctx) => received(ctx.getInput('value'), ctx.getInput('gate')) })
  await engine.start()
  expect(engine.getNodeStatus('e')).toBe('pending')
  for (const id of ['two', 'three', 'one', 'gate']) {
    const ctx = pending.get(id)!
    ctx.setOutput('value', id)
    await ctx.next()
    if (id !== 'gate') expect(received).not.toHaveBeenCalled()
  }
  expect(received).toHaveBeenCalledExactlyOnceWith('two', 'gate')
})

test('overlapping activations of one producer publish separate outputs to their consumers', async () => {
  const upstream = ['left', 'right'].map((id) => ({ ...node(id), data: id }))
  const producer = { ...node('b'), data: 'producer' }
  const json = graph([node('start', 'start'), ...upstream, producer, node('e', 'event-step')], [
    ...upstream.flatMap(({ id }) => [link('start', id), link(id, 'b'), link(id, 'b', true)]),
    link('b', 'e'), link('b', 'e', true), link('left', 'e', true),
  ])
  const { engine } = setup(json)
  const producers = new Map<unknown, () => void>()
  const consumers: Array<() => void> = []
  const received: unknown[] = []
  engine.registerExecutor({ name: 'step', execute: async (ctx) => {
    const value = ctx.data === 'producer' ? ctx.getInput('value') : ctx.data
    ctx.setOutput('value', value)
    if (ctx.data === 'producer') await new Promise<void>((resolve) => { producers.set(value, resolve) })
    await ctx.next()
  } })
  engine.registerExecutor({ name: 'event-step', execute: async (ctx) => {
    await new Promise<void>((resolve) => { consumers.push(resolve) })
    received.push(ctx.getInput('value'))
  } })
  const running = engine.start()
  try {
    await vi.waitFor(() => expect(producers.size).toBe(2))
    producers.get('left')!()
    await vi.waitFor(() => expect(consumers).toHaveLength(1))
    producers.get('right')!()
    await vi.waitFor(() => expect(consumers).toHaveLength(2))
    consumers.forEach((finish) => finish())
    await running
    expect(received).toEqual(['left', 'right'])
  } finally {
    engine.stop()
    producers.forEach((finish) => finish())
    consumers.forEach((finish) => finish())
    await running
  }
})

test('two triggers keep separate source selections while waiting for the same single-source input', async () => {
  const consumer = node('e', 'event-step')
  consumer.inputs.push({ id: 'in-gate', name: 'gate', type: 'any' })
  const branches = ['b', 'c', 'gate'].map((id) => ({ ...node(id), data: id }))
  const json = graph([node('start', 'start'), ...branches, consumer], [
    ...branches.map(({ id }) => link('start', id)),
    link('b', 'e'), link('c', 'e'), link('b', 'e', true), link('c', 'e', true),
    { ...link('gate', 'e', true), target: { id: 'e', port: 'in-gate' } },
  ])
  const { engine } = setup(json)
  let gate!: NodeExecutionContext
  const received = vi.fn()
  engine.registerExecutor({ name: 'step', execute: (ctx) => {
    if (ctx.data === 'gate') {
      gate = ctx
      return
    }
    ctx.setOutput('value', ctx.data)
    return ctx.next()
  } })
  engine.registerExecutor({ name: 'event-step', execute: (ctx) => received(ctx.getInput('value'), ctx.getInput('gate')) })
  await engine.start()
  expect(received).not.toHaveBeenCalled()
  gate.setOutput('value', 'ready')
  await gate.next()
  expect(received.mock.calls).toEqual([['b', 'ready'], ['c', 'ready']])
})

test('off-path selection uses link order when several candidates are already ready', async () => {
  const producers = ['two', 'three'].map((id) => ({ ...node(id, 'event-step'), data: id }))
  const json = graph([node('start', 'start'), node('trigger'), node('e'), ...producers], [
    ...producers.map(({ id }) => link('start', id)), link('start', 'trigger'), link('trigger', 'e'),
    ...producers.map(({ id }) => link(id, 'e', true)),
  ])
  json.nodes.find(({ id }) => id === 'trigger')!.data = 'trigger'
  const { engine } = setup(json)
  const pending = new Map<string, NodeExecutionContext>()
  const received = vi.fn()
  engine.registerExecutor({ name: 'event-step', execute: (ctx) => { pending.set(ctx.data as string, ctx) } })
  engine.registerExecutor({ name: 'step', execute: (ctx) => {
    if (ctx.data === 'trigger') pending.set('trigger', ctx)
    else received(ctx.getInput('value'))
  } })
  await engine.start()
  for (const id of ['three', 'two']) {
    const ctx = pending.get(id)!
    ctx.setOutput('value', id)
    await ctx.next()
  }
  await pending.get('trigger')!.next()
  expect(received).toHaveBeenCalledExactlyOnceWith('three')
})

test.each(['return', 'await'] as const)('%s next completes the upstream node at handoff without waiting for the final node', async mode => {
  const { engine } = setup(graph([node('start', 'start'), node('middle'), node('last', 'event-step')]))
  engine.registerExecutor({ name: 'step', execute: mode === 'return' ? ctx => ctx.next() : async ctx => { await ctx.next() } })
  let finish!: () => void
  engine.registerExecutor({ name: 'event-step', execute: () => new Promise<void>(resolve => { finish = resolve }) })
  const process = engine.start()
  await vi.waitFor(() => expect(engine.getNodeStatus('last')).toBe('running'))
  expect(engine.getNodeStatus('start')).toBe('completed')
  expect(engine.getNodeStatus('middle')).toBe('completed')
  finish()
  await process
  expect(engine.getNodeStatus('last')).toBe('completed')
})

test('upstream nodes stay completed while the final node pauses at a breakpoint', async () => {
  const { engine } = setup(graph([node('start', 'start'), node('middle'), node('last', 'step', true)]))
  const process = engine.start({ debug: true })
  await vi.waitFor(() => expect(engine.status).toBe('paused'))
  expect(engine.getNodeStatus('middle')).toBe('completed')
  expect(engine.getNodeStatus('last')).toBe('pending')
  engine.resume()
  await process
})

test('subgraph calls complete before the final parent node finishes', async () => {
  const parent = node('sub', 'subgraph')
  parent.targetGraphId = 'child'
  const json = graph([node('start', 'start'), parent, node('last', 'event-step')])
  const child = graph([node('child-start', 'start'), node('child-step'), node('child-end', 'end')])
  json.subgraphs.child = { nodes: child.nodes, links: child.links, viewport: child.viewport }
  const { engine } = setup(json)
  let finish!: () => void
  engine.registerExecutor({ name: 'event-step', execute: () => new Promise<void>(resolve => { finish = resolve }) })
  const process = engine.start()
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
  const process = engine.start({ debug: true })
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
    id, definitionId: 'subgraph', kind: 'subgraph', position: { x: 0, y: 0 }, inputValues: {},
    targetGraphId: subgraphId,
    inputs: [{ name: 'exec', type: 'exec', id: 'in-exec' }, { name: input, type: 'any', id: 'in-param' }],
    outputs: [{ name: 'exec', type: 'exec', id: 'out-exec' }, { name: output, type: 'any', id: 'out-result' }],
  }
}

/** Subgraph entries receive parent parameters and expose matching outputs. */
function subgraphEntry(id: string, param = 'param'): JsonNode {
  return {
    id, definitionId: 'start', kind: 'start', position: { x: 0, y: 0 }, inputValues: {},
    inputs: [{ name: param, type: 'any', id: 'in-param' }],
    outputs: [{ name: 'start', type: 'exec', id: 'out-start' }, { name: param, type: 'any', id: 'out-param' }],
  }
}

/** Subgraph exits receive values to return to the parent. */
function subgraphExit(id: string, result = 'result'): JsonNode {
  return {
    id, definitionId: 'end', kind: 'end', position: { x: 0, y: 0 }, inputValues: {},
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
  producer.inputValues = { value: 'Parent parameter' }
  const parent = subgraphCall('sub', 'child')
  const json = graph([node('start', 'start'), producer, parent, node('tail')], [
    link('start', 'producer'),
    link('producer', 'sub'),
    { id: 'param', source: { id: 'producer', port: 'out-value' }, target: { id: 'sub', port: 'in-param' } },
    link('sub', 'tail'),
    { id: 'result', source: { id: 'sub', port: 'out-result' }, target: { id: 'tail', port: 'in-value' } },
  ])
  json.subgraphs.child = subgraphGraph(subgraphEntry('child-start'), node('child-step'), subgraphExit('child-end'))
  const { engine, execute } = setup(json)
  engine.registerExecutor({ name: 'step', execute: ctx => {
    ctx.setOutput('value', ctx.getInput('value'))
    return execute(ctx)
  } })
  await engine.start()
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
  producer.inputValues = { value: 'Parent parameter' }
  const parent = subgraphCall('sub', 'child', 'param', 'output')
  const json = graph([node('start', 'start'), producer, parent], [
    link('start', 'producer'),
    link('producer', 'sub'),
    { id: 'param', source: { id: 'producer', port: 'out-value' }, target: { id: 'sub', port: 'in-param' } },
  ])
  // The exit's value and the parent's output pair because each side has one data port.
  json.subgraphs.child = subgraphGraph(subgraphEntry('child-start'), node('child-step'), subgraphExit('child-end', 'value'))
  const { engine, execute } = setup(json)
  engine.registerExecutor({ name: 'step', execute: ctx => {
    ctx.setOutput('value', ctx.getInput('value'))
    return execute(ctx)
  } })
  await engine.start()
  expect(engine.getNodeExecutionData('sub')).toEqual({
    inputs: { param: 'Parent parameter' }, outputs: { output: 'Parent parameter' },
  })
})
