import { afterEach, expect, test, vi } from 'vitest'
import {
  EventEmitter,
  defineNode,
  NodeRegistry,
  type NodeExecutionContext,
  type JsonGraph,
  type JsonNode,
  type NodeLifecycleContext,
} from '@lyx-pj/primflow-model'
import { Engine } from '../src/Engine'

const Step = defineNode({
  definition: {
    inputs: [
      { name: 'exec', type: 'exec' },
      { name: 'value', type: 'any' },
    ] as const,
    outputs: [
      { name: 'next', type: 'exec' },
      { name: 'value', type: 'any' },
    ] as const,
  },
  executor: (ctx: NodeExecutionContext) => ctx.next(),
})

function node(id: string, nodeType = 'step', breakpoint = false): JsonNode {
  return {
    id,
    definitionId: nodeType,
    breakpoint,
    kind: nodeType === 'start' ? 'start' : 'default',
    position: { x: 0, y: 0 },
    inputValues: {},
    inputs:
      nodeType === 'start'
        ? []
        : [
            { name: 'exec', type: 'exec', id: 'in-exec' },
            { name: 'value', type: 'any', id: 'in-value' },
          ],
    outputs: [
      { name: 'next', type: 'exec', id: 'out-exec' },
      ...(nodeType === 'start' ? [] : [{ name: 'value', type: 'any', id: 'out-value' }]),
    ],
  }
}

function graph(nodes = [node('start', 'start'), node('step')]): JsonGraph {
  return {
    nodes,
    variables: [],
    subgraphs: {},
    viewport: { x: 0, y: 0, zoom: 1 },
    links: nodes.slice(1).map((item, index) => ({
      id: `link-${index}`,
      source: { id: nodes[index].id, port: 'out-exec' },
      target: { id: item.id, port: 'in-exec' },
    })),
  }
}

/** Retain only stop capabilities for cleanup without invariant Engine generics across array elements. */
interface StoppableEngine {
  stop(): StoppableEngine
  whenStopped(): Promise<void>
}
const engines: StoppableEngine[] = []
function setup(NodeClass: typeof Step, json = graph()) {
  const engine = new Engine(new NodeRegistry().register('step', NodeClass))
  engines.push(engine)
  engine.loadGraph(json)
  return { engine }
}

afterEach(async () => {
  await Promise.all(engines.splice(0).map((engine) => engine.stop().whenStopped()))
  vi.restoreAllMocks()
})

test('all main and subgraph instances activate once before task execution starts', async () => {
  const calls: string[] = []
  const LifecycleStep = defineNode({
    ...Step,
    definition: Step.definition,
    onActive: (ctx: NodeLifecycleContext) => {
      calls.push(`active:${ctx.nodeId}`)
    },
    onDeactivate: (ctx: NodeLifecycleContext) => {
      calls.push(`inactive:${ctx.nodeId}`)
    },
    onDestroy: (ctx: NodeLifecycleContext) => {
      calls.push(`destroy:${ctx.nodeId}`)
    },
    executor: (ctx: NodeExecutionContext) => {
      calls.push('execute')
      return ctx.next()
    },
  })
  const json = graph([node('start', 'start'), node('a'), node('b'), node('disconnected')])
  json.links.pop()
  const child = graph([node('child-start', 'start'), node('child-step')])
  json.subgraphs.child = { nodes: child.nodes, links: child.links, viewport: child.viewport }
  const { engine } = setup(LifecycleStep, json)
  await engine.start()
  expect(calls).toEqual(['active:a', 'active:b', 'active:disconnected', 'active:child-step', 'execute', 'execute'])
  expect(engine.status).toBe('running')
  expect(calls.some((call) => call.startsWith('destroy:'))).toBe(false)
  engine.stop().stop()
  expect(engine.status).toBe('stopped')
  await engine.whenStopped()
  for (const id of ['a', 'b', 'disconnected', 'child-step']) {
    expect(calls.filter((call) => call === `inactive:${id}`)).toHaveLength(1)
    expect(calls.filter((call) => call === `destroy:${id}`)).toHaveLength(1)
  }
  expect(calls.lastIndexOf('inactive:a')).toBeLessThan(calls.indexOf('destroy:child-step'))
})

