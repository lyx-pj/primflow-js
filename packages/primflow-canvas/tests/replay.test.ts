// @vitest-environment jsdom
import './svg-shim'
import { expect, test, vi } from 'vitest'
import { defineNode, NodeRegistry, type JsonGraph } from '@lyx-pj/primflow-model'
import { Graph, type LinkInstanceType, type NodeInstanceType } from '../src/Graph'

// Replace rendering only; use real Graph, models, and JSON serialization to validate replay restoration.
vi.mock('../src/adapters/GraphAdapter', () => ({
  GraphAdapter: class {
    position = { x: 0, y: 0 }
    scale = 1
    selection = new Set<NodeInstanceType | LinkInstanceType>()
    private nextId = 0
    on = vi.fn()
    destroy = vi.fn()
    setOptions = vi.fn()
    addNode(node: NodeInstanceType) {
      node.id ||= `node-${++this.nextId}`
      node.inputs.forEach((port, index) => { port.id ||= `in-${index}` })
      node.outputs.forEach((port, index) => { port.id ||= `out-${index}` })
    }
    addLink(link: LinkInstanceType) {
      link.id ||= `link-${++this.nextId}`
    }
    removeCells(cells: Array<NodeInstanceType | LinkInstanceType>) {
      cells.forEach((cell) => this.selection.delete(cell))
    }
    selectCollection(cells: Array<NodeInstanceType | LinkInstanceType>) {
      this.selection = new Set(cells)
    }
    clearSelection() {
      this.selection.clear()
    }
    clear() {
      this.selection.clear()
    }
    setNodeExecutionStatus = vi.fn()
    setNodeExecutionPaused = vi.fn()
    ui = {
      refreshToolbar: vi.fn(),
      refreshExecutionStatus: vi.fn(),
      refreshNodeExecutionPreview: vi.fn(),
      refreshDebugPanel: vi.fn(),
    }
  },
}))

const Step = defineNode({
  definition: {
    inputs: [{ name: 'exec', type: 'exec' }] as const,
    outputs: [{ name: 'done', type: 'exec' }] as const,
  },
})

function replayGraph(): JsonGraph {
  return {
    nodes: [
      {
        id: 'replay-start',
        definitionId: 'start',
        kind: 'start',
        position: { x: 0, y: 0 },
        inputValues: {},
        inputs: [],
        outputs: [{ name: 'start', type: 'exec', id: 'out-exec' }],
      },
      {
        id: 'replay-step',
        definitionId: 'step',
        kind: 'default',
        position: { x: 120, y: 80 },
        inputValues: {},
        inputs: [{ name: 'exec', type: 'exec', id: 'in-exec' }],
        outputs: [{ name: 'done', type: 'exec', id: 'out-exec' }],
      },
    ],
    links: [
      {
        id: 'replay-link',
        source: { id: 'replay-start', port: 'out-exec' },
        target: { id: 'replay-step', port: 'in-exec' },
      },
    ],
    variables: [],
    subgraphs: {},
    viewport: { x: 12, y: 34, zoom: 1.5 },
  }
}

test('replay loads historical graphs and node data and restores editing, viewport, and live state', () => {
  const registry = new NodeRegistry().register('step', Step)
  const graph = new Graph(registry)
  graph.addNode('step', { id: 'edit-node', position: { x: 5, y: 6 } })
  graph.scale = 1.2
  graph.position = { x: 10, y: 20 }
  const changed = vi.fn()
  graph.on('replay:changed', changed)

  graph.enterReplay(replayGraph(), {
    label: 'First execution',
    nodeStatuses: { 'replay-step': 'completed' },
    nodeData: { 'replay-step': { inputs: { value: 1 }, outputs: { value: 2 } } },
  })

  expect(graph.isReplayMode()).toBe(true)
  expect(graph.replayLabel).toBe('First execution')
  expect(changed).toHaveBeenLastCalledWith(true, 'First execution')
  expect(graph.getNodes().map((node) => node.id)).toContain('replay-step')
  expect(graph.getNodes().map((node) => node.id)).not.toContain('edit-node')
  expect(graph.getNodeExecutionStatus('replay-step')).toBe('completed')
  expect(graph.getNodeExecutionData('replay-step')).toEqual({ inputs: { value: 1 }, outputs: { value: 2 } })
  expect(graph.undoManager.canUndo()).toBe(false)

  // Reentering replay switches snapshots without replacing the original editing graph.
  graph.enterReplay(replayGraph(), { label: 'Second execution' })
  expect(graph.replayLabel).toBe('Second execution')
  expect(changed).toHaveBeenLastCalledWith(true, 'Second execution')

  graph.exitReplay()
  expect(graph.isReplayMode()).toBe(false)
  expect(graph.replayLabel).toBe('')
  expect(changed).toHaveBeenLastCalledWith(false, '')
  expect(graph.getNodes().map((node) => node.id)).toContain('edit-node')
  expect(graph.getNodes().map((node) => node.id)).not.toContain('replay-step')
  expect(graph.scale).toBe(1.2)
  expect(graph.position).toEqual({ x: 10, y: 20 })
  expect(graph.getNodeExecutionData('replay-step')).toBeUndefined()
  expect(graph.undoManager.canUndo()).toBe(false)
})

