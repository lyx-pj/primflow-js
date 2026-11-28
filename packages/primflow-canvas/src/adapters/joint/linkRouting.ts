import { connectors, type dia } from '@joint/core'

export interface Point2D {
  x: number
  y: number
}

export interface Rect2D {
  x: number
  y: number
  width: number
  height: number
}

export type HorizontalDirection = 'left' | 'right'

export interface ObstacleRouteInput {
  sourcePoint: Point2D
  targetPoint: Point2D
  sourceDirection: HorizontalDirection
  targetDirection: HorizontalDirection
  sourceRect?: Rect2D | null
  targetRect?: Rect2D | null
  obstacles: readonly Rect2D[]
  margin?: number
}

const DEFAULT_OBSTACLE_MARGIN = 16
const ENDPOINT_OBSTACLE_MARGIN = 14
const STUB_LENGTH = 20
const OUTER_LANE_OFFSET = 26
const CORRIDOR_PADDING = 48
const COORD_MERGE_EPS = 2
const MIDPOINT_MIN_GAP = 14
const TURN_PENALTY = 44
const MARGIN_PENALTY_BASE = 80
const MARGIN_PENALTY_PER_PX = 8
const BODY_PENALTY_BASE = 2000
const BODY_PENALTY_PER_PX = 100
const EDGE_HUG_EPS = 1
const EDGE_HUG_PENALTY_PER_PX = 0.005
const COST_EPS = 1e-6
const ROUTED_CORNER_RADIUS = 16

// JointJS `connectors.curve` default parameters (distanceCoefficient=0.6,
// angleTangentCoefficient=80, tension=0.5). Keeping these in sync ensures the
// direct-curve collision test samples the exact Bezier that the connector draws.
const CURVE_DISTANCE_COEFF = 0.6
const CURVE_ANGLE_TANGENT_COEFF = 80
const CURVE_TENSION = 0.5
const CURVE_BEZIER_SCALE = 1 / (6 * CURVE_TENSION * CURVE_TENSION)

function isFinitePoint(p: Point2D | null | undefined): p is Point2D {
  return Boolean(p && Number.isFinite(p.x) && Number.isFinite(p.y))
}

function isFiniteRect(r: Rect2D | null | undefined): r is Rect2D {
  return Boolean(
    r &&
    Number.isFinite(r.x) &&
    Number.isFinite(r.y) &&
    Number.isFinite(r.width) &&
    Number.isFinite(r.height) &&
    r.width > 0 &&
    r.height > 0
  )
}

function inflateRect(rect: Rect2D, pad: number): Rect2D {
  return {
    x: rect.x - pad,
    y: rect.y - pad,
    width: rect.width + pad * 2,
    height: rect.height + pad * 2,
  }
}

export function rectsIntersect(a: Rect2D, b: Rect2D): boolean {
  return (
    a.x <= b.x + b.width &&
    a.x + a.width >= b.x &&
    a.y <= b.y + b.height &&
    a.y + a.height >= b.y
  )
}

function segmentHugsRectBoundary(
  a: Point2D,
  b: Point2D,
  rect: Rect2D,
  horizontal: boolean
): boolean {
  if (horizontal) {
    const y = a.y
    if (Math.abs(y - rect.y) > EDGE_HUG_EPS && Math.abs(y - (rect.y + rect.height)) > EDGE_HUG_EPS) {
      return false
    }
    const segMinX = Math.min(a.x, b.x)
    const segMaxX = Math.max(a.x, b.x)
    return segMaxX >= rect.x - EDGE_HUG_EPS && segMinX <= rect.x + rect.width + EDGE_HUG_EPS
  }
  const x = a.x
  if (Math.abs(x - rect.x) > EDGE_HUG_EPS && Math.abs(x - (rect.x + rect.width)) > EDGE_HUG_EPS) {
    return false
  }
  const segMinY = Math.min(a.y, b.y)
  const segMaxY = Math.max(a.y, b.y)
  return segMaxY >= rect.y - EDGE_HUG_EPS && segMinY <= rect.y + rect.height + EDGE_HUG_EPS
}

