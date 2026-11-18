import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import {
  Node,
  NodeRegistry,
  LoopNode,
  LoopEntryNode,
  LoopReturnNode,
  type ExecContext,
  type JsonGraph,
  type JsonLink,
  type JsonNode,
  type LoopConfig,
  type NodeClassType,
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
      { name: 'break', type: 'exec' },
      { name: 'value', type: 'any' },
    ] as const,
  }
}

function node(id: string, cls: NodeClassType, nodeType = cls.type): JsonNode {
  return {
    id,
    type: cls.definition.type ?? 'default',
    nodeType,
    position: { x: 0, y: 0 },
    values: {},
    inputs: cls.definition.inputs.map((p) => ({ name: p.name, type: p.type, id: `in-${p.name}` })),
    outputs: cls.definition.outputs.map((p) => ({ name: p.name, type: p.type, id: `out-${p.name}` })),
  }
}
function link(from: string, out: string, to: string, input: string): JsonLink {
  return {
    id: `${from}:${out}-${to}:${input}`,
    source: { id: from, port: `out-${out}` },
    target: { id: to, port: `in-${input}` },
  }
}
const viewport = { x: 0, y: 0, zoom: 1 }
function fixture(config: Partial<LoopConfig> = {}) {
  const registry = new NodeRegistry()
    .register('loop', LoopNode)
    .register('loop-entry', LoopEntryNode)
    .register('loop-return', LoopReturnNode)
    .register('loop-step', Step)
  const start = node('start', registry.getStartNodeClass())
  const loop = node('loop', LoopNode)
  loop.loop = { version: 1, ...config } as LoopConfig
  loop.subgraphId = 'body'
  // A loop has one data input: the first iteration's entry value.
  loop.values = { input: 0 }
  const entry = node('entry', LoopEntryNode)
  const step = node('step', Step, 'loop-step')
  const ret = node('return', LoopReturnNode)
  const tail = node('tail', Step, 'loop-step')
  const json: JsonGraph = {
    nodes: [start, loop, tail],
    links: [
      link('start', 'start', 'loop', 'exec'),
      link('loop', 'done', 'tail', 'exec'),
      link('loop', 'output', 'tail', 'value'),
    ],
    variables: [],
    viewport,
    subgraphs: {
      body: {
        nodes: [entry, step, ret],
        links: [
          link('entry', 'exec', 'step', 'exec'),
          link('entry', 'value', 'step', 'value'),
          link('step', 'next', 'return', 'next'),
          link('step', 'break', 'return', 'break'),
          link('step', 'value', 'return', 'value'),
        ],
        viewport,
      },
    },
  }
  return { registry, json, loop, entry, step, ret, body: json.subgraphs.body }
}

/** Retain only stop capabilities for cleanup without invariant Engine generics across array elements. */
interface StoppableEngine {
  stop(): StoppableEngine
  whenStopped(): Promise<void>
}
const engines: StoppableEngine[] = []
beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(async () => {
  for (const engine of engines.splice(0)) {
    engine.stop()
    await engine.whenStopped()
  }
  vi.restoreAllMocks()
})
function setup(
  f = fixture(),
  executor: (ctx: ExecContext) => unknown = (ctx) => {
    const value = Number(ctx.getInput('value') ?? 0) + 1
    ctx.setOutput('value', value)
    // The body ends the loop after three iterations by default.
    return ctx.next([ctx.loop!.index === 2 ? 'break' : 'next'])
  },
  options: ConstructorParameters<typeof Engine>[1] = {}
) {
  const runtime = new Runtime(f.registry)
  const tail = vi.fn()
  runtime.registerExecutor('loop-step', (ctx) => (ctx.frameId ? executor(ctx) : tail(ctx)))
  const engine = new Engine(runtime, options)
  engines.push(engine)
  engine.fromJSON(f.json)
  return { engine, runtime, tail, ...f }
}
type TestEngine = ReturnType<typeof setup>['engine']
function output(engine: TestEngine) {
  return engine.getNodeExecutionData('loop')?.outputs
}
function error(engine: TestEngine) {
  return engine
    .getTasks()[0]
    .errors.map((e) => e.message)
    .join('\n')
}

