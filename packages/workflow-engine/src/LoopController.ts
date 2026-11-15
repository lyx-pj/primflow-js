import type { LoopScope, NodeClassType } from '@lyx-pj/workflow-model'
import { createExecutionContext } from './ExecutionContext'
import type { GraphCompiler, GraphNode } from './GraphCompiler'
import type { Runtime, NodeInstanceType } from './Runtime'
import { applySubgraphEntryParams, applySubgraphExitParams } from './SubgraphParams'
import type { LoopInvocationSnapshot, LoopIterationSnapshot, NodeExecutionData, ProcessOptions } from './types'

/** Iteration result: control flow and the single data result. */
type ReturnValue = { control: string; value: unknown }
type Activity = { pending?: number; running?: number; completed?: boolean }
type Hooks = {
  taskId: string
  signal: AbortSignal
  wait: (node: NodeInstanceType, scope: { frameId: string; loop: LoopScope }, signal: AbortSignal) => Promise<boolean>
  activity: (nodeId: string, delta: Activity) => void
  nodeState: (nodeId: string) => Record<string, unknown> | undefined
  emit: (name: string, ...payload: unknown[]) => void
  notify: (event: string, ...payload: unknown[]) => void
  runningTime: () => number
  paused: () => boolean
}

export class LoopExecutionError extends Error {
  readonly nodeId: string
  readonly frameId?: string
  readonly loop?: LoopScope
  constructor(message: string, nodeId: string, frameId?: string, loop?: LoopScope, cause?: unknown) {
    super(
      `${message} [nodeId=${nodeId}${frameId ? `, frameId=${frameId}` : ''}${loop ? `, invocationId=${loop.invocationId}, index=${loop.index}` : ''}]`,
      { cause }
    )
    this.nodeId = nodeId
    this.frameId = frameId
    this.loop = loop
    this.name = 'LoopExecutionError'
  }
}

/** Clone execution data; definitions and lifecycle resources remain session-owned. */
function cloneNode(initial: NodeInstanceType): NodeInstanceType {
  const node = Object.create(Object.getPrototypeOf(initial)) as NodeInstanceType
  Object.defineProperties(node, Object.getOwnPropertyDescriptors(initial))
  node.inputs = structuredClone(initial.inputs)
  node.outputs = structuredClone(initial.outputs)
  node.inputValues = structuredClone(initial.inputValues)
  node.outputValues = structuredClone(initial.outputValues)
  node.data = structuredClone(initial.data)
  node.state = {}
  node.error = undefined
  return node
}

function abortReason(signal: AbortSignal): unknown {
  return signal.reason ?? new Error('Loop cancelled')
}

/** Cancellation settles scheduling waits without requiring business Promises to exit. */
async function abortable<T>(work: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) {
    // Argument evaluation may already start execution; catch rejection even if cancellation wins.
    void work.catch(() => {})
    throw abortReason(signal)
  }
  let abort!: () => void
  const cancelled = new Promise<never>((_, reject) => {
    abort = () => reject(abortReason(signal))
    signal.addEventListener('abort', abort, { once: true })
  })
  try {
    return await Promise.race([work, cancelled])
  } finally {
    signal.removeEventListener('abort', abort)
  }
}

/** Iteration policy and result commitment; IterationFrame handles individual scheduling. */
export class LoopController<NodeDefs extends Record<string, NodeClassType>> {
  readonly invocations = new Map<string, LoopInvocationSnapshot>()
  readonly iterations = new Map<string, LoopIterationSnapshot>()
  readonly frameData = new Map<string, Map<string, NodeExecutionData>>()
  readonly latestData = new Map<string, NodeExecutionData>()
  private sequence = 0
  private activations = 0
  private initial = new Map<string, NodeInstanceType>()
  readonly limits: { iterations: number; activations: number; depth: number; history: number }

  readonly runtime: Runtime<NodeDefs>
  readonly compiled: GraphCompiler
  readonly options: ProcessOptions
  readonly hooks: Hooks
  constructor(runtime: Runtime<NodeDefs>, compiled: GraphCompiler, options: ProcessOptions, hooks: Hooks) {
    this.runtime = runtime
    this.compiled = compiled
    this.options = options
    this.hooks = hooks
    this.limits = {
      iterations: options.maxLoopIterations ?? 1000,
      activations: options.maxNodeActivations ?? 10000,
      depth: options.maxLoopDepth ?? 8,
      history: options.maxLoopIterationHistory ?? 100,
    }
    for (const [name, value] of Object.entries(this.limits)) {
      if (!Number.isSafeInteger(value) || value < (name === 'history' ? 0 : 1))
        throw new RangeError(`Invalid loop limit ${name}`)
    }
    for (const node of runtime.nodes.values()) this.initial.set(node.id, cloneNode(node))
  }

