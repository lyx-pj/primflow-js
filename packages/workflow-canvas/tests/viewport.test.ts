// @vitest-environment jsdom
import './svg-shim'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { dia } from '@joint/core'
import { NodeInstance, NodeRegistry } from '@lyx-pj/workflow-model'
import type { Graph } from '../src/Graph'
import { BlueprintModel, GraphModel } from '../src/GraphModel'
import { ScrollerController } from '../src/adapters/joint/ScrollerController'
import { stopWheel } from '../src/ui/helpers'
import { getMinimapBounds } from '../src/ui/minimapBounds'

let current: ReturnType<typeof createScroller> | undefined

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  current?.controller.stopListening()
  current = undefined
  document.body.innerHTML = ''
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

function element(x = 0, y = 0, width = 1000, height = 600) {
  return new dia.Element({ type: 'test.Node', position: { x, y }, size: { width, height } })
}

function createScroller() {
  const el = document.createElement('div')
  document.body.appendChild(el)
  const rect = vi.spyOn(el, 'getBoundingClientRect').mockReturnValue(new DOMRect(100, 50, 800, 600))
  const model = new dia.Graph()
  const node = element()
  model.addCell(node)
  const events = new dia.Graph()
  const graph = { emit: vi.fn() }
  const paper = {
    el, model, scale: vi.fn(), translate: vi.fn(), setGridSize: vi.fn(),
    on: events.on.bind(events), off: events.off.bind(events),
  }
  const controller = new ScrollerController({ paper: paper as unknown as dia.Paper, graph: graph as unknown as Graph })
  controller.startListening()
  vi.advanceTimersByTime(20)
  graph.emit.mockClear()
  return { el, model, node, rect, events, graph, paper, controller }
}

test('minimap bounds pad node bounds by 400; empty graphs and links do not affect them', () => {
  const model = new dia.Graph()
  expect(getMinimapBounds(model)).toEqual({ x: -400, y: -400, width: 800, height: 800 })
  const first = element(-300, -200, 100, 60)
  const second = element(900, 500, 100, 60)
  model.addCells([first, second, new dia.Link({ type: 'test.Link', source: { id: first.id }, target: { id: second.id }, vertices: [{ x: 10000, y: 10000 }] })])
  expect(getMinimapBounds(model)).toEqual({ x: -700, y: -600, width: 2100, height: 1560 })
  second.position(1900, 500)
  expect(getMinimapBounds(model)).toEqual({ x: -700, y: -600, width: 3100, height: 1560 })
})

test('imperative panning and mouse dragging are not constrained by node bounds', () => {
  current = createScroller()
  const { controller, el, model } = current
  const original = getMinimapBounds(model)
  controller.position = { x: 10000, y: -10000 }
  expect(controller.position).toEqual({ x: 10000, y: -10000 })
  controller.position = { x: 0, y: 0 }
  el.dispatchEvent(new MouseEvent('mousedown', { button: 2, clientX: 400, clientY: 300 }))
  el.dispatchEvent(new MouseEvent('mousemove', { clientX: -10000, clientY: 10000 }))
  expect(controller.position).toEqual({ x: -10400, y: 9700 })
  el.dispatchEvent(new MouseEvent('mouseup'))
  expect(getMinimapBounds(model)).toEqual(original)
  expect(current.graph.emit).toHaveBeenLastCalledWith('viewport:change', { x: -10400, y: 9700, scale: 1 })
})

test.each([
  { deltaX: 40, deltaY: 0 },
  { deltaX: 0, deltaY: -60 },
  { deltaX: 40.5, deltaY: -60.25 },
])('wheel scrolling pans in screen pixels without zooming or browser defaults: %j', ({ deltaX, deltaY }) => {
  current = createScroller()
  const { controller, el, graph } = current
  controller.scale = 2
  controller.position = { x: 100, y: 200 }
  const evt = new WheelEvent('wheel', { deltaX, deltaY, bubbles: true, cancelable: true })
  el.dispatchEvent(evt)
  expect(controller.scale).toBe(2)
  expect(controller.position).toEqual({ x: 100 - deltaX, y: 200 - deltaY })
  expect(evt.defaultPrevented).toBe(true)
  expect(graph.emit).toHaveBeenLastCalledWith('viewport:change', { x: 100 - deltaX, y: 200 - deltaY, scale: 2 })
})

