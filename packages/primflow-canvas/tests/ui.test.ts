// @vitest-environment jsdom
//
// Test canvas UI independently of concrete JointJS views: CanvasUI uses paper
// on/off/el, adapter lookup and selection, and imperative Graph APIs; minimal stubs suffice.
import './svg-shim'
import { afterEach, expect, test, vi } from 'vitest'
import { html, nothing, render } from 'lit-html'
import { dia } from '@joint/core'
import { EditorView } from '@codemirror/view'
import type { InputPort } from '@lyx-pj/primflow-model'
import { DataTypeRegistry, defineNode, NodeInstance, NodeRegistry } from '@lyx-pj/primflow-model'
import { Graph, type NodeInstanceType } from '../src/Graph'
import { UndoManager } from '../src/UndoManager'
import type { GraphAdapter } from '../src/adapters/GraphAdapter'
import { CanvasUI } from '../src/ui/CanvasUI'
import { NodeToolView, NodeToolsView } from '../src/NodeToolsView'
import { portEditorTemplate } from '../src/ui/portEditors'
import { renderNodeHeader } from '../src/ui/nodeHeader'
import { EditorRegistry } from '../src/ui/editors'

const Hello = defineNode({
  definition: {
    type: 'default',
    title: 'Hello',
    inputs: [{ name: 'exec', type: 'exec' }] as const,
    outputs: [{ name: 'ok', type: 'exec' }] as const,
  },
})

type PaperHandler = (...args: unknown[]) => void

