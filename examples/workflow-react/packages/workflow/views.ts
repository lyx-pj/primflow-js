import type { Graph, NodeClassType } from '@lyx-pj/workflow-canvas'
import type { JsonGraph } from '@lyx-pj/workflow-model'
import type { ViewMeta } from './storage'
import { getLanguage, listSeparator, translate, type AppLanguage } from './i18n'

let viewSeq = 0

/** Generate view ids: timestamps separate sessions and a sequence avoids collisions within one millisecond. */
export function createViewId(): string {
  viewSeq += 1
  return `view-${Date.now().toString(36)}-${viewSeq.toString(36)}`
}

/** Default names follow existing views: View 1, View 2, … */
export function nextViewName(existing: ViewMeta[], language: AppLanguage = getLanguage()): string {
  const used = new Set(existing.map((view) => view.name))
  let index = existing.length + 1
  let name = translate(language, 'default.viewName', { index })
  while (used.has(name)) {
    index += 1
    name = translate(language, 'default.viewName', { index })
  }
  return name
}

/**
 * Validate and restore a saved record.
 * Check node types in the main graph and subgraphs first so a missing old node does not leave a half-restored graph.
 * `keepStartPorts` is for subgraph files: the root Start is a subgraph entry and must keep its parameter ports.
 */
export function restoreGraph<NodeDefs extends Record<string, NodeClassType>>(
  graph: Graph<NodeDefs>,
  data: JsonGraph,
  options: { keepStartPorts?: boolean } = {},
) {
  const nodes = [...data.nodes, ...Object.values(data.subgraphs ?? {}).flatMap((subgraph) => subgraph.nodes)]
  const unsupported = [...new Set(nodes.map((node) => node.nodeType))].filter(
    (type) => !graph.nodeRegistry.isRegistered(type as keyof typeof graph.nodeRegistry.registry)
  )
  if (unsupported.length) {
    throw new Error(
      translate(getLanguage(), 'error.unsupportedNodes', {
        types: unsupported.join(listSeparator()),
      }),
    )
  }
  // Only subgraph files keep entry parameter ports; ordinary views use the default load behavior.
  if (options.keepStartPorts) graph.fromJSON(data, options)
  else graph.fromJSON(data)
}

/** Reduce a view record to the metadata the list needs. */
export function toViewMeta(view: { id: string; name: string; type: ViewMeta['type']; updatedAt: number }): ViewMeta {
  return { id: view.id, name: view.name, type: view.type, updatedAt: view.updatedAt }
}

/**
 * Give the root Start of a standalone subgraph file a cross-file unique id.
 *
 * The canvas names every loaded root graph `root`, and its auto-created Start is also `start-root`;
 * if several subgraph files keep that id, assembling them into one JsonGraph conflicts with the main graph.
 * Rename it when creating a subgraph file; links update too, and canvas-generated node ids are already unique enough.
 */
export function ensureSubgraphStartId(data: JsonGraph, recordId: string): JsonGraph {
  const start = data.nodes.find((node) => node.type === 'start' && node.id === 'start-root')
  if (!start) return data
  let nextId = `start-${recordId}`
  let suffix = 1
  while (data.nodes.some((node) => node.id === nextId)) {
    suffix += 1
    nextId = `start-${recordId}-${suffix}`
  }
  const previousId = start.id
  start.id = nextId
  for (const link of data.links) {
    if (link.source.id === previousId) link.source.id = nextId
    if (link.target.id === previousId) link.target.id = nextId
  }
  return data
}