  activate(nodeId: string, frameId?: string, loop?: LoopScope) {
    if (++this.activations > this.limits.activations)
      throw new LoopExecutionError('LoopActivationLimitExceeded', nodeId, frameId, loop)
  }

  createNodes(graphId: string) {
    const nodes = new Map<string, NodeInstanceType>()
    for (const item of this.compiled.graphs.get(graphId)!.values()) {
      if (!nodes.has(item.node.id)) {
        const node = cloneNode(this.initial.get(item.node.id)!)
        node.breakpoint = this.runtime.nodes.get(node.id)!.breakpoint
        nodes.set(node.id, node)
      }
    }
    return nodes
  }

  createInvocationNode(node: NodeInstanceType) {
    return cloneNode(node)
  }

  record(frameId: string | undefined, node: NodeInstanceType) {
    const data = structuredClone({
      inputs: Object.fromEntries(
        node.inputs.filter((p) => !['exec', 'spacer'].includes(p.type)).map((p) => [p.name, node.getInput(p.name)])
      ),
      outputs: Object.fromEntries(
        node.outputs.filter((p) => !['exec', 'spacer'].includes(p.type)).map((p) => [p.name, node.getOutput(p.name)])
      ),
    })
    if (frameId) this.frameData.get(frameId)!.set(node.id, data)
    this.latestData.set(node.id, data)
  }

  private prune() {
    const ended = [...this.iterations.values()].filter((i) => i.status !== 'running')
    for (const frame of ended.slice(0, Math.max(0, ended.length - this.limits.history))) {
      this.iterations.delete(frame.frameId)
      this.frameData.delete(frame.frameId)
    }
  }