function createHarness(graphOptions: Record<string, unknown> = {}, layoutWidth = 0) {
  const container = document.createElement('div')
  let width = layoutWidth
  Object.defineProperty(container, 'clientWidth', { configurable: true, get: () => width })
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
    nodeRegistry: { dataTypes: new DataTypeRegistry(), getNodeClasses: vi.fn(() => [Hello]) },
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
    getNodes: () => nodes,
    getLinks: () => [],
    getNodeExecutionStatus: vi.fn(() => 'idle'),
    getNodeExecutionData: vi.fn(),
    getNodeProgress: vi.fn(),
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
    refreshLinkEndpointTools: vi.fn(),
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
    setLayoutWidth(value: number) {
      width = value
    },
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

/** Open the right-hand panel through its toolbar toggle. */
function openNodePanel() {
  if (!current!.container.querySelector('.bpgraph-node-panel')) {
    current!.container.querySelector<HTMLButtonElement>('[data-action="node-panel"]')?.click()
  }
  return current!.container.querySelector<HTMLElement>('.bpgraph-node-panel')
}

afterEach(() => {
  current?.ui.destroy()
  current = null
  document.body.innerHTML = ''
  vi.useRealTimers()
  vi.unstubAllGlobals()
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

test('completed nodes show inputs and outputs; supports circular references and BigInt', () => {
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
  const card = current.container.querySelector('.bpgraph-node-preview')!
  expect(card.textContent).toContain('Inputs')
  expect(card.textContent).toContain('Outputs')
  expect(card.textContent).toContain('<img src=x onerror=alert(1)>')
  expect(card.querySelector('img')).toBeNull()
  for (const value of ['false', 'null', 'undefined', '1n', '[Circular reference]']) expect(card.textContent).toContain(value)
  expect(card.textContent?.match(/Repeated references remain visible/g)).toHaveLength(2)
})

test('hovered nodes display live status labels and hide port data until completion', () => {
  current = createHarness()
  const node = previewNode()
  const card = () => current!.container.querySelector<HTMLElement>('.bpgraph-node-preview')
  current.graph.getNodeExecutionStatus.mockReturnValue('idle')
  current.ui.refreshNodeExecutionPreview(node.id)
  expect(card()).toBeNull()

  current.graph.executionStatus = 'running'
  current.ui.refreshExecutionStatus()
  for (const [status, label] of [
    ['idle', 'Idle'], ['pending', 'Pending'], ['running', 'Executing'], ['skipped', 'Skipped'],
    ['failed', 'Failed'], ['cancelled', 'Cancelled'], ['interrupted', 'Waiting for external input'],
  ]) {
    current.graph.getNodeExecutionStatus.mockReturnValue(status)
    current.ui.refreshNodeExecutionPreview(node.id)
    expect(card()?.getAttribute('aria-label')).toBe('Hello execution status')
    expect(card()?.querySelector(`.is-${status}`)?.textContent).toBe(label)
    expect(card()?.querySelector('section')).toBeNull()
    expect(card()?.textContent).not.toContain('Actual input')
  }
  current.graph.getNodeExecutionStatus.mockReturnValue('completed')
  current.ui.refreshNodeExecutionPreview(node.id)
  expect(card()?.getAttribute('aria-label')).toBe('Hello execution data')
  expect(card()?.textContent).toContain('Actual input')
})

test('retry details use localized copy and hide the budget after completion', () => {
  current = createHarness({ language: 'zh' })
  const node = previewNode()
  const card = () => current!.container.querySelector('.bpgraph-node-preview')?.textContent
  const previousFailure = { code: 'UNAVAILABLE', message: 'The input was unavailable' }
  current.graph.getNodeExecutionData.mockReturnValue({
    inputs: {}, outputs: {}, attempt: { number: 2, maxRetries: 2, remainingRetries: 1, previousFailure },
  })
  current.graph.getNodeExecutionStatus.mockReturnValue('running')
  current.ui.refreshNodeExecutionPreview(node.id)
  expect(card()).toContain('已重试 1 次')
  expect(card()).toContain('还可重试 1 次')
  expect(card()).toContain('重试原因')

  current.graph.getNodeExecutionStatus.mockReturnValue('completed')
  current.ui.refreshNodeExecutionPreview(node.id)
  expect(card()).toContain('已完成')
  expect(card()).not.toContain('还可重试')
  expect(card()).toContain(previousFailure.message)

  current.graph.getNodeExecutionStatus.mockReturnValue('failed')
  current.graph.getNodeExecutionData.mockReturnValue({
    inputs: {}, outputs: {}, attempt: { number: 3, maxRetries: 2, remainingRetries: 0, failure: previousFailure },
  })
  current.ui.refreshNodeExecutionPreview(node.id)
  expect(card()).toContain('重试次数已用完')
  expect(card()).not.toContain('重试原因')
  expect(card()).toContain(previousFailure.message)
})

test('replay and retained cancellation expose status labels outside a live run', () => {
  current = createHarness()
  const node = previewNode()
  const label = () => current!.container.querySelector('.bpgraph-node-preview-header span')?.textContent
  current.graph.getNodeExecutionStatus.mockReturnValue('cancelled')
  current.ui.refreshNodeExecutionPreview(node.id)
  expect(label()).toBe('Cancelled')
  current.graph.getNodeExecutionStatus.mockReturnValue('idle')
  current.ui.refreshNodeExecutionPreview(node.id)
  expect(label()).toBeUndefined()
  current.graph.isReplayMode.mockReturnValue(true)
  current.emitGraph('node:mouseenter', node)
  expect(label()).toBe('Idle')
})

test('late mouseleave events do not read disposed nodes', () => {
  current = createHarness()
  const node = previewNode()
  expect(current.container.querySelector('.bpgraph-node-preview')).toBeTruthy()

  // Entering a subgraph removes old nodes before delayed mouseleave events arrive.
  current.emitGraph('node:removed', [node], { type: 'removed' })
  expect(() => current!.emitGraph('node:mouseleave', undefined)).not.toThrow()
  expect(current.container.querySelector('.bpgraph-node-preview')).toBeNull()
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
  const card = () => current!.container.querySelector<HTMLElement>('.bpgraph-node-preview')!
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
  expect(card().textContent).toContain('Pending')
  expect(card().querySelector('section')).toBeNull()

  current.graph.pausedNodeId = node.id
  current.ui.refreshExecutionStatus()
  expect(card().textContent).toContain('Paused at breakpoint')
  current.graph.executionStatus = 'running'
  current.ui.refreshExecutionStatus()
  expect(card().textContent).toContain('Pending')
  expect(card().querySelector('section')).toBeNull()
})

test('leaving nodes closes after a delay; hovering the card or node cancels closing; scrolling does not zoom canvas', () => {
  vi.useFakeTimers()
  current = createHarness()
  const node = previewNode()
  const card = () => current!.container.querySelector<HTMLElement>('.bpgraph-node-preview')!
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
  expect(current.container.querySelector('.bpgraph-node-preview')).toBeTruthy()

  const anchor = current.paper.findViewByModel.mock.results.at(-1)!.value.el as Element
  vi.mocked(anchor.getBoundingClientRect).mockReturnValue(new DOMRect(750, 580, 80, 40))
  const card = current.container.querySelector<HTMLElement>('.bpgraph-node-preview')!
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
    expect(current.container.querySelector('.bpgraph-node-preview')).toBeNull()
    expect(vi.getTimerCount()).toBe(0)
  }
  previewNode()
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
  expect(current.container.querySelector('.bpgraph-node-preview')).toBeNull()
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
  const Call = defineNode({
    ...Hello,
    definition: Hello.definition,
    type: 'call',
  })
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
  const Step = defineNode({
    ...Hello,
    definition: Hello.definition,
    type: 'step',
  })
  const Source = defineNode({
    ...Hello,
    type: 'source',
    definition: { ...Hello.definition, executionMode: 'source' as const },
  })
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
  const TextNode = defineNode({
    ...Hello,
    definition: Hello.definition,
    type: 'text',
  })
  const LogNode = defineNode({
    ...Hello,
    definition: Hello.definition,
    type: 'log',
  })
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
  const tooltip = container.querySelector('.bpgraph-palette-tooltip')!
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
  const First = defineNode({
    ...Hello,
    definition: Hello.definition,
    type: 'first',
  })
  const Second = defineNode({
    ...Hello,
    definition: Hello.definition,
    type: 'second',
  })
  const Third = defineNode({
    ...Hello,
    definition: Hello.definition,
    type: 'third',
  })
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
  expect(container.querySelector('.bpgraph-palette-tooltip')?.textContent?.trim()).toBe('<img src=x onerror=alert(1)>')
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
  const Other = defineNode({
    ...Hello,
    definition: Hello.definition,
    type: 'other',
  })
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
    const tooltip = current.container.querySelector<HTMLElement>('.bpgraph-palette-tooltip')!
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
    expect(container.querySelector('.bpgraph-palette-tooltip')).toBeTruthy()
    return item
  }
  focusItem()
  container.querySelector('.bpgraph-palette-list')!.dispatchEvent(new Event('scroll'))
  expect(container.querySelector('.bpgraph-palette-tooltip')).toBeNull()
  focusItem()
  const search = container.querySelector<HTMLInputElement>('.bpgraph-palette-search')!
  search.value = 'missing'
  search.dispatchEvent(new Event('input', { bubbles: true }))
  expect(container.querySelector('.bpgraph-palette-tooltip')).toBeNull()
  const item = focusItem()
  const drag = new Event('dragstart') as DragEvent
  Object.defineProperty(drag, 'dataTransfer', { value: { setData: vi.fn(), effectAllowed: '' } })
  item.dispatchEvent(drag)
  expect(container.querySelector('.bpgraph-palette-tooltip')).toBeNull()
  document.dispatchEvent(new Event('dragend'))
  focusItem()
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
  expect(container.querySelector('.bpgraph-palette-tooltip')).toBeNull()
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
  expect(container.querySelector('.bpgraph-palette-tooltip')).toBeNull()
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

test('right-click selection opens the menu and updates the open node panel', () => {
  current = createHarness()
  const node = createNodeStub()
  const other = createNodeStub({ id: 'node-2', title: 'Other' })
  current.adapter.findNode.mockImplementation((id: string) => id === other.id ? other : node)
  current.emitPaper('element:contextmenu', { model: { id: node.id } },
    { clientX: 10, clientY: 10, preventDefault: vi.fn() }, 10, 10)

  expect(current.graph.selection.has(node)).toBe(true)
  expect(current.container.querySelector('.bpgraph-context')).toBeTruthy()
  expect(current.container.querySelector('.bpgraph-node-panel-title')?.textContent).toBe('Test Switch')

  current.emitGraph('selection:changed', [other])
  expect(current.graph.selection.has(other)).toBe(true)
  expect(current.container.querySelector('.bpgraph-node-panel-title')?.textContent).toBe('Other')
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
    defaults: () => ({ inputValues: { greeting: 'hi' } }),
  }

  current.ui.openPalette(0, 0)
  current.container
    .querySelector<HTMLButtonElement>('.bpgraph-palette-item')!
    .dispatchEvent(new MouseEvent('click', { bubbles: true }))

  expect(current.graph.addNode).toHaveBeenCalledWith(Hello, { inputValues: { greeting: 'hi' } })
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
      { name: 'mode', type: 'string', editor: 'select', _options: [{ label: 'A', value: 'a' }] } as InputPort,
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

/**
 * Wait for the JSON code editor to commit its value.
 *
 * The editor parses the document and writes the node value after a short
 * delay, so the test must wait past that delay.
 */
async function waitForJsonEditor() {
  await new Promise((resolve) => setTimeout(resolve, 500))
}

/**
 * Replace the whole editor document.
 *
 * The test drives the editor through its public API, so the change goes
 * through the same transaction path the editor listens to.
 */
function setEditorText(editor: HTMLElement, text: string) {
  const content = editor.querySelector<HTMLElement>('.cm-content')!
  const view = EditorView.findFromDOM(content)
  expect(view).toBeTruthy()
  view!.dispatch({ changes: { from: 0, to: view!.state.doc.length, insert: text } })
}

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
    inputValues: { case_1_value: 'a' },
    ...overrides,
  } as unknown as NodeInstanceType
}

test('single selection renders the node panel inside canvas', () => {
  current = createHarness()
  const node = createNodeStub()
  current.adapter.findNode.mockReturnValue(node)
  current.emitGraph('selection:changed', [node])
  openNodePanel()

  const panel = current.container.querySelector('.bpgraph-node-panel')
  expect(panel).toBeTruthy()
  expect(panel!.querySelector('.bpgraph-node-panel-title')!.textContent).toBe('Test Switch')
  // exec ports are omitted from the panel
  expect(panel!.querySelectorAll('.bpgraph-node-panel-field')).toHaveLength(2)
  expect(panel!.querySelector<HTMLInputElement>('[data-field="case_1_value"]')!.value).toBe('a')
})

test('node panel shows the definition name below a custom title', () => {
  current = createHarness()
  current.graph.options.language = 'zh'
  const node = createNodeStub({
    id: 'node-42',
    type: 'subgraph',
    nodeType: 'subgraph',
    definition: { name: 'Subgraph' },
    title: 'Fetch customer profile',
  })
  current.adapter.findNode.mockReturnValue(node)
  current.emitGraph('selection:changed', [node])
  openNodePanel()

  const panel = current.container.querySelector('.bpgraph-node-panel')!
  expect(panel.querySelector('.bpgraph-node-panel-title')?.textContent).toBe('Fetch customer profile')
  expect(panel.querySelector('.bpgraph-node-panel-meta')?.textContent).toContain('定义名称: Subgraph')
  expect(panel.querySelector('.bpgraph-node-panel-meta')?.textContent).toContain('定义 ID: subgraph')
  expect(panel.querySelector('.bpgraph-node-panel-meta')?.textContent).toContain('实例 ID: node-42')
  expect(panel.querySelector('.bpgraph-node-panel-meta')?.textContent).toContain('行为类别: 子图')
})

test.each([
  { type: 'array', initial: [1], updated: [2] },
  { type: 'object', initial: { count: 1 }, updated: { count: 2 } },
])('node panel edits $type ports with the JSON code editor', async ({ type, initial, updated }) => {
  current = createHarness()
  const node = createNodeStub({
    inputs: [{ name: 'value', type, id: 'in-value' }],
    inputValues: { value: initial },
  })
  current.adapter.findNode.mockReturnValue(node)
  current.emitGraph('selection:changed', [node])
  openNodePanel()

  // Structured values use a code editor instead of a plain textarea.
  const editor = current.container.querySelector<HTMLElement>('.bpgraph-json-editor')!
  expect(editor).toBeTruthy()
  expect(editor.dataset.field).toBe('value')
  expect(current.container.querySelector('textarea[data-field="value"]')).toBeNull()

  // The editor renders a CodeMirror surface with the current value.
  const content = editor.querySelector('.cm-content')
  expect(content).toBeTruthy()
  const view = EditorView.findFromDOM(content as HTMLElement)!
  expect(view.state.doc.toString()).toBe(JSON.stringify(initial, null, 2))
  // Opening the editor does not write a value back to the node.
  expect(node.inputValues.value).toEqual(initial)

  // Editing the document writes the parsed value back to the node.
  setEditorText(editor, JSON.stringify(updated, null, 2))
  await waitForJsonEditor()
  expect(node.inputValues.value).toEqual(updated)
})

test('node panel highlights JSON tokens in the code editor', () => {
  current = createHarness()
  const node = createNodeStub({
    inputs: [{ name: 'value', type: 'object', id: 'in-value' }],
    inputValues: { value: { count: 1 } },
  })
  current.adapter.findNode.mockReturnValue(node)
  current.emitGraph('selection:changed', [node])
  openNodePanel()

  const editor = current.container.querySelector<HTMLElement>('.bpgraph-json-editor')!
  const content = editor.querySelector('.cm-content')!
  // The parser wraps JSON tokens in spans so the highlighter can color them.
  const spans = content.querySelectorAll('span')
  expect(spans.length).toBeGreaterThan(0)
  // Property names and values are highlighted separately.
  const texts = [...spans].map((span) => span.textContent)
  expect(texts).toContain('"count"')
  expect(texts).toContain('1')
})

test('node panel keeps the last valid value while the JSON document is incomplete', async () => {
  current = createHarness()
  const node = createNodeStub({
    inputs: [{ name: 'value', type: 'object', id: 'in-value' }],
    inputValues: { value: { count: 1 } },
  })
  current.adapter.findNode.mockReturnValue(node)
  current.emitGraph('selection:changed', [node])
  openNodePanel()

  const editor = current.container.querySelector<HTMLElement>('.bpgraph-json-editor')!
  setEditorText(editor, '{ "count": ')
  await waitForJsonEditor()
  // Invalid JSON does not overwrite the node value.
  expect(node.inputValues.value).toEqual({ count: 1 })
})

test('node panel rejects JSON that does not match the port type', async () => {
  current = createHarness()
  const node = createNodeStub({
    inputs: [{ name: 'value', type: 'array', id: 'in-value' }],
    inputValues: { value: [1] },
  })
  current.adapter.findNode.mockReturnValue(node)
  current.emitGraph('selection:changed', [node])
  openNodePanel()

  const editor = current.container.querySelector<HTMLElement>('.bpgraph-json-editor')!
  setEditorText(editor, '{ "count": 1 }')
  await waitForJsonEditor()
  // An object does not fit an array port, so the node keeps its value.
  expect(node.inputValues.value).toEqual([1])
})

test('node panel releases JSON editors when the selection changes', async () => {
  current = createHarness()
  const node = createNodeStub({
    inputs: [{ name: 'value', type: 'object', id: 'in-value' }],
    inputValues: { value: { count: 1 } },
  })
  const other = createNodeStub({
    id: 'node-2',
    inputs: [{ name: 'value', type: 'object', id: 'in-value' }],
    inputValues: { value: { count: 2 } },
  })
  current.adapter.findNode.mockReturnValue(node)
  current.emitGraph('selection:changed', [node])
  openNodePanel()
  await waitForJsonEditor()

  const panel = current.ui['panel'] as unknown as { jsonEditors: Map<string, unknown> }
  expect(panel.jsonEditors.size).toBe(1)

  current.adapter.findNode.mockReturnValue(other)
  current.emitGraph('selection:changed', [other])
  await waitForJsonEditor()

  // Editors from the previous node are destroyed and replaced.
  expect(panel.jsonEditors.size).toBe(1)
  expect(current.container.querySelectorAll('.bpgraph-json-editor')).toHaveLength(1)
})

test('node descriptions appear below Outputs as plain text with preserved newlines', () => {
  const Described = defineNode({
    ...Hello,
    definition: Hello.definition,
  })
  new NodeRegistry().register('described', Described)
  const description = 'Additional node description\n<img src=x onerror=alert(1)>'
  const describe = vi.fn(() => ({ description }))
  current = createHarness({ palette: { describe } })
  current.graph.nodeRegistry.getNodeClasses.mockReturnValue([Described])
  const node = new NodeInstance(Described, { id: 'described-node' })
  current.adapter.findNode.mockReturnValue(node)
  current.emitGraph('selection:changed', [node])
  openNodePanel()

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
  const First = defineNode({
    ...Hello,
    definition: Hello.definition,
  })
  const Second = defineNode({
    ...Hello,
    definition: Hello.definition,
  })
  const Unknown = defineNode({
    ...Hello,
    definition: Hello.definition,
    type: 'unknown',
  })
  new NodeRegistry().register('first', First).register('second', Second)
  current = createHarness({ palette: { describe: (nodeClass: typeof Hello) => (
    nodeClass === First ? { description: 'First node description' } : { description: '  ' }
  ) } })
  current.graph.nodeRegistry.getNodeClasses.mockReturnValue([First, Second])
  for (const nodeClass of [First, Second, Unknown, First]) {
    const node = new NodeInstance(nodeClass, { id: nodeClass.type })
    current.adapter.findNode.mockReturnValue(node)
    current.emitGraph('selection:changed', [node])
    openNodePanel()
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
  openNodePanel()

  const field = current.container.querySelector<HTMLInputElement>('[data-field="case_1_value"]')!
  field.value = 'b'
  field.dispatchEvent(new Event('input', { bubbles: true }))

  expect(node.inputValues).toEqual({ case_1_value: 'b' })
})

test('Start settings omit data sections while hover shows the execution status', () => {
  current = createHarness()
  const registry = new NodeRegistry()
  const node = new NodeInstance(registry.getStartNodeClass(), { id: 'start' })
  current.adapter.findNode.mockReturnValue(node)
  current.emitGraph('selection:changed', [node])
  openNodePanel()
  const panel = current.container.querySelector('.bpgraph-node-panel')!
  expect(panel.textContent).not.toContain('Trigger downstream nodes through execution ports')
  expect(panel.querySelectorAll('.bpgraph-node-panel-section')).toHaveLength(0)
  expect(panel.textContent).not.toContain('Inputs')
  expect(panel.textContent).not.toContain('Outputs')
  current.paper.findViewByModel.mockReturnValue({ el: panel })
  for (const status of ['running', 'paused'] as const) {
    current.graph.executionStatus = status
    current.graph.pausedNodeId = status === 'paused' ? node.id : null
    current.graph.getNodeExecutionStatus.mockReturnValue(status === 'paused' ? 'pending' : 'completed')
    current.emitGraph('node:mouseenter', node)
    const card = current.container.querySelector('.bpgraph-node-preview')!
    expect(card.textContent).toContain(status === 'paused' ? 'Paused at breakpoint' : 'Completed')
    expect(card.querySelector('section')).toBeNull()
  }
})

test('panel case deletion uses graph.removeSwitchCase and hides the last delete button', () => {
  current = createHarness()
  const node = createNodeStub()
  current.adapter.findNode.mockReturnValue(node)
  current.emitGraph('selection:changed', [node])
  openNodePanel()

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

test('multiple selection keeps the open panel on the overview', () => {
  current = createHarness()
  const node = createNodeStub()
  const other = createNodeStub({ id: 'node-2' })
  current.adapter.findNode.mockImplementation((id: string) => (id === 'node-2' ? other : node))
  const panel = () => current!.container.querySelector('.bpgraph-node-panel')
  const title = () => current!.container.querySelector('.bpgraph-node-panel-title')?.textContent

  current.emitGraph('selection:changed', [node])
  expect(panel()).toBeTruthy()
  expect(title()).toBe('Test Switch')

  current.emitGraph('selection:changed', [node, other])
  expect(panel()).toBeTruthy()
  expect(title()).toBe('Graph overview')

  current.emitGraph('selection:changed', [])
  expect(title()).toBe('Graph overview')

  current.emitGraph('selection:changed', [node])
  expect(title()).toBe('Test Switch')
})

test('closing a panel preserves selection and keeps it hidden when selection changes', () => {
  current = createHarness()
  const node = createNodeStub()
  const other = createNodeStub({ id: 'node-2' })
  current.adapter.findNode.mockImplementation((id: string) => id === other.id ? other : node)
  current.emitGraph('selection:changed', [node])
  openNodePanel()
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
  openNodePanel()
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
])('clicking node controls or ports selects the node: %s', (markup) => {
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
  expect(current.container.querySelector('.bpgraph-node-panel-title')?.textContent).toBe('Test Switch')
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
  openNodePanel()

  const extra = current.container.querySelector('.bpgraph-node-panel-extra')
  expect(extra).toBeTruthy()
  expect(extra!.textContent).toContain('extra:node-1')
})

test('a registered panel editor replaces the built-in control of a port', () => {
  current = createHarness()
  current.graph.editors = new EditorRegistry()
  current.graph.editors.register('string', {
    panel: { render: (ctx) => html`<button class="custom-panel" data-value=${String(ctx.value)}>Custom</button>` },
  })
  const node = createNodeStub()
  current.adapter.findNode.mockReturnValue(node)
  current.emitGraph('selection:changed', [node])
  openNodePanel()

  const panel = current.container.querySelector('.bpgraph-node-panel')
  expect(panel!.querySelectorAll('.custom-panel')).toHaveLength(2)
  // The built-in text input is replaced by the registered editor.
  expect(panel!.querySelector('.bpgraph-node-panel-field input')).toBeNull()
})

test('a registered panel editor writes values back to the node', () => {
  current = createHarness()
  current.graph.editors = new EditorRegistry()
  current.graph.editors.register('string', {
    panel: { render: (ctx) => html`<button class="custom-panel" @click=${() => ctx.setValue('written')}>Set</button>` },
  })
  const node = createNodeStub()
  current.adapter.findNode.mockReturnValue(node)
  current.emitGraph('selection:changed', [node])
  openNodePanel()

  current.container.querySelector<HTMLButtonElement>('.custom-panel')!.click()
  expect(node.inputValues.case_1_value).toBe('written')
})

test('panel sections can hide built-in blocks', () => {
  current = createHarness()
  current.graph.options.nodePanel = { sections: () => ['meta', 'inputs'] }
  const node = createNodeStub()
  current.adapter.findNode.mockReturnValue(node)
  current.emitGraph('selection:changed', [node])
  openNodePanel()

  const panel = current.container.querySelector('.bpgraph-node-panel')!
  const titles = [...panel.querySelectorAll('.bpgraph-node-panel-section-title')].map((el) => el.textContent)
  expect(titles).toEqual(['Inputs'])
  expect(panel.querySelector('.bpgraph-node-panel-meta')).toBeTruthy()
})

test('panel sections can reorder built-in blocks', () => {
  current = createHarness()
  current.graph.options.nodePanel = { sections: () => ['outputs', 'inputs'] }
  const node = createNodeStub()
  current.adapter.findNode.mockReturnValue(node)
  current.emitGraph('selection:changed', [node])
  openNodePanel()

  const panel = current.container.querySelector('.bpgraph-node-panel')!
  const titles = [...panel.querySelectorAll('.bpgraph-node-panel-section-title')].map((el) => el.textContent)
  expect(titles).toEqual(['Outputs', 'Inputs'])
})

test('panel sections can insert application content', () => {
  current = createHarness()
  current.graph.options.nodePanel = {
    sections: (node) => [
      'meta',
      { id: 'custom', render: (ctx) => html`<div class="app-section">app:${ctx.node.id}:${node.id}</div>` },
    ],
  }
  const node = createNodeStub()
  current.adapter.findNode.mockReturnValue(node)
  current.emitGraph('selection:changed', [node])
  openNodePanel()

  const section = current.container.querySelector('.bpgraph-node-panel-scroll .app-section')
  expect(section!.textContent).toBe('app:node-1:node-1')
  // Only the meta block and the application section remain.
  expect(current.container.querySelector('.bpgraph-node-panel-section-title')).toBeNull()
})

test('panel sections returning an empty list leave only the header', () => {
  current = createHarness()
  current.graph.options.nodePanel = { sections: () => [] }
  const node = createNodeStub()
  current.adapter.findNode.mockReturnValue(node)
  current.emitGraph('selection:changed', [node])
  openNodePanel()

  const panel = current.container.querySelector('.bpgraph-node-panel')!
  expect(panel.querySelector('.bpgraph-node-panel-title')!.textContent).toBe('Test Switch')
  expect(panel.querySelector('.bpgraph-node-panel-scroll')!.children).toHaveLength(0)
})

test('nodePanel.render replaces the whole content area and keeps the shell', () => {
  current = createHarness()
  current.graph.options.nodePanel = {
    width: 280,
    render: (ctx) => html`<div class="app-panel">app:${ctx.node.id}</div>`,
  }
  const node = createNodeStub()
  current.adapter.findNode.mockReturnValue(node)
  current.emitGraph('selection:changed', [node])
  openNodePanel()

  const panel = current.container.querySelector<HTMLElement>('.bpgraph-node-panel')!
  // The application content replaces every section.
  expect(panel.querySelector('.app-panel')!.textContent).toBe('app:node-1')
  expect(panel.querySelector('.bpgraph-node-panel-field')).toBeNull()
  expect(panel.querySelector('.bpgraph-node-panel-meta')).toBeNull()
  // The shell stays: the header with its title and the close button.
  expect(panel.querySelector('.bpgraph-node-panel-title')!.textContent).toBe('Test Switch')
  expect(panel.querySelector('.bpgraph-node-panel-close')).toBeTruthy()
  // The configured width applies to the shell, not the content.
  expect(panel.style.width).toBe('280px')
})

test('nodePanel.render takes precedence over sections', () => {
  current = createHarness()
  const sections = vi.fn(() => ['inputs'] as const)
  current.graph.options.nodePanel = {
    sections,
    render: () => html`<div class="app-panel">custom</div>`,
  }
  const node = createNodeStub()
  current.adapter.findNode.mockReturnValue(node)
  current.emitGraph('selection:changed', [node])
  openNodePanel()

  expect(current.container.querySelector('.app-panel')).toBeTruthy()
  expect(current.container.querySelector('.bpgraph-node-panel-section-title')).toBeNull()
  expect(sections).not.toHaveBeenCalled()
})

test('nodePanel.render receives the node, graph, language, and a working close callback', () => {
  current = createHarness({ language: 'zh' })
  const seen: unknown[] = []
  current.graph.options.nodePanel = {
    render: (ctx) => {
      seen.push({ node: ctx.node.id, graph: ctx.graph, language: ctx.language })
      return html`<button class="app-close" @click=${() => ctx.close()}>Close</button>`
    },
  }
  const node = createNodeStub()
  current.adapter.findNode.mockReturnValue(node)
  current.emitGraph('selection:changed', [node])
  openNodePanel()
  expect(seen[0]).toEqual({ node: 'node-1', graph: current.graph, language: 'zh' })
  current.container.querySelector<HTMLButtonElement>('.app-close')!.click()
  expect(current.container.querySelector('.bpgraph-node-panel')).toBeNull()
  // Closing through the application callback keeps the selection.
  expect(current.graph.clearSelection).not.toHaveBeenCalled()
})

test('nodePanel.render returning nothing leaves an empty content area', () => {
  current = createHarness()
  current.graph.options.nodePanel = { render: () => nothing }
  const node = createNodeStub()
  current.adapter.findNode.mockReturnValue(node)
  current.emitGraph('selection:changed', [node])
  openNodePanel()

  const panel = current.container.querySelector('.bpgraph-node-panel')!
  expect(panel.querySelector('.bpgraph-node-panel-title')!.textContent).toBe('Test Switch')
  expect(panel.querySelector('.bpgraph-node-panel-scroll')!.children).toHaveLength(0)
})

test('nodePanel.render runs again when the selection changes', () => {
  current = createHarness()
  current.graph.options.nodePanel = { render: (ctx) => html`<div class="app-panel">${ctx.node.id}</div>` }
  const first = createNodeStub()
  const second = createNodeStub({ id: 'node-2' })
  current.adapter.findNode.mockImplementation((id: string) => id === second.id ? second : first)
  current.emitGraph('selection:changed', [first])
  openNodePanel()
  expect(current.container.querySelector('.app-panel')!.textContent).toBe('node-1')

  current.emitGraph('selection:changed', [second])
  expect(current.container.querySelector('.app-panel')!.textContent).toBe('node-2')
})

function createContainerNode(overrides: Record<string, unknown> = {}) {
  return createNodeStub({ id: 'loop-1', type: 'loop', title: 'Loop', subgraphId: 'sg-1', ...overrides })
}

test('selecting a container updates an open panel immediately', () => {
  current = createHarness()
  const node = createContainerNode()
  const other = createContainerNode({ id: 'loop-2', title: 'Another loop' })
  current.adapter.findNode.mockImplementation((id: string) => (id === other.id ? other : node))
  current.graph.model.hasSubgraph.mockReturnValue(true)
  const title = () => current!.container.querySelector('.bpgraph-node-panel-title')?.textContent

  openNodePanel()
  expect(title()).toBe('Graph overview')
  current.emitGraph('node:click', node, new MouseEvent('click'))
  current.emitGraph('selection:changed', [node])
  expect(title()).toBe('Loop')

  // An open panel must immediately display the newly selected container.
  current.emitGraph('node:click', other, new MouseEvent('click'))
  current.emitGraph('selection:changed', [other])
  expect(title()).toBe('Another loop')
})

test('entering a subgraph keeps the panel open on the overview', () => {
  current = createHarness()
  const node = createContainerNode()
  current.adapter.findNode.mockReturnValue(node)
  current.graph.model.hasSubgraph.mockReturnValue(true)

  current.emitGraph('selection:changed', [node])
  openNodePanel()
  expect(current.container.querySelector('.bpgraph-node-panel-title')?.textContent).toBe('Loop')

  current.emitGraph('subgraph:enter', 'sg-1')
  expect(current.container.querySelector('.bpgraph-node-panel')).toBeTruthy()
  expect(current.container.querySelector('.bpgraph-node-panel-title')?.textContent).toBe('Graph overview')
})

test('the overview lists nodes in the current view and locates a clicked node', () => {
  current = createHarness()
  const first = createNodeStub({ position: { x: 100, y: 100 } })
  const second = createNodeStub({ id: 'node-2', title: 'Second node', position: { x: 400, y: 200 } })
  current.nodes.push(first, second)
  current.adapter.findNode.mockImplementation((id: string) => id === first.id ? first : id === second.id ? second : undefined)
  current.ui.refreshNodePanel()
  vi.spyOn(current.container, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 800, 600))
  const panel = current.container.querySelector<HTMLElement>('.bpgraph-node-panel')!
  expect(panel.querySelector('.bpgraph-node-panel-title')?.textContent).toBe('Graph overview')

  const tabs = [...panel.querySelectorAll<HTMLButtonElement>('[role="tab"]')]
  expect(tabs.map((tab) => tab.textContent?.trim())).toEqual(['Node', 'Global settings'])
  expect(tabs[0].getAttribute('aria-selected')).toBe('true')
  expect(tabs[1].getAttribute('aria-selected')).toBe('false')
  expect(panel.querySelector('[role="tabpanel"]')?.getAttribute('aria-labelledby')).toBe(tabs[0].id)

  const items = [...panel.querySelectorAll<HTMLButtonElement>('.bpgraph-node-panel-overview-item')]
  expect(items.map((item) => item.textContent?.trim())).toEqual(['Test Switch', 'Second node'])
  const list = panel.querySelector('ul.bpgraph-node-panel-overview-list')
  expect(list?.getAttribute('aria-label')).toBe('Nodes in this view')

  items[0].click()
  expect(current.graph.selection.has(first)).toBe(true)
  // The node center moves to the viewport center: 400 - (100 + 50), 300 - (100 + 20).
  expect(current.graph.position).toEqual({ x: 250, y: 180 })
  expect(panel.querySelector('.bpgraph-node-panel-title')?.textContent).toBe('Test Switch')
})

test('the overview shows an empty state without nodes', () => {
  current = createHarness()
  const panel = current.container.querySelector('.bpgraph-node-panel')!
  expect(panel.querySelector('.bpgraph-node-panel-empty')?.textContent).toBe('No nodes in this view')
})

test('tabs switch between node, overview, and global settings content', () => {
  current = createHarness({
    nodePanel: {
      overview: () => html`<div class="app-overview">Application overview</div>`,
      globalSettings: () => html`<div class="app-global-settings">Application settings</div>`,
    },
  })
  const node = createNodeStub()
  current.adapter.findNode.mockReturnValue(node)
  const panel = () => current!.container.querySelector('.bpgraph-node-panel')!
  const title = () => panel().querySelector('.bpgraph-node-panel-title')?.textContent
  const tabs = () => [...panel().querySelectorAll<HTMLButtonElement>('[role="tab"]')]

  openNodePanel()
  expect(title()).toBe('Graph overview')
  expect(panel().querySelector('.app-overview')?.textContent).toBe('Application overview')

  tabs()[1].click()
  expect(title()).toBe('Global settings')
  expect(panel().querySelector('.app-global-settings')?.textContent).toBe('Application settings')
  expect(tabs()[1].getAttribute('aria-selected')).toBe('true')

  current.emitGraph('selection:changed', [node])
  // Selecting a node brings its settings forward.
  expect(title()).toBe('Test Switch')
  expect(tabs()[0].getAttribute('aria-selected')).toBe('true')
  expect(panel().querySelectorAll('.bpgraph-node-panel-field')).toHaveLength(2)

  tabs()[1].click()
  expect(title()).toBe('Global settings')
  // Clearing the selection leaves the chosen tab in place.
  current.emitGraph('selection:changed', [])
  expect(title()).toBe('Global settings')

  tabs()[0].click()
  expect(title()).toBe('Graph overview')
  expect(panel().querySelector('.app-overview')).toBeTruthy()
})

test('selecting a node while closed reopens on the Node tab', () => {
  current = createHarness({ nodePanel: { globalSettings: () => html`<p>Settings</p>` } })
  const node = createNodeStub()
  current.adapter.findNode.mockReturnValue(node)
  const panel = () => current!.container.querySelector('.bpgraph-node-panel')!

  openNodePanel()
  panel().querySelectorAll<HTMLButtonElement>('[role="tab"]')[1].click()
  current.ui.closeNodePanel()

  current.emitGraph('selection:changed', [node])
  openNodePanel()
  expect(panel().querySelector('.bpgraph-node-panel-title')?.textContent).toBe('Test Switch')
  expect(panel().querySelector('[role="tab"][aria-selected="true"]')?.textContent?.trim()).toBe('Node')
})

test('global settings show an empty state without a renderer', () => {
  current = createHarness()
  const panel = openNodePanel()!
  panel.querySelectorAll<HTMLButtonElement>('[role="tab"]')[1].click()
  expect(panel.querySelector('.bpgraph-node-panel-title')?.textContent).toBe('Global settings')
  expect(panel.querySelector('.bpgraph-node-panel-empty')?.textContent).toBe('No global settings')
})

test('tab keyboard navigation moves focus and selection', () => {
  current = createHarness()
  const panel = openNodePanel()!
  const nodeTab = panel.querySelector<HTMLButtonElement>('[data-tab="node"]')!
  const globalTab = panel.querySelector<HTMLButtonElement>('[data-tab="global"]')!
  nodeTab.focus()
  nodeTab.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
  expect(panel.querySelector('.bpgraph-node-panel-title')?.textContent).toBe('Global settings')
  expect(document.activeElement).toBe(panel.querySelector('[data-tab="global"]'))
  expect(globalTab.getAttribute('aria-selected')).toBe('true')

  globalTab.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }))
  expect(document.activeElement).toBe(panel.querySelector('[data-tab="node"]'))
  expect(panel.querySelector('[data-tab="node"]')?.getAttribute('aria-selected')).toBe('true')
})

test('overview and global settings renderers receive graph, language, and close', () => {
  const seen: Array<Record<string, unknown>> = []
  current = createHarness({
    language: 'zh',
    nodePanel: {
      overview: (ctx) => {
        seen.push({ view: 'overview', graph: ctx.graph, language: ctx.language, locateNode: ctx.locateNode })
        return html`<div class="app-overview">Overview</div>`
      },
      globalSettings: (ctx) => {
        seen.push({ view: 'global', graph: ctx.graph, language: ctx.language })
        return html`<button class="app-close" @click=${() => ctx.close()}>Close</button>`
      },
    },
  })
  const overviewEntry = seen.find((entry) => entry.view === 'overview')!
  expect(overviewEntry.graph).toBe(current.graph)
  expect(overviewEntry.language).toBe('zh')
  expect(typeof overviewEntry.locateNode).toBe('function')

  seen.length = 0
  current.container.querySelectorAll<HTMLButtonElement>('[role="tab"]')[1].click()
  const globalEntry = seen.find((entry) => entry.view === 'global')!
  expect(globalEntry.graph).toBe(current.graph)
  expect(globalEntry.language).toBe('zh')
  expect(globalEntry.locateNode).toBeUndefined()

  current.container.querySelector<HTMLButtonElement>('.app-close')!.click()
  expect(current.container.querySelector('.bpgraph-node-panel')).toBeNull()
})

test('panel visibility defaults to open and is controlled by the toolbar and Graph API', () => {
  current = createHarness()
  const toggle = () => current!.container.querySelector<HTMLButtonElement>('[data-action="node-panel"]')!
  expect(current.container.querySelector('.bpgraph-node-panel')).toBeTruthy()
  expect(toggle().getAttribute('aria-label')).toBe('Hide node panel')
  expect(toggle().getAttribute('aria-pressed')).toBe('true')
  expect(current.ui.isNodePanelOpen()).toBe(true)

  toggle().click()
  expect(current.container.querySelector('.bpgraph-node-panel')).toBeNull()
  expect(toggle().getAttribute('aria-label')).toBe('Show node panel')
  expect(toggle().getAttribute('aria-pressed')).toBe('false')
  expect(current.ui.isNodePanelOpen()).toBe(false)

  current.ui.openNodePanel()
  expect(current.container.querySelector('.bpgraph-node-panel')).toBeTruthy()
  expect(current.ui.isNodePanelOpen()).toBe(true)
  current.ui.toggleNodePanel()
  expect(current.ui.isNodePanelOpen()).toBe(false)
})

test('refreshNodePanel reevaluates content and closes without configuration', () => {
  let label = 'First overview'
  current = createHarness({
    nodePanel: { open: true, overview: () => html`<p class="app-overview">${label}</p>` },
  })
  expect(current.container.querySelector('.app-overview')?.textContent).toBe('First overview')

  label = 'Second overview'
  current.ui.refreshNodePanel()
  expect(current.container.querySelector('.app-overview')?.textContent).toBe('Second overview')

  current.graph.options.nodePanel = false
  current.ui.refreshToolbar()
  current.ui.refreshNodePanel()
  expect(current.container.querySelector('.bpgraph-node-panel')).toBeNull()
  expect(current.container.querySelector('[data-action="node-panel"]')).toBeNull()
  expect(current.ui.isNodePanelOpen()).toBe(false)
})

test('toolbar uses the side-panel icon for the node panel and a console icon for debug', () => {
  current = createHarness({ debugPanel: true })
  const nodePath = current.container
    .querySelector('[data-action="node-panel"] svg path')?.getAttribute('d')
  const debugPath = current.container
    .querySelector('[data-action="debug-panel"] svg path')?.getAttribute('d')
  expect(nodePath).toBeTruthy()
  expect(debugPath).toBeTruthy()
  expect(nodePath).not.toBe(debugPath)
  // The debug toggle is a terminal window with a prompt and a line.
  expect(debugPath).toContain('M7 9l3 3-3 3')
  expect(debugPath).toContain('M13 15h4')
})

test('Esc keeps the persistent node panel open', () => {
  current = createHarness()
  openNodePanel()
  expect(current.container.querySelector('.bpgraph-node-panel')).toBeTruthy()
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
  expect(current.container.querySelector('.bpgraph-node-panel')).toBeTruthy()
  expect(current.ui.isNodePanelOpen()).toBe(true)
})

test('nodePanel.open false starts the panel closed', () => {
  current = createHarness({ nodePanel: { open: false } })
  expect(current.container.querySelector('.bpgraph-node-panel')).toBeNull()
  expect(current.ui.isNodePanelOpen()).toBe(false)
  expect(current.container.querySelector<HTMLButtonElement>('[data-action="node-panel"]')?.getAttribute('aria-label')).toBe('Show node panel')

  current.ui.openNodePanel()
  expect(current.container.querySelector('.bpgraph-node-panel')).toBeTruthy()
  expect(current.ui.isNodePanelOpen()).toBe(true)
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
  expect([...buttons].map((button) => button.getAttribute('aria-label'))).toEqual(['Undo', 'Redo', 'Run', 'Hide node panel'])

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
  const allButtons = [...bar.querySelectorAll<HTMLButtonElement>('button')]
  const buttons = allButtons.slice(2, 6)
  expect(allButtons.map(button => button.getAttribute('aria-label'))).toEqual([
    'Undo', 'Redo', 'Run', 'Debug', 'Resume', 'Stop', 'Hide node panel',
  ])
  expect(buttons.map(button => button.textContent?.trim())).toEqual(['', '', '', ''])
  expect(bar.querySelector('[role="status"]')).toBeNull()
  expect(buttons.map(button => button.getAttribute('aria-label'))).toEqual(['Run', 'Debug', 'Resume', 'Stop'])
  expect(buttons.every(button => !button.hasAttribute('title'))).toBe(true)
  const tooltips = [...bar.querySelectorAll<HTMLElement>('[role="tooltip"]')].slice(2, 6)
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
  // The panel toggles use built-in SVG icons rather than icon-font classes.
  const nodeToggle = allButtons.at(-1)!
  expect(nodeToggle.querySelector('svg path')).toBeTruthy()
  expect(nodeToggle.querySelector('i')).toBeNull()
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
  const nodeToggle = current.container.querySelector<HTMLButtonElement>('[aria-label="Show node panel"]')!
  expect(nodeToggle.disabled).toBe(true)
  const others = allButtons.filter((button) => button !== toggle)
  expect(others.map((button) => button.getAttribute('aria-label'))).toEqual(
    expect.arrayContaining(['Undo', 'Redo', 'Run', 'Resume', 'Show node panel'])
  )
  expect(others.every((button) => button.disabled)).toBe(true)

  const emit = vi.spyOn(current.graph, 'emit')
  current.container.querySelector<HTMLButtonElement>('[aria-label="Run"]')!.click()
  expect(emit).not.toHaveBeenCalledWith('toolbar:action', 'run')

  nodeToggle.click()
  expect(current.ui.isNodePanelOpen()).toBe(false)
  current.ui.openNodePanel()
  expect(current.ui.isNodePanelOpen()).toBe(false)

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
    logs: [
      { time: 1000, level: 'info' as const, type: 'task:status', message: 'Execution started' },
      { time: 2000, level: 'error' as const, type: 'activation:status', message: 'Node execution failed', nodeId: 'node-2' },
    ],
  }
}

const debugToggle = () =>
  current!.container.querySelector<HTMLButtonElement>('[data-action="debug-panel"]')!

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
  expect(sections.map((section) => section.getAttribute('aria-label'))).toEqual(['Execution records', 'Logs'])
  expect([...panel.querySelectorAll('.bpgraph-debug-panel-section-title')].map((title) => title.textContent?.replace(/\s+/g, '')))
    .toEqual(['Executionrecords2', 'Logs2'])

  const records = [...panel.querySelectorAll('.bpgraph-debug-record')]
  expect(records).toHaveLength(2)
  expect(records[0].querySelector('strong')?.textContent).toBe('Run main workflow')
  expect(records[1].querySelector('strong')?.textContent).toBe('Listen message')
  expect(records[0].querySelector('.bpgraph-debug-record-detail')?.textContent).toBe('Completed 3 nodes')
  expect(records[0].querySelector('.bpgraph-debug-record-meta')?.textContent).toContain('· 1.5s')
  expect(records[1].querySelector('.bpgraph-debug-record-meta')?.textContent).not.toContain('·')
  expect(records[0].querySelector('.bpgraph-debug-status')?.textContent?.trim()).toBe('Completed')
  expect(records[1].querySelector('.bpgraph-debug-status')?.textContent?.trim()).toBe('Running')

  const logs = [...panel.querySelectorAll('.bpgraph-debug-log')]
  // Engine trace event types are shown as badges; the level label is the fallback.
  expect(logs.map((log) => log.querySelector('.bpgraph-debug-log-type')?.textContent)).toEqual([
    'task:status',
    'activation:status',
  ])
  expect(logs[0].textContent).toContain('Execution started')
  expect(logs[1].textContent).toContain('Node execution failed')
  expect(logs[1].querySelector('.bpgraph-debug-log-node')?.textContent).toBe('Text Input')
  expect(logs[1].classList.contains('is-error')).toBe(true)

  panel.querySelector<HTMLButtonElement>('[aria-label="Close debug panel"]')!.click()
  expect(current.container.querySelector('.bpgraph-debug-panel')).toBeNull()
  expect(debugToggle().getAttribute('aria-label')).toBe('Show debug panel')
  expect(debugToggle().getAttribute('aria-pressed')).toBe('false')
})

