import { afterEach, expect, test, vi } from 'vitest'
import { NodeRegistry, type NodeClassType, type JsonGraph, type JsonNode } from '@lyx-pj/primflow-model'
import { Engine } from '../src/Engine'
import { defineExecutor, defineNode, defineService, type ServiceDefinition } from '../src'

const Fetch = defineNode({
  definition: {
    inputs: [{ name: 'exec', type: 'exec' }, { name: 'url', type: 'string' }] as const,
    outputs: [{ name: 'exec', type: 'exec' }, { name: 'body', type: 'string' }] as const,
  },
})

const Plain = defineNode({
  definition: {
    inputs: [{ name: 'exec', type: 'exec' }] as const,
    outputs: [{ name: 'exec', type: 'exec' }] as const,
  },
})

function node(id: string, nodeType: string): JsonNode {
  const isStart = nodeType === 'start'
  const hasBody = nodeType === 'Fetch'
  return {
    id,
    definitionId: nodeType,
    kind: isStart ? 'start' : 'default',
    position: { x: 0, y: 0 },
    inputValues: {},
    inputs: isStart ? [] : [{ name: 'exec', type: 'exec', id: 'in-exec' }],
    outputs: isStart
      ? [{ name: 'start', type: 'exec', id: 'out-start' }]
      : [
          { name: 'exec', type: 'exec', id: 'out-exec' },
          ...(hasBody ? [{ name: 'body', type: 'string', id: 'out-body' }] : []),
        ],
  }
}

function link(source: string, target: string): JsonGraph['links'][number] {
  const sourcePort = source === 'start' ? 'out-start' : 'out-exec'
  return { id: `${source}-${target}`, source: { id: source, port: sourcePort }, target: { id: target, port: 'in-exec' } }
}

/** A graph that runs one node after the built-in start node. */
function graph(targetType: string): JsonGraph {
  return {
    nodes: [node('start', 'start'), node('a', targetType)],
    links: [link('start', 'a')],
    variables: [],
    subgraphs: {},
    viewport: { x: 0, y: 0, zoom: 1 },
  }
}

test('defined services are assembled in dependency order and used by a defined executor', async () => {
  const get = vi.fn((path: string) => `body:${path}`)
  const http = defineService('http', { value: { get } })
  const createUser = vi.fn((client: { get(path: string): string }) => ({
    find: (id: string) => client.get(`/users/${id}`),
  }))
  const user = defineService('user', {
    dependsOn: [http],
    create: (ctx) => createUser(ctx.getService('http')),
  })
  const FetchUser = defineNode({
    executor: 'backend.fetch-user',
    definition: {
      inputs: [{ name: 'exec', type: 'exec' }],
      outputs: [{ name: 'exec', type: 'exec' }, { name: 'body', type: 'string' }],
    },
  })
  const registry = new NodeRegistry().register('Fetch', FetchUser)
  const executor = defineExecutor(FetchUser, ({ services, setOutput, next }) => {
    setOutput('body', services.require('user').find('42'))
    return next(['exec'])
  }, { services: [user] })
  expect(createUser).not.toHaveBeenCalled()

  const engine = new Engine(registry, { services: [user, http] })
  const other = new Engine(registry, { services: [http, user] })
  expect(() => new Engine(registry).registerExecutor(executor)).toThrow(/fetch-user.*user/i)
  expect(createUser).toHaveBeenCalledTimes(2)
  try {
    engine.registerExecutor(executor)
    engine.loadGraph(graph('Fetch'))
    await engine.start()
    await engine.stop().whenStopped()
    await engine.start()
    expect(engine.getNodeExecutionData('a')?.outputs.body).toBe('body:/users/42')
    expect(get).toHaveBeenCalledWith('/users/42')
    expect(createUser).toHaveBeenCalledTimes(2)
  } finally {
    await engine.stop().whenStopped()
    await other.stop().whenStopped()
  }
})

test('service assembly rejects missing and duplicate definitions before running factories', () => {
  const http = defineService('http', { value: { get: (path: string) => path } })
  const create = vi.fn(() => ({ ready: true }))
  const unrelated = defineService('unrelated', { create })
  const user = defineService('user', { dependsOn: [http], create })
  const registry = new NodeRegistry()
  expect(() => new Engine(registry, { services: [unrelated, user] })).toThrow(/user.*missing.*http/i)
  expect(() => new Engine(registry, { services: [user, defineService('http', { value: 0 })] }))
    .toThrow(/user.*different.*http/i)
  expect(() => new Engine(registry, { services: [http, defineService('http', { value: 0 })] }))
    .toThrow(/duplicate.*http/i)
  expect(create).not.toHaveBeenCalled()
})

test('service assembly rejects circular dependencies and asynchronous factories', () => {
  const dependencies: ServiceDefinition[] = []
  const first = defineService('first', { dependsOn: dependencies, create: () => true })
  const second = defineService('second', { dependsOn: [first], create: () => true })
  dependencies.push(second)
  const registry = new NodeRegistry()
  expect(() => new Engine(registry, { services: [first, second] })).toThrow(/circular.*first/i)

  // @ts-expect-error Async factories are rejected for untyped callers as well.
  const asyncService = defineService('async', { create: async () => true })
  expect(() => new Engine(registry, { services: [asyncService] })).toThrow(/async.*synchronous/i)
})