test('loops execute sequentially, output the last submitted value, and fire done once', async () => {
  const { engine, tail } = setup()
  await engine.process()
  expect(output(engine)).toEqual({ output: 3 })
  expect(tail).toHaveBeenCalledTimes(1)
  expect(engine.getTasks()[0].status).toBe('completed')
  const id = engine.latestTaskId!
  const calls = engine.getLoopInvocations(id)
  const frames = engine.getLoopIterations(id, calls[0].invocationId)
  expect(frames.map((f) => f.loop.index)).toEqual([0, 1, 2])
  expect(new Set(frames.map((f) => f.frameId)).size).toBe(3)
})

test('bodies run at least once using the loop input as the first entry value', async () => {
  const f = fixture()
  f.loop.values.input = 7
  const seen: unknown[] = []
  const { engine } = setup(f, (ctx) => {
    seen.push(ctx.getInput('value'))
    ctx.setOutput('value', ctx.getInput('value'))
    return ctx.next(['break'])
  })
  await engine.process()
  expect(seen).toEqual([7])
})

test('the previous submitted value becomes the next entry value', async () => {
  const seen: unknown[] = []
  const { engine } = setup(fixture(), (ctx) => {
    seen.push(ctx.getInput('value'))
    ctx.setOutput('value', Number(ctx.getInput('value')) + 10)
    return ctx.next([ctx.loop!.index === 2 ? 'break' : 'next'])
  })
  await engine.process()
  expect(seen).toEqual([0, 10, 20])
  expect(output(engine)).toEqual({ output: 30 })
})

test('continuing bodies fail at the iteration limit without partial outputs', async () => {
  const { engine, tail } = setup(fixture({ maxIterations: 2 }), (ctx) => {
    ctx.setOutput('value', Number(ctx.getInput('value')) + 1)
    return ctx.next(['next'])
  })
  await engine.process()
  expect(error(engine)).toContain('LoopLimitExceeded')
  expect(engine.getLoopInvocations(engine.latestTaskId!)[0]).toMatchObject({
    status: 'failed',
    iterations: 2,
    state: 2,
  })
  expect(tail).not.toHaveBeenCalled()
  expect(output(engine)).toBeUndefined()
})

test('break ends the loop and outputs the final submitted value', async () => {
  const { engine } = setup(fixture(), (ctx) => {
    const value = Number(ctx.getInput('value')) + 1
    ctx.setOutput('value', value)
    return ctx.next([ctx.loop!.index === 1 ? 'break' : 'next'])
  })
  await engine.process()
  expect(output(engine)).toEqual({ output: 2 })
  expect(engine.getLoopInvocations(engine.latestTaskId!)[0]).toMatchObject({
    iterations: 2,
    reason: 'break',
    state: 2,
  })
})

test.each([false, true])(
  'return data connected=%s: unconnected uses entry value; connected undefined overrides it',
  async (connected) => {
    const f = fixture()
    f.loop.values.input = { count: 1 }
    if (!connected)
      f.body.links = f.body.links.filter(
        (l) => !(l.target.id === 'return' && l.target.port === 'in-value')
      )
    const states: unknown[] = []
    const { engine } = setup(f, (ctx) => {
      states.push(structuredClone(ctx.getInput('value')))
      const state = ctx.getInput<{ count: number }>('value')
      if (state) state.count = 999
      ctx.setOutput('value', undefined)
      return ctx.next([states.length === 2 ? 'break' : 'next'])
    })
    await engine.process()
    expect(states).toEqual(connected ? [{ count: 1 }, undefined] : [{ count: 1 }, { count: 1 }])
    expect(output(engine)?.output).toEqual(connected ? undefined : { count: 1 })
  }
)

