import { NodeExecutionError, type NodeFailure, type NodeRetryPolicy } from '@lyx-pj/primflow-model'
import type { ExecutionNode } from './ExecutionNode'
import type { StateInput } from './DataDependencies'
import { graphPortKey, type ExecutionPortEntry } from './GraphCompiler'
import type { NodeAttempt, RetryOptions } from './types'

const MAX_TIMER_MS = 2_147_483_647

export type RetryTiming = Required<Omit<RetryOptions, 'timeoutMs'>> & { timeoutMs: number | null }

export function resolveRetryTiming(defaults?: RetryOptions, override?: RetryOptions): RetryTiming {
  const initialIntervalMs = override?.initialIntervalMs ?? defaults?.initialIntervalMs ?? 500
  const maxIntervalMs = override?.maxIntervalMs ?? defaults?.maxIntervalMs ?? 128_000
  const timeoutMs = override?.timeoutMs === undefined ? defaults?.timeoutMs ?? null : override.timeoutMs
  const jitter = override?.jitter ?? defaults?.jitter ?? true
  for (const [name, value] of Object.entries({ initialIntervalMs, maxIntervalMs, timeoutMs })) {
    if (value !== null && (!Number.isSafeInteger(value) || value < 0)) {
      throw new RangeError(`retry.${name} must be a non-negative integer in milliseconds.`)
    }
  }
  if (typeof jitter !== 'boolean') throw new TypeError('retry.jitter must be a boolean.')
  return { initialIntervalMs, maxIntervalMs, timeoutMs, jitter }
}

export class RetryTimeoutError extends Error {
  readonly code = 'RETRY_TIMEOUT'
  readonly retryable = false

  constructor(cause: unknown) {
    super('The retry deadline expired.', { cause })
    this.name = 'RetryTimeoutError'
  }
}

function waitForTimer(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve) => {
    const finish = () => {
      clearTimeout(timer)
      signal.removeEventListener('abort', finish)
      resolve()
    }
    const timer = setTimeout(finish, Math.min(MAX_TIMER_MS, Math.ceil(ms)))
    signal.addEventListener('abort', finish, { once: true })
  })
}

export type RetryInput = { producer: RetryActivation; output: string; value: unknown }

export type RetryActivation = {
  entry: ExecutionPortEntry
  attemptId: number
  activationId?: number
  inputs: Record<string, unknown>
  outputs: Record<string, unknown>
  initialOutputs: Record<string, unknown>
  sources: ReadonlyMap<string, RetryInput>
  stateInputs: ReadonlyMap<string, StateInput>
  /** The only execution entry reachable from the selected output, when there is exactly one. */
  nextEntry?: string
}

export class StateInputReadError extends NodeExecutionError {
  readonly cause: unknown
  readonly inputSource: Pick<StateInput, 'nodeId' | 'port' | 'stateVersion'>

  constructor(cause: unknown, inputPort: string, inputSource: StateInputReadError['inputSource']) {
    const { message, code, retryable, details } = describeFailure(cause)
    super(message, { kind: 'input', inputPort, code, retryable, details })
    this.cause = cause
    this.inputSource = inputSource
  }
}

export function describeFailure(error: unknown): NodeFailure {
  const details = typeof error === 'object' && error !== null ? error as Partial<NodeFailure> : {}
  return {
    kind: details.kind === 'input' ? 'input' : 'execution',
    code: typeof details.code === 'string' ? details.code : 'NODE_EXECUTION_FAILED',
    message: typeof details.message === 'string' ? details.message : String(error),
    retryable: details.retryable === true,
    ...(typeof details.inputPort === 'string' && { inputPort: details.inputPort }),
    ...(error instanceof NodeExecutionError && error.details !== undefined && { details: error.details }),
    ...(error instanceof StateInputReadError && { inputSource: error.inputSource }),
  }
}

export class RetryController {
  readonly attempts: NodeAttempt[] = []
  private sequence = 0

