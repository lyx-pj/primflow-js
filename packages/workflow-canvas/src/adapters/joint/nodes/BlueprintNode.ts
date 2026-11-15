import { dia, util } from '@joint/core'
import { getTextWidth } from '../Util'
import type { InputPort, OutputPort, NodeStyle, NodeExecutionStatus } from '@lyx-pj/workflow-model'

export interface BlueprintNodeAttributes extends dia.Element.Attributes {
  title?: string
  breakpoint?: boolean
  executionStatus?: NodeExecutionStatus
  executionPaused?: boolean
  inputs?: readonly InputPort[]
  outputs?: readonly OutputPort[]
  style?: NodeStyle
  values?: Record<string, unknown>
}

export class BlueprintNode extends dia.Element<BlueprintNodeAttributes> {
  constructor(attributes: BlueprintNodeAttributes = {}, options = {}) {
    const style = (attributes.style || {}) as NodeStyle
    const nodeType = attributes.nodeType
    const markup: BlueprintNodeAttributes['markup'] = [
      { tagName: 'g', groupSelector: 'execution-effects' },
      { tagName: 'rect', groupSelector: 'base-node-body' },
      { tagName: 'g', groupSelector: 'base-node-title' },
    ]
    if (nodeType === 'switch') {
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
      size: { width: 300, height: 100 },
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
                r: 6,
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
                r: 6,
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
    const style = this.get('style') || {}
    const HEADER_HEIGHT = style.header?.height ?? 24
    const portHeight = style.ports?.layout?.rowHeight ?? 20
    const portSpacing = style.ports?.layout?.gap ?? 8
    const portTop = style.ports?.layout?.top ?? 0

    for (const [index, input] of inputs.entries()) {
      if (input.type === 'spacer') {
        continue
      }

      items.push({
        ...this.buildPortItem(input, 'in'),
        id: input.id,
        group: 'in',
        args: {
          y: HEADER_HEIGHT +
            index * portHeight +
            (index + 1) * portSpacing +
            portHeight / 2 +
            portTop
        }
      })
    }
    for (const [index, output] of outputs.entries()) {
      if (output.type === 'spacer') {
        continue
      }
      items.push({
        ...this.buildPortItem(output, 'out'),
        id: output.id,
        group: 'out',
        args: {
          y: HEADER_HEIGHT +
            index * portHeight +
            (index + 1) * portSpacing +
            portHeight / 2 +
            portTop
        }
      })
    }
    this.startBatch('update-ports')
    this.prop(["ports", "items"], items, { ...opt, rewrite: true })
    this.stopBatch('update-ports')
    this.updateSizeByContent()
  }

  buildPortItem(port: InputPort | OutputPort, group: 'in' | 'out'): dia.Element.Port {
    const style = this.get('style') || {}
    const portHeight = style.ports?.layout?.rowHeight ?? 20
    const left = group === 'in'
    const portStyle = left ? style.ports?.input : style.ports?.output
    const fontSize = portStyle?.label?.fontSize ?? 12

    const portLabelX = this.get('ports')?.groups?.in.attrs?.portLabel?.x as number || 12
    const portLabelWidth = left ? getTextWidth(port.label || '', fontSize) : 0

    let showPort = port.showPort !== false
    if (port.type === 'select' && port.showPort !== true) {
      showPort = false
    }
    const item = {
      height: portHeight,
      attrs: {
        portLabel: { text: port.label || '' },
        portForm: {
          x: portLabelX + portLabelWidth + 4,
          y: -portHeight / 2,
          width: style.ports?.input?.editor?.box?.width || 80,
          height: portHeight
        }
      }
    } as dia.Element.Port

    const editor = left ? this.renderPortEditor(port) : ''

    item.markup = util.svg`
      ${showPort ? getPortIcon(port.type) : ''}
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
   */
  renderPortEditor(input: InputPort) {
    if (input.showInput === false) return ''
    switch (input.type) {
      case 'boolean':
      case 'string':
      case 'number':
      case 'select':
        return '<foreignObject @selector="portForm"><div @selector="portEditor" xmlns="http://www.w3.org/1999/xhtml" class="bpgraph-port-editor"></div></foreignObject>'
      default:
        return ''
    }
  }

  updateSizeByContent() {
    const ports = this.getPorts()
    const style = this.get('style') || {}
    const title = this.get('title') || ''
    const nodeType = this.get('nodeType') || ''
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
    if (nodeType === 'switch') {
      portsHeight += portHeight * 0.3 + portGap
    }
    const titleWidth = title.length > 0 ? getTextWidth(title, headerFontSize) : 0
    const inputsWidth = inputPorts.length > 0 ? Math.max(...inputPorts.map(port => {
      const label = port.attrs?.portLabel?.text ?? ''
      const markup: dia.MarkupNodeJSON[] = port.markup as dia.MarkupNodeJSON[] || []
      const fontSize = style.ports?.input?.label?.fontSize || 12
      const isPortForm = markup.some(m => m.selector === 'portForm')
      const inputWidth = isPortForm ? (editorBoxWidth + 8) : 0
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

function getPortIcon(type: string) {
  switch(type) {
    case 'exec':
      return `
      <path @selector='portBody' d="${squareArrowPath(12, 12)}" />
      <title>${type}</title>`
    default:
      return `<circle @selector="portBody" r="6" />
      <title>${type}</title>`
  }
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
