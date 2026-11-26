import type { DebugLogEntry, DebugLogLevel, DebugScope } from '@lyx-pj/primflow-canvas'
import type { NodeActivation, NodeAttempt, TaskSnapshot, TaskTrace, TaskTraceEvent } from '@lyx-pj/primflow-engine'
import type { NodeExecutionInfo } from './scopes'

/**
 * Resolve the display name of a node.
 *
 * A node created from the palette has no custom title, so the node type's
 * default title is used; the node id stays as the last resort.
 */
export type NodeTitleResolver = (nodeId: string, info: NodeExecutionInfo | undefined) => string

/** Fallback resolver: use the stored title, then the node id. */
const defaultTitleResolver: NodeTitleResolver = (nodeId, info) => info?.title || nodeId

/**
 * Business log line written by an application node.
 *
 * The engine log covers scheduling only; a node that wants to report its own
 * step writes one line here so it appears in the same stream.
 */
export type BusinessLogEntry = {
  time: number
  message: string
  level?: DebugLogLevel
  nodeId?: string
  scope?: DebugScope
}

/** Business log lines per task, ordered by write time. */
const businessLogs = new Map<string, BusinessLogEntry[]>()

/** Same retention scale as the engine's task history; drop the oldest temporary records. */
const MAX_TASK_INFOS = 100

/**
 * Write one business log line for a task.
 *
 * Business logs are indexed by task so they can be merged into the engine log
 * of the same task and evicted together with it.
 */
export function appendBusinessLog(
  taskId: string | undefined,
  message: string,
  options: { level?: DebugLogLevel; nodeId?: string; scope?: DebugScope } = {},
) {
  if (!taskId) return
  const entries = businessLogs.get(taskId) ?? []
  entries.push({
    time: Date.now(),
    message,
    level: options.level ?? 'info',
    nodeId: options.nodeId,
    scope: options.scope,
  })
  businessLogs.set(taskId, entries)
  if (businessLogs.size > MAX_TASK_INFOS) {
    const oldest = businessLogs.keys().next().value
    if (oldest && oldest !== taskId) businessLogs.delete(oldest)
  }
}

/** Business log lines of one task; empty when the task was evicted. */
export function getBusinessLogs(taskId: string | undefined): BusinessLogEntry[] {
  if (!taskId) return []
  return businessLogs.get(taskId) ?? []
}

/** Drop every business log line; used when the workflow session ends. */
export function resetBusinessLogs() {
  businessLogs.clear()
}

/**
 * Map one engine trace event to a log entry.
 *
 * The message keeps the engine's own vocabulary so the panel shows the standard
 * execution log format instead of a separately worded stream.
 */
