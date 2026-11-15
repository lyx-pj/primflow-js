// @vitest-environment jsdom
import './svg-shim'
import { afterEach, expect, test } from 'vitest'
import { dia } from '@joint/core'
import type { InputPort } from '@lyx-pj/workflow-model'
import { BlueprintNodeView } from '../src/adapters/joint/nodes/BlueprintNodeView'

let view: BlueprintNodeView | undefined

afterEach(() => {
  view?.remove()
  view = undefined
  document.body.innerHTML = ''
})

function mountEditor(input: InputPort, value: unknown) {
  const graph = new dia.Graph()
  const model = new dia.Element({ type: 'test.Node', inputs: [input], values: { [input.name]: value } })
  graph.addCell(model)
  const editor = document.createElement('div')
  document.body.appendChild(editor)
  view = new BlueprintNodeView({ model })
  view.findPortNode = () => editor
  // Use the actual port rebuild rendering entry to cover template and view event integration.
  view.confirmUpdate(0)
  return { graph, model, editor, view }
}

test('initial and rebuilt ports use the bpgraph prefix while retaining other classes and attributes', () => {
  const { view } = mountEditor({ id: 'in-value', name: 'value', type: 'string' }, 'Initial value')
  view.findNode = () => null
  document.body.appendChild(view.el)

  const makePort = () => {
    const port = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    port.setAttribute('class', 'joint-port custom-port')
    port.innerHTML = '<g class="joint-port-body" port="in-value" port-group="in"><circle joint-selector="portBody" magnet="inout" /></g><text class="joint-port-label custom-label">Input</text>'
    return port
  }

  for (const render of [() => view.onRender(), () => view.confirmUpdate(0)]) {
    view.el.querySelector('.bpgraph-port')?.remove()
    view.el.appendChild(makePort())
    render()
    expect(view.el.querySelector('.joint-port, .joint-port-body, .joint-port-label')).toBeNull()
    expect(view.el.querySelector('.bpgraph-port.custom-port')).toBeTruthy()
    const body = view.el.querySelector('.bpgraph-port-body')!
    expect(body.getAttribute('port')).toBe('in-value')
    expect(body.getAttribute('port-group')).toBe('in')
    expect(body.querySelector('[magnet="inout"]')).toBeTruthy()
    expect(view.el.querySelector('.bpgraph-port-label.custom-label')?.textContent).toBe('Input')
  }
})

test('focused condition checkboxes accept clicks and reflect external values', () => {
  const { graph, model, editor, view } = mountEditor(
    { id: 'in-condition', name: 'condition', label: 'Condition', type: 'boolean' },
    true
  )
  const changes: unknown[] = []
  graph.on('node:values:changed', (_view, name, value) => changes.push({ name, value }))
  const checkbox = editor.querySelector<HTMLInputElement>('input[type="checkbox"]')!
  checkbox.focus()
  checkbox.click()
  expect(changes).toEqual([{ name: 'condition', value: false }])
  expect(model.get('values').condition).toBe(false)

  model.set('values', { condition: true })
  view.refreshDomValue('condition')
  expect(checkbox.checked).toBe(true)
  expect(document.activeElement).toBe(checkbox)

  checkbox.click()
  expect(model.get('values').condition).toBe(false)
})

test('text updates preserve editing and caret position and restore model values on blur', () => {
  const { model, editor, view } = mountEditor({ id: 'in-text', name: 'text', type: 'string' }, 'Initial value')
  const field = editor.querySelector<HTMLInputElement>('input')!
  field.focus()
  field.value = 'Editing'
  field.setSelectionRange(2, 2)
  model.set('values', { text: 'External value' })
  view.refreshDomValue('text')
  expect(field.value).toBe('Editing')
  expect(field.selectionStart).toBe(2)

  field.blur()
  // Even unchanged template values must replace uncommitted DOM edits.
  model.set('values', { text: 'Initial value' })
  view.refreshDomValue('text')
  expect(field.value).toBe('Initial value')
})

test('clicking a dropdown retains its overlay, selection writes values, and blank clicks close it', () => {
  const { model, editor, view } = mountEditor({
    id: 'in-mode', name: 'mode', type: 'select',
    _options: [{ label: 'Option A', value: 'a' }, { label: 'Option B', value: 'b' }],
  }, 'a')
  const paper = document.createElement('div')
  view.el.appendChild(editor)
  paper.appendChild(view.el)
  document.body.appendChild(paper)
  view.paper = { el: paper } as dia.Paper
  view.findNode = () => null
  view.onRender()
  const field = editor.querySelector<HTMLInputElement>('input')!
  field.focus()
  field.click()
  expect(paper.querySelectorAll('[role="option"]')).toHaveLength(2)
  const option = paper.querySelectorAll<HTMLElement>('[role="option"]')[1]
  option.click()
  expect(model.get('values').mode).toBe('b')
  expect(field.value).toBe('Option B')
  expect(paper.querySelector('[role="option"]')).toBeNull()

  field.blur()
  field.focus()
  field.click()
  expect(paper.querySelector('[role="option"]')).toBeTruthy()
  paper.click()
  expect(paper.querySelector('[role="option"]')).toBeNull()

  field.blur()
  field.focus()
  const otherField = document.createElement('input')
  otherField.className = 'bpgraph-port-select'
  paper.appendChild(otherField)
  otherField.click()
  expect(paper.querySelector('[role="option"]')).toBeNull()
})
