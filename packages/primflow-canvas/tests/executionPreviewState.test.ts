// @vitest-environment jsdom
import './svg-shim'
import { expect, test, vi } from 'vitest'
import { defineNode, NodeRegistry, type JsonGraph } from '@lyx-pj/primflow-model'
import { Graph } from '../src/Graph'
import { Engine } from '../../primflow-engine/src/Engine'
import { defineExecutor } from '../../primflow-engine/src/ExecutorDefinition'
import { BlueprintModel } from '../src/GraphModel'
import { bindWorkflowEvents } from '../../../examples/primflow-react/packages/workflow/events'

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

const Step = defineNode({
  executor: 'step',
  definition: {
    inputs: [{ name: 'exec', type: 'exec' }, { name: 'value', type: 'any' }],
    outputs: [{ name: 'value', type: 'any' }],
  },
})

test('new subgraph Start nodes provide parameter inputs and matching outputs', () => {
  const graph = new Graph(new NodeRegistry())
  const child = graph.model.createSubgraph('child')!
  const start = child.nodes.find(node => node.kind === 'start')!
  expect(start.inputs).toEqual([{ id: 'in-input', name: 'input', type: 'any', label: 'Parameter' }])
  expect(start.outputs).toEqual([
    { id: 'out-start', name: 'start', type: 'exec' },
    { id: 'out-input', name: 'input', type: 'any', label: 'Parameter' },
  ])
  // Main graph Start nodes have no parameter source and expose only execution outputs.
  const rootStart = graph.model.root.nodes.find(node => node.kind === 'start')!
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
        { id: `${prefix}-start`, definitionId: 'start', kind: 'start', position: { x: 0, y: 0 },
          inputValues: { old: 'Old data' }, inputs: [], outputs },
        { id: `${prefix}-step`, definitionId: 'step', kind: 'default', position: { x: 0, y: 0 }, inputValues: { value: false },
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
  expect(saved.nodes[0].inputValues).toEqual({})
  expect(saved.nodes[1].inputValues).toEqual({ value: false })
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
  const engine = new Engine(registry)
  let finish!: () => void
  engine.registerExecutor(defineExecutor(Step, async ctx => {
    await new Promise<void>(resolve => { finish = resolve })
    ctx.setOutput('value', ctx.getInput('value'))
  }))
  const json: JsonGraph = {
    nodes: [
      { id: 'start', definitionId: 'start', kind: 'start', position: { x: 0, y: 0 }, inputValues: {}, inputs: [],
        outputs: [{ name: 'start', type: 'exec', id: 'out-exec' }] },
      { id: 'step', definitionId: 'step', kind: 'default', breakpoint: true, position: { x: 0, y: 0 }, inputValues: { value: false },
        inputs: [{ name: 'exec', type: 'exec', id: 'in-exec' }, { name: 'value', type: 'any', id: 'in-value' }],
        outputs: [{ name: 'value', type: 'any', id: 'out-value' }] },
    ],
    links: [
      { id: 'exec', source: { id: 'start', port: 'out-exec' }, target: { id: 'step', port: 'in-exec' } },
    ],
    subgraphs: {}, variables: [], viewport: { x: 0, y: 0, zoom: 1 },
  }
  engine.loadGraph(json)
  const dispose = bindWorkflowEvents(graph, engine)
  const process = engine.start({ debug: true })
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
