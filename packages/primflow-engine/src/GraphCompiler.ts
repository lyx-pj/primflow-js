import { isBuiltinDataType, isSpacerPort } from '@lyx-pj/primflow-model'
import type { JsonLink, PortPrototype, TaskStateSnapshot } from '@lyx-pj/primflow-model'
import type { ExecutionNode } from './ExecutionNode'
import type { LoadedGraph } from './GraphLoader'
import { validateLoops } from './LoopValidation'

export type DataSource = {
  dependency?: string
  output?: string
  upstreamOutput?: string
  valueOutput?: true
  stateSource?: { nodeId: string; port: string }
  read: (readOutput: (nodeId: string, name: string) => unknown, state?: TaskStateSnapshot) => unknown
}

export type ExecutionPortEntry = {
  node: ExecutionNode
  port: PortPrototype
  direction: 'input' | 'output'
  prev: string[]
  next: string[]
  dataInputs: Record<string, DataSource[]>
  hasMultipleSources?: true
}

export function graphPortKey(nodeId: string, portId: string): string {
  return JSON.stringify([nodeId, portId])
}

/** Compile execution ports and dependencies without storing task ready/waiting state. */
export class GraphCompiler {
  readonly graphs = new Map<string, Map<string, ExecutionPortEntry>>()
  readonly entries = new Map<string, string[]>()
  readonly streamTargets = new Map<string, ExecutionPortEntry>()
  readonly selectionSources = new Set<string>()
  private outgoing = new Map<string, Map<string, ExecutionPortEntry[]>>()

  constructor(graph: LoadedGraph) {
    this.compile('', graph.nodes, graph.links)
    for (const [id, child] of Object.entries(graph.subgraphs)) this.compile(id, child.nodes, child.links)
    validateLoops(this, new Map([['', graph.nodes], ...Object.entries(graph.subgraphs).map(([id, g]) => [id, g.nodes] as const)]))
  }

  private compile(id: string, nodes: ExecutionNode[], links: JsonLink[]) {
    const graph = new Map<string, ExecutionPortEntry>()
    const ports = new Map<string, Pick<ExecutionPortEntry, 'node' | 'port' | 'direction'>>()
    const dataLinks = new Map<string, string[]>()
    const streamInputs = new Set<string>()
    const outgoing = new Map<string, ExecutionPortEntry[]>()
    for (const node of nodes) {
      const streamPorts = [...node.inputs, ...node.outputs].filter(port => node.dataTypes.getStream(port.type))
      if ((streamPorts.length || node.executionMode === 'stream') &&
          (id || node.kind !== 'default' || node.retryPolicy || node.onEvent || node.valueOutputs)) {
        throw new Error(`Streams require ordinary root-graph nodes without retries: "${node.id}".`)
      }
      const streamInputCount = node.inputs.filter(port => node.dataTypes.getStream(port.type)).length
      if (node.executionMode === 'stream'
        ? streamInputCount !== 1 || node.inputs.some(port => port.type === 'exec')
        : streamInputCount !== 0) {
        throw new Error(`Stream consumers require exactly one stream input and no execution input: "${node.id}".`)
      }
      if (node.valueOutputs && [...node.inputs, ...node.outputs].some((port) => port.type === 'exec')) {
        throw new Error(`Value output node ${node.id} cannot have execution ports`)
      }
      for (const [direction, nodePorts] of [['input', node.inputs], ['output', node.outputs]] as const) {
        for (const port of nodePorts) {
          if (isSpacerPort(port.type)) continue
          const key = graphPortKey(node.id, port.id)
          if (ports.has(key)) throw new Error(`Duplicate port ID "${port.id}" in node "${node.id}".`)
          ports.set(key, { node, port, direction })
          if (port.type !== 'exec') continue
          const entry: ExecutionPortEntry = { node, port, direction, prev: [], next: [], dataInputs: {} }
          graph.set(key, entry)
          if (direction === 'output') {
            const outputs = outgoing.get(node.id) ?? []
            outputs.push(entry)
            outgoing.set(node.id, outputs)
          }
        }
      }
    }
    for (const link of links) {
      const sourceKey = graphPortKey(link.source.id, link.source.port)
      const targetKey = graphPortKey(link.target.id, link.target.port)
      const source = ports.get(sourceKey)
      const target = ports.get(targetKey)
      if (!source || !target) throw new Error(`Link ${link.id} references a missing port`)
      if (source.direction !== 'output' || target.direction !== 'input') {
        throw new Error(`Link ${link.id} must connect an output to an input.`)
      }
      if ((source.port.type === 'exec') !== (target.port.type === 'exec')) {
        throw new Error(`Link ${link.id} mixes execution and data ports`)
      }
      if (!source.node.dataTypes.checkConnection(source.port.type, target.port.type) &&
          !(isBuiltinDataType(source.port.type) && isBuiltinDataType(target.port.type))) {
        throw new TypeError(`Link "${link.id}" cannot connect "${source.port.type}" to "${target.port.type}".`)
      }
      if (source.node.dataTypes.getStream(source.port.type)) {
        if (this.streamTargets.has(sourceKey) || streamInputs.has(targetKey)) {
          throw new Error(`Stream link "${link.id}" requires one producer and one consumer.`)
        }
        streamInputs.add(targetKey)
        this.streamTargets.set(sourceKey, { ...target, prev: [], next: [], dataInputs: {} })
        continue
      }
      if (target.node.executionMode === 'stream') {
        throw new Error(`Stream consumer "${target.node.id}" only accepts configured values on its other ports.`)
      }
      if (source.port.type === 'exec') {
        graph.get(sourceKey)?.next.push(targetKey)
        graph.get(targetKey)?.prev.push(sourceKey)
      } else {
        const candidates = dataLinks.get(targetKey) ?? []
        candidates.push(sourceKey)
        dataLinks.set(targetKey, candidates)
      }
    }

    const sources = new Map<string, DataSource[]>()
    const resolving = new Set<string>()
    const resolveOutput = (key: string): DataSource[] => {
      const cached = sources.get(key)
      if (cached) return cached
      if (resolving.has(key)) throw new Error(`Circular value output dependency: ${key}`)
      const { node, port } = ports.get(key)!
      let candidates: DataSource[]
      if (node.valueOutputs && Object.hasOwn(node.valueOutputs, port.name)) {
        const output = node.valueOutputs[port.name]
        const input = node.inputs.find((input) => input.name === output.input)
        if (!input) throw new Error(`Value output ${key} references a missing input`)
        resolving.add(key)
        const upstream = dataLinks.get(graphPortKey(node.id, input.id))?.flatMap(resolveOutput) ?? [undefined]
        resolving.delete(key)
        candidates = upstream.map((source): DataSource => ({
          dependency: source?.dependency,
          upstreamOutput: source?.output ?? source?.upstreamOutput,
          valueOutput: true,
          stateSource: 'read' in output ? { nodeId: node.id, port: port.name } : source?.stateSource,
          read: (readOutput, state) => node.readValueOutput(port, source?.read(readOutput, state), state),
        }))
      } else {
        candidates = [{ dependency: node.id, output: port.name, read: (readOutput) => readOutput(node.id, port.name) }]
      }
      sources.set(key, candidates)
      return candidates
    }

    for (const node of nodes) {
      const entries = node.inputs.filter((port) => port.type === 'exec')
      for (const entry of entries) {
        const item = graph.get(graphPortKey(node.id, entry.id))!
        for (const input of node.inputs) {
          const candidates = dataLinks.get(graphPortKey(node.id, input.id))?.flatMap(resolveOutput)
          if (!candidates) continue
          item.dataInputs[input.id] = candidates
          if (candidates.length > 1) {
            item.hasMultipleSources = true
            for (const { dependency } of candidates) {
              if (dependency !== undefined) this.selectionSources.add(dependency)
            }
          }
        }
      }
    }
    this.graphs.set(id, graph)
    this.outgoing.set(id, outgoing)
    this.entries.set(
      id,
      nodes
        .filter((node) => node.kind === 'start' || node.kind === 'loop-entry')
        .flatMap((node) => node.outputs.filter((port) => port.type === 'exec').map((port) => graphPortKey(node.id, port.id)))
    )
  }

