// @vitest-environment jsdom
import './svg-shim'
import { afterEach, expect, test, vi } from 'vitest'
import { DEFAULT_LOOP_CONFIG, defineDataType, defineNode, NodeRegistry, schema, type JsonGraph, type LoopConfig } from '@lyx-pj/primflow-model'
import { Graph, type LinkInstanceType, type NodeInstanceType } from '../src/Graph'
import { GraphAdapter } from '../src/adapters/GraphAdapter'
import { serializeNodes } from '../src/utils/serializer'

// Replace rendering only; validate canvas content using real Graph, models, serialization, and undo.
vi.mock('../src/adapters/GraphAdapter', () => ({
  GraphAdapter: class {
    position = { x: 0, y: 0 }
    scale = 1
    selection = new Set<NodeInstanceType | LinkInstanceType>()
    private nextId = 0
    on = vi.fn()
    setOptions = vi.fn()
    destroy = vi.fn()
    addNode(node: NodeInstanceType) {
      node.id ||= `node-${++this.nextId}`
      node.inputs.forEach((port, index) => { port.id ||= `in-${index}` })
      node.outputs.forEach((port, index) => { port.id ||= `out-${index}` })
    }
    addLink(link: LinkInstanceType) {
      link.id ||= `link-${++this.nextId}`
    }
    updateLink = vi.fn()
    syncPortHighlights = vi.fn()
    removeCells(cells: Array<NodeInstanceType | LinkInstanceType>) {
      cells.forEach(cell => this.selection.delete(cell))
    }
    selectCollection(cells: Array<NodeInstanceType | LinkInstanceType>) {
      this.selection = new Set(cells)
    }
    clear() {
      this.selection.clear()
    }
  },
}))

const Step = defineNode({
  definition: {
    inputs: [{ name: 'exec', type: 'exec' }] as const,
    outputs: [{ name: 'exec', type: 'exec' }] as const,
  },
})

const graphs: Graph[] = []

function createGraph() {
  const graph = new Graph(new NodeRegistry().register('step', Step))
  graphs.push(graph)
  return graph
}

afterEach(() => {
  graphs.splice(0).forEach(graph => graph.destroy())
  vi.restoreAllMocks()
})

test('canvas uses the definition name as the default title and serializes only title overrides', () => {
  const NamedStep = defineNode({
    ...Step,
    definition: { ...Step.definition, name: 'Read Input', kind: 'default' },
  })
  const graph = new Graph(new NodeRegistry().register('example.read', NamedStep))
  graphs.push(graph)
  const defaultNode = graph.addNode('example.read')
  const titledNode = graph.addNode('example.read', { title: 'Read Customer' })

  expect(defaultNode.title).toBe('Read Input')
  expect(titledNode.title).toBe('Read Customer')
  expect(titledNode.definition).toMatchObject({ id: 'example.read', name: 'Read Input', kind: 'default' })
  expect(titledNode.definitionId).toBe('example.read')
  expect(serializeNodes([defaultNode, titledNode])).toMatchObject([
    { definitionId: 'example.read', kind: 'default' },
    { definitionId: 'example.read', kind: 'default', title: 'Read Customer' },
  ])
  const [saved] = serializeNodes([defaultNode])
  expect(saved).not.toHaveProperty('title')
  expect(saved).not.toHaveProperty('nodeType')
  expect(saved).not.toHaveProperty('type')
})

test('an old view is rejected before replacing the current canvas', () => {
  const graph = createGraph()
  const active = graph.addNode('step')
  const model = graph.model
  const saved = graph.toJSON()
  const oldView = JSON.stringify({
    ...saved,
    nodes: [{ ...saved.nodes[0], definitionId: undefined, nodeType: 'step' }],
  })

  expect(() => graph.fromJSON(oldView)).toThrow('has no definition ID')
  expect(graph.model).toBe(model)
  expect(graph.getNodes()).toContain(active)
})