test('activation subscriptions wait for readiness, support unsubscribe, and stop receiving events after stop', async () => {
  let finish!: () => void
  let unsubscribe!: () => void
  let lifecycleContext!: NodeLifecycleContext
  const received: unknown[] = []
  const Subscriber = defineNode({
    ...Step,
    definition: Step.definition,
    onActive: async (ctx: NodeLifecycleContext) => {
      lifecycleContext = ctx
      unsubscribe = ctx.on('message', (_task, value) => {
        received.push(value)
      })
      await new Promise<void>((resolve) => {
        finish = resolve
      })
    },
  })
  const { engine } = setup(Subscriber)
  const process = engine.start()
  const event = engine.dispatchEvent('message', 'During startup')
  await vi.waitFor(() => expect(finish).toBeDefined())
  expect(received).toEqual([])
  finish()
  await Promise.all([process, event])
  expect(lifecycleContext).not.toHaveProperty('onEvent')
  expect(received).toEqual(['During startup'])
  unsubscribe()
  await engine.dispatchEvent('message', 'After unsubscribe')
  engine.stop()
  await engine.dispatchEvent('message', 'After stop')
  expect(received).toEqual(['During startup'])
})

test('lifecycle subscriptions respect breakpoints without repeating activation or deactivation', async () => {
  const active = vi.fn()
  const inactive = vi.fn()
  const receive = vi.fn()
  const Subscriber = defineNode({
    ...Step,
    definition: Step.definition,
    onActive: (ctx: NodeLifecycleContext) => {
      active()
      ctx.on('message', (_task, ...payload) => receive(...payload))
    },
    onDeactivate: inactive,
  })
  const { engine } = setup(Subscriber, graph([node('start', 'start'), node('step', 'step', true)]))
  const process = engine.start({ debug: true })
  await vi.waitFor(() => expect(engine.status).toBe('paused'))
  const event = engine.dispatchEvent('message', 'awaiting resume')
  await vi.waitFor(() => expect(engine.getTasks().filter((task) => task.status === 'paused')).toHaveLength(2))
  expect(receive).not.toHaveBeenCalled()
  engine.resume()
  await Promise.all([process, event])
  expect(receive).toHaveBeenCalledExactlyOnceWith('awaiting resume')
  expect(active).toHaveBeenCalledTimes(1)
  expect(inactive).not.toHaveBeenCalled()
})

test('deactivation clears old data and listeners; destruction clears temporary state; restart creates fresh instances', async () => {
  const source = new EventEmitter<{ message: [string] }>()
  const contexts: NodeLifecycleContext[] = []
  const received: string[] = []
  const calls: string[] = []
  const ResourceStep = defineNode({
    ...Step,
    definition: Step.definition,
    onActive: (ctx: NodeLifecycleContext) => {
      contexts.push(ctx)
      expect(ctx.nodeState).toEqual({})
      ctx.nodeState.cache = ['Temporary data']
      const handler = (value: string) => {
        received.push(value)
      }
      source.on('message', handler)
      ctx.onCleanup(() => {
        source.off('message', handler)
        calls.push('cleanup')
      })
    },
    onDeactivate: (ctx: NodeLifecycleContext) => {
      expect(ctx.signal.aborted).toBe(true)
      ctx.setOutput('value', 'Old instance during cleanup')
      delete ctx.nodeState.cache
      calls.push('deactivate')
    },
    onDestroy: (ctx: NodeLifecycleContext) => {
      expect(ctx.nodeState.cache).toBeUndefined()
      calls.push('destroy')
    },
  })
  const { engine } = setup(ResourceStep)
  await engine.start()
  source.emit('message', 'Running')
  engine.stop()
  await engine.whenStopped()
  source.emit('message', 'After stopping')
  expect(received).toEqual(['Running'])
  expect(calls).toEqual(['deactivate', 'cleanup', 'destroy'])
  expect(contexts[0].nodeState).toEqual({})
  await engine.start()
  expect(contexts[1].nodeState).not.toBe(contexts[0].nodeState)
  source.emit('message', 'Rerun')
  expect(received).toEqual(['Running', 'Rerun'])
})

