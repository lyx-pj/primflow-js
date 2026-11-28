// @vitest-environment jsdom
//
// Editor registry tests cover how an application replaces the control of a port
// on the canvas and in the node panel. The registry is independent from the
// data type registry: an editor decides how a value is edited, not whether a
// port may connect.
import './svg-shim'
import { afterEach, expect, test } from 'vitest'
import { html } from 'lit-html'
import { dia } from '@joint/core'
import { defineDataType, schema } from '@lyx-pj/primflow-model'
import { EditorRegistry } from '../src/ui/editors'
import { NodeOverlayHost } from '../src/ui/nodeOverlay'

const Image = defineDataType({
  id: 'media.image@1',
  schema: schema.object({ assetId: schema.string(), mediaType: schema.enum(['image/png', 'image/jpeg']) }),
})

afterEach(() => {
  document.body.innerHTML = ''
})

// jsdom has no 2d canvas context; stub the text measurement used for port widths.
;(globalThis as unknown as { HTMLCanvasElement: { prototype: { getContext: unknown } } }).HTMLCanvasElement.prototype.getContext =
  () => ({ font: '', measureText: () => ({ width: 6 }) })

test('registry keeps port and panel editors separate for one data type', () => {
  const registry = new EditorRegistry()
  registry.register('media.image@1', {
    port: { render: () => html`<button class="pick">Pick</button>` },
    panel: { render: () => html`<div class="full">Full picker</div>` },
  })

  expect(registry.has('media.image@1', 'port')).toBe(true)
  expect(registry.has('media.image@1', 'panel')).toBe(true)
  expect(registry.has('media.image@1', 'port')).toBe(true)
  expect(registry.has('unknown@1', 'port')).toBe(false)
  expect(registry.getRegisteredTypes()).toEqual(['media.image@1'])
})

test('registering the same type again merges scopes instead of replacing them', () => {
  const registry = new EditorRegistry()
  registry.register('media.image@1', { port: { render: () => html`<button>Pick</button>` } })
  registry.register('media.image@1', { panel: { render: () => html`<div>Full</div>` } })

  expect(registry.has('media.image@1', 'port')).toBe(true)
  expect(registry.has('media.image@1', 'panel')).toBe(true)
})

test('unregister removes every editor for a data type', () => {
  const registry = new EditorRegistry()
  registry.register('media.image@1', {
    port: { render: () => html`<button>Pick</button>` },
    panel: { render: () => html`<div>Full</div>` },
  })
  expect(registry.unregister('media.image@1')).toBe(true)
  expect(registry.unregister('media.image@1')).toBe(false)
  expect(registry.has('media.image@1', 'port')).toBe(false)
  expect(registry.has('media.image@1', 'panel')).toBe(false)
})

test('an empty data type id is rejected', () => {
  const registry = new EditorRegistry()
  expect(() => registry.register('', { port: { render: () => html`` } })).toThrow(/must not be empty/)
})

test('a registered editor declares the width of its control', () => {
  const registry = new EditorRegistry()
  registry.register('media.image@1', { port: { render: () => html``, width: 120 } })
  expect(registry.get('media.image@1', 'port')?.width).toBe(120)
  expect(registry.get('media.image@1', 'panel')).toBeUndefined()
})

test('the overlay host renders above the anchor and closes on outside clicks', () => {
  const paper = document.createElement('div')
  paper.style.position = 'relative'
  document.body.appendChild(paper)
  const anchor = document.createElement('button')
  anchor.textContent = 'Pick'
  paper.appendChild(anchor)
  // The anchor reports a fixed box so the placement is deterministic.
  anchor.getBoundingClientRect = () => ({
    top: 100, bottom: 120, left: 50, right: 90, width: 40, height: 20, x: 50, y: 100,
    toJSON: () => ({}),
  }) as DOMRect

  const host = new NodeOverlayHost(paper)
  const close = host.open({
    anchor,
    render: () => html`<div class="preview">Preview</div>`,
    placement: 'above',
  })

  const overlay = paper.querySelector('.bpgraph-node-overlay')
  expect(overlay).toBeTruthy()
  expect(overlay?.querySelector('.preview')?.textContent).toBe('Preview')
  // Placed above the anchor: the overlay bottom sits at the anchor top.
  expect(Number.parseFloat(overlay!.style.top)).toBeLessThan(100)

  document.body.click()
  expect(paper.querySelector('.bpgraph-node-overlay .preview')).toBeNull()

  close()
  host.destroy()
})

