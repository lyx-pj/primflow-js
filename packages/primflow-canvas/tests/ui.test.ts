// @vitest-environment jsdom
//
// Test canvas UI independently of concrete JointJS views: CanvasUI uses paper
// on/off/el, adapter lookup and selection, and imperative Graph APIs; minimal stubs suffice.
import './svg-shim'
import { afterEach, expect, test, vi } from 'vitest'
import { html, render } from 'lit-html'
import { dia } from '@joint/core'
import type { InputPort } from '@lyx-pj/primflow-model'
import { Node, NodeInstance, NodeRegistry } from '@lyx-pj/primflow-model'
import { Graph, type NodeInstanceType } from '../src/Graph'
import { UndoManager } from '../src/UndoManager'
import type { GraphAdapter } from '../src/adapters/GraphAdapter'
import { CanvasUI } from '../src/ui/CanvasUI'
import { NodeToolView, NodeToolsView } from '../src/NodeToolsView'
import { portEditorTemplate } from '../src/ui/portEditors'
import { renderNodeHeader } from '../src/ui/nodeHeader'

class Hello extends Node {
  static definition = {
    type: 'default',
    title: 'Hello',
    inputs: [{ name: 'exec', type: 'exec' }] as const,
    outputs: [{ name: 'ok', type: 'exec' }] as const,
  }
}

type PaperHandler = (...args: unknown[]) => void

function createHarness(graphOptions: Record<string, unknown> = {}) {
  const container = document.createElement('div')
  document.body.appendChild(container)

  const nodes: NodeInstanceType[] = []
  const handlers = new Map<string, Set<PaperHandler>>()
  const graphHandlers = new Map<string, Set<PaperHandler>>()
  const deleted = vi.fn()

  const graph = {
    options: { ...graphOptions } as Record<string, unknown>,
    scale: 1,
    position: { x: 0, y: 0 },
    zoom: vi.fn((scale: number) => {
      graph.scale = scale
      handlers.get('scale')?.forEach(handler => handler(scale, scale))
    }),
    nodeRegistry: { getNodeClasses: vi.fn(() => [Hello]) },
    model: { subgraphStack: [{ id: 'root' }], isLoopBody: () => false, hasSubgraph: vi.fn(() => false) },
    selection: new Set<unknown>(),
    skipsUndoManager: false,
    undoManager: null! as UndoManager,
    clientToGraphPoint: (x: number, y: number) => ({ x, y }),
    startTransaction: vi.fn(),
    commitTransaction: vi.fn(),
    addNode: vi.fn((nodeClass: typeof Hello) => {
      const node = {
        id: `node-${nodes.length + 1}`,
        type: nodeClass.type,
        position: { x: 0, y: 0 },
      } as unknown as NodeInstanceType
      nodes.push(node)
      return node
    }),
    removeNodes: vi.fn(),
    removeSwitchCase: vi.fn(() => true),
    on: (event: string, handler: PaperHandler) => {
      if (!graphHandlers.has(event)) graphHandlers.set(event, new Set())
      graphHandlers.get(event)!.add(handler)
    },
    off: (event: string, handler: PaperHandler) => {
      graphHandlers.get(event)?.delete(handler)
    },
    emit: (event: string, ...args: unknown[]) => {
      graphHandlers.get(event)?.forEach((handler) => handler(...args))
    },
    clearSelection: vi.fn(() => {
      graph.selection.clear()
      graph.emit('selection:changed', [])
    }),
    select: vi.fn(),
    copySelection: vi.fn(),
    pasteClipboard: vi.fn(),
    deleteSelection: deleted,
    exitSubgraph: vi.fn(),
    canGoBack: Graph.prototype.canGoBack,
    goBack: Graph.prototype.goBack,
    canDeleteSelection: vi.fn(() => true),
    getNodeExecutionStatus: vi.fn(() => 'idle'),
    getNodeExecutionData: vi.fn(),
    findNode: vi.fn(() => undefined),
    findNodeAnywhere: vi.fn(() => undefined),
    isReplayMode: vi.fn(() => false),
    replayLabel: '',
    exitReplay: vi.fn(),
    executionStatus: 'idle',
    pausedNodeId: null as string | null,
  }

  const cancelSelection = vi.fn()
  const adapter = {
    selection: graph.selection,
    findNode: vi.fn(),
    findLink: vi.fn(),
    selectionChanged: vi.fn(() => graph.emit('selection:changed', [...graph.selection])),
    clearSelection: vi.fn(() => graph.selection.clear()),
    select: vi.fn((item: unknown) => graph.selection.add(item)),
    cancelSelection,
    getNodeSize: () => ({ width: 100, height: 40 }),
  }

  const paper = {
    el: container,
    options: {} as Record<string, unknown>,
    model: new dia.Graph(),
    scale: () => ({ sx: graph.scale, sy: graph.scale }),
    translate: () => ({ tx: graph.position.x, ty: graph.position.y }),
    findViewByModel: vi.fn(),
    on: (event: string, handler: PaperHandler) => {
      if (!handlers.has(event)) handlers.set(event, new Set())
      handlers.get(event)!.add(handler)
    },
    off: (event: string, handler: PaperHandler) => {
      handlers.get(event)?.delete(handler)
    },
  }

  graph.undoManager = new UndoManager(graph as unknown as Graph)
  const ui = new CanvasUI(graph as unknown as Graph, adapter as unknown as GraphAdapter, paper as never)

  return {
    container,
    graph,
    adapter,
    ui,
    paper,
    nodes,
    deleted,
    emitPaper(event: string, ...args: unknown[]) {
      handlers.get(event)?.forEach((handler) => handler(...args))
    },
    emitGraph(event: string, ...args: unknown[]) {
      if (event === 'selection:changed') {
        graph.selection.clear()
        for (const item of args[0] as unknown[]) graph.selection.add(item)
      }
      graphHandlers.get(event)?.forEach((handler) => handler(...args))
    },
  }
}

let current: ReturnType<typeof createHarness> | null = null

afterEach(() => {
  current?.ui.destroy()
  current = null
  document.body.innerHTML = ''
  vi.useRealTimers()
})

function previewNode(id = 'preview-node') {
  const node = new NodeInstance(Hello, { id })
  const anchor = document.createElement('div')
  current!.container.appendChild(anchor)
  vi.spyOn(current!.container, 'getBoundingClientRect').mockReturnValue(new DOMRect(50, 40, 800, 600))
  vi.spyOn(anchor, 'getBoundingClientRect').mockReturnValue(new DOMRect(150, 140, 120, 80))
  current!.paper.findViewByModel.mockReturnValue({ el: anchor })
  current!.graph.getNodeExecutionStatus.mockReturnValue('completed')
  current!.graph.getNodeExecutionData.mockReturnValue({ inputs: { value: 'Actual input' }, outputs: { result: 0 } })
  current!.emitGraph('node:mouseenter', node)
  return node
}

test('completed nodes show inputs and outputs; pending nodes do not; supports circular references and BigInt', () => {
  current = createHarness()
  const node = previewNode()
  const cycle: Record<string, unknown> = { count: 1n }
  cycle.self = cycle
  const shared = { message: 'Repeated references remain visible' }
  current.graph.getNodeExecutionData.mockReturnValue({
    inputs: { value: '<img src=x onerror=alert(1)>', flag: false, empty: null, missing: undefined },
    outputs: { result: cycle, repeated: { first: shared, second: shared } },
  })
  current.ui.refreshNodeExecutionPreview(node.id)
  const card = current.container.querySelector('[role="tooltip"]')!
  expect(card.textContent).toContain('Inputs')
  expect(card.textContent).toContain('Outputs')
  expect(card.textContent).toContain('<img src=x onerror=alert(1)>')
  expect(card.querySelector('img')).toBeNull()
  for (const value of ['false', 'null', 'undefined', '1n', '[Circular reference]']) expect(card.textContent).toContain(value)
  expect(card.textContent?.match(/Repeated references remain visible/g)).toHaveLength(2)

  for (const status of ['idle', 'pending', 'running']) {
    current.graph.getNodeExecutionStatus.mockReturnValue(status)
    current.ui.refreshNodeExecutionPreview(node.id)
    current.emitGraph('node:mouseenter', node)
    expect(current.container.querySelector('[role="tooltip"]')).toBeNull()
  }
})

test('late mouseleave events do not read disposed nodes', () => {
  current = createHarness()
  const node = previewNode()
  expect(current.container.querySelector('[role="tooltip"]')).toBeTruthy()

  // Entering a subgraph removes old nodes before delayed mouseleave events arrive.
  current.emitGraph('node:removed', [node], { type: 'removed' })
  expect(() => current!.emitGraph('node:mouseleave', undefined)).not.toThrow()
  expect(current.container.querySelector('[role="tooltip"]')).toBeNull()
})

test('only the active breakpoint previews inputs, hides Outputs, and supports card hover and delayed closing', () => {
  vi.useFakeTimers()
  current = createHarness()
  const node = previewNode()
  current.graph.getNodeExecutionStatus.mockReturnValue('pending')
  current.graph.executionStatus = 'paused'
  current.graph.pausedNodeId = node.id
  current.graph.getNodeExecutionData.mockReturnValue({ inputs: { value: 0 }, outputs: { old: 'Previous output' } })
  current.ui.refreshNodeExecutionPreview(node.id)
  const card = () => current!.container.querySelector<HTMLElement>('[role="tooltip"]')!
  expect(card().textContent).toContain('Paused at breakpoint')
  expect(card().querySelector('h4')?.textContent).toBe('Inputs')
  expect(card().querySelector('pre')?.textContent).toBe('0')
  expect(card().textContent).not.toContain('Outputs')
  expect(card().textContent).not.toContain('Previous output')
  current.emitGraph('node:mouseleave', node)
  vi.advanceTimersByTime(200)
  card().dispatchEvent(new MouseEvent('mouseenter'))
  vi.advanceTimersByTime(1000)
  expect(card()).toBeTruthy()
  card().dispatchEvent(new MouseEvent('mouseleave'))
  vi.advanceTimersByTime(250)
  expect(card()).toBeNull()
  current.emitGraph('node:mouseenter', node)
  expect(card()).toBeTruthy()

  current.graph.pausedNodeId = 'other-node'
  current.ui.refreshNodeExecutionPreview(node.id)
  current.emitGraph('node:mouseenter', node)
  expect(card()).toBeNull()

  current.graph.pausedNodeId = node.id
  current.emitGraph('node:mouseenter', node)
  current.graph.executionStatus = 'running'
  current.ui.refreshNodeExecutionPreview(node.id)
  expect(card()).toBeNull()
})

test('leaving nodes closes after a delay; hovering the card or node cancels closing; scrolling does not zoom canvas', () => {
  vi.useFakeTimers()
  current = createHarness()
  const node = previewNode()
  const card = () => current!.container.querySelector<HTMLElement>('[role="tooltip"]')!
  current.emitGraph('node:mouseleave', node)
  vi.advanceTimersByTime(200)
  expect(card()).toBeTruthy()
  card().dispatchEvent(new MouseEvent('mouseenter'))
  vi.advanceTimersByTime(1000)
  expect(card()).toBeTruthy()

  const wheel = vi.fn()
  current.container.addEventListener('wheel', wheel)
  card().dispatchEvent(new WheelEvent('wheel', { bubbles: true }))
  expect(wheel).not.toHaveBeenCalled()
  card().focus()
  card().dispatchEvent(new MouseEvent('mouseleave'))
  vi.advanceTimersByTime(1000)
  expect(card()).toBeTruthy()
  card().blur()
  vi.advanceTimersByTime(200)
  current.emitGraph('node:mouseenter', node)
  vi.advanceTimersByTime(1000)
  expect(card()).toBeTruthy()
  current.emitGraph('node:mouseleave', node)
  vi.advanceTimersByTime(250)
  expect(card()).toBeNull()
})

test('switching ignores stale leave events; empty data shows hints; bottom-right cards shift left and limit height', () => {
  vi.useFakeTimers()
  current = createHarness()
  const first = previewNode('first')
  const second = previewNode('second')
  current.emitGraph('node:mouseleave', first)
  vi.advanceTimersByTime(300)
  expect(current.container.querySelector('[role="tooltip"]')).toBeTruthy()

  const anchor = current.paper.findViewByModel.mock.results.at(-1)!.value.el as Element
  vi.mocked(anchor.getBoundingClientRect).mockReturnValue(new DOMRect(750, 580, 80, 40))
  const card = current.container.querySelector<HTMLElement>('[role="tooltip"]')!
  Object.defineProperties(card, { offsetWidth: { value: 360 }, offsetHeight: { value: 300 } })
  current.graph.getNodeExecutionData.mockReturnValue({ inputs: {}, outputs: {} })
  current.ui.refreshNodeExecutionPreview(second.id)
  expect(card.style.left).toBe('328px')
  expect(card.style.top).toBe('288px')
  expect(card.style.maxHeight).toBe('576px')
  expect(card.textContent).toContain('No data ports')
  current.graph.getNodeExecutionData.mockReturnValue(undefined)
  current.ui.refreshNodeExecutionPreview(second.id)
  expect(card.textContent).toContain('No execution data')
})

