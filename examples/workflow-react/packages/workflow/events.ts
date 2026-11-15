import type { DebugPanelData, DebugRecord, Graph } from '@lyx-pj/workflow-canvas'
import type { BreakpointHit, Engine, NodeExecutionData, TaskSnapshot } from '@lyx-pj/workflow-engine'
import type { JsonGraph, NodeClassType, NodeExecutionStatus, NodeInstanceType } from '@lyx-pj/workflow-model'
import {
  appendDebugLog,
  getTaskTrace,
  resetDebugTrace,
  setActiveDebugTask,
  traceNodeExecution,
} from './debug'
import { findEventNodes, formatOriginTitle, pickListenerNode, type TaskOrigin } from './records'
import { buildNodeExecutionInfo, type NodeExecutionInfo } from './scopes'
import type { ViewMeta } from './storage'
import { quoteName, t, toolbarLabels } from './i18n'

function collectNodeIds(json: JsonGraph) {
  const graphs = [json, ...Object.values(json.subgraphs)]
  return graphs.flatMap((graph) => graph.nodes.map((node) => node.id))
}

export type WorkflowEventsOptions = {
  /** Load referenced subgraph files and assemble the engine input before execution; use the current canvas JSON when omitted. */
  loadExecutionGraph?: () => Promise<JsonGraph>
  /** Notify the host when subgraph loading, assembly, or engine validation fails. */
  onRunError?: (message: string) => void
  /** Currently open view; execution records are named after it to distinguish runs from different files. */
  getCurrentView?: () => ViewMeta | null
}

/** Same retention scale as debug records, avoiding memory growth after many tasks. */
const MAX_TASK_INFOS = 100