export function pointInRect(p: Point2D, rect: Rect2D, eps = 0): boolean {
  return (
    p.x > rect.x + eps &&
    p.x < rect.x + rect.width - eps &&
    p.y > rect.y + eps &&
    p.y < rect.y + rect.height - eps
  )
}

/**
 * Exact Liang-Barsky segment-vs-AABB intersection test.
 *
 * When `eps > 0`, shrinks the box slightly so segments riding cleanly along an
 * inflated obstacle boundary remain walkable while strict interior crossings
 * are rejected.
 */
export function segmentIntersectsRect(a: Point2D, b: Point2D, rect: Rect2D, eps = 0): boolean {
  const minX = rect.x + eps
  const maxX = rect.x + rect.width - eps
  const minY = rect.y + eps
  const maxY = rect.y + rect.height - eps
  if (minX >= maxX || minY >= maxY) return false

  const dx = b.x - a.x
  const dy = b.y - a.y
  let t0 = 0
  let t1 = 1

  const clip = (p: number, q: number): boolean => {
    if (p === 0) return q >= 0
    const r = q / p
    if (p < 0) {
      if (r > t1) return false
      if (r > t0) t0 = r
    } else {
      if (r < t0) return false
      if (r < t1) t1 = r
    }
    return true
  }

  return (
    clip(-dx, a.x - minX) &&
    clip(dx, maxX - a.x) &&
    clip(-dy, a.y - minY) &&
    clip(dy, maxY - a.y)
  )
}

/**
 * Compute the exact cubic Bezier control points drawn by JointJS `connectors.curve`
 * for an unobstructed horizontal link (`routePoints = []`).
 */
export function naturalCurveControlPoints(
  sourcePoint: Point2D,
  targetPoint: Point2D,
  sourceDirection: HorizontalDirection,
  targetDirection: HorizontalDirection
): [Point2D, Point2D] {
  const dx = targetPoint.x - sourcePoint.x
  const dy = targetPoint.y - sourcePoint.y
  const dist = Math.hypot(dx, dy)
  if (dist < 1e-6) {
    return [{ ...sourcePoint }, { ...targetPoint }]
  }

  const ux = dx / dist
  const srcDirX = sourceDirection === 'right' ? 1 : -1
  const srcCos = Math.max(-1, Math.min(1, srcDirX * ux))
  const srcAngle = Math.acos(srcCos)
  const srcTangentLen =
    dist * CURVE_DISTANCE_COEFF +
    (srcAngle > Math.PI / 4 ? (srcAngle - Math.PI / 4) * CURVE_ANGLE_TANGENT_COEFF : 0)

  const tgtDirX = targetDirection === 'right' ? 1 : -1
  const tgtCos = Math.max(-1, Math.min(1, tgtDirX * -ux))
  const tgtAngle = Math.acos(tgtCos)
  const tgtTangentLen =
    dist * CURVE_DISTANCE_COEFF +
    (tgtAngle > Math.PI / 4 ? (tgtAngle - Math.PI / 4) * CURVE_ANGLE_TANGENT_COEFF : 0)

  const cp1: Point2D = {
    x: sourcePoint.x + srcDirX * srcTangentLen * CURVE_BEZIER_SCALE,
    y: sourcePoint.y,
  }
  const cp2: Point2D = {
    x: targetPoint.x + tgtDirX * tgtTangentLen * CURVE_BEZIER_SCALE,
    y: targetPoint.y,
  }
  return [cp1, cp2]
}

function cubicPoint(p0: Point2D, p1: Point2D, p2: Point2D, p3: Point2D, t: number): Point2D {
  const u = 1 - t
  const uu = u * u
  const tt = t * t
  const uuu = uu * u
  const ttt = tt * t
  return {
    x: uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x,
    y: uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y,
  }
}