test('Esc、viewport changes, subgraph switches, node deletion, and destroy close previews and clear delays', () => {
  vi.useFakeTimers()
  current = createHarness()
  for (const event of ['viewport:change', 'subgraph:enter', 'subgraph:exit', 'node:removed']) {
    const node = previewNode()
    current.emitGraph('node:mouseleave', node)
    current.emitGraph(event, [])
    expect(current.container.querySelector('[role="tooltip"]')).toBeNull()
    expect(vi.getTimerCount()).toBe(0)
  }
  previewNode()
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
  expect(current.container.querySelector('[role="tooltip"]')).toBeNull()
  const node = previewNode()
  current.emitGraph('node:mouseleave', node)
  current.ui.destroy()
  expect(vi.getTimerCount()).toBe(0)
  current.emitGraph('node:mouseenter', node)
  expect(current.container.querySelector('.bpgraph-overlay')).toBeNull()
  current = null
})

test('palette renders registered nodes and inserts them at the pointer', () => {
  current = createHarness()
  const { container, graph, nodes } = current

  current.ui.openPalette(120, 80)
  const palette = container.querySelector('.bpgraph-palette')
  expect(palette).toBeTruthy()

  const items = Array.from(container.querySelectorAll<HTMLButtonElement>('.bpgraph-palette-item'))
  expect(items.map((item) => item.querySelector('.bpgraph-palette-title')?.textContent)).toEqual(['Hello'])

  items[0].dispatchEvent(new MouseEvent('click', { clientX: 120, clientY: 80, bubbles: true }))

  expect(graph.addNode).toHaveBeenCalledTimes(1)
  expect(graph.startTransaction).toHaveBeenCalled()
  expect(graph.commitTransaction).toHaveBeenCalled()
  expect(nodes).toHaveLength(1)
  expect(container.querySelector('.bpgraph-palette')).toBeNull()
})

test('palette supports multiple entries for one class and applies entry defaults', () => {
  class Call extends Hello { static readonly type = 'call' }
  current = createHarness({ palette: {
    items: () => [Hello],
    entries: () => [
      { nodeClass: Call, title: 'Subgraph A', category: 'Subgraph', defaults: { title: 'Subgraph A', subgraphId: 'sg-a' } },
      { nodeClass: Call, title: 'Subgraph B', category: 'Subgraph', defaults: { title: 'Subgraph B', subgraphId: 'sg-b' } },
    ],
  } })
  const { container, graph } = current

  current.ui.openPalette(120, 80)
  const items = [...container.querySelectorAll<HTMLButtonElement>('.bpgraph-palette-item')]
  expect(items.map((item) => item.querySelector('.bpgraph-palette-title')?.textContent))
    .toEqual(['Subgraph A', 'Subgraph B', 'Hello'])
  expect([...container.querySelectorAll('section')].map((section) => section.getAttribute('aria-label')))
    .toEqual(['Subgraph', 'Other nodes'])

  items[1].dispatchEvent(new MouseEvent('click', { clientX: 120, clientY: 80, bubbles: true }))

  expect(graph.addNode).toHaveBeenCalledWith(Call, { title: 'Subgraph B', subgraphId: 'sg-b' })
})

test('loop body palettes hide event sources and persistent timers', () => {
  class Step extends Hello { static readonly type = 'step' }
  class Source extends Hello {
    static readonly type = 'source'
    static definition = { ...Hello.definition, executionMode: 'source' as const }
  }
  current = createHarness({ palette: { items: () => [Step, Source] } })
  current.graph.model.isLoopBody = () => true
  current.ui.openPalette(20, 20)
  const items = [...current.container.querySelectorAll('.bpgraph-palette-item')]
  expect(items.map((item) => item.getAttribute('data-type'))).toEqual(['step'])
})

test('palette filters by title and closes on Esc', () => {
  current = createHarness()
  const { container } = current

  current.ui.openPalette(0, 0)
  const search = container.querySelector<HTMLInputElement>('.bpgraph-palette-search')!
  search.value = 'nothing'
  search.dispatchEvent(new Event('input', { bubbles: true }))
  expect(container.querySelector('.bpgraph-palette-empty')).toBeTruthy()

  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
  expect(container.querySelector('.bpgraph-palette')).toBeNull()
})

test('palette groups categories, combines filtering and search, and resets filters on reopen', () => {
  class TextNode extends Hello { static readonly type = 'text' }
  class LogNode extends Hello { static readonly type = 'log' }
  current = createHarness({ palette: {
    items: () => [TextNode, LogNode, Hello],
    describe: (nodeClass: typeof Hello) => nodeClass === TextNode
      ? { title: 'Text Input', category: 'Basic input', description: 'Provide text', iconClass: 'ri-text', keywords: ['string'] }
      : nodeClass === LogNode ? { title: 'Debug Output', category: 'Debug output', description: 'Record execution results' } : undefined,
  } })
  const { container, ui } = current
  ui.openPalette(120, 80)
  expect(document.activeElement).toBe(container.querySelector('.bpgraph-palette-search'))
  expect([...container.querySelectorAll('section')].map((section) => section.getAttribute('aria-label')))
    .toEqual(['Basic input', 'Debug output', 'Other nodes'])
  const category = [...container.querySelectorAll<HTMLButtonElement>('.bpgraph-palette-category')]
    .find((button) => button.textContent?.includes('Basic input'))!
  category.click()
  expect(category.getAttribute('aria-pressed')).toBe('true')
  expect(container.querySelectorAll('.bpgraph-palette-item')).toHaveLength(1)
  const item = container.querySelector<HTMLButtonElement>('.bpgraph-palette-item')!
  expect(item.hasAttribute('title')).toBe(false)
  expect(container.querySelector('.bpgraph-palette-item')?.textContent).not.toContain('Provide text')
  expect(container.querySelector('.bpgraph-palette-tooltip')).toBeNull()
  item.focus()
  const tooltip = container.querySelector('[role="tooltip"]')!
  expect(tooltip.textContent?.trim()).toBe('Provide text')
  expect(item.getAttribute('aria-describedby')).toBe(tooltip.id)
  const icon = container.querySelector('.bpgraph-palette-icon')!
  expect(icon.querySelector('i')?.className).toBe('ri-text')
  expect(icon.textContent?.trim()).toBe('')
  expect(icon.getAttribute('aria-hidden')).toBe('true')
  const search = container.querySelector<HTMLInputElement>('.bpgraph-palette-search')!
  search.value = 'Record'
  search.dispatchEvent(new Event('input', { bubbles: true }))
  expect(container.querySelector('.bpgraph-palette-empty')).toBeTruthy()
  search.value = ' STRING '
  search.dispatchEvent(new Event('input', { bubbles: true }))
  search.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
  expect(current.graph.addNode).toHaveBeenCalledWith(TextNode, {})
  ui.openPalette(120, 80)
  expect(container.querySelectorAll('.bpgraph-palette-item')).toHaveLength(3)
  expect(container.querySelector<HTMLInputElement>('.bpgraph-palette-search')?.value).toBe('')
})

test('search matches names, categories, descriptions, and types; descriptions appear in tooltips; Enter adds the first grouped result', () => {
  class First extends Hello { static readonly type = 'first' }
  class Second extends Hello { static readonly type = 'second' }
  class Third extends Hello { static readonly type = 'third' }
  current = createHarness({ palette: {
    items: () => [First, Second, Third],
    describe: (nodeClass: typeof Hello) => ({
      title: nodeClass === First ? 'Unmatched' : 'Target',
      category: nodeClass === Second ? 'Second category' : 'First category',
      description: '<img src=x onerror=alert(1)>',
    }),
  } })
  current.ui.openPalette(120, 80)
  const { container } = current
  const search = container.querySelector<HTMLInputElement>('.bpgraph-palette-search')!
  const setQuery = (value: string) => {
    search.value = value
    search.dispatchEvent(new Event('input', { bubbles: true }))
  }
  expect(container.querySelector('img')).toBeNull()
  const item = container.querySelector<HTMLButtonElement>('.bpgraph-palette-item')!
  expect(item.hasAttribute('title')).toBe(false)
  expect(container.textContent).not.toContain('<img src=x onerror=alert(1)>')
  item.focus()
  expect(container.querySelector('[role="tooltip"]')?.textContent?.trim()).toBe('<img src=x onerror=alert(1)>')
  expect(container.querySelector('img')).toBeNull()
  for (const query of ['First category', 'second', 'onerror']) {
    setQuery(query)
    expect(container.querySelectorAll('.bpgraph-palette-item')).toHaveLength(query === 'First category' ? 2 : query === 'second' ? 1 : 3)
  }
  setQuery('Target')
  expect(container.querySelector('.bpgraph-palette-item')?.getAttribute('data-type')).toBe('third')
  search.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', isComposing: true, bubbles: true }))
  expect(current.graph.addNode).not.toHaveBeenCalled()
  search.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
  expect(current.graph.addNode).toHaveBeenCalledWith(Third, {})
  expect(current.nodes[0].position).toEqual({ x: 70, y: 60 })
})

test('descriptions appear after a delay, allow tooltip hover, and do not show stale content on rapid switching', () => {
  vi.useFakeTimers()
  class Other extends Hello { static readonly type = 'other' }
  current = createHarness({ palette: {
    items: () => [Hello, Other],
    describe: (nodeClass: typeof Hello) => ({ description: nodeClass === Hello ? 'First description' : 'Second description' }),
  } })
  current.ui.openPalette(120, 80)
  const { container } = current
  const [first, second] = container.querySelectorAll<HTMLButtonElement>('.bpgraph-palette-item')
  const tooltip = () => container.querySelector<HTMLElement>('.bpgraph-palette-tooltip')
  first.dispatchEvent(new MouseEvent('mouseenter'))
  vi.advanceTimersByTime(179)
  expect(tooltip()).toBeNull()
  vi.advanceTimersByTime(1)
  expect(tooltip()?.textContent?.trim()).toBe('First description')
  first.dispatchEvent(new MouseEvent('mouseleave'))
  tooltip()!.dispatchEvent(new MouseEvent('mouseenter'))
  vi.advanceTimersByTime(500)
  expect(tooltip()).toBeTruthy()
  const wheel = vi.fn()
  container.addEventListener('wheel', wheel)
  tooltip()!.dispatchEvent(new WheelEvent('wheel', { bubbles: true }))
  expect(wheel).not.toHaveBeenCalled()
  tooltip()!.dispatchEvent(new MouseEvent('mouseleave'))
  vi.advanceTimersByTime(120)
  expect(tooltip()).toBeNull()
  expect(first.hasAttribute('aria-describedby')).toBe(false)

  first.dispatchEvent(new MouseEvent('mouseenter'))
  vi.advanceTimersByTime(100)
  first.dispatchEvent(new MouseEvent('mouseleave'))
  second.dispatchEvent(new MouseEvent('mouseenter'))
  vi.advanceTimersByTime(180)
  expect(tooltip()?.textContent?.trim()).toBe('Second description')
  expect(first.hasAttribute('aria-describedby')).toBe(false)
  expect(second.getAttribute('aria-describedby')).toBe(tooltip()?.id)
})

test('tooltip overlays sit outside scrolling lists and shift left within canvas bounds', () => {
  const width = vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(220)
  const height = vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(48)
  try {
    current = createHarness({ palette: { describe: () => ({ description: 'Node description' }) } })
    vi.spyOn(current.container, 'getBoundingClientRect').mockReturnValue(new DOMRect(50, 40, 800, 600))
    current.ui.openPalette(750, 620)
    const item = current.container.querySelector<HTMLButtonElement>('.bpgraph-palette-item')!
    vi.spyOn(item, 'getBoundingClientRect').mockReturnValue(new DOMRect(750, 620, 80, 30))
    item.focus()
    const tooltip = current.container.querySelector<HTMLElement>('[role="tooltip"]')!
    expect(tooltip.closest('.bpgraph-palette-list')).toBeNull()
    expect(parseFloat(tooltip.style.left) + 220).toBeLessThan(750 - 50)
    expect(parseFloat(tooltip.style.top) + 48).toBeLessThanOrEqual(600 - 8)
  } finally {
    width.mockRestore()
    height.mockRestore()
  }
})

test('scrolling, filtering, dragging, and closing hide tooltips; destroy clears pending timers', () => {
  vi.useFakeTimers()
  current = createHarness({ palette: { describe: () => ({ description: 'Node description' }) } })
  const { container, ui } = current
  const focusItem = () => {
    ui.openPalette(120, 80)
    const item = container.querySelector<HTMLButtonElement>('.bpgraph-palette-item')!
    item.focus()
    expect(container.querySelector('[role="tooltip"]')).toBeTruthy()
    return item
  }
  focusItem()
  container.querySelector('.bpgraph-palette-list')!.dispatchEvent(new Event('scroll'))
  expect(container.querySelector('[role="tooltip"]')).toBeNull()
  focusItem()
  const search = container.querySelector<HTMLInputElement>('.bpgraph-palette-search')!
  search.value = 'missing'
  search.dispatchEvent(new Event('input', { bubbles: true }))
  expect(container.querySelector('[role="tooltip"]')).toBeNull()
  const item = focusItem()
  const drag = new Event('dragstart') as DragEvent
  Object.defineProperty(drag, 'dataTransfer', { value: { setData: vi.fn(), effectAllowed: '' } })
  item.dispatchEvent(drag)
  expect(container.querySelector('[role="tooltip"]')).toBeNull()
  document.dispatchEvent(new Event('dragend'))
  focusItem()
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
  expect(container.querySelector('[role="tooltip"]')).toBeNull()
  ui.openPalette(120, 80)
  // Flush queued browser focus events before checking tooltip timers independently.
  vi.runOnlyPendingTimers()
  expect(vi.getTimerCount()).toBe(0)
  container.querySelector('.bpgraph-palette-item')!.dispatchEvent(new MouseEvent('mouseenter'))
  expect(vi.getTimerCount()).toBe(1)
  ui.destroy()
  current = null
  expect(vi.getTimerCount()).toBe(0)
  vi.advanceTimersByTime(500)
  expect(container.querySelector('[role="tooltip"]')).toBeNull()
})