test('iteration inputs, outputs, and temporary state are isolated; only nodeState is shared', async () => {
  const f = fixture()
  const original = { list: [1, 2, 3] }
  f.loop.values.input = original
  let active = 0
  const states: unknown[] = []
  const { engine, runtime } = setup(
    f,
    (ctx) => {
      expect(ctx.state).toEqual({})
      ctx.state!.temp = true
      const input = ctx.getInput<{ list: number[] }>('value')!
      expect(input.list).toEqual([1, 2, 3])
      input.list.push(4)
      ;(ctx.ctx as { count: number }).count++
      expect((ctx.ctx as { count: number }).count).toBe(1)
      states.push(ctx.nodeState!.shared)
      ctx.nodeState!.shared = Number(ctx.nodeState!.shared) + 1
      // Submission uses an input copy; in-place changes must not leak to the next iteration.
      ctx.setOutput('value', { list: [1, 2, 3] })
      return ctx.next([ctx.loop!.index === 2 ? 'break' : 'next'])
    },
    { ctx: { count: 0 } }
  )
  runtime.nodes.get('step')!.onActive = (ctx) => {
    active++
    ctx.state.shared = 0
  }
  await engine.process()
  expect(active).toBe(1)
  expect(states).toEqual([0, 1, 2])
  expect(original.list).toEqual([1, 2, 3])
})

test('entry values are cloned initially and ignore later mutations to the original', async () => {
  const f = fixture()
  const original = { list: [1, 2, 3] }
  f.loop.values.input = original
  const seen: unknown[] = []
  const { engine } = setup(f, (ctx) => {
    original.list.push(999)
    seen.push(ctx.getInput<{ list: number[] }>('value')!.list)
    ctx.setOutput('value', ctx.getInput('value'))
    return ctx.next([ctx.loop!.index === 2 ? 'break' : 'next'])
  })
  await engine.process()
  expect(seen).toEqual([[1, 2, 3], [1, 2, 3], [1, 2, 3]])
})

test('unpublished dependencies cannot read prior iteration results', async () => {
  const f = fixture()
  class Producer extends Step {}
  f.registry.register('loop-producer', Producer)
  const producer = node('producer', Producer, 'loop-producer')
  f.body.nodes.push(producer)
  f.body.links.push(
    link('entry', 'exec', 'producer', 'exec'),
    link('entry', 'value', 'producer', 'value'),
    link('producer', 'value', 'return', 'value'),
    link('producer', 'break', 'return', 'next')
  )
  f.body.links = f.body.links.filter(
    (l) => !(l.source.id === 'step' && ['out-value', 'out-next'].includes(l.source.port))
  )
  const { engine, runtime } = setup(f, (ctx) => {
    ctx.setOutput('value', 42)
    return ctx.next(['next'])
  })
  // The second iteration publishes no result, leaving the return dependency unresolved.
  runtime.registerExecutor('loop-producer', (ctx) => {
    if (ctx.loop!.index === 1) return
    ctx.setOutput('value', 42)
    return ctx.next(['next'])
  })
  // step always triggers return; producer skips publication in the second iteration.
  f.body.links.push(link('step', 'next', 'return', 'next'))
  engine.fromJSON(f.json)
  await engine.process()
  expect(error(engine)).toContain('LoopDependencyUnresolved')
})

test('the return barrier awaits async executor tails after next before continuing', async () => {
  const f = fixture()
  let release!: () => void
  const seen: number[] = []
  const { engine } = setup(f, async (ctx) => {
    seen.push(ctx.loop!.index)
    ctx.setOutput('value', ctx.getInput('value'))
    await ctx.next([ctx.loop!.index === 1 ? 'break' : 'next'])
    if (ctx.loop!.index === 0)
      await new Promise<void>((resolve) => {
        release = resolve
      })
  })
  const running = engine.process()
  await vi.waitFor(() => expect(release).toBeDefined())
  expect(seen).toEqual([0])
  expect(output(engine)).toBeUndefined()
  release()
  await running
  expect(seen).toEqual([0, 1])
})

test.each(['Missing return', 'Duplicate next', 'Duplicate return', 'Duplicate activation'])('%s Explicit failure', async (mode) => {
  const f = fixture()
  if (mode === 'Duplicate return') {
    f.body.nodes.push(node('return2', LoopReturnNode))
    f.body.links.push(link('step', 'next', 'return2', 'next'))
  }
  if (mode === 'Duplicate activation') f.body.links.push({ ...link('entry', 'exec', 'step', 'exec'), id: 'duplicate' })
  const { engine, tail } = setup(f, async (ctx) => {
    if (mode === 'Missing return') return
    ctx.setOutput('value', 0)
    const next = ctx.next(['next'])
    if (mode === 'Duplicate next') await ctx.next(['next'])
    await next
  })
  await engine.process()
  expect(error(engine)).toContain(
    {
      'Missing return': 'LoopBodyNotReturned',
      'Duplicate next': 'LoopNodeMultipleNext',
      'Duplicate return': 'LoopBodyMultipleReturns',
      'Duplicate activation': 'LoopNodeMultipleActivations',
    }[mode]
  )
  expect(tail).not.toHaveBeenCalled()
})

