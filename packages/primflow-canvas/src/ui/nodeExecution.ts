import { translate, type CanvasLanguage } from './i18n'
import { V } from '@joint/core'
import type { NodeExecutionStatus } from '@lyx-pj/primflow-model'

export const nodeExecutionLabels: Record<NodeExecutionStatus | 'paused', string> = {
  idle: 'Idle', pending: 'Pending', running: 'Executing', completed: 'Completed',
  failed: 'Failed', cancelled: 'Cancelled', skipped: 'Skipped', interrupted: 'Waiting for external input',
  paused: 'Paused at breakpoint',
}

const colors = {
  paused: ['#fbbf24', '#fde68a', '#fb923c'],
  running: ['#22d3ee', '#818cf8', '#c084fc'],
  completed: ['#34d399', '#a7f3d0', '#2dd4bf'],
  failed: ['#ef4444', '#fda4af', '#e11d48'],
  cancelled: ['#f97316', '#fdba74', '#f43f5e'],
  skipped: ['#64748b', '#cbd5e1', '#94a3b8'],
  interrupted: ['#8b5cf6', '#d8b4fe', '#e879f9'],
}

/** Draw blurred fill glows behind nodes without extra outlines or status text. */
export function renderNodeExecution(group: SVGGElement, options: {
  language?: CanvasLanguage
  id: string
  status: NodeExecutionStatus
  paused?: boolean
  width: number
  height: number
  radius: number
}) {
  V(group).empty()
  const visualStatus = options.paused ? 'paused' : options.status
  group.setAttribute('class', `bpgraph-node-execution is-${visualStatus}`)
  group.setAttribute('pointer-events', 'none')
  group.setAttribute('role', 'img')
  group.setAttribute('aria-label', translate(nodeExecutionLabels[visualStatus], options.language))
  group.setAttribute('aria-hidden', String(visualStatus === 'idle'))
  if (visualStatus === 'idle' || visualStatus === 'pending') return

  const gradientId = `bpgraph-execution-${options.id}`
  const defs = V('defs')
  const gradient = V('linearGradient', { id: gradientId, x1: '0%', y1: '0%', x2: '100%', y2: '100%' })
  colors[visualStatus].forEach((color, index) => {
    gradient.append(V('stop', { offset: `${index * 50}%`, 'stop-color': color }))
  })
  defs.append(gradient)
  group.appendChild(defs.node)

  const halo = V('rect', {
    class: 'bpgraph-node-execution-halo',
    x: -2, y: -2, width: options.width + 4, height: options.height + 4,
    rx: options.radius + 2, ry: options.radius + 2,
    fill: `url(#${gradientId})`,
  })
  group.appendChild(halo.node)
}
