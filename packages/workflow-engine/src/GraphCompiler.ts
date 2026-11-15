import type { JsonLink, NodeClassType, PortPrototype } from '@lyx-pj/workflow-model'
import type { Runtime, NodeInstanceType } from './Runtime'
import { validateLoops } from './LoopValidation'

export type GraphNode = {
  node: NodeInstanceType
  port: PortPrototype
  prev: string[]
  next: string[]
  dataInputs: Record<string, string>
}

/** Compile execution ports and dependencies without storing task ready/waiting state. */
export class GraphCompiler {
  readonly graphs = new Map<string, Map<string, GraphNode>>()
  readonly entries = new Map<string, string[]>()
  private outgoing = new Map<string, Map<string, GraphNode[]>>()

  constructor(graph: ReturnType<Runtime<Record<string, NodeClassType>>['fromJSON']>) {
    this.compile('', graph.nodes, graph.links)
    for (const [id, child] of Object.entries(graph.subgraphs)) this.compile(id, child.nodes, child.links)
    validateLoops(this, new Map([['', graph.nodes], ...Object.entries(graph.subgraphs).map(([id, g]) => [id, g.nodes] as const)]))
  }

  private compile(id: string, nodes: NodeInstanceType[], links: JsonLink[]) {
    const graph = new Map<string, GraphNode>()
    const byId = new Map(nodes.map((node) => [node.id, node]))
    const ports = new Map<string, PortPrototype>()
    const outgoing = new Map<string, GraphNode[]>()
    for (const node of nodes) {
      for (const port of [...node.inputs, ...node.outputs]) {
        ports.set(`${node.id}:${port.id}`, port)
        if (port.type === 'exec') graph.set(`${node.id}:${port.id}`, { node, port, prev: [], next: [], dataInputs: {} })
        if (port.type === 'exec' && port.id.startsWith('out-')) {
          const outputs = outgoing.get(node.id) ?? []
          outputs.push(graph.get(`${node.id}:${port.id}`)!)
          outgoing.set(node.id, outputs)
        }
      }
    }
    for (const link of links) {
      const source = link.source.port.startsWith('out-') ? link.source : link.target
      const target = link.source.port.startsWith('out-') ? link.target : link.source
      const sourceKey = `${source.id}:${source.port}`
      const targetKey = `${target.id}:${target.port}`
      if (!ports.has(sourceKey) || !ports.has(targetKey)) throw new Error(`Link ${link.id} references a missing port`)
      if ((ports.get(sourceKey)!.type === 'exec') !== (ports.get(targetKey)!.type === 'exec')) {
        throw new Error(`Link ${link.id} mixes execution and data ports`)
      }
      if (ports.get(sourceKey)!.type === 'exec') {
        graph.get(sourceKey)?.next.push(targetKey)
        graph.get(targetKey)?.prev.push(sourceKey)
      } else {
        for (const port of byId.get(target.id)!.inputs.filter((port) => port.type === 'exec')) {
          graph.get(`${target.id}:${port.id}`)!.dataInputs[target.port] = sourceKey
        }
      }
    }
    this.graphs.set(id, graph)
    this.outgoing.set(id, outgoing)
    this.entries.set(
      id,
      nodes
        .filter((node) => node.type === 'start' || node.type === 'loop-entry')
        .flatMap((node) => node.outputs.filter((port) => port.type === 'exec').map((port) => `${node.id}:${port.id}`))
    )
  }

  reachable(nodeIds: string[], graphId = '', visited = new Set<string>()): Set<string> {
    const graph = this.graphs.get(graphId)
    if (!graph) return visited
    for (const nodeId of nodeIds) {
      if (visited.has(nodeId)) continue
      visited.add(nodeId)
      for (const item of this.outgoing.get(graphId)?.get(nodeId) ?? []) {
        if (['subgraph', 'loop'].includes(item.node.type) && item.node.subgraphId) {
          this.reachable(
            (this.entries.get(item.node.subgraphId) ?? []).map((key) => key.split(':')[0]),
            item.node.subgraphId,
            visited
          )
        }
        this.reachable(
          item.next.map((key) => graph.get(key)!.node.id),
          graphId,
          visited
        )
      }
    }
    return visited
  }
}
