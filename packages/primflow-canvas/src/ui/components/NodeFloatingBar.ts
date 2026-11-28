import type { dia } from '@joint/core'
import { isControlPort, isSpacerPort, type InputPort, type OutputPort } from '@lyx-pj/primflow-model'
import { html, nothing, type TemplateResult } from 'lit-html'
import type { NodeInstanceType } from '../../Graph'
import { isPortVisible } from '../../utils/ports'
import { OverlayComponent } from '../OverlayComponent'
import type { OverlayLayer } from '../OverlayLayer'
import { stopEvent, stopWheel } from '../helpers'
import { applyFloatingPosition } from '../primitives'
import type {
  CanvasGraph,
  NodeFloatingAction,
  NodeFloatingBarOptions,
  NodeFloatingBarSlotContext,
} from '../types'

const HIDE_DELAY_MS = 260
const HOVER_INTENT_MS = 180
/** Proximity corridor around the active node that keeps floating controls open. */
const PROXIMITY_SIDE_PX = 76
const PROXIMITY_TOP_PX = 56
const PROXIMITY_PAD_PX = 16
/** Magnetic attraction field for side quick-add `+` handles (ComfyUI-style). */
const MAGNETIC_RADIUS_PX = 64
const MAGNETIC_CAPTURE_PX = 30
const MAGNETIC_MAX_TRAVEL_PX = 32
const NODE_EDGE_CLEARANCE_PX = 14
const QUICK_ADD_HALF_SIZE = 12
/** Exponential damping rates (1/s) for smooth 60–120fps rAF magnetic motion. */
const MAGNETIC_FOLLOW_RATE = 28
const MAGNETIC_RETURN_RATE = 18
const MAGNETIC_EPSILON_PX = 0.15

type MagneticHandleState = {
  x: number
  y: number
  tx: number
  ty: number
  active: boolean
}

const ICONS = {
  widgets: 'M4 7h16M4 17h16M9 7a2 2 0 1 0 0 .01M15 17a2 2 0 1 0 0 .01',
  breakpoint:
    'M8 8h8a2 2 0 0 1 2 2v6a6 6 0 0 1-12 0v-6a2 2 0 0 1 2-2Z M9 8V6a3 3 0 0 1 6 0v2 M8 2l2 2 M16 2l-2 2 M12 9v12',
  duplicate: 'M8 8h12v12H8z M16 8V4H4v12h4',
  inspect: 'M4 4h16a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z M15 4v16',
  delete: 'M4 6h16 M9 6V3h6v3 M6 6l1 15h10l1-15 M10 10v7 M14 10v7',
  plus: 'M12 5v14M5 12h14',
}

export interface NodeFloatingBarCallbacks {
  openQuickAdd: (node: NodeInstanceType, direction: 'in' | 'out', triggerEl?: HTMLElement) => void
  inspectNode: (node: NodeInstanceType) => void
  selectOnly: (node: NodeInstanceType) => void
  canToggleWidgets?: (node: NodeInstanceType) => boolean
  isWidgetsOpen?: (node: NodeInstanceType) => boolean
  openWidgets?: (node: NodeInstanceType) => void
  closeWidgets?: () => void
  toggleWidgets?: (node: NodeInstanceType) => void
}

/**
 * Floating node action bar and side quick-add `+` handles.
 *
 * Appears on node hover or single-node selection, anchored to the node element
 * via Floating UI so it tracks pan, zoom, and dragging cleanly. Consumers can
 * customize actions via `GraphOptions.nodeFloatingBar` or replace the entire
 * control via `GraphOptions.ui.nodeFloatingBar`.
 */
export class NodeFloatingBar extends OverlayComponent {
  private readonly graph: CanvasGraph
  private readonly paper: dia.Paper
  private readonly options: () => NodeFloatingBarOptions | null
  private readonly callbacks: NodeFloatingBarCallbacks

