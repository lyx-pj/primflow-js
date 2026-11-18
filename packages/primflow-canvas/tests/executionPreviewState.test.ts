// @vitest-environment jsdom
import './svg-shim'
import { expect, test, vi } from 'vitest'
import { Node, NodeRegistry, type JsonGraph } from '@lyx-pj/primflow-model'
import { Graph } from '../src/Graph'
import { Engine } from '../../primflow-engine/src/Engine'
import { Runtime } from '../../primflow-engine/src/Runtime'
import { BlueprintModel } from '../src/GraphModel'
import { bindWorkflowEvents } from '../../../examples/primflow-react/packages/workflow/events'
import type { DebugPanelData, DebugPanelOptions } from '../src/ui/types'

// Replace only JointJS views; retain real Graph, Engine, and example event wiring to verify pause timing.
vi.mock('../src/adapters/GraphAdapter', () => ({
  GraphAdapter: class {
    position = { x: 0, y: 0 }
    scale = 1
    selection = new Set<unknown>()
    on = vi.fn()
    addNode = vi.fn()
    addLink = vi.fn()
    removeCells = vi.fn()
    selectCollection = vi.fn()
    clearSelection = vi.fn()
    clear = vi.fn()
    setOptions = vi.fn()
    setNodeExecutionStatus = vi.fn()
    setNodeExecutionPaused = vi.fn()
    ui = {
      refreshToolbar: vi.fn(),
      refreshExecutionStatus: vi.fn(),
      refreshNodeExecutionPreview: vi.fn(),
      isDebugPanelOpen: vi.fn(() => false),
      openDebugPanel: vi.fn(),
      closeDebugPanel: vi.fn(),
      toggleDebugPanel: vi.fn(),
      refreshDebugPanel: vi.fn(),
    }
  },
}))

class Step extends Node {
  static definition = {
    inputs: [{ name: 'exec', type: 'exec' }, { name: 'value', type: 'any' }] as const,
    outputs: [{ name: 'value', type: 'any' }] as const,
  }
}

test('new subgraph Start nodes provide parameter inputs and matching outputs', () => {
  const graph = new Graph(new NodeRegistry())
  const child = graph.model.createSubgraph('child')!
  const start = child.nodes.find(node => node.type === 'start')!
  expect(start.inputs).toEqual([{ id: 'in-input', name: 'input', type: 'any', label: 'Parameter' }])
  expect(start.outputs).toEqual([
    { id: 'out-start', name: 'start', type: 'exec' },
    { id: 'out-input', name: 'input', type: 'any', label: 'Parameter' },
  ])
  // Main graph Start nodes have no parameter source and expose only execution outputs.
  const rootStart = graph.model.root.nodes.find(node => node.type === 'start')!
  expect(rootStart.inputs).toEqual([])
  expect(rootStart.outputs).toEqual([{ name: 'start', type: 'exec', id: 'out-start' }])
})

test.each([true, false])('loading and saving graphs removes obsolete Start ports and links (typed: %s)', typed => {
  const registry = new NodeRegistry().register('step', Step)
  const graph = new Graph(registry)
  const legacyGraph = (prefix: string): JsonGraph => {
    const outputs: JsonGraph['nodes'][number]['outputs'] = [
      { name: 'exec', type: 'exec', id: 'out-exec' },
      { name: 'param', type: 'any', id: 'out-value' },
    ]
    if (!typed) outputs.forEach(port => { delete port.type })
    return {
      nodes: [
        { id: `${prefix}-start`, nodeType: 'start', type: 'start', position: { x: 0, y: 0 },
          values: { old: 'Old data' }, inputs: [], outputs },
        { id: `${prefix}-step`, nodeType: 'step', type: 'default', position: { x: 0, y: 0 }, values: { value: false },
          inputs: [{ name: 'exec', type: 'exec', id: 'in-exec' }, { name: 'value', type: 'any', id: 'in-value' }],
          outputs: [{ name: 'value', type: 'any', id: 'out-value' }] },
      ],
      links: [
        { id: `${prefix}-exec`, source: { id: `${prefix}-start`, port: 'out-exec' },
          target: { id: `${prefix}-step`, port: 'in-exec' } },
        { id: `${prefix}-data`, source: { id: `${prefix}-start`, port: 'out-value' },
          target: { id: `${prefix}-step`, port: 'in-value' } },
      ],
      subgraphs: {}, variables: [], viewport: { x: 0, y: 0, zoom: 1 },
    }
  }
  const json = legacyGraph('root')
  json.subgraphs.child = legacyGraph('child')
  const original = structuredClone(json)
  const saved = BlueprintModel.fromJSON(graph, json).toJSON()
  // Main graph Start nodes have no parameter source; remove all data ports and links.
  expect(saved.nodes[0].inputs).toEqual([])
  expect(saved.nodes[0].outputs).toEqual([{ name: 'start', type: 'exec', id: 'out-exec' }])
  expect(saved.nodes[0].values).toEqual({})
  expect(saved.nodes[1].values).toEqual({ value: false })
  expect(saved.links).toHaveLength(1)
  expect(saved.links[0].source.port).toBe('out-exec')
  // Preserve explicitly defined subgraph parameter ports when they have types.
  const child = saved.subgraphs.child
  if (typed) {
    expect(child.nodes[0].outputs).toEqual([
      { name: 'start', type: 'exec', id: 'out-exec' },
      { name: 'param', type: 'any', id: 'out-value' },
    ])
    expect(child.links).toHaveLength(2)
  } else {
    expect(child.nodes[0].outputs).toEqual([{ name: 'start', type: 'exec', id: 'out-exec' }])
    expect(child.links).toHaveLength(1)
    expect(child.links[0].source.port).toBe('out-exec')
  }
  expect(json).toEqual(original)
})