test('log entries without an engine event type fall back to the level label', () => {
  current = createHarness({
    debugPanel: {
      width: 300,
      data: () => ({
        logs: [
          { time: 1000, message: 'Application log' },
          { time: 2000, level: 'warn' as const, message: 'Application warning' },
        ],
      }),
    },
  })
  current.ui.openDebugPanel()

  const types = [...current.container.querySelectorAll('.bpgraph-debug-log-type')]
  expect(types.map((type) => type.textContent)).toEqual(['Info', 'Warning'])
  expect(types[1].classList.contains('is-plain')).toBe(true)
})

test('subgraph log entries are indented and prefixed with [subgraph name]', () => {
  const scope = { subgraphId: 'child', title: 'Order subgraph', depth: 1 }
  current = createHarness({
    debugPanel: {
      width: 300,
      data: () => ({
        logs: [
          { time: 1000, message: 'Internal node completed', nodeId: 'child-step', scope },
        ],
      }),
    },
  })
  current.ui.openDebugPanel()

  const log = current.container.querySelector('.bpgraph-debug-log-scope')
  expect(log?.textContent).toBe('[Order subgraph]')
  expect(current.container.querySelector('.bpgraph-debug-log-message')?.textContent).toContain('Internal node completed')
  // Subgraph entries are indented by their nesting depth.
  expect(current.container.querySelector<HTMLElement>('.bpgraph-debug-log')?.style.paddingLeft).toBe('12px')
})