test('implicit delayed next fails in loops; stale contexts cannot write, emit, or advance', async () => {
  let saved!: ExecContext
  const { engine, tail } = setup(fixture(), (ctx) => {
    saved = ctx
  })
  const event = vi.fn()
  engine.on('task:created', event)
  await engine.process()
  expect(error(engine)).toContain('LoopBodyNotReturned')
  expect(saved.signal!.aborted).toBe(true)
  saved.setOutput('value', 999)
  saved.emitEvent('late')
  await saved.next()
  expect(event).toHaveBeenCalledTimes(1)
  expect(tail).not.toHaveBeenCalled()
})

test('queued microtasks after synchronous executor exit cannot bypass explicit returns', async () => {
  const { engine, tail } = setup(fixture(), (ctx) => {
    queueMicrotask(() => {
      ctx.setOutput('value', 999)
      ctx.emitEvent('late-microtask')
      void ctx.next(['next'])
    })
  })
  await engine.process()
  expect(error(engine)).toContain('LoopBodyNotReturned')
  expect(engine.getTasks()).toHaveLength(1)
  expect(tail).not.toHaveBeenCalled()
})

test('next freezes outputs so stale node contexts cannot change return values', async () => {
  const { engine } = setup(fixture(), async (ctx) => {
    ctx.setOutput('value', { n: 1 })
    const downstream = ctx.next(['break'])
    ctx.setOutput('value', { n: 999 })
    ctx.emitEvent('ignored')
    await downstream
  })
  await engine.process()
  expect(output(engine)?.output).toEqual({ n: 1 })
  expect(engine.getTasks()).toHaveLength(1)
})

test('timeout cancels Promises that ignore signal without firing done', async () => {
  let saved!: ExecContext
  const { engine, tail } = setup(fixture({ timeoutMs: 20 }), (ctx) => {
    saved = ctx
    return new Promise(() => {})
  })
  await engine.process()
  expect(error(engine)).toContain('LoopTimeout')
  expect(saved.signal!.aborted).toBe(true)
  expect(tail).not.toHaveBeenCalled()
})

test('stopTask immediately releases loops and tools that ignore cancellation', async () => {
  let saved!: ExecContext
  const { engine, tail } = setup(fixture(), (ctx) => {
    saved = ctx
    return new Promise(() => {})
  })
  const running = engine.process()
  await vi.waitFor(() => expect(saved).toBeDefined())
  engine.stopTask(engine.latestTaskId!)
  await running
  expect(saved.signal!.aborted).toBe(true)
  expect(engine.getTasks()[0].status).toBe('cancelled')
  expect(engine.getLoopInvocations(engine.latestTaskId!)[0].status).toBe('cancelled')
  expect(tail).not.toHaveBeenCalled()
})

test('breakpoints can repeat each iteration; paused time does not count toward timeout', async () => {
  const f = fixture({ timeoutMs: 200 })
  f.step.breakpoint = true
  const { engine } = setup(f, (ctx) => {
    ctx.setOutput('value', ctx.getInput('value'))
    return ctx.next([ctx.loop!.index === 1 ? 'break' : 'next'])
  })
  const running = engine.process({ debug: true })
  await vi.waitFor(() => expect(engine.pausedNode?.loop?.index).toBe(0))
  await new Promise((resolve) => setTimeout(resolve, 220))
  expect(engine.getTasks()[0].status).toBe('paused')
  const frame = engine.pausedNode!.frameId
  engine.resume()
  await vi.waitFor(() => expect(engine.pausedNode?.loop?.index).toBe(1))
  expect(engine.pausedNode!.frameId).not.toBe(frame)
  engine.resume()
  await running
  expect(engine.getLoopInvocations(engine.latestTaskId!)[0].iterations).toBe(2)
})

