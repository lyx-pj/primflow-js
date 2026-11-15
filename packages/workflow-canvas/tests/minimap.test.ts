// @vitest-environment jsdom
import './svg-shim'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { dia } from '@joint/core'
import { Minimap } from '../src/ui/components/Minimap'
import { OverlayLayer } from '../src/ui/OverlayLayer'
import type { CanvasGraph } from '../src/ui/types'

let current: ReturnType<typeof mountMinimap> | undefined

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  current?.minimap.destroy()
  current?.overlay.dispose()
  current = undefined
  document.body.innerHTML = ''
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

function node(id: string, x: number, y: number) {
  return new dia.Element({ id, type: 'test.Node', position: { x, y }, size: { width: 100, height: 60 } })
}

function mountMinimap(cells: dia.Cell[] = []) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const rect = vi.spyOn(container, 'getBoundingClientRect').mockReturnValue(new DOMRect(50, 40, 800, 600))
  const events = new dia.Graph()
  const model = new dia.Graph()
  model.addCells(cells)
  let scale = 1
  let position = { x: 0, y: 0 }
  const graph = {
    options: {},
    get position() { return position },
    set position(value: { x: number; y: number }) {
      position = value
      events.trigger('translate')
    },
    emit: vi.fn(),
  }
  const paper = {
    el: container, model,
    scale: () => ({ sx: scale, sy: scale }),
    translate: () => ({ tx: position.x, ty: position.y }),
    on: events.on.bind(events), off: events.off.bind(events),
  }
  const overlay = new OverlayLayer(container)
  const minimap = new Minimap(graph as unknown as CanvasGraph, paper as unknown as dia.Paper, overlay)
  return {
    container, rect, graph, paper, overlay, minimap, events,
    svg: () => container.querySelector<SVGSVGElement>('[aria-label="Graph overview"]')!,
    card: () => container.querySelector<HTMLElement>('.bpgraph-minimap')!,
    setScale(value: number) { scale = value; events.trigger('scale') },
  }
}

function flushFrame() { vi.advanceTimersByTime(20) }

test('minimap tracks nodes and links after insertion, removal, movement, resizing, and subgraph resets', () => {
  const first = node('first', -300, -200)
  first.set('style', { header: { background: '#78b852' } })
  const second = node('second', 900, 500)
  const link = new dia.Link({ type: 'test.Link', source: { id: first.id }, target: { id: second.id } })
  current = mountMinimap([first, second, link])
  const nodes = () => current!.container.querySelectorAll('.bpgraph-minimap-node')
  expect(current.container.querySelector('.bpgraph-minimap')?.textContent?.trim()).toBe('')
  expect(current.svg().hasAttribute('tabindex')).toBe(false)
  expect(current.container.querySelector('.bpgraph-minimap-canvas, .bpgraph-minimap-viewport')).toBeNull()
  expect(current.svg().getAttribute('preserveAspectRatio')).toBe('none')
  expect(nodes()).toHaveLength(2)
  expect(nodes()[0].namespaceURI).toBe('http://www.w3.org/2000/svg')
  expect(nodes()[0].getAttribute('fill')).toBe('#78b852')
  expect(current.container.querySelectorAll('.bpgraph-minimap-link')).toHaveLength(1)

  first.position(-600, -400)
  first.resize(180, 100)
  link.vertices([{ x: 500, y: 0 }])
  flushFrame()
  expect(nodes()[0].getAttribute('x')).toBe('-600')
  expect(nodes()[0].getAttribute('width')).toBe('180')
  expect(current.container.querySelector('.bpgraph-minimap-link')?.getAttribute('points')).toContain('500,0')
  const third = node('third', 200, 300)
  current.paper.model.addCell(third)
  flushFrame()
  expect(nodes()).toHaveLength(3)
  third.remove()
  flushFrame()
  expect(nodes()).toHaveLength(2)
  current.paper.model.resetCells([node('child', 10, 20)])
  flushFrame()
  expect(nodes()).toHaveLength(1)
  expect(nodes()[0].getAttribute('x')).toBe('10')
  expect(current.container.querySelector('.bpgraph-minimap-link')).toBeNull()
})

test('minimap bounds depend only on nodes and fixed padding, not zoom, pan, container size, or links', () => {
  const first = node('first', -300, -200)
  const second = node('second', 900, 500)
  current = mountMinimap([first, second])
  const bounds = current.svg().getAttribute('viewBox')
  expect(bounds).toBe('-700 -600 2100 1560')
  current.setScale(2)
  current.graph.position = { x: -400, y: 200 }
  flushFrame()
  expect(current.svg().getAttribute('viewBox')).toBe(bounds)
  current.rect.mockReturnValue(new DOMRect(50, 40, 1000, 700))
  current.events.trigger('resize')
  flushFrame()
  expect(current.svg().getAttribute('viewBox')).toBe(bounds)
  current.paper.model.addCell(new dia.Link({ type: 'test.Link', source: { id: first.id }, target: { id: second.id }, vertices: [{ x: 100000, y: 100000 }] }))
  flushFrame()
  expect(current.svg().getAttribute('viewBox')).toBe(bounds)
  first.position(-3000, 2000)
  flushFrame()
  expect(current.svg().getAttribute('viewBox')).toBe('-3400 100 4800 2360')
})

