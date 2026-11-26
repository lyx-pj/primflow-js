import { DataTypeRegistry, portTypeId, type PortType, type PortTypeId, type PortValue, type StreamType } from './DataTypes'
import type { JsonValue, TaskStateSnapshot } from './TaskState'
import type { ExecutorFn, EventFn, NodeHost, ToolsViewHost, NodeLifecycleHook, LoopConfig, NodeRetryPolicy } from './types'
import { mergeDeep } from './shared/merge'
import { ChangedEvent } from './ChangedEvent'
import type { NodeStyle } from './NodeRegistry'

interface Port {
  name: string
  label?: string
  id?: string
  showPort?: boolean
  /** Draw the port label next to the port; defaults to true. */
  showLabel?: boolean
  /**
   * Label offset from the port, in pixels.
   *
   * Overrides the group default, which places input labels to the right of the
   * port and output labels to its left.
   */
  labelPosition?: { x?: number; y?: number }
}

export type InputPort<T = string> = Port & {
  showInput?: boolean
  options?: ((values: Record<string, unknown>) => { label: string; value: string }[] | Promise<{ label: string; value: string }[]>) | (readonly { label: string; value: string }[])
  _options?: readonly { label: string; value: string }[]
  type: T
  editor?: 'select' | 'textarea'
  /**
   * Width of the control shown next to the port on the canvas.
   *
   * Overrides the global editor box width, so a port can use a control that
   * needs more or less room than the default.
   */
  editorWidth?: number
}

export interface OutputPort<T = string> extends Port {
  type: T
}

export type NodePortValue<T> = PortValue<T>
type InstancePorts<P extends readonly { type: PortType }[]> = {
  [K in keyof P]: Omit<P[K], 'type'> & { type: PortTypeId<P[K]['type']> }
}

export interface ExecutorArgs<T extends NodeClassType> {
  getInput: (name: T['definition']['inputs'][number]['name']) => unknown
  setOutput: (name: T['definition']['outputs'][number]['name'], value: unknown) => void
  next: () => void | Promise<void>
  services: Record<string, unknown>
}

export type NodeClassType = typeof Node
const registeredDefinitionIds = new WeakMap<NodeClassType, string>()

export function setRegisteredDefinitionId(NodeClass: NodeClassType, id: string) {
  registeredDefinitionIds.set(NodeClass, id)
}

export type InputsToValues<T extends { inputs: readonly { name: string; type: PortType }[] }> =
  T['inputs'] extends readonly unknown[]
    ? { [K in T['inputs'][number] as K['type'] extends 'exec' | 'spacer' | StreamType ? never : K['name']]: NodePortValue<K['type']> }
    : {}

export type NodeOptions<T extends NodeClassType> = {
  id?: string
  title?: string
  position?: { x: number; y: number }
  /** Application configuration persisted with the node. */
  data?: JsonValue
  inputValues?: Partial<InputsToValues<T['definition']>>
  style?: NodeStyle
  inputs?: InputPort[]
  outputs?: OutputPort[]
  targetGraphId?: string
  /** @deprecated Use targetGraphId. */
  subgraphId?: string
  breakpoint?: boolean
  /** Collapsed presentation for a container card; defaults to false. */
  collapsed?: boolean
  loop?: LoopConfig
}

export type NodeValueOutput =
  | { input: string; fallback: unknown }
  | { input: string; read: (input: unknown, state: TaskStateSnapshot) => unknown }

abstract class Node {

  static definition: {
    inputs: readonly InputPort<PortType>[]
    outputs: readonly OutputPort<PortType>[]
    name?: string
    kind?: string
    /** @deprecated Use name. */
    title?: string
    style?: NodeStyle
    /** @deprecated Use kind. */
    type?: string
    executionMode?: 'step' | 'source' | 'stream'
    /** Data-only outputs forward an input or read task state when a consumer needs the value. */
    valueOutputs?: Readonly<Record<string, NodeValueOutput>>
  } = {
    inputs: [] as const,
    outputs: [] as const,
    style: {}
  } as const