test('activation budgets include controls and node configuration cannot raise engine limits', async () => {
  const { engine } = setup(fixture(), undefined, { maxNodeActivations: 4 })
  await engine.process()
  expect(error(engine)).toContain('LoopActivationLimitExceeded')
  const second = setup(fixture({ maxIterations: 11 }), undefined, { maxLoopIterations: 10 })
  await second.engine.process()
  expect(error(second.engine)).toContain('LoopLimitExceeded')
})

test('bounded history eviction preserves final and recent data; queries return copies', async () => {
  const { engine } = setup(fixture(), undefined, { maxLoopIterationHistory: 1 })
  await engine.process()
  const id = engine.latestTaskId!,
    call = engine.getLoopInvocations(id)[0]
  const frames = engine.getLoopIterations(id, call.invocationId)
  expect(frames).toHaveLength(1)
  expect(frames[0].loop.index).toBe(2)
  expect(output(engine)?.output).toEqual(3)
  const data = engine.getFrameNodeExecutionData(id, frames[0].frameId, 'step')!
  data.outputs.value = 999
  expect(engine.getFrameNodeExecutionData(id, frames[0].frameId, 'step')!.outputs.value).toBe(3)
})

test.each(['configuration', 'version', 'return ports', 'entry', 'return', 'ordinary control', 'execution back edge', 'data back edge', 'cross-region link', 'recursion', 'source'])(
  'loading rejects invalid%s',
  (kind) => {
    const f = fixture()
    if (kind === 'configuration') delete f.loop.loop
    if (kind === 'version') Object.assign(f.loop.loop!, { version: 2 })
    if (kind === 'return ports')
      f.ret.inputs = [...f.ret.inputs, { id: 'in-finish', name: 'finish', type: 'exec' } as never]
    if (kind === 'entry') f.body.nodes.push(node('entry2', LoopEntryNode))
    if (kind === 'return') {
      f.body.nodes = f.body.nodes.filter((n) => n.id !== 'return')
      f.body.links = f.body.links.filter((l) => l.target.id !== 'return')
    }
    if (kind === 'ordinary control') f.json.nodes.push(node('stray', LoopReturnNode))
    if (kind === 'execution back edge') f.body.links.push(link('step', 'next', 'step', 'exec'))
    if (kind === 'data back edge') f.body.links.push(link('step', 'value', 'step', 'value'))
    if (kind === 'cross-region link') f.body.links.push(link('loop', 'output', 'step', 'value'))
    if (kind === 'recursion') {
      const nested = node('nested', LoopNode)
      nested.loop = f.loop.loop
      nested.subgraphId = 'body'
      f.body.nodes.push(nested)
    }
    if (kind === 'source') {
      class Source extends Step {
        static definition = { ...Step.definition, executionMode: 'source' as const }
      }
      f.registry.register('source-in-loop', Source)
      f.step.nodeType = 'source-in-loop'
    }
    expect(() => setup(f)).toThrow()
  }
)

test('loop resources can initialize but lifecycle business subscriptions are rejected', async () => {
  const { engine, runtime } = setup()
  runtime.nodes.get('step')!.onActive = (ctx) => {
    ctx.onEvent('event', () => {})
  }
  await expect(engine.process()).rejects.toThrow('Loop bodies cannot register session event subscriptions')
})

