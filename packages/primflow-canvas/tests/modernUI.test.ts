// @vitest-environment jsdom
import './svg-shim'
import { afterEach, expect, test, vi } from 'vitest'
import { html } from 'lit-html'
import { dia } from '@joint/core'
import { DataTypeRegistry, defineNode } from '@lyx-pj/primflow-model'
import { Graph, type GraphOptions, type NodeInstanceType } from '../src/Graph'
import { UndoManager } from '../src/UndoManager'
import type { GraphAdapter } from '../src/adapters/GraphAdapter'
import { CanvasUI } from '../src/ui/CanvasUI'
import { EditorRegistry } from '../src/ui/editors'

const TextNode = defineNode({
  definition: {
    type: 'TextNode',
    title: 'Text Node',
    inputs: [
      { id: 'in-exec', name: 'exec', type: 'exec' },
      { id: 'in-text', name: 'text', label: 'Prompt', type: 'string', default: 'Hello' },
      { id: 'in-flag', name: 'enabled', label: 'Enabled', type: 'boolean', default: true },
    ] as const,
    outputs: [
      { id: 'out-exec', name: 'next', type: 'exec' },
      { id: 'out-text', name: 'text', label: 'Text', type: 'string' },
    ] as const,
  },
})

const SinkNode = defineNode({
  definition: {
    type: 'SinkNode',
    title: 'Sink Node',
    inputs: [
      { id: 'in-exec', name: 'exec', type: 'exec' },
      { id: 'in-val', name: 'val', label: 'Value', type: 'string' },
    ] as const,
    outputs: [] as const,
  },
})

type Handler = (...args: unknown[]) => void

