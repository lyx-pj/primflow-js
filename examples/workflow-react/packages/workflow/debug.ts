import type { DebugChainItem, DebugChainKind, DebugLogEntry, DebugScope } from '@lyx-pj/workflow-canvas'
import type { NodeExecutionStatus } from '@lyx-pj/workflow-model'

/** Keep only the latest log segment per task to avoid unbounded growth on long runs. */
const MAX_LOGS = 200
/** Use the same retention scale as the engine's default task history; drop the oldest temporary records. */
const MAX_TRACES = 100

type TaskTrace = {
  logs: DebugLogEntry[]
  chain: DebugChainItem[]
}

const traces = new Map<string, TaskTrace>()
let fallbackTaskId: string | null = null

function ensureTrace(taskId: string) {
  let trace = traces.get(taskId)
  if (trace) return trace
  trace = { logs: [], chain: [] }
  traces.set(taskId, trace)
  if (traces.size > MAX_TRACES) {
    const oldest = traces.keys().next().value
    if (oldest && oldest !== taskId) traces.delete(oldest)
  }
  return trace
}

/** When a business node cannot get a task id, fall back to the most recently executed task. */
export function setActiveDebugTask(taskId: string | null) {
  fallbackTaskId = taskId
}

/** Write one debug log line from a business node or execution event. */
export function appendDebugLog(
  message: string,
  options: {
    taskId?: string
    level?: DebugLogEntry['level']
    nodeId?: string
    /** Owning subgraph; the panel adds a [subgraph name] prefix. */
    scope?: DebugScope
  } = {},
) {
  const taskId = options.taskId ?? fallbackTaskId
  if (!taskId) return
  const trace = ensureTrace(taskId)
  trace.logs.push({
    time: Date.now(),
    message,
    level: options.level ?? 'info',
    nodeId: options.nodeId,
    scope: options.scope,
  })
  if (trace.logs.length > MAX_LOGS) trace.logs.splice(0, trace.logs.length - MAX_LOGS)
}

/**
 * Record one node execution.
 *
 * For the same node, running → completed updates the same chain entry;
 * a new entry is appended only when a loop executes the node again.
 *
 * Find the entry by node rather than only the chain tail: a subgraph node completes after its inner nodes,
 * so using only the tail would leave it on Running forever.
 */
export function traceNodeExecution(
  taskId: string | undefined,
  nodeId: string,
  status: NodeExecutionStatus,
  label?: string,
  scope?: DebugScope,
  kind?: DebugChainKind,
) {
  if (!taskId || (status !== 'running' && status !== 'completed')) return
  const trace = ensureTrace(taskId)
  const open = findOpenItem(trace.chain, nodeId)
  if (open) {
    open.status = status
    if (label) open.label = label
    if (scope) open.scope = scope
    if (kind) open.kind = kind
    return
  }
  trace.chain.push({ nodeId, status, label, scope, kind })
}

/** Find the entry for a node still running; node ids are unique across the whole graph. */
function findOpenItem(chain: DebugChainItem[], nodeId: string) {
  for (let index = chain.length - 1; index >= 0; index -= 1) {
    const item = chain[index]
    if (item.nodeId !== nodeId) continue
    return item.status === 'running' ? item : undefined
  }
  return undefined
}

/** Read a task's logs and execution chain; return empty arrays when the task was evicted. */
export function getTaskTrace(taskId?: string | null) {
  const trace = taskId ? traces.get(taskId) : undefined
  return {
    logs: trace ? [...trace.logs] : [],
    chain: trace ? trace.chain.map((item) => ({ ...item })) : [],
  }
}

/** Clear all temporary records in the example process, mainly for subscription cleanup. */
export function resetDebugTrace() {
  traces.clear()
  fallbackTaskId = null
}

/** Format business node output so object logs do not degrade to [object Object]. */
export function describeDebugValue(value: unknown) {
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value) ?? String(value)
  } catch {
    return String(value)
  }
}
