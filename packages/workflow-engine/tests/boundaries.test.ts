//
// engine reexports model's Node / NodeRegistry.
// Duplicated implementations would create distinct runtime classes
// and break object identity between engine and canvas.
import { test, expect } from 'vitest'
import { Node, NodeInstance, NodeRegistry } from '@lyx-pj/workflow-model'
import { Node as EngineNode, NodeRegistry as EngineNodeRegistry } from '../src/index'

test('engine reexports the same Node / NodeRegistry classes as model', () => {
  expect(EngineNode).toBe(Node)
  expect(EngineNodeRegistry).toBe(NodeRegistry)
})

test('model can construct NodeRegistry independently with NodeInstance', () => {
  const registry = new NodeRegistry()
  const start = registry.getStartNodeClass()
  expect(start).toBeTruthy()
  expect(start.definition.inputs).toEqual([])
  expect(start.definition.outputs).toEqual([{ name: 'start', type: 'exec' }])
  expect(new NodeInstance(start as never)).toBeInstanceOf(NodeInstance)
})