  private hoveredNode: NodeInstanceType | null = null
  private selectedNode: NodeInstanceType | null = null
  private nodeHovered = false
  private controlsHovered = false
  private inProximity = false
  private trackingPointer = false
  private restAnchors: { in?: { x: number; y: number }; out?: { x: number; y: number } } = {}
  private lastPointer: { x: number; y: number; target: EventTarget | null } | null = null
  private cachedNodeRect: DOMRect | null = null
  private cachedInBtn: HTMLElement | null = null
  private cachedOutBtn: HTMLElement | null = null
  private readonly magnetic: Record<'in' | 'out', MagneticHandleState> = {
    in: { x: 0, y: 0, tx: 0, ty: 0, active: false },
    out: { x: 0, y: 0, tx: 0, ty: 0, active: false },
  }
  private magneticRafId: number | null = null
  private magneticLastTime = 0
  private lastRenderedNodeId: string | null = null
  private draggedNodeId: string | null = null
  private connecting = false
  private showTimer: ReturnType<typeof setTimeout> | null = null
  private hideTimer: ReturnType<typeof setTimeout> | null = null
  private rafId: number | null = null
  private resizeObserver: ResizeObserver | null = null
  private observedElements = new Set<Element>()
  private suppressed = false

  constructor(
    graph: CanvasGraph,
    paper: dia.Paper,
    overlay: OverlayLayer,
    options: () => NodeFloatingBarOptions | null,
    callbacks: NodeFloatingBarCallbacks
  ) {
    super(overlay, 'bpgraph-node-floating-layer', () => graph.options.language)
    this.graph = graph
    this.paper = paper
    this.options = options
    this.callbacks = callbacks
    this.graph.on('node:dragmove', this.onNodeDragMove)
    this.graph.on('node:changed', this.onNodeChanged)
    this.graph.on('node:removed', this.onNodesRemoved)
    this.graph.on('viewport:change', this.schedulePosition)
    this.graph.on('start:connecting', this.onStartConnecting)
    this.paper.on('scale', this.schedulePosition)
    this.paper.on('translate', this.schedulePosition)
    this.paper.model.on('reset', this.onModelReset)
    this.paper.model.on('remove', this.onModelRemove)
  }

  refreshLanguage() {
    this.render()
  }

  refresh() {
    this.render()
  }

  /** Hide temporarily while modal palettes, context menus, or replays are active. */
  setSuppressed(suppressed: boolean) {
    if (this.suppressed === suppressed) return
    this.suppressed = suppressed
    this.render()
  }

  setSelectedNode(node: NodeInstanceType | null) {
    if (node?.id !== this.selectedNode?.id) {
      this.draggedNodeId = null
    }
    this.selectedNode = node
    this.render()
  }

  enterNode(node: NodeInstanceType) {
    if (this.connecting) return
    this.cancelHide()
    if (this.draggedNodeId === node.id) {
      this.draggedNodeId = null
    }
    if (this.hoveredNode?.id === node.id) {
      this.nodeHovered = true
      return
    }
    // Delay hover appearance slightly so quick pointer sweeps and port drags stay unobstructed.
    this.cancelShow()
    this.showTimer = setTimeout(() => {
      this.showTimer = null
      if (this.connecting || this.suppressed) return
      if (this.graph.findNode(node.id) !== node) return
      this.hoveredNode = node
      this.nodeHovered = true
      this.render()
    }, HOVER_INTENT_MS)
  }

  leaveNode(node: NodeInstanceType) {
    this.cancelShow()
    if (this.hoveredNode?.id !== node.id) return
    this.nodeHovered = false
    if (!this.controlsHovered && !this.inProximity) {
      this.scheduleHideHover()
    }
  }

  clear() {
    this.cancelShow()
    this.cancelHide()
    this.cancelFrame()
    this.stopPointerTracking()
    this.hoveredNode = null
    this.nodeHovered = false
    this.controlsHovered = false
    this.inProximity = false
    this.restAnchors = {}
    this.lastPointer = null
    this.render()
  }

  override destroy() {
    this.cancelShow()
    this.cancelHide()
    this.cancelFrame()
    this.disconnectResizeObserver()
    this.stopPointerTracking()
    this.endConnecting()
    this.graph.off('node:dragmove', this.onNodeDragMove)
    this.graph.off('node:changed', this.onNodeChanged)
    this.graph.off('node:removed', this.onNodesRemoved)
    this.graph.off('viewport:change', this.schedulePosition)
    this.graph.off('start:connecting', this.onStartConnecting)
    this.paper.off('scale', this.schedulePosition)
    this.paper.off('translate', this.schedulePosition)
    this.paper.model.off('reset', this.onModelReset)
    this.paper.model.off('remove', this.onModelRemove)
    super.destroy()
  }

  private cancelShow() {
    if (this.showTimer !== null) {
      clearTimeout(this.showTimer)
      this.showTimer = null
    }
  }