test('subgraph palettes hide Start, refresh category counts, and support closing', () => {
  const registry = new NodeRegistry()
  current = createHarness({ palette: { items: () => registry.getNodeClasses() } })
  current.graph.model.subgraphStack.push({ id: 'child' })
  current.ui.openPalette(20, 20)
  const { container } = current
  expect(container.querySelector('[data-type="start"]')).toBeNull()
  // Loops can create their own bodies; entries and returns can only be generated by bodies.
  expect(container.querySelector('[data-type="loop"]')).toBeTruthy()
  expect(container.querySelector('[data-type="subgraph"]')).toBeTruthy()
  expect(container.querySelector('[data-type="loop-entry"]')).toBeNull()
  expect(container.querySelector('[data-type="loop-return"]')).toBeNull()
  expect(container.querySelectorAll('.bpgraph-palette-item')).toHaveLength(2)
  container.querySelector<HTMLButtonElement>('[aria-label="Close node palette"]')!.click()
  expect(container.querySelector('.bpgraph-palette')).toBeNull()
})

test('blank-space double-click opens the palette unless palette.trigger=false', () => {
  current = createHarness()
  const { container, graph } = current
  const evt = { clientX: 40, clientY: 40, preventDefault: () => {} }

  graph.options.palette = { trigger: false }
  current.emitPaper('blank:pointerdblclick', evt, 40, 40)
  expect(container.querySelector('.bpgraph-palette')).toBeNull()

  graph.options.palette = {}
  current.emitPaper('blank:pointerdblclick', evt, 40, 40)
  expect(container.querySelector('.bpgraph-palette')).toBeTruthy()
})

test('built-in context menu deletion calls deleteSelection', () => {
  current = createHarness()
  const { container, deleted } = current

  current.emitPaper('blank:contextmenu', { clientX: 10, clientY: 10, preventDefault: () => {} }, 10, 10)
  const menu = container.querySelector('.bpgraph-context')
  expect(menu).toBeTruthy()

  const labels = Array.from(menu!.querySelectorAll('.bpgraph-context-label')).map((item) =>
    item.textContent?.trim()
  )
  expect(labels).toEqual(['Add node', 'Paste'])
  expect(menu!.querySelector('.bpgraph-context-hint')?.textContent).toBe('Double-click')
  expect(menu!.querySelectorAll('.bpgraph-context-icon svg')).toHaveLength(2)

  current.graph.selection.add({ id: 'node-1' })
  current.adapter.findNode.mockReturnValue({ id: 'node-1' })
  current.emitPaper('element:contextmenu', { model: { id: 'node-1' } }, { clientX: 0, clientY: 0, preventDefault: () => {} }, 0, 0)
  const deleteItem = Array.from(container.querySelectorAll<HTMLButtonElement>('.bpgraph-menu-item')).find(
    (item) => item.textContent?.includes('Delete')
  )
  deleteItem!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  expect(deleted).toHaveBeenCalledTimes(1)
})

test('disabled deletion is ignored and availability refreshes on reopening', () => {
  current = createHarness()
  const node = new NodeInstance(new NodeRegistry().getStartNodeClass(), { id: 'only-start' })
  current.adapter.findNode.mockReturnValue(node)
  current.graph.canDeleteSelection.mockReturnValue(false)
  const openMenu = () => current!.emitPaper('element:contextmenu', { model: { id: node.id } },
    { clientX: 20, clientY: 20, preventDefault: vi.fn() }, 20, 20)

  openMenu()
  const disabledDelete = current.container.querySelector<HTMLButtonElement>('[data-id="delete"]')!
  expect(disabledDelete.disabled).toBe(true)
  expect(current.container.querySelector<HTMLButtonElement>('[data-id="copy"]')!.disabled).toBe(false)
  disabledDelete.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  expect(current.deleted).not.toHaveBeenCalled()
  expect(current.container.querySelector('.bpgraph-context')).toBeTruthy()

  current.graph.canDeleteSelection.mockReturnValue(true)
  openMenu()
  const enabledDelete = current.container.querySelector<HTMLButtonElement>('[data-id="delete"]')!
  expect(enabledDelete.disabled).toBe(false)
  enabledDelete.click()
  expect(current.deleted).toHaveBeenCalledOnce()
})

test.each([
  ['MacIntel', '⌘+C', '⌘+V', '⌫'],
  ['Win32', 'Ctrl+C', 'Ctrl+V', 'Del'],
])('context menus show platform shortcuts on %s and group debug and delete actions', (platform, copy, paste, remove) => {
  const platformSpy = vi.spyOn(navigator, 'platform', 'get').mockReturnValue(platform)
  try {
    current = createHarness()
    current.emitPaper('blank:contextmenu', { clientX: 20, clientY: 20, preventDefault: vi.fn() }, 20, 20)
    const pasteItem = current.container.querySelector<HTMLButtonElement>('[data-id="paste"]')!
    expect(pasteItem.querySelector('kbd')?.textContent).toBe(paste)
    expect(current.container.querySelector('.bpgraph-context-heading')?.textContent?.trim()).toBe('Canvas actions')
    pasteItem.click()
    expect(current.graph.pasteClipboard).toHaveBeenCalledOnce()
    expect(current.container.querySelector('.bpgraph-context')).toBeNull()

    const node = new NodeInstance(Hello, { id: 'menu-node' })
    current.adapter.findNode.mockReturnValue(node)
    current.emitPaper('element:contextmenu', { model: { id: node.id } },
      { clientX: 20, clientY: 20, preventDefault: vi.fn() }, 20, 20)
    const menu = current.container.querySelector('.bpgraph-context')!
    expect(menu.querySelector('.bpgraph-context-heading')?.textContent?.trim()).toBe('Node actions')
    expect(menu.querySelector('[data-id="copy"] kbd')?.textContent).toBe(copy)
    expect(menu.querySelector('[data-id="delete"] kbd')?.textContent).toBe(remove)
    expect(menu.querySelector('[data-id="breakpoint"] kbd')).toBeNull()
    expect(menu.querySelectorAll('[role="separator"]')).toHaveLength(2)
    expect(menu.querySelector('[data-id="delete"]')?.classList.contains('is-danger')).toBe(true)
    current.container.querySelector<HTMLButtonElement>('[data-id="copy"]')!.click()
    expect(current.graph.copySelection).toHaveBeenCalledOnce()
  } finally {
    platformSpy.mockRestore()
  }
})

test('context menus support icon overrides, custom shortcuts, separators, and disabled items', () => {
  const run = vi.fn()
  current = createHarness({ contextMenu: {
    icons: { copy: 'ri-file-copy-line', rename: 'ri-pencil-line' },
    items: () => [
      { id: 'rename', label: 'Rename', iconClass: 'ri-edit-line', shortcut: 'F2', separatorBefore: true, run },
      { id: 'copy', label: 'Copy', disabled: true, run },
      { id: 'delete', label: 'Delete', separatorBefore: true, danger: true, run },
    ],
  } })
  current.emitPaper('blank:contextmenu', { clientX: 20, clientY: 20, preventDefault: vi.fn() }, 20, 20)
  const menu = current.container.querySelector('.bpgraph-context')!
  expect(menu.querySelector('[data-id="rename"] i')?.className).toBe('ri-edit-line')
  expect(menu.querySelector('[data-id="copy"] i')?.className).toBe('ri-file-copy-line')
  expect(menu.querySelector('[data-id="rename"] kbd')?.textContent).toBe('F2')
  expect(menu.querySelectorAll('[role="separator"]')).toHaveLength(1)
  const copy = menu.querySelector<HTMLButtonElement>('[data-id="copy"]')!
  expect(copy.disabled).toBe(true)
  copy.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  expect(run).not.toHaveBeenCalled()
  expect(current.container.querySelector('.bpgraph-context')).toBeTruthy()
  menu.querySelector<HTMLButtonElement>('[data-id="rename"]')!.click()
  expect(run).toHaveBeenCalledOnce()
  expect(current.container.querySelector('.bpgraph-context')).toBeNull()
})

test('context menus avoid canvas edges using measured size and prevent wheel zoom', () => {
  const rectSpy = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    return this.classList.contains('bpgraph-context') ? new DOMRect(0, 0, 240, 160) : new DOMRect(50, 40, 800, 600)
  })
  try {
    current = createHarness()
    current.emitPaper('blank:contextmenu', { clientX: 840, clientY: 630, preventDefault: vi.fn() }, 840, 630)
    const menu = current.container.querySelector<HTMLElement>('.bpgraph-context')!
    expect(parseFloat(menu.style.left) + 240).toBeLessThanOrEqual(800 - 4)
    expect(parseFloat(menu.style.top) + 160).toBeLessThanOrEqual(600 - 4)
    const wheel = vi.fn()
    current.container.addEventListener('wheel', wheel)
    menu.dispatchEvent(new WheelEvent('wheel', { bubbles: true }))
    expect(wheel).not.toHaveBeenCalled()
  } finally {
    rectSpy.mockRestore()
  }
})

test('node menus toggle breakpoints while link menus omit them', () => {
  current = createHarness()
  const node = new NodeInstance(Hello, { id: 'breakpoint-node' })
  current.adapter.findNode.mockReturnValue(node)
  const openMenu = () => current!.emitPaper('element:contextmenu',
    { model: { id: node.id } }, { clientX: 10, clientY: 10, preventDefault: () => {} }, 10, 10)

  openMenu()
  const setBreakpoint = current.container.querySelector<HTMLButtonElement>('[data-id="breakpoint"]')!
  expect(setBreakpoint.textContent).toContain('Set breakpoint')
  setBreakpoint.click()
  expect(node.breakpoint).toBe(true)
  openMenu()
  const removeBreakpoint = current.container.querySelector<HTMLButtonElement>('[data-id="breakpoint"]')!
  expect(removeBreakpoint.textContent).toContain('Remove breakpoint')
  removeBreakpoint.click()
  expect(node.breakpoint).toBe(false)

  current.adapter.findLink.mockReturnValue({ id: 'link-1' })
  current.emitPaper('link:contextmenu', { model: { id: 'link-1' } },
    { clientX: 10, clientY: 10, preventDefault: () => {} }, 10, 10)
  expect(current.container.querySelector('[data-id="breakpoint"]')).toBeNull()
})

test('canvas and empty overlay layers suppress native context menus until destroy', () => {
  current = createHarness()
  const { container, ui } = current
  for (const target of [container, container.querySelector('.bpgraph-panel-layer')!]) {
    const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true })
    target.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(true)
  }

  ui.destroy()
  const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true })
  container.dispatchEvent(event)
  expect(event.defaultPrevented).toBe(false)
  current = null
})

test('right-click selection opens only the menu and does not open node panels', () => {
  current = createHarness()
  const node = createNodeStub()
  const other = createNodeStub({ id: 'node-2' })
  current.adapter.findNode.mockImplementation((id: string) => id === other.id ? other : node)
  current.emitPaper('element:contextmenu', { model: { id: node.id } },
    { clientX: 10, clientY: 10, preventDefault: vi.fn() }, 10, 10)

  expect(current.graph.selection.has(node)).toBe(true)
  expect(current.container.querySelector('.bpgraph-context')).toBeTruthy()
  expect(current.container.querySelector('.bpgraph-node-panel')).toBeNull()

  current.emitGraph('selection:changed', [other])
  expect(current.graph.selection.has(other)).toBe(true)
  expect(current.container.querySelector('.bpgraph-node-panel')).toBeNull()
})

test('menu mousedown / pointerdown events do not bubble into canvas selection', () => {
  current = createHarness()
  const { container } = current
  current.ui.openPalette(10, 10)

  const onMouseDown = vi.fn()
  const onPointerDown = vi.fn()
  container.addEventListener('mousedown', onMouseDown)
  container.addEventListener('pointerdown', onPointerDown)

  const item = container.querySelector<HTMLButtonElement>('.bpgraph-palette-item')!
  // JointJS selection uses native mousedown mapped to blank:pointerdown; stop it at the overlay.
  item.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
  item.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }))

  expect(onMouseDown).not.toHaveBeenCalled()
  expect(onPointerDown).not.toHaveBeenCalled()
})

test('palette dragging cancels stale selection boxes first', () => {
  current = createHarness()
  const { container, adapter } = current
  current.ui.openPalette(10, 10)

  const item = container.querySelector<HTMLButtonElement>('.bpgraph-palette-item')!
  const dragstart = new Event('dragstart', { bubbles: true }) as DragEvent
  Object.defineProperty(dragstart, 'dataTransfer', {
    value: { setData: vi.fn(), setDragImage: vi.fn(), effectAllowed: '' },
  })
  item.dispatchEvent(dragstart)

  expect(adapter.cancelSelection).toHaveBeenCalled()
})

test('palette defaults inject business values', () => {
  current = createHarness()
  current.graph.options.palette = {
    defaults: () => ({ values: { greeting: 'hi' } }),
  }

  current.ui.openPalette(0, 0)
  current.container
    .querySelector<HTMLButtonElement>('.bpgraph-palette-item')!
    .dispatchEvent(new MouseEvent('click', { bubbles: true }))

  expect(current.graph.addNode).toHaveBeenCalledWith(Hello, { values: { greeting: 'hi' } })
})