test('the overlay host flips below the anchor when there is no room above', () => {
  const paper = document.createElement('div')
  paper.style.position = 'relative'
  document.body.appendChild(paper)
  const anchor = document.createElement('button')
  paper.appendChild(anchor)
  anchor.getBoundingClientRect = () => ({
    top: 0, bottom: 20, left: 0, right: 40, width: 40, height: 20, x: 0, y: 0,
    toJSON: () => ({}),
  }) as DOMRect

  const host = new NodeOverlayHost(paper)
  host.open({ anchor, render: () => html`<div class="preview">Preview</div>`, placement: 'above' })

  const overlay = paper.querySelector('.bpgraph-node-overlay')
  expect(Number.parseFloat(overlay!.style.top)).toBeGreaterThanOrEqual(0)
  host.destroy()
})

test('the overlay host stops pointer events from reaching the canvas', () => {
  const paper = document.createElement('div')
  document.body.appendChild(paper)
  const anchor = document.createElement('button')
  paper.appendChild(anchor)

  const host = new NodeOverlayHost(paper)
  host.open({ anchor, render: () => html`<div class="preview">Preview</div>` })

  const overlayHost = paper.querySelector('.bpgraph-node-overlay-host')!
  const seen: string[] = []
  paper.addEventListener('mousedown', () => seen.push('paper'))
  overlayHost.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
  expect(seen).toEqual([])
  host.destroy()
})

test('a custom port editor renders inside the port mount point', async () => {
  const graph = new dia.Graph()
  const model = new dia.Element({
    type: 'test.Node',
    inputs: [{ id: 'in-asset', name: 'asset', type: 'media.image@1' }],
    values: {},
  })
  const registry = new EditorRegistry()
  registry.register('media.image@1', { port: { render: () => html`<button class="pick">Pick</button>` } })
  model.set('editors', registry)
  graph.addCell(model)
  const editor = document.createElement('div')
  document.body.appendChild(editor)

  const { BlueprintNodeView } = await import('../src/adapters/joint/nodes/BlueprintNodeView')
  const view = new BlueprintNodeView({ model })
  view.findPortNode = () => editor
  view.confirmUpdate(view.getFlag(dia.ElementView.Flags.PORTS))

  expect(editor.querySelector('.pick')).toBeTruthy()
  view.remove()
})

test('refreshing a value re-renders a registered custom port editor', async () => {
  const graph = new dia.Graph()
  const model = new dia.Element({
    type: 'test.Node',
    inputs: [{ id: 'in-asset', name: 'asset', type: 'media.image@1' }],
    values: {},
  })
  const registry = new EditorRegistry()
  registry.register('media.image@1', {
    port: { render: ({ value }) => html`<button class="pick">${value ? 'chosen' : 'pick'}</button>` },
  })
  model.set('editors', registry)
  graph.addCell(model)
  const editor = document.createElement('div')
  document.body.appendChild(editor)

  const { BlueprintNodeView } = await import('../src/adapters/joint/nodes/BlueprintNodeView')
  const view = new BlueprintNodeView({ model })
  view.findPortNode = () => editor
  view.confirmUpdate(view.getFlag(dia.ElementView.Flags.PORTS))
  expect(editor.querySelector('.pick')?.textContent).toBe('pick')

  model.set('values', { asset: { assetId: 'a1', mediaType: 'image/png' } })
  view.refreshDomValue('asset')

  expect(editor.querySelector('.pick')?.textContent).toBe('chosen')
  view.remove()
})

test('a data type without a registered editor keeps the built-in control', async () => {
  const graph = new dia.Graph()
  const model = new dia.Element({
    type: 'test.Node',
    inputs: [{ id: 'in-text', name: 'text', type: 'string' }],
    values: { text: 'hello' },
  })
  const registry = new EditorRegistry()
  registry.register('media.image@1', { port: { render: () => html`<button class="pick">Pick</button>` } })
  model.set('editors', registry)
  graph.addCell(model)
  const editor = document.createElement('div')
  document.body.appendChild(editor)

  const { BlueprintNodeView } = await import('../src/adapters/joint/nodes/BlueprintNodeView')
  const view = new BlueprintNodeView({ model })
  view.findPortNode = () => editor
  view.confirmUpdate(view.getFlag(dia.ElementView.Flags.PORTS))

  expect(editor.querySelector('.pick')).toBeNull()
  expect(editor.querySelector('input')?.value).toBe('hello')
  view.remove()
})