test('untitled log entries resolve names across subgraphs instead of showing only node ID', () => {
  current = createHarness({
    debugPanel: {
      width: 300,
      data: () => ({
        logs: [{ time: 1000, message: 'Internal node completed', nodeId: 'child-step' }],
      }),
    },
  })
  current.graph.findNodeAnywhere.mockReturnValue({ title: 'Subgraph internal node' } as never)
  current.ui.openDebugPanel()

  expect(current.container.querySelector('.bpgraph-debug-log-node')?.textContent).toBe('Subgraph internal node')
})

test('debug panels shift node panels left and restore their position on close', () => {
  current = createHarness({ debugPanel: { width: 300 } })
  const node = createNodeStub()
  current.adapter.findNode.mockReturnValue(node)

  current.ui.openDebugPanel()
  current.emitGraph('selection:changed', [node])
  openNodePanel()
  const panel = current.container.querySelector<HTMLElement>('.bpgraph-node-panel')!
  expect(panel.style.right).toBe('316px')
  expect(panel.style.maxWidth).toBe('calc(100% - 324px)')

  current.ui.closeDebugPanel()
  expect(panel.style.right).toBe('8px')
  expect(panel.style.maxWidth).toBe('calc(100% - 16px)')
  expect(current.ui.isDebugPanelOpen()).toBe(false)
})