  /**
   * The node's executor.
   *
   * Use a function for a self-contained node. Use a string to name an executor
   * the engine registers, which keeps the node definition free of behavior and
   * lets the implementation live outside the node package.
   */
  declare static executor?: ExecutorFn | string

  /** @deprecated Use definitionId. */
  declare static readonly type: string

  static get definitionId(): string | undefined {
    return registeredDefinitionIds.get(this)
  }

  declare static retryPolicy?: NodeRetryPolicy

  /** Validate published values when tracing a downstream input failure. */
  declare static outputValidators?: Readonly<Record<string, (value: unknown) => boolean>>

  declare static onEvent?: EventFn

  declare static onActive?: NodeLifecycleHook

  declare static onDeactivate?: NodeLifecycleHook

  declare static onDestroy?: NodeLifecycleHook
}

type NodeDefinitionOptions = Pick<NodeClassType,
  'definition' | 'executor' | 'retryPolicy' | 'outputValidators' |
  'onEvent' | 'onActive' | 'onDeactivate' | 'onDestroy'
> & { type?: string }

type DefinedNode<T extends NodeDefinitionOptions> =
  Omit<NodeClassType, keyof NodeDefinitionOptions & keyof T> &
  Pick<T, keyof NodeDefinitionOptions & keyof T> &
  (abstract new () => Node)

/** Define a registrable node while retaining the literal types of its ports. */
export function defineNode<const T extends NodeDefinitionOptions>(options: T): DefinedNode<T> {
  const { type, executor, retryPolicy, outputValidators, onEvent, onActive, onDeactivate, onDestroy } = options
  class RegisteredNode extends Node {
    static override get definition() {
      return options.definition
    }
  }
  return Object.assign(RegisteredNode, {
    type, executor, retryPolicy, outputValidators, onEvent, onActive, onDeactivate, onDestroy,
  }) as unknown as DefinedNode<T>
}

export type RegisteredNodeDefinition<T extends NodeClassType = NodeClassType> = Omit<T['definition'], 'inputs' | 'outputs'> & {
  inputs: InstancePorts<T['definition']['inputs']>
  outputs: InstancePorts<T['definition']['outputs']>
  readonly id: string
  name?: string
  readonly kind: string
}

export function resolveNodeDefinition<T extends NodeClassType>(NodeClass: T): RegisteredNodeDefinition<T> {
  const definition = NodeClass.definition
  const resolved = {
    ...definition,
    inputs: definition.inputs.map(input => ({ ...input, type: portTypeId(input.type) })) as InstancePorts<T['definition']['inputs']>,
    outputs: definition.outputs.map(output => ({ ...output, type: portTypeId(output.type) })) as InstancePorts<T['definition']['outputs']>,
    id: NodeClass.definitionId ?? '',
    name: definition.name ?? definition.title,
    kind: definition.kind || definition.type || 'default',
  }
  return Object.defineProperties(resolved, {
    id: { writable: false, configurable: false },
    kind: { writable: false, configurable: false },
  }) as RegisteredNodeDefinition<T>
}

export class NodeInstance<T extends NodeClassType> {
  private _inputValues: InputsToValues<T['definition']> = {} as InputsToValues<T['definition']>
  public readonly definition: RegisteredNodeDefinition<T>
  public id: string = ''
  public data?: JsonValue
  public graphId = ''
  public targetGraphId?: string
  private _loop?: LoopConfig
  _bbox: { x: number; y: number; width: number; height: number; left: number; top: number } | null = null
  public states: {
    position: { x: number, y: number }
    title?: string
    style?: NodeStyle
    inputs?: readonly InputPort[]
    outputs?: readonly OutputPort[]
    breakpoint?: boolean
    collapsed?: boolean
  } = {
    position: { x: 0, y: 0 },
  }
  public graph?: NodeHost
  public toolsView: ToolsViewHost | null = null

  private readonly dataTypes: DataTypeRegistry

