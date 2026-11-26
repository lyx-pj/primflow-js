// @vitest-environment jsdom
//
// Node renderer tests cover how an application replaces the built-in node
// content. The JointJS element and its ports stay unchanged, so connections,
// selection, and execution states keep working.
import './svg-shim'
import { expect, test, vi } from 'vitest'
import { html } from 'lit-html'
import { BlueprintNode } from '../src/adapters/joint/nodes/BlueprintNode'
import { NodeRendererRegistry } from '../src/ui/nodeRenderers'

// jsdom has no 2d canvas context; stub the text measurement used for port widths.
;(globalThis as unknown as { HTMLCanvasElement: { prototype: { getContext: unknown } } }).HTMLCanvasElement.prototype.getContext =
  () => ({ font: '', measureText: () => ({ width: 6 }) })

const renderer = () => ({
  render: () => html`<div class="custom-body">Custom</div>`,
  size: { width: 180, height: 120 },
})

function selectors(node: BlueprintNode) {
  return (node.get('markup') as Array<{ selector?: string; groupSelector?: string }>)
    .map((entry) => entry.groupSelector ?? entry.selector)
}

test('registry stores one renderer per node definition', () => {
  const registry = new NodeRendererRegistry()
  registry.register('ImageFile', renderer())

  expect(registry.has('ImageFile')).toBe(true)
  expect(registry.has('Other')).toBe(false)
  expect(registry.get('ImageFile')?.size).toEqual({ width: 180, height: 120 })
  expect(registry.getRegisteredDefinitions()).toEqual(['ImageFile'])
})

test('registering the same definition replaces the previous renderer', () => {
  const registry = new NodeRendererRegistry()
  registry.register('ImageFile', renderer())
  registry.register('ImageFile', { ...renderer(), size: { width: 240, height: 160 } })

  expect(registry.get('ImageFile')?.size).toEqual({ width: 240, height: 160 })
})

test('unregister removes the renderer for a node definition', () => {
  const registry = new NodeRendererRegistry()
  registry.register('ImageFile', renderer())
  expect(registry.unregister('ImageFile')).toBe(true)
  expect(registry.unregister('ImageFile')).toBe(false)
  expect(registry.has('ImageFile')).toBe(false)
})

test('an empty definition id is rejected', () => {
  const registry = new NodeRendererRegistry()
  expect(() => registry.register('', renderer())).toThrow(/must not be empty/)
})

test('a registered renderer replaces the built-in header and body', () => {
  const node = new BlueprintNode({
    id: 'node',
    inputs: [],
    outputs: [],
    nodeRenderer: renderer(),
  })

  const names = selectors(node)
  expect(names).toContain('base-node-custom')
  expect(names).not.toContain('base-node-body')
  expect(names).not.toContain('base-node-title')
  // The transparent selection shape sits behind the custom content.
  expect(names).toContain('base-node-selection')
  expect(names.indexOf('base-node-selection')).toBeLessThan(names.indexOf('base-node-custom'))
  // Execution visuals remain available for replay and running states.
  expect(names).toContain('execution-effects')
})

test('a renderer can keep the built-in header and body', () => {
  const node = new BlueprintNode({
    id: 'node',
    inputs: [],
    outputs: [],
    nodeRenderer: { ...renderer(), header: true, body: true },
  })

  const names = selectors(node)
  expect(names).toContain('base-node-custom')
  expect(names).toContain('base-node-body')
  expect(names).toContain('base-node-title')
  expect(names).toContain('base-node-selection')
})

test('a node without a renderer keeps the built-in layout', () => {
  const node = new BlueprintNode({ id: 'node', inputs: [], outputs: [] })

  const names = selectors(node)
  expect(names).toContain('base-node-body')
  expect(names).toContain('base-node-title')
  expect(names).not.toContain('base-node-custom')
  expect(names).not.toContain('base-node-selection')
})

