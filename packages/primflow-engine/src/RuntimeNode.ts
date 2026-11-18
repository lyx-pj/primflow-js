import type {
  EventFn,
  ExecutorFn,
  NodeClassType,
  NodeOptions,
  PortPrototype,
  NodeLifecycleHook,
  LoopConfig,
} from '@lyx-pj/primflow-model'

export class RuntimeNode<T extends NodeClassType, Port extends PortPrototype = PortPrototype> {
  declare public type: string
  declare public nodeType: string
  declare public onEvent?: EventFn
  public onActive?: NodeLifecycleHook
  public onDeactivate?: NodeLifecycleHook
  public onDestroy?: NodeLifecycleHook
  public state: Record<string, unknown> = {}
  public executor?: ExecutorFn | string
  public data?: unknown
  public inputValues: Record<string, unknown> = {}
  public outputValues: Record<string, unknown> = {}
  public inputs: Port[] = []
  public outputs: Port[] = []
  public id: string = ''
  public error: unknown = undefined
  public subgraphId?: string
  /** Owning graph, distinct from the called subgraphId. */
  public graphId = ''
  public breakpoint = false
  public loop?: LoopConfig
  public executionMode?: 'step' | 'source'
  public inLoopBody = false

  constructor(NodeClass: T, options?: NodeOptions<T>) {
    this.executor = NodeClass.executor
    this.onActive = NodeClass.onActive
    this.onDeactivate = NodeClass.onDeactivate
    this.onDestroy = NodeClass.onDestroy
    this.breakpoint = options?.breakpoint ?? false
    this.loop = options?.loop ? structuredClone(options.loop) : undefined
    this.executionMode = NodeClass.definition.executionMode

    const type = NodeClass.definition.type || 'default'
    const nodeType = NodeClass.type

    const typeDesc = Object.getOwnPropertyDescriptor(this, 'type')
    if (!typeDesc || typeDesc.configurable) {
      Object.defineProperty(this, 'type', {
        get() {
          return type
        },
        configurable: false,
        enumerable: true,
      })
    }

    const nodeTypeDesc = Object.getOwnPropertyDescriptor(this, 'nodeType')
    if (!nodeTypeDesc || nodeTypeDesc.configurable) {
      Object.defineProperty(this, 'nodeType', {
        get() {
          return nodeType
        },
        configurable: false,
        enumerable: true,
      })
    }

    this.inputs =
      (options?.inputs as Port[]) ??
      (structuredClone(
        NodeClass.definition.inputs.map((input) => ({
          id: input.id || '',
          name: input.name,
          type: input.type,
        }))
      ) as Port[])
    this.outputs =
      (options?.outputs as Port[]) ??
      (structuredClone(
        NodeClass.definition.outputs.map((output) => ({
          id: output.id || '',
          name: output.name,
          type: output.type,
        }))
      ) as Port[])
    if (options?.data) this.data = options.data
    if (options?.values) this.inputValues = { ...options.values }
    if (options?.id) this.id = options.id
    if (options?.subgraphId) this.subgraphId = options.subgraphId
  }

  getInput(name: string) {
    if (!this.inputs.find((input) => input.name === name)) {
      throw new Error(`Input "${name}" not found in node "${this.nodeType}".`)
    }
    return this.inputValues[name]
  }

  getOutput(name: string) {
    if (!this.outputs.find((output) => output.name === name)) {
      throw new Error(`Output "${name}" not found in node "${this.nodeType}".`)
    }
    return this.outputValues[name]
  }

  setInput(name: string, value: unknown) {
    const input = this.inputs.find((input) => input.name === name)
    if (!input) {
      throw new Error(`Input "${name}" not found in node "${this.nodeType}".`)
    }
    checkInputOrOutputType(input.type, value, `${this.nodeType}.${name}`, true)
    this.inputValues[name] = value
  }

  setOutput(name: string, value: unknown) {
    const output = this.outputs.find((output) => output.name === name)
    if (!output) {
      throw new Error(`Output "${name}" not found in node "${this.nodeType}".`)
    }
    checkInputOrOutputType(output.type, value, `${this.nodeType}.${name}`, false)
    this.outputValues[name] = value
  }
}

function checkInputOrOutputType(type: string, value: unknown, name: string, isInput: boolean) {
  switch (type) {
    case 'string':
      if (typeof value !== 'string') {
        throw new TypeError(`${isInput ? 'Input' : 'Output'} "${name}" expects a string value.`)
      }
      break
    case 'number':
      if (typeof value !== 'number') {
        throw new TypeError(`${isInput ? 'Input' : 'Output'} "${name}" expects a number value.`)
      }
      break
    case 'boolean':
      if (typeof value !== 'boolean') {
        throw new TypeError(`${isInput ? 'Input' : 'Output'} "${name}" expects a boolean value.`)
      }
      break
    case 'array':
      if (!Array.isArray(value)) {
        throw new TypeError(`${isInput ? 'Input' : 'Output'} "${name}" expects an array value.`)
      }
      break
    case 'object':
      if (typeof value !== 'object' || Array.isArray(value) || value === null) {
        throw new TypeError(`${isInput ? 'Input' : 'Output'} "${name}" expects an object value.`)
      }
      break
    case 'any':
      // Accept any type
      break
    default:
      throw new TypeError(`Unknown ${isInput ? 'input' : 'output'} type for "${name}".`)
  }
}
