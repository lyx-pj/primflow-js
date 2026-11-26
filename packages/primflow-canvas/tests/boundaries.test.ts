// @vitest-environment jsdom
//
// Duplicate model bundles would make Graph.NodeInstance differ from
// model's NodeInstance, silently breaking instanceof checks.
// Assert that both packages share the same class.
import { test, expect } from 'vitest'
import { defineNode, NodeInstance, NodeRegistry } from '@lyx-pj/primflow-model'
import { Graph, defineNode as canvasDefineNode, NodeInstance as CanvasNodeInstance } from '../src/index'

test('canvas shares the model node factory and NodeInstance class', () => {
  expect(canvasDefineNode).toBeTypeOf('function')
  expect(canvasDefineNode).toBe(defineNode)
  expect(CanvasNodeInstance).toBe(NodeInstance)
  expect(Graph.NodeInstance).toBe(NodeInstance)
})

test('canvas uses model\'s NodeRegistry NodeRegistry', () => {
  // canvas reexports this class rather than defining another copy
  expect(NodeRegistry).toBeTypeOf('function')
  const registry = new NodeRegistry()
  expect(registry.getStartNodeClass()).toBeTruthy()
})