  private readonly timing: RetryTiming
  private readonly notify: (attempt: NodeAttempt) => void

  constructor(timing: RetryTiming, notify: (attempt: NodeAttempt) => void) {
    this.timing = timing
    this.notify = notify
  }

  deadline(failedAt: number) {
    return this.timing.timeoutMs === null ? Infinity : failedAt + this.timing.timeoutMs
  }

  async wait(retry: number, deadline: number, signal: AbortSignal) {
    if (signal.aborted) return 'cancelled'
    const now = performance.now()
    if (now >= deadline) return 'timeout'
    const { initialIntervalMs, maxIntervalMs, jitter } = this.timing
    const backoff = initialIntervalMs && Math.min(maxIntervalMs, initialIntervalMs * 2 ** retry)
    const delay = backoff + (jitter ? Math.random() * 1_000 : 0)
    const wakeAt = Math.min(now + delay, deadline)

    while (!signal.aborted) {
      const remaining = wakeAt - performance.now()
      if (remaining <= 0) return performance.now() >= deadline ? 'timeout' : 'ready'
      await waitForTimer(remaining, signal)
    }
    return 'cancelled'
  }

  begin(nodeId: string, retry: number, maxRetries: number, retryFrom?: string, previousFailure?: NodeFailure, activationId?: number): NodeAttempt {
    const attempt: NodeAttempt = {
      id: ++this.sequence,
      ...(activationId !== undefined && { activationId }),
      nodeId,
      number: retry + 1,
      maxRetries,
      remainingRetries: Math.max(0, maxRetries - retry),
      status: 'running',
      ...(retryFrom && { retryFrom }),
      ...(previousFailure && { previousFailure }),
    }
    this.attempts.push(attempt)
    this.notify(attempt)
    return attempt
  }

  finish(
    attempt: NodeAttempt | undefined, status: NodeAttempt['status'], failure?: NodeFailure,
    data?: Pick<NodeAttempt, 'inputs' | 'outputs'>,
  ) {
    if (!attempt || attempt.status !== 'running') return
    attempt.status = status
    if (failure) attempt.failure = failure
    if (data) Object.assign(attempt, structuredClone(data))
    this.notify(attempt)
  }

  context({ number, maxRetries, remainingRetries, retryFrom, previousFailure }: NodeAttempt) {
    return structuredClone({ number, maxRetries, remainingRetries, retryFrom, previousFailure })
  }

  handled(attempt: NodeAttempt | undefined) {
    if (!attempt) return
    attempt.handled = true
    this.notify(attempt)
  }

  limit(policy?: NodeRetryPolicy) {
    const retries = policy?.maxRetries ?? 0
    return policy?.idempotent && Number.isSafeInteger(retries) && retries >= 0 ? retries : 0
  }

  canRetry(failure: NodeFailure, policy: NodeRetryPolicy | undefined, used: number) {
    return failure.retryable && used < this.limit(policy)
  }

  trace(node: ExecutionNode, current: ExecutionPortEntry, sources: ReadonlyMap<string, RetryInput>, failure: NodeFailure) {
    const steps: RetryActivation[] = []
    const visited = new Set([node.id])
    let target = current
    let origin = failure.inputPort ? sources.get(failure.inputPort) : undefined
    while (origin) {
      const { producer, output, value } = origin
      const upstream = producer.entry.node
      if (target.prev.length !== 1 || producer.nextEntry !== graphPortKey(target.node.id, target.port.id) ||
          upstream.graphId !== node.graphId || visited.has(upstream.id) || !this.limit(upstream.retryPolicy)) return
      visited.add(upstream.id)
      steps.unshift(producer)
      const validate = upstream.outputValidators?.[output]
      if (!validate) return
      try {
        if (validate(structuredClone(value))) return steps
      } catch {
        return
      }
      if (Object.keys(producer.entry.dataInputs).length !== 1) return
      const inputs = [...producer.sources.values()]
      if (inputs.length !== 1) return
      target = producer.entry
      origin = inputs[0]
    }
  }
}
