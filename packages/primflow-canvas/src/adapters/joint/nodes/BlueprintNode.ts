import { dia, util } from '@joint/core'
import { getTextWidth } from '../Util'
import { isControlPort, isSpacerPort } from '@lyx-pj/primflow-model'
import type { InputPort, OutputPort, NodeStyle, NodeExecutionStatus, PortShape, LoopConfig } from '@lyx-pj/primflow-model'
import type { EditorRegistry } from '../../../ui/editors'
import type { NodeRendererRegistration } from '../../../ui/nodeRenderers'
import { isPortVisible } from '../../../utils/ports'

export interface BlueprintNodeAttributes extends dia.Element.Attributes {
  title?: string
  breakpoint?: boolean
  /** Collapsed presentation for a container card. */
  collapsed?: boolean
  /** Loop configuration, shown as a compact summary on the loop card. */
  loop?: LoopConfig
  executionStatus?: NodeExecutionStatus
  executionPaused?: boolean
  inputs?: readonly InputPort[]
  outputs?: readonly OutputPort[]
  style?: NodeStyle
  values?: Record<string, unknown>
  /**
   * Application editor registry.
   *
   * Port markup is built before the node joins the joint graph, so the
   * registry travels with the node instead of being read from the graph.
   */
  editors?: EditorRegistry
  /**
   * Application node renderer.
   *
   * When present the node draws the renderer's content instead of the built-in
   * header and body, while ports and links keep working.
   */
  nodeRenderer?: NodeRendererRegistration
}

/**
 * Outline opacity for an unconnected port.
 *
 * Matches the translucent outline the default style used before ports carried a
 * type colour, so an idle port recedes while a connected one reads as full.
 */
const RESTING_PORT_STROKE_OPACITY = 0.5

/** Namespace for HTML content rendered inside a node `foreignObject`. */
const HTML_NAMESPACE = 'http://www.w3.org/1999/xhtml'

/** Nodes already reported for ports outside their declared size. */
const warnedPortOverflow = new WeakSet<dia.Element>()