test('a framework-agnostic mount port editor mounts, updates on value refresh, and destroys on view removal', async () => {
  const graph = new dia.Graph()
  const model = new dia.Element({
    type: 'test.Node',
    inputs: [{ id: 'in-asset', name: 'asset', type: 'media.image@1' }],
    values: { asset: 'initial' },
  })
  let mounted = 0
  let updated = 0
  let destroyed = 0
  const registry = new EditorRegistry()
  registry.register('media.image@1', {
    port: {
      mount(container, ctx) {
        mounted++
        const btn = document.createElement('button')
        btn.className = 'mounted-port'
        btn.textContent = String(ctx.value ?? '')
        container.appendChild(btn)
        return {
          update(next) {
            updated++
            btn.textContent = String(next.value ?? '')
          },
          destroy() {
            destroyed++
            btn.remove()
          },
        }
      },
    },
  })
  model.set('editors', registry)
  graph.addCell(model)
  const editor = document.createElement('div')
  document.body.appendChild(editor)

  const { BlueprintNodeView } = await import('../src/adapters/joint/nodes/BlueprintNodeView')
  const view = new BlueprintNodeView({ model })
  view.findPortNode = () => editor
  view.confirmUpdate(view.getFlag(dia.ElementView.Flags.PORTS))
  expect(mounted).toBe(1)
  expect(editor.querySelector('.mounted-port')?.textContent).toBe('initial')

  model.set('values', { asset: 'next' })
  view.refreshDomValue('asset')
  expect(mounted).toBe(1)
  expect(updated).toBe(1)
  expect(editor.querySelector('.mounted-port')?.textContent).toBe('next')

  view.remove()
  expect(destroyed).toBe(1)
})

test('a port of a custom type gets a mount point only when an editor is registered', async () => {
  const { BlueprintNode } = await import('../src/adapters/joint/nodes/BlueprintNode')
  const registry = new EditorRegistry()
  registry.register('media.image@1', { port: { render: () => html`<button class="pick">Pick</button>`, width: 32 } })

  const withEditor = new BlueprintNode({
    id: 'with-editor',
    inputs: [{ id: 'in-asset', name: 'asset', type: 'media.image@1' }],
    outputs: [],
    editors: registry,
  })
  const withoutEditor = new BlueprintNode({
    id: 'without-editor',
    inputs: [{ id: 'in-asset', name: 'asset', type: 'media.image@1' }],
    outputs: [],
  })

  const mountPoint = (node: InstanceType<typeof BlueprintNode>) => {
    const markup = node.getPorts()[0]?.markup as Array<Record<string, unknown>>
    return markup.some(entry => JSON.stringify(entry).includes('portEditor'))
  }

  expect(mountPoint(withEditor)).toBe(true)
  expect(mountPoint(withoutEditor)).toBe(false)
})

test('a registered editor width is used for the port control', async () => {
  const { BlueprintNode } = await import('../src/adapters/joint/nodes/BlueprintNode')
  const registry = new EditorRegistry()
  registry.register('media.image@1', { port: { render: () => html``, width: 32 } })

  const node = new BlueprintNode({
    id: 'node',
    inputs: [{ id: 'in-asset', name: 'asset', type: 'media.image@1' }],
    outputs: [],
    editors: registry,
  })
  expect(node.portEditorWidth({ id: 'in-asset', name: 'asset', type: 'media.image@1' })).toBe(32)
})

test('a port may declare its own editor width', async () => {
  const { BlueprintNode } = await import('../src/adapters/joint/nodes/BlueprintNode')
  const registry = new EditorRegistry()
  registry.register('media.image@1', { port: { render: () => html``, width: 32 } })

  const node = new BlueprintNode({
    id: 'node',
    inputs: [{ id: 'in-asset', name: 'asset', type: 'media.image@1' }],
    outputs: [],
    editors: registry,
  })
  expect(node.portEditorWidth({ id: 'in-asset', name: 'asset', type: 'media.image@1', editorWidth: 120 })).toBe(120)
})

/**
 * Stub element measurement for the duration of one test.
 *
 * jsdom reports zero sizes, which hides every edge and overflow decision.
 */
function withOverlaySize(size: { width: number; height: number }, run: () => void) {
  const proto = window.HTMLElement.prototype
  const ownWidth = Object.getOwnPropertyDescriptor(proto, 'offsetWidth')
  const ownHeight = Object.getOwnPropertyDescriptor(proto, 'offsetHeight')
  Object.defineProperty(proto, 'offsetWidth', { configurable: true, get: () => size.width })
  Object.defineProperty(proto, 'offsetHeight', { configurable: true, get: () => size.height })
  try {
    run()
  } finally {
    if (ownWidth) Object.defineProperty(proto, 'offsetWidth', ownWidth)
    if (ownHeight) Object.defineProperty(proto, 'offsetHeight', ownHeight)
  }
}

