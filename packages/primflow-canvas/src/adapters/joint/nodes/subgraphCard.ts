import { html } from 'lit-html'
import type { NodeInstanceType } from '../../../Graph'
import type { NodeRendererRegistration } from '../../../ui/nodeRenderers'
import type { CanvasGraph } from '../../../ui/types'
import {
  CONTAINER_CARD_COLLAPSED_HEIGHT,
  CONTAINER_CARD_COLLAPSED_WIDTH,
  CONTAINER_CARD_HEIGHT,
  CONTAINER_CARD_WIDTH,
  containerCardPortPosition,
  containerCardSize,
  createContainerCardRenderer,
  createContainerPlaceholderRenderer,
  isContainerCardRenderer,
  type ContainerCardRegistration,
  type ContainerPreviewHost,
} from './containerCard'

/** Stacked-layers glyph that visually distinguishes subgraph cards at a glance. */
const SUBGRAPH_GLYPH = html`
  <svg class="bpgraph-subgraph-glyph" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 3 3 8l9 5 9-5-9-5Z" />
    <path d="M3 13l9 5 9-5" />
    <path d="M3 17.5l9 4.5 9-4.5" />
  </svg>
`

/** Expanded subgraph call card size; owned by the built-in card renderer. */
export const SUBGRAPH_CARD_WIDTH = CONTAINER_CARD_WIDTH
export const SUBGRAPH_CARD_HEIGHT = CONTAINER_CARD_HEIGHT
/** Collapsed subgraph call card size. */
export const SUBGRAPH_CARD_COLLAPSED_WIDTH = CONTAINER_CARD_COLLAPSED_WIDTH
export const SUBGRAPH_CARD_COLLAPSED_HEIGHT = CONTAINER_CARD_COLLAPSED_HEIGHT

/** Card size for one collapse state; shared with the adapter that resizes a toggled card. */
export const subgraphCardSize = containerCardSize

/** Internal marker so the adapter only resizes the built-in card, never an application renderer. */
export type SubgraphCardRegistration = ContainerCardRegistration

export function isSubgraphCardRenderer(
  renderer: NodeRendererRegistration | undefined,
): renderer is SubgraphCardRegistration {
  return isContainerCardRenderer(renderer) && renderer.containerCard === 'subgraph'
}

/** Preview host owned by the canvas; the card only supplies the mount point. */
export type SubgraphPreviewHost = ContainerPreviewHost

/**
 * Place one port on the card border.
 *
 * The title bar stays clear at the top; remaining ports are distributed over
 * the available edge so a card with extra application ports still reads.
 */
export const subgraphCardPortPosition = containerCardPortPosition

/**
 * Built-in presentation for a subgraph call node.
 *
 * The card owns its header, title, breakpoint marker, and preview slot. Ports,
 * links, selection, execution visuals, and double-click navigation keep using
 * the normal node pipeline.
 */
export function createSubgraphCardRenderer(
  graph: CanvasGraph,
  instance: NodeInstanceType,
): NodeRendererRegistration {
  return createContainerCardRenderer(graph, instance, {
    variant: 'subgraph',
    expandLabel: 'Expand subgraph card',
    collapseLabel: 'Collapse subgraph card',
    icon: SUBGRAPH_GLYPH,
    badgeLabel: 'Subgraph',
  })
}

/**
 * Placeholder rendering for a subgraph node that appears inside a preview.
 *
 * Previews never recurse: a nested subgraph call keeps its size and ports but
 * shows a simple labelled card instead of another preview.
 */
export function createSubgraphPlaceholderRenderer(
  graph: CanvasGraph,
  instance: NodeInstanceType,
): NodeRendererRegistration {
  return createContainerPlaceholderRenderer(graph, instance, {
    variant: 'subgraph',
    expandLabel: 'Expand subgraph card',
    collapseLabel: 'Collapse subgraph card',
    badgeLabel: 'Subgraph',
  })
}