/** Check whether the natural forward cubic Bezier curve collides with any obstacle. */
function isDirectCurveClear(
  sourcePoint: Point2D,
  targetPoint: Point2D,
  sourceDirection: HorizontalDirection,
  targetDirection: HorizontalDirection,
  sourceRect: Rect2D | null,
  targetRect: Rect2D | null,
  inflatedObstacles: readonly Rect2D[]
): boolean {
  // Only allow direct curve for natural forward flow (out->in left-to-right or mirrored reverse drag).
  if (sourceDirection === 'right' && targetDirection === 'left') {
    if (sourcePoint.x >= targetPoint.x - 4) return false
    if (sourceRect && targetRect && sourceRect.x + sourceRect.width > targetRect.x + 8) return false
  } else if (sourceDirection === 'left' && targetDirection === 'right') {
    if (sourcePoint.x <= targetPoint.x + 4) return false
    if (sourceRect && targetRect && targetRect.x + targetRect.width > sourceRect.x + 8) return false
  } else {
    return false
  }

  const [cp1, cp2] = naturalCurveControlPoints(sourcePoint, targetPoint, sourceDirection, targetDirection)
  const approxLen =
    Math.hypot(cp1.x - sourcePoint.x, cp1.y - sourcePoint.y) +
    Math.hypot(cp2.x - cp1.x, cp2.y - cp1.y) +
    Math.hypot(targetPoint.x - cp2.x, targetPoint.y - cp2.y)
  const steps = Math.max(24, Math.min(64, Math.ceil(approxLen / 20)))

  let prev = sourcePoint
  for (let step = 1; step <= steps; step += 1) {
    const curr = cubicPoint(sourcePoint, cp1, cp2, targetPoint, step / steps)
    for (const obs of inflatedObstacles) {
      if (segmentIntersectsRect(prev, curr, obs, 0.25)) return false
    }
    // Middle span should not slice across the source or target node body either.
    if (step >= 3 && step <= steps - 2) {
      if (sourceRect && segmentIntersectsRect(prev, curr, sourceRect, 2)) return false
      if (targetRect && segmentIntersectsRect(prev, curr, targetRect, 2)) return false
    }
    prev = curr
  }
  return true
}

/**
 * Deduplicate sorted coordinates while preserving pinned endpoint coordinates
 * verbatim so port stubs never snap off-axis onto a nearby obstacle edge.
 */
function dedupeSortedWithPinned(values: number[], pinned: readonly number[]): number[] {
  const uniquePinned: number[] = []
  const sortedPinned = [...pinned].sort((a, b) => a - b)
  for (const p of sortedPinned) {
    if (uniquePinned.length === 0 || Math.abs(p - uniquePinned[uniquePinned.length - 1]) > 1e-9) {
      uniquePinned.push(p)
    }
  }

  const sortedValues = [...values].sort((a, b) => a - b)
  const keptNonPinned: number[] = []
  for (const v of sortedValues) {
    let nearPinned = false
    for (const p of uniquePinned) {
      if (Math.abs(v - p) <= COORD_MERGE_EPS) {
        nearPinned = true
        break
      }
    }
    if (nearPinned) continue
    if (keptNonPinned.length === 0 || v - keptNonPinned[keptNonPinned.length - 1] > COORD_MERGE_EPS) {
      keptNonPinned.push(v)
    }
  }

  const merged = [...uniquePinned, ...keptNonPinned]
  merged.sort((a, b) => a - b)
  return merged
}

function findExactIndex(sorted: readonly number[], value: number): number {
  let bestIdx = 0
  let bestDist = Math.abs(sorted[0] - value)
  for (let i = 1; i < sorted.length; i += 1) {
    const dist = Math.abs(sorted[i] - value)
    if (dist < bestDist) {
      bestDist = dist
      bestIdx = i
    }
  }
  return bestIdx
}

/**
 * Keep only obstacles connected to the routing corridor so far-away clusters
 * neither affect the chosen path nor inflate the Hanan grid on large graphs.
 */