function createModernHarness(graphOptions: Partial<GraphOptions> = {}) {
  const container = document.createElement('div')
  Object.defineProperty(container, 'clientWidth', { configurable: true, get: () => 1200 })
  document.body.appendChild(container)

  const paperHandlers = new Map<string, Set<Handler>>()
  const graphHandlers = new Map<string, Set<Handler>>()
  const nodes: NodeInstanceType[] = []
  const nodeViews = new Map<string, { el: HTMLElement }>()

  const makeNode = (id: string, title = 'Text Node'): NodeInstanceType => {
    const inputValues: Record<string, unknown> = { text: 'Hello', enabled: true }
    let breakpoint = false
    const node = {
      id,
      type: 'TextNode',
      nodeType: 'TextNode',
      definitionId: 'TextNode',
      title,
      position: { x: 100, y: 100 },
      definition: TextNode.definition,
      inputs: TextNode.definition.inputs.map((p) => ({ ...p })),
      outputs: TextNode.definition.outputs.map((p) => ({ ...p })),
      get inputValues() {
        return inputValues
      },
      set inputValues(patch: Record<string, unknown>) {
        Object.assign(inputValues, patch)
        graph.emit('node:changed', node, 'inputValues')
      },
      get breakpoint() {
        return breakpoint
      },
      set breakpoint(val: boolean) {
        breakpoint = val
        graph.emit('node:changed', node, 'breakpoint')
      },
    } as unknown as NodeInstanceType
    const el = document.createElement('div')
    container.appendChild(el)
    nodeViews.set(id, { el })
    nodes.push(node)
    return node
  }

  const graph = {
    options: { ...graphOptions } as GraphOptions,
    scale: 1,
    position: { x: 0, y: 0 },
    zoom: vi.fn((scale: number) => {
      graph.scale = scale
      paperHandlers.get('scale')?.forEach((h) => h(scale, scale))
    }),
    nodeRegistry: {
      dataTypes: new DataTypeRegistry(),
      getNodeClasses: vi.fn(() => [TextNode, SinkNode]),
    },
    editors: new EditorRegistry(),
    model: { subgraphStack: [{ id: 'root' }], isLoopBody: () => false, hasSubgraph: vi.fn(() => false) },
    selection: new Set<NodeInstanceType>(),
    skipsUndoManager: false,
    undoManager: null! as UndoManager,
    clientToGraphPoint: (x: number, y: number) => ({ x, y }),
    startTransaction: vi.fn(),
    commitTransaction: vi.fn(),
    addNode: vi.fn((nodeClass: typeof TextNode) => makeNode(`node-${nodes.length + 1}`, nodeClass.definition.title)),
    createNodeInstance: vi.fn((nodeClass: typeof TextNode) => ({
      id: `cand-${Math.random().toString(36).slice(2)}`,
      type: nodeClass.type,
      inputs: nodeClass.definition.inputs.map((p) => ({ ...p })),
      outputs: nodeClass.definition.outputs.map((p) => ({ ...p })),
      position: { x: 0, y: 0 },
    })),
    createLinkInstance: vi.fn((ends: unknown) => ends),
    addLink: vi.fn(),
    validateConnection: vi.fn(() => true),
    removeNodes: vi.fn(),
    removeSwitchCase: vi.fn(() => true),
    on: (event: string, handler: Handler) => {
      if (!graphHandlers.has(event)) graphHandlers.set(event, new Set())
      graphHandlers.get(event)!.add(handler)
    },
    off: (event: string, handler: Handler) => {
      graphHandlers.get(event)?.delete(handler)
    },
    emit: (event: string, ...args: unknown[]) => {
      graphHandlers.get(event)?.forEach((h) => h(...args))
    },
    clearSelection: vi.fn(() => {
      graph.selection.clear()
      graph.emit('selection:changed', [])
    }),
    select: vi.fn((node: NodeInstanceType) => {
      graph.selection.add(node)
    }),
    copySelection: vi.fn(),
    pasteClipboard: vi.fn(),
    deleteSelection: vi.fn(),
    canGoBack: Graph.prototype.canGoBack,
    goBack: Graph.prototype.goBack,
    canDeleteSelection: vi.fn(() => true),
    getNodes: () => nodes,
    getLinks: () => [],
    getNodeExecutionStatus: vi.fn(() => 'idle'),
    getNodeExecutionData: vi.fn(),
    getNodeProgress: vi.fn(),
    findNode: vi.fn((id: string) => nodes.find((n) => n.id === id)),
    findNodeAnywhere: vi.fn((id: string) => nodes.find((n) => n.id === id)),
    isReplayMode: vi.fn(() => false),
    replayLabel: '',
    exitReplay: vi.fn(),
    executionStatus: 'idle',
    pausedNodeId: null as string | null,
  }

  const adapter = {
    selection: graph.selection,
    findNode: (id: string) => nodes.find((n) => n.id === id),
    findLink: vi.fn(),
    selectionChanged: vi.fn(() => graph.emit('selection:changed', [...graph.selection])),
    clearSelection: vi.fn(() => graph.selection.clear()),
    select: vi.fn((item: NodeInstanceType) => graph.selection.add(item)),
    refreshLinkEndpointTools: vi.fn(),
    cancelSelection: vi.fn(),
    getNodeSize: () => ({ width: 200, height: 100 }),
    createPendingLink: vi.fn(() => 'pending-link-1'),
    promotePendingLink: vi.fn(() => ({ id: 'promoted-1' })),
    discardPendingLink: vi.fn(),
  }

  const jointModel = new dia.Graph()
  const paper = {
    el: container,
    model: jointModel,
    options: { interactive: true },
    scale: () => ({ sx: graph.scale, sy: graph.scale }),
    translate: () => ({ tx: graph.position.x, ty: graph.position.y }),
    clientToLocalPoint: (x: number, y: number) => ({ x, y }),
    findViewByModel: (id: string) => nodeViews.get(id),
    on: (event: string, handler: Handler) => {
      if (!paperHandlers.has(event)) paperHandlers.set(event, new Set())
      paperHandlers.get(event)!.add(handler)
    },
    off: (event: string, handler: Handler) => {
      paperHandlers.get(event)?.delete(handler)
    },
  }

  graph.undoManager = new UndoManager(graph as unknown as Graph)
  const ui = new CanvasUI(
    graph as unknown as Graph,
    adapter as unknown as GraphAdapter,
    paper as unknown as dia.Paper
  )

  return { container, graph, adapter, paper, ui, makeNode }
}

let active: ReturnType<typeof createModernHarness> | undefined

afterEach(() => {
  active?.ui.destroy()
  active = undefined
  document.body.innerHTML = ''
})

test('built-in Lit Web Component primitives are registered and theme token attribute updates cleanly', () => {
  active = createModernHarness({ theme: 'light' })
  for (const tag of ['pf-surface', 'pf-button', 'pf-tooltip', 'pf-switch', 'pf-badge', 'pf-divider', 'pf-field']) {
    expect(customElements.get(tag)).toBeTruthy()
  }
  expect(active.container.getAttribute('data-pf-theme')).toBe('light')
  active.graph.options.theme = 'dark'
  active.ui.refreshTheme()
  expect(active.container.getAttribute('data-pf-theme')).toBe('dark')
})

