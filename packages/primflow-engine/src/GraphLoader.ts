import { getJsonNodeDefinitionId, normalizeLoopEntryOutputs, normalizeStartNodes, type JsonGraph, type NodeClassType, type NodeOptions, type NodeRegistry } from '@lyx-pj/primflow-model'
import { ExecutionNode } from './ExecutionNode'

type GraphRegion = { nodes: ExecutionNode[]; links: JsonGraph['links'] }

export type LoadedGraph = GraphRegion & {
  subgraphs: Record<string, GraphRegion>
  nodesById: Map<string, ExecutionNode>
}

export function createExecutionNode<NodeDefs extends Record<string, NodeClassType>, K extends keyof NodeDefs>(
  registry: NodeRegistry<NodeDefs>,
  nodeType: K | NodeDefs[K],
  options?: NodeOptions<NodeDefs[K]>
): ExecutionNode<NodeDefs[K]> {
  if (!registry.isRegistered(nodeType)) {
    if (typeof nodeType === 'string') {
      throw new Error(`Node type "${nodeType}" is not registered.`)
    } else if (nodeType.constructor && 'name' in nodeType.constructor) {
      throw new Error(`Node type "${nodeType.constructor.name}" is not registered.`)
    }
  }
  let NodeClass: NodeDefs[K]
  if (typeof nodeType === 'string') {
    NodeClass = registry.get(nodeType as K)
  } else {
    NodeClass = nodeType as NodeDefs[K]
  }

  const nodeInstance = new ExecutionNode(NodeClass, options, registry.dataTypes)
  if (!nodeInstance.id) nodeInstance.id = `node_${Math.random().toString(36).slice(2, 11)}`

  return nodeInstance
}

export function loadGraphNodes<NodeDefs extends Record<string, NodeClassType>>(
  registry: NodeRegistry<NodeDefs>,
  json: JsonGraph,
  nodesById = new Map<string, ExecutionNode>()
): LoadedGraph {
  const deserializeNodes = (jsonNodes: JsonGraph['nodes'], graphId?: string): ExecutionNode[] => {
    const nodes: ExecutionNode[] = []
    for (const jsonNode of jsonNodes) {
      const outputs = normalizeLoopEntryOutputs(jsonNode)
      const definition = registry.getDefinition(getJsonNodeDefinitionId(jsonNode))
      const hasTypedOutputs = outputs.some((output) => output.type)
      const node = createExecutionNode(registry, getJsonNodeDefinitionId(jsonNode) as keyof NodeDefs, {
        id: jsonNode.id,
        breakpoint: jsonNode.breakpoint,
        data: jsonNode.data,
        inputValues: jsonNode.inputValues as any,
        targetGraphId: jsonNode.targetGraphId,
        loop: jsonNode.loop,
        inputs: jsonNode.inputs.some((input) => input.type)
          ? jsonNode.inputs.map((i) => ({
              type: i.type ?? definition.inputs.find(port => port.name === i.name)?.type ?? '',
              name: i.name,
              id: i.id,
            }))
          : undefined,
        outputs: hasTypedOutputs
          ? outputs.map((o) => ({
              type: o.type ?? definition.outputs.find(port => port.name === o.name)?.type ?? '',
              name: o.name,
              id: o.id,
            }))
          : undefined,
      }) as ExecutionNode
      if (nodesById.has(node.id)) throw new Error(`Duplicate node ID: ${node.id}`)
      nodesById.set(node.id, node)
      node.graphId = graphId ?? ''

      if (!jsonNode.inputs.some((input) => input.type)) {
        for (const jsonInput of jsonNode.inputs) {
          const input = node.inputs.find((i) => i.name === jsonInput.name)
          if (!input) continue
          input.id = jsonInput.id
        }
      }

      if (!hasTypedOutputs) {
        for (const jsonOutput of outputs) {
          const output = node.outputs.find((i) => i.name === jsonOutput.name)
          if (!output) continue
          output.id = jsonOutput.id
        }
      }
      nodes.push(node)
    }
    return nodes
  }

  const main = normalizeStartNodes(json.nodes, json.links)
  const nodes = deserializeNodes(main.nodes)
  const subgraphs: Record<string, GraphRegion> = Object.create(null)
  for (const [graphId, subgraph] of Object.entries(json.subgraphs ?? {})) {
    const normalized = normalizeStartNodes(subgraph.nodes, subgraph.links, { keepDataPorts: true })
    subgraphs[graphId] = { nodes: deserializeNodes(normalized.nodes, graphId), links: normalized.links }
  }
  return { nodes, links: main.links, subgraphs, nodesById }
}