function filterRelevantObstacles(
  obstacles: readonly Rect2D[],
  seedPoints: readonly Point2D[],
  endpointRects: readonly Rect2D[],
  margin: number
): Rect2D[] {
  if (obstacles.length === 0) return []

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  for (const p of seedPoints) {
    if (p.x < minX) minX = p.x
    if (p.x > maxX) maxX = p.x
    if (p.y < minY) minY = p.y
    if (p.y > maxY) maxY = p.y
  }
  for (const r of endpointRects) {
    if (r.x < minX) minX = r.x
    if (r.x + r.width > maxX) maxX = r.x + r.width
    if (r.y < minY) minY = r.y
    if (r.y + r.height > maxY) maxY = r.y + r.height
  }

  const expandPad = margin + OUTER_LANE_OFFSET + CORRIDOR_PADDING
  let corridor: Rect2D = {
    x: minX - expandPad,
    y: minY - expandPad,
    width: maxX - minX + expandPad * 2,
    height: maxY - minY + expandPad * 2,
  }

  const included = new Uint8Array(obstacles.length)
  const relevant: Rect2D[] = []
  let grew = true
  while (grew) {
    grew = false
    for (let i = 0; i < obstacles.length; i += 1) {
      if (included[i]) continue
      const obs = obstacles[i]
      if (!rectsIntersect(inflateRect(obs, margin), corridor)) continue
      included[i] = 1
      relevant.push(obs)
      const nextMinX = Math.min(corridor.x, obs.x - expandPad)
      const nextMinY = Math.min(corridor.y, obs.y - expandPad)
      const nextMaxX = Math.max(corridor.x + corridor.width, obs.x + obs.width + expandPad)
      const nextMaxY = Math.max(corridor.y + corridor.height, obs.y + obs.height + expandPad)
      corridor = {
        x: nextMinX,
        y: nextMinY,
        width: nextMaxX - nextMinX,
        height: nextMaxY - nextMinY,
      }
      grew = true
    }
  }
  return relevant
}

interface HeapNode {
  state: number
  f: number
  x: number
  y: number
  dir: number
}

function heapLess(a: HeapNode, b: HeapNode): boolean {
  const diff = a.f - b.f
  if (Math.abs(diff) > COST_EPS) return diff < 0
  if (Math.abs(a.y - b.y) > COST_EPS) return a.y < b.y
  if (Math.abs(a.x - b.x) > COST_EPS) return a.x < b.x
  return a.dir < b.dir
}

class MinHeap {
  private readonly items: HeapNode[] = []

  get size(): number {
    return this.items.length
  }

  push(node: HeapNode) {
    const items = this.items
    items.push(node)
    let idx = items.length - 1
    while (idx > 0) {
      const parent = (idx - 1) >> 1
      if (!heapLess(items[idx], items[parent])) break
      const tmp = items[parent]
      items[parent] = items[idx]
      items[idx] = tmp
      idx = parent
    }
  }

  pop(): HeapNode | undefined {
    const items = this.items
    if (items.length === 0) return undefined
    const top = items[0]
    const last = items.pop()!
    if (items.length > 0) {
      items[0] = last
      let idx = 0
      const len = items.length
      while (true) {
        const left = idx * 2 + 1
        const right = left + 1
        let smallest = idx
        if (left < len && heapLess(items[left], items[smallest])) smallest = left
        if (right < len && heapLess(items[right], items[smallest])) smallest = right
        if (smallest === idx) break
        const tmp = items[smallest]
        items[smallest] = items[idx]
        items[idx] = tmp
        idx = smallest
      }
    }
    return top
  }
}

/** Remove redundant collinear intermediate points from an orthogonal path. */
function simplifyOrthogonalPath(points: Point2D[]): Point2D[] {
  if (points.length <= 2) return points
  const deduped: Point2D[] = [points[0]]
  for (let i = 1; i < points.length; i += 1) {
    const prev = deduped[deduped.length - 1]
    const curr = points[i]
    if (Math.hypot(curr.x - prev.x, curr.y - prev.y) > 1e-6) {
      deduped.push(curr)
    }
  }
  if (deduped.length <= 2) return deduped

  const result: Point2D[] = [deduped[0]]
  for (let i = 1; i < deduped.length - 1; i += 1) {
    const prev = result[result.length - 1]
    const curr = deduped[i]
    const next = deduped[i + 1]
    const sameX = Math.abs(prev.x - curr.x) < 1e-6 && Math.abs(curr.x - next.x) < 1e-6
    const sameY = Math.abs(prev.y - curr.y) < 1e-6 && Math.abs(curr.y - next.y) < 1e-6
    if (sameX || sameY) continue
    result.push(curr)
  }
  result.push(deduped[deduped.length - 1])
  return result
}

