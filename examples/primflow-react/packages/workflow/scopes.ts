import type { DebugScope } from '@lyx-pj/primflow-canvas'
import { getJsonNodeDefinitionId, type JsonGraph, type JsonNode } from '@lyx-pj/primflow-model'

/**
 * Node display info in the execution log.
 *
 * Titles and scopes come from the graph the task actually ran: subgraph files
 * are standalone and cannot be found on the canvas, so the task graph is the
 * only source for their names.
 */
export type NodeExecutionInfo = {
  /** Stored node title; empty without a custom title, and the caller falls back to the default title. */
  title?: string
  /** Node type, used to look up the default title. */
  nodeType: string
  /** Owning subgraph; empty for main-graph nodes. */
  scope?: DebugScope
}

/**
 * Resolve each node's title and subgraph scope from the task graph.
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
        nodeType: getJsonNodeDefinitionId(node),
        scope: parentScope,
      })
      const targetGraphId = node.targetGraphId
      if (node.kind !== 'subgraph' || !targetGraphId) continue
      const region = regions[targetGraphId]
      if (!region) continue
      visit(region.nodes, {
        subgraphId: targetGraphId,
        title: node.title || targetGraphId,
        depth: (parentScope?.depth ?? 0) + 1,
      })
    }
  }

  visit(json.nodes, undefined)
  return infos
}