test('toolbar reserves the measured width of open side panels', () => {
  current = createHarness({ debugPanel: true })
  const inset = () =>
    current!.container.querySelector<HTMLElement>('.bpgraph-toolbar-layer')!
      .style.getPropertyValue('--bpgraph-toolbar-inset')
  // The node panel starts open by default.
  expect(inset()).toBe('328px')
  current.ui.closeNodePanel()
  expect(inset()).toBe('0px')
  current.ui.openDebugPanel()
  expect(inset()).toBe('348px')
  current.ui.openNodePanel()
  expect(inset()).toBe('676px')
  current.ui.closeDebugPanel()
  expect(inset()).toBe('328px')
})

test('compact canvases dock one panel below the toolbar and collapse back', () => {
  let resize: (() => void) | null = null
  vi.stubGlobal('ResizeObserver', class {
    constructor(callback: () => void) {
      resize = callback
    }
    observe() {}
    disconnect() {}
  })
  current = createHarness({ debugPanel: true }, 700)
  const container = current.container
  const node = container.querySelector<HTMLElement>('.bpgraph-node-panel')!
  expect(container.getAttribute('data-bpgraph-compact')).toBe('true')
  expect(node.classList.contains('is-compact')).toBe(true)
  expect(node.style.left).toBe('8px')
  expect(node.style.right).toBe('8px')
  expect(node.style.width).toBe('auto')
  expect(node.style.maxWidth).toBe('none')
  expect(container.querySelector<HTMLElement>('.bpgraph-toolbar-layer')!
    .style.getPropertyValue('--bpgraph-toolbar-inset')).toBe('0px')

  // The compact sheets are mutually exclusive.
  current.ui.openDebugPanel()
  expect(container.querySelector('.bpgraph-node-panel')).toBeNull()
  const debug = container.querySelector<HTMLElement>('.bpgraph-debug-panel')!
  expect(debug.classList.contains('is-compact')).toBe(true)
  expect(debug.style.width).toBe('auto')
  expect(debug.style.left).toBe('8px')
  current.ui.openNodePanel()
  expect(container.querySelector('.bpgraph-debug-panel')).toBeNull()
  expect(container.querySelector('.bpgraph-node-panel')?.classList.contains('is-compact')).toBe(true)

  current.setLayoutWidth(900)
  resize?.()
  expect(container.hasAttribute('data-bpgraph-compact')).toBe(false)
  expect(container.querySelector('.bpgraph-node-panel')?.classList.contains('is-compact')).toBe(false)
  expect(container.querySelector<HTMLElement>('.bpgraph-toolbar-layer')!
    .style.getPropertyValue('--bpgraph-toolbar-inset')).toBe('328px')

  // Both panels coexist while wide; shrinking into compact mode closes the secondary debug sheet.
  current.ui.openDebugPanel()
  expect(container.querySelector('.bpgraph-debug-panel')).not.toBeNull()
  expect(container.querySelector<HTMLElement>('.bpgraph-toolbar-layer')!
    .style.getPropertyValue('--bpgraph-toolbar-inset')).toBe('676px')
  current.setLayoutWidth(700)
  resize?.()
  expect(container.getAttribute('data-bpgraph-compact')).toBe('true')
  expect(container.querySelector('.bpgraph-debug-panel')).toBeNull()
  expect(container.querySelector('.bpgraph-node-panel')?.classList.contains('is-compact')).toBe(true)
})