  /** Find nodes that lost every execution path when this handoff selected its output ports. */
  unselectedNodes(node: ExecutionNode, selected: string[], roots: ReadonlyMap<string, ReadonlySet<string>>) {
    const graph = this.graphs.get(node.graphId)!
    const outputs = this.outgoing.get(node.graphId)?.get(node.id) ?? []
    const omitted = outputs.filter(({ port, next }) => next.length && !selected.includes(port.name))
    if (!omitted.length) return []

    const candidates = this.reachable(omitted.flatMap(({ next }) => next.map((key) => graph.get(key)!.node.id)), node.graphId)
    const excluded = new Set(omitted)
    const reachable = this.reachable([node.id], node.graphId, new Set(), excluded)
    for (const [graphId, nodeIds] of roots) this.reachable(nodeIds, graphId, reachable, excluded)
    return [...candidates].filter((id) => !reachable.has(id))
  }

  reachable(
    nodeIds: Iterable<string>, graphId = '', visited = new Set<string>(), excluded?: ReadonlySet<ExecutionPortEntry>
  ): Set<string> {
    const graph = this.graphs.get(graphId)
    if (!graph) return visited
    for (const nodeId of nodeIds) {
      if (visited.has(nodeId)) continue
      visited.add(nodeId)
      for (const item of this.outgoing.get(graphId)?.get(nodeId) ?? []) {
        if (excluded?.has(item)) continue
        if (['subgraph', 'loop'].includes(item.node.kind) && item.node.targetGraphId) {
          this.reachable(
            (this.entries.get(item.node.targetGraphId) ?? []).map((key) => this.graphs.get(item.node.targetGraphId!)!.get(key)!.node.id),
            item.node.targetGraphId,
            visited,
            excluded
          )
        }
        this.reachable(
          item.next.map((key) => graph.get(key)!.node.id),
          graphId,
          visited,
          excluded
        )
      }
    }
    return visited
  }
}
