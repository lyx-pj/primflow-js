// @vitest-environment jsdom
import './svg-shim'
import { expect, test } from 'vitest'
import { dia } from '@joint/core'
import { renderNodeExecution } from '../src/ui/nodeExecution'
import { renderNodeHeader } from '../src/ui/nodeHeader'
import { BlueprintNodeView } from '../src/adapters/joint/nodes/BlueprintNodeView'
import { ensureUiStyles } from '../src/ui/styles'

test('running effects use gradient fills without stacking on resize and disappear on reset', () => {
  document.body.innerHTML = '<svg><g id="effects"></g></svg>'
  const group = document.getElementById('effects') as unknown as SVGGElement
  const options = { id: 'view-1', status: 'running' as const, width: 200, height: 100, radius: 6 }
  renderNodeExecution(group, options)
  expect(group.querySelectorAll('linearGradient stop')).toHaveLength(3)
  expect(group.querySelectorAll('rect')).toHaveLength(1)
  expect(group.querySelector('[stroke], text')).toBeNull()
  expect(group.querySelector('.bpgraph-node-execution-halo')?.getAttribute('fill')).toContain('url(')
  renderNodeExecution(group, { ...options, width: 150, status: 'completed' })
  expect(group.querySelectorAll('defs')).toHaveLength(1)
  expect(group.querySelector('rect')?.getAttribute('width')).toBe('154')
  renderNodeExecution(group, { ...options, status: 'pending' })
  expect(group.childElementCount).toBe(0)
  expect(group.getAttribute('aria-label')).toBe('Pending')
  renderNodeExecution(group, { ...options, status: 'pending', paused: true })
  expect(group.querySelector('.bpgraph-node-execution-halo')).toBeTruthy()
  expect(group.querySelector('stop')?.getAttribute('stop-color')).toBe('#fbbf24')
  expect(group.getAttribute('aria-label')).toBe('Paused at breakpoint')
  renderNodeExecution(group, { ...options, status: 'pending', paused: false })
  expect(group.childElementCount).toBe(0)
  renderNodeExecution(group, { ...options, status: 'idle' })
  expect(group.childElementCount).toBe(0)
  document.body.innerHTML = ''
})

test('node titles omit status text and icons while preserving breakpoint indicators', () => {
  document.body.innerHTML = '<svg><g id="header"></g></svg>'
  const group = document.getElementById('header') as unknown as SVGGElement
  const options = { title: 'Node', size: { width: 200, height: 100 }, style: {}, breakpoint: true }
  renderNodeHeader(group, options)
  expect(group.querySelectorAll('text')).toHaveLength(1)
  expect(group.querySelector('text')?.textContent).toBe('Node')
  expect(group.querySelector('[aria-label="Breakpoint"]')).toBeTruthy()
  expect(group.querySelector('[aria-label="Breakpoint"]')?.tagName).toBe('svg')
  expect(group.querySelector('[aria-label="Breakpoint"] path')).toBeTruthy()
  expect(group.querySelector('circle')).toBeNull()
  renderNodeHeader(group, { ...options, size: { width: 120, height: 100 } })
  expect(group.querySelectorAll('text')).toHaveLength(1)
  expect(group.querySelector('.bpgraph-node-status')).toBeNull()
  expect(group.querySelector('[aria-label="Breakpoint"]')?.getAttribute('x')).toBe('98')
  renderNodeHeader(group, { ...options, style: { header: { textAlign: 'right' } } })
  expect(group.querySelector('text')?.getAttribute('x')).toBe('170')
  renderNodeHeader(group, { ...options, breakpoint: false })
  expect(group.querySelector('[aria-label="Breakpoint"]')).toBeNull()
  document.body.innerHTML = ''
})

test('failure, cancellation, skipped branches, and interruptions have distinct labeled halos', () => {
  const group = document.createElementNS('http://www.w3.org/2000/svg', 'g')
  const statuses = [
    ['failed', 'Failed'],
    ['cancelled', 'Cancelled'],
    ['skipped', 'Skipped'],
    ['interrupted', 'Waiting for external input'],
    ['pending', 'Paused at breakpoint'],
  ] as const
  const gradients = statuses.map(([status, label]) => {
    renderNodeExecution(group, { id: 'effects', status, paused: status === 'pending', width: 200, height: 100, radius: 6 })
    expect(group.getAttribute('aria-label')).toBe(label)
    expect(group.querySelector('.bpgraph-node-execution-halo')).toBeTruthy()
    return [...group.querySelectorAll('stop')].map((stop) => stop.getAttribute('stop-color')).join(',')
  })
  expect(new Set(gradients).size).toBe(statuses.length)
})

