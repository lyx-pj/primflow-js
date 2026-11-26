import { dia, g, V, mvc } from '@joint/core'

type ArgsType = { paper: dia.Paper, className?: string, onSelected: (cells: Array<dia.Element | dia.Link>) => void } 
export class SelectionController extends mvc.Listener<[ArgsType]> {
  private rect?: SVGRectElement
  private startPaperPoint?: g.Point
  private pointerDownTime = 0
  private hasMovedEnough = false
  private static MIN_MOVE_DISTANCE = 3 // px
  private static MIN_PRESS_DURATION = 100 // ms
  startListening() {
    const [{ paper }] = this.callbackArguments
    this.listenTo(paper, 'blank:pointerdown', this.onPointerDown, this)
    this.listenTo(paper, 'blank:pointermove', this.onPointerMove, this)
    this.listenTo(paper, 'blank:pointerup', this.onPointerUp, this)
  }
  private onPointerDown({ paper }: ArgsType, evt: dia.Event) {
    const clientX = (evt as unknown as MouseEvent).clientX
    const clientY = (evt as unknown as MouseEvent).clientY
    const localPoint = paper.clientToLocalPoint(clientX, clientY)
    // The selection rectangle is drawn in the root SVG's coordinate space.
    this.startPaperPoint = paper.localToPaperPoint(localPoint)
    this.pointerDownTime = Date.now()
    this.hasMovedEnough = false
  }

  private onPointerMove({ paper, className }: ArgsType, evt: dia.Event) {
    const startPaperPoint = this.startPaperPoint
    if (!startPaperPoint) return

    const clientX = (evt as unknown as MouseEvent).clientX
    const clientY = (evt as unknown as MouseEvent).clientY

    const localPoint = paper.clientToLocalPoint(clientX, clientY)
    const currentPaperPoint = paper.localToPaperPoint(localPoint)
    const dx = Math.abs(currentPaperPoint.x - startPaperPoint.x)
    const dy = Math.abs(currentPaperPoint.y - startPaperPoint.y)
    const moved = dx > SelectionController.MIN_MOVE_DISTANCE || dy > SelectionController.MIN_MOVE_DISTANCE
    if (!this.hasMovedEnough && moved) {
      const duration = Date.now() - (this.pointerDownTime ?? 0)
      if (duration > SelectionController.MIN_PRESS_DURATION) {
        this.rect = V('rect', {
          x: startPaperPoint.x,
          y: startPaperPoint.y,
          width: 1,
          height: 1,
          class: className ?? '',
          stroke: '#3498db',
          'stroke-width': 1,
          fill: 'rgba(52,152,219,0.15)'
        }).node as SVGRectElement
        paper.svg.appendChild(this.rect)
        this.hasMovedEnough = true
      }
    }

    if (this.rect && this.hasMovedEnough) {
      const x1 = Math.min(startPaperPoint.x, currentPaperPoint.x)
      const y1 = Math.min(startPaperPoint.y, currentPaperPoint.y)
      const x2 = Math.max(startPaperPoint.x, currentPaperPoint.x)
      const y2 = Math.max(startPaperPoint.y, currentPaperPoint.y)

      V(this.rect).attr({
        x: x1,
        y: y1,
        width: x2 - x1,
        height: y2 - y1
      })
    }
  }

  /**
   * Cancel selection before canvas UI interactions such as palette dragging.
   * Avoid retaining the previous drag origin.
   */
  cancel() {
    this.rect?.remove()
    this.rect = undefined
    this.startPaperPoint = undefined
    this.hasMovedEnough = false
  }

  private onPointerUp({ paper, onSelected }: ArgsType, evt: dia.Event) {
    const rect = this.rect
    const startPaperPoint = this.startPaperPoint
    // Clear the drag origin even if the pointer never moved far enough to draw a rectangle.
    this.startPaperPoint = undefined
    this.rect = undefined
    this.hasMovedEnough = false
    if (!rect || !startPaperPoint) return

    const clientX = (evt as unknown as MouseEvent).clientX
    const clientY = (evt as unknown as MouseEvent).clientY

    const currentPoint = paper.clientToLocalPoint(clientX, clientY)

    const startPointLocal = paper.paperToLocalPoint(startPaperPoint)
    const x1 = Math.min(startPointLocal.x, currentPoint.x)
    const y1 = Math.min(startPointLocal.y, currentPoint.y)
    const x2 = Math.max(startPointLocal.x, currentPoint.x)
    const y2 = Math.max(startPointLocal.y, currentPoint.y)

    const bbox = new g.Rect(x1, y1, x2 - x1, y2 - y1)

    const elements = paper.model.getElements()
    const links = paper.model.getLinks()
    const selected = elements.filter(el => bbox.intersect(el.getBBox()))

    const selectedLinks = links.filter(link => {
      const linkView = paper.findViewByModel(link) as dia.LinkView
      if (!linkView) return false
      const path = linkView.findNode('line') as SVGPathElement
      if (!path) return false
      return pathIntersectsRect(path, bbox)
    })

    onSelected([...selected, ...selectedLinks])

    rect.remove()
  }
}

function pathIntersectsRect(path: SVGPathElement, rect: g.Rect): boolean {
  const length = path.getTotalLength()
  const step = 5
  for (let i = 0; i <= length; i += step) {
    const pt = path.getPointAtLength(i)
    if (
      pt.x >= rect.x &&
      pt.x <= rect.x + rect.width &&
      pt.y >= rect.y &&
      pt.y <= rect.y + rect.height
    ) {
      return true
    }
  }
  return false
}