function createPaper(width: number, height: number) {
  const paper = document.createElement('div')
  paper.style.position = 'relative'
  paper.getBoundingClientRect = () => ({
    top: 0, left: 0, right: width, bottom: height, width, height, x: 0, y: 0,
    toJSON: () => ({}),
  }) as DOMRect
  document.body.appendChild(paper)
  return paper
}

function createAnchor(paper: HTMLElement, rect: { top: number; bottom: number; left: number; right: number }) {
  const anchor = document.createElement('button')
  paper.appendChild(anchor)
  anchor.getBoundingClientRect = () => ({
    ...rect, width: rect.right - rect.left, height: rect.bottom - rect.top,
    x: rect.left, y: rect.top, toJSON: () => ({}),
  }) as DOMRect
  return anchor
}

test('several overlays stay open at once and close independently', () => {
  const paper = createPaper(600, 400)
  const first = createAnchor(paper, { top: 100, bottom: 120, left: 100, right: 140 })
  const second = createAnchor(paper, { top: 200, bottom: 220, left: 100, right: 140 })
  const host = new NodeOverlayHost(paper)

  const closeFirst = host.open({ anchor: first, render: () => html`<div class="first">First</div>` })
  const closeSecond = host.open({ anchor: second, render: () => html`<div class="second">Second</div>` })
  expect(paper.querySelectorAll('.bpgraph-node-overlay')).toHaveLength(2)

  closeFirst()
  expect(paper.querySelector('.first')).toBeNull()
  expect(paper.querySelector('.second')).toBeTruthy()

  // Closing the same overlay twice is harmless.
  closeFirst()
  expect(paper.querySelectorAll('.bpgraph-node-overlay')).toHaveLength(1)

  closeSecond()
  expect(paper.querySelectorAll('.bpgraph-node-overlay')).toHaveLength(0)
  host.destroy()
})

test('close() releases every open overlay', () => {
  const paper = createPaper(600, 400)
  const anchor = createAnchor(paper, { top: 100, bottom: 120, left: 100, right: 140 })
  const host = new NodeOverlayHost(paper)
  host.open({ anchor, render: () => html`<div></div>` })
  host.open({ anchor, render: () => html`<div></div>` })
  expect(paper.querySelectorAll('.bpgraph-node-overlay')).toHaveLength(2)

  host.close()
  expect(paper.querySelectorAll('.bpgraph-node-overlay')).toHaveLength(0)
  host.destroy()
})

test('an overlay is clamped inside the paper instead of running off the edge', () => {
  withOverlaySize({ width: 200, height: 120 }, () => {
    // Anchor sits at the bottom-right corner, so no side has room for 200x120.
    const paper = createPaper(400, 300)
    const anchor = createAnchor(paper, { top: 280, bottom: 300, left: 380, right: 400 })
    const host = new NodeOverlayHost(paper)
    host.open({ anchor, render: () => html`<div>Wide</div>`, placement: 'right' })

    const overlay = paper.querySelector<HTMLElement>('.bpgraph-node-overlay')!
    expect(Number.parseFloat(overlay.style.left)).toBeGreaterThanOrEqual(4)
    expect(Number.parseFloat(overlay.style.left)).toBeLessThanOrEqual(400 - 200 - 4)
    expect(Number.parseFloat(overlay.style.top)).toBeGreaterThanOrEqual(4)
    expect(Number.parseFloat(overlay.style.top)).toBeLessThanOrEqual(300 - 120 - 4)
    host.destroy()
  })
})

test('an overlay flips below when the anchor leaves no room above', () => {
  withOverlaySize({ width: 120, height: 100 }, () => {
    const paper = createPaper(400, 300)
    const anchor = createAnchor(paper, { top: 10, bottom: 30, left: 100, right: 140 })
    const host = new NodeOverlayHost(paper)
    host.open({ anchor, render: () => html`<div>Tall</div>`, placement: 'above' })

    const overlay = paper.querySelector<HTMLElement>('.bpgraph-node-overlay')!
    // Placed under the anchor rather than clipped at the top edge.
    expect(Number.parseFloat(overlay.style.top)).toBe(34)
    host.destroy()
  })
})