test('Esc closing debug panels preserves subgraph location; empty data shows placeholders', () => {
  current = createHarness({ debugPanel: {} })
  current.graph.model.subgraphStack.push({ id: 'child' })
  current.ui.openDebugPanel()
  const panel = current.container.querySelector('.bpgraph-debug-panel')!
  expect(panel.textContent).toContain('No execution records')
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
    logs: [{ time: 1000, message: 'First log' }],
  }
  current = createHarness({ debugPanel: { data: () => data } })
  current.ui.openDebugPanel()
  expect(current.container.querySelector('.bpgraph-debug-panel')?.textContent).toContain('First execution')

  data = {
    records: [{ id: 'task-2', title: '<img src=x onerror=alert(1)>', status: 'failed' as const, startedAt: 2000 }],
    logs: [{ time: 2000, level: 'error' as const, message: '<img src=x onerror=alert(1)>' }],
  }
  current.ui.refreshDebugPanel()
  const panel = current.container.querySelector<HTMLElement>('.bpgraph-debug-panel')!
  expect(panel.textContent).toContain('<img src=x onerror=alert(1)>')
  expect(panel.querySelector('img')).toBeNull()
  expect(panel.querySelector('b')).toBeNull()
  expect(panel.querySelector('.bpgraph-debug-record')?.classList.contains('is-failed')).toBe(true)

  current.graph.options.debugPanel = undefined
  current.ui.refreshDebugPanel()
  expect(current.container.querySelector('.bpgraph-debug-panel')).toBeNull()
  expect(current.container.querySelector('[aria-label="Show debug panel"]')).toBeNull()
})