test('every built-in UI control can be disabled or replaced via lit-html renderer or framework-agnostic mount handle', () => {
  const mountedZoom = vi.fn()
  const updatedZoom = vi.fn()
  const destroyedZoom = vi.fn()

  active = createModernHarness({
    toolbar: { actions: [{ id: 'run', label: 'Run' }] },
    ui: {
      minimap: false,
      toolbar: (ctx) => html`<div class="custom-toolbar">${ctx.actions.length} actions</div>`,
      zoomControls: {
        mount(container, ctx) {
          mountedZoom(ctx.percent)
          const btn = document.createElement('button')
          btn.className = 'custom-zoom-in'
          btn.textContent = `${ctx.percent}%`
          btn.addEventListener('click', () => ctx.zoomIn())
          container.appendChild(btn)
          return {
            update(next) {
              updatedZoom(next.percent)
              btn.textContent = `${next.percent}%`
            },
            destroy() {
              destroyedZoom()
              btn.remove()
            },
          }
        },
      },
    },
  })

  expect(active.container.querySelector('.bpgraph-minimap')).toBeNull()
  expect(active.container.querySelector('.custom-toolbar')?.textContent).toContain('actions')
  const customZoomBtn = active.container.querySelector<HTMLButtonElement>('.custom-zoom-in')!
  expect(customZoomBtn.textContent).toBe('100%')
  expect(mountedZoom).toHaveBeenCalledWith(100)

  customZoomBtn.click()
  expect(updatedZoom).toHaveBeenCalledWith(110)
  expect(customZoomBtn.textContent).toBe('110%')

  active.ui.destroy()
  expect(destroyedZoom).toHaveBeenCalledOnce()
  active = undefined
})

test('NodeFloatingBar shows quick actions and side quick-add `+` buttons that open connection palette', () => {
  active = createModernHarness()
  const node = active.makeNode('n1')

  active.graph.selection.add(node)
  active.graph.emit('selection:changed', [node])

  const bar = active.container.querySelector('.pf-node-floating-bar')
  expect(bar).toBeTruthy()
  const inQuickAdd = active.container.querySelector<HTMLButtonElement>('[data-quick-add="in"]')
  const outQuickAdd = active.container.querySelector<HTMLButtonElement>('[data-quick-add="out"]')
  expect(inQuickAdd).toBeTruthy()
  expect(outQuickAdd).toBeTruthy()

  // Toggle breakpoint directly from floating bar.
  const bpBtn = active.container.querySelector<HTMLButtonElement>('[data-floating-action="breakpoint"]')!
  bpBtn.click()
  expect(node.breakpoint).toBe(true)

  // Clicking the right `+` trigger opens the add-and-connect palette with a pending link.
  outQuickAdd!.click()
  expect(active.adapter.createPendingLink).toHaveBeenCalled()
  const palette = active.container.querySelector('.bpgraph-palette')
  expect(palette?.getAttribute('data-mode')).toBe('connect')
})

test('NodeWidgetBar shows ComfyUI-style surrounding input controls on single selection and supports custom mount/render', () => {
  const customMount = vi.fn()
  const customUpdate = vi.fn()
  const customDestroy = vi.fn()

  active = createModernHarness({
    nodeWidgets: {
      placement: 'bottom',
      defaultCollapsed: false,
      render: (ctx) => html`<span class="custom-widget-tag">Tag:${ctx.node.id}</span>`,
      mount(container, ctx) {
        customMount(ctx.node.id)
        const el = document.createElement('div')
        el.className = 'mounted-widget'
        el.textContent = String(ctx.values.text ?? '')
        container.appendChild(el)
        return {
          update(next) {
            customUpdate(next.values.text)
            el.textContent = String(next.values.text ?? '')
          },
          destroy() {
            customDestroy()
            el.remove()
          },
        }
      },
    },
  })

  const node = active.makeNode('n1')
  active.graph.selection.add(node)
  active.graph.emit('selection:changed', [node])

  const tray = active.container.querySelector('.pf-node-widget-bar')
  expect(tray).toBeTruthy()
  expect(tray?.querySelector('.custom-widget-tag')?.textContent).toBe('Tag:n1')
  expect(tray?.querySelector('.mounted-widget')?.textContent).toBe('Hello')
  expect(customMount).toHaveBeenCalledWith('n1')

  // Built-in modern editors render for unconnected editable inputs and write back to node.inputValues.
  const textInput = tray!.querySelector<HTMLInputElement>('[data-widget-field="text"] input')!
  textInput.value = 'Updated prompt'
  textInput.dispatchEvent(new Event('input', { bubbles: true }))
  expect(node.inputValues.text).toBe('Updated prompt')
  expect(customUpdate).toHaveBeenCalledWith('Updated prompt')

  // Collapsing hides the body and tears down custom mount cleanly.
  const toggleBtn = tray!.querySelector<HTMLButtonElement>('.pf-node-widget-toggle')!
  toggleBtn.click()
  expect(active.container.querySelector('.pf-node-widget-body')).toBeNull()
  expect(customDestroy).toHaveBeenCalledOnce()
})

