//
// The engine reexports model's node factory and registry.
// Duplicated implementations would create distinct runtime classes
// and break object identity between engine and canvas.
import { test, expect } from 'vitest'
import { defineNode, NodeInstance, NodeRegistry } from '@lyx-pj/primflow-model'
import { defineNode as engineDefineNode, NodeRegistry as EngineNodeRegistry } from '../src/index'

test('engine reexports the same node factory and registry as model', () => {
  expect(engineDefineNode).toBeTypeOf('function')
  expect(engineDefineNode).toBe(defineNode)
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