test('floating toolbars render lit templates and track node positions', () => {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const graph = { container, on: vi.fn(), off: vi.fn() }
  const node = { graph, bbox: { x: 10, y: 20, width: 100, height: 40 } }

  class LabelTool extends NodeToolView {
    protected template() {
      return html`<span class="label">tool</span>`
    }
  }

  const tools = new NodeToolsView([new LabelTool()])
  tools.configure(node as unknown as NodeInstanceType)

  expect(container.querySelector('.bpgraph-node-tools-view')).toBeTruthy()
  expect(container.querySelector('.label')?.textContent).toBe('tool')
  expect(tools.element?.style.transform).toBe('translate(10px, 20px)')

  tools.remove()
  expect(container.querySelector('.bpgraph-node-tools-view')).toBeNull()
})

function createPortHandlers() {
  return { input: vi.fn(), focus: vi.fn(), blur: vi.fn(), toggle: vi.fn(), step: vi.fn() }
}

test('port editor templates: text / number / dropdown', () => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const handlers = createPortHandlers()
  const style = {}

  render(portEditorTemplate({ name: 'text', type: 'string' } as InputPort, style, { text: 'hello' }, handlers), host)
  const input = host.querySelector<HTMLInputElement>('[data-port-field="text"]')!
  expect(input.value).toBe('hello')
  input.value = 'changed'
  input.dispatchEvent(new Event('input', { bubbles: true }))
  expect(handlers.input).toHaveBeenCalledWith(expect.objectContaining({ name: 'text' }), expect.anything())

  render(portEditorTemplate({ name: 'count', type: 'number' } as InputPort, style, { count: 3 }, handlers), host)
  expect(host.querySelector<HTMLInputElement>('[data-port-field="count"]')!.value).toBe('3')
  host.querySelector('.bpgraph-port-step')!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  expect(handlers.step).toHaveBeenCalledWith(expect.objectContaining({ name: 'count' }), 1)
  host
    .querySelector<HTMLInputElement>('[data-port-field="count"]')!
    .dispatchEvent(new FocusEvent('blur'))
  expect(handlers.blur).toHaveBeenCalled()

  render(
    portEditorTemplate(
      { name: 'mode', type: 'select', _options: [{ label: 'A', value: 'a' }] } as InputPort,
      style,
      { mode: 'a' },
      handlers
    ),
    host
  )
  const select = host.querySelector<HTMLInputElement>('[data-port-field="mode"]')!
  expect(select.value).toBe('A')
  select.dispatchEvent(new FocusEvent('focus'))
  expect(handlers.focus).toHaveBeenCalled()
})

test('boolean port editors use native checkboxes and support toggling', () => {
  const editor = document.createElement('div')
  document.body.appendChild(editor)
  const handlers = createPortHandlers()
  const port = { name: 'flag', type: 'boolean', label: 'Condition' } as InputPort

  render(portEditorTemplate(port, {}, { flag: true }, handlers), editor)

  const checkbox = editor.querySelector<HTMLInputElement>('input[type="checkbox"]')!
  expect(checkbox.checked).toBe(true)
  expect(checkbox.getAttribute('aria-label')).toBe('Condition')

  checkbox.click()
  expect(checkbox.checked).toBe(false)
  expect(handlers.toggle).toHaveBeenCalledWith(expect.objectContaining({ name: 'flag' }))
  // Rerendering true must restore checked state even when lit cached the previous binding.
  render(portEditorTemplate(port, {}, { flag: true }, handlers), editor)
  expect(checkbox.checked).toBe(true)
})

test('header redraws with node width without stacking path/text', () => {
  document.body.innerHTML = '<svg><g id="header"></g></svg>'
  const group = document.getElementById('header') as unknown as SVGGElement
  const style = { header: { height: 24, fontSize: 12 } }

  renderNodeHeader(group, { title: 'Switch', size: { width: 300, height: 100 }, style })
  expect(group.querySelectorAll('path')).toHaveLength(1)
  expect(group.querySelector('path')!.getAttribute('d')).toContain('Q300,0')

  // removing all ports narrows the node; its header must also narrow
  renderNodeHeader(group, { title: 'Switch', size: { width: 150, height: 100 }, style })
  expect(group.querySelectorAll('path')).toHaveLength(1)
  expect(group.querySelectorAll('text')).toHaveLength(1)
  const d = group.querySelector('path')!.getAttribute('d')!
  expect(d).toContain('Q150,0')
  expect(d).not.toContain('300')
})

test('node titles show breakpoint indicators and remove them when cleared', () => {
  document.body.innerHTML = '<svg><g id="header"></g></svg>'
  const group = document.getElementById('header') as unknown as SVGGElement
  const options = { title: 'Node', size: { width: 300, height: 100 }, style: {} }
  renderNodeHeader(group, { ...options, breakpoint: true })
  expect(group.querySelector('[aria-label="Breakpoint"]')).toBeTruthy()
  expect(group.querySelector('title')?.textContent).toContain('pause before execution')
  renderNodeHeader(group, { ...options, breakpoint: false })
  expect(group.querySelector('[aria-label="Breakpoint"]')).toBeNull()
})

function createNodeStub(overrides: Record<string, unknown> = {}) {
  return {
    id: 'node-1',
    type: 'switch',
    nodeType: 'Switch',
    title: 'Test Switch',
    inputs: [
      { name: 'exec', type: 'exec', id: 'in-0' },
      { name: 'case_1_value', type: 'string', id: 'in-1' },
      { name: 'case_2_value', type: 'string', id: 'in-2' },
    ],
    outputs: [
      { name: 'default', type: 'exec', id: 'out-0' },
      { name: 'condition', type: 'string', id: 'out-1' },
    ],
    values: { case_1_value: 'a' },
    ...overrides,
  } as unknown as NodeInstanceType
}

test('single selection renders the node panel inside canvas', () => {
  current = createHarness()
  const node = createNodeStub()
  current.adapter.findNode.mockReturnValue(node)
  current.emitGraph('selection:changed', [node])

  const panel = current.container.querySelector('.bpgraph-node-panel')
  expect(panel).toBeTruthy()
  expect(panel!.querySelector('.bpgraph-node-panel-title')!.textContent).toBe('Test Switch')
  // exec ports are omitted from the panel
  expect(panel!.querySelectorAll('.bpgraph-node-panel-field')).toHaveLength(2)
  expect(panel!.querySelector<HTMLInputElement>('[data-field="case_1_value"]')!.value).toBe('a')
})

test('node descriptions appear below Outputs as plain text with preserved newlines', () => {
  class Described extends Hello { static readonly type = 'described' }
  const description = 'Additional node description\n<img src=x onerror=alert(1)>'
  const describe = vi.fn(() => ({ description }))
  current = createHarness({ palette: { describe } })
  current.graph.nodeRegistry.getNodeClasses.mockReturnValue([Described])
  const node = new NodeInstance(Described, { id: 'described-node' })
  current.adapter.findNode.mockReturnValue(node)
  current.emitGraph('selection:changed', [node])

  const panel = current.container.querySelector('.bpgraph-node-panel')!
  const sections = [...panel.querySelectorAll('.bpgraph-node-panel-section')]
  expect([...panel.querySelectorAll('h4')].map(heading => heading.textContent)).toEqual(['Inputs', 'Outputs'])
  expect(sections[2].querySelector('h4')).toBeNull()
  expect(sections[2].querySelector('p')?.textContent).toBe(description)
  expect(panel.querySelector('img')).toBeNull()
  expect(panel.querySelector('.bpgraph-node-panel-meta')?.textContent).not.toContain(description)
  expect(describe).toHaveBeenCalledWith(Described, current.graph)
})

test('switching nodes updates descriptions and hides missing or unregistered descriptions', () => {
  class First extends Hello { static readonly type = 'first' }
  class Second extends Hello { static readonly type = 'second' }
  class Unknown extends Hello { static readonly type = 'unknown' }
  current = createHarness({ palette: { describe: (nodeClass: typeof Hello) => (
    nodeClass === First ? { description: 'First node description' } : { description: '  ' }
  ) } })
  current.graph.nodeRegistry.getNodeClasses.mockReturnValue([First, Second])
  for (const nodeClass of [First, Second, Unknown, First]) {
    const node = new NodeInstance(nodeClass, { id: nodeClass.type })
    current.adapter.findNode.mockReturnValue(node)
    current.emitGraph('selection:changed', [node])
    const description = current.container.querySelector('.bpgraph-node-panel-description')
    if (nodeClass === First) expect(description?.textContent).toBe('First node description')
    else expect(description).toBeNull()
  }
})

test('editing panel values writes back to the node', () => {
  current = createHarness()
  const node = createNodeStub()
  current.adapter.findNode.mockReturnValue(node)
  current.emitGraph('selection:changed', [node])

  const field = current.container.querySelector<HTMLInputElement>('[data-field="case_1_value"]')!
  field.value = 'b'
  field.dispatchEvent(new Event('input', { bubbles: true }))

  expect(node.values).toEqual({ case_1_value: 'b' })
})

test('Start panels omit trigger hints, Inputs, Outputs, and execution previews', () => {
  current = createHarness()
  const registry = new NodeRegistry()
  const node = new NodeInstance(registry.getStartNodeClass(), { id: 'start' })
  current.adapter.findNode.mockReturnValue(node)
  current.emitGraph('selection:changed', [node])
  const panel = current.container.querySelector('.bpgraph-node-panel')!
  expect(panel.textContent).not.toContain('Trigger downstream nodes through execution ports')
  expect(panel.querySelectorAll('.bpgraph-node-panel-section')).toHaveLength(0)
  expect(panel.textContent).not.toContain('Inputs')
  expect(panel.textContent).not.toContain('Outputs')
  for (const status of ['running', 'paused'] as const) {
    current.graph.executionStatus = status
    current.graph.pausedNodeId = status === 'paused' ? node.id : null
    current.graph.getNodeExecutionStatus.mockReturnValue(status === 'paused' ? 'pending' : 'completed')
    current.emitGraph('node:mouseenter', node)
    expect(current.container.querySelector('[role="tooltip"]')).toBeNull()
  }
})

test('panel case deletion uses graph.removeSwitchCase and hides the last delete button', () => {
  current = createHarness()
  const node = createNodeStub()
  current.adapter.findNode.mockReturnValue(node)
  current.emitGraph('selection:changed', [node])

  const buttons = current.container.querySelectorAll('.bpgraph-node-panel-danger')
  expect(buttons).toHaveLength(2)
  buttons[0].dispatchEvent(new MouseEvent('click', { bubbles: true }))
  expect(current.graph.removeSwitchCase).toHaveBeenCalledWith(node, 'case_1_value')

  const singleCase = createNodeStub({
    inputs: [
      { name: 'exec', type: 'exec', id: 'in-0' },
      { name: 'case_1_value', type: 'string', id: 'in-1' },
    ],
  })
  current.adapter.findNode.mockReturnValue(singleCase)
  current.emitGraph('selection:changed', [singleCase])
  expect(current.container.querySelector('.bpgraph-node-panel-danger')).toBeNull()
})

test('multiple selection hides panels; clearing then selecting one reopens them', () => {
  current = createHarness()
  const node = createNodeStub()
  const other = createNodeStub({ id: 'node-2' })
  current.adapter.findNode.mockImplementation((id: string) => (id === 'node-2' ? other : node))

  current.emitGraph('selection:changed', [node])
  expect(current.container.querySelector('.bpgraph-node-panel')).toBeTruthy()

  current.emitGraph('selection:changed', [node, other])
  expect(current.container.querySelector('.bpgraph-node-panel')).toBeNull()

  current.emitGraph('selection:changed', [node])
  expect(current.container.querySelector('.bpgraph-node-panel')).toBeNull()

  current.emitGraph('selection:changed', [])
  current.emitGraph('selection:changed', [node])
  expect(current.container.querySelector('.bpgraph-node-panel')).toBeTruthy()
})

test('closing a panel preserves selection and keeps it hidden when selection changes', () => {
  current = createHarness()
  const node = createNodeStub()
  const other = createNodeStub({ id: 'node-2' })
  current.adapter.findNode.mockImplementation((id: string) => id === other.id ? other : node)
  current.emitGraph('selection:changed', [node])
  current.container
    .querySelector<HTMLButtonElement>('.bpgraph-node-panel-close')!
    .dispatchEvent(new MouseEvent('click', { bubbles: true }))

  expect(current.container.querySelector('.bpgraph-node-panel')).toBeNull()
  expect(current.graph.clearSelection).not.toHaveBeenCalled()
  expect(current.graph.selection.has(node)).toBe(true)
  current.emitGraph('selection:changed', [other])
  expect(current.container.querySelector('.bpgraph-node-panel')).toBeNull()
})

test('an open panel updates when selecting or right-clicking another node', () => {
  current = createHarness()
  const node = createNodeStub()
  const other = createNodeStub({ id: 'node-2', title: 'Other' })
  current.adapter.findNode.mockImplementation((id: string) => id === other.id ? other : node)
  current.emitGraph('selection:changed', [node])
  current.emitGraph('selection:changed', [other])
  expect(current.container.querySelector('.bpgraph-node-panel-title')?.textContent).toBe('Other')

  current.emitPaper('element:contextmenu', { model: { id: node.id } },
    { clientX: 10, clientY: 10, preventDefault: vi.fn() }, 10, 10)
  expect(current.container.querySelector('.bpgraph-node-panel-title')?.textContent).toBe('Test Switch')
})

