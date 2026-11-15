import type { dia } from '@joint/core'

export type MinimapBounds = { x: number; y: number; width: number; height: number }

const MINIMAP_PADDING = 400

/** Padded node bounds determine minimap framing only; canvas panning is unlimited. */
export function getMinimapBounds(model: dia.Graph): MinimapBounds {
  const nodes = model.getCellsBBox(model.getElements()) ?? { x: 0, y: 0, width: 0, height: 0 }
  return {
    x: nodes.x - MINIMAP_PADDING,
    y: nodes.y - MINIMAP_PADDING,
    width: nodes.width + MINIMAP_PADDING * 2,
    height: nodes.height + MINIMAP_PADDING * 2,
  }
}