  constructor(Cls: T, options?: NodeOptions<T>, dataTypes = new DataTypeRegistry()) {
    this.dataTypes = dataTypes
    const { inputs, valueOutputs, ...definition } = resolveNodeDefinition(Cls)
    this.definition = {
      ...structuredClone(definition),
      inputs: inputs.map(input => ({ ...input })),
    } as RegisteredNodeDefinition<T>
    Object.defineProperties(this.definition, {
      id: { writable: false, configurable: false },
      kind: { writable: false, configurable: false },
    })
    if (valueOutputs) {
      this.definition.valueOutputs = Object.fromEntries(
        Object.entries(valueOutputs).map(([port, output]) => [
          port, 'read' in output ? { ...output } : structuredClone(output),
        ]),
      )
    }

    this.states.position = options?.position ?? { x: 0, y: 0 }
    this.states.breakpoint = options?.breakpoint ?? false
    this.states.collapsed = options?.collapsed ?? false
    this.data = options?.data
    if (options?.inputValues) this._inputValues = { ...options.inputValues } as InputsToValues<T['definition']>
    if (options?.title !== undefined) this.states.title = options.title
    if (options?.id) this.id = options.id
    if (options?.style) this.style = options.style
    this.targetGraphId = options?.targetGraphId ?? options?.subgraphId
    if (options?.loop) this.loop = structuredClone(options.loop)
    if (options?.position) this.states.position = options.position

    if (options?.inputs) {
      this.states.inputs = options.inputs.map(input => ({ ...input }))
    }
    if (options?.outputs) {
      this.states.outputs = options.outputs.map(output => {
        const obj: OutputPort = {
          id: output.id,
          name: output.name,
          type: output.type as OutputPort['type'],
        }
        if (output.label) obj.label = output.label
        if (output.showPort) obj.showPort = output.showPort
        return obj
      })
    }

    for (const input of this.inputs) {
      if (Array.isArray(input.options)) {
        input._options = input.options
        const key = input.name as keyof InputsToValues<T['definition']>
        if (input.editor === 'select' && this._inputValues[key] === undefined) {
          this._inputValues[key] = (input.options[0]?.value ?? '') as InputsToValues<T['definition']>[typeof key]
        }
      } else if (typeof input.options === 'function') {
        input._options = []
      }
    }
  }

  get bbox() {
    return this._bbox
  }

  get definitionId() { return this.definition.id }
  get kind() { return this.definition.kind }

  /** @deprecated Use definitionId. */
  get nodeType() { return this.definitionId }
  /** @deprecated Use kind. */
  get type() { return this.kind }
  /** @deprecated Use targetGraphId. */
  get subgraphId() { return this.targetGraphId }
  set subgraphId(value: string | undefined) { this.targetGraphId = value }

  get breakpoint() {
    return this.states.breakpoint ?? false
  }

  set breakpoint(value: boolean) {
    const oldValue = this.breakpoint
    if (oldValue === value) return
    this.states.breakpoint = value
    this.raiseChangedEvent('breakpoint', oldValue, value)
  }

  /** Collapsed presentation for a container card; unrelated nodes ignore it. */
  get collapsed() {
    return this.states.collapsed ?? false
  }

  set collapsed(value: boolean) {
    const oldValue = this.collapsed
    if (oldValue === value) return
    this.states.collapsed = value
    this.raiseChangedEvent('collapsed', oldValue, value)
  }

  // Get current position
  get position() {
    return this.states.position
  }
  // Set position and trigger change event
  set position(value: { x: number, y: number }) {
    if (typeof value !== 'object' || value === null || isNaN(value.x) || isNaN(value.y)) {
      throw new Error('Position must be an object with numeric x and y properties.')
    }
    if (this.states.position.x === value.x && this.states.position.y === value.y) {
      return
    }
    const oldvalue = { ...this.states.position }
    this.states.position = value
    const newvalue = { ...this.states.position }
    this.raiseChangedEvent('position', oldvalue, newvalue)
  }

  // Get and set title with change event
  get title() {
    return this.states.title ?? this.definition.name ?? ''
  }
  // Set title and trigger change event
  set title(value: string) {
    const oldvalue = this.states.title
    if (oldvalue === value) return
    this.states.title = value
    this.raiseChangedEvent('title', oldvalue, value)
  }