test.each([
  '<input />',
  '<textarea></textarea>',
  '<select><option>Option</option></select>',
  '<button><span>Action</span></button>',
  '<div contenteditable="true"><span>Edit</span></div>',
  '<svg><g port="in-1"><rect data-port-field="flag" /></g></svg>',
  '<svg><g port="in-1"><polyline class="bpgraph-port-check" /></g></svg>',
  '<svg><g port="out-1"><text>Output</text></g></svg>',
])('clicking node controls or ports selects without opening panels: %s', (markup) => {
  current = createHarness()
  const node = createNodeStub()
  current.adapter.findNode.mockReturnValue(node)
  const content = document.createElement('div')
  content.innerHTML = markup
  current.container.appendChild(content)
  const target = [...content.querySelectorAll('*')].at(-1)!
  const event = new MouseEvent('click', { bubbles: true })
  target.addEventListener('click', () => {
    current!.emitGraph('node:click', node, event)
    current!.emitGraph('selection:changed', [node])
  })
  target.dispatchEvent(event)

  expect(current.graph.selection.has(node)).toBe(true)
  expect(current.container.querySelector('.bpgraph-node-panel')).toBeNull()

  current.emitGraph('selection:changed', [])
  current.emitGraph('node:click', node, new MouseEvent('click'))
  current.emitGraph('selection:changed', [node])
  expect(current.container.querySelector('.bpgraph-node-panel')).toBeTruthy()
})

test('nodePanel=false does not render node panels', () => {
  current = createHarness()
  current.graph.options.nodePanel = false
  const node = createNodeStub()
  current.adapter.findNode.mockReturnValue(node)
  current.emitGraph('selection:changed', [node])
  expect(current.container.querySelector('.bpgraph-node-panel')).toBeNull()
})

test('nodePanel.extra renders application-specific settings', () => {
  current = createHarness()
  current.graph.options.nodePanel = { extra: (node: NodeInstanceType) => `extra:${node.id}` }
  const node = createNodeStub()
  current.adapter.findNode.mockReturnValue(node)
  current.emitGraph('selection:changed', [node])

  const extra = current.container.querySelector('.bpgraph-node-panel-extra')
  expect(extra).toBeTruthy()
  expect(extra!.textContent).toContain('extra:node-1')
})

function createContainerNode(overrides: Record<string, unknown> = {}) {
  return createNodeStub({ id: 'loop-1', type: 'loop', title: 'Loop', subgraphId: 'sg-1', ...overrides })
}

test.each([
  { title: 'Embedded subgraph', type: 'loop', embedded: true },
  { title: 'External subgraph', type: 'subgraph', embedded: false },
])('$title first container click delays panel opening briefly to avoid flicker', ({ type, embedded }) => {
  vi.useFakeTimers()
  current = createHarness()
  const node = createContainerNode({ type })
  current.adapter.findNode.mockReturnValue(node)
  current.graph.model.hasSubgraph.mockReturnValue(embedded)

  current.emitGraph('node:click', node, new MouseEvent('click'))
  current.emitGraph('selection:changed', [node])
  expect(current.container.querySelector('.bpgraph-node-panel')).toBeNull()

  vi.advanceTimersByTime(200)
  expect(current.container.querySelector('.bpgraph-node-panel')).toBeTruthy()
  expect(current.container.querySelector('.bpgraph-node-panel-title')?.textContent).toBe('Loop')
})

test('double-clicking containers enters subgraphs without flashing panels', () => {
  vi.useFakeTimers()
  current = createHarness()
  const node = createContainerNode()
  current.adapter.findNode.mockReturnValue(node)
  current.graph.model.hasSubgraph.mockReturnValue(true)

  current.emitGraph('node:click', node, new MouseEvent('click'))
  current.emitGraph('selection:changed', [node])
  // Entering subgraphs clears selection in the adapter.
  current.emitGraph('selection:changed', [])

  vi.advanceTimersByTime(200)
  expect(current.container.querySelector('.bpgraph-node-panel')).toBeNull()
})

test('external subgraph double-click cancels pending panels without awaiting host switching', () => {
  vi.useFakeTimers()
  current = createHarness()
  const node = createContainerNode({ type: 'subgraph' })
  current.adapter.findNode.mockReturnValue(node)

  current.emitGraph('node:click', node, new MouseEvent('click', { detail: 1 }))
  current.emitGraph('selection:changed', [node])
  expect(current.container.querySelector('.bpgraph-node-panel')).toBeNull()

  vi.advanceTimersByTime(100)
  current.emitGraph('node:click', node, new MouseEvent('click', { detail: 2 }))
  current.emitGraph('node:dblclick', node, new MouseEvent('dblclick', { detail: 2 }))
  // External subgraphs open asynchronously; retain old selection without reopening panels on failure.
  expect(current.graph.selection.has(node)).toBe(true)
  vi.advanceTimersByTime(200)
  expect(current.container.querySelector('.bpgraph-node-panel')).toBeNull()
})

test.each([
  { title: 'Embedded subgraph', type: 'loop', embedded: true },
  { title: 'External subgraph', type: 'subgraph', embedded: false },
])('double-clicking $title closes an open node panel', ({ type, embedded }) => {
  vi.useFakeTimers()
  current = createHarness()
  const node = createContainerNode({ type })
  current.adapter.findNode.mockReturnValue(node)
  current.graph.model.hasSubgraph.mockReturnValue(embedded)

  current.emitGraph('node:click', node, new MouseEvent('click'))
  current.emitGraph('selection:changed', [node])
  vi.advanceTimersByTime(200)
  expect(current.container.querySelector('.bpgraph-node-panel')).toBeTruthy()

  current.emitGraph('node:dblclick', node, new MouseEvent('dblclick'))
  expect(current.container.querySelector('.bpgraph-node-panel')).toBeNull()
})

test('selecting another node during a container delay opens the new panel', () => {
  vi.useFakeTimers()
  current = createHarness()
  const node = createContainerNode()
  const other = createNodeStub({ id: 'node-2', title: 'Other' })
  current.adapter.findNode.mockImplementation((id: string) => (id === other.id ? other : node))
  current.graph.model.hasSubgraph.mockReturnValue(true)

  current.emitGraph('node:click', node, new MouseEvent('click'))
  current.emitGraph('selection:changed', [node])
  current.emitGraph('node:click', other, new MouseEvent('click'))
  current.emitGraph('selection:changed', [other])
  expect(current.container.querySelector('.bpgraph-node-panel-title')?.textContent).toBe('Other')

  // Pending work must not replace another node's panel.
  vi.advanceTimersByTime(200)
  expect(current.container.querySelector('.bpgraph-node-panel-title')?.textContent).toBe('Other')
})

test('selecting containers updates open panels immediately without delay', () => {
  vi.useFakeTimers()
  current = createHarness()
  const node = createContainerNode()
  const other = createContainerNode({ id: 'loop-2', title: 'Another loop' })
  current.adapter.findNode.mockImplementation((id: string) => (id === other.id ? other : node))
  current.graph.model.hasSubgraph.mockReturnValue(true)

  current.emitGraph('node:click', node, new MouseEvent('click'))
  current.emitGraph('selection:changed', [node])
  vi.advanceTimersByTime(200)
  expect(current.container.querySelector('.bpgraph-node-panel-title')?.textContent).toBe('Loop')

  // An open panel must immediately display the newly selected container.
  current.emitGraph('node:click', other, new MouseEvent('click'))
  current.emitGraph('selection:changed', [other])
  expect(current.container.querySelector('.bpgraph-node-panel-title')?.textContent).toBe('Another loop')

  // No delayed work should restore the old node's panel.
  vi.advanceTimersByTime(200)
  expect(current.container.querySelector('.bpgraph-node-panel-title')?.textContent).toBe('Another loop')
})

test('clicking container controls cancels pending opening and keeps panels closed', () => {
  vi.useFakeTimers()
  current = createHarness()
  const node = createContainerNode()
  current.adapter.findNode.mockReturnValue(node)
  current.graph.model.hasSubgraph.mockReturnValue(true)

  current.emitGraph('node:click', node, new MouseEvent('click'))
  current.emitGraph('selection:changed', [node])

  const content = document.createElement('div')
  content.innerHTML = '<input />'
  current.container.appendChild(content)
  const target = content.querySelector('input')!
  const event = new MouseEvent('click', { bubbles: true })
  target.addEventListener('click', () => {
    current!.emitGraph('node:click', node, event)
    current!.emitGraph('selection:changed', [node])
  })
  target.dispatchEvent(event)

  vi.advanceTimersByTime(200)
  expect(current.container.querySelector('.bpgraph-node-panel')).toBeNull()
})

test('bottom zoom controls adjust or reset to 100%, preserve pan, and save viewport', () => {
  current = createHarness()
  current.graph.position = { x: 120, y: -80 }
  const emit = vi.spyOn(current.graph, 'emit')
  const controls = current.container.querySelector('[aria-label="Canvas zoom"]')!
  const buttons = controls.querySelectorAll<HTMLButtonElement>('button')
  expect(buttons[1].textContent).toBe('100%')
  buttons[2].click()
  expect(current.graph.scale).toBe(1.1)
  expect(buttons[1].textContent).toBe('110%')
  expect(emit).toHaveBeenLastCalledWith('viewport:change', { x: 120, y: -80, scale: 1.1 })
  buttons[0].click()
  expect(current.graph.scale).toBe(1)
  current.graph.zoom(0.75)
  buttons[1].click()
  expect(current.graph.scale).toBe(1)
  expect(buttons[1].textContent).toBe('100%')
  expect(current.graph.position).toEqual({ x: 120, y: -80 })
})

test('zoom controls track wheel, API, and subgraph zoom and disable at 20%–500% bounds', () => {
  current = createHarness()
  const controls = current.container.querySelector('[aria-label="Canvas zoom"]')!
  const [decrease, value, increase] = controls.querySelectorAll<HTMLButtonElement>('button')
  current.graph.zoom(0.73)
  expect(value.textContent).toBe('73%')
  // Simulate wheel or subgraph restoration by emitting Paper scale directly.
  current.graph.scale = 1.234
  current.emitPaper('scale', 1.234, 1.234)
  expect(value.textContent).toBe('123%')
  current.graph.zoom(0.21)
  decrease.click()
  expect(current.graph.scale).toBe(0.2)
  expect(value.textContent).toBe('20%')
  expect(decrease.disabled).toBe(true)
  expect(increase.disabled).toBe(false)
  decrease.click()
  expect(current.graph.scale).toBe(0.2)
  current.graph.zoom(4.99)
  increase.click()
  expect(current.graph.scale).toBe(5)
  expect(value.textContent).toBe('500%')
  expect(increase.disabled).toBe(true)
  expect(decrease.disabled).toBe(false)
  increase.click()
  expect(current.graph.scale).toBe(5)
})

test('fit to nodes centers and scales with padding and saves viewport', () => {
  current = createHarness()
  vi.spyOn(current.container, 'getBoundingClientRect').mockReturnValue(new DOMRect(50, 40, 800, 600))
  current.paper.model.addCells([
    new dia.Element({ type: 'test', position: { x: -300, y: -200 }, size: { width: 100, height: 60 } }),
    new dia.Element({ type: 'test', position: { x: 850, y: 440 }, size: { width: 100, height: 60 } }),
  ])
  current.graph.position = { x: -2000, y: 900 }
  const emit = vi.spyOn(current.graph, 'emit')
  current.container.querySelector<HTMLButtonElement>('[aria-label="Fit to nodes"]')!.click()

  const { scale, position } = current.graph
  expect(scale).toBeLessThan(1)
  for (const node of current.paper.model.getElements()) {
    const bounds = node.getBBox()
    expect(bounds.x * scale + position.x).toBeGreaterThanOrEqual(48 - 1e-6)
    expect(bounds.y * scale + position.y).toBeGreaterThanOrEqual(48 - 1e-6)
    expect((bounds.x + bounds.width) * scale + position.x).toBeLessThanOrEqual(752 + 1e-6)
    expect((bounds.y + bounds.height) * scale + position.y).toBeLessThanOrEqual(552 + 1e-6)
  }
  const bounds = current.paper.model.getBBox()!
  expect((bounds.x + bounds.width / 2) * scale + position.x).toBeCloseTo(400)
  expect((bounds.y + bounds.height / 2) * scale + position.y).toBeCloseTo(300)
  expect(current.container.querySelector('.bpgraph-zoom-value')!.textContent).toBe(`${Math.round(scale * 100)}%`)
  expect(emit).toHaveBeenLastCalledWith('viewport:change', { ...position, scale })
})

test('fitting a single node caps at 100%; empty or hidden canvases keep the viewport', () => {
  current = createHarness()
  vi.spyOn(current.container, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 800, 600))
  const fit = current.container.querySelector<HTMLButtonElement>('[aria-label="Fit to nodes"]')!
  fit.click()
  expect(current.graph.zoom).not.toHaveBeenCalled()
  current.paper.model.addCell(new dia.Element({ type: 'test', position: { x: -500, y: 800 }, size: { width: 100, height: 60 } }))
  current.graph.zoom(0.3)
  fit.click()
  expect(current.graph.scale).toBe(1)
  expect(current.graph.position).toEqual({ x: 850, y: -530 })
  const position = { ...current.graph.position }
  vi.spyOn(current.container, 'getBoundingClientRect').mockReturnValue(new DOMRect())
  current.graph.zoom.mockClear()
  fit.click()
  expect(current.graph.zoom).not.toHaveBeenCalled()
  expect(current.graph.position).toEqual(position)
})