function nestedFixture(gated = false) {
  const f = fixture()
  const inner = fixture()
  for (const n of inner.body.nodes) n.id = `inner-${n.id}`
  for (const l of inner.body.links) {
    l.source.id = `inner-${l.source.id}`
    l.target.id = `inner-${l.target.id}`
  }
  f.json.subgraphs.inner = inner.body
  const nested = node('nested', LoopNode)
  nested.loop = { version: 1, maxIterations: 10 }
  nested.subgraphId = 'inner'
  nested.values = { input: 0 }
  if (!gated) {
    // The outer body invokes the inner loop once, then both end.
    f.body.nodes = [f.entry, nested, f.ret]
    f.body.links = [
      link('entry', 'exec', 'nested', 'exec'),
      link('entry', 'value', 'nested', 'input'),
      link('nested', 'done', 'return', 'break'),
      link('nested', 'output', 'return', 'value'),
    ]
    return f
  }
  // The outer step chooses next or break through separate return nodes.
  const outerStep = node('outer-step', Step, 'loop-step')
  const breakReturn = node('break-return', LoopReturnNode)
  f.body.nodes = [f.entry, outerStep, nested, f.ret, breakReturn]
  f.body.links = [
    link('entry', 'exec', 'outer-step', 'exec'),
    link('entry', 'value', 'outer-step', 'value'),
    link('outer-step', 'next', 'nested', 'exec'),
    link('outer-step', 'value', 'nested', 'input'),
    link('nested', 'done', 'return', 'next'),
    link('nested', 'output', 'return', 'value'),
    link('outer-step', 'break', 'break-return', 'break'),
  ]
  return f
}

test('nested invocations have separate ids and correct parent frames', async () => {
  const { engine } = setup(nestedFixture(true))
  await engine.process()
  const calls = engine.getLoopInvocations(engine.latestTaskId!)
  // The outer loop invokes the inner loop in each of two iterations, then ends.
  expect(calls).toHaveLength(3)
  expect(new Set(calls.map((c) => c.invocationId)).size).toBe(3)
  const nestedCalls = calls.filter((c) => c.loopNodeId === 'nested')
  expect(nestedCalls).toHaveLength(2)
  expect(nestedCalls.every((c) => !!c.parentFrameId)).toBe(true)
  expect(nestedCalls.every((c) => c.iterations === 3)).toBe(true)
  expect(calls.find((c) => c.loopNodeId === 'loop')).toMatchObject({ iterations: 3, reason: 'break' })
})

test('nesting limits apply before tool execution', async () => {
  const tools = vi.fn()
  const { engine, tail } = setup(nestedFixture(), tools, { maxLoopDepth: 1 })
  await engine.process()
  expect(error(engine)).toContain('LoopDepthExceeded')
  expect(tools).not.toHaveBeenCalled()
  expect(tail).not.toHaveBeenCalled()
})

test('stopping parent tasks cancels nested invocations and all active frames', async () => {
  let saved!: ExecContext
  const { engine } = setup(nestedFixture(), (ctx) => {
    saved = ctx
    return new Promise(() => {})
  })
  const running = engine.process()
  await vi.waitFor(() => expect(saved).toBeDefined())
  engine.stopTask(engine.latestTaskId!)
  await running
  expect(saved.signal!.aborted).toBe(true)
  expect(engine.getLoopInvocations(engine.latestTaskId!).map((c) => c.status)).toEqual(['cancelled', 'cancelled'])
})

test('reentering the same Loop in one task creates a new invocation and resets state', async () => {
  const f = fixture()
  const source = node('source', Step, 'loop-step')
  f.json.nodes.splice(1, 0, source)
  f.json.links[0] = link('start', 'start', 'source', 'exec')
  f.json.links.push(link('source', 'next', 'loop', 'exec'))
  const { engine, runtime, tail } = setup(f)
  runtime.registerExecutor('loop-step', async (ctx) => {
    if (ctx.frameId) {
      ctx.setOutput('value', Number(ctx.getInput('value')) + 1)
      return ctx.next(['break'])
    }
    if (ctx.getInput('value') === undefined) {
      await ctx.next(['next'])
      await ctx.next(['next'])
    } else tail(ctx)
  })
  await engine.process()
  const calls = engine.getLoopInvocations(engine.latestTaskId!)
  expect(calls).toHaveLength(2)
  expect(calls.map((c) => c.iterations)).toEqual([1, 1])
  expect(calls[0].invocationId).not.toBe(calls[1].invocationId)
})