  private onNodesRemoved = () => {
    this.pruneMissingNodes()
  }

  private onModelRemove = (cell: dia.Cell) => {
    if (!cell.isElement()) return
    const id = String(cell.id)
    if (this.selectedNode?.id === id) this.selectedNode = null
    if (this.hoveredNode?.id === id) this.hoveredNode = null
    if (this.draggedNodeId === id) this.draggedNodeId = null
    this.render()
  }

  private pruneMissingNodes() {
    if (this.selectedNode && this.graph.findNode(this.selectedNode.id) !== this.selectedNode) {
      this.selectedNode = null
    }
    if (this.hoveredNode && this.graph.findNode(this.hoveredNode.id) !== this.hoveredNode) {
      this.hoveredNode = null
    }
    this.render()
  }

  private onModelReset = () => {
    this.selectedNode = null
    this.draggedNodeId = null
    this.clear()
  }

  /** Hide floating chrome during drag so repositioning a node never obscures canvas drop/dblclick zones. */
  private onNodeDragMove = (node?: NodeInstanceType) => {
    const id = node?.id ?? this.selectedNode?.id ?? this.hoveredNode?.id ?? null
    if (!id) return
    const changed = this.draggedNodeId !== id || this.hoveredNode !== null
    this.draggedNodeId = id
    this.hoveredNode = null
    this.controlsHovered = false
    this.cancelHide()
    this.cancelFrame()
    if (changed) this.render()
  }

  private onStartConnecting = () => {
    this.connecting = true
    this.clear()
    window.addEventListener('pointerup', this.endConnecting, true)
    window.addEventListener('pointercancel', this.endConnecting, true)
    window.addEventListener('mouseup', this.endConnecting, true)
  }

  private endConnecting = () => {
    if (!this.connecting) return
    this.connecting = false
    window.removeEventListener('pointerup', this.endConnecting, true)
    window.removeEventListener('pointercancel', this.endConnecting, true)
    window.removeEventListener('mouseup', this.endConnecting, true)
  }

  private cancelFrame() {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
    this.stopMagneticLoop()
  }

  private stopMagneticLoop() {
    if (this.magneticRafId !== null) {
      cancelAnimationFrame(this.magneticRafId)
      this.magneticRafId = null
    }
    this.magneticLastTime = 0
  }

  /** Resolve the active node: hover takes priority so users can quick-add on any node. */
  private activeNode(): NodeInstanceType | null {
    if (this.suppressed || this.connecting || this.graph.isReplayMode()) return null
    if (this.graph.executionStatus !== 'idle') return null
    const candidate = this.hoveredNode ?? this.selectedNode
    if (!candidate) return null
    if (this.draggedNodeId === candidate.id && !this.hoveredNode) return null
    // Ensure the node still exists in the current view.
    return this.graph.findNode(candidate.id) === candidate ? candidate : null
  }

  private anchorElement(node: NodeInstanceType): Element | null {
    const view = this.paper.findViewByModel(node.id)
    return view?.el ?? null
  }

  private onNodeChanged = (node: NodeInstanceType) => {
    const active = this.activeNode()
    if (active && active.id === node.id) {
      this.render()
    }
  }

  private cancelHide() {
    if (this.hideTimer !== null) {
      clearTimeout(this.hideTimer)
      this.hideTimer = null
    }
  }

  private scheduleHideHover() {
    this.cancelHide()
    this.hideTimer = setTimeout(() => {
      this.hideTimer = null
      if (this.controlsHovered || this.inProximity || this.nodeHovered) return
      this.hoveredNode = null
      this.render()
    }, HIDE_DELAY_MS)
  }

  private onControlEnter = () => {
    this.controlsHovered = true
    this.cancelHide()
  }

  private onControlLeave = () => {
    this.controlsHovered = false
    if (this.hoveredNode && !this.inProximity && !this.nodeHovered) {
      this.scheduleHideHover()
    }
  }

  private startPointerTracking() {
    if (this.trackingPointer || typeof window === 'undefined') return
    this.trackingPointer = true
    window.addEventListener('pointermove', this.onWindowPointerMove, { passive: true })
  }

  private stopPointerTracking() {
    if (!this.trackingPointer || typeof window === 'undefined') return
    this.trackingPointer = false
    window.removeEventListener('pointermove', this.onWindowPointerMove)
  }