test('leaving replay during execution restores live states and node data', () => {
  const registry = new NodeRegistry().register('step', Step)
  const graph = new Graph(registry)
  graph.addNode('step', { id: 'edit-node' })
  graph.addNode('step', { id: 'done-node' })
  graph.setExecutionStatus('running')
  graph.setNodeExecutionStatus('edit-node', 'running')
  graph.setNodeExecutionStatus('done-node', 'completed', { inputs: { a: 1 }, outputs: { b: 2 } })

  graph.enterReplay(replayGraph(), { nodeStatuses: { 'replay-step': 'completed' } })
  // Replay shows historical snapshots; restore live state only on exit.
  expect(graph.executionStatus).toBe('idle')
  expect(graph.getNodeExecutionStatus('edit-node')).toBe('idle')
  expect(graph.getNodeExecutionStatus('done-node')).toBe('idle')

  const adapter = (graph as unknown as {
    adapter: {
      setNodeExecutionStatus: ReturnType<typeof vi.fn>
      ui: { refreshExecutionStatus: ReturnType<typeof vi.fn> }
    }
  }).adapter
  adapter.setNodeExecutionStatus.mockClear()
  adapter.ui.refreshExecutionStatus.mockClear()

  graph.exitReplay()
  expect(graph.executionStatus).toBe('running')
  expect(graph.getNodeExecutionStatus('edit-node')).toBe('running')
  expect(graph.getNodeExecutionStatus('done-node')).toBe('completed')
  expect(graph.getNodeExecutionData('done-node')).toEqual({ inputs: { a: 1 }, outputs: { b: 2 } })
  // Canvas border effects and node glows depend on these entry points; reapply them after replay.
  expect(adapter.ui.refreshExecutionStatus).toHaveBeenCalled()
  expect(adapter.setNodeExecutionStatus).toHaveBeenCalledWith('edit-node', 'running')
  expect(adapter.setNodeExecutionStatus).toHaveBeenCalledWith('done-node', 'completed')
})

test('leaving replay while paused restores the breakpoint and prepared inputs', () => {
  const registry = new NodeRegistry().register('step', Step)
  const graph = new Graph(registry)
  graph.addNode('step', { id: 'paused-node' })
  graph.setExecutionStatus('paused', 'paused-node')
  graph.setNodeExecutionStatus('paused-node', 'pending', { inputs: { value: 3 }, outputs: {} })

  graph.enterReplay(replayGraph())
  expect(graph.pausedNodeId).toBeNull()
  expect(graph.getNodeExecutionData('paused-node')).toBeUndefined()

  graph.exitReplay()
  expect(graph.executionStatus).toBe('paused')
  expect(graph.pausedNodeId).toBe('paused-node')
  expect(graph.getNodeExecutionStatus('paused-node')).toBe('pending')
  expect(graph.getNodeExecutionData('paused-node')).toEqual({ inputs: { value: 3 }, outputs: {} })
})

test('exiting without entering replay is a no-op', () => {
  const graph = new Graph(new NodeRegistry())
  const changed = vi.fn()
  graph.on('replay:changed', changed)
  graph.exitReplay()
  expect(graph.isReplayMode()).toBe(false)
  expect(changed).not.toHaveBeenCalled()
})