test('panel toggles render only for enabled panels and disappear with the toolbar', () => {
  current = createHarness({ debugPanel: true })
  expect(current.container.querySelector('.bpgraph-toolbar')).toBeTruthy()
  expect(debugToggle()).toBeTruthy()
  expect(current.container.querySelector('[data-action="node-panel"]')).toBeTruthy()
  current.ui.destroy()
  current = null

  current = createHarness({ debugPanel: true, toolbar: false })
  expect(current.container.querySelector('.bpgraph-toolbar')).toBeNull()
  expect(current.container.querySelector('[aria-label="Show debug panel"]')).toBeNull()
  expect(current.container.querySelector('[data-action="node-panel"]')).toBeNull()
  current.ui.destroy()
  current = null

  current = createHarness({ debugPanel: false })
  // The node panel keeps the default-enabled toolbar alive; only the debug toggle disappears.
  expect(current.container.querySelector('.bpgraph-toolbar')).toBeTruthy()
  expect(current.container.querySelector('[aria-label="Show debug panel"]')).toBeNull()
  expect(current.container.querySelector('[data-action="node-panel"]')).toBeTruthy()
  current.ui.openDebugPanel()
  expect(current.ui.isDebugPanelOpen()).toBe(false)
  expect(current.container.querySelector('.bpgraph-debug-panel')).toBeNull()
  current.ui.destroy()
  current = null

  current = createHarness({ debugPanel: false, nodePanel: false })
  expect(current.container.querySelector('.bpgraph-toolbar')).toBeNull()
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
      data: () => ({ records, logs: [] }),
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
  current = createHarness({ debugPanel: { data: () => ({ records: [], logs: [] }) } })
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

test('Esc exits replay and selecting nodes keeps the overview', () => {
  current = createHarness()
  const node = createNodeStub()
  current.adapter.findNode.mockReturnValue(node)
  current.graph.isReplayMode.mockReturnValue(true)
  current.emitGraph('selection:changed', [node])
  expect(current.container.querySelector('.bpgraph-node-panel-title')?.textContent).toBe('Graph overview')

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
  expect(current.container.querySelector('.bpgraph-debug-log-type')?.textContent).toBe('错误')
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

test('hovering a port shows its label and type; leaving the canvas hides the card', () => {
  current = createHarness()
  const port = document.createElementNS('http://www.w3.org/2000/svg', 'g')
  port.setAttribute('class', 'bpgraph-port')
  const body = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
  body.setAttribute('class', 'bpgraph-port-body')
  body.setAttribute('data-port-name', 'duration')
  body.setAttribute('data-port-label', 'Milliseconds')
  body.setAttribute('data-port-type', 'number')
  body.setAttribute('data-port-direction', 'in')
  body.getBoundingClientRect = () => new DOMRect(120, 80, 12, 12)
  port.appendChild(body)
  current.container.appendChild(port)

  vi.useFakeTimers()
  body.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
  expect(current.container.querySelector('.bpgraph-port-tooltip')).toBeNull()
  vi.advanceTimersByTime(500)
  const card = current.container.querySelector<HTMLElement>('.bpgraph-port-tooltip')!
  expect(card.getAttribute('role')).toBe('tooltip')
  expect(card.querySelector('.bpgraph-port-tooltip-name')?.textContent).toBe('Milliseconds')
  expect(card.querySelector('.bpgraph-port-tooltip-type')?.textContent).toBe('number')
  expect(body.getAttribute('aria-describedby')).toBe(card.id)

  body.dispatchEvent(new MouseEvent('mouseout', { bubbles: true }))
  expect(current.container.querySelector('.bpgraph-port-tooltip')).toBeNull()
})

test('pressing on the canvas hides the port tooltip before a drag starts', () => {
  current = createHarness()
  const body = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
  body.setAttribute('class', 'bpgraph-port-body')
  body.setAttribute('data-port-name', 'duration')
  body.setAttribute('data-port-type', 'number')
  current.container.appendChild(body)

  vi.useFakeTimers()
  body.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
  vi.advanceTimersByTime(500)
  expect(current.container.querySelector('.bpgraph-port-tooltip')).toBeTruthy()
  current.container.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }))
  expect(current.container.querySelector('.bpgraph-port-tooltip')).toBeNull()
})