  async run(
    node: NodeInstanceType,
    parentSignal = this.hooks.signal,
    parentFrameId?: string,
    depth = 1,
    applicationContext = this.options.ctx
  ) {
    const config = node.loop!
    const invocationId = `${this.hooks.taskId}:loop:${++this.sequence}`
    const summary: LoopInvocationSnapshot = {
      invocationId,
      loopNodeId: node.id,
      parentFrameId,
      status: 'running',
      iterations: 0,
    }
    this.invocations.set(invocationId, summary)
    const controller = new AbortController()
    const cancel = () => controller.abort(abortReason(parentSignal))
    parentSignal.addEventListener('abort', cancel, { once: true })
    if (parentSignal.aborted) cancel()
    const started = this.hooks.runningTime()
    let activeFrame: LoopIterationSnapshot | undefined
    let timer: ReturnType<typeof setTimeout> | undefined
    const timeout = () => {
      const remaining = config.timeoutMs! - (this.hooks.runningTime() - started)
      if (remaining <= 0 && !this.hooks.paused())
        controller.abort(new LoopExecutionError('LoopTimeout', node.id, activeFrame?.frameId, activeFrame?.loop))
      else timer = setTimeout(timeout, Math.max(1, Math.min(remaining > 0 ? remaining : 10, 50)))
    }
    if (config.timeoutMs) timeout()
    this.hooks.notify('loop:started', structuredClone(summary))
    // Completion reason: break when the body ends; limit when the iteration cap is reached.
    let reason: LoopInvocationSnapshot['reason'] | undefined
    try {
      if (depth > this.limits.depth) throw new LoopExecutionError('LoopDepthExceeded', node.id, parentFrameId)
      // Node iteration limits may only lower engine limits; omitted values use the engine limit.
      const limit = config.maxIterations ?? this.limits.iterations
      if (limit > this.limits.iterations)
        throw new LoopExecutionError('LoopLimitExceeded: Configuration exceeds engine limit', node.id, parentFrameId)
      const context = structuredClone(applicationContext ?? {})
      // Pass entry values between iterations: initial loop input, then the previous submitted value.
      let carry = structuredClone(node.getInput('input'))
      let last: unknown
      for (let index = 0; index < limit; index++) {
        if (controller.signal.aborted) throw abortReason(controller.signal)
        // Yield via macrotasks so synchronous loops respond to stop, timeouts, and other tasks.
        if (index % 16 === 0) await abortable(new Promise<void>((resolve) => setTimeout(resolve, 0)), controller.signal)
        const frameId = `${this.hooks.taskId}:frame:${++this.sequence}`
        const loop: LoopScope = { invocationId, loopNodeId: node.id, index, parentFrameId }
        const frameInfo: LoopIterationSnapshot = { frameId, graphId: node.subgraphId!, loop, status: 'running' }
        activeFrame = frameInfo
        this.iterations.set(frameId, frameInfo)
        this.frameData.set(frameId, new Map())
        const frame = new IterationFrame(
          this,
          node.subgraphId!,
          frameId,
          loop,
          controller.signal,
          depth,
          structuredClone(context),
          carry
        )
        this.hooks.notify('loop:iteration:started', structuredClone(frameInfo))
        try {
          const returned = await frame.run(carry)
          last = structuredClone(returned!.value)
          // The submitted value becomes the next iteration's entry value.
          carry = last
          summary.iterations++
          summary.state = structuredClone(carry)
          summary.result = structuredClone(last)
          frameInfo.status = 'completed'
          frameInfo.state = structuredClone(carry)
          frameInfo.result = structuredClone(last)
          this.hooks.notify('loop:iteration:completed', structuredClone(frameInfo))
          // The body decides whether to stop or continue.
          if (returned!.control === 'break') {
            reason = 'break'
            break
          }
          // Fail at the iteration cap if the body has not ended.
          if (index + 1 >= limit) {
            reason = 'limit'
            throw new LoopExecutionError(
              'LoopLimitExceeded: Iteration limit reached without the body ending',
              node.id,
              frameId,
              loop
            )
          }
        } catch (error) {
          if (frameInfo.status === 'running') frameInfo.status = parentSignal.aborted ? 'cancelled' : 'failed'
          frameInfo.error = String(error)
          throw error
        } finally {
          frame.close()
          activeFrame = undefined
          this.prune()
        }
      }
      if (controller.signal.aborted) throw abortReason(controller.signal)
      // Expose complete output to the parent only after the invocation succeeds.
      // The sole output is the final submitted iteration value.
      const output = structuredClone(last)
      node.setOutput('output', output)
      summary.status = 'completed'
      summary.reason = reason ?? 'break'
      summary.state = structuredClone(carry)
      summary.result = structuredClone(last)
    } catch (error) {
      summary.status = parentSignal.aborted ? 'cancelled' : 'failed'
      summary.reason = reason
      summary.error = String(error)
      throw error
    } finally {
      controller.abort()
      parentSignal.removeEventListener('abort', cancel)
      if (timer !== undefined) clearTimeout(timer)
      this.hooks.notify('loop:finished', structuredClone(summary))
    }
  }
}

/** Create fresh node values, ready/waiting state, and activation records; subgraphs inherit the frame boundary. */
class IterationFrame<NodeDefs extends Record<string, NodeClassType>> {
  private nodes: Map<string, NodeInstanceType>
  private ready = new Map<string, Record<string, unknown>>()
  private waiting = new Map<string, GraphNode>()
  private activated = new Set<string>()
  private tasks = new Set<Promise<void>>()
  private returned?: ReturnValue
  private failure?: unknown
  private controller = new AbortController()
  private open = true
  private cancel: () => void

  private owner: LoopController<NodeDefs>
  private graphId: string
  private frameId: string
  private loop: LoopScope
  private depth: number
  private ctx: unknown
  /** Current entry value, used when the return data port is unconnected. */
  private entryValue: unknown
  constructor(
    owner: LoopController<NodeDefs>,
    graphId: string,
    frameId: string,
    loop: LoopScope,
    signal: AbortSignal,
    depth: number,
    ctx: unknown,
    entryValue: unknown,
    activated?: Set<string>
  ) {
    this.owner = owner
    this.graphId = graphId
    this.frameId = frameId
    this.loop = loop
    this.depth = depth
    this.ctx = ctx
    this.entryValue = entryValue
    if (activated) this.activated = activated
    this.nodes = owner.createNodes(graphId)
    this.cancel = () => this.controller.abort(abortReason(signal))
    signal.addEventListener('abort', this.cancel, { once: true })
    if (signal.aborted) this.cancel()
    this.parentSignal = signal
  }
  private parentSignal: AbortSignal
  private get signal() {
    return this.controller.signal
  }
  private active() {
    return this.open && !this.signal.aborted
  }
  private error(message: string, nodeId: string, cause?: unknown) {
    return new LoopExecutionError(message, nodeId, this.frameId, this.loop, cause)
  }
  private fail(error: unknown) {
    this.failure ??= error
    this.controller.abort(error)
  }
  close() {
    for (const item of this.waiting.values()) this.owner.hooks.activity(item.node.id, { pending: -1 })
    this.waiting.clear()
    this.open = false
    this.controller.abort()
    this.parentSignal.removeEventListener('abort', this.cancel)
  }
  private track(work: Promise<void>) {
    this.tasks.add(work)
    void work.then(
      () => this.tasks.delete(work),
      (error) => {
        this.tasks.delete(work)
        this.fail(error)
      }
    )
    return work
  }
  private graphNode(key: string): GraphNode {
    const original = this.owner.compiled.graphs.get(this.graphId)!.get(key)!
    return { ...original, node: this.nodes.get(original.node.id)! }
  }