export class BlueprintNode extends dia.Element<BlueprintNodeAttributes> {
  constructor(attributes: BlueprintNodeAttributes = {}, options = {}) {
    const style = (attributes.style || {}) as NodeStyle
    const kind = attributes.kind
    // A registered renderer draws its own content, so the built-in header and
    // body are opt-in rather than the default.
    const renderer = attributes.nodeRenderer
    const markup: BlueprintNodeAttributes['markup'] = [
      { tagName: 'g', groupSelector: 'execution-effects' },
    ]
    if (!renderer || renderer.body) {
      markup.push({ tagName: 'rect', groupSelector: 'base-node-body', className: 'bpgraph-node-body' })
    }
    if (!renderer || renderer.header) {
      markup.push({ tagName: 'g', groupSelector: 'base-node-title' })
    }
    if (renderer) {
      // A custom renderer may omit the built-in body. This transparent shape
      // gives the selection highlighter something to outline.
      markup.push({ tagName: 'rect', groupSelector: 'base-node-selection' })
      markup.push({
        tagName: 'foreignObject',
        groupSelector: 'base-node-custom',
        children: [{
          tagName: 'div',
          selector: 'nodeCustomRoot',
          namespaceURI: HTML_NAMESPACE,
          className: 'bpgraph-node-custom-root',
        }],
      })
    }
    if (kind === 'switch') {
      markup.push({ tagName: 'g', groupSelector: 'switch-plus', children: [
        { tagName: 'rect', groupSelector: 'switch-plus-rect' },
        { tagName: 'path', groupSelector: 'switch-plus-icon' }
      ] })
    }
    const rowHeight = style.ports?.layout?.rowHeight ?? 20
    const rowSpacing = style.ports?.layout?.gap ?? 8
    const portStroke = style.ports?.output?.port?.stroke ?? 'rgba(255, 255, 255, 0.8)'
    super(util.defaultsDeep(attributes, {
      type: 'custom.BlueprintNode',
      // A renderer owns its size; port placement reads it during construction.
      size: renderer?.size ?? { width: 300, height: 100 },
      inputs: [],
      outputs: [],
      attrs: {
        'base-node-body': {
          refWidth: '100%',
          refHeight: '100%',
          fill: style.background ?? 'rgba(41, 44, 47, 0.9)',
          stroke: style.background ?? 'rgba(41, 44, 47, 0.9)',
          strokeWidth: 1,
          rx: style.borderRadius ?? 8,
          ry: style.borderRadius ?? 8
        },
        'base-node-selection': {
          refWidth: '100%',
          refHeight: '100%',
          fill: 'transparent',
          stroke: 'transparent',
          strokeWidth: 1,
          rx: style.borderRadius ?? 8,
          ry: style.borderRadius ?? 8,
          pointerEvents: 'none',
        },
        'base-node-custom': {
          refWidth: '100%',
          refHeight: '100%',
        },
        'switch-plus': {
          cursor: 'pointer',
          refX: '100%',
          refY: '100%',
          transform: 'translate(-22, -' + (rowSpacing + rowHeight * 0.5) + ')',
        },
        'switch-plus-rect': {
          width: 12,
          height: 12,
          fill: 'transparent',
          stroke: 'transparent',
          strokeWidth: 1,
        },
        'switch-plus-icon': {
          d: 'M2 6 L10 6 M6 2 L6 10',
          stroke: portStroke,
          strokeWidth: 1.5,
          pointerEvents: 'none'
        }
      },
      markup: markup,
      ports: {
        groups: {
          in: {
            position: {
              name: 'absolute',
              args: {
                x: 6 + 10
              }
            },
            attrs: {
              portBody: {
                fill: style.ports?.input?.port?.fill ?? 'rgba(255, 255, 255, 0.5)',
                stroke: style.ports?.input?.port?.stroke ?? 'rgba(255, 255, 255, 0.8)',
                strokeWidth: style.ports?.input?.port?.strokeWidth ?? 1,
                r: style.ports?.input?.port?.r ?? 6,
                magnet: 'inout',
                cursor: "crosshair"
              },
              portLabel: {
                x: 12,
                y: '0.3em',
                textAnchor: 'start',
                fontSize: style.ports?.input?.label?.fontSize ?? 12,
                fill: style.ports?.input?.label?.color ?? '#fff'
              },
            },
          },
          out: {
            position: {
              name: 'absolute',
              args: {
                x: 'calc(w - 16)'
              }
            },
            attrs: {
              portBody: {
                fill: style.ports?.output?.port?.fill ?? 'rgba(255, 255, 255, 0.5)',
                stroke: style.ports?.output?.port?.stroke ?? 'rgba(255, 255, 255, 0.8)',
                strokeWidth: style.ports?.output?.port?.strokeWidth ?? 1,
                r: style.ports?.output?.port?.r ?? 6,
                magnet: "inout",
                cursor: "crosshair"
              },
              portLabel: {
                x: -12,
                y: '0.3em',
                textAnchor: 'end',
                fontSize: style.ports?.output?.label?.fontSize ?? 12,
                fill: style.ports?.output?.label?.color ?? '#fff'
              }
            }
          }
        }
      }
    }), options)
  }

  initialize(...args: Parameters<dia.Element['initialize']>) {
    super.initialize(...args)
    if (this.getPorts().length === 0) {
      this.buildPortItems()
    }
    this.on(
      "change:inputs change:outputs",
      (_el, _changed, opt) => this.buildPortItems(opt)
    )
  }

  title(value: string) {
    this.set('title', value)
    // A registered renderer owns the node size; the title does not resize it.
    if (this.get('nodeRenderer')?.size) return
    const titleWidth = value.length > 0 ? getTextWidth(value, this.get('style')?.header?.fontSize || 12) : 0
    const size = this.get('size')
    const width = size?.width || 0
    if (titleWidth + 35 > width) {
      this.resize(titleWidth + 35, size?.height || 100)
      return
    }
    this.updateSizeByContent()
  }
  
  setStyle(style: NodeStyle) {
    this.set('style', style)
  }

  setValues(values: Record<string, unknown>) {
    this.set('values', values)
  }

  buildPortItems(opt = {}) {
    const items = [] as dia.Element.Port[]
    const inputs = this.get('inputs') as InputPort[] || []
    const outputs = this.get('outputs') as OutputPort[] || []
    /** Row-layout port centres, used to detect a declared size that is too small. */
    const rowTops: number[] = []

    for (const [index, input] of inputs.entries()) {
      if (isSpacerPort(input.type)) {
        continue
      }

      const placement = this.portArgs(input, 'in', index)
      if (!placement.placed) rowTops.push(placement.args.y)
      items.push({
        ...this.buildPortItem(input, 'in', index),
        id: input.id,
        group: 'in',
        args: placement.args,
      })
    }
    for (const [index, output] of outputs.entries()) {
      if (isSpacerPort(output.type)) {
        continue
      }
      const placement = this.portArgs(output, 'out', index)
      if (!placement.placed) rowTops.push(placement.args.y)
      items.push({
        ...this.buildPortItem(output, 'out', index),
        id: output.id,
        group: 'out',
        args: placement.args,
      })
    }
    this.startBatch('update-ports')
    this.prop(["ports", "items"], items, { ...opt, rewrite: true })
    this.stopBatch('update-ports')
    this.updateSizeByContent()
    this.warnPortOverflow(rowTops)
  }