test.each([
  { deltaMode: WheelEvent.DOM_DELTA_LINE, x: -48, y: 72 },
  { deltaMode: WheelEvent.DOM_DELTA_PAGE, x: -1600, y: 1800 },
])('line and page wheel deltas are converted to pixels: %j', ({ deltaMode, x, y }) => {
  current = createScroller()
  current.el.style.lineHeight = '24px'
  current.el.dispatchEvent(new WheelEvent('wheel', { deltaX: 2, deltaY: -3, deltaMode }))
  expect(current.controller.position).toEqual({ x, y })
  expect(current.controller.scale).toBe(1)
})

test.each([{ ctrlKey: true }, { metaKey: true }])('pinch and modified wheel zoom around the pointer while allowing unlimited panning: %j', (modifier) => {
  current = createScroller()
  const { controller, el, model } = current
  const original = getMinimapBounds(model)
  // For a container at (100, 50), local pointer (400, 300) stays over the same graph point.
  const evt = new WheelEvent('wheel', { clientX: 500, clientY: 350, deltaY: -200, cancelable: true, ...modifier })
  el.dispatchEvent(evt)
  expect(evt.defaultPrevented).toBe(true)
  expect(controller.scale).toBe(2)
  expect(controller.position).toEqual({ x: -400, y: -300 })
  expect((400 - controller.position.x) / controller.scale).toBe(400)
  expect((300 - controller.position.y) / controller.scale).toBe(300)
  el.dispatchEvent(new WheelEvent('wheel', { clientX: 500, clientY: 350, deltaY: 100000, ...modifier }))
  expect(controller.scale).toBe(0.2)
  expect(controller.position).toEqual({ x: 320, y: 240 })
  controller.position = { x: -100000, y: 100000 }
  expect(controller.position).toEqual({ x: -100000, y: 100000 })
  expect(getMinimapBounds(model)).toEqual(original)
})

test('canvas dragging suppresses default scrolling without extra pan or zoom', () => {
  current = createScroller()
  const { el, controller, graph } = current
  el.dispatchEvent(new MouseEvent('mousedown', { button: 2 }))
  for (const ctrlKey of [false, true]) {
    const evt = new WheelEvent('wheel', { deltaX: 50, deltaY: -100, ctrlKey, cancelable: true })
    el.dispatchEvent(evt)
    expect(evt.defaultPrevented).toBe(true)
  }
  expect(controller.viewport).toEqual({ x: 0, y: 0, scale: 1 })
  expect(graph.emit).not.toHaveBeenCalled()
})

test('panels retain native scrolling while outside wheel events remain untouched', () => {
  current = createScroller()
  const panel = document.createElement('div')
  panel.addEventListener('wheel', stopWheel)
  current.el.appendChild(panel)
  for (const target of [panel, document.body]) {
    const evt = new WheelEvent('wheel', { deltaX: 40, deltaY: 60, bubbles: true, cancelable: true })
    target.dispatchEvent(evt)
    expect(evt.defaultPrevented).toBe(false)
  }
  expect(current.controller.viewport).toEqual({ x: 0, y: 0, scale: 1 })
  expect(current.graph.emit).not.toHaveBeenCalled()
})

test('switching containers restores native scrolling; repeated setup does not duplicate panning', () => {
  current = createScroller()
  const { el, controller, paper, graph } = current
  const next = document.createElement('div')
  document.body.appendChild(next)
  paper.el = next
  controller.stopListening()
  controller.startListening()
  controller.startListening()
  const previousEvent = new WheelEvent('wheel', { deltaX: 40, deltaY: 60, cancelable: true })
  el.dispatchEvent(previousEvent)
  expect(previousEvent.defaultPrevented).toBe(false)
  expect(controller.viewport).toEqual({ x: 0, y: 0, scale: 1 })
  expect(graph.emit).not.toHaveBeenCalled()
  const nextEvent = new WheelEvent('wheel', { deltaX: 40, deltaY: 60, cancelable: true })
  next.dispatchEvent(nextEvent)
  expect(nextEvent.defaultPrevented).toBe(true)
  expect(controller.position).toEqual({ x: -40, y: -60 })
  expect(graph.emit).toHaveBeenCalledTimes(1)
  controller.stopListening()
  const stoppedEvent = new WheelEvent('wheel', { deltaY: 100, cancelable: true })
  next.dispatchEvent(stoppedEvent)
  expect(stoppedEvent.defaultPrevented).toBe(false)
  expect(controller.position).toEqual({ x: -40, y: -60 })
})

