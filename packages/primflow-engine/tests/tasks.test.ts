import { afterEach, expect, test, vi } from 'vitest'
import {
  defineNode,
  NodeExecutionError,
  NodeRegistry,
  type NodeExecutionContext,
  type JsonGraph,
  type JsonNode,
  type NodeLifecycleContext,
} from '@lyx-pj/primflow-model'
import { Engine } from '../src/Engine'
import type { EngineOptions } from '../src/types'

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

function node(id: string, nodeType: string): JsonNode {
  return {
    id,
    definitionId: nodeType,
    kind: nodeType === 'start' ? 'start' : 'default',
    position: { x: 0, y: 0 },
    inputValues: {},
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
function setup(EventNode: typeof Step, json = graph(), options: EngineOptions = {}) {
  const Tail = defineNode({
    ...Step,
    definition: Step.definition,
    executor: (ctx: NodeExecutionContext) => {
      ctx.setOutput('value', ctx.getInput('value'))
      return ctx.next()
    },
  })
  const engine = new Engine(new NodeRegistry().register('event', EventNode).register('tail', Tail), options)
  engine.loadGraph(json)
  engines.push(engine)
  return engine
}

afterEach(async () => {
  await Promise.all(engines.splice(0).map((engine) => engine.stop().whenStopped()))
  vi.useRealTimers()
  vi.restoreAllMocks()
})

test('task state is built in and commits before downstream execution and at terminal return', async () => {
  const Producer = defineNode({
    ...Step,
    definition: Step.definition,
    executor: async (ctx: NodeExecutionContext) => {
      expect(ctx.state.snapshot()).toEqual({ version: 0, values: {} })
      ctx.state.update({ summary: { score: 42 } })
      expect(ctx.state.get('summary')).toBeUndefined()
      ctx.setOutput('value', 'ready')
      await ctx.next()
      expect(ctx.state.get('summary')).toBeUndefined()
    },
  })
  const Tail = defineNode({
    ...Step,
    definition: Step.definition,
    executor: (ctx: NodeExecutionContext) => {
      expect(ctx.state.get('summary')).toEqual({ score: 42 })
      expect(Object.isFrozen(ctx.state.get('summary'))).toBe(true)
      ctx.state.update({ done: true })
    },
  })
  const engine = new Engine(new NodeRegistry().register('event', Producer).register('tail', Tail))
  engines.push(engine)
  engine.loadGraph(graph())
  const committed = vi.fn()
  engine.on('task:state:committed', committed)
  await engine.start()
  const taskId = engine.latestTaskId!
  expect(engine.getTask(taskId)?.status).toBe('completed')
  expect(engine.getTaskState(taskId)).toEqual({ version: 2, values: { summary: { score: 42 }, done: true } })
  expect(committed.mock.calls).toEqual([
    [taskId, { nodeId: 'event', version: 1, changes: { summary: { score: 42 } } }],
    [taskId, { nodeId: 'tail', version: 2, changes: { done: true } }],
  ])
  engine.stop()
  expect(engine.getTaskState(taskId)?.values.done).toBe(true)
})

test('parallel state reducers use the latest committed value and event tasks start independently', async () => {
  const finish: (() => void)[] = []
  const Counter = defineNode({
    ...Step,
    definition: Step.definition,
    onActive: (ctx: NodeLifecycleContext) => {
      ctx.on('increment', (task) => task.state.update({ count: 1 }))
    },
    executor: async (ctx: NodeExecutionContext) => {
      const count = ctx.state.get('count')
      ctx.state.update({ count: 1 })
      await new Promise<void>((resolve) => finish.push(resolve))
      expect(ctx.state.get('count')).toBe(count)
    },
  })
  const json = graph()
  json.nodes[2].definitionId = 'event'
  json.links[1] = { ...json.links[1], source: { id: 'start', port: 'out-exec' } }
  json.links.pop()
  const engine = new Engine(new NodeRegistry().register('event', Counter), {
    state: { count: { initial: 0, reducer: (count: number, delta: number) => count + delta } },
  })
  engines.push(engine)
  engine.loadGraph(json)
  const start = engine.start({ initialState: { count: 10 } })
  await vi.waitFor(() => expect(finish).toHaveLength(2))
  const startId = engine.latestTaskId!
  finish.forEach((resolve) => resolve())
  await start
  expect(engine.getTaskState(startId)).toEqual({ version: 2, values: { count: 12 } })
  const normal = await engine.dispatchEvent('increment')
  const seeded = await engine.dispatchEventWithOptions('increment', { initialState: { count: 7 } })
  expect(engine.getTaskState(normal!.id)?.values.count).toBe(2)
  expect(engine.getTaskState(seeded!.id)?.values.count).toBe(9)
  expect(engine.getTaskState(startId)?.values.count).toBe(12)
})

test('conflicting replacements reject the whole batch without undoing a previous commit', async () => {
  const finish: (() => void)[] = []
  const Writer = defineNode({
    ...Step,
    definition: Step.definition,
    executor: async (ctx: NodeExecutionContext) => {
      const value = String(ctx.data)
      ctx.state.update({ [value]: true, summary: value })
      await new Promise<void>((resolve) => finish.push(resolve))
    },
  })
  const json = graph()
  json.nodes[1].data = 'first'
  json.nodes[2].data = 'second'
  json.nodes[2].definitionId = 'event'
  json.links[1] = { ...json.links[1], source: { id: 'start', port: 'out-exec' } }
  json.links.pop()
  const engine = setup(Writer, json)
  vi.spyOn(console, 'error').mockImplementation(() => {})
  const start = engine.start()
  await vi.waitFor(() => expect(finish).toHaveLength(2))
  finish[0]()
  await vi.waitFor(() => expect(engine.getTaskState(engine.latestTaskId!)?.version).toBe(1))
  finish[1]()
  await start
  const taskId = engine.latestTaskId!
  expect(engine.getTask(taskId)?.errors).toEqual([{ nodeId: 'tail', message: expect.stringContaining('summary') }])
  expect(engine.getTaskState(taskId)?.values).toEqual({ first: true, summary: 'first' })
})

test('cancellation preserves committed state and discards pending and late updates', async () => {
  let active!: NodeExecutionContext
  let release!: () => void
  let returned!: () => void
  const finished = new Promise<void>((resolve) => { returned = resolve })
  const Writer = defineNode({
    ...Step,
    definition: Step.definition,
    executor: async (ctx: NodeExecutionContext) => {
      ctx.state.update({ done: true })
      await ctx.next()
      ctx.state.update({ pending: true })
      active = ctx
      await new Promise<void>((resolve) => { release = resolve })
      ctx.state.update({ late: true })
      await ctx.next()
      returned()
    },
  })
  const engine = setup(Writer)
  const running = engine.start()
  await vi.waitFor(() => expect(active).toBeDefined())
  const taskId = engine.latestTaskId!
  engine.stopTask(taskId)
  release()
  await Promise.all([running, finished])
  expect(engine.getTask(taskId)?.status).toBe('cancelled')
  expect(engine.getTaskState(taskId)).toEqual({ version: 1, values: { done: true } })
})

test('delayed handoffs commit only their newly staged updates', async () => {
  let saved!: NodeExecutionContext
  const Writer = defineNode({
    ...Step,
    definition: Step.definition,
    executor: (ctx: NodeExecutionContext) => {
      saved = ctx
    },
  })
  const engine = setup(Writer, { ...graph(), links: graph().links.slice(0, 1) }, { maxTaskHistory: 1 })
  await engine.start()
  const taskId = engine.latestTaskId!
  saved.state.update({ step: 1 })
  await saved.next()
  await saved.next()
  saved.state.update({ step: 2 })
  await saved.next()
  expect(engine.getTaskState(taskId)).toEqual({ version: 2, values: { step: 2 } })
  await engine.dispatchEvent('idle')
  expect(engine.getTaskState(taskId)).toBeUndefined()
})

test('standalone executions always get fresh state and accept initial values', async () => {
  const snapshots = vi.fn()
  const Writer = defineNode({
    ...Step,
    definition: Step.definition,
    executor: (ctx: NodeExecutionContext) => {
      snapshots(ctx.state.snapshot())
      ctx.state.update({ step: 2 })
    },
  })
  const engine = new Engine(new NodeRegistry().register('writer', Writer))
  const instance = engine.createNodeInstance('writer')
  await engine.executeNode(instance, { initialState: { step: 1 } })
  await engine.executeNode(instance)
  expect(snapshots.mock.calls).toEqual([[{ version: 0, values: { step: 1 } }], [{ version: 0, values: {} }]])
  expect(engine.getTasks()).toEqual([])
})

test('a rejected state batch prevents handoff even if the executor calls next again', async () => {
  const tail = vi.fn()
  const Writer = defineNode({
    ...Step,
    definition: Step.definition,
    executor: async (ctx: NodeExecutionContext) => {
      ctx.state.update({ staged: true, count: -1 })
      const handoffs = await Promise.allSettled([ctx.next(), ctx.next()])
      expect(handoffs.map(({ status }) => status)).toEqual(['rejected', 'rejected'])
    },
  })
  const Tail = defineNode({
    ...Step,
    definition: Step.definition,
    executor: tail,
  })
  vi.spyOn(console, 'error').mockImplementation(() => {})
  const engine = new Engine(new NodeRegistry().register('event', Writer).register('tail', Tail), {
    state: { count: { initial: 0, validate: (value: number) => value >= 0 } },
  })
  engines.push(engine)
  engine.loadGraph(graph())
  await expect(engine.start({ initialState: { count: -1 } })).rejects.toThrow('did not pass validation')
  await engine.start()
  const taskId = engine.latestTaskId!
  expect(engine.getTask(taskId)?.errors).toHaveLength(1)
  expect(engine.getTaskState(taskId)).toEqual({ version: 0, values: { count: 0 } })
  expect(tail).not.toHaveBeenCalled()
})

test('an ordinary subgraph commits to the same task state as its caller', async () => {
  const Writer = defineNode({
    ...Step,
    definition: Step.definition,
    executor: (ctx: NodeExecutionContext) => {
      ctx.state.update({ child: 'ready' })
      return ctx.next()
    },
  })
  const Tail = defineNode({
    ...Step,
    definition: Step.definition,
    executor: (ctx: NodeExecutionContext) => ctx.state.update({ parent: ctx.state.get('child') ?? null }),
  })
  const json = graph()
  json.nodes[1].definitionId = 'subgraph'
  json.nodes[1].targetGraphId = 'child'
  json.links.pop()
  json.subgraphs.child = {
    nodes: [node('child-start', 'start'), node('child-writer', 'writer')],
    links: [{
      id: 'child-exec',
      source: { id: 'child-start', port: 'out-exec' },
      target: { id: 'child-writer', port: 'in-exec' },
    }],
    viewport: json.viewport,
  }
  const engine = new Engine(new NodeRegistry().register('writer', Writer).register('tail', Tail))
  engines.push(engine)
  engine.loadGraph(json)
  await engine.start()
  const taskId = engine.latestTaskId!
  expect(engine.getTaskState(taskId)).toEqual({ version: 2, values: { child: 'ready', parent: 'ready' } })
})

test('same-name events run concurrently with isolated inputs, outputs, data, and state', async () => {
  const pending = new Map<string, { ctx: NodeExecutionContext; finish: () => void }>()
  const resource = { disconnect: () => {} }
  const Receiver = defineNode({
    ...Step,
    definition: Step.definition,
    onActive: (ctx: NodeLifecycleContext) => {
      ctx.nodeState.resource = resource
    },
    onEvent: (name: string, value: unknown, ctx: NodeExecutionContext) => {
      if (name !== 'message') return
      ctx.taskState!.payload = value
      return { trigger: true }
    },
    executor: async (ctx: NodeExecutionContext) => {
      if (ctx.taskState!.payload) {
        await new Promise<void>((finish) => {
          pending.set(ctx.taskId!, { ctx, finish })
        })
        ctx.setOutput('value', ctx.taskState!.payload)
      }
      await ctx.next()
    },
  })
  const json = graph()
  json.nodes[1].data = { attempt: 0 }
  const engine = setup(Receiver, json)
  engine.setContext({ counter: 0 })
  await engine.start()
  const first = engine.dispatchEvent('message', { text: 'A' })
  const second = engine.dispatchEvent('message', { text: 'B' })
  await vi.waitFor(() => expect(pending.size).toBe(2))
  const [a, b] = [...pending.keys()]
  expect(engine.getTask(a)?.status).toBe('running')
  expect(engine.getTask(b)?.status).toBe('running')
  expect(pending.get(a)!.ctx.taskState).not.toBe(pending.get(b)!.ctx.taskState)
  ;(pending.get(a)!.ctx.data as { attempt: number }).attempt = 1
  ;(pending.get(a)!.ctx.context as { counter: number }).counter = 1
  expect(pending.get(b)!.ctx.data).toEqual({ attempt: 0 })
  expect(pending.get(b)!.ctx.context).toEqual({ counter: 0 })
  expect(engine.options.context).toEqual({ counter: 0 })
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
  const Receiver = defineNode({
    ...Step,
    definition: Step.definition,
    onActive: (ctx: NodeLifecycleContext) => {
      ctx.on('message', (task, value) => {
        const payload = value as { nested: { count: number } }
        payload.nested.count++
        received.push(payload.nested.count)
        task.setOutput('value', payload)
        return task.next()
      })
    },
  })
  const engine = setup(Receiver)
  await engine.start()
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
  const pending = new Map<string, { ctx: NodeExecutionContext; finish: () => void }>()
  const deactivate = vi.fn()
  const Receiver = defineNode({
    ...Step,
    definition: Step.definition,
    onActive: (ctx: NodeLifecycleContext) => {
      ctx.on('message', async (task) => {
        await new Promise<void>((finish) => {
          pending.set(task.taskId!, { ctx: task, finish })
        })
        task.setOutput('value', task.taskId)
        await task.next()
      })
    },
    onDeactivate: deactivate,
  })
  const engine = setup(Receiver)
  await engine.start()
  const first = engine.dispatchEvent('message')
  const second = engine.dispatchEvent('message')
  await vi.waitFor(() => expect(pending.size).toBe(2))
  const [a, b] = [...pending.keys()]
  engine.stopTask(a)
  expect((await first)?.status).toBe('cancelled')
  expect(engine.getNodeStatus('event', a)).toBe('cancelled')
  expect(engine.getNodeStatus('tail', a)).toBe('pending')
  expect(engine.getNodeStatus('start', a)).toBe('idle')
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
  const Receiver = defineNode({
    ...Step,
    definition: Step.definition,
    onEvent: (name: string) => ({ trigger: name === 'message' }),
  })
  const json = graph()
  json.nodes[1].breakpoint = true
  const engine = setup(Receiver, json)
  const initial = engine.start({ debug: true })
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

test('a business interruption waits for an answer after the debug breakpoint resumes', async () => {
  const before = vi.fn()
  const Approval = defineNode({
    ...Step,
    definition: Step.definition,
    executor: async (ctx: NodeExecutionContext) => {
      before()
      const answer = await ctx.interrupt({ question: 'Approve?' })
      ctx.setOutput('value', answer)
      await ctx.next()
    },
  })
  const json = graph()
  json.nodes[1].breakpoint = true
  const engine = setup(Approval, json)
  const run = engine.start({ debug: true })
  await vi.waitFor(() => expect(engine.getTask(engine.latestTaskId!)?.status).toBe('paused'))
  const taskId = engine.latestTaskId!
  expect(before).not.toHaveBeenCalled()
  engine.resume(taskId)
  await vi.waitFor(() => expect(engine.getTask(taskId)?.status).toBe('interrupted'))
  const task = engine.getTask(taskId)!
  expect(task.pausedNode).toBeNull()
  expect(task.interrupts).toEqual([{ id: expect.any(String), nodeId: 'event', subgraphId: '', value: { question: 'Approve?' } }])
  expect(engine.getNodeStatus('event', taskId)).toBe('interrupted')
  engine.resume(taskId)
  expect(engine.getTask(taskId)?.status).toBe('interrupted')
  const { id } = task.interrupts[0]
  expect(engine.resumeInterrupt('different-task', id, true)).toBe(false)
  expect(engine.resumeInterrupt(taskId, id, { approved: false })).toBe(true)
  expect(engine.resumeInterrupt(taskId, id, true)).toBe(false)
  await run
  expect(before).toHaveBeenCalledTimes(1)
  expect(engine.getTask(taskId)).toMatchObject({ status: 'completed', interrupts: [] })
  expect(engine.getNodeExecutionData('tail', taskId)?.outputs.value).toEqual({ approved: false })
  const trace = engine.getTaskTrace(taskId)!
  const activationId = trace.activations.find(({ nodeId }) => nodeId === 'event')?.id
  expect(trace.events.filter((event) => event.type === 'activation:breakpoint' || event.type === 'activation:interrupt'))
    .toMatchObject([
      { type: 'activation:breakpoint', activationId },
      { type: 'activation:interrupt', activationId, interruptId: id, status: 'requested' },
      { type: 'activation:interrupt', activationId, interruptId: id, status: 'resumed' },
    ])
})

test('stopping an interrupted task clears the request and prevents late resume', async () => {
  const continued = vi.fn()
  const Approval = defineNode({
    ...Step,
    definition: Step.definition,
    executor: async (ctx: NodeExecutionContext) => {
      await ctx.interrupt('Approve?')
      continued()
    },
  })
  const engine = setup(Approval)
  const run = engine.start()
  await vi.waitFor(() => expect(engine.getTask(engine.latestTaskId!)?.status).toBe('interrupted'))
  const taskId = engine.latestTaskId!
  const { id } = engine.getTask(taskId)!.interrupts[0]
  engine.stopTask(taskId)
  await run
  expect(engine.getTask(taskId)).toMatchObject({ status: 'cancelled', interrupts: [], errors: [] })
  expect(engine.getNodeStatus('event', taskId)).toBe('cancelled')
  expect(engine.resumeInterrupt(taskId, id, true)).toBe(false)
  expect(continued).not.toHaveBeenCalled()
})

test('one event task failing does not affect others; errors and statuses carry task ids', async () => {
  const Receiver = defineNode({
    ...Step,
    definition: Step.definition,
    onActive: (ctx: NodeLifecycleContext) => {
      ctx.on('message', async (task, value) => {
        if (value === 'fail') throw new Error('Task failed')
        task.setOutput('value', value)
        await task.next()
      })
    },
  })
  const engine = setup(Receiver)
  const changed = vi.fn()
  engine.on('task:node:status:changed', changed)
  await engine.start()
  const [bad, good] = await Promise.all([
    engine.dispatchEvent('message', 'fail'),
    engine.dispatchEvent('message', 'ok'),
  ])
  expect(bad?.status).toBe('failed')
  expect(bad?.errors[0].message).toContain('Task failed')
  expect(engine.getNodeStatus('event', bad!.id)).toBe('failed')
  expect(engine.getNodeStatus('event', good!.id)).toBe('completed')
  expect(good?.status).toBe('completed')
  expect(engine.getNodeExecutionData('tail', good!.id)?.outputs.value).toBe('ok')
  expect(changed.mock.calls.some(([id]) => id === good?.id)).toBe(true)
})

test('history remains queryable by taskId after stop and results are snapshots', async () => {
  const Receiver = defineNode({
    ...Step,
    definition: Step.definition,
    onActive: (ctx: NodeLifecycleContext) => {
      ctx.on('message', async (task, value) => {
        task.setOutput('value', value)
        await task.next()
      })
    },
  })
  const engine = setup(Receiver)
  await engine.start()
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
  const Receiver = defineNode({
    ...Step,
    definition: Step.definition,
    onActive: (ctx: NodeLifecycleContext) => {
      ctx.on('message', async (_task, value) => {
        if (value === 'slow')
          await new Promise<void>((resolve) => {
            finish = resolve
          })
      })
    },
  })
  const engine = setup(Receiver, graph(), { maxTaskHistory: 1 })
  await engine.start()
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
  const Receiver = defineNode({
    ...Step,
    definition: Step.definition,
    onActive: (ctx: NodeLifecycleContext) => {
      ctx.on('parent', (task) => {
        task.emitEvent('child', 'data')
      })
      ctx.on('child', (task) => {
        task.setOutput('value', 'child')
      })
    },
  })
  const engine = setup(Receiver)
  await engine.start()
  const parent = await engine.dispatchEvent('parent')
  await vi.waitFor(() => expect(engine.getTasks().some((task) => task.trigger.eventName === 'child')).toBe(true))
  const child = engine.getTasks().find((task) => task.trigger.eventName === 'child')!
  expect(child.parentTaskId).toBe(parent?.id)
  expect(engine.getNodeActivation(parent!.id, child.parentActivationId!)).toMatchObject({ nodeId: 'event', kind: 'event-handler' })
  expect(engine.getTaskTrace(parent!.id)?.events).toContainEqual(expect.objectContaining({
    type: 'activation:emit', activationId: child.parentActivationId, eventName: 'child',
  }))
})

test('observer errors do not block other observers or tasks, including prototype-named events', async () => {
  const Receiver = defineNode({
    ...Step,
    definition: Step.definition,
    onActive: (ctx: NodeLifecycleContext) => {
      ctx.on('constructor', async (task, value) => {
        task.setOutput('value', value)
        await task.next()
      })
    },
  })
  vi.spyOn(console, 'error').mockImplementation(() => {})
  const engine = setup(Receiver)
  await engine.start()
  const observed = vi.fn()
  engine.on('task:created', () => {
    throw new Error('Observer failed')
  })
  engine.on('task:created', observed)
  await engine.dispatchEvent('constructor', 'ok')
  await vi.waitFor(() =>
    expect(engine.getTasks().find((task) => task.trigger.eventName === 'constructor')?.status).toBe('completed')
  )
  expect(observed).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
    trigger: { type: 'event', eventName: 'constructor', payload: ['ok'] },
  }))
  expect(engine.getNodeExecutionData('tail')?.outputs.value).toBe('ok')
})

test('sources disconnected from Start advance downstream in independent tasks', async () => {
  const Receiver = defineNode({
    ...Step,
    definition: Step.definition,
    onEvent: (name: string, value: unknown, ctx: NodeExecutionContext) => {
      if (name !== 'message') return
      ctx.setOutput('value', value)
      return { trigger: true }
    },
  })
  const json = graph()
  json.links.shift()
  json.nodes[1].inputs = json.nodes[1].inputs.filter((port) => port.type !== 'exec')
  const engine = setup(Receiver, json)
  await engine.start()
  expect(engine.getNodeStatus('event')).toBe('idle')
  const task = (await engine.dispatchEvent('message', 'data'))!
  expect(task.status).toBe('completed')
  expect(engine.getNodeExecutionData('tail', task.id)?.outputs.value).toBe('data')
})

test('cancellation during task creation notifications prevents executor calls', async () => {
  const execute = vi.fn()
  const Receiver = defineNode({
    ...Step,
    definition: Step.definition,
    onEvent: () => ({ trigger: true }),
    executor: execute,
  })
  const engine = setup(Receiver)
  await engine.start()
  execute.mockClear()
  engine.on('task:created', (task) => {
    engine.stopTask(task.id)
  })
  const task = await engine.dispatchEvent('message')
  expect(task?.status).toBe('cancelled')
  expect(execute).not.toHaveBeenCalled()
})

test('waiting tasks remain incomplete and cannot use another task\'s data', async () => {
  const Receiver = defineNode({
    ...Step,
    definition: Step.definition,
    onActive: (ctx: NodeLifecycleContext) => {
      ctx.on('message', async (task, value) => {
        task.setOutput('value', value)
        await task.next()
      })
    },
  })
  const json = graph()
  json.links[0].target.id = 'tail'
  const engine = setup(Receiver, json)
  await engine.start()
  const initialId = engine.latestTaskId!
  expect(engine.getTask(initialId)?.status).toBe('waiting')
  const blocked = engine.getTaskTrace(initialId)?.activations.find(({ status }) => status === 'waiting')
  expect(blocked).toMatchObject({ nodeId: 'tail', waitingFor: [{ inputPortId: 'in-value', sources: [
    { nodeId: 'event', outputPort: 'value' },
  ] }] })
  const event = (await engine.dispatchEvent('message', 'event data'))!
  expect(event.status).toBe('completed')
  expect(engine.getNodeExecutionData('tail', event.id)?.outputs.value).toBe('event data')
  expect(engine.getTask(initialId)?.status).toBe('waiting')
  expect(engine.getNodeExecutionData('tail', initialId)).toBeUndefined()
  engine.stopTask(initialId)
  expect(engine.getNodeActivation(initialId, blocked!.id)).toMatchObject({
    status: 'cancelled', waitingFor: blocked!.waitingFor,
  })
  expect(engine.getNodeStatus('tail', initialId)).toBe('cancelled')
  expect(engine.getNodeStatus('tail', event.id)).toBe('completed')
})

test('task trace keeps separate results for overlapping activations of the same node', async () => {
  let calls = 0
  const received: unknown[] = []
  let release!: () => void
  const secondCompleted = new Promise<void>((resolve) => { release = resolve })
  const Receiver = defineNode({
    ...Step,
    definition: Step.definition,
    onActive: (ctx: NodeLifecycleContext) => {
      ctx.on('message', (task) => task.next())
      ctx.on('message', (task) => task.next())
    },
  })
  const Tail = defineNode({
    ...Step,
    definition: Step.definition,
    executor: async (ctx: NodeExecutionContext) => {
      const value = ++calls
      ctx.setOutput('value', value)
      if (value === 1) await secondCompleted
      await ctx.next()
      if (value === 2) release()
    },
  })
  const Sink = defineNode({
    ...Step,
    definition: Step.definition,
    executor: (ctx: NodeExecutionContext) => { received.push(ctx.getInput('value')) },
  })
  const engine = new Engine(new NodeRegistry().register('event', Receiver).register('tail', Tail).register('sink', Sink), {
    trace: { captureData: true },
  })
  engines.push(engine)
  const json = graph()
  json.nodes.push(node('sink', 'sink'))
  json.links = [json.links[1],
    { id: 'tail-sink', source: { id: 'tail', port: 'out-exec' }, target: { id: 'sink', port: 'in-exec' } },
    { id: 'tail-sink-value', source: { id: 'tail', port: 'out-value' }, target: { id: 'sink', port: 'in-value' } },
  ]
  engine.loadGraph(json)
  await engine.start()
  const event = (await engine.dispatchEvent('message'))!
  const trace = engine.getTaskTrace(event.id)!
  const records = trace.activations.filter(({ nodeId }) => nodeId === 'tail')
  expect(records.map(({ status, data }) => [status, data?.outputs.value])).toEqual([['completed', 1], ['completed', 2]])
  expect(new Set(records.map(({ id }) => id)).size).toBe(2)
  expect(received).toEqual([2, 1])
  expect(trace.activations.filter(({ nodeId }) => nodeId === 'sink').map(({ parentActivationId, inputSources }) => [
    parentActivationId, inputSources?.[0].producer?.activationId,
  ])).toEqual([[records[1].id, records[1].id], [records[0].id, records[0].id]])
  for (const record of records) {
    expect(engine.getNodeActivation(event.id, record.id)).toEqual(record)
    expect(trace.activations.find(({ id }) => id === record.parentActivationId)?.kind).toBe('event-handler')
  }
  records[0].data!.outputs.value = 'changed'
  expect(engine.getNodeActivation(event.id, records[0].id)?.data?.outputs.value).toBe(1)
  engine.stop()
  expect(engine.getNodeActivation(event.id, records[1].id)?.data?.outputs.value).toBe(2)
})

test('trace limits preserve current waiters and report eviction without capturing port values by default', async () => {
  const json = graph()
  json.links[0].target.id = 'tail'
  const engine = setup(Step, json, { trace: { maxEntries: 1 } })
  await engine.start()
  const taskId = engine.latestTaskId!
  const trace = engine.getTaskTrace(taskId)!
  expect(trace.events).toMatchObject([{ type: 'task:status', status: 'waiting' }])
  expect(trace.droppedEvents).toBeGreaterThan(0)
  expect(trace.activations.map(({ status }) => status)).toEqual(['completed', 'waiting'])
  expect(trace.activations[0].data).toBeUndefined()
  engine.stopTask(taskId)
  const stopped = engine.getTaskTrace(taskId)!
  expect(stopped.droppedActivations).toBe(1)
  expect(stopped.activations).toMatchObject([{ status: 'cancelled', nodeId: 'tail' }])
  expect(engine.getNodeActivation(taskId, trace.activations[0].id)).toBeUndefined()
})

test('trace can be disabled without changing execution', async () => {
  const engine = setup(Step, graph(), { trace: false })
  await engine.start()
  const taskId = engine.latestTaskId!
  expect(engine.getTask(taskId)?.status).toBe('completed')
  expect(engine.getTaskTrace(taskId)).toBeUndefined()
})

test('subgraph event port values remain task-local', async () => {
  const Receiver = defineNode({
    ...Step,
    definition: Step.definition,
    onEvent: (name: string, value: unknown, ctx: NodeExecutionContext) => {
      if (name !== 'message') return
      ctx.setOutput('value', value)
      return { trigger: true }
    },
  })
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
  await engine.start()
  const [a, b] = await Promise.all([engine.dispatchEvent('message', 'A'), engine.dispatchEvent('message', 'B')])
  expect(engine.getNodeExecutionData('child-tail', a!.id)?.outputs.value).toBe('A')
  expect(engine.getNodeExecutionData('child-tail', b!.id)?.outputs.value).toBe('B')
})

test('old task graph definitions remain queryable after reloading', async () => {
  const engine = setup(Step)
  await engine.start()
  const id = engine.latestTaskId!
  const changed = graph()
  changed.nodes[1].inputValues = { value: 'new configuration' }
  engine.loadGraph(changed)
  const previous = engine.getTaskGraph(id)!
  expect(previous.nodes[1].inputValues).toEqual({})
  previous.nodes[1].inputValues.value = 'mutated'
  expect(engine.getTaskGraph(id)?.nodes[1].inputValues).toEqual({})
})

test('subworkflow event listeners enter the target subgraph from their owning graph', async () => {
  const Receiver = defineNode({
    ...Step,
    definition: { ...Step.definition, type: 'subgraph' },
    onEvent: (name: string) => ({ trigger: name === 'message' }),
  })
  const json = graph()
  json.nodes[1].targetGraphId = 'child'
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
  await engine.start()
  const task = (await engine.dispatchEvent('message'))!
  expect(task.status).toBe('completed')
  expect(engine.getNodeStatus('child-tail', task.id)).toBe('completed')
  expect(engine.getNodeStatus('tail', task.id)).toBe('completed')
})

test('engines sharing node definitions keep lifecycle state isolated', async () => {
  const Receiver = defineNode({
    ...Step,
    definition: Step.definition,
    onActive: (ctx: NodeLifecycleContext) => {
      ctx.nodeState.owner = (ctx.context as { owner: string }).owner
      ctx.on('message', async (task) => {
        task.setOutput('value', task.nodeState!.owner)
        await task.next()
      })
    },
  })
  const Tail = defineNode({
    ...Step,
    definition: Step.definition,
    executor: (ctx: NodeExecutionContext) => {
      ctx.setOutput('value', ctx.getInput('value'))
      return ctx.next()
    },
  })
  const registry = new NodeRegistry().register('event', Receiver).register('tail', Tail)
  const first = new Engine(registry, { context: { owner: 'A' } })
  const second = new Engine(registry, { context: { owner: 'B' } })
  engines.push(first, second)
  first.loadGraph(graph())
  second.loadGraph(graph())
  await first.start()
  await second.start()
  const [a, b] = await Promise.all([first.dispatchEvent('message'), second.dispatchEvent('message')])
  expect(first.getNodeExecutionData('tail', a!.id)?.outputs.value).toBe('A')
  expect(second.getNodeExecutionData('tail', b!.id)?.outputs.value).toBe('B')
})

test('delayed next resolves task dependencies and reruns while respecting history limits', async () => {
  const producers: NodeExecutionContext[] = []
  const Receiver = defineNode({
    ...Step,
    definition: Step.definition,
    onActive: (ctx: NodeLifecycleContext) => {
      ctx.on('message', async (task) => {
        if (ctx.nodeId === 'producer') producers.push(task)
        else await task.next()
      })
    },
  })
  const json = graph()
  json.nodes.push(node('producer', 'event'))
  json.links[2].source.id = 'producer'
  const engine = setup(Receiver, json, { maxTaskHistory: 1 })
  await engine.start()
  const a = (await engine.dispatchEvent('message'))!
  const b = (await engine.dispatchEvent('message'))!
  expect(a.status).toBe('waiting')
  expect(b.status).toBe('waiting')
  const waitingId = engine.getTaskTrace(a.id)!.activations.find(({ status }) => status === 'waiting')!.id
  producers[0].setOutput('value', 'A')
  await producers[0].next()
  expect(engine.getTask(a.id)?.status).toBe('completed')
  expect(engine.getNodeExecutionData('tail', a.id)?.outputs.value).toBe('A')
  const trace = engine.getTaskTrace(a.id)!
  const producerId = trace.activations.find(({ nodeId }) => nodeId === 'producer')!.id
  expect(engine.getNodeActivation(a.id, waitingId)).toMatchObject({
    status: 'completed',
    inputSources: [{ inputPortId: 'in-value', producer: { nodeId: 'producer', outputPort: 'value', activationId: producerId } }],
  })
  expect(trace.events.filter((event) => event.type === 'activation:status' && event.activationId === waitingId)).toMatchObject([
    { status: 'pending' }, { status: 'waiting' }, { status: 'pending' }, { status: 'running' }, { status: 'completed' },
  ])
  producers[1].setOutput('value', 'B')
  await producers[1].next()
  expect(engine.getTasks().filter((task) => task.status === 'completed')).toHaveLength(1)
  expect(engine.getTask(a.id)).toBeUndefined()
  expect(engine.getTaskTrace(a.id)).toBeUndefined()
  expect(engine.getNodeExecutionData('tail', b.id)?.outputs.value).toBe('B')
})

test('once claims one concurrent event and schedules the node executor with the event payload', async () => {
  const received = vi.fn()
  const executed = vi.fn()
  const Source = defineNode({
    ...Step,
    definition: Step.definition,
    retryPolicy: { idempotent: true, maxRetries: 1 },
    onActive: (ctx: NodeLifecycleContext) => {
      ctx.once('message', ({ executeSelf }, message) => {
        received(message)
        return executeSelf()
      })
    },
    executor: (ctx: NodeExecutionContext) => {
      if (!ctx.event) return
      executed(ctx.event.payload[0])
      if (executed.mock.calls.length === 1) {
        throw new NodeExecutionError('Temporary failure', { kind: 'execution', code: 'TEMPORARY', retryable: true })
      }
      ctx.setOutput('value', ctx.event.payload[0])
      return ctx.next()
    },
  })
  const engine = setup(Source)
  await engine.start()
  await Promise.all([engine.dispatchEvent('message', 'first'), engine.dispatchEvent('message', 'second')])
  expect(received.mock.calls).toEqual([['first']])
  expect(executed.mock.calls).toEqual([['first'], ['first']])
  const event = engine.getTasks().find((task) => task.trigger.payload?.[0] === 'first')!
  expect(engine.getNodeExecutionData('tail', event.id)?.outputs.value).toBe('first')
})

test('retries an idempotent executor with isolated outputs and commits only the successful attempt', async () => {
  let calls = 0
  const Retrying = defineNode({
    ...Step,
    definition: Step.definition,
    retryPolicy: { idempotent: true, maxRetries: 1 },
    executor: (ctx: NodeExecutionContext) => {
      calls++
      if (calls === 1) {
        ctx.state.update({ discarded: true })
        ctx.setOutput('value', 'discarded')
        throw new NodeExecutionError('Temporary failure', { kind: 'execution', code: 'TEMPORARY', retryable: true })
      }
      expect(ctx.state.get('discarded')).toBeUndefined()
      expect(ctx.retry).toMatchObject({ number: 2, remainingRetries: 0, previousFailure: { code: 'TEMPORARY' } })
      ctx.setOutput('value', 'recovered')
      return ctx.next()
    },
  })
  const engine = setup(Retrying)
  await engine.start()
  const task = engine.getTasks()[0]
  expect(calls).toBe(2)
  expect(task.status).toBe('completed')
  expect(task.attempts?.map(({ status }) => status)).toEqual(['failed', 'completed'])
  const trace = engine.getTaskTrace(task.id)!
  const activationId = trace.activations.find(({ nodeId }) => nodeId === 'event')?.id
  expect(task.attempts?.map((attempt) => attempt.activationId)).toEqual([activationId, activationId])
  expect(trace.events.filter(({ type }) => type === 'activation:attempt')).toMatchObject([
    { status: 'running', activationId }, { status: 'failed', activationId },
    { status: 'running', activationId }, { status: 'completed', activationId },
  ])
  expect(engine.getNodeExecutionData('tail', task.id)?.outputs.value).toBe('recovered')
})

test.each([true, false])('replays the traced input path and publishes replay state only on success (%s)', async (recovered) => {
  const calls: string[] = []
  const A = defineNode({
    ...Step,
    definition: Step.definition,
    executor: (ctx: NodeExecutionContext) => {
      calls.push('a')
      ctx.setOutput('value', 1)
      return ctx.next()
    },
  })
  const B = defineNode({
    ...Step,
    definition: Step.definition,
    retryPolicy: { idempotent: true, maxRetries: 1 },
    outputValidators: { value: (value: unknown) => value === 1 },
    executor: (ctx: NodeExecutionContext) => {
      calls.push('b')
      if (ctx.retry!.number > 1) {
        expect(ctx.retry?.previousFailure?.details).toEqual({ missing: ['value'] })
      }
      ctx.setOutput('value', ctx.getInput('value'))
      return ctx.next()
    },
  })
  const C = defineNode({
    ...Step,
    definition: Step.definition,
    retryPolicy: { idempotent: true, maxRetries: 1 },
    outputValidators: { value: (value: unknown) => value === 1 },
    executor: (ctx: NodeExecutionContext) => {
      calls.push('c')
      const fresh = calls.filter((id) => id === 'c').length > 1
      if (fresh) ctx.state.update({ refreshed: true })
      ctx.setOutput('value', fresh && recovered ? ctx.getInput('value') : 0)
      return ctx.next()
    },
  })
  const D = defineNode({
    ...Step,
    definition: Step.definition,
    retryPolicy: { idempotent: true, maxRetries: 1 },
    executor: (ctx: NodeExecutionContext) => {
      calls.push('d')
      if (ctx.getInput('value') !== 1) {
        throw new NodeExecutionError('Invalid data', { kind: 'input', code: 'INVALID', retryable: true, inputPort: 'value', details: { missing: ['value'] },
        })
      }
      expect(ctx.state.get('refreshed')).toBe(true)
      ctx.setOutput('value', 1)
      return ctx.next()
    },
  })
  const Tail = defineNode({
    ...Step,
    definition: Step.definition,
    executor: () => { calls.push('tail') },
  })
  const json = graph()
  json.nodes = [node('start', 'start'), ...['a', 'b', 'c', 'd', 'tail'].map((id) => node(id, id))]
  json.links = [['start', 'a'], ['a', 'b'], ['b', 'c'], ['c', 'd'], ['d', 'tail']].flatMap(([source, target]) => [
    { id: `${source}-${target}`, source: { id: source, port: 'out-exec' }, target: { id: target, port: 'in-exec' } },
    ...(source === 'start' ? [] : [
      { id: `${source}-${target}-value`, source: { id: source, port: 'out-value' }, target: { id: target, port: 'in-value' } },
    ]),
  ])
  const registry = new NodeRegistry().register('a', A).register('b', B).register('c', C).register('d', D).register('tail', Tail)
  const engine = new Engine(registry)
  engines.push(engine)
  engine.loadGraph(json)
  vi.spyOn(console, 'error').mockImplementation(() => {})
  await engine.start()
  expect(calls).toEqual(['a', 'b', 'c', 'd', 'b', 'c', 'd', ...(recovered ? ['tail'] : [])])
  const task = engine.getTasks()[0]
  expect(task.status).toBe(recovered ? 'completed' : 'failed')
  expect(engine.getTaskState(task.id)?.values.refreshed).toBe(recovered ? true : undefined)
  const d = task.attempts!.filter((attempt) => attempt.nodeId === 'd')
  expect(d[0].failure).toMatchObject({ inputPort: 'value', inputSource: { nodeId: 'c', port: 'value' } })
  expect(d[1].retryFrom).toBe('b')
  if (!recovered) expect(d[1].failure?.inputSource?.attemptId).not.toBe(d[0].failure?.inputSource?.attemptId)
})


test('does not retry a non-idempotent node and forwards its explicit fallback data', async () => {
  const executions = vi.fn()
  const Optional = defineNode({
    ...Step,
    definition: Step.definition,
    retryPolicy: { idempotent: false, maxRetries: 3, fallback: { port: 'next', outputs: { value: 'default' } } },
    executor: () => {
      executions()
      throw new NodeExecutionError('Unavailable', { kind: 'execution', code: 'UNAVAILABLE', retryable: true })
    },
  })
  const engine = setup(Optional, graph(), { trace: { captureData: true } })
  await engine.start()
  const task = engine.getTasks()[0]
  expect(executions).toHaveBeenCalledTimes(1)
  expect(task).toMatchObject({ status: 'completed', errors: [], attempts: [{ status: 'failed', handled: true }] })
  expect(engine.getNodeExecutionData('tail', task.id)?.outputs.value).toBe('default')
  expect(engine.getNodeActivation(task.id, task.attempts![0].activationId!)).toMatchObject({
    status: 'completed', data: { outputs: { value: 'default' } },
  })
})

test('does not start another attempt when the task is cancelled after the first failure', async () => {
  const Retrying = defineNode({
    ...Step,
    definition: Step.definition,
    retryPolicy: { idempotent: true, maxRetries: 2 },
    executor: vi.fn(() => {
      throw new NodeExecutionError('Temporary failure', { kind: 'execution', code: 'TEMPORARY', retryable: true })
    }),
  })
  const engine = setup(Retrying)
  engine.on('task:node:attempt', (taskId, attempt) => {
    if (attempt.status === 'failed') engine.stopTask(taskId)
  })
  await engine.start()
  expect(Retrying.executor).toHaveBeenCalledTimes(1)
  expect(engine.getTasks()[0].status).toBe('cancelled')
})

test('does not rerun an idempotent node after it has handed off to downstream execution', async () => {
  const executed = vi.fn()
  const Retrying = defineNode({
    ...Step,
    definition: Step.definition,
    retryPolicy: { idempotent: true, maxRetries: 2 },
    executor: async (ctx: NodeExecutionContext) => {
      executed()
      ctx.setOutput('value', 'published')
      await ctx.next()
      throw new NodeExecutionError('Late failure', { kind: 'execution', code: 'LATE', retryable: true })
    },
  })
  const engine = setup(Retrying)
  vi.spyOn(console, 'error').mockImplementation(() => {})
  await engine.start()
  expect(executed).toHaveBeenCalledTimes(1)
  expect(engine.getTasks()[0].status).toBe('failed')
  expect(engine.getNodeExecutionData('tail')?.outputs.value).toBe('published')
})


test('engine retry timing doubles the base interval, caps it, and adds jitter', async () => {
  vi.useFakeTimers()
  vi.spyOn(Math, 'random').mockReturnValue(0.025)
  const attempts = vi.fn()
  const Retrying = defineNode({
    ...Step,
    definition: Step.definition,
    retryPolicy: { idempotent: true, maxRetries: 3 },
    executor: (ctx: NodeExecutionContext) => {
      attempts()
      if (ctx.retry!.number < 4) {
        throw new NodeExecutionError('Temporary', { kind: 'execution', code: 'TEMPORARY', retryable: true })
      }
    },
  })
  const engine = setup(Retrying, graph(), { retry: { initialIntervalMs: 100, maxIntervalMs: 250 } })
  const run = engine.start()
  for (const [count, interval] of [[1, 125], [2, 225], [3, 275]]) {
    await vi.advanceTimersByTimeAsync(interval - 1)
    expect(attempts).toHaveBeenCalledTimes(count)
    await vi.advanceTimersByTimeAsync(1)
  }
  await run
  expect(attempts).toHaveBeenCalledTimes(4)
})

test('start overrides retry timing by field for event tasks in that session', async () => {
  vi.useFakeTimers()
  vi.spyOn(Math, 'random').mockReturnValue(0.9)
  const attempts = vi.fn()
  const Retrying = defineNode({
    ...Step,
    definition: Step.definition,
    retryPolicy: { idempotent: true, maxRetries: 1 },
    onActive: (ctx: NodeLifecycleContext) => {
      ctx.on('message', ({ executeSelf }) => executeSelf())
    },
    executor: ({ event, retry }: NodeExecutionContext) => {
      if (!event) return
      attempts()
      if (retry!.number === 1) {
        throw new NodeExecutionError('Temporary', { kind: 'execution', code: 'TEMPORARY', retryable: true })
      }
    },
  })
  const engine = setup(Retrying, graph(), { retry: { initialIntervalMs: 200, jitter: false, timeoutMs: 50 } })
  await engine.start({ retry: { initialIntervalMs: 20 } })
  const first = engine.dispatchEvent('message')
  await vi.advanceTimersByTimeAsync(19)
  expect(attempts).toHaveBeenCalledTimes(1)
  await vi.advanceTimersByTimeAsync(1)
  expect((await first)?.status).toBe('completed')
  expect(attempts).toHaveBeenCalledTimes(2)

  await engine.stop().whenStopped()
  await engine.start()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  const second = engine.dispatchEvent('message')
  await vi.advanceTimersByTimeAsync(50)
  expect((await second)?.errors[0]?.failure?.code).toBe('RETRY_TIMEOUT')
  expect(attempts).toHaveBeenCalledTimes(3)

  await engine.stop().whenStopped()
  await engine.start({ retry: { timeoutMs: null } })
  const third = engine.dispatchEvent('message')
  await vi.advanceTimersByTimeAsync(199)
  expect(attempts).toHaveBeenCalledTimes(4)
  await vi.advanceTimersByTimeAsync(1)
  expect((await third)?.status).toBe('completed')
  expect(attempts).toHaveBeenCalledTimes(5)
})

test('start can override the recovery timeout, which ends waiting before the next attempt', async () => {
  vi.useFakeTimers()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  const Retrying = defineNode({
    ...Step,
    definition: Step.definition,
    retryPolicy: { idempotent: true, maxRetries: 3 },
    executor: vi.fn(() => {
      throw new NodeExecutionError('Temporary', { kind: 'execution', code: 'TEMPORARY', retryable: true })
    }),
  })
  const engine = setup(Retrying, graph(), { retry: { initialIntervalMs: 40, timeoutMs: 500, jitter: false } })
  const run = engine.start({ retry: { timeoutMs: 100 } })
  await vi.advanceTimersByTimeAsync(99)
  expect(Retrying.executor).toHaveBeenCalledTimes(2)
  expect(engine.getTasks()[0].status).toBe('running')
  await vi.advanceTimersByTimeAsync(1)
  await run
  expect(Retrying.executor).toHaveBeenCalledTimes(2)
  expect(engine.getTasks()[0]).toMatchObject({
    status: 'failed',
    errors: [{ nodeId: 'event', failure: { code: 'RETRY_TIMEOUT', retryable: false } }],
  })
  expect(engine.getTaskTrace(engine.latestTaskId!)?.events.filter(({ type }) => type === 'activation:retry-wait'))
    .toMatchObject([{ nextAttempt: 2, status: 'scheduled' }, { nextAttempt: 2, status: 'ready' },
      { nextAttempt: 3, status: 'scheduled' }, { nextAttempt: 3, status: 'timeout' }])
})

test('cancelling a task clears its pending retry timer', async () => {
  vi.useFakeTimers()
  const Retrying = defineNode({
    ...Step,
    definition: Step.definition,
    retryPolicy: { idempotent: true, maxRetries: 1 },
    executor: vi.fn(() => {
      throw new NodeExecutionError('Temporary', { kind: 'execution', code: 'TEMPORARY', retryable: true })
    }),
  })
  const engine = setup(Retrying, graph(), { retry: { initialIntervalMs: 200, jitter: false } })
  const run = engine.start()
  await vi.advanceTimersByTimeAsync(0)
  expect(Retrying.executor).toHaveBeenCalledTimes(1)
  expect(vi.getTimerCount()).toBe(1)
  engine.stopTask(engine.latestTaskId!)
  await run
  expect(vi.getTimerCount()).toBe(0)
  expect(engine.getTasks()[0].status).toBe('cancelled')
})

test.each([true, false])('upstream recovery reads the new state and stops when an upstream budget is exhausted (%s)', async (repaired) => {
  vi.useFakeTimers()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  const reads = vi.fn()
  const Repair = defineNode({
    ...Step,
    definition: Step.definition,
    executor: async ({ state }: NodeExecutionContext) => {
      await new Promise<void>((resolve) => setTimeout(resolve, 50))
      state.update({ status: repaired ? 'ready' : 'still wrong' })
    },
  })
  const GetVariable = defineNode({
    ...Step,
    definition: Step.definition,
    retryPolicy: { idempotent: true, maxRetries: 1 },
    outputValidators: { value: (value: unknown) => typeof value === 'string' },
    executor: ({ state, setOutput, next }: NodeExecutionContext) => {
      const value = state.get('status')
      reads(value)
      setOutput('value', value)
      return next()
    },
  })
  const Check = defineNode({
    ...Step,
    definition: Step.definition,
    retryPolicy: { idempotent: true, maxRetries: 2 },
    executor: ({ getInput }: NodeExecutionContext) => {
      if (getInput('value') !== 'ready') {
        throw new NodeExecutionError('Invalid status', {
          kind: 'input', code: 'INVALID_STATUS', inputPort: 'value', retryable: true,
        })
      }
    },
  })
  const json: JsonGraph = {
    ...graph(),
    nodes: [node('start', 'start'), node('repair', 'repair'), node('get', 'get'), node('check', 'check')],
    links: [
      { id: 'start-repair', source: { id: 'start', port: 'out-exec' }, target: { id: 'repair', port: 'in-exec' } },
      { id: 'start-get', source: { id: 'start', port: 'out-exec' }, target: { id: 'get', port: 'in-exec' } },
      { id: 'get-check', source: { id: 'get', port: 'out-exec' }, target: { id: 'check', port: 'in-exec' } },
      { id: 'status', source: { id: 'get', port: 'out-value' }, target: { id: 'check', port: 'in-value' } },
    ],
  }
  const registry = new NodeRegistry().register('repair', Repair).register('get', GetVariable).register('check', Check)
  const engine = new Engine(registry, { retry: { initialIntervalMs: 100, jitter: false, timeoutMs: 200 } })
  engines.push(engine)
  engine.loadGraph(json)

  const run = engine.start({ initialState: { status: 'wrong' } })
  await vi.advanceTimersByTimeAsync(50)
  expect(reads.mock.calls).toEqual([['wrong']])
  expect(engine.getTaskState(engine.latestTaskId!)?.values.status).toBe(repaired ? 'ready' : 'still wrong')
  await vi.advanceTimersByTimeAsync(50)
  expect(reads.mock.calls).toEqual([['wrong'], [repaired ? 'ready' : 'still wrong']])
  expect(engine.getTask(engine.latestTaskId!)?.status).toBe(repaired ? 'completed' : 'failed')
  await run
  if (!repaired) expect(engine.getTask(engine.latestTaskId!)?.errors[0]?.failure?.code).toBe('INVALID_STATUS')
})
