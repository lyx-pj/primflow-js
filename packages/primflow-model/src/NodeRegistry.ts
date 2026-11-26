import { DataTypeRegistry, type DataType, type StreamType } from './DataTypes'
import { builtinNodes, EndNode, type BuiltinNodeType } from './builtin/nodes'
import { resolveNodeDefinition, setRegisteredDefinitionId, type NodeClassType, type RegisteredNodeDefinition } from './Node'
import { mergeDeep } from './shared/merge'

const defaultNodeStyle: NodeStyle = {
  background: 'rgba(41, 44, 47, 1)',
  borderRadius: 6,
  highlightStroke: 'blue',
  highlightStrokeWidth: 1,
  header: {
    height: 24,
    fontSize: 14,
    background: 'rgba(60, 63, 67, 1)',
    color: '#fff',
    textAlign: 'left',
    title: { x: 0, y: 0 }
  },
  ports: {
    layout: {
      rowHeight: 24,
      gap: 10,
      top: 0,
      bottom: 0
    },
    colors: {
      string: '#56B4E9',
      number: '#009E73',
      boolean: '#E69F00',
      array: '#CC79A7',
      object: '#F0E442',
      // A generic data port stays neutral; the lighter slate keeps its resting
      // outline readable at the default resting opacity.
      any: '#B8C4D6'
    },
    shapes: {
      string: 'circle',
      number: 'circle',
      boolean: 'diamond',
      array: 'bars',
      object: 'square',
      any: 'hexagon'
    },
    input: {
      port: {
        fill: 'rgba(41, 44, 47, 1)',
        stroke: 'rgba(255, 255, 255, 0.5)'
      },
      label: { fontSize: 12, color: '#fff' },
      editor: {
        box: {
          background: 'rgba(30, 33, 36, 0.8)',
          borderColor: 'rgba(120, 130, 140, 0.3)',
          borderRadius: 4,
          color: 'rgba(255, 255, 255, 0.9)',
          width: 80
        },
        dropdown: {
          background: '#222',
          borderColor: '#444',
          borderRadius: 4,
          color: 'rgba(255, 255, 255)'
        }
      }
    },
    output: {
      port: {
        fill: 'rgba(41, 44, 47, 1)',
        stroke: 'rgba(255, 255, 255, 0.5)'
      },
      label: { fontSize: 12, color: '#fff' },
    }
  }
}

const defaultLinkStyle: LinkStyle = {
  stroke: 'rgba(255, 255, 255, 0.5)',
  strokeWidth: 1,
  highlightStroke: 'blue',
}

export class NodeRegistry<NodeDefs extends Record<string, unknown> = BuiltinNodeType> {
  readonly registry: Readonly<NodeDefs> = { ...builtinNodes } as unknown as NodeDefs
  readonly dataTypes = new DataTypeRegistry()
  nodeStyle: NodeStyle
  linkStyle: LinkStyle

  constructor(nodeStyle: NodeStyle = {}, linkStyle: LinkStyle = {}) {
    for (const [id, NodeClass] of Object.entries(builtinNodes)) setRegisteredDefinitionId(NodeClass, id)
    setRegisteredDefinitionId(EndNode, 'end')
    this.nodeStyle = mergeDeep(
      defaultNodeStyle as Record<string, unknown>,
      (nodeStyle || {}) as Record<string, unknown>
    )

    this.linkStyle = mergeDeep(
      defaultLinkStyle as Record<string, unknown>,
      (linkStyle || {}) as Record<string, unknown>
    )
  }

  registerDataType(type: DataType | StreamType): this {
    this.dataTypes.register(type)
    return this
  }

  register<K extends string, V extends NodeClassType>(
    definitionId: K,
    NodeClass: V
  ): NodeRegistry<NodeDefs & { [P in K]: V }> {
    if (definitionId.trim() === '') throw new Error('Node definition ID must not be empty.')
    const existing = definitionId === 'end' ? EndNode
      : Object.hasOwn(this.registry, definitionId) ? this.registry[definitionId] : undefined
    if (existing === NodeClass) return this as unknown as NodeRegistry<NodeDefs & { [P in K]: V }>
    if (existing !== undefined) throw new Error(`Node definition ID "${definitionId}" is already registered.`)

    const registeredId = NodeClass.definitionId
    if (registeredId !== undefined && registeredId !== definitionId) {
      throw new Error(`Node class "${NodeClass.name}" is already registered as "${registeredId}".`)
    }

    const inputNameSet = new Set<string>()
    for (const input of NodeClass.definition.inputs) {
      if (inputNameSet.has(input.name)) {
        throw new Error(`Input name "${input.name}" is duplicated in node type "${definitionId}".`)
      }
      inputNameSet.add(input.name)
    }
    const outputNameSet = new Set<string>()
    for (const output of NodeClass.definition.outputs) {
      if (outputNameSet.has(output.name)) {
        throw new Error(`Output name "${output.name}" is duplicated in node type "${definitionId}".`)
      }
      outputNameSet.add(output.name)
    }

    const desc = Object.getOwnPropertyDescriptor(NodeClass, 'type')
    if (!desc || desc.configurable) {
      Object.defineProperty(NodeClass, 'type', { value: definitionId, writable: false, configurable: false, enumerable: true })
    }
    setRegisteredDefinitionId(NodeClass, definitionId)
    Object.defineProperty(this.registry, definitionId, { value: NodeClass, enumerable: true })
    return this as unknown as NodeRegistry<NodeDefs & { [P in K]: V }>
  }