  /**
   * Keep the floating bar & `+` buttons alive inside a generous proximity
   * corridor around the active node, and magnetically attract side `+`
   * handles toward the cursor as it approaches (ComfyUI-style).
   */
  private onWindowPointerMove = (evt: PointerEvent) => {
    this.lastPointer = { x: evt.clientX, y: evt.clientY, target: evt.target }
    const node = this.activeNode()
    if (!node) {
      this.inProximity = false
      this.resetMagneticHandles()
      return
    }
    const rect = this.cachedNodeRect ?? this.anchorElement(node)?.getBoundingClientRect() ?? null
    if (!rect || (rect.width <= 0 && rect.height <= 0)) return
    this.cachedNodeRect = rect

    const opts = this.options()
    const placement = opts?.placement ?? 'top'
    const inBtn = this.cachedInBtn?.isConnected ? this.cachedInBtn : null
    const outBtn = this.cachedOutBtn?.isConnected ? this.cachedOutBtn : null
    const x = evt.clientX
    const y = evt.clientY

    const topPad = placement === 'bottom' ? PROXIMITY_PAD_PX : PROXIMITY_TOP_PX
    const bottomPad = placement === 'bottom' ? PROXIMITY_TOP_PX : PROXIMITY_PAD_PX
    const inMainCorridor =
      x >= rect.left - 12 &&
      x <= rect.right + 12 &&
      y >= rect.top - topPad &&
      y <= rect.bottom + bottomPad
    const inLeftCorridor =
      Boolean(inBtn) &&
      x >= rect.left - PROXIMITY_SIDE_PX &&
      x <= rect.left + 12 &&
      y >= rect.top - PROXIMITY_PAD_PX &&
      y <= rect.bottom + PROXIMITY_PAD_PX
    const inRightCorridor =
      Boolean(outBtn) &&
      x >= rect.right - 12 &&
      x <= rect.right + PROXIMITY_SIDE_PX &&
      y >= rect.top - PROXIMITY_PAD_PX &&
      y <= rect.bottom + PROXIMITY_PAD_PX

    const nextProximity = inMainCorridor || inLeftCorridor || inRightCorridor
    if (nextProximity) {
      this.inProximity = true
      this.cancelHide()
    } else if (this.inProximity) {
      this.inProximity = false
      if (!this.controlsHovered && !this.nodeHovered && this.hoveredNode) {
        this.scheduleHideHover()
      }
    }

    this.applyMagneticPull(inBtn, outBtn, rect, x, y, evt.target)
  }

  private applyMagneticPull(
    inBtn: HTMLElement | null,
    outBtn: HTMLElement | null,
    nodeRect: DOMRect,
    x: number,
    y: number,
    target: EventTarget | null
  ) {
    // Yield immediately when hovering a port magnet so link wiring stays unobstructed.
    const overPort = Boolean(
      target instanceof Element && target.closest('[data-port-kind], [magnet]')
    )
    this.updateMagneticTarget(inBtn, this.restAnchors.in, 'in', nodeRect, x, y, overPort)
    this.updateMagneticTarget(outBtn, this.restAnchors.out, 'out', nodeRect, x, y, overPort)
    this.ensureMagneticLoop()
  }

  private updateMagneticTarget(
    el: HTMLElement | null,
    rest: { x: number; y: number } | undefined,
    direction: 'in' | 'out',
    nodeRect: DOMRect,
    x: number,
    y: number,
    overPort: boolean
  ) {
    const state = this.magnetic[direction]
    if (!el || !rest) {
      state.tx = 0
      state.ty = 0
      state.active = false
      return
    }
    const outsideSide = direction === 'in' ? x <= nodeRect.left - 2 : x >= nodeRect.right + 2
    const dist = Math.hypot(x - rest.x, y - rest.y)
    if (overPort || !outsideSide || dist > MAGNETIC_RADIUS_PX) {
      state.tx = 0
      state.ty = 0
      if (state.active) {
        state.active = false
        el.classList.remove('is-magnetic')
      }
      return
    }
    // Smoothstep attraction: 100% under the cursor inside capture radius, tapering to 0 at outer edge.
    const linear =
      dist <= MAGNETIC_CAPTURE_PX
        ? 1
        : Math.max(0, 1 - (dist - MAGNETIC_CAPTURE_PX) / (MAGNETIC_RADIUS_PX - MAGNETIC_CAPTURE_PX))
    const pull = linear * linear * (3 - 2 * linear)
    let dx = (x - rest.x) * pull
    let dy = (y - rest.y) * pull
    const travel = Math.hypot(dx, dy)
    if (travel > MAGNETIC_MAX_TRAVEL_PX) {
      const scale = MAGNETIC_MAX_TRAVEL_PX / travel
      dx *= scale
      dy *= scale
    }
    // Never pull the button into the node's border or port column.
    if (direction === 'in') {
      const maxCenterX = nodeRect.left - NODE_EDGE_CLEARANCE_PX
      if (rest.x + dx > maxCenterX) dx = maxCenterX - rest.x
    } else {
      const minCenterX = nodeRect.right + NODE_EDGE_CLEARANCE_PX
      if (rest.x + dx < minCenterX) dx = minCenterX - rest.x
    }
    state.tx = dx
    state.ty = dy
    if (!state.active) {
      state.active = true
      el.classList.add('is-magnetic')
    }
  }

