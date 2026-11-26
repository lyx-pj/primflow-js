import { validateJsonNode, type JsonLink, type JsonNode } from '../types'

export interface NormalizeStartOptions {
  /**
   * Preserve explicitly typed data ports on Start nodes.
   *
   * Subgraphs use these ports for parent parameters; main graph entries leave this disabled.
   */
  keepDataPorts?: boolean
}

/**
 * Normalize Start node ports.
 *
 * Keep execution outputs and their links by default.
 * With `keepDataPorts`, preserve explicitly defined ports as subgraph parameters.
 */
export function normalizeStartNodes(nodes: JsonNode[], links: JsonLink[], options: NormalizeStartOptions = {}) {
  /** Retained Start port ids used to filter links. */
  const startPorts = new Map<string, Set<string>>()
  const normalizedNodes = nodes.map(node => {
    validateJsonNode(node)
    if (node.definitionId !== 'start') return node
    const exec = node.outputs.find(port => port.type === 'exec') ??
      node.outputs.find(port => !port.type && ['start', 'exec', 'next'].includes(port.name))
    const output = { name: 'start', type: 'exec' as const, id: exec?.id || 'out-start' }
    const dataInputs = options.keepDataPorts
      ? node.inputs.filter(port => port.type && port.type !== 'exec')
      : []
    const dataOutputs = options.keepDataPorts
      ? node.outputs.filter(port => port.type && port.type !== 'exec' && port.id !== output.id)
      : []
    startPorts.set(node.id, new Set([output.id, ...dataOutputs.map(port => port.id!)]))
    return {
      ...node,
      inputValues: {},
      inputs: dataInputs.map(port => ({ ...port })),
      outputs: [output, ...dataOutputs.map(port => ({ ...port }))],
    }
  })
  return {
    nodes: normalizedNodes,
    links: links.filter(link => [link.source, link.target].every(endpoint => {
      const ports = startPorts.get(endpoint.id)
      return !ports || ports.has(endpoint.port)
    })),
  }
}
