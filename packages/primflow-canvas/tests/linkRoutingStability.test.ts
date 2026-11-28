import { connectors, g } from '@joint/core'
import { expect, test } from 'vitest'
import {
  computeObstacleAvoidingRoute,
  naturalCurveControlPoints,
  segmentIntersectsRect,
  type ObstacleRouteInput,
  type Point2D,
  type Rect2D,
} from '../src/adapters/joint/linkRouting'

/** Deterministic PRNG so fuzz scenarios are reproducible. */
function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const NODE_W = 176
const NODE_H = 80

function rectsOverlap(a: Rect2D, b: Rect2D, pad = 0) {
  return (
    a.x - pad < b.x + b.width &&
    a.x + a.width + pad > b.x &&
    a.y - pad < b.y + b.height &&
    a.y + a.height + pad > b.y
  )
}

/** Random non-overlapping node layout with an output -> input link between two of them. */
function randomScenario(rand: () => number): ObstacleRouteInput {
  const rects: Rect2D[] = []
  let guard = 0
  const count = 3 + Math.floor(rand() * 6)
  while (rects.length < count && guard < 400) {
    guard += 1
    const rect = {
      x: Math.round(rand() * 900),
      y: Math.round(rand() * 600),
      width: NODE_W - Math.round(rand() * 60),
      height: NODE_H + Math.round(rand() * 60),
    }
    if (rects.every((other) => !rectsOverlap(rect, other, 6))) rects.push(rect)
  }
  const [sourceRect, targetRect, ...obstacles] = rects
  return {
    sourcePoint: { x: sourceRect.x + sourceRect.width, y: sourceRect.y + 30 + Math.round(rand() * 30) },
    targetPoint: { x: targetRect.x, y: targetRect.y + 30 + Math.round(rand() * 30) },
    sourceDirection: 'right',
    targetDirection: 'left',
    sourceRect,
    targetRect,
    obstacles,
  }
}

function mirror(input: ObstacleRouteInput): ObstacleRouteInput {
  return {
    ...input,
    sourcePoint: input.targetPoint,
    targetPoint: input.sourcePoint,
    sourceDirection: input.targetDirection,
    targetDirection: input.sourceDirection,
    sourceRect: input.targetRect,
    targetRect: input.sourceRect,
  }
}

function fullPolyline(input: ObstacleRouteInput, route: Point2D[]) {
  return [input.sourcePoint, ...route, input.targetPoint]
}

test('a link dragged from the input port routes exactly like the committed output -> input link', () => {
  const rand = mulberry32(7)
  for (let i = 0; i < 300; i += 1) {
    const input = randomScenario(rand)
    const committed = computeObstacleAvoidingRoute(input)
    const dragged = computeObstacleAvoidingRoute(mirror(input))
    expect([...dragged].reverse(), `scenario ${i}`).toEqual(committed)
  }
})

test('routed paths stay strictly orthogonal and never double back along a port stub', () => {
  const rand = mulberry32(42)
  for (let i = 0; i < 300; i += 1) {
    const input = randomScenario(rand)
    const route = computeObstacleAvoidingRoute(input)
    if (route.length === 0) continue
    const pts = fullPolyline(input, route)
    for (let k = 0; k < pts.length - 1; k += 1) {
      const a = pts[k]
      const b = pts[k + 1]
      expect(Number.isFinite(a.x) && Number.isFinite(a.y), `scenario ${i}`).toBe(true)
      const axisAligned = Math.abs(a.x - b.x) < 1e-9 || Math.abs(a.y - b.y) < 1e-9
      expect(axisAligned, `scenario ${i} segment ${k}`).toBe(true)
    }
    // Source stub travels +x; the next horizontal leg must not reverse over it.
    if (pts[1].y === pts[2].y) expect(pts[2].x, `scenario ${i} start`).toBeGreaterThanOrEqual(pts[1].x)
    // Target stub travels +x into the input; the leg before it must not arrive from the right.
    const n = pts.length
    if (pts[n - 3].y === pts[n - 2].y) expect(pts[n - 3].x, `scenario ${i} end`).toBeLessThanOrEqual(pts[n - 2].x)
  }
})

test('the exit stub stays level with the port when an obstacle margin sits a pixel away', () => {
  const sourceRect: Rect2D = { x: 40, y: 160, width: 176, height: 80 }
  const source: Point2D = { x: 216, y: 200 }
  const target: Point2D = { x: 640, y: 200 }
  // Obstacle margin bottom edge lands at y = 199, one pixel above the port row.
  const nearEdge: Rect2D = { x: 250, y: 63, width: 120, height: 120 }
  const blocker: Rect2D = { x: 400, y: 150, width: 120, height: 100 }
  const route = computeObstacleAvoidingRoute({
    sourcePoint: source,
    targetPoint: target,
    sourceDirection: 'right',
    targetDirection: 'left',
    sourceRect,
    targetRect: { x: 640, y: 160, width: 176, height: 80 },
    obstacles: [nearEdge, blocker],
  })
  expect(route.length).toBeGreaterThan(0)
  const pts = [source, ...route, target]
  for (let k = 0; k < pts.length - 1; k += 1) {
    const axisAligned = pts[k].x === pts[k + 1].x || pts[k].y === pts[k + 1].y
    expect(axisAligned, `segment ${k}: ${JSON.stringify([pts[k], pts[k + 1]])}`).toBe(true)
  }
})