  private ensureMagneticLoop() {
    if (this.magneticRafId !== null) return
    const needsWork = (['in', 'out'] as const).some((dir) => {
      const s = this.magnetic[dir]
      return Math.abs(s.tx - s.x) >= MAGNETIC_EPSILON_PX || Math.abs(s.ty - s.y) >= MAGNETIC_EPSILON_PX
    })
    if (!needsWork) return
    this.magneticLastTime = performance.now()
    this.magneticRafId = requestAnimationFrame(this.stepMagnetic)
  }

  private stepMagnetic = (now: number) => {
    this.magneticRafId = null
    const dt = Math.min(0.05, Math.max(0.001, (now - this.magneticLastTime) / 1000))
    this.magneticLastTime = now

    let keepGoing = false
    for (const dir of ['in', 'out'] as const) {
      const el = dir === 'in' ? this.cachedInBtn : this.cachedOutBtn
      const state = this.magnetic[dir]
      if (!el || !el.isConnected) {
        state.x = 0
        state.y = 0
        state.tx = 0
        state.ty = 0
        state.active = false
        continue
      }
      const dx = state.tx - state.x
      const dy = state.ty - state.y
      if (Math.hypot(dx, dy) < MAGNETIC_EPSILON_PX) {
        state.x = state.tx
        state.y = state.ty
      } else {
        const rate = state.active ? MAGNETIC_FOLLOW_RATE : MAGNETIC_RETURN_RATE
        const alpha = 1 - Math.exp(-rate * dt)
        state.x += dx * alpha
        state.y += dy * alpha
        keepGoing = true
      }
      if (state.x === 0 && state.y === 0) {
        if (el.style.transform) el.style.transform = ''
      } else {
        el.style.transform = `translate3d(${state.x.toFixed(2)}px, ${state.y.toFixed(2)}px, 0)`
      }
    }

    if (keepGoing) {
      this.magneticRafId = requestAnimationFrame(this.stepMagnetic)
    }
  }

  private resetMagneticHandles() {
    this.stopMagneticLoop()
    for (const dir of ['in', 'out'] as const) {
      const state = this.magnetic[dir]
      state.x = 0
      state.y = 0
      state.tx = 0
      state.ty = 0
      state.active = false
    }
    for (const el of this.host.querySelectorAll<HTMLElement>('.pf-node-quick-add')) {
      el.classList.remove('is-magnetic')
      el.style.transform = ''
    }
  }

  private schedulePosition = () => {
    if (this.rafId !== null || !this.activeNode()) return
    this.rafId = requestAnimationFrame(() => {
      this.rafId = null
      this.positionControls()
    })
  }