test('a renderer keeps a transparent shape for the selection highlighter', () => {
  const node = new BlueprintNode({
    id: 'node',
    inputs: [],
    outputs: [],
    nodeRenderer: renderer(),
  })

  const attrs = node.get('attrs') as Record<string, Record<string, unknown>>
  expect(attrs['base-node-selection']).toMatchObject({
    fill: 'transparent',
    stroke: 'transparent',
    pointerEvents: 'none',
  })
})

test('a renderer owns the node size', () => {
  const node = new BlueprintNode({
    id: 'node',
    inputs: [{ id: 'in-value', name: 'value', type: 'string' }],
    outputs: [{ id: 'out-value', name: 'value', type: 'string' }],
    nodeRenderer: renderer(),
  })

  expect(node.size()).toEqual({ width: 180, height: 120 })
})

test('a renderer size survives a title change', () => {
  const node = new BlueprintNode({
    id: 'node',
    inputs: [],
    outputs: [],
    nodeRenderer: renderer(),
  })

  node.title('A very long title that would widen a built-in node considerably')
  expect(node.size()).toEqual({ width: 180, height: 120 })
})

function portArgs(node: BlueprintNode, id: string) {
  return node.getPorts().find((port) => port.id === id)?.args as { x?: number; y?: number }
}

test('a renderer can place ports at explicit node coordinates', () => {
  const node = new BlueprintNode({
    id: 'node',
    inputs: [{ id: 'in-exec', name: 'exec', type: 'exec' }],
    outputs: [{ id: 'out-exec', name: 'exec', type: 'exec' }],
    nodeRenderer: {
      ...renderer(),
      portPosition: ({ group, width }) => ({ x: group === 'in' ? 4 : width - 4, y: 40 }),
    },
  })

  expect(portArgs(node, 'in-exec')).toEqual({ x: 4, y: 40 })
  expect(portArgs(node, 'out-exec')).toEqual({ x: 176, y: 40 })
})

test('a renderer can place each port independently', () => {
  const node = new BlueprintNode({
    id: 'node',
    inputs: [
      { id: 'in-a', name: 'a', type: 'string' },
      { id: 'in-b', name: 'b', type: 'string' },
    ],
    outputs: [],
    nodeRenderer: {
      ...renderer(),
      portPosition: ({ index }) => ({ x: 8, y: 20 + index * 30 }),
    },
  })

  expect(portArgs(node, 'in-a')).toEqual({ x: 8, y: 20 })
  expect(portArgs(node, 'in-b')).toEqual({ x: 8, y: 50 })
})

test('a port that the renderer leaves alone keeps the row layout', () => {
  const node = new BlueprintNode({
    id: 'node',
    inputs: [{ id: 'in-a', name: 'a', type: 'string' }],
    outputs: [{ id: 'out-a', name: 'a', type: 'string' }],
    nodeRenderer: {
      ...renderer(),
      // Only the output side is customised.
      portPosition: ({ group }) => group === 'out' ? { x: 0, y: 0 } : undefined,
    },
  })

  const args = portArgs(node, 'in-a')
  expect(args.x).toBeUndefined()
  // Default rows start below the header and are offset by spacing.
  expect(args.y).toBe(24 + 8 + 10)
  expect(portArgs(node, 'out-a')).toEqual({ x: 0, y: 0 })
})

test('the row layout applies when no port position is registered', () => {
  const node = new BlueprintNode({
    id: 'node',
    inputs: [{ id: 'in-a', name: 'a', type: 'string' }],
    outputs: [],
  })

  expect(portArgs(node, 'in-a').y).toBe(24 + 8 + 10)
})

function portLabelText(node: BlueprintNode, id: string) {
  const port = node.getPorts().find((entry) => entry.id === id)
  return (port?.attrs?.portLabel as { text?: string } | undefined)?.text
}

test('a port can hide its label so a custom layout can draw its own', () => {
  const node = new BlueprintNode({
    id: 'node',
    inputs: [
      { id: 'in-shown', name: 'shown', type: 'string', label: 'Shown' },
      { id: 'in-hidden', name: 'hidden', type: 'string', label: 'Hidden', showLabel: false },
    ],
    outputs: [],
  })

  expect(portLabelText(node, 'in-shown')).toBe('Shown')
  expect(portLabelText(node, 'in-hidden')).toBe('')
})