  /**
   * Warn once when the built-in port rows do not fit a renderer-declared size.
   *
   * A renderer that declares `size` describes its own layout, so ports left on
   * the row layout can silently fall outside the node. Only the rows are
   * checked; ports placed with `portPosition` are the renderer's own business.
   */
  private warnPortOverflow(rowTops: number[]) {
    const declared = this.get('nodeRenderer')?.size
    if (!declared || rowTops.length === 0) return
    const style = this.get('style') || {}
    const portHeight = style.ports?.layout?.rowHeight ?? 20
    const reach = Math.max(...rowTops) + portHeight / 2
    if (reach <= declared.height) return
    if (warnedPortOverflow.has(this)) return
    warnedPortOverflow.add(this)
    console.warn(
      `Node "${this.id}" draws a port at ${Math.round(reach)}px, outside its declared height of ${declared.height}px. ` +
      'Increase size.height or place the port with portPosition.',
    )
  }

  /**
   * Position arguments for one port.
   *
   * A registered renderer may place the port itself. Otherwise the port keeps
   * the built-in row layout, which follows the header height and row spacing.
   */
  private portArgs(
    port: InputPort | OutputPort,
    group: 'in' | 'out',
    index: number,
  ): { args: { x?: number; y: number }; placed: boolean } {
    const style = this.get('style') || {}
    const custom = this.get('nodeRenderer')?.portPosition
    if (custom) {
      const { width, height } = this.size()
      const position = custom({ port, group, index, width, height })
      // An omitted x keeps the group edge offset, so only y is overridden.
      if (position) {
        return {
          args: position.x === undefined
            ? { y: position.y }
            : { x: position.x, y: position.y },
          placed: true,
        }
      }
    }
    const headerHeight = style.header?.height ?? 24
    const portHeight = style.ports?.layout?.rowHeight ?? 20
    const portSpacing = style.ports?.layout?.gap ?? 8
    const portTop = style.ports?.layout?.top ?? 0
    return {
      args: {
        y: headerHeight +
          index * portHeight +
          (index + 1) * portSpacing +
          portHeight / 2 +
          portTop,
      },
      placed: false,
    }
  }

  buildPortItem(port: InputPort | OutputPort, group: 'in' | 'out', index = 0): dia.Element.Port {
    const style = this.get('style') || {}
    const portHeight = style.ports?.layout?.rowHeight ?? 20
    const left = group === 'in'
    const portStyle = left ? style.ports?.input : style.ports?.output
    const fontSize = portStyle?.label?.fontSize ?? 12

    const portLabelX = this.get('ports')?.groups?.in.attrs?.portLabel?.x as number || 12
    const portLabelWidth = left ? getTextWidth(port.label || '', fontSize) : 0

    const portRadius = portStyle?.port?.r ?? 6
    // A port is drawn as an outline until a link connects it, so the resting
    // fill matches the node background. The outline carries the type colour, so
    // a port keeps its identity before and after it is filled. A type-coloured
    // outline recedes until the port is connected, which keeps a busy node calm.
    const typeColor = style.ports?.colors?.[port.type]
    const portFill = portStyle?.port?.fill ?? 'rgba(255, 255, 255, 0.5)'
    const portStroke = typeColor
      ?? portStyle?.port?.stroke
      ?? 'rgba(255, 255, 255, 0.8)'

    // A registered renderer may place the inline control for a custom layout.
    const editorPlacement = this.get('nodeRenderer')?.portEditorPosition?.({
      port,
      group,
      index,
      ...this.size(),
    })

    const showPort = isPortVisible(port, group)
    // Hovering the port reads this metadata from the DOM, so custom renderers
    // and rebuilt ports keep the tooltip without extra lookups in the model.
    const displayName = port.label || port.name
    const tooltipAttributes = {
      'data-port-name': port.name,
      'data-port-label': port.label ?? '',
      'data-port-type': port.type,
      'data-port-direction': group,
    }
    const item = {
      height: portHeight,
      attrs: {
        portBody: {
          fill: portFill,
          stroke: portStroke,
          strokeOpacity: typeColor ? RESTING_PORT_STROKE_OPACITY : 1,
          r: portRadius,
          'aria-label': `${displayName} (${port.type})`,
          ...tooltipAttributes,
        },
        portLabel: {
          text: port.showLabel === false ? '' : (port.label || ''),
          ...(port.labelPosition?.x !== undefined ? { x: port.labelPosition.x } : {}),
          ...(port.labelPosition?.y !== undefined ? { y: port.labelPosition.y } : {}),
          ...tooltipAttributes,
        },
        portForm: {
          x: editorPlacement?.x ?? (portLabelX + portLabelWidth + 4),
          y: editorPlacement?.y ?? -portHeight / 2,
          width: left && 'showInput' in port ? this.portEditorWidth(port) : (style.ports?.input?.editor?.box?.width || 80),
          height: portHeight
        }
      }
    } as dia.Element.Port

    const editor = left ? this.renderPortEditor(port) : ''

    item.markup = util.svg`
      ${showPort ? getPortIcon(port.type, portRadius, style.ports?.shapes?.[port.type]) : ''}
      <text @selector='portLabel' />
      ${
        editor ? editor : ''
      }
    `
    return item
  }