test('pause notifications expose actual inputs, resume clears them, completion shows outputs, and stop clears all data', async () => {
  const registry = new NodeRegistry().register('step', Step)
  const graph = new Graph(registry)
  const runtime = new Runtime(registry)
  let finish!: () => void
  runtime.registerExecutor('step', async ctx => {
    await new Promise<void>(resolve => { finish = resolve })
    ctx.setOutput('value', ctx.getInput('value'))
  })
  const engine = new Engine(runtime)
  const json: JsonGraph = {
    nodes: [
      { id: 'start', nodeType: 'start', type: 'start', position: { x: 0, y: 0 }, values: {}, inputs: [],
        outputs: [{ name: 'start', type: 'exec', id: 'out-exec' }] },
      { id: 'step', nodeType: 'step', type: 'default', breakpoint: true, position: { x: 0, y: 0 }, values: { value: false },
        inputs: [{ name: 'exec', type: 'exec', id: 'in-exec' }, { name: 'value', type: 'any', id: 'in-value' }],
        outputs: [{ name: 'value', type: 'any', id: 'out-value' }] },
    ],
    links: [
      { id: 'exec', source: { id: 'start', port: 'out-exec' }, target: { id: 'step', port: 'in-exec' } },
    ],
    subgraphs: {}, variables: [], viewport: { x: 0, y: 0, zoom: 1 },
  }
  engine.fromJSON(json)
  const dispose = bindWorkflowEvents(graph, engine)
  const process = engine.process({ debug: true })
  try {
    await vi.waitFor(() => expect(engine.status).toBe('paused'))
    expect(graph.options.toolbar).toMatchObject({ actions: [
      { id: 'run', iconClass: 'ri-play-line', disabled: true },
      { id: 'debug', iconClass: 'ri-bug-line', disabled: true },
      { id: 'resume', iconClass: 'ri-play-circle-line', disabled: false },
      { id: 'stop', iconClass: 'ri-stop-line', disabled: false },
    ] })
    expect(graph.options.toolbar).not.toHaveProperty('status')
    expect(graph.pausedNodeId).toBe('step')
    expect(graph.getNodeExecutionStatus('step')).toBe('pending')
    expect(graph.getNodeExecutionData('step')).toEqual({ inputs: { value: false }, outputs: {} })
    engine.resume()
    expect(graph.getNodeExecutionData('step')).toBeUndefined()
    await vi.waitFor(() => expect(graph.getNodeExecutionStatus('step')).toBe('running'))
    finish()
    await process
    expect(graph.getNodeExecutionData('step')).toEqual({ inputs: { value: false }, outputs: { value: false } })
    engine.stop()
    expect(graph.getNodeExecutionData('step')).toBeUndefined()
  } finally {
    dispose()
    finish?.()
    await process
  }
})