  /** Region entry: start for ordinary subgraphs, loop-entry for bodies. */
  private entryNode(): NodeInstanceType | undefined {
    for (const key of this.owner.compiled.entries.get(this.graphId) ?? []) {
      return this.graphNode(key).node
    }
    return undefined
  }

  /** Identify loop bodies by loop-entry; ordinary subgraphs enter through start and return through end. */
  private isLoopBody() {
    return this.entryNode()?.type === 'loop-entry'
  }

  /** Region exit: the end node in an ordinary subgraph. */
  private exitNode(): NodeInstanceType | undefined {
    for (const item of this.owner.compiled.graphs.get(this.graphId)?.values() ?? []) {
      if (item.node.type !== 'end') continue
      return this.nodes.get(item.node.id) ?? item.node
    }
    return undefined
  }
  private async wait(node: NodeInstanceType) {
    if (!this.active()) throw abortReason(this.signal)
    if (this.activated.size > 0 && this.activated.size % 64 === 0) {
      await abortable(new Promise<void>((resolve) => setTimeout(resolve, 0)), this.signal)
    }
    const definition = this.owner.runtime.nodes.get(node.id)!
    node.breakpoint = definition.breakpoint
    const runnable = await abortable(
      this.owner.hooks.wait(node, { frameId: this.frameId, loop: this.loop }, this.signal),
      this.signal
    )
    if (!runnable || !this.active()) throw abortReason(this.signal)
  }
  /**
   * Execute this frame.
   *
   * entry is the arbitrary loop entry value; ordinary subgraph frames have no entry value.
   */
  async run(entry?: unknown): Promise<ReturnValue | undefined> {
    try {
      for (const key of this.owner.compiled.entries.get(this.graphId) ?? []) {
        const { node } = this.graphNode(key)
        if (this.activated.has(node.id)) throw this.error('LoopNodeMultipleActivations', node.id)
        this.activated.add(node.id)
        this.owner.activate(node.id, this.frameId, this.loop)
        this.owner.hooks.activity(node.id, { pending: 1 })
        try {
          await this.wait(node)
          // Forward the current entry value to downstream nodes without restricting its type.
          if (node.type === 'loop-entry') node.outputValues = { value: structuredClone(entry) }
          this.owner.record(this.frameId, node)
          this.owner.hooks.activity(node.id, { pending: -1, completed: true })
          this.track(this.publish(node))
        } catch (error) {
          this.owner.hooks.activity(node.id, { pending: -1 })
          throw error
        }
      }
      while (this.tasks.size) await abortable(Promise.all([...this.tasks]), this.signal)
      if (this.failure) throw this.failure
      if (!this.active()) throw abortReason(this.signal)
      if (this.waiting.size) throw this.error('LoopDependencyUnresolved', this.waiting.values().next().value!.node.id)
      // Bodies must return; entry can be undefined and cannot indicate whether execution occurred.
      if (this.isLoopBody() && !this.returned) throw this.error('LoopBodyNotReturned', this.loop.loopNodeId)
      return this.returned
    } catch (error) {
      this.fail(error)
      throw error
    } finally {
      this.close()
    }
  }

