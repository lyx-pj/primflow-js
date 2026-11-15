import { dia, mvc } from '@joint/core'
import { Graph } from '../../Graph'

type ArgsType = { paper: dia.Paper, graph: Graph }

export class ScrollerController extends mvc.Listener<[ArgsType]> {
  private _viewport = { x: 0, y: 0, scale: 1 }
  private _isDragging = false
  private _lastClientX = 0
  private _lastClientY = 0
  private _spacePressed = false
  private listeningElement?: HTMLElement
  private previousOverscrollBehavior = ''
  private static ZOOM_SENSITIVITY = 0.005

  get isDragging() {
    return this._isDragging
  }

  get viewport() {
    return this._viewport
  }

  get scale() {
    return this._viewport.scale
  }
  set scale(value: number) {
    this._viewport.scale = value
    this.updatePaperTransform()
  }

  get position() {
    return { x: this._viewport.x, y: this._viewport.y }
  }
  set position(value: { x: number; y: number }) {
    this._viewport.x = value.x
    this._viewport.y = value.y
    this.updatePaperTransform()
  }

  startListening() {
    this.stopListening()
    const [{ paper }] = this.callbackArguments
    this.listeningElement = paper.el
    this.previousOverscrollBehavior = paper.el.style.overscrollBehavior
    paper.el.style.overscrollBehavior = 'none'
    paper.el.addEventListener('keydown', this.onKeyDown)
    paper.el.addEventListener('keyup', this.onKeyUp)
    paper.el.addEventListener('selectstart', this.onSelectStart)
    this.initPaperEvents()
  }

  private initPaperEvents() {
    const [{ paper }] = this.callbackArguments
    const el = paper.el as HTMLElement
    el.addEventListener('mousedown', this.onMouseDown)

    el.addEventListener('mousemove', this.onMouseMove)

    el.addEventListener('mouseup', this.onMouseUp)

    paper.el.addEventListener('selectstart', this.onSelectStart)

    // Allow preventDefault so touchpads cannot scroll pages or trigger browser history navigation.
    el.addEventListener('wheel', this.onMouseWheel, { passive: false })
  }

  private onKeyDown = (e: KeyboardEvent) => {
    const [{ paper }] = this.callbackArguments
    if (e.target !== paper.el) return
    if (e.code === 'Space') {
      this._spacePressed = true
      paper.el.style.cursor = 'grab'
    }
  }

  private onKeyUp = (e: KeyboardEvent) => {
    const [{ paper }] = this.callbackArguments
    if (e.code === 'Space') {
      this._spacePressed = false
      paper.el.style.cursor = ''
    }
  }

  private onMouseDown = (e: MouseEvent) => {
    const [{ paper }] = this.callbackArguments
    const el = paper.el as HTMLElement
    if ((e.button === 0 && this._spacePressed) || (e.button === 2 && !this._spacePressed)) {
      e.stopPropagation()
      e.preventDefault()
      this._isDragging = true
      this._lastClientX = e.clientX
      this._lastClientY = e.clientY
      el.style.cursor = 'grabbing'
    }
  }

  private onMouseMove = (e: MouseEvent) => {
    const [{ paper, graph }] = this.callbackArguments
    if (!this.isDragging) return
    const dx = e.clientX - this._lastClientX
    const dy = e.clientY - this._lastClientY

    this._viewport.x += dx
    this._viewport.y += dy
    paper.translate(this._viewport.x, this._viewport.y)
    graph.emit('viewport:change', this._viewport)

    this._lastClientX = e.clientX
    this._lastClientY = e.clientY
  }

  private onMouseUp = () => {
    const [{ paper }] = this.callbackArguments
    if (this.isDragging) {
      this._isDragging = false
      if (this._spacePressed) paper.el.style.cursor = 'grab'
      else paper.el.style.cursor = ''
    }
  }

  private onMouseWheel = (e: WheelEvent) => {
    const [{ paper, graph }] = this.callbackArguments
    e.preventDefault()
    if (this.isDragging) return
    const rect = paper.el.getBoundingClientRect()
    const mode = e.deltaMode
    // Convert line deltas using container line height (16px for normal), and page deltas using viewport size.
    const lineHeight = mode === WheelEvent.DOM_DELTA_LINE ? parseFloat(getComputedStyle(paper.el).lineHeight) || 16 : 1
    const deltaX = e.deltaX * (mode === WheelEvent.DOM_DELTA_PAGE ? rect.width : lineHeight)
    const deltaY = e.deltaY * (mode === WheelEvent.DOM_DELTA_PAGE ? rect.height : lineHeight)

    // Touchpad pinch uses ctrlKey=true wheel events; ordinary two-finger and wheel scrolling pan.
    if (!e.ctrlKey && !e.metaKey) {
      this.viewport.x -= deltaX
      this.viewport.y -= deltaY
      paper.translate(this.viewport.x, this.viewport.y)
      graph.emit('viewport:change', this._viewport)
      return
    }

    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const localX = (x - this.viewport.x) / this.viewport.scale
    const localY = (y - this.viewport.y) / this.viewport.scale
    this.viewport.scale = Math.min(5, Math.max(0.2, this.viewport.scale - deltaY * ScrollerController.ZOOM_SENSITIVITY))
    this.viewport.x = x - localX * this.viewport.scale
    this.viewport.y = y - localY * this.viewport.scale
    this.updatePaperTransform()

    graph.emit('viewport:change', this._viewport)
  }

  private updatePaperTransform() {
    const [{ paper }] = this.callbackArguments
    paper.scale(this.viewport.scale, this.viewport.scale)
    paper.translate(this.viewport.x, this.viewport.y)
    paper.setGridSize(10 / this.viewport.scale)
  }

  private onSelectStart = (e: Event) => {
    if (this.isDragging) e.preventDefault()
  }

  stopListening(): void {
    super.stopListening()
    // After container changes, Paper.el points to the new element; detach from the actual previous element.
    const el = this.listeningElement
    if (!el) return
    el.removeEventListener('mousedown', this.onMouseDown)
    el.removeEventListener('mousemove', this.onMouseMove)
    el.removeEventListener('mouseup', this.onMouseUp)
    el.removeEventListener('selectstart', this.onSelectStart)
    el.removeEventListener('wheel', this.onMouseWheel)
    el.removeEventListener('keydown', this.onKeyDown)
    el.removeEventListener('keyup', this.onKeyUp)
    el.style.overscrollBehavior = this.previousOverscrollBehavior
    this.listeningElement = undefined
  }
}
