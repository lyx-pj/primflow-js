import { defineNode } from '../../Node'
import { LoopNode, LoopEntryNode, LoopReturnNode } from './Loop'
export { LoopNode, LoopEntryNode, LoopReturnNode, DEFAULT_LOOP_CONFIG } from './Loop'

const StartNode = defineNode({
  definition: {
    inputs: [] as const,
    outputs: [
      { name: 'start', type: 'exec' }
    ] as const,
    style: {
      header: { background: '#4CAF50', color: '#FFFFFF' }
    },
    name: 'Start',
    kind: 'start'
  },

  type: 'start',
})
export const EndNode = defineNode({
  definition: {
    inputs: [
      { name: 'end', type: 'exec' }
    ] as const,
    outputs: [] as const,
    style: {
      header: { background: '#F44336', color: '#FFFFFF' }
    },
    name: 'End',
    kind: 'end'
  },

  type: 'end',
})

const SubgraphNode = defineNode({
  definition: {
    inputs: [
      { name: 'subgraph', type: 'exec' },
      { name: 'input', type: 'any', label: '' }
    ] as const,
    outputs: [
      { name: 'subgraph', type: 'exec' },
      { name: 'input', type: 'any', label: 'Result', showLabel: false }
    ] as const,
    style: {
      header: { background: '#2196F3', color: '#FFFFFF' },
      ports: {
        // Subgraph calls are compact; smaller dots keep the card light.
        input: { port: { r: 4, strokeWidth: 1 } },
        output: { port: { r: 4, strokeWidth: 1 } }
      }
    },
    name: 'Subgraph',
    kind: 'subgraph'
  },

  type: 'subgraph',
})

Object.defineProperty(StartNode, 'type', {
  writable: false,
  configurable: false
})

Object.defineProperty(EndNode, 'type', {
  writable: false,
  configurable: false
})

Object.defineProperty(SubgraphNode, 'type', {
  writable: false,
  configurable: false
})

export const builtinNodes = {
  [LoopNode.type]: LoopNode,
  [LoopEntryNode.type]: LoopEntryNode,
  [LoopReturnNode.type]: LoopReturnNode,
  [StartNode.type]: StartNode,
  [SubgraphNode.type]: SubgraphNode
}

export type BuiltinNodeType = typeof builtinNodes