/** Connect the example's canvas actions to the execution engine and return a cleanup function. */
export function bindWorkflowEvents<NodeDefs extends Record<string, NodeClassType>>(
  graph: Graph<NodeDefs>,
  engine: Engine<NodeDefs>,
  events: WorkflowEventsOptions = {},
) {
  const nodeTitle = (nodeId?: string) =>
    nodeId ? (graph.findNodeAnywhere(nodeId)?.title ?? nodeId) : t('record.node')
  let selectedTaskId: string | null = null
  let lastEngineStatus = engine.status
  /** Subgraph files are read asynchronously; prevent repeated Run clicks while loading. */
  let runPending = false
  /** Tasks created by the current session (Stop not clicked); they do not enter records until stopped, so live runs are not history. */
  const sessionTaskIds = new Set<string>()
  /**
   * Per-task node display info (title, subgraph scope, role).
   *
   * Subgraphs may come from standalone files and cannot be found in the canvas, so resolve them from the task graph;
   * the task graph is immutable during the task, so caching by task id is enough.
   */
  const taskInfos = new Map<string, Map<string, NodeExecutionInfo>>()

  /** Cache task graphs by task: the engine clones one on each read, so fetch it once per task. */
  const taskGraphs = new Map<string, JsonGraph | null>()

  /**
   * Per-task source (view or event).
   *
   * Switching views changes the current file, but record titles must stay on the file that ran at the time,
   * so the source is captured at task creation and not read back from the current view at render time.
   */
  const taskOrigins = new Map<string, TaskOrigin>()

  /** Evict the oldest entry when the cache exceeds its limit, avoiding memory growth on long sessions. */
  const pruneCache = <T>(cache: Map<string, T>, currentId: string) => {
    if (cache.size <= MAX_TASK_INFOS) return
    const oldest = cache.keys().next().value
    if (oldest && oldest !== currentId) cache.delete(oldest)
  }

  /** Task graph; still readable after the task ends for reviewing node info from that run. */
  const taskGraph = (taskId: string) => {
    const cached = taskGraphs.get(taskId)
    if (cached !== undefined) return cached
    const json = engine.getTaskGraph(taskId) ?? null
    taskGraphs.set(taskId, json)
    pruneCache(taskGraphs, taskId)
    return json
  }

  const taskInfo = (taskId: string) => {
    const cached = taskInfos.get(taskId)
    if (cached) return cached
    const json = taskGraph(taskId)
    const info = json ? buildNodeExecutionInfo(json) : new Map<string, NodeExecutionInfo>()
    taskInfos.set(taskId, info)
    pruneCache(taskInfos, taskId)
    return info
  }

  /** Prefer the task graph's node title; fall back to the canvas when absent. */
  const titleOf = (taskId: string | undefined, nodeId: string) => {
    const info = taskId ? taskInfo(taskId).get(nodeId) : undefined
    if (info?.title) return info.title
    // Use the node type's default title when the record has no custom title, so the panel does not show only node IDs.
    return defaultTitle(info?.nodeType) ?? nodeTitle(nodeId)
  }

  /** Default title for a node type; empty when the type is unregistered. */
  const defaultTitle = (nodeType?: string) => {
    if (!nodeType) return undefined
    try {
      return graph.nodeRegistry.getNodeClass(nodeType)?.definition.title
    } catch {
      return undefined
    }
  }

  /** Owning subgraph; main-graph nodes have no scope. */
  const scopeOf = (taskId: string | undefined, nodeId: string | undefined) => {
    if (!taskId || !nodeId) return undefined
    return taskInfo(taskId).get(nodeId)?.scope
  }

  /** A source node is an event listener: it has no execution entry and is started by subscriptions. */
  const isSourceNode = (nodeType: string) => {
    try {
      return graph.nodeRegistry.getNodeClass(nodeType)?.definition.executionMode === 'source'
    } catch {
      return false
    }
  }

  /**
   * Nodes that listen for the event in an event task.
   *
   * The event name is written in the node's event input; the trigger node writes the same field;
   * the listener is a source node with no execution entry, which distinguishes the two.
   */
  const findListenerNode = (taskId: string, eventName: string) => {
    const json = taskGraph(taskId)
    if (!json) return undefined
    return pickListenerNode(findEventNodes(json, eventName), isSourceNode)
  }

  /**
   * Task source: normal runs come from the current view, event runs from a listener node.
   *
   * A subgraph file is also a normal execution entry, with an extra [Subgraph] marker in the title
   * to distinguish it from the main flow in a view.
   */
  const describeOrigin = (task: TaskSnapshot): TaskOrigin => {
    if (task.trigger.type === 'event') {
      const eventName = task.trigger.eventName ?? t('record.unnamedEvent')
      const listener = findListenerNode(task.id, eventName)
      return {
        kind: 'event',
        nodeName: listener ? titleOf(task.id, listener.id) : t('record.unknownNode'),
        eventName,
      }
    }
    const view = events.getCurrentView?.()
    return {
      kind: 'flow',
      viewName: view?.name ?? t('record.unnamedView'),
      viewType: view?.type ?? 'view',
    }
  }

  /** Execution record title: prefer the source captured at creation, and derive one from current state when absent. */
  const recordTitle = (task: TaskSnapshot) => {
    const origin = taskOrigins.get(task.id) ?? describeOrigin(task)
    return formatOriginTitle(origin)
  }

  // The debug panel reads data for the selected task on each render; selecting a record switches the canvas graph below.
  const debugData = (): DebugPanelData => {
    const trace = getTaskTrace(selectedTaskId ?? engine.latestTaskId)
    const hasActiveTask = engine.getTasks().some((task) =>
      task.status === 'running' || task.status === 'waiting' || task.status === 'paused'
    )
    return {
      records: engine.getTasks()
        .filter((task) => !sessionTaskIds.has(task.id))
        .slice()
        .reverse()
        .map((task): DebugRecord => ({
          id: task.id,
          title: recordTitle(task),
          status: task.status,
          startedAt: task.startedAt,
          endedAt: task.endedAt,
          detail: task.errors[0]?.message,
          selectable: !hasActiveTask,
        })),
      logs: trace.logs,
      chain: trace.chain,
    }
  }

  const refreshDebugPanel = () => graph.refreshDebugPanel()

  const exitReplay = () => {
    selectedTaskId = null
    setActiveDebugTask(engine.latestTaskId ?? null)
    if (graph.isReplayMode()) graph.exitReplay()
    graph.setOptions({ debugPanel: { activeRecordId: null } })
    graph.refreshDebugPanel()
  }

  const syncDebugStatus = () => {
    const status = engine.status
    if (status === lastEngineStatus) return
    if (status === 'running') {
      // After live execution starts, return to the editing graph so live node states do not write into the replay snapshot.
      if (graph.isReplayMode()) exitReplay()
      if (lastEngineStatus === 'paused') {
        appendDebugLog(t('log.resumed'), { taskId: engine.latestTaskId ?? undefined })
      }
    } else if (status === 'paused') {
      const paused = engine.pausedNode
      const taskId = engine.latestTaskId ?? undefined
      appendDebugLog(t('log.pausedAt', { node: quoteName(titleOf(taskId, paused?.nodeId ?? '')) }), {
        taskId,
        level: 'warn',
        nodeId: paused?.nodeId,
        scope: scopeOf(taskId, paused?.nodeId),
      })
    } else if (status === 'stopped') {
      appendDebugLog(t('log.stopped'), { taskId: engine.latestTaskId ?? undefined, level: 'warn' })
      // Only after Stop does the current session's task become reviewable history.
      sessionTaskIds.clear()
    }
    lastEngineStatus = status
  }

  const refreshToolbar = () => {
    syncDebugStatus()
    const pausedNode = engine.pausedNode
    graph.setExecutionStatus(
      engine.status === 'running' || engine.status === 'paused' ? engine.status : 'idle',
      pausedNode?.nodeId,
    )
    // A breakpoint hit does not change pending again, so sync prepared inputs in the pause notification.
    if (pausedNode) {
      graph.setNodeExecutionStatus(pausedNode.nodeId, engine.getNodeStatus(pausedNode.nodeId),
        engine.getNodeExecutionData(pausedNode.nodeId))
    }
    const active = engine.status === 'running' || engine.status === 'paused'
    const labels = toolbarLabels()
    graph.setOptions({ toolbar: {
      actions: [
        { id: 'run', label: labels.run, iconClass: 'ri-play-line', disabled: active },
        { id: 'debug', label: labels.debug, iconClass: 'ri-bug-line', disabled: active },
        { id: 'resume', label: labels.resume, iconClass: 'ri-play-circle-line', disabled: engine.status !== 'paused' },
        { id: 'stop', label: labels.stop, iconClass: 'ri-stop-line', disabled: !active },
      ],
    } })
    refreshDebugPanel()
  }

  const handleToolbarAction = async (id: string) => {
    if (id === 'run' || id === 'debug') {
      if (engine.status === 'running' || engine.status === 'paused' || runPending) return
      runPending = true
      exitReplay()
      try {
        // Subgraphs are standalone files, read and expanded by reference before execution; loop bodies come with the current file.
        const json = events.loadExecutionGraph ? await events.loadExecutionGraph() : graph.toJSON()
        engine.fromJSON(json)
        await engine.process({ debug: id === 'debug' })
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error)
        events.onRunError?.(t('error.run', { reason: message }))
      } finally {
        runPending = false
      }
      return
    }
    if (id === 'resume') engine.resume()
    if (id === 'stop') engine.stop()
  }

  const handleRecordSelect = (record: DebugRecord | null) => {
    if (!record) {
      exitReplay()
      return
    }
    if (record.status === 'running' || record.status === 'paused') return
    // Do not switch the canvas while a task is still running, avoiding live state written into a historical snapshot.
    const hasActiveTask = engine.getTasks().some((task) =>
      task.status === 'running' || task.status === 'waiting' || task.status === 'paused'
    )
    if (hasActiveTask) return
    const taskGraph = engine.getTaskGraph(record.id)
    if (!taskGraph) return
    const nodeStatuses: Record<string, NodeExecutionStatus> = {}
    engine.getNodeStatuses(record.id).forEach((status, nodeId) => {
      nodeStatuses[nodeId] = status
    })
    const nodeData: Record<string, NodeExecutionData> = {}
    for (const nodeId of collectNodeIds(taskGraph)) {
      const data = engine.getNodeExecutionData(nodeId, record.id)
      if (data) nodeData[nodeId] = data
    }
    selectedTaskId = record.id
    graph.enterReplay(taskGraph, { label: record.title, nodeStatuses, nodeData })
    graph.setOptions({ debugPanel: { activeRecordId: record.id } })
    graph.refreshDebugPanel()
  }

  const handleReplayChanged = (replaying: boolean) => {
    if (replaying || selectedTaskId === null) return
    selectedTaskId = null
    setActiveDebugTask(engine.latestTaskId ?? null)
    graph.setOptions({ debugPanel: { activeRecordId: null } })
    graph.refreshDebugPanel()
  }

  const handleTaskCreated = (task: TaskSnapshot) => {
    sessionTaskIds.add(task.id)
    setActiveDebugTask(task.id)
    // Capture the source here: switching views later will not rewrite this record's title.
    taskOrigins.set(task.id, describeOrigin(task))
    pruneCache(taskOrigins, task.id)
    appendDebugLog(t('log.started'), { taskId: task.id })
    refreshDebugPanel()
  }

  const handleTaskChanged = (task: TaskSnapshot) => {
    setActiveDebugTask(task.id)
    if (task.status === 'completed') {
      appendDebugLog(t('log.taskCompleted'), { taskId: task.id, level: 'success' })
    } else if (task.status === 'failed') {
      appendDebugLog(t('log.taskFailed'), { taskId: task.id, level: 'error' })
    } else if (task.status === 'cancelled') {
      appendDebugLog(t('log.taskCancelled'), { taskId: task.id, level: 'warn' })
    }
    refreshDebugPanel()
  }

  const handleTaskNodeStatus = (taskId: string, nodeId: string, status: NodeExecutionStatus) => {
    setActiveDebugTask(taskId)
    const info = taskInfo(taskId).get(nodeId)
    const title = titleOf(taskId, nodeId)
    // Subgraph nodes carry scope, so the panel can indent and distinguish entry and exit.
    traceNodeExecution(taskId, nodeId, status, title, info?.scope, info?.kind)
    if (status === 'running') {
      appendDebugLog(t('log.nodeStarted', { node: quoteName(title) }), { taskId, nodeId, scope: info?.scope })
    } else if (status === 'completed') {
      appendDebugLog(t('log.nodeCompleted', { node: quoteName(title) }), {
        taskId,
        nodeId,
        level: 'success',
        scope: info?.scope,
      })
    }
    refreshDebugPanel()
  }

  const handleNodeStatus = (nodeId: string, status: NodeExecutionStatus) => {
    graph.setNodeExecutionStatus(nodeId, status, engine.getNodeExecutionData(nodeId))
  }

  const handleTaskError = (taskId: string, error: unknown, nodeId: string) => {
    const message = error instanceof Error ? error.message : String(error)
    appendDebugLog(t('log.nodeFailed', { node: quoteName(titleOf(taskId, nodeId)), message }), {
      taskId,
      nodeId,
      level: 'error',
      scope: scopeOf(taskId, nodeId),
    })
    refreshDebugPanel()
  }

  const handleBreakpoint = (taskId: string, breakpoint: BreakpointHit) => {
    appendDebugLog(t('log.breakpoint', { node: quoteName(titleOf(taskId, breakpoint.nodeId)) }), {
      taskId,
      nodeId: breakpoint.nodeId,
      level: 'warn',
      scope: scopeOf(taskId, breakpoint.nodeId),
    })
    refreshDebugPanel()
  }

  const handleNodeChanged = (node: NodeInstanceType, property: string) => {
    if (property === 'breakpoint') engine.setBreakpoint(node.id, node.breakpoint)
  }

  graph.setOptions({ debugPanel: {
    width: 340,
    data: debugData,
    activeRecordId: null,
    onRecordSelect: handleRecordSelect,
  } })
  graph.resetNodeExecutionStatuses()
  engine.getNodeStatuses().forEach((status, nodeId) => handleNodeStatus(nodeId, status))
  refreshToolbar()
  engine.on('status:changed', refreshToolbar)
  engine.on('node:status:changed', handleNodeStatus)
  engine.on('task:created', handleTaskCreated)
  engine.on('task:changed', handleTaskChanged)
  engine.on('task:node:status:changed', handleTaskNodeStatus)
  engine.on('task:error', handleTaskError)
  engine.on('task:breakpoint:hit', handleBreakpoint)
  graph.on('replay:changed', handleReplayChanged)
  graph.on('toolbar:action', handleToolbarAction)
  graph.on('node:changed', handleNodeChanged)

  return () => {
    engine.off('status:changed', refreshToolbar)
    engine.off('node:status:changed', handleNodeStatus)
    engine.off('task:created', handleTaskCreated)
    engine.off('task:changed', handleTaskChanged)
    engine.off('task:node:status:changed', handleTaskNodeStatus)
    engine.off('task:error', handleTaskError)
    engine.off('task:breakpoint:hit', handleBreakpoint)
    graph.off('replay:changed', handleReplayChanged)
    graph.off('toolbar:action', handleToolbarAction)
    graph.off('node:changed', handleNodeChanged)
    if (graph.isReplayMode()) graph.exitReplay()
    graph.setOptions({ debugPanel: false })
    resetDebugTrace()
    taskInfos.clear()
    taskGraphs.clear()
    taskOrigins.clear()
    engine.stop()
    graph.setExecutionStatus('idle')
  }
}