test('port lookup finds instance overrides by name', () => {
  const graph = createGraph()
  const node = graph.addNode('step', {
    inputs: [{ id: 'out-receive', name: 'branch', type: 'exec' }],
    outputs: [{ id: 'in-go', name: 'result', type: 'exec' }],
  })
  expect(node.getInputPort('branch')).toMatchObject({ id: 'out-receive' })
  expect(node.getOutputPort('result')).toMatchObject({ id: 'in-go' })
  expect(node.getInputPort('exec')).toBeUndefined()
})

test('a string port override saves its editor and keeps its default input after loading', () => {
  const graph = createGraph()
  const node = graph.addNode('step', {
    inputs: [{ name: 'size', type: 'string', editor: 'select', options: [{ label: 'Medium', value: 'medium' }] }],
  })
  const json = graph.toJSON()
  expect(json.nodes.find(item => item.id === node.id)).toMatchObject({
    inputValues: { size: 'medium' },
    inputs: [{ name: 'size', type: 'string', editor: 'select' }],
  })
  graph.fromJSON(JSON.stringify(json))
  const restored = graph.getNodes().find(item => item.id === node.id)
  expect(restored?.getInputPort('size')?.editor).toBe('select')
  expect(restored?.inputValues).toEqual({ size: 'medium' })
})

test.each([false, 0, '', null])('saves configured inputs separately from node data %j', (data) => {
  const graph = createGraph()
  const node = graph.addNode('step', { data })
  const json = graph.toJSON()
  const saved = json.nodes.find(item => item.id === node.id)
  expect(saved).toMatchObject({ data, inputValues: {} })
  expect(saved).not.toHaveProperty('values')
  graph.fromJSON(JSON.stringify(json))
  expect(graph.getNodes().find(item => item.id === node.id)?.data).toBe(data)
})

function connect(graph: Graph, source: NodeInstanceType, target: NodeInstanceType) {
  return graph.addLink(new Graph.LinkInstance(
    { id: source.id, port: source.outputs[0].id! },
    { id: target.id, port: target.inputs[0].id! }
  ))
}

test('back navigation exits embedded levels before returning to the source file', () => {
  const graph = createGraph()
  const goBack = vi.fn()
  graph.setOptions({ navigation: { canGoBack: () => true, goBack } })
  const loop = graph.addNode('loop')
  graph.enterSubgraph(loop.targetGraphId!)

  expect(graph.canGoBack()).toBe(true)
  graph.goBack()
  expect(graph.model.subgraphStack).toHaveLength(1)
  expect(goBack).not.toHaveBeenCalled()
  graph.goBack()
  expect(goBack).toHaveBeenCalledOnce()

  graph.setOptions({ navigation: null })
  expect(graph.canGoBack()).toBe(false)
  graph.goBack()
  expect(goBack).toHaveBeenCalledOnce()
})

test('new graphs contain a Start without adding it to undo history', () => {
  const graph = createGraph()
  expect(graph.getNodes()).toHaveLength(1)
  expect(graph.getNodes()[0].type).toBe('start')
  expect(graph.getNodes()[0].graph).toBe(graph)
  expect(graph.toJSON().nodes[0].id).toBeTruthy()
  expect(graph.undoManager.canUndo()).toBe(false)
  graph.undoManager.undo()
  expect(graph.getNodes()).toHaveLength(1)
})

test('loop serialization preserves configuration without adding an ordinary Start', () => {
  const graph = createGraph()
  const config: LoopConfig = { version: 1, maxIterations: 20, timeoutMs: 1000 }
  graph.addNode('loop', { id: 'loop', loop: config, targetGraphId: 'loop-body' })
  const saved = graph.toJSON()
  const entry = graph.createNodeInstance('loop-entry', { id: 'entry' })
  const ret = graph.createNodeInstance('loop-return', { id: 'return' })
  saved.subgraphs['loop-body'] = { nodes: serializeNodes([entry, ret]), links: [], viewport: { x: 0, y: 0, zoom: 1 } }
  graph.fromJSON(saved)
  const restored = graph.toJSON()
  expect(restored.nodes.find(n => n.id === 'loop')!.loop).toEqual(config)
  expect(restored.subgraphs['loop-body'].nodes.map(n => n.definitionId)).toEqual(['loop-entry', 'loop-return'])
  restored.nodes.find(n => n.id === 'loop')!.loop!.maxIterations = 999
  expect(graph.toJSON().nodes.find(n => n.id === 'loop')!.loop!.maxIterations).toBe(20)
})

