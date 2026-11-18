import { afterEach, expect, test, vi } from 'vitest'
import {
  EventEmitter,
  Node,
  NodeRegistry,
  type ExecContext,
  type JsonGraph,
  type JsonNode,
  type NodeLifecycleContext,
} from '@lyx-pj/primflow-model'
import { Engine } from '../src/Engine'
import { Runtime } from '../src/Runtime'

class Step extends Node {
  static definition = {
    inputs: [
      { name: 'exec', type: 'exec' },
      { name: 'value', type: 'any' },
    ] as const,
    outputs: [
      { name: 'next', type: 'exec' },
      { name: 'value', type: 'any' },
    ] as const,
  }
  static executor = (ctx: ExecContext) => ctx.next()
}

function node(id: string, nodeType = 'step', breakpoint = false): JsonNode {
  return {
    id,
    nodeType,
    breakpoint,
    type: nodeType === 'start' ? 'start' : 'default',
    position: { x: 0, y: 0 },
    values: {},
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
  const runtime = new Runtime(new NodeRegistry().register('step', NodeClass))
  const engine = new Engine(runtime)
  engines.push(engine)
  engine.fromJSON(json)
  return { engine, runtime }
}

afterEach(async () => {
  await Promise.all(engines.splice(0).map((engine) => engine.stop().whenStopped()))
  vi.restoreAllMocks()
})

test('all main and subgraph instances activate once before task execution starts', async () => {
  const calls: string[] = []
  class LifecycleStep extends Step {
    static onActive = (ctx: NodeLifecycleContext) => {
      calls.push(`active:${ctx.nodeId}`)
    }
    static onDeactivate = (ctx: NodeLifecycleContext) => {
      calls.push(`inactive:${ctx.nodeId}`)
    }
    static onDestroy = (ctx: NodeLifecycleContext) => {
      calls.push(`destroy:${ctx.nodeId}`)
    }
    static executor = (ctx: ExecContext) => {
      calls.push('execute')
      return ctx.next()
    }
  }
  const json = graph([node('start', 'start'), node('a'), node('b'), node('disconnected')])
  json.links.pop()
  const child = graph([node('child-start', 'start'), node('child-step')])
  json.subgraphs.child = { nodes: child.nodes, links: child.links, viewport: child.viewport }
  const { engine, runtime } = setup(LifecycleStep, json)
  await engine.process()
  expect(calls).toEqual(['active:a', 'active:b', 'active:disconnected', 'active:child-step', 'execute', 'execute'])
  expect(engine.status).toBe('running')
  expect(calls.some((call) => call.startsWith('destroy:'))).toBe(false)
  engine.stop().stop()
  expect(engine.status).toBe('stopped')
  expect(runtime.nodes.size).toBe(0)
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
  const received: unknown[] = []
  class Subscriber extends Step {
    static onActive = async (ctx: NodeLifecycleContext) => {
      unsubscribe = ctx.onEvent('message', (_task, value) => {
        received.push(value)
      })
      await new Promise<void>((resolve) => {
        finish = resolve
      })
    }
  }
  const { engine } = setup(Subscriber)
  const process = engine.process()
  const event = engine.handleNodeEvents('message', 'During startup')
  await vi.waitFor(() => expect(finish).toBeDefined())
  expect(received).toEqual([])
  finish()
  await Promise.all([process, event])
  expect(received).toEqual(['During startup'])
  unsubscribe()
  await engine.handleNodeEvents('message', 'After unsubscribe')
  engine.stop()
  await engine.handleNodeEvents('message', 'After stop')
  expect(received).toEqual(['During startup'])
})

test('lifecycle subscriptions respect breakpoints without repeating activation or deactivation', async () => {
  const active = vi.fn()
  const inactive = vi.fn()
  const receive = vi.fn()
  class Subscriber extends Step {
    static onActive = (ctx: NodeLifecycleContext) => {
      active()
      ctx.onEvent('message', (_task, ...payload) => receive(...payload))
    }
    static onDeactivate = inactive
  }
  const { engine } = setup(Subscriber, graph([node('start', 'start'), node('step', 'step', true)]))
  const process = engine.process({ debug: true })
  await vi.waitFor(() => expect(engine.status).toBe('paused'))
  const event = engine.handleNodeEvents('message', 'awaiting resume')
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
  class ResourceStep extends Step {
    static onActive = (ctx: NodeLifecycleContext) => {
      contexts.push(ctx)
      expect(ctx.state).toEqual({})
      ctx.state.cache = ['Temporary data']
      const handler = (value: string) => {
        received.push(value)
      }
      source.on('message', handler)
      ctx.onCleanup(() => {
        source.off('message', handler)
        calls.push('cleanup')
      })
    }
    static onDeactivate = (ctx: NodeLifecycleContext) => {
      expect(ctx.signal.aborted).toBe(true)
      ctx.setOutput('value', 'Old instance during cleanup')
      delete ctx.state.cache
      calls.push('deactivate')
    }
    static onDestroy = (ctx: NodeLifecycleContext) => {
      expect(ctx.state.cache).toBeUndefined()
      calls.push('destroy')
    }
  }
  const { engine, runtime } = setup(ResourceStep)
  const first = runtime.nodes.get('step')!
  await engine.process()
  source.emit('message', 'Running')
  engine.stop()
  await engine.whenStopped()
  source.emit('message', 'After stopping')
  expect(received).toEqual(['Running'])
  expect(calls).toEqual(['deactivate', 'cleanup', 'destroy'])
  expect(first.state).toEqual({})
  expect(first.outputValues).toEqual({})
  await engine.process()
  expect(runtime.nodes.get('step')).not.toBe(first)
  expect(contexts[1].state).not.toBe(contexts[0].state)
  source.emit('message', 'Rerun')
  expect(received).toEqual(['Running', 'Rerun'])
})

test('restart awaits asynchronous destruction and prevents overlapping startup or resources', async () => {
  let finish!: () => void
  let waitForCleanup = true
  const calls: string[] = []
  class AsyncCleanup extends Step {
    static onActive = () => {
      calls.push('active')
    }
    static onDestroy = async () => {
      calls.push('destroy:start')
      if (waitForCleanup)
        await new Promise<void>((resolve) => {
          finish = resolve
        })
      waitForCleanup = false
      calls.push('destroy:end')
    }
  }
  const { engine } = setup(AsyncCleanup)
  await engine.process()
  engine.stop()
  const restart = engine.process()
  await expect(engine.process()).rejects.toThrow('stop the current run first')
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
  class SlowActive extends Step {
    static onActive = async (ctx: NodeLifecycleContext) => {
      context = ctx
      calls.push('active:start')
      await new Promise<void>((resolve) => {
        finish = resolve
      })
      ctx.onCleanup(() => {
        calls.push('cleanup')
      })
      calls.push('active:end')
    }
    static onDeactivate = () => {
      calls.push('deactivate')
    }
    static onDestroy = () => {
      calls.push('destroy')
    }
    static executor = () => {
      calls.push('execute')
    }
  }
  const { engine } = setup(SlowActive)
  const process = engine.process()
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
  class FailingActive extends Step {
    static onActive = (ctx: NodeLifecycleContext) => {
      calls.push(`active:${ctx.nodeId}`)
      if (ctx.nodeId === 'b') throw failure
    }
    static onDeactivate = (ctx: NodeLifecycleContext) => {
      calls.push(`inactive:${ctx.nodeId}`)
    }
    static onDestroy = (ctx: NodeLifecycleContext) => {
      calls.push(`destroy:${ctx.nodeId}`)
    }
    static executor = () => {
      calls.push('execute')
    }
  }
  const { engine } = setup(FailingActive, graph([node('start', 'start'), node('a'), node('b'), node('c')]))
  const error = vi.fn()
  engine.on('node:error', error)
  await expect(engine.process()).rejects.toBe(failure)
  expect(engine.status).toBe('stopped')
  expect(error).toHaveBeenCalledExactlyOnceWith(failure, 'b')
  expect(calls).toEqual(['active:a', 'active:b', 'inactive:b', 'inactive:a', 'destroy:c', 'destroy:b', 'destroy:a'])
})

test('deactivation, cleanup, and destruction errors are reported without blocking other resource releases', async () => {
  const calls: string[] = []
  class FailingCleanup extends Step {
    static onActive = (ctx: NodeLifecycleContext) => {
      ctx.onCleanup(() => {
        calls.push(`cleanup:${ctx.nodeId}`)
        throw new Error('Cleanup failed')
      })
    }
    static onDeactivate = (ctx: NodeLifecycleContext) => {
      calls.push(`inactive:${ctx.nodeId}`)
      throw new Error('Deactivation failed')
    }
    static onDestroy = (ctx: NodeLifecycleContext) => {
      calls.push(`destroy:${ctx.nodeId}`)
      throw new Error('Destruction failed')
    }
  }
  const { engine } = setup(FailingCleanup, graph([node('start', 'start'), node('a'), node('b')]))
  const error = vi.fn()
  engine.on('node:error', error)
  await engine.process()
  engine.stop()
  await engine.whenStopped()
  expect(error).toHaveBeenCalledTimes(6)
  expect(calls).toEqual(['inactive:b', 'cleanup:b', 'inactive:a', 'cleanup:a', 'destroy:b', 'destroy:a'])
})

test('reload destroys old nodes; new activation waits for cleanup without inheriting old runtime data', async () => {
  let finish!: () => void
  const calls: string[] = []
  class Reloadable extends Step {
    static onActive = (ctx: NodeLifecycleContext) => {
      calls.push(`active:${ctx.nodeId}`)
      if (ctx.data) (ctx.data as { value: string }).value = 'Runtime change'
    }
    static onDestroy = async (ctx: NodeLifecycleContext) => {
      if (ctx.nodeId === 'old')
        await new Promise<void>((resolve) => {
          finish = resolve
        })
      calls.push(`destroy:${ctx.nodeId}`)
    }
  }
  const json = graph([node('start', 'start'), node('old')])
  json.nodes[1].data = { value: 'Original configuration' }
  const { engine } = setup(Reloadable, json)
  await engine.process()
  expect(json.nodes[1].data).toEqual({ value: 'Original configuration' })
  engine.fromJSON(graph([node('new-start', 'start'), node('new')]))
  const process = engine.process()
  await vi.waitFor(() => expect(finish).toBeDefined())
  expect(calls).toEqual(['active:old'])
  finish()
  await process
  expect(calls).toEqual(['active:old', 'destroy:old', 'active:new'])
})

test('loaded nodes that never activated are destroyed once without deactivation', async () => {
  const inactive = vi.fn()
  const destroy = vi.fn()
  class Prepared extends Step {
    static onDeactivate = inactive
    static onDestroy = destroy
  }
  const { engine } = setup(Prepared)
  engine.stop().stop()
  await engine.whenStopped()
  expect(inactive).not.toHaveBeenCalled()
  expect(destroy).toHaveBeenCalledTimes(1)
})

test('stop inside activation awaits hook exit without duplicate destruction or execution', async () => {
  const calls: string[] = []
  let stop!: () => void
  class SelfStopping extends Step {
    static onActive = async () => {
      stop()
      await Promise.resolve()
      calls.push('active:end')
    }
    static onDeactivate = () => {
      calls.push('deactivate')
    }
    static onDestroy = () => {
      calls.push('destroy')
    }
    static executor = () => {
      calls.push('execute')
    }
  }
  const { engine } = setup(SelfStopping)
  stop = () => {
    engine.stop()
  }
  await engine.process()
  await engine.whenStopped()
  expect(calls).toEqual(['active:end', 'deactivate', 'destroy'])
})

test('unsubscribe or stop while paused discards undelivered lifecycle events', async () => {
  let unsubscribe!: () => void
  const received = vi.fn()
  class Subscriber extends Step {
    static onActive = (ctx: NodeLifecycleContext) => {
      unsubscribe = ctx.onEvent('message', (_task, ...payload) => received(...payload))
    }
  }
  const { engine } = setup(Subscriber, graph([node('start', 'start'), node('step', 'step', true)]))
  const process = engine.process({ debug: true })
  await vi.waitFor(() => expect(engine.status).toBe('paused'))
  const event = engine.handleNodeEvents('message')
  unsubscribe()
  engine.resume()
  await Promise.all([process, event])
  expect(received).not.toHaveBeenCalled()
  engine.stop()
  const restarted = engine.process({ debug: true })
  await vi.waitFor(() => expect(engine.status).toBe('paused'))
  const cancelled = engine.handleNodeEvents('message')
  engine.stop()
  await Promise.all([restarted, cancelled, engine.whenStopped()])
  expect(received).not.toHaveBeenCalled()
})

test('throwing lifecycle error observers do not block destruction', async () => {
  const destroyed: string[] = []
  class Cleanup extends Step {
    static onDeactivate = () => {
      throw new Error('Deactivation failed')
    }
    static onDestroy = (ctx: NodeLifecycleContext) => {
      destroyed.push(ctx.nodeId)
    }
  }
  vi.spyOn(console, 'error').mockImplementation(() => {})
  const { engine } = setup(Cleanup, graph([node('start', 'start'), node('a'), node('b')]))
  engine.on('node:error', () => {
    throw new Error('Observer failed')
  })
  await engine.process()
  await engine.stop().whenStopped()
  expect(destroyed).toEqual(['b', 'a'])
})

test('loading failure destroys already deserialized nodes without leaving partial instances', async () => {
  const destroyed: string[] = []
  class Prepared extends Step {
    static onDestroy = (ctx: NodeLifecycleContext) => {
      destroyed.push(ctx.nodeId)
    }
  }
  const { engine, runtime } = setup(Prepared)
  expect(() => engine.fromJSON(graph([node('new-start', 'start'), node('new'), node('invalid', 'unknown')]))).toThrow()
  await engine.whenStopped()
  expect(destroyed).toEqual(['step', 'new'])
  expect(runtime.nodes.size).toBe(0)
})

test('loading and starting from abort callbacks cannot let old stop clear the new graph', async () => {
  let restart!: Promise<void>
  let reload!: () => void
  const activated: string[] = []
  class Reloadable extends Step {
    static onActive = (ctx: NodeLifecycleContext) => {
      activated.push(ctx.nodeId)
      if (ctx.nodeId === 'old') ctx.signal.addEventListener('abort', () => reload(), { once: true })
    }
  }
  const { engine } = setup(Reloadable, graph([node('old-start', 'start'), node('old')]))
  reload = () => {
    engine.fromJSON(graph([node('new-start', 'start'), node('new')]))
    restart = engine.process()
  }
  await engine.process()
  engine.stop()
  await restart
  expect(activated).toEqual(['old', 'new'])
  expect(engine.status).toBe('running')
  expect(engine.getNodeStatus('new')).toBe('completed')
})

test('standalone runNode executes without workflow hooks or retained instances', async () => {
  const active = vi.fn()
  const execute = vi.fn()
  class DirectStep extends Step {
    static onActive = active
    static executor = execute
  }
  const runtime = new Runtime(new NodeRegistry().register('step', DirectStep))
  const engine = new Engine(runtime)
  await engine.runNode('step')
  expect(execute).toHaveBeenCalledTimes(1)
  expect(active).not.toHaveBeenCalled()
  expect(runtime.nodes.size).toBe(0)
})

test('throwing status observers still allow abort and complete lifecycle cleanup', async () => {
  let context!: NodeLifecycleContext
  const destroyed = vi.fn()
  class Resource extends Step {
    static onActive = (ctx: NodeLifecycleContext) => {
      context = ctx
    }
    static onDestroy = destroyed
  }
  const { engine } = setup(Resource)
  await engine.process()
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
