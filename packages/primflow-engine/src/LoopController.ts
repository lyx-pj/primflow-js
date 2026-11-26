import { isDataPort } from '@lyx-pj/primflow-model'
import type { LoopScope, TaskStateSnapshot } from '@lyx-pj/primflow-model'
import { createExecutionContext } from './ExecutionContext'
import { bindInput, describeInputSource, inputsReady, type ExecutionPath, type InputSelections } from './DataDependencies'
import { graphPortKey, type GraphCompiler, type ExecutionPortEntry } from './GraphCompiler'
import type { ExecutionNode } from './ExecutionNode'
import type { NodeExecutor } from './NodeExecutor'
import { applySubgraphEntryParams, applySubgraphExitParams } from './SubgraphParams'
import type { TaskStateActivation } from './TaskStateStore'
import type { InterruptActivation } from './TaskInterrupts'
import type { TaskTraceRecorder } from './TaskTrace'
import type { ActivationInputSource, LoopInvocationSnapshot, LoopIterationSnapshot, NodeExecutionData, EngineOptions, WaitingInput } from './types'

/** Iteration result: control flow and the single data result. */
type ReturnValue = { control: string; value: unknown }
type Activity = { pending?: number; running?: number; outcome?: 'completed' | 'failed' }
type Hooks = {
  taskId: string
  progress: (nodeId: string, frameId: string, activationId?: number) => NonNullable<Parameters<typeof createExecutionContext>[1]['progress']>
  trace?: TaskTraceRecorder
  signal: AbortSignal
  wait: (node: ExecutionNode, scope: { frameId: string; loop: LoopScope }, signal: AbortSignal, activationId?: number) => Promise<boolean>
  activity: (nodeId: string, delta: Activity) => void
  skipped: (nodeId: string, activationId?: number) => void
  interrupt: (node: ExecutionNode, scope: { frameId: string; loop: LoopScope }, signal: AbortSignal, isActive: () => boolean, activationId?: number) => InterruptActivation
  nodeState: (nodeId: string) => Record<string, unknown> | undefined
  readState: () => TaskStateSnapshot
  state: (nodeId: string, isActive: () => boolean, canUpdate: () => boolean, activationId?: number) => TaskStateActivation
  emit: (activationId: number | undefined, name: string, ...payload: unknown[]) => void
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
function cloneNode(initial: ExecutionNode): ExecutionNode {
  const node = Object.create(Object.getPrototypeOf(initial)) as ExecutionNode
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
export class LoopController {
  readonly invocations = new Map<string, LoopInvocationSnapshot>()
  readonly iterations = new Map<string, LoopIterationSnapshot>()
  readonly frameData = new Map<string, Map<string, NodeExecutionData>>()
  readonly latestData = new Map<string, NodeExecutionData>()
  private sequence = 0
  private activations = 0
  private initial = new Map<string, ExecutionNode>()
  readonly limits: { iterations: number; activations: number; depth: number; history: number }

  readonly nodesById: ReadonlyMap<string, ExecutionNode>
  readonly nodeExecutor: NodeExecutor
  readonly compiled: GraphCompiler
  readonly options: EngineOptions
  readonly hooks: Hooks
  constructor(
    nodesById: ReadonlyMap<string, ExecutionNode>,
    nodeExecutor: NodeExecutor,
    compiled: GraphCompiler,
    options: EngineOptions,
    hooks: Hooks
  ) {
    this.nodesById = nodesById
    this.nodeExecutor = nodeExecutor
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
    for (const node of nodesById.values()) this.initial.set(node.id, cloneNode(node))
  }

  activate(nodeId: string, frameId?: string, loop?: LoopScope) {
    if (++this.activations > this.limits.activations)
      throw new LoopExecutionError('LoopActivationLimitExceeded', nodeId, frameId, loop)
  }

  createNodes(graphId: string) {
    const nodes = new Map<string, ExecutionNode>()
    for (const item of this.compiled.graphs.get(graphId)!.values()) {
      if (!nodes.has(item.node.id)) {
        const node = cloneNode(this.initial.get(item.node.id)!)
        node.breakpoint = this.nodesById.get(node.id)!.breakpoint
        nodes.set(node.id, node)
      }
    }
    return nodes
  }

  createInvocationNode(node: ExecutionNode) {
    return cloneNode(node)
  }

  record(frameId: string | undefined, node: ExecutionNode) {
    const data = structuredClone({
      inputs: Object.fromEntries(
        node.inputs.filter((p) => isDataPort(p.type)).map((p) => [p.name, node.getInput(p.name)])
      ),
      outputs: Object.fromEntries(
        node.outputs.filter((p) => isDataPort(p.type)).map((p) => [p.name, node.getOutput(p.name)])
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
    node: ExecutionNode,
    parentSignal = this.hooks.signal,
    parentFrameId?: string,
    depth = 1,
    applicationContext = this.options.context,
    activationId?: number,
  ) {
    const config = node.loop!
    const invocationId = `${this.hooks.taskId}:loop:${++this.sequence}`
    const summary: LoopInvocationSnapshot = {
      invocationId,
      ...(activationId !== undefined && { activationId }),
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
    const expireIfNeeded = () => {
      const remaining = config.timeoutMs! - (this.hooks.runningTime() - started)
      if (remaining <= 0 && !this.hooks.paused())
        controller.abort(new LoopExecutionError('LoopTimeout', node.id, activeFrame?.frameId, activeFrame?.loop))
      return remaining
    }
    const timeout = () => {
      const remaining = expireIfNeeded()
      if (!controller.signal.aborted)
        timer = setTimeout(timeout, Math.max(1, Math.min(remaining > 0 ? remaining : 10, 50)))
    }
    const assertRunning = () => {
      // Synchronous work can delay the timeout timer until after the return barrier.
      if (config.timeoutMs !== undefined && !controller.signal.aborted) expireIfNeeded()
      if (controller.signal.aborted) throw abortReason(controller.signal)
    }
    if (config.timeoutMs) timeout()
    this.hooks.trace?.loop(summary)
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
      const initialValue = structuredClone(node.getInput('input'))
      let carry = initialValue
      let last: unknown
      for (let index = 0; index < limit; index++) {
        // Yield via macrotasks so synchronous loops respond to stop, timeouts, and other tasks.
        if (index % 16 === 0) await abortable(new Promise<void>((resolve) => setTimeout(resolve, 0)), controller.signal)
        assertRunning()
        const frameId = `${this.hooks.taskId}:frame:${++this.sequence}`
        const loop: LoopScope = { invocationId, loopNodeId: node.id, index, parentFrameId }
        const frameInfo: LoopIterationSnapshot = { frameId, graphId: node.targetGraphId!, loop, status: 'running' }
        activeFrame = frameInfo
        this.iterations.set(frameId, frameInfo)
        this.frameData.set(frameId, new Map())
        const frame = new IterationFrame(
          this,
          node.targetGraphId!,
          frameId,
          loop,
          controller.signal,
          depth,
          structuredClone(context),
          carry,
          activationId,
        )
        this.hooks.trace?.frame(frameInfo)
        this.hooks.notify('loop:iteration:started', structuredClone(frameInfo))
        try {
          const returned = await frame.run(carry, initialValue)
          assertRunning()
          last = structuredClone(returned!.value)
          // The submitted value becomes the next iteration's entry value.
          carry = last
          summary.iterations++
          summary.state = structuredClone(carry)
          summary.result = structuredClone(last)
          frameInfo.status = 'completed'
          frameInfo.state = structuredClone(carry)
          frameInfo.result = structuredClone(last)
          this.hooks.trace?.frame(frameInfo)
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
          if (frameInfo.status !== 'completed') this.hooks.trace?.frame(frameInfo)
          activeFrame = undefined
          this.prune()
        }
      }
      // Expose complete output to the parent only after the invocation succeeds.
      // The sole output is the final submitted iteration value.
      const output = structuredClone(last)
      assertRunning()
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
      this.hooks.trace?.loop(summary)
      this.hooks.notify('loop:finished', structuredClone(summary))
    }
  }
}

type WaitingFrameEntry = {
  item: ExecutionPortEntry
  activationId?: number
  path?: ExecutionPath
  selections?: InputSelections
}

/** Create fresh node values, ready/waiting state, and activation records; subgraphs inherit the frame boundary. */
class IterationFrame {
  private nodes: Map<string, ExecutionNode>
  private ready = new Map<string, Record<string, unknown>>()
  private producers = new Map<string, number>()
  private waiting = new Map<string, WaitingFrameEntry>()
  private activated = new Set<string>()
  private tasks = new Set<Promise<void>>()
  private returned?: ReturnValue
  private failure?: unknown
  private controller = new AbortController()
  private open = true
  private cancel: () => void

  private owner: LoopController
  private graphId: string
  private frameId: string
  private loop: LoopScope
  private depth: number
  private applicationContext: unknown
  /** Current entry value, used when the return data port is unconnected. */
  private entryValue: unknown
  private parentActivationId?: number
  constructor(
    owner: LoopController,
    graphId: string,
    frameId: string,
    loop: LoopScope,
    signal: AbortSignal,
    depth: number,
    applicationContext: unknown,
    entryValue: unknown,
    parentActivationId?: number,
    activated?: Set<string>,
  ) {
    this.owner = owner
    this.graphId = graphId
    this.frameId = frameId
    this.loop = loop
    this.depth = depth
    this.applicationContext = applicationContext
    this.entryValue = entryValue
    this.parentActivationId = parentActivationId
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
    for (const { item, activationId } of this.waiting.values()) {
      this.owner.hooks.trace?.finish(activationId, 'cancelled')
      this.owner.hooks.activity(item.node.id, { pending: -1 })
    }
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
  private graphNode(key: string): ExecutionPortEntry {
    const original = this.owner.compiled.graphs.get(this.graphId)!.get(key)!
    return { ...original, node: this.nodes.get(original.node.id)! }
  }

  /** Region entry: start for ordinary subgraphs, loop-entry for bodies. */
  private entryNode(): ExecutionNode | undefined {
    for (const key of this.owner.compiled.entries.get(this.graphId) ?? []) {
      return this.graphNode(key).node
    }
    return undefined
  }

  /** Identify loop bodies by loop-entry; ordinary subgraphs enter through start and return through end. */
  private isLoopBody() {
    return this.entryNode()?.kind === 'loop-entry'
  }

  /** Region exit: the end node in an ordinary subgraph. */
  private exitNode(): ExecutionNode | undefined {
    for (const item of this.owner.compiled.graphs.get(this.graphId)?.values() ?? []) {
      if (item.node.kind !== 'end') continue
      return this.nodes.get(item.node.id) ?? item.node
    }
    return undefined
  }
  private async wait(node: ExecutionNode, activationId?: number) {
    if (!this.active()) throw abortReason(this.signal)
    if (this.activated.size > 0 && this.activated.size % 64 === 0) {
      await abortable(new Promise<void>((resolve) => setTimeout(resolve, 0)), this.signal)
    }
    const definition = this.owner.nodesById.get(node.id)!
    node.breakpoint = definition.breakpoint
    const runnable = await abortable(
      this.owner.hooks.wait(node, { frameId: this.frameId, loop: this.loop }, this.signal, activationId),
      this.signal
    )
    if (!runnable || !this.active()) throw abortReason(this.signal)
  }
  /**
   * Execute this frame.
   *
   * Ordinary subgraph frames use neither the current nor the initial loop entry value.
   */
  async run(entry?: unknown, initialValue?: unknown): Promise<ReturnValue | undefined> {
    try {
      for (const key of this.owner.compiled.entries.get(this.graphId) ?? []) {
        const { node, port } = this.graphNode(key)
        if (this.activated.has(node.id)) throw this.error('LoopNodeMultipleActivations', node.id)
        this.activated.add(node.id)
        const trace = this.owner.hooks.trace
        const activationId = trace?.begin(node, port.id, {
          kind: 'entry', frameId: this.frameId, parentActivationId: this.parentActivationId,
        })
        this.owner.hooks.activity(node.id, { pending: 1 })
        try {
          this.owner.activate(node.id, this.frameId, this.loop)
          await this.wait(node, activationId)
          trace?.start(activationId)
          if (node.kind === 'loop-entry') {
            node.outputValues = { value: structuredClone(entry), initialValue: structuredClone(initialValue) }
          }
          this.owner.record(this.frameId, node)
          trace?.finish(activationId, 'completed', node)
          this.owner.hooks.activity(node.id, { pending: -1, outcome: 'completed' })
          this.track(this.publish(node, undefined, undefined, activationId))
        } catch (error) {
          trace?.finish(activationId, this.active() ? 'failed' : 'cancelled', node, error)
          this.owner.hooks.activity(node.id, { pending: -1 })
          throw error
        }
      }
      while (this.tasks.size) await abortable(Promise.all([...this.tasks]), this.signal)
      if (this.failure) throw this.failure
      if (!this.active()) throw abortReason(this.signal)
      if (this.waiting.size) {
        const { item, activationId } = this.waiting.values().next().value!
        const error = this.error('LoopDependencyUnresolved', item.node.id)
        this.owner.hooks.trace?.finish(activationId, 'failed', undefined, error)
        throw error
      }
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

  private dependencies({ item, path, selections, activationId }: WaitingFrameEntry) {
    const trace = this.owner.hooks.trace
    const missing: WaitingInput[] | undefined = trace ? [] : undefined
    const ready = inputsReady(item, (id) => this.ready.has(id), this.ready, path, selections, missing, this.producers)
    if (missing) trace?.waiting(activationId, missing)
    return ready
  }

  private enter(key: string, path?: ExecutionPath, parentActivationId?: number) {
    if (!this.active()) return Promise.resolve()
    const item = this.graphNode(key)
    if (this.activated.has(item.node.id)) {
      const error = this.error('LoopNodeMultipleActivations', item.node.id)
      this.fail(error)
      return Promise.reject(error)
    }
    this.activated.add(item.node.id)
    const trace = this.owner.hooks.trace
    const activationId = trace?.begin(item.node, item.port.id, {
      kind: 'node', frameId: this.frameId, parentActivationId,
    })
    try {
      this.owner.activate(item.node.id, this.frameId, this.loop)
    } catch (error) {
      trace?.finish(activationId, 'failed', undefined, error)
      throw error
    }
    this.owner.hooks.activity(item.node.id, { pending: 1 })
    const entry = { item, path, activationId, selections: item.hasMultipleSources ? new Map() : undefined }
    if (!this.dependencies(entry)) {
      this.waiting.set(key, entry)
      return Promise.resolve()
    }
    return this.execute(entry)
  }
  private async publish(node: ExecutionNode, nextExecs?: string[], path?: ExecutionPath, activationId?: number) {
    if (!this.active()) return
    const values = structuredClone(node.outputValues)
    this.ready.set(node.id, values)
    if (activationId !== undefined) this.producers.set(node.id, activationId)
    const nextPath = this.owner.compiled.selectionSources.has(node.id) ? { nodeId: node.id, values, activationId, previous: path } : path
    const ports = node.outputs.filter((p) => p.type === 'exec' && (!nextExecs?.length || nextExecs.includes(p.name)))
    if (activationId !== undefined) this.owner.hooks.trace?.record({
      type: 'activation:handoff', activationId, ports: ports.map(({ name }) => name),
    })
    const next = ports.flatMap((p) => this.graphNode(graphPortKey(node.id, p.id)).next)
    if (nextExecs?.length) {
      const entryIds = new Set((this.owner.compiled.entries.get(this.graphId) ?? []).map((key) => this.graphNode(key).node.id))
      const roots = new Map([[this.graphId, entryIds]])
      for (const id of this.owner.compiled.unselectedNodes(node, nextExecs, roots)) this.owner.hooks.skipped(id, activationId)
    }
    const work = next.map((key) => this.enter(key, nextPath, activationId))
    for (const [key, item] of this.waiting)
      if (this.dependencies(item)) {
        this.waiting.delete(key)
        work.push(this.execute(item))
      }
    await Promise.all(work)
  }

  private async execute({ item, path, selections, activationId }: WaitingFrameEntry) {
    const { node } = item
    const trace = this.owner.hooks.trace
    let phase: 'pending' | 'running' | undefined = 'pending'
    let alive = true
    let handed = false
    const complete = () => {
      if (!phase) return
      const completedPhase = phase
      this.owner.record(this.frameId, node)
      trace?.finish(activationId, 'completed', node)
      phase = undefined
      this.owner.hooks.activity(node.id, { [completedPhase]: -1, outcome: 'completed' })
    }
    try {
      let snapshot: TaskStateSnapshot | undefined
      const readState = () => (snapshot ??= this.owner.hooks.readState())
      const inputSources: ActivationInputSource[] = []
      for (const [target, candidates] of Object.entries(item.dataInputs)) {
        const input = node.inputs.find((p) => p.id === target)!
        // Preserve connected undefined and provide independent copies to consumers.
        const selection = selections?.get(target)
        const { source, read } = bindInput(candidates, (id, name) => this.ready.get(id)![name], selection)
        const state = source.stateSource ? readState() : undefined
        if (activationId !== undefined) {
          inputSources.push(describeInputSource(target, source, state?.version,
            selection ? selection.activationId : this.producers.get(source.dependency ?? '')))
          trace?.inputs(activationId, inputSources)
        }
        const value = read(state)
        node.inputValues[input.name] = structuredClone(value)
      }
      await this.wait(node, activationId)
      trace?.start(activationId)
      this.owner.hooks.activity(node.id, { pending: -1, running: 1 })
      phase = 'running'
      if (!this.active()) throw abortReason(this.signal)
      if (node.kind === 'loop-return') {
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
      if (node.kind === 'loop') {
        await this.owner.run(node, this.signal, this.frameId, this.depth + 1, this.applicationContext, activationId)
        complete()
        await this.publish(node, ['done'], path, activationId)
        return
      }
      if (node.kind === 'subgraph') {
        const child = new IterationFrame(
          this.owner,
          node.targetGraphId!,
          this.frameId,
          this.loop,
          this.signal,
          this.depth,
          this.applicationContext,
          this.entryValue,
          activationId,
          this.activated,
        )
        // Map parent call inputs by name to subgraph entry parameters.
        const entry = child.entryNode()
        if (entry) applySubgraphEntryParams(node, entry)
        await child.run()
        // Write subgraph exit parameters to parent call outputs.
        applySubgraphExitParams(node, child.exitNode())
        complete()
        await this.publish(node, undefined, path, activationId)
        return
      }
      if (node.kind === 'end') {
        complete()
        return
      }
      const canUpdate = () => this.active() && alive && !handed
      const state = this.owner.hooks.state(node.id, () => this.active(), canUpdate, activationId)
      const interrupts = this.owner.hooks.interrupt(node, { frameId: this.frameId, loop: this.loop }, this.signal, canUpdate, activationId)
      const context = {
        ...createExecutionContext(node, {
          taskId: this.owner.hooks.taskId,
          signal: this.signal,
          context: this.applicationContext,
          nodeState: this.owner.hooks.nodeState(node.id),
          isActive: canUpdate,
          progress: this.owner.hooks.progress(node.id, this.frameId, activationId),
          services: this.owner.nodeExecutor.services,
          emit: (name, ...payload) => {
            if (activationId !== undefined) trace?.record({ type: 'activation:emit', activationId, eventName: name })
            this.owner.hooks.emit(activationId, name, ...payload)
          },
        }),
        state: state.state,
        interrupt: interrupts.request,
        frameId: this.frameId,
        loop: Object.freeze({ ...this.loop }),
      }
      context.next = (next) => {
        if (!alive || !this.active()) return Promise.resolve()
        if (handed) {
          const error = this.error('LoopNodeMultipleNext', node.id)
          this.fail(error)
          const rejected = Promise.reject<void>(error)
          void rejected.catch(() => {})
          return rejected
        }
        state.commit()
        handed = true
        interrupts.close()
        complete()
        return this.track(this.publish(node, next, path, activationId))
      }
      try {
        await abortable(
          this.owner.nodeExecutor.executeNode(node, context, () => {
            alive = false
          }),
          this.signal
        )
        state.commit()
      } finally {
        alive = false
        interrupts.close()
        state.discard()
      }
      if (this.active()) complete()
    } catch (error) {
      const scoped = error instanceof LoopExecutionError ? error : this.error(String(error), node.id, error)
      trace?.finish(activationId, this.signal.aborted ? 'cancelled' : 'failed', node, scoped)
      if (!this.signal.aborted) this.owner.hooks.activity(node.id, { outcome: 'failed' })
      this.fail(scoped)
      throw scoped
    } finally {
      alive = false
      if (phase) this.owner.hooks.activity(node.id, { [phase]: -1 })
    }
  }
}