  // Get and set values with change event
  get inputValues() {
    return this._inputValues
  }
  set inputValues(values: Partial<InputsToValues<T['definition']>>) {
    this.checkValues(values)
    const oldvalue = { ...this._inputValues }
    this._inputValues = { ...this._inputValues, ...values }
    this.raiseChangedEvent('inputValues', oldvalue, values)
  }

  get loop() {
    return this._loop
  }
  set loop(value: LoopConfig | undefined) {
    const oldvalue = this._loop
    if (oldvalue === value) return
    this._loop = value
    this.raiseChangedEvent('loop', oldvalue, value)
  }

  // Get and set inputs with change event
  get inputs() {
    return (this.states.inputs || this.definition.inputs) as InstancePorts<T['definition']['inputs']>
  }
  set inputs(inputs: InstancePorts<T['definition']['inputs']>) {
    const nameSet = new Set<string>()
    for (const input of inputs) {
      if (nameSet.has(input.name)) {
        throw new Error(`Input name "${input.name}" is duplicated.`)
      }
      nameSet.add(input.name)
    }
    const oldvalue = [...(this.inputs || [])]
    this.states.inputs = inputs
    this.raiseChangedEvent('inputs', oldvalue, this.inputs)
  }

  // Get and set outputs with change event
  get outputs() {
    return (this.states.outputs || this.definition.outputs) as InstancePorts<T['definition']['outputs']>
  }
  set outputs(outputs: InstancePorts<T['definition']['outputs']>) {
    const nameSet = new Set<string>()
    for (const output of outputs) {
      if (nameSet.has(output.name)) {
        throw new Error(`Output name "${output.name}" is duplicated.`)
      }
      nameSet.add(output.name)
    }
    const oldvalue = [...(this.outputs || [])]
    this.states.outputs = outputs
    this.raiseChangedEvent('outputs', oldvalue, this.outputs)
  }

  // Get and set style with change event
  get style() {
    return (this.states.style || this.definition.style) as NodeStyle
  }
  set style(style: NodeStyle) {
    const oldvalue = { ...(this.states.style || {}) }
    this.states.style = mergeDeep(
      (this.states.style ?? {}) as Record<string, unknown>,
      style as Record<string, unknown>
    )
    this.raiseChangedEvent('style', oldvalue, this.states.style)
  }

  public showTools() {
    this.toolsView?.show()
  }

  public hideTools() {
    this.toolsView?.hide()
  }

  public addTools(toolsView: ToolsViewHost) {
    this.toolsView = toolsView
    this.toolsView.configure(this)
  }

  public removeTools() {
    this.toolsView?.remove()
    this.toolsView = null
  }

  // Get an input port by name
  public getInputPort(name: string): InputPort | undefined {
    return this.inputs.find(input => input.name === name)
  }

  // Get an output port by name
  public getOutputPort(name: string): OutputPort | undefined {
    return this.outputs.find(output => output.name === name)
  }

  public setGraph(graph: NodeHost) {
    this.graph = graph
    this.graph.emit('node:mounted', this)
  }

  public toString() {
    return `Node#${this.id}(${this.definitionId})`
  }

  private checkValues(values: Partial<InputsToValues<T['definition']>>): void {
    for (const key in values) {
      const input = this.inputs.find(i => i.name === key)
      if (!input) {
        throw new Error(`Input port "${key}" not found on this node.`)
      }
      const value = values[key as keyof InputsToValues<T['definition']>]
      this.dataTypes.assertValue(input.type, value, `Input "${key}"`)
    }
  }

  private raiseChangedEvent(
    propertyName: 'position' | 'title' | 'style' | 'inputValues' | 'inputs' | 'outputs' | 'breakpoint' | 'collapsed' | 'loop',
    oldvalue?: unknown,
    newvalue?: unknown
  ) {
    const graph = this.graph
    
    if (!graph) return

    graph.emit('node:changed', this, propertyName, oldvalue, newvalue)
    
    graph.raiseChangedEvent(ChangedEvent.Property, propertyName, this, oldvalue, newvalue)
  }
}

export type NodeInstanceType = InstanceType<typeof NodeInstance>