test('zoomControls and canvas container receive right-panel inset so bottom controls never overlap side drawers', () => {
  active = createModernHarness({
    nodePanel: { open: true, width: 320 },
  })
  const zoomLayer = active.container.querySelector<HTMLElement>('.bpgraph-zoom-layer')!
  expect(zoomLayer.style.getPropertyValue('--bpgraph-zoom-inset')).toBe('328px')
  expect(active.container.style.getPropertyValue('--bpgraph-right-inset')).toBe('328px')

  active.ui.closeNodePanel()
  expect(zoomLayer.style.getPropertyValue('--bpgraph-zoom-inset')).toBe('0px')
  expect(active.container.style.getPropertyValue('--bpgraph-right-inset')).toBe('0px')
})

test('NodeFloatingBar keeps handles alive in proximity corridor and magnetically pulls quick-add toward nearby pointer', () => {
  vi.useFakeTimers()
  try {
    active = createModernHarness()
    const node = active.makeNode('n1')
    const anchor = active.paper.findViewByModel(node.id)!.el
    anchor.getBoundingClientRect = () =>
      ({
        left: 200,
        top: 200,
        right: 400,
        bottom: 300,
        width: 200,
        height: 100,
        x: 200,
        y: 200,
        toJSON: () => ({}),
      }) as DOMRect

    active.graph.emit('node:mouseenter', node)
    vi.advanceTimersByTime(200)
    const outWrap = active.container.querySelector<HTMLElement>('.pf-node-quick-add.is-out')!
    expect(outWrap).toBeTruthy()

    // Moving into the right proximity corridor outside the node keeps controls open and pulls `+` toward cursor.
    active.graph.emit('node:mouseleave', node)
    window.dispatchEvent(new MouseEvent('pointermove', { clientX: 432, clientY: 264, bubbles: true }))
    vi.advanceTimersByTime(400)
    expect(active.container.querySelector('.pf-node-quick-add.is-out')).toBeTruthy()
    expect(outWrap.classList.contains('is-magnetic')).toBe(true)
    expect(outWrap.style.transform).toContain('translate3d(')

    // Moving far away releases magnetic lock and hides the hover-only floating bar cleanly.
    window.dispatchEvent(new MouseEvent('pointermove', { clientX: 700, clientY: 500, bubbles: true }))
    expect(outWrap.classList.contains('is-magnetic')).toBe(false)
    vi.advanceTimersByTime(300)
    expect(active.container.querySelector('.pf-node-floating-bar')).toBeNull()
  } finally {
    vi.useRealTimers()
  }
})

test('NodeWidgetBar remembers open state across node selection changes and deselection', () => {
  active = createModernHarness({ nodeWidgets: {} })
  const n1 = active.makeNode('n1')
  const n2 = active.makeNode('n2')

  // Closed initially when defaultCollapsed is not explicitly false.
  active.graph.selection.add(n1)
  active.graph.emit('selection:changed', [n1])
  expect(active.container.querySelector('.pf-node-widget-bar')).toBeNull()

  // User opens Quick inputs on n1 from the floating bar.
  active.container.querySelector<HTMLButtonElement>('[data-floating-action="widgets"]')!.click()
  expect(active.container.querySelector('.pf-node-widget-bar')?.getAttribute('data-node-id')).toBe('n1')

  // Switching to n2 keeps Quick inputs open automatically and marks the floating button active.
  active.graph.selection.clear()
  active.graph.selection.add(n2)
  active.graph.emit('selection:changed', [n2])
  expect(active.container.querySelector('.pf-node-widget-bar')?.getAttribute('data-node-id')).toBe('n2')
  expect(active.container.querySelector('[data-floating-action="widgets"]')?.getAttribute('aria-pressed')).toBe('true')

  // Deselecting hides the tray while preserving the open preference for the next selection.
  active.graph.selection.clear()
  active.graph.emit('selection:changed', [])
  expect(active.container.querySelector('.pf-node-widget-bar')).toBeNull()

  active.graph.selection.add(n1)
  active.graph.emit('selection:changed', [n1])
  expect(active.container.querySelector('.pf-node-widget-bar')?.getAttribute('data-node-id')).toBe('n1')

  // Explicitly closing remembers the closed state across subsequent selections.
  active.container.querySelector<HTMLButtonElement>('[data-floating-action="widgets"]')!.click()
  expect(active.container.querySelector('.pf-node-widget-bar')).toBeNull()

  active.graph.selection.clear()
  active.graph.selection.add(n2)
  active.graph.emit('selection:changed', [n2])
  expect(active.container.querySelector('.pf-node-widget-bar')).toBeNull()
})

