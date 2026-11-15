import type { JsonGraph, JsonNode } from '@lyx-pj/workflow-model'
import type { ViewType } from './storage'
import { getLanguage, translate, type AppLanguage } from './i18n'

/**
 * Execution record source.
 *
 * Captured when the task is created: switching views changes the current file, but record titles must stay on
 * the file that started the run, so sources are cached per task instead of read from the current view at render time.
 */
export type TaskOrigin =
  /** Main flow execution from a view: ordinary view or subgraph file. */
  | { kind: 'flow'; viewName: string; viewType: ViewType }
  /** Event-triggered execution: records the listener node and event name. */
  | { kind: 'event'; nodeName: string; eventName: string }

/**
 * Execution record title.
 *
 * Three shapes map to three sources: ordinary view, subgraph file, and event trigger,
 * so the panel makes the run's origin obvious at a glance.
 */
export function formatOriginTitle(origin: TaskOrigin, language: AppLanguage = getLanguage()): string {
  if (origin.kind === 'event') {
    return translate(language, 'record.event', {
      node: origin.nodeName,
      event: origin.eventName,
    })
  }
  if (origin.viewType === 'subgraph') {
    return translate(language, 'record.subgraph', { name: origin.viewName })
  }
  return translate(language, 'record.flow', { name: origin.viewName })
}

/**
 * Find nodes that listen for an event.
 *
 * The event name lives in the node's `event` input; the trigger node stores it there too;
 * filter by event name here, and let the caller choose by node role.
 */
export function findEventNodes(json: JsonGraph, eventName: string): JsonNode[] {
  const graphs = [json, ...Object.values(json.subgraphs ?? {})]
  return graphs.flatMap((graph) => graph.nodes).filter((node) => node.values?.event === eventName)
}

/**
 * Pick the listener among matching nodes.
 *
 * A listener is a source node with no execution entry (Event Listen),
 * while a trigger node only emits events; distinguish them by node role.
 */
export function pickListenerNode(
  nodes: JsonNode[],
  isSource: (nodeType: string) => boolean,
): JsonNode | undefined {
  return nodes.find((node) => isSource(node.nodeType)) ?? nodes[0]
}
