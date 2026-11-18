import { afterEach, expect, test, vi } from 'vitest'
import {
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

function node(id: string, nodeType: string): JsonNode {
  return {
    id,
    nodeType,
    type: nodeType === 'start' ? 'start' : 'default',
    position: { x: 0, y: 0 },
    values: {},
    inputs:
      nodeType === 'start'
        ? []
        : [
            { name: 'exec', id: 'in-exec', type: 'exec' },
            { name: 'value', id: 'in-value', type: 'any' },
          ],
    outputs: [
      { name: 'next', id: 'out-exec', type: 'exec' },
      ...(nodeType === 'start' ? [] : [{ name: 'value', id: 'out-value', type: 'any' }]),
    ],
  }
}

function graph(): JsonGraph {
  return {
    nodes: [node('start', 'start'), node('event', 'event'), node('tail', 'tail')],
    links: [
      { id: 'start-event', source: { id: 'start', port: 'out-exec' }, target: { id: 'event', port: 'in-exec' } },
      { id: 'event-tail', source: { id: 'event', port: 'out-exec' }, target: { id: 'tail', port: 'in-exec' } },
      { id: 'value', source: { id: 'event', port: 'out-value' }, target: { id: 'tail', port: 'in-value' } },
    ],
    subgraphs: {},
    variables: [],
    viewport: { x: 0, y: 0, zoom: 1 },
  }
}

/** Retain only stop capabilities for cleanup without invariant Engine generics across array elements. */
interface StoppableEngine {
  stop(): StoppableEngine
  whenStopped(): Promise<void>
}
const engines: StoppableEngine[] = []
function setup(EventNode: typeof Step, json = graph(), maxTaskHistory?: number) {
  class Tail extends Step {
    static executor = (ctx: ExecContext) => {
      ctx.setOutput('value', ctx.getInput('value'))
      return ctx.next()
    }
  }
  const runtime = new Runtime(new NodeRegistry().register('event', EventNode).register('tail', Tail))
  const engine = new Engine(runtime, { maxTaskHistory })
  engine.fromJSON(json)
  engines.push(engine)
  return engine
}

afterEach(async () => {
  await Promise.all(engines.splice(0).map((engine) => engine.stop().whenStopped()))
  vi.restoreAllMocks()
})

test('same-name events run concurrently with isolated inputs, outputs, data, and state', async () => {
  const pending = new Map<string, { ctx: ExecContext; finish: () => void }>()
  const resource = { disconnect: () => {} }
  class Receiver extends Step {
    static onActive = (ctx: NodeLifecycleContext) => {
      ctx.state.resource = resource
    }
    static onEvent = (name: string, value: unknown, ctx: ExecContext) => {
      if (name !== 'message') return
      ctx.state!.payload = value
      return { trigger: true }
    }
    static executor = async (ctx: ExecContext) => {
      if (ctx.state!.payload) {
        await new Promise<void>((finish) => {
          pending.set(ctx.taskId!, { ctx, finish })
        })
        ctx.setOutput('value', ctx.state!.payload)
      }
      await ctx.next()
    }
  }
  const json = graph()
  json.nodes[1].data = { attempt: 0 }
  const engine = setup(Receiver, json)
  engine.setCtx({ counter: 0 })
  await engine.process()
  const first = engine.dispatchEvent('message', { text: 'A' })
  const second = engine.dispatchEvent('message', { text: 'B' })
  await vi.waitFor(() => expect(pending.size).toBe(2))
  const [a, b] = [...pending.keys()]
  expect(engine.getTask(a)?.status).toBe('running')
  expect(engine.getTask(b)?.status).toBe('running')
  expect(pending.get(a)!.ctx.state).not.toBe(pending.get(b)!.ctx.state)
  ;(pending.get(a)!.ctx.data as { attempt: number }).attempt = 1
  ;(pending.get(a)!.ctx.ctx as { counter: number }).counter = 1
  expect(pending.get(b)!.ctx.data).toEqual({ attempt: 0 })
  expect(pending.get(b)!.ctx.ctx).toEqual({ counter: 0 })
  expect(engine.options.ctx).toEqual({ counter: 0 })
  expect(pending.get(a)!.ctx.nodeState!.resource).toBe(resource)
  expect(pending.get(b)!.ctx.nodeState!.resource).toBe(resource)
  pending.get(b)!.finish()
  await second
  expect(engine.getTask(a)?.status).toBe('running')
  expect(engine.getNodeStatus('event', a)).toBe('running')
  expect(engine.getNodeExecutionData('tail', b)?.outputs.value).toEqual({ text: 'B' })
  pending.get(a)!.finish()
  await first
  expect(engine.getNodeExecutionData('tail', a)?.outputs.value).toEqual({ text: 'A' })
  expect(engine.getNodeExecutionData('tail', b)?.outputs.value).toEqual({ text: 'B' })
})

test('event submission clones nested arguments without aliases between caller and tasks', async () => {
  const received: unknown[] = []
  class Receiver extends Step {
    static onActive = (ctx: NodeLifecycleContext) => {
      ctx.onEvent('message', (task, value) => {
        const payload = value as { nested: { count: number } }
        payload.nested.count++
        received.push(payload.nested.count)
        task.setOutput('value', payload)
        return task.next()
      })
    }
  }
  const engine = setup(Receiver)
  await engine.process()
  const payload = { nested: { count: 0 } }
  const a = engine.dispatchEvent('message', payload)
  const b = engine.dispatchEvent('message', payload)
  payload.nested.count = 100
  await Promise.all([a, b])
  expect(received).toEqual([1, 1])
  expect(payload.nested.count).toBe(100)
  const tasks = engine.getTasks().filter((task) => task.trigger.type === 'event')
  for (const task of tasks)
    expect(engine.getNodeExecutionData('tail', task.id)?.outputs.value).toEqual({ nested: { count: 1 } })
})

test('cancelling one task settles its wait without affecting others or persistent listeners', async () => {
  const pending = new Map<string, { ctx: ExecContext; finish: () => void }>()
  const deactivate = vi.fn()
  class Receiver extends Step {
    static onActive = (ctx: NodeLifecycleContext) => {
      ctx.onEvent('message', async (task) => {
        await new Promise<void>((finish) => {
          pending.set(task.taskId!, { ctx: task, finish })
        })
        task.setOutput('value', task.taskId)
        await task.next()
      })
    }
    static onDeactivate = deactivate
  }
  const engine = setup(Receiver)
  await engine.process()
  const first = engine.dispatchEvent('message')
  const second = engine.dispatchEvent('message')
  await vi.waitFor(() => expect(pending.size).toBe(2))
  const [a, b] = [...pending.keys()]
  engine.stopTask(a)
  expect((await first)?.status).toBe('cancelled')
  expect(pending.get(a)!.ctx.signal?.aborted).toBe(true)
  expect(pending.get(b)!.ctx.signal?.aborted).toBe(false)
  expect(engine.getTask(b)?.status).toBe('running')
  expect(deactivate).not.toHaveBeenCalled()
  pending.get(b)!.finish()
  await second
  pending.get(a)!.finish()
  await Promise.resolve()
  expect(engine.getTask(a)?.status).toBe('cancelled')
  expect(engine.getNodeExecutionData('tail', b)?.outputs.value).toBe(b)
  expect(engine.status).toBe('running')
})

test('breakpoint waiters are isolated per task and resume independently', async () => {
  class Receiver extends Step {
    static onEvent = (name: string) => ({ trigger: name === 'message' })
  }
  const json = graph()
  json.nodes[1].breakpoint = true
  const engine = setup(Receiver, json)
  const initial = engine.process({ debug: true })
  await vi.waitFor(() => expect(engine.getTasks()[0]?.status).toBe('paused'))
  const initialId = engine.getTasks()[0].id
  const event = engine.dispatchEvent('message')
  await vi.waitFor(() => expect(engine.getTasks().filter((task) => task.status === 'paused')).toHaveLength(2))
  const eventId = engine.latestTaskId!
  engine.resume(eventId)
  await event
  expect(engine.getTask(initialId)?.status).toBe('paused')
  expect(engine.getTask(eventId)?.status).toBe('completed')
  engine.resume(initialId)
  await initial
})

test('one event task failing does not affect others; errors and statuses carry task ids', async () => {
  class Receiver extends Step {
    static onActive = (ctx: NodeLifecycleContext) => {
      ctx.onEvent('message', async (task, value) => {
        if (value === 'fail') throw new Error('Task failed')
        task.setOutput('value', value)
        await task.next()
      })
    }
  }
  const engine = setup(Receiver)
  const changed = vi.fn()
  engine.on('task:node:status:changed', changed)
  await engine.process()
  const [bad, good] = await Promise.all([
    engine.dispatchEvent('message', 'fail'),
    engine.dispatchEvent('message', 'ok'),
  ])
  expect(bad?.status).toBe('failed')
  expect(bad?.errors[0].message).toContain('Task failed')
  expect(good?.status).toBe('completed')
  expect(engine.getNodeExecutionData('tail', good!.id)?.outputs.value).toBe('ok')
  expect(changed.mock.calls.some(([id]) => id === good?.id)).toBe(true)
})

test('history remains queryable by taskId after stop and results are snapshots', async () => {
  class Receiver extends Step {
    static onActive = (ctx: NodeLifecycleContext) => {
      ctx.onEvent('message', async (task, value) => {
        task.setOutput('value', value)
        await task.next()
      })
    }
  }
  const engine = setup(Receiver)
  await engine.process()
  const task = (await engine.dispatchEvent('message', { count: 1 }))!
  engine.stop()
  await engine.whenStopped()
  expect(engine.getNodeExecutionData('tail')).toBeUndefined()
  const data = engine.getNodeExecutionData('tail', task.id)!
  ;(data.outputs.value as { count: number }).count = 999
  engine.getTasks()[0].status = 'failed'
  expect(engine.getTask(task.id)?.status).toBe('completed')
  expect(engine.getNodeExecutionData('tail', task.id)?.outputs.value).toEqual({ count: 1 })
})

test('history limits evict finished tasks only', async () => {
  let finish!: () => void
  class Receiver extends Step {
    static onActive = (ctx: NodeLifecycleContext) => {
      ctx.onEvent('message', async (_task, value) => {
        if (value === 'slow')
          await new Promise<void>((resolve) => {
            finish = resolve
          })
      })
    }
  }
  const engine = setup(Receiver, graph(), 1)
  await engine.process()
  const slow = engine.dispatchEvent('message', 'slow')
  await vi.waitFor(() => expect(finish).toBeDefined())
  const slowId = engine.latestTaskId!
  await engine.dispatchEvent('message', 'fast-1')
  await engine.dispatchEvent('message', 'fast-2')
  expect(engine.getTasks()).toHaveLength(2)
  expect(engine.getTask(slowId)?.status).toBe('running')
  finish()
  await slow
  expect(engine.getTasks()).toHaveLength(1)
})

test('executor-emitted events create child tasks and record parentTaskId', async () => {
  class Receiver extends Step {
    static onActive = (ctx: NodeLifecycleContext) => {
      ctx.onEvent('parent', (task) => {
        task.emitEvent('child', 'data')
      })
      ctx.onEvent('child', (task) => {
        task.setOutput('value', 'child')
      })
    }
  }
  const engine = setup(Receiver)
  await engine.process()
  const parent = await engine.dispatchEvent('parent')
  await vi.waitFor(() => expect(engine.getTasks().some((task) => task.trigger.eventName === 'child')).toBe(true))
  expect(engine.getTasks().find((task) => task.trigger.eventName === 'child')?.parentTaskId).toBe(parent?.id)
})

test('observer errors do not block other observers or tasks, including prototype-named events', async () => {
  class Receiver extends Step {
    static onActive = (ctx: NodeLifecycleContext) => {
      ctx.onEvent('constructor', async (task, value) => {
        task.setOutput('value', value)
        await task.next()
      })
    }
  }
  vi.spyOn(console, 'error').mockImplementation(() => {})
  const engine = setup(Receiver)
  await engine.process()
  const observed = vi.fn()
  engine.on('constructor', () => {
    throw new Error('Observer failed')
  })
  engine.on('constructor', observed)
  engine.emit('constructor', 'ok')
  await vi.waitFor(() =>
    expect(engine.getTasks().find((task) => task.trigger.eventName === 'constructor')?.status).toBe('completed')
  )
  expect(observed).toHaveBeenCalledExactlyOnceWith('ok')
  expect(engine.getNodeExecutionData('tail')?.outputs.value).toBe('ok')
})

test('sources disconnected from Start advance downstream in independent tasks', async () => {
  class Receiver extends Step {
    static onEvent = (name: string, value: unknown, ctx: ExecContext) => {
      if (name !== 'message') return
      ctx.setOutput('value', value)
      return { trigger: true }
    }
  }
  const json = graph()
  json.links.shift()
  json.nodes[1].inputs = json.nodes[1].inputs.filter((port) => port.type !== 'exec')
  const engine = setup(Receiver, json)
  await engine.process()
  expect(engine.getNodeStatus('event')).toBe('idle')
  const task = (await engine.dispatchEvent('message', 'data'))!
  expect(task.status).toBe('completed')
  expect(engine.getNodeExecutionData('tail', task.id)?.outputs.value).toBe('data')
})

test('cancellation during task creation notifications prevents executor calls', async () => {
  const execute = vi.fn()
  class Receiver extends Step {
    static onEvent = () => ({ trigger: true })
    static executor = execute
  }
  const engine = setup(Receiver)
  await engine.process()
  execute.mockClear()
  engine.on('task:created', (task) => {
    engine.stopTask(task.id)
  })
  const task = await engine.dispatchEvent('message')
  expect(task?.status).toBe('cancelled')
  expect(execute).not.toHaveBeenCalled()
})

test('waiting tasks remain incomplete and cannot use another task\'s data', async () => {
  class Receiver extends Step {
    static onActive = (ctx: NodeLifecycleContext) => {
      ctx.onEvent('message', async (task, value) => {
        task.setOutput('value', value)
        await task.next()
      })
    }
  }
  const json = graph()
  json.links[0].target.id = 'tail'
  const engine = setup(Receiver, json)
  await engine.process()
  const initialId = engine.latestTaskId!
  expect(engine.getTask(initialId)?.status).toBe('waiting')
  const event = (await engine.dispatchEvent('message', 'event data'))!
  expect(event.status).toBe('completed')
  expect(engine.getNodeExecutionData('tail', event.id)?.outputs.value).toBe('event data')
  expect(engine.getTask(initialId)?.status).toBe('waiting')
  expect(engine.getNodeExecutionData('tail', initialId)).toBeUndefined()
})

test('subgraph event port values remain task-local', async () => {
  class Receiver extends Step {
    static onEvent = (name: string, value: unknown, ctx: ExecContext) => {
      if (name !== 'message') return
      ctx.setOutput('value', value)
      return { trigger: true }
    }
  }
  const json = graph()
  const child = graph()
  for (const item of child.nodes) item.id = `child-${item.id}`
  for (const link of child.links) {
    link.source.id = `child-${link.source.id}`
    link.target.id = `child-${link.target.id}`
  }
  json.nodes = [node('root-start', 'start')]
  json.links = []
  json.subgraphs.child = { nodes: child.nodes, links: child.links, viewport: child.viewport }
  const engine = setup(Receiver, json)
  await engine.process()
  const [a, b] = await Promise.all([engine.dispatchEvent('message', 'A'), engine.dispatchEvent('message', 'B')])
  expect(engine.getNodeExecutionData('child-tail', a!.id)?.outputs.value).toBe('A')
  expect(engine.getNodeExecutionData('child-tail', b!.id)?.outputs.value).toBe('B')
})

test('old task graph definitions remain queryable after reloading', async () => {
  const engine = setup(Step)
  await engine.process()
  const id = engine.latestTaskId!
  const changed = graph()
  changed.nodes[1].values = { value: 'new configuration' }
  engine.fromJSON(changed)
  const previous = engine.getTaskGraph(id)!
  expect(previous.nodes[1].values).toEqual({})
  previous.nodes[1].values.value = 'mutated'
  expect(engine.getTaskGraph(id)?.nodes[1].values).toEqual({})
})

test('subworkflow event listeners enter the target subgraph from their owning graph', async () => {
  class Receiver extends Step {
    static definition = { ...Step.definition, type: 'subgraph' }
    static onEvent = (name: string) => ({ trigger: name === 'message' })
  }
  const json = graph()
  json.nodes[1].subgraphId = 'child'
  const child = graph()
  child.nodes = [node('child-start', 'start'), node('child-tail', 'tail')]
  child.links = [
    {
      id: 'child-exec',
      source: { id: 'child-start', port: 'out-exec' },
      target: { id: 'child-tail', port: 'in-exec' },
    },
  ]
  json.subgraphs.child = { nodes: child.nodes, links: child.links, viewport: child.viewport }
  const engine = setup(Receiver, json)
  await engine.process()
  const task = (await engine.dispatchEvent('message'))!
  expect(task.status).toBe('completed')
  expect(engine.getNodeStatus('child-tail', task.id)).toBe('completed')
  expect(engine.getNodeStatus('tail', task.id)).toBe('completed')
})

test('engines sharing a registered runtime keep lifecycle state isolated', async () => {
  class Receiver extends Step {
    static onActive = (ctx: NodeLifecycleContext) => {
      ctx.state.owner = (ctx.ctx as { owner: string }).owner
      ctx.onEvent('message', async (task) => {
        task.setOutput('value', task.nodeState!.owner)
        await task.next()
      })
    }
  }
  const first = setup(Receiver)
  first.setCtx({ owner: 'A' })
  await first.process()
  const second = new Engine(first.runtime, { ctx: { owner: 'B' } })
  engines.push(second)
  second.fromJSON(graph())
  await second.process()
  const [a, b] = await Promise.all([first.dispatchEvent('message'), second.dispatchEvent('message')])
  expect(first.getNodeExecutionData('tail', a!.id)?.outputs.value).toBe('A')
  expect(second.getNodeExecutionData('tail', b!.id)?.outputs.value).toBe('B')
})

test('delayed next resolves task dependencies and reruns while respecting history limits', async () => {
  const producers: ExecContext[] = []
  class Receiver extends Step {
    static onActive = (ctx: NodeLifecycleContext) => {
      ctx.onEvent('message', async (task) => {
        if (ctx.nodeId === 'producer') producers.push(task)
        else await task.next()
      })
    }
  }
  const json = graph()
  json.nodes.push(node('producer', 'event'))
  json.links[2].source.id = 'producer'
  const engine = setup(Receiver, json, 1)
  await engine.process()
  const a = (await engine.dispatchEvent('message'))!
  const b = (await engine.dispatchEvent('message'))!
  expect(a.status).toBe('waiting')
  expect(b.status).toBe('waiting')
  producers[0].setOutput('value', 'A')
  await producers[0].next()
  expect(engine.getTask(a.id)?.status).toBe('completed')
  expect(engine.getNodeExecutionData('tail', a.id)?.outputs.value).toBe('A')
  producers[1].setOutput('value', 'B')
  await producers[1].next()
  expect(engine.getTasks().filter((task) => task.status === 'completed')).toHaveLength(1)
  expect(engine.getTask(a.id)).toBeUndefined()
  expect(engine.getNodeExecutionData('tail', b.id)?.outputs.value).toBe('B')
})
