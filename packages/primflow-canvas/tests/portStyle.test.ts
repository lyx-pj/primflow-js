// @vitest-environment jsdom
//
// Port styling tests cover the per-type fill colour and the port radius, which
// let a node distinguish port kinds at a glance.
import './svg-shim'
import { expect, test } from 'vitest'
import { dia } from '@joint/core'
import { NodeRegistry, type NodeStyle } from '@lyx-pj/primflow-model'
import { BlueprintNode } from '../src/adapters/joint/nodes/BlueprintNode'
import { BlueprintNodeView } from '../src/adapters/joint/nodes/BlueprintNodeView'
import { resolveLinkColor } from '../src/utils/portColors'

// jsdom has no 2d canvas context; stub the text measurement used for port widths.
;(globalThis as unknown as { HTMLCanvasElement: { prototype: { getContext: unknown } } }).HTMLCanvasElement.prototype.getContext =
  () => ({ font: '', measureText: () => ({ width: 6 }) })

function portBody(node: BlueprintNode, id: string) {
  const port = node.getPorts().find((entry) => entry.id === id)
  return (port?.attrs?.portBody ?? {}) as {
    fill?: string
    stroke?: string
    strokeOpacity?: number
    r?: number
  }
}

function createNode(style: NodeStyle) {
  return new BlueprintNode({
    id: 'node',
    style,
    inputs: [{ id: 'in-text', name: 'text', type: 'string' }],
    outputs: [{ id: 'out-count', name: 'count', type: 'number' }],
  })
}

function mountView(node: BlueprintNode) {
  const graph = new dia.Graph()
  graph.addCell(node)
  const body = document.createElement('div')
  const view = new BlueprintNodeView({ model: node })
  view.findPortNode = () => body
  return { view, body }
}

test('a port rests as an outline in the direction fill', () => {
  const node = createNode({
    ports: { colors: { string: '#f472b6' }, input: { port: { fill: '#111111' } } },
  })

  // A type colour fills the port only once it is connected, not at rest.
  expect(portBody(node, 'in-text').fill).toBe('#111111')
  // The outline always carries the type colour, dimmed while unconnected.
  expect(portBody(node, 'in-text').stroke).toBe('#f472b6')
  expect(portBody(node, 'in-text').strokeOpacity).toBe(0.5)
})

test('a port without a type colour keeps the direction outline', () => {
  const node = createNode({
    ports: {
      colors: { string: '#f472b6' },
      output: { port: { stroke: '#222222' } },
    },
  })

  expect(portBody(node, 'out-count').stroke).toBe('#222222')
  // Without a type colour the outline is already opaque, as before.
  expect(portBody(node, 'out-count').strokeOpacity).toBe(1)
})

test('a connected port fills with its type colour', () => {
  const node = createNode({
    ports: { colors: { string: '#f472b6' }, input: { port: { fill: '#111111' } } },
  })
  const { view, body } = mountView(node)

  view.highlightPort('in-text')
  expect(body.getAttribute('fill')).toBe('#f472b6')
  // The outline matches the fill, so the port reads as one solid shape.
  expect(body.getAttribute('stroke')).toBe('#f472b6')
  expect(body.getAttribute('stroke-opacity')).toBe('1')
})

test('a connected port falls back to the highlight fill without a type colour', () => {
  const node = createNode({
    ports: {
      colors: { string: '#f472b6' },
      output: { port: { highlightFill: '#abcdef' } },
    },
  })
  const { view, body } = mountView(node)

  view.highlightPort('out-count')
  expect(body.getAttribute('fill')).toBe('#abcdef')
})

test('removing the connection restores the resting fill', () => {
  const node = createNode({
    ports: { colors: { string: '#f472b6' }, input: { port: { fill: '#111111' } } },
  })
  const { view, body } = mountView(node)

  view.highlightPort('in-text')
  view.unhighlightPort('in-text')
  expect(body.getAttribute('fill')).toBe('#111111')
  expect(body.getAttribute('stroke')).toBe('#f472b6')
  // The resting fade comes back with the outline colour.
  expect(body.getAttribute('stroke-opacity')).toBe('0.5')
})

test('a control port can be coloured by type once connected', () => {
  const node = new BlueprintNode({
    id: 'node',
    style: {
      ports: {
        colors: { exec: '#94a3b8' },
        input: { port: { fill: '#111111' } },
      },
    },
    inputs: [{ id: 'in-exec', name: 'exec', type: 'exec' }],
    outputs: [],
  })
  const { view, body } = mountView(node)

  view.highlightPort('in-exec')
  expect(body.getAttribute('fill')).toBe('#94a3b8')
})

test('the default port radius is six', () => {
  const node = createNode({})
  expect(portBody(node, 'in-text').r).toBe(6)
})

test('a port radius is configured per direction', () => {
  const node = createNode({
    ports: {
      input: { port: { r: 4 } },
      output: { port: { r: 3 } },
    },
  })

  expect(portBody(node, 'in-text').r).toBe(4)
  expect(portBody(node, 'out-count').r).toBe(3)
})