test('restart awaits asynchronous destruction and prevents overlapping startup or resources', async () => {
  let finish!: () => void
  let waitForCleanup = true
  const calls: string[] = []
  const AsyncCleanup = defineNode({
    ...Step,
    definition: Step.definition,
    onActive: () => {
      calls.push('active')
    },
    onDestroy: async () => {
      calls.push('destroy:start')
      if (waitForCleanup)
        await new Promise<void>((resolve) => {
          finish = resolve
        })
      waitForCleanup = false
      calls.push('destroy:end')
    },
  })
  const { engine } = setup(AsyncCleanup)
  await engine.start()
  engine.stop()
  const restart = engine.start()
  await expect(engine.start()).rejects.toThrow('stop the current run first')
  await vi.waitFor(() => expect(finish).toBeDefined())
  expect(calls).toEqual(['active', 'destroy:start'])
  finish()
  await restart
  expect(calls).toEqual(['active', 'destroy:start', 'destroy:end', 'active'])
})

test('stop during activation aborts, awaits hook exit, then deactivates and destroys without execution', async () => {
  let finish!: () => void
  let context!: NodeLifecycleContext
  const calls: string[] = []
  const SlowActive = defineNode({
    ...Step,
    definition: Step.definition,
    onActive: async (ctx: NodeLifecycleContext) => {
      context = ctx
      calls.push('active:start')
      await new Promise<void>((resolve) => {
        finish = resolve
      })
      ctx.onCleanup(() => {
        calls.push('cleanup')
      })
      calls.push('active:end')
    },
    onDeactivate: () => {
      calls.push('deactivate')
    },
    onDestroy: () => {
      calls.push('destroy')
    },
    executor: () => {
      calls.push('execute')
    },
  })
  const { engine } = setup(SlowActive)
  const process = engine.start()
  await vi.waitFor(() => expect(context).toBeDefined())
  engine.stop()
  expect(context.signal.aborted).toBe(true)
  expect(calls).toEqual(['active:start'])
  finish()
  await Promise.all([process, engine.whenStopped()])
  expect(calls).toEqual(['active:start', 'active:end', 'deactivate', 'cleanup', 'destroy'])
})

test('activation failure cleans partially initialized and inactive instances and rejects startup', async () => {
  const failure = new Error('Initialization failed')
  const calls: string[] = []
  const FailingActive = defineNode({
    ...Step,
    definition: Step.definition,
    onActive: (ctx: NodeLifecycleContext) => {
      calls.push(`active:${ctx.nodeId}`)
      if (ctx.nodeId === 'b') throw failure
    },
    onDeactivate: (ctx: NodeLifecycleContext) => {
      calls.push(`inactive:${ctx.nodeId}`)
    },
    onDestroy: (ctx: NodeLifecycleContext) => {
      calls.push(`destroy:${ctx.nodeId}`)
    },
    executor: () => {
      calls.push('execute')
    },
  })
  const { engine } = setup(FailingActive, graph([node('start', 'start'), node('a'), node('b'), node('c')]))
  const error = vi.fn()
  engine.on('node:error', error)
  await expect(engine.start()).rejects.toBe(failure)
  expect(engine.status).toBe('stopped')
  expect(error).toHaveBeenCalledExactlyOnceWith(failure, 'b')
  expect(calls).toEqual(['active:a', 'active:b', 'inactive:b', 'inactive:a', 'destroy:c', 'destroy:b', 'destroy:a'])
})