test('concurrent invocations of the same Loop own separate frames and results', async () => {
  const f = fixture()
  f.json.links.push({ ...f.json.links[0], id: 'concurrent-loop' })
  const releases: (() => void)[] = []
  const { engine } = setup(f, async (ctx) => {
    if (ctx.loop!.index === 0)
      await new Promise<void>((resolve) => {
        releases.push(resolve)
      })
    ctx.setOutput('value', ctx.getInput('value'))
    return ctx.next(['break'])
  })
  const running = engine.process()
  await vi.waitFor(() => expect(releases).toHaveLength(2))
  releases[0]()
  releases[1]()
  await running
  const calls = engine.getLoopInvocations(engine.latestTaskId!)
  expect(calls).toHaveLength(2)
  expect(calls.map((c) => [c.status, c.iterations])).toEqual([
    ['completed', 1],
    ['completed', 1],
  ])
  const frames = calls.flatMap((c) => engine.getLoopIterations(engine.latestTaskId!, c.invocationId))
  expect(new Set(frames.map((f) => f.frameId)).size).toBe(2)
})

test('ordinary subgraphs rebuild state each iteration and inherit frameId', async () => {
  const f = fixture()
  const sub = node('sub', f.registry.get('subgraph'))
  sub.subgraphId = 'ordinary'
  const start = node('ordinary-start', f.registry.getStartNodeClass())
  const child = node('ordinary-step', Step, 'ordinary-step')
  const end = node('ordinary-end', f.registry.getEndNodeClass())
  class OrdinaryStep extends Step {}
  f.registry.register('ordinary-step', OrdinaryStep)
  f.json.subgraphs.ordinary = {
    nodes: [start, child, end],
    links: [
      link('ordinary-start', 'start', 'ordinary-step', 'exec'),
      link('ordinary-step', 'next', 'ordinary-end', 'end'),
    ],
    viewport,
  }
  f.body.nodes.push(sub)
  f.body.links = f.body.links.filter((l) => !(l.source.id === 'step' && l.source.port === 'out-next'))
  f.body.links.push(link('step', 'next', 'sub', 'subgraph'), link('sub', 'subgraph', 'return', 'next'))
  const frames: string[] = []
  const { engine, runtime } = setup(f)
  runtime.registerExecutor('ordinary-step', (ctx) => {
    expect(ctx.state).toEqual({})
    ctx.state!.temporary = true
    expect(ctx.getInput('value')).toBeUndefined()
    frames.push(ctx.frameId!)
    return ctx.next(['next'])
  })
  await engine.process()
  expect(frames).toHaveLength(2)
  expect(new Set(frames).size).toBe(2)
})

test('after return, commit waits for started sibling branches to finish', async () => {
  const f = fixture()
  class SiblingStep extends Step {}
  const sibling = node('sibling', SiblingStep, 'sibling-step')
  f.registry.register('sibling-step', SiblingStep)
  f.body.nodes.push(sibling)
  f.body.links.push(link('entry', 'exec', 'sibling', 'exec'), link('sibling', 'break', 'return', 'next'))
  const releases: (() => void)[] = []
  const { engine, runtime } = setup(
    f,
    (ctx) => {
      ctx.setOutput('value', ctx.getInput('value'))
      return ctx.next([ctx.loop!.index === 1 ? 'break' : 'next'])
    }
  )
  runtime.registerExecutor(
    'sibling-step',
    () =>
      new Promise<void>((resolve) => {
        releases.push(resolve)
      })
  )
  const running = engine.process()
  await vi.waitFor(() => expect(releases).toHaveLength(1))
  expect(engine.getLoopInvocations(engine.latestTaskId!)[0].iterations).toBe(0)
  releases[0]()
  await vi.waitFor(() => expect(releases).toHaveLength(2))
  expect(engine.getLoopInvocations(engine.latestTaskId!)[0].iterations).toBe(1)
  releases[1]()
  await running
  expect(engine.getLoopInvocations(engine.latestTaskId!)[0].iterations).toBe(2)
})

test('tool failure invalidates the frame immediately while preserving the error and node scope', async () => {
  const { engine, tail } = setup(fixture(), () => {
    throw new Error('Tool call failed')
  })
  await engine.process()
  const failure = engine.getTasks()[0].errors[0]
  expect(failure).toMatchObject({ nodeId: 'step', frameId: expect.any(String), loop: { index: 0 } })
  expect(failure.message).toContain('Tool call failed')
  expect(tail).not.toHaveBeenCalled()
})