test('clicking a minimap node centers it while preserving zoom and saving the viewport', () => {
  current = mountMinimap([node('target', -300, -200)])
  current.setScale(2)
  flushFrame()
  const svg = current.svg()
  vi.spyOn(current.card(), 'getBoundingClientRect').mockReturnValue(new DOMRect(70, 80, 160, 96))
  const [x, y, width, height] = svg.getAttribute('viewBox')!.split(' ').map(Number)
  svg.dispatchEvent(new MouseEvent('click', {
    bubbles: true,
    clientX: 70 + (-250 - x) / width * 160,
    clientY: 80 + (-170 - y) / height * 96,
  }))
  expect(current.graph.position.x).toBeCloseTo(900)
  expect(current.graph.position.y).toBeCloseTo(640)
  expect(current.paper.scale().sx).toBe(2)
  expect(current.graph.emit).toHaveBeenLastCalledWith('viewport:change', {
    ...current.graph.position, scale: 2,
  })
})

test('the full rectangular card and edges remain clickable without zoom-dependent clamping', () => {
  current = mountMinimap([node('target', -300, -200)])
  current.setScale(2)
  flushFrame()
  const map = current.svg()
  const card = current.card()
  vi.spyOn(card, 'getBoundingClientRect').mockReturnValue(new DOMRect(70, 80, 160, 96))
  const original = map.getAttribute('viewBox')!
  const [x, y, width, height] = original.split(' ').map(Number)
  const click = (worldX: number, worldY: number) => {
    card.dispatchEvent(new MouseEvent('click', {
      bubbles: true,
      clientX: 70 + (worldX - x) / width * 160,
      clientY: 80 + (worldY - y) / height * 96,
    }))
    flushFrame()
  }
  for (const [pointX, pointY] of [[x + 1, y + 1], [x + width - 1, y + height - 1]]) {
    click(pointX, pointY)
    const centerX = (400 - current.graph.position.x) / current.paper.scale().sx
    const centerY = (300 - current.graph.position.y) / current.paper.scale().sx
    expect(centerX).toBeCloseTo(pointX)
    expect(centerY).toBeCloseTo(pointY)
    expect(map.getAttribute('viewBox')).toBe(original)
  }
  current.graph.emit.mockClear()
  card.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 71, clientY: 128 }))
  expect(current.graph.emit).toHaveBeenCalledOnce()
  expect(current.graph.position.x).toBeCloseTo(1788.75)
  card.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 229, clientY: 128 }))
  expect(current.graph.emit).toHaveBeenCalledTimes(2)
  expect(current.graph.position.x).toBeCloseTo(11.25)
  current.setScale(0.2)
  click(x + 1, y + 1)
  const firstPosition = { ...current.graph.position }
  click(x + width - 1, y + height - 1)
  expect(current.graph.position).not.toEqual(firstPosition)
  expect(current.paper.scale().sx).toBe(0.2)
  expect((400 - current.graph.position.x) / 0.2).toBeCloseTo(x + width - 1)
  expect((300 - current.graph.position.y) / 0.2).toBeCloseTo(y + height - 1)
  expect(current.container.querySelector('.bpgraph-minimap-viewport')).toBeNull()
  expect(map.getAttribute('viewBox')).toBe(original)
})

test('minimap ignores keyboard navigation and prevents canvas click and wheel interactions', () => {
  current = mountMinimap([node('target', -300, -200)])
  const svg = current.svg()
  const canvasEvent = vi.fn()
  for (const type of ['mousedown', 'pointerdown', 'click', 'wheel']) {
    current.container.addEventListener(type, canvasEvent)
    svg.dispatchEvent(new MouseEvent(type, { bubbles: true }))
  }
  expect(canvasEvent).not.toHaveBeenCalled()
  for (const key of ['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'Enter', ' ']) {
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })
    svg.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(false)
  }
  expect(current.graph.position).toEqual({ x: 0, y: 0 })
  expect(current.graph.emit).not.toHaveBeenCalled()
})

test('empty graphs and hidden containers remain valid; destroy clears subscriptions and frames', () => {
  current = mountMinimap()
  expect(current.container.querySelector('.bpgraph-minimap-node')).toBeNull()
  current.rect.mockReturnValue(new DOMRect())
  current.events.trigger('resize')
  flushFrame()
  expect(current.svg().getAttribute('viewBox')!.split(' ').map(Number).every(Number.isFinite)).toBe(true)
  current.svg().dispatchEvent(new MouseEvent('click', { bubbles: true }))
  expect(current.graph.emit).not.toHaveBeenCalled()
  const modelOff = vi.spyOn(current.paper.model, 'off')
  current.paper.model.addCell(node('new', 0, 0))
  current.minimap.destroy()
  expect(modelOff).toHaveBeenCalled()
  expect(vi.getTimerCount()).toBe(0)
  current.paper.model.addCell(node('later', 100, 100))
  current.events.trigger('resize')
  expect(vi.getTimerCount()).toBe(0)
  expect(current.container.querySelector('.bpgraph-minimap')).toBeNull()
  current.overlay.dispose()
  current = undefined
})