test('zoom control clicks and wheel do not bubble; destroy removes subscriptions', () => {
  current = createHarness()
  const controls = current.container.querySelector('[aria-label="Canvas zoom"]')!
  const onCanvasInteraction = vi.fn()
  for (const type of ['mousedown', 'pointerdown', 'click', 'wheel']) {
    current.container.addEventListener(type, onCanvasInteraction)
    controls.dispatchEvent(new MouseEvent(type, { bubbles: true }))
  }
  expect(onCanvasInteraction).not.toHaveBeenCalled()
  const off = vi.spyOn(current.paper, 'off')
  current.ui.destroy()
  expect(current.container.querySelector('[aria-label="Canvas zoom"]')).toBeNull()
  expect(off).toHaveBeenCalledWith('scale', expect.any(Function))
  current = null
})

test('toolbar renders actions; without run emit toolbar:action', () => {
  current = createHarness({ toolbar: { actions: [{ id: 'run', label: 'Run' }] } })
  const buttons = current.container.querySelectorAll<HTMLButtonElement>('.bpgraph-toolbar-button')
  expect([...buttons].map((button) => button.getAttribute('aria-label'))).toEqual(['Undo', 'Redo', 'Run'])

  const emit = vi.spyOn(current.graph, 'emit')
  buttons[2].dispatchEvent(new MouseEvent('click', { bubbles: true }))
  expect(emit).toHaveBeenCalledWith('toolbar:action', 'run')
})

test('undo and redo come first, use icons with hidden hints, and disable for empty history', () => {
  current = createHarness({ toolbar: { actions: [{ id: 'run', label: 'Run' }] } })
  const buttons = [...current.container.querySelectorAll<HTMLButtonElement>('.bpgraph-toolbar-button')].slice(0, 2)
  expect(buttons.map(button => button.getAttribute('aria-label'))).toEqual(['Undo', 'Redo'])
  for (const button of buttons) {
    expect(button.classList.contains('is-icon')).toBe(true)
    expect(button.textContent?.trim()).toBe('')
    expect(button.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true')
    expect(button.hasAttribute('title')).toBe(false)
    expect(button.disabled).toBe(true)
    const tooltip = document.getElementById(button.getAttribute('aria-describedby')!)!
    expect(tooltip.getAttribute('role')).toBe('tooltip')
    expect(tooltip.textContent?.trim()).toBe(button.getAttribute('aria-label'))
    expect(getComputedStyle(tooltip).display).toBe('none')
  }
})

test('undo and redo availability tracks commits, clicks, shortcuts, and history clearing', () => {
  current = createHarness({ toolbar: { actions: [{ id: 'run', label: 'Run' }] } })
  const undo = current.container.querySelector<HTMLButtonElement>('[aria-label="Undo"]')!
  const redo = current.container.querySelector<HTMLButtonElement>('[aria-label="Redo"]')!
  const history = current.graph.undoManager
  const command = { undo: vi.fn(), redo: vi.fn() }

  // Nested transactions become undoable only after the outermost commit.
  history.startTransaction()
  history.commit(() => history.record(command))
  expect(undo.disabled).toBe(true)
  history.commitTransaction()
  expect(undo.disabled).toBe(false)
  expect(redo.disabled).toBe(true)

  const emit = vi.spyOn(current.graph, 'emit')
  undo.click()
  expect(command.undo).toHaveBeenCalledTimes(1)
  expect(undo.disabled).toBe(true)
  expect(redo.disabled).toBe(false)
  redo.click()
  expect(command.redo).toHaveBeenCalledTimes(1)
  expect(undo.disabled).toBe(false)
  expect(redo.disabled).toBe(true)
  expect(emit).not.toHaveBeenCalledWith('toolbar:action', expect.anything())

  // Shortcuts use the same manager and must update buttons.
  history.undo()
  expect(undo.disabled).toBe(true)
  expect(redo.disabled).toBe(false)
  history.redo()
  expect(undo.disabled).toBe(false)
  expect(redo.disabled).toBe(true)
  history.undo()
  history.commit(() => history.record({ undo: vi.fn(), redo: vi.fn() }))
  expect(undo.disabled).toBe(false)
  expect(redo.disabled).toBe(true)
  history.clear()
  expect(undo.disabled).toBe(true)
  expect(redo.disabled).toBe(true)
})

test('subgraph switches refresh history buttons; toolbar destroy removes subscriptions', () => {
  current = createHarness({ toolbar: { actions: [{ id: 'run', label: 'Run' }] } })
  const undo = current.container.querySelector<HTMLButtonElement>('[aria-label="Undo"]')!
  const redo = current.container.querySelector<HTMLButtonElement>('[aria-label="Redo"]')!
  const history = current.graph.undoManager
  const command = { undo: vi.fn(), redo: vi.fn() }
  history.undoStack = [command]
  current.emitGraph('subgraph:enter', 'child')
  expect(undo.disabled).toBe(false)
  expect(redo.disabled).toBe(true)
  history.undoStack = []
  history.redoStack = [command]
  current.emitGraph('subgraph:exit', 'child')
  expect(undo.disabled).toBe(true)
  expect(redo.disabled).toBe(false)

  const off = vi.spyOn(current.graph, 'off')
  current.ui.destroy()
  for (const event of ['history:changed', 'subgraph:enter', 'subgraph:exit']) {
    expect(off).toHaveBeenCalledWith(event, expect.any(Function))
  }
  history.clear()
  expect(current.container.querySelector('.bpgraph-toolbar')).toBeNull()
  current = null
})

test('subgraph toolbars show a back button that exits the current subgraph', () => {
  current = createHarness({ toolbar: { actions: [{ id: 'run', label: 'Run' }] } })
  const { container, graph } = current
  expect(container.querySelector('[aria-label="Back"]')).toBeNull()

  graph.model.subgraphStack.push({ id: 'child' })
  current.ui.refreshToolbar()
  const back = container.querySelector<HTMLButtonElement>('[aria-label="Back"]')!
  expect(back).toBeTruthy()
  back.click()
  expect(graph.exitSubgraph).toHaveBeenCalledOnce()

  graph.model.subgraphStack.pop()
  current.ui.refreshToolbar()
  expect(container.querySelector('[aria-label="Back"]')).toBeNull()
})

test('single right-click delays the back menu; right-button double-click returns without menus', () => {
  vi.useFakeTimers()
  current = createHarness()
  const { container, graph } = current
  graph.model.subgraphStack.push({ id: 'child' })
  const emitBlank = () => current!.emitPaper('blank:contextmenu',
    { clientX: 20, clientY: 20, preventDefault: vi.fn() }, 20, 20)

  // Single click: wait for the double-click window before showing the menu to avoid flicker.
  emitBlank()
  expect(container.querySelector('.bpgraph-context')).toBeNull()
  vi.advanceTimersByTime(300)
  const labels = [...container.querySelectorAll('.bpgraph-context-label')].map((item) =>
    item.textContent?.trim()
  )
  expect(labels).toEqual(['Back', 'Add node', 'Paste'])
  current.ui.close()

  // Right-button double-click: return immediately without showing menus.
  emitBlank()
  vi.advanceTimersByTime(100)
  emitBlank()
  expect(graph.exitSubgraph).toHaveBeenCalledOnce()
  expect(container.querySelector('.bpgraph-context')).toBeNull()
  vi.advanceTimersByTime(500)
  expect(container.querySelector('.bpgraph-context')).toBeNull()

  // Esc returns even without an overlay.
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
  expect(graph.exitSubgraph).toHaveBeenCalledTimes(2)
})

test.each(['contextmenu', 'pointerdown', 'Menu open'])('external subgraphs support right-button double-click back at the file root: %s', (trigger) => {
  vi.useFakeTimers()
  const goBack = vi.fn()
  current = createHarness({ navigation: { canGoBack: () => true, goBack } })
  const { container, graph } = current
  const contextmenu = () => current!.emitPaper('blank:contextmenu',
    { clientX: 20, clientY: 20, preventDefault: vi.fn() }, 20, 20)
  const pointerdown = () => container.dispatchEvent(new MouseEvent('pointerdown', { button: 2, bubbles: true }))

  if (trigger === 'pointerdown') pointerdown()
  else contextmenu()
  expect(container.querySelector('.bpgraph-context')).toBeNull()
  vi.advanceTimersByTime(trigger === 'Menu open' ? 350 : 100)
  if (trigger === 'pointerdown') pointerdown()
  else if (trigger === 'Menu open') {
    container.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }))
  } else contextmenu()

  expect(goBack).toHaveBeenCalledOnce()
  expect(graph.exitSubgraph).not.toHaveBeenCalled()
  // Viewport updates during file switching must not allow late contextmenu events.
  current.emitGraph('viewport:change', {})
  contextmenu()
  vi.advanceTimersByTime(800)
  expect(container.querySelector('.bpgraph-context')).toBeNull()
})

test('external return paths also integrate with toolbar, blank menus, and Esc', () => {
  vi.useFakeTimers()
  const goBack = vi.fn()
  current = createHarness({
    navigation: { canGoBack: () => true, goBack },
    toolbar: { actions: [{ id: 'run', label: 'Run' }] },
  })
  const { container } = current
  container.querySelector<HTMLButtonElement>('[aria-label="Back"]')!.click()
  expect(goBack).toHaveBeenCalledTimes(1)

  current.emitPaper('blank:contextmenu', { clientX: 20, clientY: 20, preventDefault: vi.fn() }, 20, 20)
  vi.advanceTimersByTime(300)
  container.querySelector<HTMLButtonElement>('[data-id="back"]')!.click()
  expect(goBack).toHaveBeenCalledTimes(2)
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
  expect(goBack).toHaveBeenCalledTimes(3)
})

test('first blank right-click does not trigger back during contextmenu capture', () => {
  vi.useFakeTimers()
  current = createHarness()
  const { container, graph } = current
  graph.model.subgraphStack.push({ id: 'child' })
  current.emitPaper('blank:contextmenu', { clientX: 20, clientY: 20, preventDefault: vi.fn() }, 20, 20)
  // In browsers, JointJS blank:contextmenu may fire before container capture listeners.
  container.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }))
  expect(graph.exitSubgraph).not.toHaveBeenCalled()
  expect(container.querySelector('.bpgraph-context')).toBeNull()
  vi.advanceTimersByTime(300)
  expect(container.querySelector('.bpgraph-context')).toBeTruthy()
})

test('a second pointerdown alone returns and consumes the following contextmenu', () => {
  vi.useFakeTimers()
  current = createHarness()
  const { container, graph } = current
  graph.model.subgraphStack.push({ id: 'child' })
  const rightDown = () => container.dispatchEvent(new MouseEvent('pointerdown', { button: 2, bubbles: true }))

  // Two blank pointerdown events suffice even without a second contextmenu.
  rightDown()
  vi.advanceTimersByTime(120)
  rightDown()
  expect(graph.exitSubgraph).toHaveBeenCalledOnce()

  const late = new MouseEvent('contextmenu', { bubbles: true, cancelable: true })
  container.dispatchEvent(late)
  expect(late.defaultPrevented).toBe(true)
  expect(container.querySelector('.bpgraph-context')).toBeNull()
  vi.advanceTimersByTime(500)
  expect(container.querySelector('.bpgraph-context')).toBeNull()
})

test('a second right-click returns and closes an already open menu', () => {
  vi.useFakeTimers()
  current = createHarness()
  const { container, graph } = current
  graph.model.subgraphStack.push({ id: 'child' })
  current.emitPaper('blank:contextmenu', { clientX: 20, clientY: 20, preventDefault: vi.fn() }, 20, 20)
  vi.advanceTimersByTime(300)
  expect(container.querySelector('.bpgraph-context')).toBeTruthy()

  vi.advanceTimersByTime(50)
  container.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }))
  expect(graph.exitSubgraph).toHaveBeenCalledOnce()
  expect(container.querySelector('.bpgraph-context')).toBeNull()
})

test('toolbar icon buttons hide text but retain accessible names, tooltips, and disabled states', () => {
  current = createHarness({ toolbar: { actions: [
    { id: 'run', label: 'Run', iconClass: 'ri-play-line', title: 'Run current workflow' },
    { id: 'debug', label: 'Debug', iconClass: 'ri-bug-line' },
    { id: 'resume', label: 'Resume', iconClass: 'ri-play-circle-line', disabled: true },
    { id: 'stop', label: 'Stop', iconClass: 'ri-stop-line', disabled: true },
  ] } })
  const bar = current.container.querySelector('.bpgraph-toolbar')!
  const buttons = [...bar.querySelectorAll<HTMLButtonElement>('button')].slice(2)
  expect(buttons.map(button => button.textContent?.trim())).toEqual(['', '', '', ''])
  expect(bar.querySelector('[role="status"]')).toBeNull()
  expect(buttons.map(button => button.getAttribute('aria-label'))).toEqual(['Run', 'Debug', 'Resume', 'Stop'])
  expect(buttons.every(button => !button.hasAttribute('title'))).toBe(true)
  const tooltips = [...bar.querySelectorAll<HTMLElement>('[role="tooltip"]')].slice(2)
  expect(tooltips.map(tooltip => tooltip.textContent?.trim())).toEqual(['Run current workflow', 'Debug', 'Resume', 'Stop'])
  expect(buttons.map(button => button.getAttribute('aria-describedby'))).toEqual(tooltips.map(tooltip => tooltip.id))
  expect(tooltips.every(tooltip => getComputedStyle(tooltip).display === 'none')).toBe(true)
  expect(buttons.map(button => button.querySelector('i')?.className)).toEqual([
    'ri-play-line', 'ri-bug-line', 'ri-play-circle-line', 'ri-stop-line',
  ])
  for (const button of buttons) {
    expect(button.classList.contains('is-icon')).toBe(true)
    expect(button.querySelector('i')?.getAttribute('aria-hidden')).toBe('true')
  }
  const emit = vi.spyOn(current.graph, 'emit')
  buttons[0].click()
  expect(emit).toHaveBeenCalledExactlyOnceWith('toolbar:action', 'run')
  buttons[2].click()
  buttons[3].click()
  expect(emit).toHaveBeenCalledTimes(1)
})

