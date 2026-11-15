import type { DebugChainKind, DebugScope } from '@lyx-pj/workflow-canvas'
import type { JsonGraph, JsonNode } from '@lyx-pj/workflow-model'

/** Node display info in the execution chain. */
export type NodeExecutionInfo = {
  /** Stored node title; empty without a custom title, and the caller falls back to the default title. */
  title?: string
  /** Node type, used to look up the default title. */
  nodeType: string
  /** Owning subgraph; empty for main-graph nodes. */
  scope?: DebugScope
  /** Node role: subgraph call, subgraph entry, subgraph exit, or ordinary node. */
  kind: DebugChainKind
}

/**
 * Determine a node's role in the execution chain.
 *
 * Subgraph entry and exit are kept distinct from the main graph's start node: only a start inside a subgraph is an entry.
 */
function kindOf(node: JsonNode, inSubgraph: boolean): DebugChainKind {
  if (node.type === 'subgraph') return 'subgraph'
  if (node.type === 'end') return 'subgraph-end'
  if (node.type === 'start') return inSubgraph ? 'subgraph-start' : 'node'
  return 'node'
}

/**
 * Resolve each node's title, subgraph scope, and role from the task graph.
 *
 * An execution graph consists of the main graph and subgraph regions: nodes in a region belong to that subgraph,
 * while the call node stays in the parent region and uses the subgraph name as its title.
 */
export function buildNodeExecutionInfo(json: JsonGraph): Map<string, NodeExecutionInfo> {
  const infos = new Map<string, NodeExecutionInfo>()
  const regions = json.subgraphs ?? {}

  const visit = (nodes: JsonNode[], parentScope: DebugScope | undefined) => {
    for (const node of nodes) {
      infos.set(node.id, {
        title: node.title,
        nodeType: node.nodeType,
        scope: parentScope,
        kind: kindOf(node, Boolean(parentScope)),
      })
      if (node.type !== 'subgraph' || !node.subgraphId) continue
      const region = regions[node.subgraphId]
      if (!region) continue
      visit(region.nodes, {
        subgraphId: node.subgraphId,
        title: node.title || node.subgraphId,
        depth: (parentScope?.depth ?? 0) + 1,
      })
    }
  }

  visit(json.nodes, undefined)
  return infos
}