test('loading a legacy typed loop entry adds the initial value without changing its existing port ids', () => {
  const graph = createGraph()
  const loop = graph.addNode('loop')
  const saved = graph.toJSON()
  const body = saved.subgraphs[loop.targetGraphId!]
  const entry = body.nodes.find(node => node.definitionId === 'loop-entry')!
  entry.outputs = [
    { name: 'exec', id: 'out-exec', type: 'exec' },
    { name: 'value', id: 'out-saved-value', type: 'any' },
  ]

  graph.fromJSON(saved)

  const restored = graph.toJSON().subgraphs[loop.targetGraphId!]
  expect(restored.nodes.find(node => node.id === entry.id)?.outputs).toEqual([
    ...entry.outputs,
    { name: 'initialValue', id: 'out-initialValue', type: 'any', label: 'Initial value' },
  ])
  expect(restored.links).toEqual(body.links)
})

test('adding a loop creates its body and return controls; deleting it removes the body', () => {
  const graph = createGraph()
  graph.commit(() => graph.addNode('loop'))
  const loop = graph.getNodes().find(node => node.kind === 'loop')!
  expect(loop.targetGraphId).toBeTruthy()
  expect(loop.loop).toEqual(DEFAULT_LOOP_CONFIG)

  const saved = graph.toJSON()
  const bodyNodes = saved.subgraphs[loop.targetGraphId!].nodes
  expect(bodyNodes.map(node => node.definitionId)).toEqual(['loop-entry', 'loop-return'])
  expect(bodyNodes.some(node => node.definitionId === 'start')).toBe(false)
  expect(bodyNodes[0].outputs.map(port => port.name)).toEqual(['exec', 'value', 'initialValue'])
  expect(bodyNodes[1].inputs.map(port => port.name)).toEqual(['next', 'break', 'value'])
  // Connect entry to return initially so new loops have a valid return path.
  expect(saved.subgraphs[loop.targetGraphId!].links).toEqual([
    {
      id: `loop-link-${loop.targetGraphId}`,
      source: { id: bodyNodes[0].id, port: 'out-exec' },
      target: { id: bodyNodes[1].id, port: 'in-next' },
    },
  ])

  graph.removeNodes([loop])
  expect(graph.toJSON().subgraphs[loop.targetGraphId!]).toBeUndefined()
})

test('external subgraph references do not create embedded regions; nodes without ids do', () => {
  const graph = createGraph()
  const external = graph.addNode('subgraph', { targetGraphId: 'external' })
  expect(external.targetGraphId).toBe('external')
  const saved = graph.toJSON()
  const savedCall = saved.nodes.find(node => node.id === external.id)
  expect(savedCall).toHaveProperty('targetGraphId', 'external')
  expect(savedCall).not.toHaveProperty('subgraphId')
  expect(saved.subgraphs.external).toBeUndefined()

  const embedded = graph.addNode('subgraph')
  expect(embedded.targetGraphId).toBeTruthy()
  expect(graph.toJSON().subgraphs[embedded.targetGraphId!]).toBeDefined()
  graph.enterSubgraph(embedded.targetGraphId!)
  expect(graph.getNodes().every(node => node.graphId === embedded.targetGraphId)).toBe(true)
})

test('removing an outer loop also removes nested bodies', () => {  const graph = createGraph()
  graph.commit(() => graph.addNode('loop'))
  const outer = graph.getNodes().find(node => node.kind === 'loop')!
  graph.enterSubgraph(outer.targetGraphId!)
  graph.commit(() => graph.addNode('loop'))
  const inner = graph.getNodes().find(node => node.kind === 'loop')!
  graph.exitSubgraph()
  expect(graph.toJSON().subgraphs[outer.targetGraphId!]).toBeDefined()
  expect(graph.toJSON().subgraphs[inner.targetGraphId!]).toBeDefined()

  graph.removeNodes([outer])

  const remaining = graph.toJSON().subgraphs
  expect(remaining[outer.targetGraphId!]).toBeUndefined()
  expect(remaining[inner.targetGraphId!]).toBeUndefined()
})