test('an installed service may explicitly provide undefined', async () => {
  const absent = defineService('optional', { value: undefined })
  const ReadOptional = defineNode({ definition: Fetch.definition, executor: 'read-optional' })
  const engine = createEngine(['Fetch', ReadOptional], [absent])
  engine.registerExecutor(defineExecutor(ReadOptional, ({ services, setOutput }) => {
    setOutput('body', String(services.require('optional')))
  }, { services: [absent] }))
  engine.loadGraph(graph('Fetch'))
  await engine.start()
  expect(engine.getNodeExecutionData('a')?.outputs.body).toBe('undefined')
})

const engines: { stop(): unknown }[] = []
afterEach(() => {
  for (const engine of engines.splice(0)) engine.stop()
  vi.restoreAllMocks()
})

function createEngine(registration: [string, NodeClassType], services: readonly ServiceDefinition[] = []) {
  const registry = new NodeRegistry().register(...registration)
  const engine = new Engine(registry, { services })
  engines.push(engine)
  return engine
}

test('a node that declares no executor runs through a registered executor', async () => {
  const engine = createEngine(['Fetch', Fetch])
  const executor = vi.fn((ctx: { setOutput: (name: string, value: unknown) => void; next: () => void }) => {
    ctx.setOutput('body', 'loaded')
    ctx.next()
  })
  engine.registerExecutor({ name: 'Fetch', execute: executor })
  engine.loadGraph(graph('Fetch'))
  await engine.start()
  expect(executor).toHaveBeenCalledTimes(1)
  expect(engine.getNodeExecutionData('a')?.outputs.body).toBe('loaded')
})

test('a node can name its executor so the implementation stays outside the node package', async () => {
  const Named = defineNode({
    executor: 'backend.fetch',
    definition: {
      inputs: [{ name: 'exec', type: 'exec' }] as const,
      outputs: [{ name: 'exec', type: 'exec' }] as const,
    },
  })
  const engine = createEngine(['Named', Named])
  const executor = vi.fn((ctx: { next: () => void }) => ctx.next())
  engine.registerExecutor(defineExecutor(Named, executor))
  engine.loadGraph(graph('Named'))
  await engine.start()
  expect(executor).toHaveBeenCalledTimes(1)
})

test('a node without a registered executor fails and reports the missing executor', async () => {
  const engine = createEngine(['Fetch', Fetch])
  const errors: string[] = []
  engine.on('node:error', (error: unknown) => errors.push(String(error)))
  engine.loadGraph(graph('Fetch'))
  await engine.start()
  expect(engine.getNodeStatus('a')).toBe('failed')
  expect(errors.join('\n')).toMatch(/no executor/i)
})

test('a registered service is readable by its declared name', async () => {
  const get = vi.fn(async (_path: string) => 'payload')
  const http = defineService('http', { value: { get } })
  const FetchWithService = defineNode({ definition: Fetch.definition, executor: 'backend.http' })
  const engine = createEngine(['Fetch', FetchWithService], [http])
  engine.registerExecutor(defineExecutor(FetchWithService, async (ctx) => {
    ctx.setOutput('body', await ctx.services.require('http').get('https://example.test'))
    ctx.next()
  }, { services: [http] }))
  engine.loadGraph(graph('Fetch'))
  await engine.start()
  expect(get).toHaveBeenCalledWith('https://example.test')
  expect(engine.getNodeExecutionData('a')?.outputs.body).toBe('payload')
})

test('a service that was never installed reads as undefined', async () => {
  const engine = createEngine(['Fetch', Fetch])
  engine.registerExecutor({ name: 'Fetch', execute: (ctx) => {
    ctx.setOutput('body', ctx.services.get('http') === undefined ? 'missing' : 'present')
    ctx.next()
  } })
  engine.loadGraph(graph('Fetch'))
  await engine.start()
  expect(engine.getNodeExecutionData('a')?.outputs.body).toBe('missing')
})

test('requiring a service that was never registered fails with a message naming the service', async () => {
  const engine = createEngine(['Fetch', Fetch])
  const errors: string[] = []
  engine.on('node:error', (error: unknown) => errors.push(String(error)))
  engine.registerExecutor({ name: 'Fetch', execute: (ctx) => {
    ctx.services.require('http')
    ctx.next()
  } })
  engine.loadGraph(graph('Fetch'))
  await engine.start()
  expect(engine.getNodeStatus('a')).toBe('failed')
  expect(errors.join('\n')).toMatch(/http/)
})

test('a node with a colocated executor runs', async () => {
  const SelfContained = defineNode({
    executor: (ctx: { next: () => void }) => ctx.next(),
    definition: {
      inputs: [{ name: 'exec', type: 'exec' }] as const,
      outputs: [{ name: 'exec', type: 'exec' }] as const,
    },
  })
  const engine = createEngine(['SelfContained', SelfContained])
  engine.loadGraph(graph('SelfContained'))
  await engine.start()
  expect(engine.getNodeStatus('a')).toBe('completed')
})

test('a node without an executor or a registered implementation is reported as failed', async () => {
  const engine = createEngine(['Plain', Plain])
  engine.loadGraph(graph('Plain'))
  await engine.start()
  expect(engine.getNodeStatus('a')).toBe('failed')
})