// 4-way directions: 0 = +x, 1 = -x, 2 = +y, 3 = -y. Opposite of `d` is `d ^ 1`.
const DIRECTIONS = [
  { dx: 1, dy: 0, dir: 0 },
  { dx: -1, dy: 0, dir: 1 },
  { dx: 0, dy: 1, dir: 2 },
  { dx: 0, dy: -1, dir: 3 },
] as const

/**
 * Compute obstacle-avoiding intermediate waypoints between two ports.
 *
 * Returns `[]` when the natural cubic Bezier curve has a clear unobstructed
 * path so normal forward connections stay organic. When another node lies in
 * the path (or the wire loops backwards around a node), finds the minimum-bend
 * collision-free route on an exact Hanan visibility grid via 4-direction A*.
 */
export function computeObstacleAvoidingRoute(input: ObstacleRouteInput): Point2D[] {
  const {
    sourcePoint,
    targetPoint,
    sourceDirection,
    targetDirection,
    obstacles,
  } = input
  const margin = Number.isFinite(input.margin) && (input.margin as number) >= 0
    ? (input.margin as number)
    : DEFAULT_OBSTACLE_MARGIN

  if (!isFinitePoint(sourcePoint) || !isFinitePoint(targetPoint)) {
    return []
  }

  if (Math.hypot(targetPoint.x - sourcePoint.x, targetPoint.y - sourcePoint.y) < 4) {
    return []
  }

  const sourceRect = isFiniteRect(input.sourceRect) ? input.sourceRect : null
  const targetRect = isFiniteRect(input.targetRect) ? input.targetRect : null

  // Canonicalize reverse drags (`in -> out`) to `out -> in` and reverse the
  // resulting waypoints so dragging from an input port renders identically to
  // the committed normalized link on mouse release.
  if (sourceDirection === 'left' && targetDirection === 'right') {
    return computeObstacleAvoidingRoute({
      sourcePoint: targetPoint,
      targetPoint: sourcePoint,
      sourceDirection: targetDirection,
      targetDirection: sourceDirection,
      sourceRect: targetRect,
      targetRect: sourceRect,
      obstacles,
      margin,
    }).reverse()
  }

  // While dragging a free wire onto another node's port, do not block the hovered target box.
  const validObstacles = obstacles.filter((rect) => {
    if (!isFiniteRect(rect)) return false
    if (!targetRect && pointInRect(targetPoint, rect, -4)) return false
    if (!sourceRect && pointInRect(sourcePoint, rect, -4)) return false
    return true
  })

  // Compute port exit/entry stubs just outside the source/target node borders.
  const srcExitX =
    sourceDirection === 'right'
      ? Math.max(
          sourcePoint.x + STUB_LENGTH,
          sourceRect ? sourceRect.x + sourceRect.width + ENDPOINT_OBSTACLE_MARGIN : sourcePoint.x + STUB_LENGTH
        )
      : Math.min(
          sourcePoint.x - STUB_LENGTH,
          sourceRect ? sourceRect.x - ENDPOINT_OBSTACLE_MARGIN : sourcePoint.x - STUB_LENGTH
        )

  const tgtEntryX =
    targetDirection === 'left'
      ? Math.min(
          targetPoint.x - STUB_LENGTH,
          targetRect ? targetRect.x - ENDPOINT_OBSTACLE_MARGIN : targetPoint.x - STUB_LENGTH
        )
      : Math.max(
          targetPoint.x + STUB_LENGTH,
          targetRect ? targetRect.x + targetRect.width + ENDPOINT_OBSTACLE_MARGIN : targetPoint.x + STUB_LENGTH
        )

  const exitPt: Point2D = { x: srcExitX, y: sourcePoint.y }
  const entryPt: Point2D = { x: tgtEntryX, y: targetPoint.y }

  const endpointRects: Rect2D[] = []
  if (sourceRect) endpointRects.push(sourceRect)
  if (targetRect) endpointRects.push(targetRect)

  const activeObstacles = filterRelevantObstacles(
    validObstacles,
    [sourcePoint, targetPoint, exitPt, entryPt],
    endpointRects,
    margin
  )
  const inflatedObstacles = activeObstacles.map((rect) => inflateRect(rect, margin))

  // Fast path: keep graceful single cubic Bezier whenever the path is clear.
  if (
    isDirectCurveClear(
      sourcePoint,
      targetPoint,
      sourceDirection,
      targetDirection,
      sourceRect,
      targetRect,
      inflatedObstacles
    )
  ) {
    return []
  }

  // Track actual node bodies (hard penalty) separately from comfort margins (soft penalty)
  // so tight gaps between adjacent nodes remain threadable without ever slicing a node body.
  const hardBodies: Rect2D[] = [...activeObstacles]
  const softMargins: Rect2D[] = [...inflatedObstacles]
  if (sourceRect) {
    hardBodies.push(sourceRect)
    softMargins.push(inflateRect(sourceRect, ENDPOINT_OBSTACLE_MARGIN))
  }
  if (targetRect) {
    hardBodies.push(targetRect)
    softMargins.push(inflateRect(targetRect, ENDPOINT_OBSTACLE_MARGIN))
  }

  // Build exact Hanan visibility grid coordinates from obstacle borders + corridor midpoints.
  const pinnedXs = [exitPt.x, entryPt.x]
  const pinnedYs = [exitPt.y, entryPt.y]
  const rawXs: number[] = []
  const rawYs: number[] = []
  let minX = Math.min(exitPt.x, entryPt.x)
  let maxX = Math.max(exitPt.x, entryPt.x)
  let minY = Math.min(exitPt.y, entryPt.y)
  let maxY = Math.max(exitPt.y, entryPt.y)

  for (const r of softMargins) {
    const left = r.x
    const right = r.x + r.width
    const top = r.y
    const bottom = r.y + r.height
    rawXs.push(left, right)
    rawYs.push(top, bottom)
    if (left < minX) minX = left
    if (right > maxX) maxX = right
    if (top < minY) minY = top
    if (bottom > maxY) maxY = bottom
  }
  rawXs.push(minX - OUTER_LANE_OFFSET, maxX + OUTER_LANE_OFFSET)
  rawYs.push(minY - OUTER_LANE_OFFSET, maxY + OUTER_LANE_OFFSET)

  const baseXs = dedupeSortedWithPinned(rawXs, pinnedXs)
  const baseYs = dedupeSortedWithPinned(rawYs, pinnedYs)

  // Insert centered corridor lanes between adjacent obstacle edges.
  const xsWithMid = [...baseXs]
  for (let i = 0; i < baseXs.length - 1; i += 1) {
    if (baseXs[i + 1] - baseXs[i] >= MIDPOINT_MIN_GAP) {
      xsWithMid.push((baseXs[i] + baseXs[i + 1]) / 2)
    }
  }
  const ysWithMid = [...baseYs]
  for (let i = 0; i < baseYs.length - 1; i += 1) {
    if (baseYs[i + 1] - baseYs[i] >= MIDPOINT_MIN_GAP) {
      ysWithMid.push((baseYs[i] + baseYs[i + 1]) / 2)
    }
  }

  const xs = dedupeSortedWithPinned(xsWithMid, pinnedXs)
  const ys = dedupeSortedWithPinned(ysWithMid, pinnedYs)
  const cols = xs.length
  const rows = ys.length

  const startIx = findExactIndex(xs, exitPt.x)
  const startIy = findExactIndex(ys, exitPt.y)
  const endIx = findExactIndex(xs, entryPt.x)
  const endIy = findExactIndex(ys, entryPt.y)

  // 4-direction A* over (ix, iy, dir): prevents 180-degree reversals anywhere
  // including back along the source exit stub or into the target entry stub.
  const startDir = sourceDirection === 'right' ? 0 : 1
  const targetEntryDir = targetDirection === 'left' ? 0 : 1
  const forbiddenEntryDir = targetEntryDir ^ 1

  const stateCount = cols * rows * 4
  const gScore = new Float64Array(stateCount)
  gScore.fill(Infinity)
  const cameFrom = new Int32Array(stateCount)
  cameFrom.fill(-1)
  const closed = new Uint8Array(stateCount)

  const encode = (ix: number, iy: number, dir: number) => (iy * cols + ix) * 4 + dir
  const startState = encode(startIx, startIy, startDir)
  const endX = xs[endIx]
  const endY = ys[endIy]

  gScore[startState] = 0
  const open = new MinHeap()
  open.push({
    state: startState,
    f: Math.abs(xs[startIx] - endX) + Math.abs(ys[startIy] - endY),
    x: xs[startIx],
    y: ys[startIy],
    dir: startDir,
  })

  let goalState = -1
  let bestGoalCost = Infinity

  while (open.size > 0) {
    const current = open.pop()!
    const state = current.state
    if (closed[state]) continue
    if (current.f > bestGoalCost + COST_EPS) break
    closed[state] = 1

    const dir = state & 3
    const cell = state >> 2
    const ix = cell % cols
    const iy = (cell - ix) / cols

    if (ix === endIx && iy === endIy && dir !== forbiddenEntryDir) {
      const finishCost = gScore[state] + (dir === targetEntryDir ? 0 : TURN_PENALTY)
      if (finishCost < bestGoalCost - COST_EPS) {
        bestGoalCost = finishCost
        goalState = state
      }
      continue
    }

    const currPt: Point2D = { x: xs[ix], y: ys[iy] }

    for (const step of DIRECTIONS) {
      // Never double back 180 degrees along the previous segment or exit stub.
      if (step.dir === (dir ^ 1)) continue

      const nx = ix + step.dx
      const ny = iy + step.dy
      if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) continue

      const nextState = encode(nx, ny, step.dir)
      if (closed[nextState]) continue

      const nextPt: Point2D = { x: xs[nx], y: ys[ny] }
      const dist = Math.abs(nextPt.x - currPt.x) + Math.abs(nextPt.y - currPt.y)
      let hitsBody = false
      for (const rect of hardBodies) {
        if (segmentIntersectsRect(currPt, nextPt, rect, 0.5)) {
          hitsBody = true
          break
        }
      }
      let hitsMargin = false
      if (!hitsBody) {
        for (const rect of softMargins) {
          if (segmentIntersectsRect(currPt, nextPt, rect, 0.5)) {
            hitsMargin = true
            break
          }
        }
      }
      // Prefer centered corridor lanes over hugging an obstacle margin border so
      // equal-cost parallel lanes never flip on floating-point rounding drift.
      let hugsMarginEdge = false
      if (!hitsBody && !hitsMargin) {
        const horizontal = step.dir === 0 || step.dir === 1
        for (const rect of softMargins) {
          if (segmentHugsRectBoundary(currPt, nextPt, rect, horizontal)) {
            hugsMarginEdge = true
            break
          }
        }
      }

      const turnCost = dir === step.dir ? 0 : TURN_PENALTY
      const obstacleCost = hitsBody
        ? BODY_PENALTY_BASE + dist * BODY_PENALTY_PER_PX
        : hitsMargin
          ? MARGIN_PENALTY_BASE + dist * MARGIN_PENALTY_PER_PX
          : hugsMarginEdge
            ? dist * EDGE_HUG_PENALTY_PER_PX
            : 0
      const stepCost = dist + turnCost + obstacleCost
      const tentative = gScore[state] + stepCost

      if (tentative < gScore[nextState] - COST_EPS) {
        gScore[nextState] = tentative
        cameFrom[nextState] = state
        const h = Math.abs(nextPt.x - endX) + Math.abs(nextPt.y - endY)
        open.push({
          state: nextState,
          f: tentative + h,
          x: nextPt.x,
          y: nextPt.y,
          dir: step.dir,
        })
      }
    }
  }

  if (goalState === -1) return []

  const rawPath: Point2D[] = []
  let cursor = goalState
  while (cursor !== -1) {
    const cell = cursor >> 2
    const ix = cell % cols
    const iy = (cell - ix) / cols
    rawPath.push({ x: xs[ix], y: ys[iy] })
    cursor = cameFrom[cursor]
  }
  rawPath.reverse()

  const simplifiedFull = simplifyOrthogonalPath([sourcePoint, ...rawPath, targetPoint])
  return simplifiedFull.slice(1, -1)
}