  /**
   * Keep only an editor mount point in ports; lit renders the editor (ui/portEditors.ts).
   * Avoid concatenating HTML values into port markup without escaping.
   *
   * A registered application editor also gets a mount point, so a custom data
   * type can render a control next to its port.
   */
  renderPortEditor(input: InputPort) {
    if (input.showInput === false) return ''
    if (this.hasCustomEditor(input)) {
      return '<foreignObject @selector="portForm"><div @selector="portEditor" xmlns="http://www.w3.org/1999/xhtml" class="bpgraph-port-editor"></div></foreignObject>'
    }
    switch (input.editor ?? input.type) {
      case 'boolean':
      case 'string':
      case 'number':
      case 'select':
        return '<foreignObject @selector="portForm"><div @selector="portEditor" xmlns="http://www.w3.org/1999/xhtml" class="bpgraph-port-editor"></div></foreignObject>'
      default:
        return ''
    }
  }

  /** Whether the application registered a port editor for this port type. */
  hasCustomEditor(input: InputPort) {
    const editors = this.get('editors')
    return editors?.has(input.type, 'port') ?? false
  }

  /**
   * Width of the control shown next to a port.
   *
   * A port may declare its own width, a registered editor may declare one, and
   * otherwise the global editor box width applies.
   */
  portEditorWidth(input: InputPort) {
    if (input.editorWidth !== undefined) return input.editorWidth
    const registered = this.get('editors')?.get(input.type, 'port')
    if (registered?.width !== undefined) return registered.width
    const style = this.get('style') || {}
    return style.ports?.input?.editor?.box?.width || 80
  }

  updateSizeByContent() {
    // A registered renderer owns its layout, so the built-in port-row sizing
    // does not describe it.
    const rendererSize = this.get('nodeRenderer')?.size
    if (rendererSize) {
      this.resize(rendererSize.width, rendererSize.height)
      return
    }
    const ports = this.getPorts()
    const style = this.get('style') || {}
    const title = this.get('title') || ''
    const kind = this.get('kind') || ''
    const headerFontSize = style.header?.fontSize ?? 12
    const inputPorts = ports.filter(port => port.group === 'in')
    const outputPorts = ports.filter(port => port.group === 'out')
    const portCount = inputPorts.length > outputPorts.length ? inputPorts.length : outputPorts.length

    const titleHeight = style.header?.height ?? 24
    const portHeight = style.ports?.layout?.rowHeight ?? 20
    const portGap = style.ports?.layout?.gap ?? 8

    const paddingTop = style.ports?.layout?.top ?? 0
    const paddingBottom = style.ports?.layout?.bottom ?? 20

    const editorBoxWidth = style.ports?.input?.editor?.box?.width || 80

    let portsHeight = portCount > 0 ? portCount * portHeight + (portCount + 1) * portGap : 0
    if (kind === 'switch') {
      portsHeight += portHeight * 0.3 + portGap
    }
    const titleWidth = title.length > 0 ? getTextWidth(title, headerFontSize) : 0
    const inputsWidth = inputPorts.length > 0 ? Math.max(...inputPorts.map(port => {
      const label = port.attrs?.portLabel?.text ?? ''
      const markup: dia.MarkupNodeJSON[] = port.markup as dia.MarkupNodeJSON[] || []
      const fontSize = style.ports?.input?.label?.fontSize || 12
      const isPortForm = markup.some(m => m.selector === 'portForm')
      // Read the width the port actually uses so a custom editor width and the
      // node width stay consistent.
      const portWidth = (port.attrs?.portForm?.width as number | undefined) ?? editorBoxWidth
      const inputWidth = isPortForm ? (portWidth + 8) : 0
      const labelWidth = label.length > 0 ? getTextWidth(label, fontSize) : 0
      return labelWidth + 25 + inputWidth
    })) : 0
    const outputsWidth = outputPorts.length > 0 ? Math.max(...outputPorts.map(port => {
      const label = port.attrs?.portLabel?.text ?? ''
      const fontSize = style.ports?.output?.label?.fontSize || 12
      const labelWidth = label.length > 0 ? getTextWidth(label, fontSize) : 0
      return labelWidth + 25
    })) : 0

    const minWidth = 120
    const minHeight = 60

    const height = Math.max(
      minHeight,
      titleHeight + portsHeight + paddingTop + paddingBottom
    )
    const width = Math.max(
      minWidth,
      titleWidth + 35,
      inputsWidth + outputsWidth + 14
    )

    this.resize(width, height)
  }
}