  private defaultActions(node: NodeInstanceType): NodeFloatingAction[] {
    const canBreakpoint = !node.definition?.valueOutputs
    const canDelete = this.canDeleteNode(node)
    const canWidgets = Boolean(this.callbacks.canToggleWidgets?.(node))
    const widgetsOpen = Boolean(this.callbacks.isWidgetsOpen?.(node))
    return [
      ...(canWidgets
        ? [
            {
              id: 'widgets',
              label: this.t('Quick inputs'),
              iconPath: ICONS.widgets,
              active: widgetsOpen,
              run: () => {
                const wasOpen = Boolean(this.callbacks.isWidgetsOpen?.(node))
                this.callbacks.selectOnly(node)
                if (wasOpen) {
                  this.callbacks.closeWidgets?.()
                } else if (this.callbacks.openWidgets) {
                  this.callbacks.openWidgets(node)
                } else {
                  this.callbacks.toggleWidgets?.(node)
                }
                this.render()
              },
            },
          ]
        : []),
      ...(canBreakpoint
        ? [
            {
              id: 'breakpoint',
              label: node.breakpoint ? this.t('Remove breakpoint') : this.t('Set breakpoint'),
              iconPath: ICONS.breakpoint,
              active: Boolean(node.breakpoint),
              run: () => {
                node.breakpoint = !node.breakpoint
                this.render()
              },
            },
          ]
        : []),
      {
        id: 'duplicate',
        label: this.t('Duplicate'),
        iconPath: ICONS.duplicate,
        run: () => {
          this.callbacks.selectOnly(node)
          this.graph.copySelection()
          this.graph.pasteClipboard()
        },
      },
      {
        id: 'inspect',
        label: this.t('Inspect node'),
        iconPath: ICONS.inspect,
        run: () => this.callbacks.inspectNode(node),
      },
      {
        id: 'delete',
        label: this.t('Delete'),
        iconPath: ICONS.delete,
        danger: true,
        disabled: !canDelete,
        run: () => {
          if (!canDelete) return
          this.graph.removeNodes([node])
        },
      },
    ]
  }

  private canDeleteNode(node: NodeInstanceType): boolean {
    const kind = node.kind ?? node.type
    if (kind === 'loop-entry' || kind === 'loop-return') return false
    if (kind === 'end' && this.graph.model.subgraphStack.length > 1) return false
    if (kind === 'start') {
      if (this.graph.model.subgraphStack.length > 1) return false
      const startNodes = this.graph.getNodes().filter((n) => (n.kind ?? n.type) === 'start')
      return startNodes.length > 1
    }
    return true
  }

  private hasConnectablePort(node: NodeInstanceType, direction: 'in' | 'out'): boolean {
    const ports: readonly (InputPort | OutputPort)[] = direction === 'in' ? (node.inputs ?? []) : (node.outputs ?? [])
    return ports.some((port) => !isSpacerPort(port.type) && isPortVisible(port, direction))
  }

  private render() {
    const opts = this.options()
    const node = opts ? this.activeNode() : null
    const anchor = node ? this.anchorElement(node) : null
    const visible = Boolean(opts && node && anchor)
    const actions = visible && node ? (opts?.actions?.(node, this.graph) ?? this.defaultActions(node)) : []
    const quickAddEnabled = opts?.quickAdd !== false
    const canQuickAddIn = Boolean(visible && node && quickAddEnabled && this.hasConnectablePort(node, 'in'))
    const canQuickAddOut = Boolean(visible && node && quickAddEnabled && this.hasConnectablePort(node, 'out'))

    const slotContext: NodeFloatingBarSlotContext = {
      graph: this.graph,
      language: this.currentLanguage(),
      t: this.t,
      visible,
      node: visible ? node : null,
      anchor: visible ? anchor : null,
      actions,
      canQuickAddIn,
      canQuickAddOut,
      runAction: (action) => this.runAction(action, node),
      openQuickAdd: (direction, triggerEl) => {
        if (node) this.callbacks.openQuickAdd(node, direction, triggerEl)
      },
    }

    if (this.syncSlot(this.graph.options.ui?.nodeFloatingBar, slotContext)) {
      this.disconnectResizeObserver()
      this.stopPointerTracking()
      return
    }

    if (!visible || !node || !anchor) {
      this.disconnectResizeObserver()
      this.stopPointerTracking()
      this.resetMagneticHandles()
      this.inProximity = false
      this.restAnchors = {}
      this.cachedNodeRect = null
      this.cachedInBtn = null
      this.cachedOutBtn = null
      this.lastRenderedNodeId = null
      this.commit(nothing)
      return
    }

    if (this.lastRenderedNodeId !== node.id) {
      this.lastRenderedNodeId = node.id
      this.resetMagneticHandles()
    }

    this.startPointerTracking()

    this.commit(html`
      ${actions.length > 0
        ? html`
            <pf-surface
              variant="pill"
              elevated
              class="pf-node-floating-bar"
              role="toolbar"
              aria-label=${this.t('Quick actions')}
              data-node-id=${node.id}
              @mouseenter=${this.onControlEnter}
              @mouseleave=${this.onControlLeave}
              @pointerdown=${stopEvent}
              @wheel=${stopWheel}
            >
              ${actions.map((action) => this.actionTemplate(action, node))}
            </pf-surface>
          `
        : nothing}
      ${canQuickAddIn
        ? html`
            <div
              class="pf-node-quick-add is-in"
              data-direction="in"
              data-node-id=${node.id}
              @mouseenter=${this.onControlEnter}
              @mouseleave=${this.onControlLeave}
              @pointerdown=${stopEvent}
              @wheel=${stopWheel}
            >
              <pf-tooltip content=${this.t('Add upstream node')} placement="left">
                <button
                  type="button"
                  class="pf-node-quick-add-btn"
                  aria-label=${this.t('Add upstream node')}
                  data-quick-add="in"
                  @click=${(evt: MouseEvent) =>
                    this.callbacks.openQuickAdd(node, 'in', evt.currentTarget as HTMLElement)}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true">
                    <path d=${ICONS.plus} />
                  </svg>
                </button>
              </pf-tooltip>
            </div>
          `
        : nothing}
      ${canQuickAddOut
        ? html`
            <div
              class="pf-node-quick-add is-out"
              data-direction="out"
              data-node-id=${node.id}
              @mouseenter=${this.onControlEnter}
              @mouseleave=${this.onControlLeave}
              @pointerdown=${stopEvent}
              @wheel=${stopWheel}
            >
              <pf-tooltip content=${this.t('Add downstream node')} placement="right">
                <button
                  type="button"
                  class="pf-node-quick-add-btn"
                  aria-label=${this.t('Add downstream node')}
                  data-quick-add="out"
                  @click=${(evt: MouseEvent) =>
                    this.callbacks.openQuickAdd(node, 'out', evt.currentTarget as HTMLElement)}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true">
                    <path d=${ICONS.plus} />
                  </svg>
                </button>
              </pf-tooltip>
            </div>
          `
        : nothing}
    `)

    this.observeControlSizes()
    this.positionControls()
  }