test('PfSwitch hides slotted native checkboxes even against host input opacity resets', () => {
  active = createModernHarness()
  const sw = document.createElement('pf-switch') as HTMLElement & { constructor: { styles: unknown[] } }
  const cssText = sw.constructor.styles.map(String).join('\n')
  expect(cssText).toContain('opacity: 0 !important')
  expect(cssText).toContain('appearance: none !important')
})

test('NodePanel supports framework-agnostic mount protocol for sections, overview, globalSettings, and panel editors', () => {
  const sectionMount = vi.fn()
  const sectionUpdate = vi.fn()
  const sectionDestroy = vi.fn()
  const globalMount = vi.fn()
  const globalDestroy = vi.fn()
  const editorMount = vi.fn()
  const editorUpdate = vi.fn()
  const editorDestroy = vi.fn()

  active = createModernHarness({
    nodePanel: {
      open: true,
      sections: () => [
        {
          id: 'custom-sec',
          mount(container, ctx) {
            sectionMount(ctx.node.id)
            const el = document.createElement('div')
            el.className = 'mounted-section'
            el.textContent = `sec:${ctx.node.id}`
            container.appendChild(el)
            return {
              update(next) {
                sectionUpdate(next.node.id)
                el.textContent = `sec:${next.node.id}`
              },
              destroy() {
                sectionDestroy()
                el.remove()
              },
            }
          },
        },
        'inputs',
      ],
      globalSettings: {
        mount(container) {
          globalMount()
          const el = document.createElement('div')
          el.className = 'mounted-global'
          el.textContent = 'Global mount'
          container.appendChild(el)
          return {
            destroy() {
              globalDestroy()
              el.remove()
            },
          }
        },
      },
    },
  })

  active.graph.editors.register('string', {
    panel: {
      mount(container, ctx) {
        editorMount(ctx.value)
        const el = document.createElement('span')
        el.className = 'mounted-panel-editor'
        el.textContent = String(ctx.value ?? '')
        container.appendChild(el)
        return {
          update(next) {
            editorUpdate(next.value)
            el.textContent = String(next.value ?? '')
          },
          destroy() {
            editorDestroy()
            el.remove()
          },
        }
      },
    },
  })

  const n1 = active.makeNode('n1')
  active.graph.selection.add(n1)
  active.graph.emit('selection:changed', [n1])

  expect(active.container.querySelector('.mounted-section')?.textContent).toBe('sec:n1')
  expect(active.container.querySelector('.mounted-panel-editor')?.textContent).toBe('Hello')
  expect(sectionMount).toHaveBeenCalledWith('n1')
  expect(editorMount).toHaveBeenCalledWith('Hello')

  // Updating input value calls handle.update without remounting.
  n1.inputValues = { text: 'World' }
  expect(editorUpdate).toHaveBeenCalledWith('World')
  expect(active.container.querySelector('.mounted-panel-editor')?.textContent).toBe('World')
  expect(editorMount).toHaveBeenCalledOnce()

  // Switching to Global settings tab mounts globalSettings and destroys node-tab mounts.
  active.container.querySelector<HTMLButtonElement>('[data-tab="global"]')!.click()
  expect(active.container.querySelector('.mounted-global')?.textContent).toBe('Global mount')
  expect(globalMount).toHaveBeenCalledOnce()
  expect(sectionDestroy).toHaveBeenCalledOnce()
  expect(editorDestroy).toHaveBeenCalledOnce()

  // Closing the panel destroys globalSettings mount cleanly.
  active.ui.closeNodePanel()
  expect(globalDestroy).toHaveBeenCalledOnce()
})
