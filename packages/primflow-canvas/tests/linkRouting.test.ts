import { expect, test } from 'vitest'
import {
  computeObstacleAvoidingRoute,
  segmentIntersectsRect,
  type Point2D,
  type Rect2D,
} from '../src/adapters/joint/linkRouting'

function pathSegments(source: Point2D, route: Point2D[], target: Point2D): Array<[Point2D, Point2D]> {
  const pts = [source, ...route, target]
  const segments: Array<[Point2D, Point2D]> = []
  for (let i = 0; i < pts.length - 1; i += 1) {
    segments.push([pts[i], pts[i + 1]])
  }
  return segments
}

test('returns empty route for unobstructed forward connections so natural Bezier curves are preserved', () => {
  const route = computeObstacleAvoidingRoute({
    sourcePoint: { x: 200, y: 140 },
    targetPoint: { x: 460, y: 180 },
    sourceDirection: 'right',
    targetDirection: 'left',
    sourceRect: { x: 40, y: 100, width: 176, height: 80 },
    targetRect: { x: 444, y: 140, width: 176, height: 80 },
    obstacles: [{ x: 250, y: 360, width: 180, height: 90 }],
  })
  expect(route).toEqual([])
})

test('routes cleanly around an intermediate obstacle node without crossing its body', () => {
  const source: Point2D = { x: 200, y: 200 }
  const target: Point2D = { x: 640, y: 200 }
  const obstacle: Rect2D = { x: 330, y: 150, width: 180, height: 100 }

  const route = computeObstacleAvoidingRoute({
    sourcePoint: source,
    targetPoint: target,
    sourceDirection: 'right',
    targetDirection: 'left',
    sourceRect: { x: 40, y: 160, width: 176, height: 80 },
    targetRect: { x: 624, y: 160, width: 176, height: 80 },
    obstacles: [obstacle],
  })

  expect(route.length).toBeGreaterThanOrEqual(2)
  for (const [a, b] of pathSegments(source, route, target)) {
    expect(segmentIntersectsRect(a, b, obstacle, 0)).toBe(false)
  }
})

test('navigates between stacked obstacle nodes through an open corridor without intersection', () => {
  const source: Point2D = { x: 180, y: 260 }
  const target: Point2D = { x: 700, y: 260 }
  const topObstacle: Rect2D = { x: 340, y: 80, width: 200, height: 120 }
  const middleObstacle: Rect2D = { x: 340, y: 215, width: 200, height: 100 }
  const bottomObstacle: Rect2D = { x: 340, y: 380, width: 200, height: 120 }

  const route = computeObstacleAvoidingRoute({
    sourcePoint: source,
    targetPoint: target,
    sourceDirection: 'right',
    targetDirection: 'left',
    sourceRect: { x: 20, y: 220, width: 176, height: 80 },
    targetRect: { x: 684, y: 220, width: 176, height: 80 },
    obstacles: [topObstacle, middleObstacle, bottomObstacle],
  })

  expect(route.length).toBeGreaterThanOrEqual(2)
  for (const [a, b] of pathSegments(source, route, target)) {
    expect(segmentIntersectsRect(a, b, topObstacle, 0)).toBe(false)
    expect(segmentIntersectsRect(a, b, middleObstacle, 0)).toBe(false)
    expect(segmentIntersectsRect(a, b, bottomObstacle, 0)).toBe(false)
  }
})

test('routes backward loopback links around source and target nodes instead of slicing through them', () => {
  const sourceRect: Rect2D = { x: 460, y: 120, width: 180, height: 80 }
  const targetRect: Rect2D = { x: 100, y: 260, width: 180, height: 80 }
  const source: Point2D = { x: 624, y: 160 }
  const target: Point2D = { x: 116, y: 300 }

  const route = computeObstacleAvoidingRoute({
    sourcePoint: source,
    targetPoint: target,
    sourceDirection: 'right',
    targetDirection: 'left',
    sourceRect,
    targetRect,
    obstacles: [],
  })

  expect(route.length).toBeGreaterThanOrEqual(3)
  // Middle segments (between exit stub and entry stub) must stay outside both node bodies.
  const middleSegments = pathSegments(source, route, target).slice(1, -1)
  expect(middleSegments.length).toBeGreaterThan(0)
  for (const [a, b] of middleSegments) {
    expect(segmentIntersectsRect(a, b, sourceRect, 0)).toBe(false)
    expect(segmentIntersectsRect(a, b, targetRect, 0)).toBe(false)
  }
})

test('does not block a free-dragged wire whose cursor is inside a target node box', () => {
  const hoveredTarget: Rect2D = { x: 420, y: 140, width: 180, height: 90 }
  const route = computeObstacleAvoidingRoute({
    sourcePoint: { x: 200, y: 180 },
    targetPoint: { x: 436, y: 180 },
    sourceDirection: 'right',
    targetDirection: 'left',
    sourceRect: { x: 40, y: 140, width: 176, height: 80 },
    targetRect: null,
    obstacles: [hoveredTarget],
  })
  expect(route).toEqual([])
})