/** Resolve horizontal exit/entry directions from JointJS port groups. */
export function resolveLinkDirections(link: dia.Link): {
  sourceDirection: HorizontalDirection
  targetDirection: HorizontalDirection
} {
  const source = link.source()
  const target = link.target()
  const sourceEl = link.getSourceElement()
  const targetEl = link.getTargetElement()
  const sourceGroup = source.port === undefined ? undefined : sourceEl?.getPort(source.port)?.group
  const targetGroup = target.port === undefined ? undefined : targetEl?.getPort(target.port)?.group

  const sourceDirection: HorizontalDirection = sourceGroup === 'in' ? 'left' : 'right'
  const targetDirection: HorizontalDirection =
    targetGroup === 'out'
      ? 'right'
      : targetGroup === 'in'
        ? 'left'
        : sourceDirection === 'left'
          ? 'right'
          : 'left'

  return { sourceDirection, targetDirection }
}

/** JointJS `defaultRouter` that avoids colliding with node cards. */
export function createObstacleAvoidingRouter(graph: dia.Graph) {
  return (vertices: dia.Point[], _args?: Record<string, unknown>, linkView?: dia.LinkView): dia.Point[] => {
    if (vertices.length > 0 || !linkView) return vertices
    const link = linkView.model
    const sourcePoint = linkView.sourceAnchor
    const targetPoint = linkView.targetAnchor
    if (!sourcePoint || !targetPoint) return vertices

    const sourceEl = link.getSourceElement()
    const targetEl = link.getTargetElement()
    const { sourceDirection, targetDirection } = resolveLinkDirections(link)

    const obstacles: Rect2D[] = []
    for (const el of graph.getElements()) {
      if (el.id === sourceEl?.id || el.id === targetEl?.id) continue
      const bbox = el.getBBox()
      if (bbox.width > 0 && bbox.height > 0) {
        obstacles.push({ x: bbox.x, y: bbox.y, width: bbox.width, height: bbox.height })
      }
    }

    const sourceBBox = sourceEl?.getBBox()
    const targetBBox = targetEl?.getBBox()

    return computeObstacleAvoidingRoute({
      sourcePoint: { x: sourcePoint.x, y: sourcePoint.y },
      targetPoint: { x: targetPoint.x, y: targetPoint.y },
      sourceDirection,
      targetDirection,
      sourceRect: sourceBBox
        ? { x: sourceBBox.x, y: sourceBBox.y, width: sourceBBox.width, height: sourceBBox.height }
        : null,
      targetRect: targetBBox
        ? { x: targetBBox.x, y: targetBBox.y, width: targetBBox.width, height: targetBBox.height }
        : null,
      obstacles,
    })
  }
}