test('body entry and return nodes can only be removed with their loop', () => {
  const graph = createGraph()
  graph.commit(() => graph.addNode('loop'))
  const loop = graph.getNodes().find(node => node.kind === 'loop')!
  graph.enterSubgraph(loop.targetGraphId!)
  const entry = graph.getNodes().find(node => node.kind === 'loop-entry')!
  const loopReturn = graph.getNodes().find(node => node.kind === 'loop-return')!
  graph.selectCollection([entry, loopReturn])
  expect(graph.canDeleteSelection()).toBe(false)
  graph.deleteSelection()
  expect(graph.getNodes()).toEqual([entry, loopReturn])
})

test('isLoopBody is true only inside loop bodies, not ordinary subgraphs', () => {
  const graph = createGraph()
  graph.commit(() => graph.addNode('loop'))
  const loop = graph.getNodes().find(node => node.kind === 'loop')!
  expect(graph.model.isLoopBody()).toBe(false)
  graph.enterSubgraph(loop.targetGraphId!)
  expect(graph.model.isLoopBody()).toBe(true)
  graph.exitSubgraph()
  expect(graph.model.isLoopBody()).toBe(false)
})

test('removing the last Start preserves nodes, links, and undo history', () => {
  const graph = createGraph()
  const start = graph.getNodes()[0]
  const step = graph.addNode('step')
  const link = connect(graph, start, step)
  const changed = vi.fn()
  graph.on('changed', changed)
  graph.commit(() => graph.removeNodes([start]))
  graph.selectCollection([start])
  graph.deleteSelection()
  expect(graph.getNodes()).toEqual([start, step])
  expect(graph.getLinks()).toEqual([link])
  expect(graph.selection.has(start)).toBe(true)
  expect(changed).not.toHaveBeenCalled()
  expect(graph.undoManager.canUndo()).toBe(false)
})

test('any Start can be removed when others remain, preserving their links', () => {
  const graph = createGraph()
  const original = graph.getNodes()[0]
  const remaining = graph.addNode('start')
  const step = graph.addNode('step')
  const link = connect(graph, remaining, step)
  graph.selectCollection([original])
  expect(graph.canDeleteSelection()).toBe(true)
  graph.commit(() => graph.removeNodes([original]))
  expect(graph.getNodes()).toEqual([remaining, step])
  expect(graph.getLinks()).toEqual([link])
  graph.removeNodes([remaining])
  expect(graph.getNodes()).toContain(remaining)
})

test('delete availability reflects selection without blocking other nodes or links', () => {
  const graph = createGraph()
  const start = graph.getNodes()[0]
  const step = graph.addNode('step')
  const link = connect(graph, start, step)
  expect(graph.canDeleteSelection()).toBe(false)
  graph.selectCollection([start])
  expect(graph.canDeleteSelection()).toBe(false)
  graph.selectCollection([start, step])
  expect(graph.canDeleteSelection()).toBe(true)
  graph.selectCollection([start, link])
  expect(graph.canDeleteSelection()).toBe(true)
  graph.selectCollection([link])
  expect(graph.canDeleteSelection()).toBe(true)
})

test('bulk deletion preserves one Start and supports undo and redo', () => {
  const graph = createGraph()
  const original = graph.getNodes()[0]
  const extra = graph.addNode('start')
  const step = graph.addNode('step')
  const link = connect(graph, extra, step)
  const saved = graph.toJSON()
  graph.selectCollection([original, extra, step, link])
  expect(graph.canDeleteSelection()).toBe(true)
  graph.deleteSelection()
  expect(graph.getNodes()).toEqual([original])
  expect(graph.getLinks()).toEqual([])
  graph.undoManager.undo()
  expect(graph.toJSON()).toEqual(saved)
  graph.undoManager.redo()
  expect(graph.getNodes()).toEqual([original])
  expect(graph.getLinks()).toEqual([])
})

