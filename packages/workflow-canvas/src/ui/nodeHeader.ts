import { translate, type CanvasLanguage } from './i18n'
import { V } from '@joint/core'
import type { NodeStyle } from '@lyx-pj/workflow-model'

export type NodeHeaderOptions = {
  language?: CanvasLanguage
  title: string
  breakpoint?: boolean
  size: { width: number; height: number }
  style: NodeStyle
  rx?: number
  ry?: number
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
  const rx = options.rx ?? 4
  const ry = options.ry ?? 4
  const titleHeight = style.header?.height ?? 24
  const titleFontSize = style.header?.fontSize ?? 12
  const titleTop = style.header?.title?.y ?? 0
  const titleLeft = style.header?.title?.x ?? 0
  const textAlign = style.header?.textAlign ?? 'left'
  const markerSpace = options.breakpoint ? 20 : 0

  const titlePath = V('path', {
    d: `
      M0,${titleHeight}
      L0,${ry}
      Q0,0 ${rx},0
      L${size.width - rx},0
      Q${size.width},0 ${size.width},${ry}
      L${size.width},${titleHeight}
      Z
    `,
    fill: style.header?.background ?? '#373C44',
  }).node as SVGPathElement

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
    fill: '#fff',
    fontSize: titleFontSize,
    textAnchor,
  }).node as SVGTextElement
  text.textContent = title

  g.appendChild(titlePath)
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