test('replay disables toolbar buttons except the debug panel toggle', () => {
  current = createHarness({
    debugPanel: true,
    toolbar: {
      actions: [
        { id: 'run', label: 'Run', iconClass: 'ri-play-line' },
        { id: 'resume', label: 'Resume', iconClass: 'ri-play-circle-line' },
      ],
    },
  })
  current.graph.isReplayMode.mockReturnValue(true)
  current.emitGraph('replay:changed', true, 'First execution')

  const toggle = current.container.querySelector<HTMLButtonElement>('[aria-label="Show debug panel"]')!
  expect(toggle).toBeTruthy()
  expect(toggle.disabled).toBe(false)
  const allButtons = [...current.container.querySelectorAll<HTMLButtonElement>('.bpgraph-toolbar-button')]
  // Keep the debug panel toggle last in the toolbar.
  expect(allButtons.at(-1)).toBe(toggle)
  const others = allButtons.filter((button) => button !== toggle)
  expect(others.map((button) => button.getAttribute('aria-label'))).toEqual(
    expect.arrayContaining(['Undo', 'Redo', 'Run', 'Resume'])
  )
  expect(others.every((button) => button.disabled)).toBe(true)

  const emit = vi.spyOn(current.graph, 'emit')
  current.container.querySelector<HTMLButtonElement>('[aria-label="Run"]')!.click()
  expect(emit).not.toHaveBeenCalledWith('toolbar:action', 'run')

  toggle.click()
  expect(current.ui.isDebugPanelOpen()).toBe(true)
})

test('toolbar refresh updates paused state and resume availability', () => {
  current = createHarness({ toolbar: {
    status: 'Running', actions: [{ id: 'resume', label: 'Resume', disabled: true }],
  } })
  expect(current.container.querySelector<HTMLButtonElement>('[aria-label="Resume"]')!.disabled).toBe(true)
  current.graph.options.toolbar = {
    status: 'Paused: node', actions: [{ id: 'resume', label: 'Resume', disabled: false }],
  }
  current.ui.refreshToolbar()
  expect(current.container.querySelector('[role="status"]')?.textContent).toContain('Paused: node')
  expect(current.container.querySelector<HTMLButtonElement>('[aria-label="Resume"]')!.disabled).toBe(false)
})

test('execution haze tracks running and paused states, stays inaccessible, and clears on destroy', () => {
  current = createHarness()
  Object.assign(current.graph, { executionStatus: 'running' })
  current.ui.refreshExecutionStatus()
  expect(current.container.dataset.executionStatus).toBe('running')
  expect(current.container.querySelector('.bpgraph-execution-aura.is-running')?.getAttribute('aria-hidden')).toBe('true')
  expect(current.container.querySelectorAll('.bpgraph-execution-fog')).toHaveLength(4)
  Object.assign(current.graph, { executionStatus: 'paused' })
  current.ui.refreshExecutionStatus()
  expect(current.container.dataset.executionStatus).toBe('paused')
  expect(current.container.querySelector('.bpgraph-execution-aura.is-paused')).toBeTruthy()
  Object.assign(current.graph, { executionStatus: 'idle' })
  current.ui.refreshExecutionStatus()
  expect(current.container.querySelector('.bpgraph-execution-aura.is-idle')).toBeTruthy()
  current.ui.destroy()
  expect(current.container.dataset.executionStatus).toBeUndefined()
  expect(current.container.querySelector('.bpgraph-execution-aura')).toBeNull()
  current = null
})

test('toolbar supports run callbacks, positioning, and disabled states', () => {
  const run = vi.fn()
  current = createHarness({
    toolbar: {
      position: 'top-left',
      actions: [
        { id: 'debug', label: 'Debug', run },
        { id: 'disabled', label: 'Unavailable', disabled: true, run },
      ],
    },
  })

  const bar = current.container.querySelector('.bpgraph-toolbar')
  expect(bar?.classList.contains('is-left')).toBe(true)

  const buttons = [...current.container.querySelectorAll<HTMLButtonElement>('.bpgraph-toolbar-button')].slice(2)
  buttons[0].dispatchEvent(new MouseEvent('click', { bubbles: true }))
  expect(run).toHaveBeenCalledWith({ graph: current.graph })

  buttons[1].dispatchEvent(new MouseEvent('click', { bubbles: true }))
  expect(run).toHaveBeenCalledTimes(1)
})

function debugSample() {
  return {
    records: [
      {
        id: 'task-1',
        title: 'Run main workflow',
        status: 'completed' as const,
        startedAt: 1000,
        endedAt: 2500,
        detail: 'Completed 3 nodes',
      },
      { id: 'task-2', title: 'Listen message', status: 'running' as const, startedAt: 3000 },
    ],
    chain: [
      { nodeId: 'node-1', label: 'Start node', status: 'completed' as const },
      { nodeId: 'node-2', label: 'Text Input', status: 'running' as const },
    ],
    logs: [
      { time: 1000, level: 'info' as const, message: 'Execution started' },
      { time: 2000, level: 'error' as const, message: 'Node execution failed', nodeId: 'node-2' },
    ],
  }
}

const debugToggle = () =>
  current!.container.querySelector<HTMLButtonElement>(
    '[aria-label="Show debug panel"], [aria-label="Hide debug panel"]'
  )!

test('debug panel starts hidden; toolbar toggles visibility and aria state', () => {
  current = createHarness({ debugPanel: { width: 300, data: () => debugSample() } })
  current.graph.findNodeAnywhere.mockReturnValue({ title: 'Text Input' } as never)
  expect(current.container.querySelector('.bpgraph-debug-panel')).toBeNull()
  expect(debugToggle().getAttribute('aria-label')).toBe('Show debug panel')
  expect(debugToggle().getAttribute('aria-pressed')).toBe('false')
  expect(debugToggle().classList.contains('is-pressed')).toBe(false)
  expect(debugToggle().querySelector('svg path')).toBeTruthy()

  debugToggle().click()
  const panel = current.container.querySelector<HTMLElement>('.bpgraph-debug-panel')!
  expect(panel).toBeTruthy()
  expect(panel.style.width).toBe('300px')
  expect(panel.getAttribute('role')).toBe('region')
  expect(panel.getAttribute('aria-label')).toBe('Debug panel')
  expect(debugToggle().getAttribute('aria-label')).toBe('Hide debug panel')
  expect(debugToggle().getAttribute('aria-pressed')).toBe('true')
  expect(debugToggle().classList.contains('is-pressed')).toBe(true)

  const sections = [...panel.querySelectorAll<HTMLElement>('.bpgraph-debug-panel-section')]
  expect(sections.map((section) => section.getAttribute('aria-label'))).toEqual(['Execution records', 'Execution chain', 'Logs'])
  expect([...panel.querySelectorAll('.bpgraph-debug-panel-section-title')].map((title) => title.textContent?.replace(/\s+/g, '')))
    .toEqual(['Executionrecords2', 'Executionchain2', 'Logs2'])

  const records = [...panel.querySelectorAll('.bpgraph-debug-record')]
  expect(records).toHaveLength(2)
  expect(records[0].querySelector('strong')?.textContent).toBe('Run main workflow')
  expect(records[1].querySelector('strong')?.textContent).toBe('Listen message')
  expect(records[0].querySelector('.bpgraph-debug-record-detail')?.textContent).toBe('Completed 3 nodes')
  expect(records[0].querySelector('.bpgraph-debug-record-meta')?.textContent).toContain('· 1.5s')
  expect(records[1].querySelector('.bpgraph-debug-record-meta')?.textContent).not.toContain('·')
  expect(records[0].querySelector('.bpgraph-debug-status')?.textContent?.trim()).toBe('Completed')
  expect(records[1].querySelector('.bpgraph-debug-status')?.textContent?.trim()).toBe('Running')

  const chain = [...panel.querySelectorAll('.bpgraph-debug-chain-item')]
  expect(chain.map((item) => item.querySelector('strong')?.textContent)).toEqual(['Start node', 'Text Input'])
  expect(chain.map((item) => item.querySelector('.bpgraph-debug-status')?.textContent?.trim()))
    .toEqual(['Completed', 'Running'])
  expect(chain[0].querySelector('.bpgraph-debug-chain-index')?.textContent).toBe('1')
  expect(chain[1].querySelector('.bpgraph-debug-chain-index')?.textContent).toBe('2')

  const logs = [...panel.querySelectorAll('.bpgraph-debug-log')]
  expect(logs.map((log) => log.querySelector('.bpgraph-debug-log-level')?.textContent)).toEqual(['Info', 'Error'])
  expect(logs[0].textContent).toContain('Execution started')
  expect(logs[1].textContent).toContain('Node execution failed')
  expect(logs[1].querySelector('.bpgraph-debug-log-node')?.textContent).toBe('Text Input')

  panel.querySelector<HTMLButtonElement>('[aria-label="Close debug panel"]')!.click()
  expect(current.container.querySelector('.bpgraph-debug-panel')).toBeNull()
  expect(debugToggle().getAttribute('aria-label')).toBe('Show debug panel')
  expect(debugToggle().getAttribute('aria-pressed')).toBe('false')
})

test('execution chains indent subgraph roles and logs prefix [subgraph name]', () => {
  const scope = { subgraphId: 'child', title: 'Order subgraph', depth: 1 }
  current = createHarness({
    debugPanel: {
      width: 300,
      data: () => ({
        chain: [
          { nodeId: 'call', label: 'Call subgraph', status: 'completed' as const, kind: 'subgraph' as const },
          {
            nodeId: 'child-start', label: 'Subgraph entry', status: 'completed' as const,
            kind: 'subgraph-start' as const, scope,
          },
          { nodeId: 'child-step', label: 'Internal node', status: 'running' as const, scope },
        ],
        logs: [
          { time: 1000, message: 'Internal node completed', nodeId: 'child-step', scope },
        ],
      }),
    },
  })
  current.ui.openDebugPanel()

  const chain = [...current.container.querySelectorAll<HTMLElement>('.bpgraph-debug-chain-item')]
  expect(chain.map((item) => item.style.paddingLeft)).toEqual(['0px', '14px', '14px'])
  expect(chain[0].querySelector('.bpgraph-debug-chain-tag')?.textContent?.trim()).toBe('Subgraph')
  expect(chain[1].querySelector('.bpgraph-debug-chain-tag')?.textContent?.trim()).toBe('Subgraph entry')
  // Ordinary subgraph nodes use indentation without role labels.
  expect(chain[2].querySelector('.bpgraph-debug-chain-tag')).toBeNull()

  const log = current.container.querySelector('.bpgraph-debug-log-scope')
  expect(log?.textContent).toBe('[Order subgraph]')
  expect(current.container.querySelector('.bpgraph-debug-log-message')?.textContent).toContain('Internal node completed')
})

test('untitled execution chain entries resolve names across subgraphs instead of showing only node ID', () => {
  current = createHarness({
    debugPanel: {
      width: 300,
      data: () => ({
        chain: [{ nodeId: 'child-step', status: 'completed' as const }],
      }),
    },
  })
  current.graph.findNodeAnywhere.mockReturnValue({ title: 'Subgraph internal node' } as never)
  current.ui.openDebugPanel()

  expect(current.container.querySelector('.bpgraph-debug-chain-body strong')?.textContent).toBe('Subgraph internal node')
})

test('debug panels shift node panels left and restore their position on close', () => {
  current = createHarness({ debugPanel: { width: 300 } })
  const node = createNodeStub()
  current.adapter.findNode.mockReturnValue(node)

  current.ui.openDebugPanel()
  current.emitGraph('selection:changed', [node])
  const panel = current.container.querySelector<HTMLElement>('.bpgraph-node-panel')!
  expect(panel.style.right).toBe('316px')
  expect(panel.style.maxWidth).toBe('calc(100% - 324px)')

  current.ui.closeDebugPanel()
  expect(panel.style.right).toBe('8px')
  expect(panel.style.maxWidth).toBe('calc(100% - 16px)')
  expect(current.ui.isDebugPanelOpen()).toBe(false)
})

test('Esc closing debug panels preserves subgraph location; empty data shows placeholders', () => {
  current = createHarness({ debugPanel: {} })
  current.graph.model.subgraphStack.push({ id: 'child' })
  current.ui.openDebugPanel()
  const panel = current.container.querySelector('.bpgraph-debug-panel')!
  expect(panel.textContent).toContain('No execution records')
  expect(panel.textContent).toContain('No execution chain')
  expect(panel.textContent).toContain('No logs')

  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
  expect(current.container.querySelector('.bpgraph-debug-panel')).toBeNull()
  expect(current.graph.exitSubgraph).not.toHaveBeenCalled()

  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
  expect(current.graph.exitSubgraph).toHaveBeenCalledOnce()
})

