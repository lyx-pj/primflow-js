/* oxlint-disable typescript/no-explicit-any */
import type {
  ExecContext,
  ExecutorFn,
  EventFn,
  NodeClassType,
  NodeOptions,
  JsonGraph,
  PortPrototype,
  VariableDef,
} from '@lyx-pj/workflow-model'
import { NodeRegistry, VariableManager, normalizeStartNodes } from '@lyx-pj/workflow-model'
import { RuntimeNode } from './RuntimeNode'

export type { ExecContext, ExecutorFn, EventFn, PortPrototype }

export interface IRuntime {
  /**
   * Registers a new executor function for a specific node type.
   * @param type The type of the node.
   * @param executor The executor function to register.
   * @returns The current Runtime instance.
   */
  registerExecutor: (type: string, executor: ExecutorFn) => IRuntime

  /**
   * Registers a new service.
   * @param name The name of the service.
   * @param factory A factory function to create the service instance.
   * @returns The current Runtime instance.
   */
  registerService: (name: string, factory: () => any) => IRuntime

  /**
   * Checks if an executor is registered for a specific node type.
   * @param type The type of the node.
   * @returns True if an executor is registered, false otherwise.
   */
  hasExecutor: (type: string) => boolean

  /**
   * Checks if a service is registered.
   * @param name The name of the service.
   * @returns True if the service is registered, false otherwise.
   */
  hasService: (name: string) => boolean

  /**
   * Retrieves the executor function for a specific node type.
   * @param type The type of the node.
   * @returns The executor function, or undefined if not found.
   */
  getExecutor: (type: string) => ExecutorFn | undefined

  /**
   * Retrieves a registered service.
   * @param name The name of the service.
   * @returns The service instance, or undefined if not found.
   */
  getService: (name: string) => any
}

export class Runtime<NodeDefs extends Record<string, NodeClassType>> implements IRuntime {
  public executors = new Map<string, ExecutorFn>()
  public services = new Map<string, any>()
  public variableManager = new VariableManager()
  static NodeInstance = RuntimeNode
  public nodeRegistry: NodeRegistry<NodeDefs>
  public nodeListeners = new Map<string, NodeInstanceType>()
  /** Includes main graph, subgraphs, and nodes without event handlers. */
  public nodes = new Map<string, NodeInstanceType>()

  constructor(nodeRegistry: NodeRegistry<NodeDefs>) {
    this.nodeRegistry = nodeRegistry
  }

  /** @inheritdoc {@link IRuntime.getService} */
  public registerExecutor(type: string, executor: ExecutorFn) {
    this.executors.set(type, executor)
    return this
  }

  /** @inheritdoc {@link IRuntime.registerService} */
  public registerService(name: string, factory: () => any) {
    let instance = factory()
    if (typeof instance === 'object' && instance !== null) {
      instance = new WeakRef(instance)
    }
    this.services.set(name, instance)
    return this
  }

  /** @inheritdoc {@link IRuntime.hasExecutor} */
  hasExecutor(type: string): boolean {
    return this.executors.has(type)
  }

  /** @inheritdoc {@link IRuntime.getExecutor} */
  getExecutor(type: string) {
    if (!this.hasExecutor(type)) return undefined
    return this.executors.get(type)
  }

  /** @inheritdoc {@link IRuntime.hasService} */
  hasService(name: string): boolean {
    return this.services.has(name)
  }

  /** @inheritdoc {@link IRuntime.getService} */
  getService(name: string) {
    if (!this.hasService(name)) {
      throw new Error(`No service registered with name "${name}".`)
    }
    const ref = this.services.get(name)
    if (ref instanceof WeakRef) {
      const deref = ref.deref()
      if (deref === undefined) {
        this.services.delete(name)
        throw new Error(`Service "${name}" has been garbage collected.`)
      }
      return deref
    }
  }

  /** Creates a new instance of a node. */
  public createNodeInstance<K extends keyof NodeDefs>(
    nodeType: K | NodeDefs[K],
    options?: NodeOptions<NodeDefs[K]>
  ): RuntimeNode<NodeDefs[K]> {
    if (!this.nodeRegistry.isRegistered(nodeType)) {
      if (typeof nodeType === 'string') {
        throw new Error(`Node type "${nodeType}" is not registered.`)
      } else if (nodeType.constructor && 'name' in nodeType.constructor) {
        throw new Error(`Node type "${nodeType.constructor.name}" is not registered.`)
      }
    }
    let NodeClass: NodeDefs[K]
    if (typeof nodeType === 'string') {
      NodeClass = this.nodeRegistry.get(nodeType as K)
    } else {
      NodeClass = nodeType as NodeDefs[K]
    }

    const nodeInstance = new Runtime.NodeInstance(NodeClass, options)
    if (!nodeInstance.id) nodeInstance.id = `node_${Math.random().toString(36).slice(2, 11)}`

    if (NodeClass.onEvent) {
      nodeInstance.onEvent = NodeClass.onEvent
      this.nodeListeners.set(nodeInstance.id, nodeInstance)
    }
    return nodeInstance
  }