test('node and container changes do not recenter; stopped listeners ignore dragging and wheel', () => {
  current = createScroller()
  const { controller, rect, events, node, model, graph } = current
  controller.position = { x: -10000, y: 10000 }
  node.resize(100, 60)
  vi.advanceTimersByTime(20)
  expect(controller.position).toEqual({ x: -10000, y: 10000 })
  rect.mockReturnValue(new DOMRect(100, 50, 1600, 1200))
  events.trigger('resize')
  vi.advanceTimersByTime(20)
  expect(controller.position).toEqual({ x: -10000, y: 10000 })
  model.addCell(element(3000, 2000))
  controller.stopListening()
  expect(vi.getTimerCount()).toBe(0)
  model.addCell(element(5000, 4000))
  model.clear()
  current.el.dispatchEvent(new MouseEvent('mousedown', { button: 2, clientX: 0, clientY: 0 }))
  current.el.dispatchEvent(new MouseEvent('mousemove', { clientX: 1000, clientY: 1000 }))
  current.el.dispatchEvent(new WheelEvent('wheel', { deltaY: -200 }))
  expect(controller.position).toEqual({ x: -10000, y: 10000 })
  expect(controller.scale).toBe(1)
  expect(graph.emit).not.toHaveBeenCalled()
  expect(vi.getTimerCount()).toBe(0)
})

test('loading and switching subgraphs preserve their zoom and distant pan positions', () => {
  const registry = new NodeRegistry()
  const makeStart = (id: string, x: number, y: number) => new NodeInstance(registry.getStartNodeClass(), { id, position: { x, y } })
  const root = new GraphModel('root', [makeStart('root-a', 0, 0), makeStart('root-b', 1000, 600)])
  root.viewport = { x: -80000, y: -40000, scale: 2 }
  const child = new GraphModel('child', [makeStart('child-a', -2000, -1000), makeStart('child-b', 0, 0)])
  child.viewport = { x: 80000, y: 50000, scale: 0.5 }
  const model = new BlueprintModel(root, new Map([['child', child]]))
  const rendered = new dia.Graph()
  let nodes: typeof root.nodes = []
  let scale = 1
  let position = { x: 0, y: 0 }
  const graph = {
    nodeRegistry: registry,
    undoManager: { clear: vi.fn(), undoStack: [], redoStack: [] },
    skipsUndoManager: false,
    on: vi.fn(), off: vi.fn(), startTransaction: vi.fn(), commitTransaction: vi.fn(),
    get scale() { return scale },
    set scale(value: number) { scale = value },
    get position() { return position },
    set position(value: typeof position) { position = { ...value } },
    getNodes: () => nodes,
    getLinks: () => [],
    addNodes: (incoming: typeof nodes) => {
      nodes.push(...incoming)
      rendered.addCells(incoming.map(node => new dia.Element({ id: node.id, type: 'test.Node', position: node.position, size: { width: 100, height: 60 } })))
    },
    removeNodes: (outgoing: typeof nodes) => {
      nodes = nodes.filter(node => !outgoing.includes(node))
      rendered.removeCells(outgoing.map(node => rendered.getCell(node.id)))
    },
    addLinks: () => [], removeLinks: vi.fn(),
  }
  model.setGraph(graph as unknown as Graph)
  expect({ ...position, scale }).toEqual(root.viewport)
  model.enterSubgraph('child')
  expect({ ...position, scale }).toEqual(child.viewport)
  expect(rendered.getElements().map(node => node.id)).toEqual(['child-a', 'child-b'])
  model.exitSubgraph()
  expect({ ...position, scale }).toEqual(root.viewport)
  expect(rendered.getElements().map(node => node.id)).toEqual(['root-a', 'root-b'])
})