test('far-away nodes do not change the route', () => {
  const base: ObstacleRouteInput = {
    sourcePoint: { x: 200, y: 200 },
    targetPoint: { x: 640, y: 200 },
    sourceDirection: 'right',
    targetDirection: 'left',
    sourceRect: { x: 24, y: 160, width: 176, height: 80 },
    targetRect: { x: 640, y: 160, width: 176, height: 80 },
    obstacles: [{ x: 330, y: 150, width: 180, height: 100 }],
  }
  const far: Rect2D[] = []
  for (let i = 0; i < 400; i += 1) {
    far.push({ x: 3000 + (i % 20) * 220, y: 3000 + Math.floor(i / 20) * 140, width: 176, height: 80 })
  }
  const expected = computeObstacleAvoidingRoute(base)
  expect(expected.length).toBeGreaterThan(0)
  expect(computeObstacleAvoidingRoute({ ...base, obstacles: [...base.obstacles, ...far] })).toEqual(expected)
})

test('non-finite geometry falls back to the natural curve instead of producing NaN points', () => {
  const route = computeObstacleAvoidingRoute({
    sourcePoint: { x: 200, y: 200 },
    targetPoint: { x: 640, y: 200 },
    sourceDirection: 'right',
    targetDirection: 'left',
    sourceRect: { x: Number.NaN, y: 160, width: 176, height: 80 },
    targetRect: { x: 640, y: 160, width: 176, height: 80 },
    obstacles: [{ x: 330, y: 150, width: 180, height: Number.POSITIVE_INFINITY }],
  })
  for (const p of route) {
    expect(Number.isFinite(p.x) && Number.isFinite(p.y)).toBe(true)
  }
})

test('the collision check samples the same curve that the connector draws', () => {
  const cases: Array<[Point2D, Point2D]> = [
    [{ x: 0, y: 0 }, { x: 300, y: 0 }],
    [{ x: 0, y: 0 }, { x: 100, y: 400 }],
    [{ x: 50, y: 300 }, { x: 420, y: -80 }],
    [{ x: 0, y: 0 }, { x: 12, y: 260 }],
  ]
  for (const [source, target] of cases) {
    const jointPath = connectors.curve(source, target, [], {
      sourceDirection: connectors.curve.TangentDirections.RIGHT,
      targetDirection: connectors.curve.TangentDirections.LEFT,
      raw: true,
    }) as unknown as g.Path
    const curve = jointPath.segments[1] as unknown as { controlPoint1: Point2D; controlPoint2: Point2D }
    const [cp1, cp2] = naturalCurveControlPoints(source, target, 'right', 'left')
    expect(cp1.x).toBeCloseTo(curve.controlPoint1.x, 2)
    expect(cp1.y).toBeCloseTo(curve.controlPoint1.y, 2)
    expect(cp2.x).toBeCloseTo(curve.controlPoint2.x, 2)
    expect(cp2.y).toBeCloseTo(curve.controlPoint2.y, 2)
  }
})

test('a natural curve that would clip a nearby node is routed around it', () => {
  // The drawn curve bulges right of the straight line toward this node.
  const obstacle: Rect2D = { x: 75, y: 40, width: 120, height: 50 }
  const input: ObstacleRouteInput = {
    sourcePoint: { x: 0, y: 0 },
    targetPoint: { x: 100, y: 400 },
    sourceDirection: 'right',
    targetDirection: 'left',
    sourceRect: { x: -176, y: -40, width: 176, height: 80 },
    targetRect: { x: 100, y: 360, width: 176, height: 80 },
    obstacles: [obstacle],
  }
  const route = computeObstacleAvoidingRoute(input)
  expect(route.length).toBeGreaterThan(0)
  const pts = fullPolyline(input, route)
  for (let k = 0; k < pts.length - 1; k += 1) {
    expect(segmentIntersectsRect(pts[k], pts[k + 1], obstacle, 0)).toBe(false)
  }
})

test('moving an unrelated node above a routed corridor does not cause the corridor lane to jitter', () => {
  // Exact layout captured from Number Input -> WeChat-connect with Custom Node dragged above.
  const sourceRect: Rect2D = { x: 1043.25, y: 258.33, width: 225.2, height: 68 }
  const targetRect: Rect2D = { x: 804.79, y: 427.23, width: 280, height: 180 }
  const sourcePoint: Point2D = { x: 1258.25, y: 303.46 }
  const targetPoint: Point2D = { x: 800.79, y: 562.23 }

  const baseline = computeObstacleAvoidingRoute({
    sourcePoint,
    targetPoint,
    sourceDirection: 'right',
    targetDirection: 'left',
    sourceRect,
    targetRect,
    obstacles: [{ x: 864.4, y: 89.42, width: 196, height: 104 }],
  })
  expect(baseline.length).toBeGreaterThanOrEqual(4)

  // The horizontal crossing leg should stay centered in the open gap rather than hugging either node border.
  const gapTop = sourceRect.y + sourceRect.height + 14
  const gapBottom = targetRect.y - 14
  const horizontalLeg = baseline.find((p) => p.y > gapTop + 5 && p.y < gapBottom - 5)
  expect(horizontalLeg).toBeDefined()

  // Dragging Custom Node pixel-by-pixel across the top must keep the exact same route.
  for (let dx = -120; dx <= 160; dx += 7) {
    const moved = computeObstacleAvoidingRoute({
      sourcePoint,
      targetPoint,
      sourceDirection: 'right',
      targetDirection: 'left',
      sourceRect,
      targetRect,
      obstacles: [{ x: 864.4 + dx, y: 89.42, width: 196, height: 104 }],
    })
    expect(moved, `dx=${dx}`).toEqual(baseline)
  }
})