function describeEvent(
  event: TaskTraceEvent,
  activations: Map<number, NodeActivation>,
  nodes: Map<string, NodeExecutionInfo>,
): { message: string; level: DebugLogLevel; nodeId?: string; scope?: DebugScope; activationId?: number } {
  switch (event.type) {
    case 'task:status':
      return { message: `Task ${event.status}`, level: taskStatusLevel(event.status) }
    case 'task:error':
      return { message: `Task error #${event.errorIndex}`, level: 'error', nodeId: event.nodeId || undefined }
    case 'activation:status': {
      const info = activations.get(event.activationId)
      // A failed activation keeps the failure code and message in the engine record.
      const failure = event.status === 'failed' ? info?.failure : undefined
      return {
        message: `Activation ${event.activationId} ${event.status}${failure ? ` (${failure.code}): ${failure.message}` : ''}`,
        level: activationLevel(event.status),
        nodeId: info?.nodeId,
        scope: info ? nodes.get(info.nodeId)?.scope : undefined,
        activationId: event.activationId,
      }
    }
    case 'activation:handoff':
      return {
        message: `Activation ${event.activationId} handed off to ${event.ports.join(', ')}`,
        level: 'info',
        activationId: event.activationId,
      }
    case 'branch:skipped':
      return { message: `Branch skipped ${event.nodeId}`, level: 'debug', nodeId: event.nodeId }
    case 'activation:breakpoint':
      return { message: `Activation ${event.activationId} hit breakpoint`, level: 'warn', activationId: event.activationId }
    case 'activation:interrupt':
      return {
        message: `Interrupt ${event.interruptId} ${event.status}`,
        level: 'warn',
        activationId: event.activationId,
      }
    case 'activation:attempt':
      // Attempt events are described from the engine attempt records instead.
      return { message: `Attempt ${event.attemptId} ${event.status}`, level: 'info', activationId: event.activationId }
    case 'activation:retry-wait':
      return {
        message: `Retry wait ${event.status} before attempt ${event.nextAttempt}`,
        level: 'warn',
        activationId: event.activationId,
      }
    case 'activation:stream':
      return { message: `Stream ${event.port} wrote ${event.chunks} chunks`, level: 'debug', activationId: event.activationId }
    case 'activation:emit':
      return { message: `Emitted event ${event.eventName}`, level: 'info', activationId: event.activationId }
    case 'activation:event-filter':
      return {
        message: `Event filter ${event.triggered ? 'passed' : 'blocked'}`,
        level: 'debug',
        activationId: event.activationId,
      }
    case 'loop:invocation':
      return {
        message: `Loop ${event.status}${event.reason ? ` (${event.reason})` : ''}${event.error ? `: ${event.error}` : ''}`,
        level: event.status === 'failed' ? 'error' : 'info',
        activationId: event.activationId,
      }
    case 'loop:frame':
      return { message: `Loop frame ${event.index} ${event.status}`, level: 'debug' }
    case 'state:committed':
      return { message: `State committed (version ${event.version})`, level: 'debug', nodeId: event.nodeId }
  }
}

/** Level for a task status change. */
function taskStatusLevel(status: string): DebugLogLevel {
  if (status === 'completed') return 'success'
  if (status === 'failed') return 'error'
  if (status === 'cancelled') return 'warn'
  return 'info'
}

/** Level for an activation status change. */
function activationLevel(status: string): DebugLogLevel {
  if (status === 'completed') return 'success'
  if (status === 'failed') return 'error'
  if (status === 'cancelled' || status === 'superseded') return 'warn'
  if (status === 'waiting') return 'info'
  return 'debug'
}

/**
 * Describe one attempt of a node run.
 *
 * The engine keeps the failure code, message, and input source of every attempt
 * in the task snapshot; the panel reuses them instead of collecting its own.
 * The event status decides the wording, so a running attempt and its finished
 * counterpart read as one line each.
 */
function describeAttempt(
  attempt: NodeAttempt,
  status: NodeAttempt['status'],
  nodes: Map<string, NodeExecutionInfo>,
  resolveTitle: NodeTitleResolver,
) {
  const node = nodes.get(attempt.nodeId)
  /** Node title when the task graph knows it; the id stays readable otherwise. */
  const label = (nodeId: string) => resolveTitle(nodeId, nodes.get(nodeId))
  const parts = [`Attempt ${attempt.number}`]
  if (status === 'failed') {
    const failure = attempt.failure
    parts.push(`failed${failure ? ` (${failure.code}): ${failure.message}` : ''}`)
    if (failure?.inputSource) {
      parts.push(`· input ${failure.inputPort ?? ''} from ${label(failure.inputSource.nodeId)}.${failure.inputSource.port}`)
    }
  } else if (status === 'completed') {
    parts.push('succeeded')
  } else if (status === 'cancelled') {
    parts.push('cancelled')
  } else {
    parts.push('started')
    // The engine records where the retry starts from: a state value is re-read,
    // an upstream producer is rerun.
    if (attempt.retryFrom && attempt.number > 1) {
      const origin = attempt.previousFailure?.inputSource
      const rereadsState = origin?.nodeId === attempt.retryFrom && origin?.stateVersion !== undefined
      parts.push(rereadsState ? `(re-reading ${label(attempt.retryFrom)})` : `(rerun from ${label(attempt.retryFrom)})`)
    }
  }
  if (attempt.handled) parts.push('continued through its fallback')
  return {
    message: parts.join(' '),
    level: status === 'failed' ? ('warn' as DebugLogLevel) : status === 'completed' ? 'success' : 'info',
    nodeId: attempt.nodeId,
    scope: node?.scope,
  }
}