/**
 * JointJS `defaultConnector` paired with `createObstacleAvoidingRouter`.
 *
 * Uses silky cubic Bezier curves when unobstructed (`routePoints.length === 0`)
 * and smooth cubic-cornered orthogonal paths when avoiding obstacles so curves
 * never overshoot into node bodies.
 */
export function smartLinkConnector(
  sourcePoint: dia.Point,
  targetPoint: dia.Point,
  routePoints: dia.Point[],
  opt: Record<string, unknown> | undefined,
  linkView: dia.LinkView
) {
  const link = linkView.model
  const { sourceDirection, targetDirection } = resolveLinkDirections(link)

  if (routePoints.length > 0) {
    return connectors.straight(
      sourcePoint,
      targetPoint,
      routePoints,
      {
        cornerType: 'cubic',
        cornerRadius: ROUTED_CORNER_RADIUS,
      },
      linkView
    )
  }

  const curveOpt = {
    ...(opt ?? {}),
    sourceDirection:
      sourceDirection === 'left'
        ? connectors.curve.TangentDirections.LEFT
        : connectors.curve.TangentDirections.RIGHT,
    targetDirection:
      targetDirection === 'right'
        ? connectors.curve.TangentDirections.RIGHT
        : connectors.curve.TangentDirections.LEFT,
  }
  return connectors.curve(sourcePoint, targetPoint, routePoints, curveOpt, linkView)
}