  private dependencies(item: GraphNode) {
    return Object.values(item.dataInputs).every((dep) => this.ready.has(dep.split(':')[0]))
  }
  private enter(key: string) {
    if (!this.active()) return Promise.resolve()
    const item = this.graphNode(key)
    if (this.activated.has(item.node.id)) {
      const error = this.error('LoopNodeMultipleActivations', item.node.id)
      this.fail(error)
      return Promise.reject(error)
    }
    this.activated.add(item.node.id)
    this.owner.activate(item.node.id, this.frameId, this.loop)
    this.owner.hooks.activity(item.node.id, { pending: 1 })
    if (!this.dependencies(item)) {
      this.waiting.set(key, item)
      return Promise.resolve()
    }
    return this.execute(item)
  }
  private async publish(node: NodeInstanceType, nextExecs?: string[]) {
    if (!this.active()) return
    this.ready.set(node.id, structuredClone(node.outputValues))
    const next = node.outputs
      .filter((p) => p.type === 'exec' && (!nextExecs?.length || nextExecs.includes(p.name)))
      .flatMap((p) => this.graphNode(`${node.id}:${p.id}`).next)
    const work = next.map((key) => this.enter(key))
    for (const [key, item] of this.waiting)
      if (this.dependencies(item)) {
        this.waiting.delete(key)
        work.push(this.execute(item))
      }
    await Promise.all(work)
  }

  private async execute(item: GraphNode) {
    const { node } = item
    let phase: 'pending' | 'running' | undefined = 'pending'
    let alive = true
    let handed = false
    const complete = () => {
      if (!phase) return
      const completedPhase = phase
      this.owner.record(this.frameId, node)
      phase = undefined
      this.owner.hooks.activity(node.id, { [completedPhase]: -1, completed: true })
    }
    try {
      for (const [target, source] of Object.entries(item.dataInputs)) {
        const [sourceId, portId] = source.split(':')
        const sourceNode = this.nodes.get(sourceId)!
        const name = sourceNode.outputs.find((p) => p.id === portId)!.name
        const input = node.inputs.find((p) => p.id === target)!
        // Preserve connected undefined and provide independent copies to consumers.
        node.inputValues[input.name] = structuredClone(this.ready.get(sourceId)![name])
      }
      await this.wait(node)
      this.owner.hooks.activity(node.id, { pending: -1, running: 1 })
      phase = 'running'
      if (node.type === 'loop-return') {
        if (this.returned) throw this.error('LoopBodyMultipleReturns', node.id)
        // Only next and break control signals are allowed.
        if (!['next', 'break'].includes(item.port.name)) throw this.error('LoopReturnInvalid', node.id)
        const valuePort = node.inputs.find((p) => p.name === 'value')!
        // An unconnected data port uses the current entry value.
        const connected = Object.hasOwn(item.dataInputs, valuePort.id)
        const value = connected ? node.getInput('value') : this.entryValue
        this.returned = structuredClone({ control: item.port.name, value })
        complete()
        return
      }
      if (node.type === 'loop') {
        await this.owner.run(node, this.signal, this.frameId, this.depth + 1, this.ctx)
        complete()
        await this.publish(node, ['done'])
        return
      }
      if (node.type === 'subgraph') {
        const child = new IterationFrame(
          this.owner,
          node.subgraphId!,
          this.frameId,
          this.loop,
          this.signal,
          this.depth,
          this.ctx,
          this.entryValue,
          this.activated
        )
        // Map parent call inputs by name to subgraph entry parameters.
        const entry = child.entryNode()
        if (entry) applySubgraphEntryParams(node, entry)
        await child.run()
        // Write subgraph exit parameters to parent call outputs.
        applySubgraphExitParams(node, child.exitNode())
        complete()
        await this.publish(node)
        return
      }
      if (node.type === 'end') {
        complete()
        return
      }
      const context = createExecutionContext(node, {
        taskId: this.owner.hooks.taskId,
        signal: this.signal,
        ctx: this.ctx,
        nodeState: this.owner.hooks.nodeState(node.id),
        isActive: () => this.active() && alive && !handed,
        getService: (name) => this.owner.runtime.getService(name),
        emit: this.owner.hooks.emit,
      })
      context.frameId = this.frameId
      context.loop = Object.freeze({ ...this.loop })
      context.next = (next) => {
        if (!alive || !this.active()) return Promise.resolve()
        if (handed) {
          const error = this.error('LoopNodeMultipleNext', node.id)
          this.fail(error)
          const rejected = Promise.reject<void>(error)
          void rejected.catch(() => {})
          return rejected
        }
        handed = true
        complete()
        return this.track(this.publish(node, next))
      }
      try {
        await abortable(
          this.owner.runtime.executeNode(node, context, () => {
            alive = false
          }),
          this.signal
        )
      } finally {
        alive = false
      }
      if (this.active()) complete()
    } catch (error) {
      const scoped = error instanceof LoopExecutionError ? error : this.error(String(error), node.id, error)
      this.fail(scoped)
      throw scoped
    } finally {
      alive = false
      if (phase) this.owner.hooks.activity(node.id, { [phase]: -1 })
    }
  }
}