/**
 * Convert an engine task trace into panel log entries.
 *
 * Every trace event becomes one entry, keeping the engine's event type so the
 * panel can group and style the standard execution log. Attempt events reuse
 * the engine's own attempt records to show failure details.
 */
export function traceToLogEntries(
  trace: TaskTrace | undefined,
  nodes: Map<string, NodeExecutionInfo> = new Map(),
  attempts: NodeAttempt[] = [],
  resolveTitle: NodeTitleResolver = defaultTitleResolver,
): DebugLogEntry[] {
  if (!trace) return []
  const activations = new Map(trace.activations.map((activation) => [activation.id, activation]))
  const attemptById = new Map(attempts.map((attempt) => [attempt.id, attempt]))
  return trace.events.map((event) => {
    if (event.type === 'activation:attempt') {
      const attempt = attemptById.get(event.attemptId)
      const described = attempt
        ? describeAttempt(attempt, event.status, nodes, resolveTitle)
        : {
            message: `Attempt ${event.attemptId} ${event.status}`,
            level: 'info' as DebugLogLevel,
            nodeId: undefined as string | undefined,
            scope: undefined as DebugScope | undefined,
          }
      return {
        time: event.at,
        message: described.message,
        level: described.level,
        type: event.type,
        nodeId: described.nodeId,
        scope: described.scope,
        activationId: event.activationId,
      }
    }
    const described = describeEvent(event, activations, nodes)
    const node = described.nodeId ? nodes.get(described.nodeId) : undefined
    return {
      time: event.at,
      message: described.message,
      level: described.level,
      type: event.type,
      nodeId: described.nodeId,
      scope: described.scope ?? node?.scope,
      activationId: described.activationId,
    }
  })
}

/**
 * Merge the engine log of a task with the business log lines of the same task.
 *
 * Both streams are ordered by timestamp so the panel reads as one timeline.
 */
export function mergeTaskLogs(
  trace: TaskTrace | undefined,
  business: BusinessLogEntry[],
  nodes: Map<string, NodeExecutionInfo> = new Map(),
  attempts: NodeAttempt[] = [],
  resolveTitle: NodeTitleResolver = defaultTitleResolver,
): DebugLogEntry[] {
  const engineEntries = traceToLogEntries(trace, nodes, attempts, resolveTitle)
  const businessEntries: DebugLogEntry[] = business.map((entry) => ({
    time: entry.time,
    message: entry.message,
    level: entry.level ?? 'info',
    type: 'app:log',
    nodeId: entry.nodeId,
    scope: entry.scope ?? (entry.nodeId ? nodes.get(entry.nodeId)?.scope : undefined),
  }))
  return [...engineEntries, ...businessEntries].sort((left, right) => left.time - right.time)
}

/**
 * Build the panel log of one task.
 *
 * The engine owns the task record, the execution log, and the attempt history;
 * the application only adds its own business lines.
 */
export function taskLogEntries(
  task: TaskSnapshot | undefined,
  trace: TaskTrace | undefined,
  nodes: Map<string, NodeExecutionInfo> = new Map(),
  resolveTitle: NodeTitleResolver = defaultTitleResolver,
): DebugLogEntry[] {
  return mergeTaskLogs(trace, getBusinessLogs(task?.id), nodes, task?.attempts ?? [], resolveTitle)
}