  /**
   * Re-position controls whenever async Web Component children (such as
   * `<pf-surface>` and `<sl-tooltip>`) finish upgrading and change layout size.
   */
  private observeControlSizes() {
    if (typeof ResizeObserver === 'undefined') return
    if (!this.resizeObserver) {
      this.resizeObserver = new ResizeObserver(() => {
        this.schedulePosition()
      })
    }
    const next = new Set<Element>()
    for (const el of this.host.querySelectorAll('.pf-node-floating-bar, .pf-node-quick-add')) {
      next.add(el)
      if (!this.observedElements.has(el)) {
        this.resizeObserver.observe(el)
      }
    }
    for (const prev of this.observedElements) {
      if (!next.has(prev)) {
        this.resizeObserver.unobserve(prev)
      }
    }
    this.observedElements = next
  }

  private disconnectResizeObserver() {
    this.resizeObserver?.disconnect()
    this.observedElements.clear()
  }

  private actionTemplate(action: NodeFloatingAction, node: NodeInstanceType): TemplateResult {
    return html`
      <pf-tooltip content=${action.title ?? action.label} placement="top" ?disabled=${Boolean(action.disabled)}>
        <button
          type="button"
          class=${`pf-node-floating-btn${action.active ? ' is-active' : ''}${action.danger ? ' is-danger' : ''}`}
          aria-label=${action.label}
          aria-pressed=${action.active === undefined ? nothing : String(action.active)}
          data-floating-action=${action.id}
          ?disabled=${Boolean(action.disabled)}
          @click=${() => this.runAction(action, node)}
        >
          ${action.iconPath
            ? html`<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d=${action.iconPath} />
              </svg>`
            : action.iconClass
              ? html`<i class=${action.iconClass} aria-hidden="true"></i>`
              : action.label}
        </button>
      </pf-tooltip>
    `
  }

  private runAction(action: NodeFloatingAction, node: NodeInstanceType | null) {
    if (!node || action.disabled) return
    action.run({ graph: this.graph, node })
  }