test('deactivation, cleanup, and destruction errors are reported without blocking other resource releases', async () => {
  const calls: string[] = []
  const FailingCleanup = defineNode({
    ...Step,
    definition: Step.definition,
    onActive: (ctx: NodeLifecycleContext) => {
      ctx.onCleanup(() => {
        calls.push(`cleanup:${ctx.nodeId}`)
        throw new Error('Cleanup failed')
      })
    },
    onDeactivate: (ctx: NodeLifecycleContext) => {
      calls.push(`inactive:${ctx.nodeId}`)
      throw new Error('Deactivation failed')
    },
    onDestroy: (ctx: NodeLifecycleContext) => {
      calls.push(`destroy:${ctx.nodeId}`)
      throw new Error('Destruction failed')
    },
  })
  const { engine } = setup(FailingCleanup, graph([node('start', 'start'), node('a'), node('b')]))
  const error = vi.fn()
  engine.on('node:error', error)
  await engine.start()
  engine.stop()
  await engine.whenStopped()
  expect(error).toHaveBeenCalledTimes(6)
  expect(calls).toEqual(['inactive:b', 'cleanup:b', 'inactive:a', 'cleanup:a', 'destroy:b', 'destroy:a'])
})

test('reload destroys old nodes; new activation waits for cleanup without inheriting old runtime data', async () => {
  let finish!: () => void
  const calls: string[] = []
  const Reloadable = defineNode({
    ...Step,
    definition: Step.definition,
    onActive: (ctx: NodeLifecycleContext) => {
      calls.push(`active:${ctx.nodeId}`)
      if (ctx.data) (ctx.data as { value: string }).value = 'Runtime change'
    },
    onDestroy: async (ctx: NodeLifecycleContext) => {
      if (ctx.nodeId === 'old')
        await new Promise<void>((resolve) => {
          finish = resolve
        })
      calls.push(`destroy:${ctx.nodeId}`)
    },
  })
  const json = graph([node('start', 'start'), node('old')])
  json.nodes[1].data = { value: 'Original configuration' }
  const { engine } = setup(Reloadable, json)
  await engine.start()
  expect(json.nodes[1].data).toEqual({ value: 'Original configuration' })
  engine.loadGraph(graph([node('new-start', 'start'), node('new')]))
  const process = engine.start()
  await vi.waitFor(() => expect(finish).toBeDefined())
  expect(calls).toEqual(['active:old'])
  finish()
  await process
  expect(calls).toEqual(['active:old', 'destroy:old', 'active:new'])
})

test('loaded nodes that never activated are destroyed once without deactivation', async () => {
  const inactive = vi.fn()
  const destroy = vi.fn()
  const Prepared = defineNode({
    ...Step,
    definition: Step.definition,
    onDeactivate: inactive,
    onDestroy: destroy,
  })
  const { engine } = setup(Prepared)
  engine.stop().stop()
  await engine.whenStopped()
  expect(inactive).not.toHaveBeenCalled()
  expect(destroy).toHaveBeenCalledTimes(1)
})

test('stop inside activation awaits hook exit without duplicate destruction or execution', async () => {
  const calls: string[] = []
  let stop!: () => void
  const SelfStopping = defineNode({
    ...Step,
    definition: Step.definition,
    onActive: async () => {
      stop()
      await Promise.resolve()
      calls.push('active:end')
    },
    onDeactivate: () => {
      calls.push('deactivate')
    },
    onDestroy: () => {
      calls.push('destroy')
    },
    executor: () => {
      calls.push('execute')
    },
  })
  const { engine } = setup(SelfStopping)
  stop = () => {
    engine.stop()
  }
  await engine.start()
  await engine.whenStopped()
  expect(calls).toEqual(['active:end', 'deactivate', 'destroy'])
})

test('unsubscribe or stop while paused discards undelivered lifecycle events', async () => {
  let unsubscribe!: () => void
  const received = vi.fn()
  const Subscriber = defineNode({
    ...Step,
    definition: Step.definition,
    onActive: (ctx: NodeLifecycleContext) => {
      unsubscribe = ctx.on('message', (_task, ...payload) => received(...payload))
    },
  })
  const { engine } = setup(Subscriber, graph([node('start', 'start'), node('step', 'step', true)]))
  const process = engine.start({ debug: true })
  await vi.waitFor(() => expect(engine.status).toBe('paused'))
  const event = engine.dispatchEvent('message')
  unsubscribe()
  engine.resume()
  await Promise.all([process, event])
  expect(received).not.toHaveBeenCalled()
  engine.stop()
  const restarted = engine.start({ debug: true })
  await vi.waitFor(() => expect(engine.status).toBe('paused'))
  const cancelled = engine.dispatchEvent('message')
  engine.stop()
  await Promise.all([restarted, cancelled, engine.whenStopped()])
  expect(received).not.toHaveBeenCalled()
})