/** SVG geometry for one port body shape, drawn around the port origin. */
const PORT_SHAPE_GEOMETRY: Record<PortShape, (radius: number) => { tag: string; attrs: string }> = {
  circle: (r) => ({ tag: 'circle', attrs: `r="${r}"` }),
  square: (r) => ({ tag: 'rect', attrs: `x="${-r}" y="${-r}" width="${r * 2}" height="${r * 2}"` }),
  diamond: (r) => ({ tag: 'path', attrs: `d="M0,${-r} L${r},0 L0,${r} L${-r},0 Z"` }),
  triangle: (r) => ({ tag: 'path', attrs: `d="M${-r},${-r} L${r},0 L${-r},${r} Z"` }),
  hexagon: (r) => {
    const half = r * 0.866
    return {
      tag: 'path',
      attrs: `d="M${r},0 L${r / 2},${half} L${-r / 2},${half} L${-r},0 L${-r / 2},${-half} L${r / 2},${-half} Z"`,
    }
  },
  // Three parallel bars read as "several items", following the list and array
  // glyphs used by node editors for collection ports.
  bars: (r) => {
    const width = r * 0.34
    const gap = r * 0.22
    const height = r * 1.8
    const top = -r * 0.9
    const start = -(3 * width + 2 * gap) / 2
    const d = [0, 1, 2]
      .map((index) => {
        const x = start + index * (width + gap)
        return `M${x},${top} h${width} v${height} h${-width} Z`
      })
      .join(' ')
    return { tag: 'path', attrs: `d="${d}"` }
  },
  arrow: (r) => ({ tag: 'path', attrs: `d="${squareArrowPath(r * 2, r * 2)}"` }),
}

/**
 * Markup for one port body.
 *
 * A type without a configured shape keeps the built-in default: an arrow for
 * execution ports and a circle for every data port. The `data-port-kind`
 * attribute marks control ports apart from data ports, so styling and tests do
 * not depend on the underlying SVG element.
 */
function getPortIcon(type: string, radius = 6, shape?: PortShape) {
  const kind = isControlPort(type) ? 'exec' : 'data'
  // Guard the lookup: a graph may carry a shape id this build does not know.
  const resolved = PORT_SHAPE_GEOMETRY[shape ?? (kind === 'exec' ? 'arrow' : 'circle')]
    ? (shape ?? (kind === 'exec' ? 'arrow' : 'circle'))
    : 'circle'
  const { tag, attrs } = PORT_SHAPE_GEOMETRY[resolved](radius)
  // The name and type live in port attributes instead of a native <title>, so
  // the canvas draws one styled tooltip and the browser shows no second hint.
  return `<${tag} @selector="portBody" data-port-kind="${kind}" ${attrs} />`
}

function squareArrowPath(w: number, h: number) {
  const param = Math.max(w * 0.4, 0)
  const offsetX = w / 2
  const offsetY = h / 2
  return [
    `M${0 - offsetX},${0 - offsetY}`,
    `L${w - param - offsetX},${0 - offsetY}`,
    `L${w - offsetX},${h / 2 - offsetY}`,
    `L${w - param - offsetX},${h - offsetY}`,
    `L${0 - offsetX},${h - offsetY} Z`
  ].join(' ')
}
