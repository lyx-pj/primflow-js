// @vitest-environment jsdom
//
// Port tooltip tests cover the metadata carried by port markup and the overlay
// card that shows the port name and type without a native browser title.
import './svg-shim'
import { afterEach, expect, test, vi } from 'vitest'
import { BlueprintNode } from '../src/adapters/joint/nodes/BlueprintNode'
import { OverlayLayer } from '../src/ui/OverlayLayer'
import { PortTooltip } from '../src/ui/components/PortTooltip'

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg'

// jsdom has no 2d canvas context; stub the text measurement used for port widths.
;(globalThis as unknown as { HTMLCanvasElement: { prototype: { getContext: unknown } } }).HTMLCanvasElement.prototype.getContext =
  () => ({ font: '', measureText: () => ({ width: 6 }) })

afterEach(() => {
  vi.useRealTimers()
  document.body.innerHTML = ''
})

function createNode() {
  return new BlueprintNode({
    id: 'node',
    inputs: [{ id: 'in-duration', name: 'duration', type: 'number', label: 'Milliseconds' }],
    outputs: [{ id: 'out-exec', name: 'exec', type: 'exec' }],
  })
}

function portAttrs(node: BlueprintNode, id: string) {
  const port = node.getPorts().find((entry) => entry.id === id)!
  const body = port.attrs?.portBody as Record<string, unknown>
  const label = port.attrs?.portLabel as Record<string, unknown>
  return { port, body, label }
}

test('port markup carries the tooltip metadata and no native title', () => {
  const node = createNode()
  const input = portAttrs(node, 'in-duration')
  expect(input.body).toMatchObject({
    'data-port-name': 'duration',
    'data-port-label': 'Milliseconds',
    'data-port-type': 'number',
    'data-port-direction': 'in',
    'aria-label': 'Milliseconds (number)',
  })
  // The label is hoverable too, so it carries the same metadata.
  expect(input.label).toMatchObject({
    'data-port-name': 'duration',
    'data-port-type': 'number',
    'data-port-direction': 'in',
  })
  expect(JSON.stringify(input.port.markup)).not.toContain('<title>')

  const output = portAttrs(node, 'out-exec')
  expect(output.body).toMatchObject({
    'data-port-name': 'exec',
    'data-port-label': '',
    'data-port-type': 'exec',
    'data-port-direction': 'out',
  })
})

function setupPort() {
  const container = document.createElement('div')
  document.body.appendChild(container)
  vi.spyOn(container, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 800, 600))
  const overlay = new OverlayLayer(container)
  const tooltip = new PortTooltip(overlay)

  const port = document.createElementNS(SVG_NAMESPACE, 'g')
  port.setAttribute('class', 'bpgraph-port')
  const body = document.createElementNS(SVG_NAMESPACE, 'circle')
  body.setAttribute('class', 'bpgraph-port-body')
  body.setAttribute('data-port-name', 'duration')
  body.setAttribute('data-port-label', 'Milliseconds')
  body.setAttribute('data-port-type', 'number')
  body.setAttribute('data-port-direction', 'in')
  body.getBoundingClientRect = () => new DOMRect(100, 100, 12, 12)
  const label = document.createElementNS(SVG_NAMESPACE, 'text')
  label.setAttribute('class', 'bpgraph-port-label')
  label.setAttribute('data-port-name', 'duration')
  label.setAttribute('data-port-label', 'Milliseconds')
  label.setAttribute('data-port-type', 'number')
  label.setAttribute('data-port-direction', 'in')
  port.append(body, label)
  container.appendChild(port)

  return { container, overlay, tooltip, port, body, label }
}

test('hovering a port shows its label and type and links the card accessibly', () => {
  vi.useFakeTimers()
  const { container, tooltip, body } = setupPort()
  tooltip.enter(body)
  // A quick pass over the port shows nothing.
  expect(container.querySelector('.bpgraph-port-tooltip')).toBeNull()
  vi.advanceTimersByTime(500)

  const card = container.querySelector<HTMLElement>('.bpgraph-port-tooltip')!
  expect(card.getAttribute('role')).toBe('tooltip')
  expect(card.querySelector('.bpgraph-port-tooltip-name')?.textContent).toBe('Milliseconds')
  expect(card.querySelector('.bpgraph-port-tooltip-type')?.textContent).toBe('number')
  // Input ports place the card outside the node, to the left of the port.
  expect(parseFloat(card.style.left)).toBeGreaterThanOrEqual(8)
  expect(parseFloat(card.style.top)).toBeGreaterThanOrEqual(8)
  expect(body.getAttribute('aria-describedby')).toBe(card.id)

  tooltip.leave(body, null)
  expect(container.querySelector('.bpgraph-port-tooltip')).toBeNull()
  expect(body.hasAttribute('aria-describedby')).toBe(false)
})

test('leaving a port before the delay cancels the pending card', () => {
  vi.useFakeTimers()
  const { container, tooltip, body } = setupPort()
  tooltip.enter(body)
  tooltip.leave(body, null)
  vi.advanceTimersByTime(1000)
  expect(container.querySelector('.bpgraph-port-tooltip')).toBeNull()
})

test('moving between a port shape and its label keeps one card', () => {
  vi.useFakeTimers()
  const { container, tooltip, body, label } = setupPort()
  tooltip.enter(body)
  vi.advanceTimersByTime(500)
  tooltip.leave(body, label)
  expect(container.querySelector('.bpgraph-port-tooltip')).toBeTruthy()
  tooltip.enter(label)
  expect(container.querySelectorAll('.bpgraph-port-tooltip')).toHaveLength(1)
  tooltip.leave(label, null)
  expect(container.querySelector('.bpgraph-port-tooltip')).toBeNull()
})

test('a port without a label falls back to its name', () => {
  vi.useFakeTimers()
  const { container, tooltip, body } = setupPort()
  body.setAttribute('data-port-label', '')
  body.setAttribute('data-port-name', 'exec')
  tooltip.enter(body)
  vi.advanceTimersByTime(500)
  expect(container.querySelector('.bpgraph-port-tooltip-name')?.textContent).toBe('exec')
})

test('hovering outside a port hides the card', () => {
  vi.useFakeTimers()
  const { container, tooltip, body } = setupPort()
  tooltip.enter(body)
  vi.advanceTimersByTime(500)
  expect(container.querySelector('.bpgraph-port-tooltip')).toBeTruthy()
  tooltip.enter(document.createElement('div'))
  expect(container.querySelector('.bpgraph-port-tooltip')).toBeNull()
})