test('undoing duplicate deletion candidates does not duplicate Start', () => {
  const graph = createGraph()
  const original = graph.getNodes()[0]
  const extra = graph.addNode('start')
  graph.commit(() => graph.removeNodes([original, extra, extra]))
  expect(graph.getNodes()).toEqual([original])
  graph.undoManager.undo()
  expect(graph.getNodes()).toEqual([original, extra])
})

test('undo and redo of a new Start preserve the original entry', () => {
  const graph = createGraph()
  const original = graph.getNodes()[0]
  graph.commit(() => graph.addNode('start'))
  const starts = [...graph.getNodes()]
  graph.undoManager.undo()
  expect(graph.getNodes()).toEqual([original])
  graph.undoManager.redo()
  expect(graph.getNodes()).toEqual(starts)
})

test('loading inserts missing Start nodes with valid unique ids', () => {
  const graph = createGraph()
  graph.addNode('step', { id: 'start-child' })
  const json = graph.toJSON()
  json.nodes = json.nodes.filter(node => node.kind !== 'start')
  json.subgraphs.child = { nodes: structuredClone(json.nodes), links: [], viewport: json.viewport }
  const original = structuredClone(json)
  graph.fromJSON(json)
  const saved = graph.toJSON()
  for (const current of [saved, saved.subgraphs.child]) {
    const starts = current.nodes.filter(node => node.kind === 'start')
    expect(starts).toHaveLength(1)
    expect(starts[0].id).toBeTruthy()
    expect(starts[0].outputs[0].id).toBeTruthy()
    expect(new Set(current.nodes.map(node => node.id)).size).toBe(current.nodes.length)
    expect(current.nodes.find(node => node.id === 'start-child')).toEqual(json.nodes[0])
  }
  expect(json).toEqual(original)
  expect(graph.undoManager.canUndo()).toBe(false)
  graph.enterSubgraph('child')
  expect(graph.getNodes().filter(node => node.kind === 'start')).toHaveLength(1)
  graph.exitSubgraph()
  expect(graph.toJSON().subgraphs.child.nodes.find(node => node.kind === 'start')?.id)
    .toBe(saved.subgraphs.child.nodes.find(node => node.kind === 'start')?.id)
})

test.each([false, true])('loading existing Start nodes preserves nodes, links, and ids (stringified: %s)', stringified => {
  const graph = createGraph()
  const original = graph.getNodes()[0]
  const extra = graph.addNode('start')
  const step = graph.addNode('step')
  connect(graph, original, step)
  connect(graph, extra, step)
  const json = graph.toJSON()
  graph.fromJSON(stringified ? JSON.stringify(json) : json)
  expect(graph.toJSON()).toMatchObject(json)
  expect(graph.undoManager.canUndo()).toBe(false)
})

test('subgraph switching preserves Start/End deletion protection', () => {
  const graph = createGraph()
  const rootStart = graph.getNodes()[0]
  const child = graph.model.createSubgraph('child')!
  const nested = graph.model.createSubgraph('nested')!
  graph.enterSubgraph('child')
  expect(graph.getNodes()).toEqual(child.nodes)
  graph.enterSubgraph('nested')
  const endpoints = [...nested.nodes]
  graph.selectCollection(endpoints)
  expect(graph.canDeleteSelection()).toBe(false)
  graph.removeNodes(endpoints)
  expect(graph.getNodes()).toEqual(endpoints)
  graph.exitSubgraph()
  expect(graph.getNodes()).toEqual(child.nodes)
  graph.exitSubgraph()
  expect(graph.getNodes()).toEqual([rootStart])
  expect(graph.model.subgraphStack).toHaveLength(1)
})

