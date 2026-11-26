import { DataTypeRegistry, portTypeId } from '@lyx-pj/primflow-model'
import type {
  EventFn,
  ExecutorFn,
  NodeClassType,
  NodeOptions,
  PortPrototype,
  NodeLifecycleHook,
  LoopConfig,
  JsonValue,
  TaskStateSnapshot,
} from '@lyx-pj/primflow-model'

export class ExecutionNode<T extends NodeClassType = NodeClassType, Port extends PortPrototype = PortPrototype> {
  public readonly kind: string
  public readonly definitionId: string
  declare public onEvent?: EventFn
  public onActive?: NodeLifecycleHook
  public onDeactivate?: NodeLifecycleHook
  public onDestroy?: NodeLifecycleHook
  public state: Record<string, unknown> = {}
  public executor?: ExecutorFn | string
  public data?: JsonValue
  public inputValues: Record<string, unknown> = {}
  public outputValues: Record<string, unknown> = {}
  public inputs: Port[] = []
  public outputs: Port[] = []
  public id: string = ''
  public error: unknown = undefined
  public targetGraphId?: string
  /** Owning graph. The empty string represents the root graph. */
  public graphId = ''
  public breakpoint = false
  public loop?: LoopConfig
  public readonly executionMode: 'step' | 'source' | 'stream'
  readonly retryPolicy: NodeClassType['retryPolicy']
  readonly outputValidators: NodeClassType['outputValidators']
  readonly valueOutputs: NodeClassType['definition']['valueOutputs']
  public inLoopBody = false

  readonly dataTypes: DataTypeRegistry

  constructor(NodeClass: T, options?: NodeOptions<T>, dataTypes = new DataTypeRegistry()) {
    this.dataTypes = dataTypes
    this.executor = NodeClass.executor
    this.retryPolicy = NodeClass.retryPolicy
    this.outputValidators = NodeClass.outputValidators
    this.onEvent = NodeClass.onEvent
    this.onActive = NodeClass.onActive
    this.onDeactivate = NodeClass.onDeactivate
    this.onDestroy = NodeClass.onDestroy
    this.breakpoint = options?.breakpoint ?? false
    this.loop = options?.loop ? structuredClone(options.loop) : undefined
    const definition = NodeClass.definition
    this.executionMode = definition.executionMode ?? 'step'
    this.valueOutputs = definition.valueOutputs
    this.kind = definition.kind || definition.type || 'default'
    this.definitionId = NodeClass.definitionId ?? ''

    this.inputs =
      (options?.inputs as Port[]) ??
      (structuredClone(
        definition.inputs.map((input) => ({
          id: input.id || '',
          name: input.name,
          type: portTypeId(input.type),
        }))
      ) as Port[])
    this.outputs =
      (options?.outputs as Port[]) ??
      (structuredClone(
        definition.outputs.map((output) => ({
          id: output.id || '',
          name: output.name,
          type: portTypeId(output.type),
        }))
      ) as Port[])
    this.data = options?.data
    if (options?.inputValues) this.inputValues = { ...options.inputValues }
    if (options?.id) this.id = options.id
    this.targetGraphId = options?.targetGraphId ?? options?.subgraphId
  }

  get type() { return this.kind }
  get nodeType() { return this.definitionId }
  get subgraphId() { return this.targetGraphId }

  getInput(name: string) {
    if (!this.inputs.find((input) => input.name === name)) {
      throw new Error(`Input "${name}" not found in node "${this.definitionId}".`)
    }
    return this.inputValues[name]
  }

  getOutput(name: string) {
    if (!this.outputs.find((output) => output.name === name)) {
      throw new Error(`Output "${name}" not found in node "${this.definitionId}".`)
    }
    return this.outputValues[name]
  }

  readValueOutput(port: PortPrototype, linkedValue: unknown, state?: TaskStateSnapshot) {
    const output = this.valueOutputs![port.name]
    const input = linkedValue ?? this.getInput(output.input)
    let value: unknown
    if ('read' in output) {
      if (!state) throw new Error(`Reading ${this.definitionId}.${port.name} requires task state.`)
      value = output.read(input, state)
    } else {
      value = input ?? output.fallback
    }
    this.dataTypes.assertValue(port.type, value, `Output ${this.definitionId}.${port.name}`)
    return value
  }

  setInput(name: string, value: unknown) {
    const input = this.inputs.find((input) => input.name === name)
    if (!input) {
      throw new Error(`Input "${name}" not found in node "${this.definitionId}".`)
    }
    this.dataTypes.assertValue(input.type, value, `Input ${this.definitionId}.${name}`)
    this.inputValues[name] = value
  }

  setOutput(name: string, value: unknown) {
    const output = this.outputs.find((output) => output.name === name)
    if (!output) {
      throw new Error(`Output "${name}" not found in node "${this.definitionId}".`)
    }
    this.dataTypes.assertValue(output.type, value, `Output ${this.definitionId}.${name}`)
    this.outputValues[name] = value
  }
}