  /**
   * Executes a node in the graph.
   * @param node The node instance to execute.
   * @param ctx The execution context.
   */
  public async executeNode(node: NodeInstanceType, ctx: ExecContext, onSettled?: () => void): Promise<any> {
    const executor = this.getExecutorForNode(node)
    if (!executor) throw new Error(`No executor for ${node.nodeType}`)
    const settle = () => {
      const callback = onSettled
      onSettled = undefined
      callback?.()
    }
    try {
      const result = executor(ctx)
      // Close synchronous frame contexts immediately on return without an extra microtask window.
      if (!result || typeof result.then !== 'function') settle()
      await result
      if (!ctx.signal?.aborted) node.error = undefined
    } catch (err) {
      if (!ctx.signal?.aborted) node.error = err
      throw err
    } finally {
      settle()
    }
    return this
  }

  /**
   * Checks if there is an executor available for the given node.
   * @param node The node instance to check.
   * @returns True if an executor is available, false otherwise.
   */
  public hasExecutorForNode(node: NodeInstanceType): boolean {
    if (typeof node.executor === 'function') return true
    return this.hasExecutor(node.executor ?? '') || this.hasExecutor(node.nodeType)
  }

  /**
   * Gets the executor function for a specific node.
   * @param node The node instance to get the executor for.
   * @returns The executor function, or undefined if not found.
   */
  public getExecutorForNode(node: NodeInstanceType): ExecutorFn | undefined {
    if (typeof node.executor === 'function') return node.executor
    return this.getExecutor(node.executor ?? '') ?? this.getExecutor(node.nodeType)
  }

  public fromJSON(json: JsonGraph | string) {
    if (typeof json === 'string') {
      json = JSON.parse(json) as JsonGraph
    }
    this.nodeListeners.clear()
    this.nodes.clear()
    // Main entries lack parameters and keep only execution outputs; preserve subgraph parameter ports.
    const normalized = normalizeStartNodes(json.nodes, json.links)
    const nodes = this.deserializeNodes(normalized.nodes)
    const links = normalized.links
    const variables = json.variables
    const jsonSubgraphs = json.subgraphs || []

    const subgraphs: Record<string, { nodes: NodeInstanceType[]; links: JsonGraph['links'] }> = {}

    for (const [subgraphId, subgraph] of Object.entries(jsonSubgraphs)) {
      const normalized = normalizeStartNodes(subgraph.nodes, subgraph.links, { keepDataPorts: true })
      const subgraphNodes = this.deserializeNodes(normalized.nodes, subgraphId)
      const subgraphLinks = normalized.links
      subgraphs[subgraphId] = { nodes: subgraphNodes, links: subgraphLinks }
    }

    this.variableManager.clear()
    for (const variable of variables) {
      this.variableManager.setVariable({
        name: variable.name,
        type: variable.type,
        value: variable.value,
      } as VariableDef)
    }
    return { nodes, links, subgraphs }
  }

  public fork() {
    const runtime = new Runtime(this.nodeRegistry)
    runtime.executors = this.executors
    runtime.services = this.services
    return runtime
  }

  private deserializeNodes(jsonNodes: JsonGraph['nodes'], subgraphId?: string): NodeInstanceType[] {
    const nodes: NodeInstanceType[] = []
    for (const jsonNode of jsonNodes) {
      const node = this.createNodeInstance(jsonNode.nodeType as unknown as never, {
        id: jsonNode.id,
        breakpoint: jsonNode.breakpoint,
        data: jsonNode.data,
        values: jsonNode.values as any,
        subgraphId: jsonNode.subgraphId ?? subgraphId,
        loop: jsonNode.loop,
        inputs: jsonNode.inputs.some((input) => input.type)
          ? jsonNode.inputs.map((i) => ({
              type: i.type as keyof typeof i.type,
              name: i.name,
              id: i.id,
            }))
          : undefined,
        outputs: jsonNode.outputs.some((output) => output.type)
          ? jsonNode.outputs.map((o) => ({
              type: o.type as keyof typeof o.type,
              name: o.name,
              id: o.id,
            }))
          : undefined,
      }) as NodeInstanceType
      if (this.nodes.has(node.id)) throw new Error(`Duplicate node ID: ${node.id}`)
      this.nodes.set(node.id, node)
      node.graphId = subgraphId ?? ''

      if (!jsonNode.inputs.some((input) => input.type)) {
        for (const jsonInput of jsonNode.inputs) {
          const input = node.inputs.find((i) => i.name === jsonInput.name)
          if (!input) continue
          input.id = jsonInput.id
        }
      }

      if (!jsonNode.outputs.some((output) => output.type)) {
        for (const jsonOutput of jsonNode.outputs) {
          const output = node.outputs.find((i) => i.name === jsonOutput.name)
          if (!output) continue
          output.id = jsonOutput.id
        }
      }
      nodes.push(node)
    }
    return nodes
  }
}

export type NodeInstanceType = InstanceType<typeof Runtime.NodeInstance>
