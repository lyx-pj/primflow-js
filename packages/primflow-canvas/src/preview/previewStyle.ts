import { mergeDeep, type NodeStyle } from '@lyx-pj/primflow-model'
import type { NodeInstanceType } from '../Graph'
import type { CanvasGraph } from '../ui/types'

/** Default link color for previews; the card preview is a dark inset canvas. */
export const PREVIEW_LINK_STROKE = 'rgba(255, 255, 255, 0.5)'

/** Resolve the appearance of one node from the registry, definition, and instance. */
export function resolveNodeStyle(graph: CanvasGraph, node: NodeInstanceType): NodeStyle {
  return mergeDeep(
    mergeDeep(
      (graph.nodeRegistry.nodeStyle ?? {}) as Record<string, unknown>,
      (node.definition.style ?? {}) as Record<string, unknown>,
    ),
    (node.style ?? {}) as Record<string, unknown>,
  ) as NodeStyle
}