test('selecting history replays its task graph with isolated node data and logs, then restores editing', async () => {
  const registry = new NodeRegistry().register('step', Step)
  const graph = new Graph(registry)
  const runtime = new Runtime(registry)
  runtime.registerExecutor('step', async (ctx) => {
    ctx.setOutput('value', ctx.getInput('value'))
  })
  const engine = new Engine(runtime)
  const json: JsonGraph = {
    nodes: [
      { id: 'start', nodeType: 'start', type: 'start', position: { x: 0, y: 0 }, values: {},
        inputs: [], outputs: [{ name: 'start', type: 'exec', id: 'out-exec' }] },
      { id: 'step', nodeType: 'step', type: 'default', position: { x: 0, y: 0 }, values: { value: 7 },
        inputs: [{ name: 'exec', type: 'exec', id: 'in-exec' }, { name: 'value', type: 'any', id: 'in-value' }],
        outputs: [{ name: 'value', type: 'any', id: 'out-value' }] },
    ],
    links: [
      { id: 'exec', source: { id: 'start', port: 'out-exec' }, target: { id: 'step', port: 'in-exec' } },
    ],
    subgraphs: {}, variables: [], viewport: { x: 0, y: 0, zoom: 1 },
  }
  engine.fromJSON(json)
  const dispose = bindWorkflowEvents(graph, engine)
  try {
    await engine.process()
    const task = engine.getTasks()[0]
    expect(task?.status).toBe('completed')
    const options = graph.options.debugPanel as DebugPanelOptions
    expect(options.onRecordSelect).toBeTypeOf('function')
    const record = {
      id: task.id,
      title: 'Run main workflow',
      status: 'completed' as const,
      startedAt: task.startedAt,
      endedAt: task.endedAt,
    }

    options.onRecordSelect?.(record)
    expect(graph.isReplayMode()).toBe(true)
    expect(graph.getNodes().map((node) => node.id)).toEqual(expect.arrayContaining(['start', 'step']))
    expect(graph.getNodeExecutionStatus('step')).toBe('completed')
    expect(graph.getNodeExecutionData('step')).toEqual({ inputs: { value: 7 }, outputs: { value: 7 } })

    const data = typeof options.data === 'function' ? options.data() : options.data as DebugPanelData
    expect(data.chain?.some((item) => item.nodeId === 'step')).toBe(true)
    expect(data.logs?.some((entry) => entry.level === 'success' && entry.nodeId === 'step')).toBe(true)

    options.onRecordSelect?.(null)
    expect(graph.isReplayMode()).toBe(false)
    expect(graph.getNodes().map((node) => node.id)).not.toContain('step')
  } finally {
    dispose()
    engine.stop()
    await engine.whenStopped()
  }
})

test('current runs enter history only after stopping', async () => {
  const registry = new NodeRegistry().register('step', Step)
  const graph = new Graph(registry)
  const runtime = new Runtime(registry)
  runtime.registerExecutor('step', async (ctx) => {
    ctx.setOutput('value', ctx.getInput('value'))
  })
  const engine = new Engine(runtime)
  const json: JsonGraph = {
    nodes: [
      { id: 'start', nodeType: 'start', type: 'start', position: { x: 0, y: 0 }, values: {},
        inputs: [], outputs: [{ name: 'start', type: 'exec', id: 'out-exec' }] },
      { id: 'step', nodeType: 'step', type: 'default', position: { x: 0, y: 0 }, values: { value: 1 },
        inputs: [{ name: 'exec', type: 'exec', id: 'in-exec' }, { name: 'value', type: 'any', id: 'in-value' }],
        outputs: [{ name: 'value', type: 'any', id: 'out-value' }] },
    ],
    links: [
      { id: 'exec', source: { id: 'start', port: 'out-exec' }, target: { id: 'step', port: 'in-exec' } },
    ],
    subgraphs: {}, variables: [], viewport: { x: 0, y: 0, zoom: 1 },
  }
  engine.fromJSON(json)
  const dispose = bindWorkflowEvents(graph, engine)
  const records = () => {
    const options = graph.options.debugPanel as DebugPanelOptions
    const data = typeof options.data === 'function' ? options.data() : options.data as DebugPanelData
    return data.records ?? []
  }
  try {
    await engine.process()
    // Nodes have finished, but the session remains active until the user stops it.
    expect(engine.status).toBe('running')
    const task = engine.getTasks()[0]!
    expect(task.status).toBe('completed')
    expect(records()).toHaveLength(0)

    engine.stop()
    await engine.whenStopped()
    expect(records().map((record) => record.id)).toContain(task.id)
  } finally {
    dispose()
    engine.stop()
    await engine.whenStopped()
  }
})