test('refresh reevaluates debug data and renders plain text', () => {
  let data = {
    records: [{ id: 'task-1', title: 'First execution', status: 'running' as const, startedAt: 1000 }],
    chain: [{ nodeId: 'node-1', label: 'Node one', status: 'running' as const }],
    logs: [{ time: 1000, message: 'First log' }],
  }
  current = createHarness({ debugPanel: { data: () => data } })
  current.ui.openDebugPanel()
  expect(current.container.querySelector('.bpgraph-debug-panel')?.textContent).toContain('First execution')

  data = {
    records: [{ id: 'task-2', title: '<img src=x onerror=alert(1)>', status: 'failed' as const, startedAt: 2000 }],
    chain: [{ nodeId: 'node-2', label: '<b>Node two</b>', status: 'completed' as const }],
    logs: [{ time: 2000, level: 'error' as const, message: '<img src=x onerror=alert(1)>' }],
  }
  current.ui.refreshDebugPanel()
  const panel = current.container.querySelector<HTMLElement>('.bpgraph-debug-panel')!
  expect(panel.textContent).toContain('<img src=x onerror=alert(1)>')
  expect(panel.textContent).toContain('<b>Node two</b>')
  expect(panel.querySelector('img')).toBeNull()
  expect(panel.querySelector('b')).toBeNull()
  expect(panel.querySelector('.bpgraph-debug-record')?.classList.contains('is-failed')).toBe(true)

  current.graph.options.debugPanel = undefined
  current.ui.refreshDebugPanel()
  expect(current.container.querySelector('.bpgraph-debug-panel')).toBeNull()
  expect(current.container.querySelector('[aria-label="Show debug panel"]')).toBeNull()
})

test('debug panels provide toggles without toolbar actions unless toolbar=false or debugPanel=false', () => {
  current = createHarness({ debugPanel: true })
  expect(current.container.querySelector('.bpgraph-toolbar')).toBeTruthy()
  expect(debugToggle()).toBeTruthy()
  current.ui.destroy()
  current = null

  current = createHarness({ debugPanel: true, toolbar: false })
  expect(current.container.querySelector('.bpgraph-toolbar')).toBeNull()
  expect(current.container.querySelector('[aria-label="Show debug panel"]')).toBeNull()
  current.ui.destroy()
  current = null

  current = createHarness({ debugPanel: false })
  expect(current.container.querySelector('.bpgraph-toolbar')).toBeNull()
  current.ui.openDebugPanel()
  expect(current.ui.isDebugPanelOpen()).toBe(false)
  expect(current.container.querySelector('.bpgraph-debug-panel')).toBeNull()
})

test('failed debug data reads leave panels usable with empty states', () => {
  current = createHarness({ debugPanel: { data: () => { throw new Error('boom') } } })
  current.ui.openDebugPanel()
  const panel = current.container.querySelector('.bpgraph-debug-panel')
  expect(panel).toBeTruthy()
  expect(panel?.textContent).toContain('No execution records')
})

test('debugPanel.open initially open panels keep public toggle APIs and toolbar state synchronized', () => {
  current = createHarness({ debugPanel: { open: true } })
  expect(current.container.querySelector('.bpgraph-debug-panel')).toBeTruthy()
  expect(debugToggle().getAttribute('aria-pressed')).toBe('true')
  expect(current.ui.isDebugPanelOpen()).toBe(true)

  current.ui.closeDebugPanel()
  expect(current.container.querySelector('.bpgraph-debug-panel')).toBeNull()
  expect(current.ui.isDebugPanelOpen()).toBe(false)

  current.ui.toggleDebugPanel()
  expect(current.container.querySelector('.bpgraph-debug-panel')).toBeTruthy()
  expect(debugToggle().getAttribute('aria-pressed')).toBe('true')
})

test('finished records can be replayed; clicking the selected record again exits', () => {
  const records = [
    { id: 'task-1', title: 'First execution', status: 'completed' as const, startedAt: 1000, endedAt: 2000 },
    { id: 'task-2', title: 'Executing', status: 'running' as const, startedAt: 3000 },
    { id: 'task-3', title: 'Waiting', status: 'waiting' as const, startedAt: 4000 },
    { id: 'task-4', title: 'Paused', status: 'paused' as const, startedAt: 5000 },
  ]
  const onRecordSelect = vi.fn()
  current = createHarness({
    debugPanel: {
      data: () => ({ records, logs: [], chain: [] }),
      activeRecordId: 'task-1',
      onRecordSelect,
    },
  })
  current.ui.openDebugPanel()
  let buttons = [...current.container.querySelectorAll<HTMLButtonElement>('.bpgraph-debug-record')]
  expect(buttons[0].getAttribute('aria-pressed')).toBe('true')
  expect(buttons[0].classList.contains('is-active')).toBe(true)
  expect(buttons[0].disabled).toBe(false)
  expect(buttons[1].disabled).toBe(true)
  expect(buttons[1].getAttribute('aria-pressed')).toBe('false')
  expect(buttons[2].disabled).toBe(true)
  expect(buttons[3].disabled).toBe(true)

  buttons[0].click()
  expect(onRecordSelect).toHaveBeenLastCalledWith(null)

  current.graph.options.debugPanel = {
    ...(current.graph.options.debugPanel as Record<string, unknown>),
    activeRecordId: null,
  }
  current.ui.refreshDebugPanel()
  buttons = [...current.container.querySelectorAll<HTMLButtonElement>('.bpgraph-debug-record')]
  buttons[0].click()
  expect(onRecordSelect).toHaveBeenLastCalledWith(records[0])
  buttons[1].click()
  buttons[2].click()
  buttons[3].click()
  expect(onRecordSelect).toHaveBeenCalledTimes(2)
})

test('node hover does not insert node data into debug panels', () => {
  const data = vi.fn(() => ({
    records: [],
    logs: [{ time: 1_700_000_000_000, message: 'Execution completed' }],
    chain: [],
  }))
  current = createHarness({ debugPanel: { data } })
  current.ui.openDebugPanel()
  const panel = () => current!.container.querySelector<HTMLElement>('.bpgraph-debug-panel')!
  const before = panel().textContent
  const node = { id: 'node-data-1' } as NodeInstanceType
  current.graph.findNode.mockReturnValue({ title: 'Text Input' } as never)
  current.graph.getNodeExecutionData.mockReturnValue({
    inputs: { value: '<img src=x onerror=alert(1)>' },
    outputs: { result: 42 },
  })

  current.emitGraph('node:mouseenter', node)
  current.emitGraph('node:mouseleave', node)

  expect(panel().querySelector('[aria-label="Node data"]')).toBeNull()
  expect(panel().textContent).toBe(before)
})

test('replay displays a banner and restores editing interactions without inserting panel node data', () => {
  current = createHarness({ debugPanel: { data: () => ({ records: [], logs: [], chain: [] }) } })
  current.ui.openDebugPanel()
  expect(current.container.querySelector('[aria-label="Node data"]')).toBeNull()

  current.graph.isReplayMode.mockReturnValue(true)
  current.graph.replayLabel = 'First execution'
  current.graph.exitReplay.mockImplementation(() => {
    current!.graph.isReplayMode.mockReturnValue(false)
    current!.graph.replayLabel = ''
    current!.emitGraph('replay:changed', false, '')
  })
  current.emitGraph('replay:changed', true, 'First execution')

  const banner = current.container.querySelector<HTMLElement>('.bpgraph-replay-banner')!
  expect(banner.textContent).toContain('Replay mode')
  expect(banner.textContent).toContain('First execution')
  expect(current.container.dataset.replay).toBe('true')
  expect(current.paper.options.interactive).toBe(false)
  expect(current.container.querySelector('[aria-label="Node data"]')).toBeNull()
  current.emitGraph('node:mouseenter', { id: 'replay-node' } as NodeInstanceType)
  expect(current.container.querySelector('[aria-label="Node data"]')).toBeNull()
  expect(current.container.querySelector('.bpgraph-debug-panel')).toBeTruthy()

  const dblclick = { clientX: 10, clientY: 10, preventDefault: () => {} }
  current.emitPaper('blank:pointerdblclick', dblclick, 10, 10)
  expect(current.container.querySelector('.bpgraph-palette')).toBeNull()
  current.emitPaper('blank:contextmenu', dblclick, 10, 10)
  expect(current.container.querySelector('.bpgraph-context')).toBeNull()

  banner.querySelector<HTMLButtonElement>('.bpgraph-replay-exit')!.click()
  expect(current.graph.exitReplay).toHaveBeenCalledOnce()
  expect(current.container.querySelector('.bpgraph-replay-banner')).toBeNull()
  expect(current.container.dataset.replay).toBeUndefined()
  expect(current.paper.options.interactive).toBe(true)
})

test('Esc exits replay and selecting nodes does not open panels', () => {
  current = createHarness()
  const node = createNodeStub()
  current.adapter.findNode.mockReturnValue(node)
  current.graph.isReplayMode.mockReturnValue(true)
  current.emitGraph('selection:changed', [node])
  expect(current.container.querySelector('.bpgraph-node-panel')).toBeNull()

  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
  expect(current.graph.exitReplay).toHaveBeenCalledOnce()
  expect(current.graph.model.subgraphStack.length).toBe(1)
})

test.each([
  { language: 'en' as const, undo: 'Undo', add: 'Add node', empty: 'No execution records', zoom: 'Canvas zoom', close: 'Close node palette' },
  { language: 'zh' as const, undo: '撤销', add: '添加节点', empty: '暂无执行记录', zoom: '画布缩放', close: '关闭添加节点面板' },
])('built-in controls use application language $language without translating custom content', ({ language, undo, add, empty, zoom, close }) => {
  current = createHarness({
    language,
    toolbar: { actions: [{ id: 'custom', label: 'Application action' }] },
    debugPanel: { open: true },
  })
  const { container } = current
  expect(container.querySelector(`[aria-label="${undo}"]`)).toBeTruthy()
  expect(container.querySelector(`[aria-label="${zoom}"]`)).toBeTruthy()
  expect(container.querySelector('[aria-label="Application action"]')).toBeTruthy()
  expect(container.querySelector('.bpgraph-debug-panel')?.textContent).toContain(empty)
  current.ui.openPalette()
  expect(container.querySelector('.bpgraph-palette strong')?.textContent).toBe(add)
  expect(container.querySelector(`[aria-label="${close}"]`)).toBeTruthy()
  expect(container.querySelector('.bpgraph-palette-item')?.textContent).toContain('Hello')
  expect(container.querySelector('[data-language], .bpgraph-language-switch')).toBeNull()
})

test('language updates refresh open UI and keep entered search text and application data', () => {
  current = createHarness({ language: 'en', toolbar: { actions: [{ id: 'custom', label: 'Keep me' }] } })
  current.ui.openPalette()
  const search = current.container.querySelector<HTMLInputElement>('.bpgraph-palette-search')!
  search.value = 'Hello'
  search.dispatchEvent(new Event('input', { bubbles: true }))
  current.graph.options.language = 'zh'
  current.ui.refreshLanguage()
  expect(current.container.querySelector('[aria-label="撤销"]')).toBeTruthy()
  expect(current.container.querySelector('.bpgraph-palette strong')?.textContent).toBe('添加节点')
  expect(search.value).toBe('Hello')
  expect(current.container.querySelector('[aria-label="Keep me"]')).toBeTruthy()
  current.graph.options.language = 'en'
  current.ui.refreshLanguage()
  expect(current.container.querySelector('[aria-label="Undo"]')).toBeTruthy()
  expect(current.container.querySelector('.bpgraph-palette strong')?.textContent).toBe('Add node')
})

test('separate canvas instances retain independent languages', () => {
  current = createHarness({ language: 'zh', toolbar: { actions: [] } })
  const other = createHarness({ language: 'en', toolbar: { actions: [] } })
  try {
    current.ui.openPalette()
    other.ui.openPalette()
    expect(current.container.querySelector('.bpgraph-palette strong')?.textContent).toBe('添加节点')
    expect(other.container.querySelector('.bpgraph-palette strong')?.textContent).toBe('Add node')
    current.graph.options.language = 'en'
    current.ui.refreshLanguage()
    expect(other.container.querySelector('.bpgraph-palette strong')?.textContent).toBe('Add node')
  } finally {
    other.ui.destroy()
  }
})

test('language refresh updates open menus, debug status labels, and execution previews', () => {
  current = createHarness({
    language: 'en',
    debugPanel: {
      open: true,
      data: {
        records: [{ id: 'task', title: 'Application record', status: 'completed', startedAt: 0 }],
        logs: [{ message: 'Application log', level: 'error', time: 0 }],
      },
    },
  })
  current.emitPaper('blank:contextmenu', { clientX: 0, clientY: 0, preventDefault: vi.fn() }, 0, 0)
  expect(current.container.querySelector('.bpgraph-context')?.textContent).toContain('Add node')
  previewNode()
  current.graph.options.language = 'zh'
  current.ui.refreshLanguage()
  expect(current.container.querySelector('.bpgraph-context')?.textContent).toContain('添加节点')
  expect(current.container.querySelector('.bpgraph-debug-status')?.textContent?.trim()).toBe('已完成')
  expect(current.container.querySelector('.bpgraph-debug-log-level')?.textContent).toBe('错误')
  expect(current.container.querySelector('.bpgraph-node-preview')?.textContent).toContain('输入')
  expect(current.container.querySelector('.bpgraph-node-preview')?.textContent).toContain('已完成')
  expect(current.container.querySelector('.bpgraph-debug-panel')?.textContent).toContain('Application record')
  expect(current.container.querySelector('.bpgraph-debug-panel')?.textContent).toContain('Application log')
})

test('breakpoint SVG labels follow the supplied language while node titles remain application content', () => {
  const group = document.createElementNS('http://www.w3.org/2000/svg', 'g')
  renderNodeHeader(group, { language: 'zh', title: 'Custom title', breakpoint: true, size: { width: 200, height: 100 }, style: {} })
  expect(group.querySelector('[aria-label="断点"]')).toBeTruthy()
  expect(group.querySelector('title')?.textContent).toContain('调试时在执行前暂停')
  expect(group.querySelector('text')?.textContent).toBe('Custom title')
})