  private positionControls() {
    const node = this.activeNode()
    if (!node) return
    const anchor = this.anchorElement(node)
    if (!anchor) return
    const opts = this.options()
    const placement = opts?.placement ?? 'top'

    const bar = this.host.querySelector<HTMLElement>('.pf-node-floating-bar')
    const inBtn = this.host.querySelector<HTMLElement>('.pf-node-quick-add.is-in')
    const outBtn = this.host.querySelector<HTMLElement>('.pf-node-quick-add.is-out')
    this.cachedInBtn = inBtn
    this.cachedOutBtn = outBtn

    // Synchronous placement fallback (also keeps jsdom deterministic).
    const bounds = this.overlay.rect()
    const rect = anchor.getBoundingClientRect()
    this.cachedNodeRect = rect
    if (bar) {
      const barWidth = bar.offsetWidth || 120
      const barHeight = bar.offsetHeight || 34
      const x = rect.right - bounds.left - barWidth
      const y = placement === 'bottom' ? rect.bottom - bounds.top + 6 : rect.top - bounds.top - barHeight - 6
      bar.style.left = `${Math.round(x)}px`
      bar.style.top = `${Math.round(y)}px`
      if (bounds.width > 0 && bounds.height > 0) {
        void applyFloatingPosition(anchor, bar, {
          placement: placement === 'bottom' ? 'bottom-end' : 'top-end',
          offset: 6,
          padding: 8,
          boundary: this.overlay.root,
        })
      }
    }
    this.restAnchors = {}
    if (inBtn) {
      const fallbackLeft = Math.round(rect.left - bounds.left - 30)
      const fallbackTop = Math.round(rect.top - bounds.top + rect.height / 2 - QUICK_ADD_HALF_SIZE)
      inBtn.style.left = `${fallbackLeft}px`
      inBtn.style.top = `${fallbackTop}px`
      this.restAnchors.in = {
        x: bounds.left + fallbackLeft + QUICK_ADD_HALF_SIZE,
        y: bounds.top + fallbackTop + QUICK_ADD_HALF_SIZE,
      }
      if (bounds.width > 0 && bounds.height > 0) {
        void applyFloatingPosition(anchor, inBtn, {
          placement: 'left',
          offset: 10,
          flip: false,
          padding: 6,
          boundary: this.overlay.root,
        }).then((pos) => {
          if (!pos || !inBtn.isConnected) return
          const currentBounds = this.overlay.rect()
          this.restAnchors.in = {
            x: currentBounds.left + pos.x + QUICK_ADD_HALF_SIZE,
            y: currentBounds.top + pos.y + QUICK_ADD_HALF_SIZE,
          }
          if (this.lastPointer) {
            this.applyMagneticPull(
              inBtn,
              outBtn,
              anchor.getBoundingClientRect(),
              this.lastPointer.x,
              this.lastPointer.y,
              this.lastPointer.target
            )
          }
        })
      }
    }
    if (outBtn) {
      const fallbackLeft = Math.round(rect.right - bounds.left + 8)
      const fallbackTop = Math.round(rect.top - bounds.top + rect.height / 2 - QUICK_ADD_HALF_SIZE)
      outBtn.style.left = `${fallbackLeft}px`
      outBtn.style.top = `${fallbackTop}px`
      this.restAnchors.out = {
        x: bounds.left + fallbackLeft + QUICK_ADD_HALF_SIZE,
        y: bounds.top + fallbackTop + QUICK_ADD_HALF_SIZE,
      }
      if (bounds.width > 0 && bounds.height > 0) {
        void applyFloatingPosition(anchor, outBtn, {
          placement: 'right',
          offset: 10,
          flip: false,
          padding: 6,
          boundary: this.overlay.root,
        }).then((pos) => {
          if (!pos || !outBtn.isConnected) return
          const currentBounds = this.overlay.rect()
          this.restAnchors.out = {
            x: currentBounds.left + pos.x + QUICK_ADD_HALF_SIZE,
            y: currentBounds.top + pos.y + QUICK_ADD_HALF_SIZE,
          }
          if (this.lastPointer) {
            this.applyMagneticPull(
              inBtn,
              outBtn,
              anchor.getBoundingClientRect(),
              this.lastPointer.x,
              this.lastPointer.y,
              this.lastPointer.target
            )
          }
        })
      }
    }
  }
}

/** Pick the preferred port on a node when initiating quick-add from a side `+` trigger. */
export function pickQuickAddPort(
  node: NodeInstanceType,
  direction: 'in' | 'out'
): InputPort | OutputPort | null {
  const ports: readonly (InputPort | OutputPort)[] = direction === 'in' ? (node.inputs ?? []) : (node.outputs ?? [])
  const visible = ports.filter((port) => !isSpacerPort(port.type) && isPortVisible(port, direction))
  if (visible.length === 0) return null
  // Prefer execution flow ports first so workflow chaining feels effortless.
  return visible.find((port) => isControlPort(port.type)) ?? visible[0]
}
