import { isBuiltinDataType, isControlPort, isDataPort } from './DataTypes'
import type { NodeRegistry } from './NodeRegistry'
import type { JsonGraph, JsonNode } from './types'

export interface GraphTypeDiagnostic {
  severity: 'error' | 'warning'
  message: string
  nodeId?: string
  linkId?: string
}

export function validateGraphTypes(
  graph: JsonGraph,
  registry: Pick<NodeRegistry<Record<string, unknown>>, 'dataTypes' | 'getDefinition' | 'registry'>,
  options?: { strict?: boolean },
): GraphTypeDiagnostic[] {
  const diagnostics: GraphTypeDiagnostic[] = []
  const types = registry.dataTypes

  function inspectNode(node: JsonNode) {
    if (node.definitionId !== 'end' && !Object.hasOwn(registry.registry, node.definitionId)) return
    const definition = registry.getDefinition(node.definitionId)
    function inspectPorts(ports: JsonNode['inputs'] | JsonNode['outputs'], direction: 'inputs' | 'outputs') {
      const result = new Map<string, string>()
      for (const port of ports) {
        const type = port.type ?? definition[direction].find(candidate => candidate.name === port.name)?.type
        if (!type) continue
        result.set(port.id, type)
        if (isDataPort(type) && !types.has(type)) {
          diagnostics.push({ severity: 'error', nodeId: node.id, message: `Port "${node.id}.${port.name}" has unknown data type "${type}".` })
        } else if (direction === 'inputs' && Object.hasOwn(node.inputValues, port.name) && node.inputValues[port.name] !== undefined) {
          const message = types.validateValue(type, node.inputValues[port.name], `Input ${node.id}.${port.name}`)
          if (message) diagnostics.push({ severity: 'error', message, nodeId: node.id })
        }
      }
      return result
    }
    return { inputs: inspectPorts(node.inputs, 'inputs'), outputs: inspectPorts(node.outputs, 'outputs') }
  }

  for (const region of [graph, ...Object.values(graph.subgraphs ?? {})]) {
    const nodes = new Map(region.nodes.map(node => [node.id, inspectNode(node)]))
    for (const link of region.links) {
      const source = nodes.get(link.source.id)?.outputs.get(link.source.port)
      const target = nodes.get(link.target.id)?.inputs.get(link.target.port)
      if (!source || !target || types.checkConnection(source, target)) continue
      if (isControlPort(source) || isControlPort(target)) continue
      const legacy = isBuiltinDataType(source) && isBuiltinDataType(target)
      diagnostics.push({
        severity: legacy && !options?.strict ? 'warning' : 'error',
        message: `Link "${link.id}" cannot connect "${source}" to "${target}".`,
        linkId: link.id,
      })
    }
  }
  for (const variable of graph.variables ?? []) {
    const message = types.validateValue(variable.type, variable.value, `Variable "${variable.name}"`)
    if (message) diagnostics.push({ severity: 'error', message })
  }
  return diagnostics
}
