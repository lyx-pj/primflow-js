import { getJsonNodeDefinitionId, type JsonGraph, type JsonLink, type JsonNode } from '@lyx-pj/primflow-model'

const dataOnlyTypes = new Set([
  'TextInput', 'NumberInput', 'BooleanInput', 'ArrayInput', 'ObjectInput', 'MultilineTextInput', 'SelectInput', 'GetVariable',
])

type Endpoint = JsonLink['source']

function linkKey(source: Endpoint, target: Endpoint) {
  return JSON.stringify([source.id, source.port, target.id, target.port])
}

function isExec(port: JsonNode['inputs'][number]) {
  return port.type === 'exec' || (!port.type && port.name === 'exec')
}

function normalizeRegion<T extends Pick<JsonGraph, 'nodes' | 'links'>>(region: T): T {
  const removedPorts = new Map<string, Set<string>>()
  const nodes = region.nodes.map((node) => {
    if (!dataOnlyTypes.has(getJsonNodeDefinitionId(node))) return node
    const exec = [...node.inputs, ...node.outputs].filter(isExec)
    if (!exec.length) return node
    removedPorts.set(node.id, new Set(exec.map((port) => port.id)))
    return { ...node, breakpoint: false, inputs: node.inputs.filter((port) => !isExec(port)), outputs: node.outputs.filter((port) => !isExec(port)) }
  })
  if (!removedPorts.size) return region

  const removed = (endpoint: Endpoint) => removedPorts.get(endpoint.id)?.has(endpoint.port) ?? false
  const outgoing = new Map<string, Endpoint[]>()
  const links: JsonLink[] = []
  const retained = new Set<string>()
  const usedIds = new Set(region.links.map((link) => link.id))
  for (const link of region.links) {
    const { source, target } = link
    if (removed(source)) {
      const targets = outgoing.get(source.id) ?? []
      targets.push(target)
      outgoing.set(source.id, targets)
    } else if (!removed(target)) {
      links.push(link)
      retained.add(linkKey(source, target))
    }
  }

  let sequence = 0
  for (const link of region.links) {
    const { source, target } = link
    if (removed(source) || !removed(target)) continue
    const pending = [target]
    const visited = new Set<string>()
    for (const endpoint of pending) {
      if (removed(endpoint)) {
        if (visited.has(endpoint.id)) continue
        visited.add(endpoint.id)
        for (const next of outgoing.get(endpoint.id) ?? []) pending.push(next)
        continue
      }
      const key = linkKey(source, endpoint)
      if (retained.has(key)) continue
      retained.add(key)

      let id: string
      do { id = `input-bypass-${++sequence}` } while (usedIds.has(id))
      links.push({ ...link, id, source, target: endpoint })
    }
  }
  return { ...region, nodes, links }
}

/** Reconnect saved control flow around nodes that now publish data on demand. */
export function normalizeDataOnlyPorts(data: JsonGraph): JsonGraph {
  const root = normalizeRegion(data)
  const subgraphs = Object.entries(data.subgraphs ?? {})
  const normalized = subgraphs.map(([id, region]) => [id, normalizeRegion(region)] as const)
  if (normalized.every(([, region], index) => region === subgraphs[index][1])) return root
  return { ...root, subgraphs: Object.fromEntries(normalized) }
}