test('emitEvent creates an independent task outside the iteration completion barrier', async () => {
  const f = fixture()
  class Listener extends Step {
    static onEvent = (name: string) => ({ trigger: name === 'tool-event' })
  }
  f.registry.register('loop-event-listener', Listener)
  f.json.nodes.push(node('listener', Listener, 'loop-event-listener'))
  let received!: ExecContext
  const { engine, runtime } = setup(f, (ctx) => {
    ctx.emitEvent('tool-event', 'payload')
    ctx.setOutput('value', 1)
    return ctx.next(['break'])
  })
  runtime.registerExecutor('loop-event-listener', (ctx) => {
    received = ctx
    return new Promise(() => {})
  })
  await engine.process()
  await vi.waitFor(() => expect(received).toBeDefined())
  const parent = engine.getTasks().find((t) => t.trigger.type === 'start')!
  expect(engine.getLoopInvocations(parent.id)[0].iterations).toBe(1)
  const child = engine.getTasks().find((t) => t.trigger.type === 'event')!
  expect(child).toMatchObject({
    status: 'running',
    parentTaskId: engine.getTasks().find((t) => t.trigger.type === 'start')!.id,
  })
})

test('dense synchronous iterations yield so stop need not wait for the iteration limit', async () => {
  const f = fixture({ maxIterations: 1000 })
  let count = 0
  const { engine } = setup(f, (ctx) => {
    count++
    if (count === 1) setTimeout(() => engine.stopTask(engine.latestTaskId!), 0)
    ctx.setOutput('value', count)
    return ctx.next(['next'])
  })
  await engine.process()
  expect(count).toBeGreaterThan(0)
  expect(count).toBeLessThan(1000)
  expect(engine.getTasks()[0].status).toBe('cancelled')
})

test('Loop preserves connected undefined rather than using parent configuration defaults', async () => {
  const f = fixture()
  const source = node('source', Step, 'undefined-source')
  class UndefinedSource extends Step {}
  f.registry.register('undefined-source', UndefinedSource)
  f.json.nodes.splice(1, 0, source)
  f.json.nodes.find((n) => n.id === 'tail')!.values.value = 'Old default'
  f.json.links[0] = link('start', 'start', 'source', 'exec')
  f.json.links.push(link('source', 'next', 'loop', 'exec'), link('source', 'value', 'loop', 'input'))
  const { engine, runtime, tail } = setup(f, (ctx) => ctx.next(['break']))
  runtime.registerExecutor('undefined-source', (ctx) => {
    ctx.setOutput('value', undefined)
    return ctx.next(['next'])
  })
  await engine.process()
  expect(output(engine)?.output).toBeUndefined()
  expect(tail).toHaveBeenCalledTimes(1)
  expect(tail.mock.calls[0][0].getInput('value')).toBeUndefined()
})

test('sibling failure releases another branch\'s frame breakpoint', async () => {
  const f = fixture()
  f.step.breakpoint = true
  class FailingSibling extends Step {}
  f.registry.register('failing-sibling', FailingSibling)
  const sibling = node('sibling', FailingSibling, 'failing-sibling')
  f.body.nodes.push(sibling)
  f.body.links.push(link('entry', 'exec', 'sibling', 'exec'), link('sibling', 'break', 'return', 'next'))
  let fail!: () => void
  const { engine, runtime } = setup(f)
  runtime.registerExecutor('failing-sibling', async () => {
    await new Promise<void>((resolve) => {
      fail = resolve
    })
    throw new Error('Parallel branch failed')
  })
  // Start the sibling first so the tool Promise captures errors arriving during the breakpoint.
  f.body.links = [
    f.body.links.find((l) => l.target.id === 'sibling')!,
    ...f.body.links.filter((l) => l.target.id !== 'sibling'),
  ]
  engine.fromJSON(f.json)
  const running = engine.process({ debug: true })
  await vi.waitFor(() => expect(engine.pausedNode?.nodeId).toBe('step'))
  expect(fail).toBeDefined()
  fail()
  await running
  expect(engine.getTasks()[0].status).toBe('failed')
  expect(engine.getTasks()[0].pausedNode).toBeNull()
  expect(error(engine)).toContain('Parallel branch failed')
})