test('node views track status and size changes and clear glows on stop', () => {
  const model = new dia.Element({ size: { width: 200, height: 100 } })
  const view = new BlueprintNodeView({ model })
  const header = document.createElementNS('http://www.w3.org/2000/svg', 'g')
  const effects = document.createElementNS('http://www.w3.org/2000/svg', 'g')
  view.findNode = (selector: string) => selector === 'execution-effects' ? effects : header
  model.set('executionStatus', 'running')
  expect(view.el.getAttribute('data-node-execution-status')).toBe('running')
  expect(effects.querySelector('.bpgraph-node-execution-halo')).toBeTruthy()
  model.resize(250, 120)
  expect(effects.querySelector('rect')?.getAttribute('width')).toBe('254')
  model.set('executionStatus', 'idle')
  expect(view.el.getAttribute('data-node-execution-status')).toBe('idle')
  expect(effects.childElementCount).toBe(0)
  expect(header.querySelector('.bpgraph-node-status')).toBeNull()
  model.set('executionStatus', 'pending')
  expect(effects.childElementCount).toBe(0)
  model.set('executionPaused', true)
  expect(effects.querySelector('.bpgraph-node-execution-halo')).toBeTruthy()
  expect(effects.getAttribute('aria-label')).toBe('Paused at breakpoint')
  model.set('executionPaused', false)
  expect(effects.childElementCount).toBe(0)
  view.remove()
})

test('only unreachable nodes are dimmed; completed nodes use 0.7 opacity and pending nodes remain normal', () => {
  const model = new dia.Element({ size: { width: 200, height: 100 } })
  const view = new BlueprintNodeView({ model })
  const effects = document.createElementNS('http://www.w3.org/2000/svg', 'g')
  view.findNode = () => effects
  const container = document.createElement('div')
  container.dataset.executionStatus = 'running'
  container.appendChild(view.el)
  document.body.appendChild(container)

  model.set('executionStatus', 'running')
  expect(getComputedStyle(view.el).opacity).toBe('1')
  model.set('executionStatus', 'completed')
  expect(getComputedStyle(view.el).opacity).toBe('0.7')
  expect(getComputedStyle(view.el).filter).toBe('none')
  model.set('executionStatus', 'idle')
  expect(getComputedStyle(view.el).opacity).toBe('0.45')
  model.set('executionStatus', 'pending')
  expect(getComputedStyle(view.el).opacity).toBe('1')
  expect(effects.querySelector('.bpgraph-node-execution-halo')).toBeNull()

  container.dataset.executionStatus = 'paused'
  expect(getComputedStyle(view.el).opacity).toBe('1')
  model.set('executionStatus', 'completed')
  expect(getComputedStyle(view.el).opacity).toBe('0.7')
  expect(getComputedStyle(view.el).filter).toBe('none')
  container.dataset.executionStatus = 'idle'
  model.set('executionStatus', 'idle')
  expect(getComputedStyle(view.el).opacity).toBe('1')
  expect(getComputedStyle(view.el).filter).toBe('none')
  view.remove()
  container.remove()
})

test('mount refreshes old built-in styles to replace obsolete dimming rules', () => {
  document.getElementById('bpgraph-ui-styles')?.remove()
  const staleStyle = document.createElement('style')
  staleStyle.id = 'bpgraph-ui-styles'
  staleStyle.textContent = '[data-node-execution-status="completed"] { opacity: 0.4; }'
  document.head.appendChild(staleStyle)
  ensureUiStyles()
  const node = document.createElement('div')
  node.dataset.nodeExecutionStatus = 'completed'
  document.body.appendChild(node)
  expect(getComputedStyle(node).opacity).toBe('0.7')
  expect(document.querySelectorAll('#bpgraph-ui-styles')).toHaveLength(1)
  node.remove()
})
