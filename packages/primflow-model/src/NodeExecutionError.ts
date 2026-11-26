import type { JsonValue } from './TaskState'

export type NodeErrorOptions = {
  code: string
  retryable?: boolean
  details?: JsonValue
} & ({ kind: 'execution' } | { kind: 'input'; inputPort: string })

/** An executor failure with recovery information for the scheduler. */
export class NodeExecutionError extends Error {
  readonly kind: NodeErrorOptions['kind']
  readonly code: string
  readonly retryable: boolean
  readonly inputPort?: string
  readonly details?: JsonValue

  constructor(message: string, options: NodeErrorOptions) {
    super(message)
    this.name = 'NodeExecutionError'
    this.kind = options.kind
    this.code = options.code
    this.retryable = options.retryable ?? false
    if (options.details !== undefined) this.details = structuredClone(options.details)
    if (options.kind === 'input') this.inputPort = options.inputPort
  }
}

/** Serializable error and the producer of the rejected input, when known. */
export type NodeFailure = {
  kind: NodeErrorOptions['kind']
  code: string
  message: string
  retryable: boolean
  inputPort?: string
  details?: JsonValue
  inputSource?: { nodeId: string; port: string } & (
    | { attemptId: number; stateVersion?: never }
    | { stateVersion: number; attemptId?: never }
  )
}

export type NodeRetryInfo = {
  readonly number: number
  readonly maxRetries: number
  readonly remainingRetries: number
  readonly retryFrom?: string
  readonly previousFailure?: Readonly<NodeFailure>
}