  getDefinition(definitionId: string): RegisteredNodeDefinition {
    return resolveNodeDefinition(this.getNodeClass(definitionId))
  }

  get<T extends keyof NodeDefs>(nodeType: T): NodeDefs[T] {
    if (nodeType === 'end') return EndNode as unknown as NodeDefs[T]
    if (!Object.hasOwn(this.registry, nodeType)) {
      throw new Error(`Node type "${String(nodeType)}" is not registered.`)
    }
    return this.registry[nodeType] as NodeDefs[T] extends NodeClassType ? NodeDefs[T] : never
  }

  /** Look up classes by type name at runtime without requiring registry generic narrowing. */
  getNodeClass(nodeType: string): NodeClassType {
    if (nodeType === 'end') return EndNode
    if (!Object.hasOwn(this.registry, nodeType)) {
      throw new Error(`Node type "${nodeType}" is not registered.`)
    }
    return (this.registry as Record<string, NodeClassType>)[nodeType]
  }

  getNodeTypes(): (keyof NodeDefs)[] {
    return Object.keys(this.registry) as (keyof NodeDefs)[]
  }

  getNodeClasses(): NodeDefs[keyof NodeDefs][] {
    return Object.values(this.registry) as NodeDefs[keyof NodeDefs][]
  }

  isRegistered<T extends keyof NodeDefs>(nodeType: T | NodeDefs[T]): boolean {
    if (nodeType === EndNode || nodeType === 'end') return true
    if (typeof nodeType === 'string') {
      return Object.hasOwn(this.registry, nodeType)
    }

    return Object.keys(this.registry).some((key) => this.registry[key as keyof NodeDefs] === nodeType)
  }

  getStartNodeClass(): NodeClassType {
    return builtinNodes['start']
  }

  getEndNodeClass(): NodeClassType {
    return EndNode
  }
}

/** Port body shapes. */
export type PortShape = 'circle' | 'square' | 'diamond' | 'triangle' | 'hexagon' | 'bars' | 'arrow'

export interface NodeStyle {
  background?: string
  borderRadius?: number
  highlightStroke?: string
  highlightStrokeWidth?: number
  header?: {
    textAlign?: 'left' | 'center' | 'right'
    background?: string
    color?: string
    height?: number
    fontSize?: number
    title?: {
      x?: number
      y?: number
    }
  }
  ports?: {
    layout?: {
      rowHeight?: number
      gap?: number
      top?: number
      bottom?: number
    }
    /**
     * Port fill colour per data type id.
     *
     * Distinguishes port types at a glance, like colour-coded sockets. Falls
     * back to `port.fill` for a type that is not listed.
     */
    colors?: Record<string, string>
    /**
     * Port body shape per data type id.
     *
     * Pairs with `colors` so a port kind stays recognisable without relying on
     * colour alone. Execution ports default to `arrow` and every other type to
     * `circle`.
     */
    shapes?: Record<string, PortShape>
    input?: {
      port?: {
        /** Port dot radius in pixels; defaults to 6. */
        r?: number
        fill?: string
        stroke?: string
        strokeWidth?: number
        highlightFill?: string
        highlightStroke?: string
        highlightStrokeWidth?: number
      }
      label?: {
        fontSize?: number
        color?: string
      }
      editor?: {
        box?: {
          background?: string
          borderColor?: string
          borderRadius?: number
          fontSize?: number
          color?: string
          width?: number
        },
        dropdown?: {
          background?: string
          borderColor?: string
          borderRadius?: number
          color?: string
        }
      }
    }
    output?: {
      port?: {
        /** Port dot radius in pixels; defaults to 6. */
        r?: number
        fill?: string
        stroke?: string
        strokeWidth?: number
        highlightFill?: string
        highlightStroke?: string
        highlightStrokeWidth?: number
      }
      label?: {
        fontSize?: number
        color?: string
      }
    }
  }
}

export interface LinkStyle {
  stroke?: string
  strokeWidth?: number
  highlightStroke?: string
  highlightStrokeWidth?: number
}