function portLabelAttrs(node: BlueprintNode, id: string) {
  const port = node.getPorts().find((entry) => entry.id === id)
  return (port?.attrs?.portLabel ?? {}) as { text?: string; x?: number; y?: number }
}

function portFormAttrs(node: BlueprintNode, id: string) {
  const port = node.getPorts().find((entry) => entry.id === id)
  return (port?.attrs?.portForm ?? {}) as { x?: number; y?: number; width?: number }
}

test('a port can offset its label from the default group position', () => {
  const node = new BlueprintNode({
    id: 'node',
    inputs: [
      { id: 'in-default', name: 'a', type: 'string', label: 'A' },
      { id: 'in-moved', name: 'b', type: 'string', label: 'B', labelPosition: { x: 30, y: -6 } },
    ],
    outputs: [],
  })

  // The default keeps the group offsets and adds no per-port x / y.
  expect(portLabelAttrs(node, 'in-default').x).toBeUndefined()
  expect(portLabelAttrs(node, 'in-default').y).toBeUndefined()
  expect(portLabelAttrs(node, 'in-moved')).toMatchObject({ text: 'B', x: 30, y: -6 })
})

test('a renderer can place the inline port control', () => {
  const node = new BlueprintNode({
    id: 'node',
    inputs: [
      { id: 'in-a', name: 'a', type: 'string' },
      { id: 'in-b', name: 'b', type: 'string' },
    ],
    outputs: [],
    nodeRenderer: {
      ...renderer(),
      portEditorPosition: ({ index }) => ({ x: 12, y: 10 + index * 28 }),
    },
  })

  expect(portFormAttrs(node, 'in-a')).toMatchObject({ x: 12, y: 10 })
  expect(portFormAttrs(node, 'in-b')).toMatchObject({ x: 12, y: 38 })
})

test('the inline port control keeps its built-in slot without a renderer', () => {
  const node = new BlueprintNode({
    id: 'node',
    inputs: [{ id: 'in-a', name: 'a', type: 'string', label: 'AA' }],
    outputs: [],
  })

  const form = portFormAttrs(node, 'in-a')
  // 12 (label x) + label width (two characters at 6px) + 4, and half a row up.
  expect(form.x).toBe(12 + 12 + 4)
  expect(form.y).toBe(-10)
})

test('a renderer that declares too small a size reports port overflow once', () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  try {
    const node = new BlueprintNode({
      id: 'too-small',
      inputs: [
        { id: 'in-a', name: 'a', type: 'string' },
        { id: 'in-b', name: 'b', type: 'string' },
      ],
      outputs: [],
      // Rows reach 42px plus half a row, well past 40px.
      nodeRenderer: { render: () => null as never, size: { width: 100, height: 40 } },
    })
    node.buildPortItems()
    node.buildPortItems()

    expect(warn).toHaveBeenCalledTimes(1)
    expect(String(warn.mock.calls[0]?.[0])).toContain('outside its declared height')
  } finally {
    warn.mockRestore()
  }
})

test('a renderer whose size fits its ports reports nothing', () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  try {
    new BlueprintNode({
      id: 'fits',
      inputs: [{ id: 'in-a', name: 'a', type: 'string' }],
      outputs: [],
      nodeRenderer: { render: () => null as never, size: { width: 100, height: 120 } },
    })
    expect(warn).not.toHaveBeenCalled()
  } finally {
    warn.mockRestore()
  }
})

test('ports placed by the renderer are not reported as overflow', () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  try {
    new BlueprintNode({
      id: 'placed',
      inputs: [{ id: 'in-a', name: 'a', type: 'string' }, { id: 'in-b', name: 'b', type: 'string' }],
      outputs: [],
      nodeRenderer: {
        render: () => null as never,
        size: { width: 100, height: 40 },
        portPosition: ({ index }) => ({ y: 10 + index * 10 }),
      },
    })
    expect(warn).not.toHaveBeenCalled()
  } finally {
    warn.mockRestore()
  }
})