test('throwing lifecycle error observers do not block destruction', async () => {
  const destroyed: string[] = []
  const Cleanup = defineNode({
    ...Step,
    definition: Step.definition,
    onDeactivate: () => {
      throw new Error('Deactivation failed')
    },
    onDestroy: (ctx: NodeLifecycleContext) => {
      destroyed.push(ctx.nodeId)
    },
  })
  vi.spyOn(console, 'error').mockImplementation(() => {})
  const { engine } = setup(Cleanup, graph([node('start', 'start'), node('a'), node('b')]))
  engine.on('node:error', () => {
    throw new Error('Observer failed')
  })
  await engine.start()
  await engine.stop().whenStopped()
  expect(destroyed).toEqual(['b', 'a'])
})

test('loading failure destroys already deserialized nodes without leaving partial instances', async () => {
  const destroyed: string[] = []
  const Prepared = defineNode({
    ...Step,
    definition: Step.definition,
    onDestroy: (ctx: NodeLifecycleContext) => {
      destroyed.push(ctx.nodeId)
    },
  })
  const { engine } = setup(Prepared)
  expect(() => engine.loadGraph(graph([node('new-start', 'start'), node('new'), node('invalid', 'unknown')]))).toThrow()
  await engine.whenStopped()
  expect(destroyed).toEqual(['step', 'new'])
})

test('loading and starting from abort callbacks cannot let old stop clear the new graph', async () => {
  let restart!: Promise<void>
  let reload!: () => void
  const activated: string[] = []
  const Reloadable = defineNode({
    ...Step,
    definition: Step.definition,
    onActive: (ctx: NodeLifecycleContext) => {
      activated.push(ctx.nodeId)
      if (ctx.nodeId === 'old') ctx.signal.addEventListener('abort', () => reload(), { once: true })
    },
  })
  const { engine } = setup(Reloadable, graph([node('old-start', 'start'), node('old')]))
  reload = () => {
    engine.loadGraph(graph([node('new-start', 'start'), node('new')]))
    restart = engine.start()
  }
  await engine.start()
  engine.stop()
  await restart
  expect(activated).toEqual(['old', 'new'])
  expect(engine.status).toBe('running')
  expect(engine.getNodeStatus('new')).toBe('completed')
})

test('standalone runNode executes without workflow hooks or retained instances', async () => {
  const active = vi.fn()
  const execute = vi.fn()
  const DirectStep = defineNode({
    ...Step,
    definition: Step.definition,
    onActive: active,
    executor: execute,
  })
  const engine = new Engine(new NodeRegistry().register('step', DirectStep))
  await engine.runNode('step')
  expect(execute).toHaveBeenCalledTimes(1)
  expect(active).not.toHaveBeenCalled()
  expect(engine.getTasks()).toEqual([])
})

test('throwing status observers still allow abort and complete lifecycle cleanup', async () => {
  let context!: NodeLifecycleContext
  const destroyed = vi.fn()
  const Resource = defineNode({
    ...Step,
    definition: Step.definition,
    onActive: (ctx: NodeLifecycleContext) => {
      context = ctx
    },
    onDestroy: destroyed,
  })
  const { engine } = setup(Resource)
  await engine.start()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  engine.on('node:status:changed', (_id, status) => {
    if (status === 'idle') throw new Error('Status observer failed')
  })
  expect(() => engine.stop()).not.toThrow()
  await engine.whenStopped()
  expect(context.signal.aborted).toBe(true)
  expect(engine.getNodeStatuses().size).toBe(0)
  expect(destroyed).toHaveBeenCalledTimes(1)
})