test('the built-in subgraph node uses compact ports', () => {
  const definition = new NodeRegistry().getNodeClass('subgraph').definition
  expect(definition.style?.ports?.input?.port).toMatchObject({ r: 4, strokeWidth: 1 })
  expect(definition.style?.ports?.output?.port).toMatchObject({ r: 4, strokeWidth: 1 })
  // The return value label stays available to the panel but is not drawn on the card.
  expect(definition.outputs[1]).toMatchObject({ label: 'Result', showLabel: false })
})

test('a smaller radius also shrinks the control port arrow', () => {
  const build = (r?: number) => new BlueprintNode({
    id: 'node',
    style: { ports: { input: { port: { r } } } },
    inputs: [{ id: 'in-exec', name: 'exec', type: 'exec' }],
    outputs: [],
  })

  const markup = (node: BlueprintNode) => JSON.stringify(node.getPorts()[0]?.markup)
  // The exec port draws an arrow sized from the radius, so the path differs.
  expect(markup(build(6))).not.toBe(markup(build(3)))
})

function portShapeTag(node: BlueprintNode, id: string) {
  const markup = node.getPorts().find((entry) => entry.id === id)?.markup as
    | Array<{ tagName?: string }>
    | undefined
  return markup?.[0]?.tagName
}

test('data ports default to a circle and control ports to an arrow', () => {
  const node = new BlueprintNode({
    id: 'node',
    inputs: [
      { id: 'in-exec', name: 'exec', type: 'exec' },
      { id: 'in-text', name: 'text', type: 'string' },
    ],
    outputs: [],
  })

  expect(portShapeTag(node, 'in-exec')).toBe('path')
  expect(portShapeTag(node, 'in-text')).toBe('circle')
})

test('a configured shape replaces the default per data type', () => {
  const node = createNode({
    ports: { shapes: { string: 'square', number: 'diamond' } },
  })

  expect(portShapeTag(node, 'in-text')).toBe('rect')
  expect(portShapeTag(node, 'out-count')).toBe('path')
})

test('every built-in shape renders a port body', () => {
  const shapes = ['circle', 'square', 'diamond', 'triangle', 'hexagon', 'bars'] as const
  for (const shape of shapes) {
    const node = createNode({ ports: { shapes: { string: shape } } })
    expect(portShapeTag(node, 'in-text')).toBe(shape === 'circle' ? 'circle' : shape === 'square' ? 'rect' : 'path')
  }
})

test('the collection shape draws several bars', () => {
  const node = createNode({ ports: { shapes: { string: 'bars' } } })
  const markup = node.getPorts()[0]?.markup as Array<{ attributes?: Record<string, string> }>
  // Three closed sub-paths, one per bar.
  expect(markup[0]?.attributes?.d?.match(/Z/g)).toHaveLength(3)
})

test('an unknown shape id falls back to a circle', () => {
  const node = createNode({
    // A graph may carry a shape this build does not know.
    ports: { shapes: { string: 'star' as never } },
  })

  expect(portShapeTag(node, 'in-text')).toBe('circle')
})

test('every port body is marked as a data or control port', () => {
  const node = new BlueprintNode({
    id: 'node',
    inputs: [
      { id: 'in-exec', name: 'exec', type: 'exec' },
      { id: 'in-text', name: 'text', type: 'string' },
    ],
    outputs: [],
  })

  const kind = (id: string) => {
    const markup = node.getPorts().find((entry) => entry.id === id)?.markup as
      | Array<{ attributes?: Record<string, string> }>
      | undefined
    return markup?.[0]?.attributes?.['data-port-kind']
  }

  expect(kind('in-exec')).toBe('exec')
  expect(kind('in-text')).toBe('data')
})

test('built-in types ship with a default port colour and shape', () => {
  const style = new NodeRegistry().nodeStyle

  expect(style.ports?.colors).toMatchObject({
    string: '#56B4E9',
    number: '#009E73',
    boolean: '#E69F00',
    any: '#B8C4D6',
  })
  expect(style.ports?.shapes).toMatchObject({
    string: 'circle',
    boolean: 'diamond',
    array: 'bars',
    object: 'square',
    any: 'hexagon',
  })
})

const linkStroke = 'rgba(255, 255, 255, 0.5)'

test('a link takes the colour of the port type it joins', () => {
  const colors = new NodeRegistry().nodeStyle.ports?.colors

  expect(resolveLinkColor(colors, linkStroke, 'string', 'string')).toBe('#56B4E9')
  expect(resolveLinkColor(colors, linkStroke, 'number', 'number')).toBe('#009E73')
})

test('a link joined to any defers to the concrete side', () => {
  const colors = new NodeRegistry().nodeStyle.ports?.colors

  expect(resolveLinkColor(colors, linkStroke, 'any', 'boolean')).toBe('#E69F00')
  expect(resolveLinkColor(colors, linkStroke, 'boolean', 'any')).toBe('#E69F00')
  // Two `any` ports use the generic data colour.
  expect(resolveLinkColor(colors, linkStroke, 'any', 'any')).toBe('#B8C4D6')
})

test('a link between types without a colour uses the link stroke', () => {
  const colors = new NodeRegistry().nodeStyle.ports?.colors

  expect(resolveLinkColor(colors, linkStroke, 'media.image@1', 'media.image@1')).toBe(linkStroke)
})
