import { translate, type CanvasLanguage } from './i18n'
import { V } from '@joint/core'
import type { NodeStyle } from '@lyx-pj/primflow-model'

export type NodeHeaderOptions = {
  language?: CanvasLanguage
  title: string
  breakpoint?: boolean
  size: { width: number; height: number }
  style: NodeStyle
  rx?: number
  ry?: number
}

let headerGradientSeq = 0

function parseHexColor(color: string): [number, number, number] | null {
  const hex = color.trim().replace(/^#/, '')
  if (/^[0-9a-f]{3}$/i.test(hex)) {
    return [
      parseInt(hex[0] + hex[0], 16),
      parseInt(hex[1] + hex[1], 16),
      parseInt(hex[2] + hex[2], 16),
    ]
  }
  if (/^[0-9a-f]{6}$/i.test(hex)) {
    return [
      parseInt(hex.slice(0, 2), 16),
      parseInt(hex.slice(2, 4), 16),
      parseInt(hex.slice(4, 6), 16),
    ]
  }
  return null
}

function mixChannel(channel: number, target: number, amount: number) {
  return Math.round(channel + (target - channel) * amount)
}

function mixHex(rgb: [number, number, number], target: number, amount: number) {
  return `rgb(${mixChannel(rgb[0], target, amount)}, ${mixChannel(rgb[1], target, amount)}, ${mixChannel(rgb[2], target, amount)})`
}

/**
 * Draw the rounded node header.
 *
 * Paths depend on node width; redraw after resize and clear the group first.
 * This prevents duplicate paths and text on redraw.
 */
export function renderNodeHeader(g: SVGGElement, options: NodeHeaderOptions) {
  V(g).empty()
  const { title, size, style } = options
  const rx = options.rx ?? 10
  const ry = options.ry ?? 10
  const titleHeight = style.header?.height ?? 24
  const titleFontSize = style.header?.fontSize ?? 12
  const titleTop = style.header?.title?.y ?? 0
  const titleLeft = style.header?.title?.x ?? 0
  const textAlign = style.header?.textAlign ?? 'left'
  const markerSpace = options.breakpoint ? 20 : 0
  const baseColor = style.header?.background ?? '#2b3240'
  const headerPathD = `
      M0,${titleHeight}
      L0,${ry}
      Q0,0 ${rx},0
      L${size.width - rx},0
      Q${size.width},0 ${size.width},${ry}
      L${size.width},${titleHeight}
      Z
    `

  const rgb = parseHexColor(baseColor)
  let headerFill = baseColor
  if (rgb) {
    const gradientId = `bpgraph-header-grad-${++headerGradientSeq}`
    const defs = V('defs')
    const grad = V('linearGradient', { id: gradientId, x1: '0%', y1: '0%', x2: '100%', y2: '100%' })
    grad.append(V('stop', { offset: '0%', 'stop-color': mixHex(rgb, 255, 0.22) }))
    grad.append(V('stop', { offset: '48%', 'stop-color': baseColor }))
    grad.append(V('stop', { offset: '100%', 'stop-color': mixHex(rgb, 0, 0.26) }))
    defs.append(grad)
    g.appendChild(defs.node)
    headerFill = `url(#${gradientId})`
  }

  const titlePath = V('path', {
    d: headerPathD,
    fill: headerFill,
  }).node as SVGPathElement

  const topHighlight = V('line', {
    x1: rx,
    y1: 0.5,
    x2: Math.max(rx, size.width - rx),
    y2: 0.5,
    stroke: 'rgba(255, 255, 255, 0.26)',
    'stroke-width': 1,
    'pointer-events': 'none',
  }).node as SVGLineElement

  const divider = V('line', {
    x1: 0,
    y1: titleHeight,
    x2: size.width,
    y2: titleHeight,
    stroke: 'rgba(255, 255, 255, 0.14)',
    'stroke-width': 1,
  }).node as SVGLineElement

  const textAnchor = textAlign === 'left' ? 'start' : textAlign === 'right' ? 'end' : 'middle'
  let startX = 0
  switch (textAlign) {
    case 'left':
      startX = 10
      break
    case 'right':
      startX = size.width - 10 - markerSpace
      break
    case 'center':
      startX = (size.width - markerSpace) / 2
      break
  }
  const text = V('text', {
    x: startX + titleLeft,
    y: titleHeight / 2 + titleFontSize / 2 - 3 + titleTop,
    fill: style.header?.color ?? '#f8fafc',
    fontSize: titleFontSize,
    fontWeight: 600,
    textAnchor,
  }).node as SVGTextElement
  text.textContent = title

  g.appendChild(titlePath)
  g.appendChild(topHighlight)
  g.appendChild(divider)
  g.appendChild(text)
  if (options.breakpoint) {
    const marker = V('svg', {
      x: size.width - 22,
      y: (titleHeight - 16) / 2,
      width: 16,
      height: 16,
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: '#f87171',
      'stroke-width': 1.8,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      role: 'img',
      'aria-label': translate('Breakpoint', options.language),
    })
    marker.append(V('path', {
      d: 'M8 8h8a2 2 0 0 1 2 2v6a6 6 0 0 1-12 0v-6a2 2 0 0 1 2-2Z M9 8V6a3 3 0 0 1 6 0v2 M8 2l2 2 M16 2l-2 2 M12 9v12 M3 9l3 2 M2 15h4 M3 21l4-3 M21 9l-3 2 M22 15h-4 M21 21l-4-3',
    }))
    const tooltip = V('title').node
    tooltip.textContent = translate('Breakpoint: pause before execution while debugging', options.language)
    marker.node.appendChild(tooltip)
    g.appendChild(marker.node)
  }
}