test('clearing a subgraph returns to a main graph with one Start and empty history', () => {
  const graph = createGraph()
  graph.model.createSubgraph('child')
  graph.enterSubgraph('child')
  graph.clear()
  expect(graph.getNodes().map(node => node.kind)).toEqual(['start'])
  expect(graph.getLinks()).toEqual([])
  expect(graph.model.activeGraph).toBe(graph.model.root)
  expect(graph.model.subgraphStack).toEqual([graph.model.root])
  expect(graph.model.subgraphs.size).toBe(0)
  expect(graph.undoManager.canUndo()).toBe(false)
  expect(graph.undoManager.canRedo()).toBe(false)
  const json: JsonGraph = graph.toJSON()
  graph.exitSubgraph()
  expect(graph.toJSON()).toEqual(json)
})

test('destroy cleans up without recreating Start', () => {
  const graph = createGraph()
  const addNode = vi.spyOn(GraphAdapter.prototype, 'addNode')
  graph.destroy()
  graphs.splice(graphs.indexOf(graph), 1)
  expect(graph.getNodes()).toEqual([])
  expect(addNode).not.toHaveBeenCalled()
})

test('language options reach the adapter without changing graph JSON', () => {
  const graph = createGraph()
  const snapshot = graph.toJSON()
  graph.setOptions({ language: 'zh' })
  expect(graph.options.language).toBe('zh')
  expect(graph.adapter.setOptions).toHaveBeenLastCalledWith(expect.objectContaining({ language: 'zh' }))
  expect(graph.toJSON()).toEqual(snapshot)
  graph.setOptions({ language: 'en' })
  expect(graph.options.language).toBe('en')
  expect(graph.toJSON()).toEqual(snapshot)
})

test('named port types reject incompatible links and retain their IDs in graph JSON', () => {
  const fields = schema.object({ id: schema.string() })
  const Customer = defineDataType({ id: 'crm.customer@1', schema: fields })
  const Order = defineDataType({ id: 'crm.order@1', schema: fields })
  const Customers = defineNode({
    definition: { inputs: [], outputs: [{ name: 'customer', type: Customer }] },
  })
  const Orders = defineNode({
    definition: { inputs: [{ name: 'order', type: Order }], outputs: [] },
  })
  const registry = new NodeRegistry().registerDataType(Customer).registerDataType(Order)
    .register('customers', Customers).register('orders', Orders)
  const graph = new Graph(registry)
  graphs.push(graph as unknown as Graph)
  const source = graph.addNode('customers')
  const target = graph.addNode('orders')
  const link = graph.createLinkInstance({
    source: { id: source.id, port: source.outputs[0].id! },
    target: { id: target.id, port: target.inputs[0].id! },
  })
  expect(() => graph.addLink(link)).toThrow(/cannot connect/i)
  const json = graph.toJSON()
  expect(json.nodes.find(node => node.id === target.id)?.inputs[0].type).toBe(Order.id)
  json.links.push({ ...link, id: 'invalid' })
  const diagnostics = vi.fn()
  graph.on('type:diagnostics', diagnostics)
  graph.fromJSON(JSON.stringify(json))
  expect(diagnostics).toHaveBeenCalledWith([
    expect.objectContaining({ severity: 'error', linkId: 'invalid' }),
  ])
})

test('link endpoint reconnection is one undoable change', () => {
  const graph = createGraph()
  const source = graph.addNode('step')
  const target = graph.addNode('step')
  const other = graph.addNode('step')
  const link = graph.addLink(new Graph.LinkInstance(
    { id: source.id, port: source.outputs[0].id! },
    { id: target.id, port: target.inputs[0].id! }
  ))
  const before = {
    source: { ...link.source },
    target: { ...link.target },
  }
  const after = {
    source: { ...link.source },
    target: { id: other.id, port: other.inputs[0].id! },
  }
  const historyBefore = graph.undoManager.undoStack.length

  graph.startTransaction()
  graph.undoManager.recordLinkEnds(link, before, after)
  graph.applyLinkEnds(link, after)
  graph.commitTransaction()

  expect(link.target.id).toBe(other.id)
  expect(graph.undoManager.undoStack).toHaveLength(historyBefore + 1)

  graph.undoManager.undo()
  expect(link.target.id).toBe(target.id)

  graph.undoManager.redo()
  expect(link.target.id).toBe(other.id)
})
