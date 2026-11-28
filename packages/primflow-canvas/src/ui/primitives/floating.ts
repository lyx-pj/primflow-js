import {
  autoUpdate,
  computePosition,
  flip,
  offset,
  shift,
  type Middleware,
  type Placement,
  type ReferenceElement,
} from '@floating-ui/dom'

export type FloatingPlacement = Placement

export interface FloatingPositionOptions {
  placement?: Placement
  offset?: number
  padding?: number
  flip?: boolean
  shift?: boolean
  boundary?: HTMLElement | 'clippingAncestors'
  middleware?: Middleware[]
}

export type FloatingCleanup = () => void

/** Create a virtual reference element from viewport client coordinates. */
export function createVirtualPoint(clientX: number, clientY: number): ReferenceElement {
  return {
    getBoundingClientRect: () => ({
      x: clientX,
      y: clientY,
      top: clientY,
      left: clientX,
      right: clientX,
      bottom: clientY,
      width: 0,
      height: 0,
    }),
  }
}

function buildMiddleware(options: FloatingPositionOptions): Middleware[] {
  const list: Middleware[] = []
  if (options.offset !== undefined) {
    list.push(offset(options.offset))
  }
  if (options.flip !== false) {
    list.push(
      flip({
        padding: options.padding ?? 8,
        ...(options.boundary ? { boundary: options.boundary } : {}),
      })
    )
  }
  if (options.shift !== false) {
    list.push(
      shift({
        padding: options.padding ?? 8,
        ...(options.boundary ? { boundary: options.boundary } : {}),
      })
    )
  }
  if (options.middleware) {
    list.push(...options.middleware)
  }
  return list
}

/**
 * Compute and apply floating coordinates relative to the floating element's
 * offsetParent (or viewport when `strategy === 'fixed'`).
 */
export async function applyFloatingPosition(
  reference: ReferenceElement,
  floating: HTMLElement,
  options: FloatingPositionOptions & { strategy?: 'absolute' | 'fixed' } = {}
): Promise<{ x: number; y: number; placement: Placement } | null> {
  if (!floating.isConnected) return null
  const strategy = options.strategy ?? 'absolute'
  try {
    const result = await computePosition(reference, floating, {
      placement: options.placement ?? 'bottom',
      strategy,
      middleware: buildMiddleware(options),
    })
    if (!floating.isConnected) return null
    floating.style.position = strategy
    floating.style.left = `${Math.round(result.x)}px`
    floating.style.top = `${Math.round(result.y)}px`
    floating.dataset.placement = result.placement
    return { x: result.x, y: result.y, placement: result.placement }
  } catch {
    return null
  }
}

/**
 * Continuously keep a floating element anchored to a reference element.
 * Returns a cleanup callback that detaches Floating UI observers.
 */
export function trackFloatingElement(
  reference: ReferenceElement,
  floating: HTMLElement,
  options: FloatingPositionOptions & { strategy?: 'absolute' | 'fixed' } = {}
): FloatingCleanup {
  const update = () => {
    void applyFloatingPosition(reference, floating, options)
  }
  if (typeof ResizeObserver === 'undefined' || !('getBoundingClientRect' in reference)) {
    update()
    return () => {}
  }
  return autoUpdate(reference, floating, update, {
    ancestorScroll: true,
    ancestorResize: true,
    elementResize: true,
    layoutShift: false,
  })
}
