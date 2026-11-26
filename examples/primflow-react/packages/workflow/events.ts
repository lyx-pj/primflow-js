import type { DebugPanelData, DebugRecord, Graph, NodeExecutionData } from '@lyx-pj/primflow-canvas'
import type { Engine, NodeAttempt, TaskSnapshot } from '@lyx-pj/primflow-engine'
import type { JsonGraph, NodeClassType, NodeExecutionStatus, NodeInstanceType } from '@lyx-pj/primflow-model'
import { resetBusinessLogs, taskLogEntries } from './debug'
import { findEventNodes, formatOriginTitle, pickListenerNode, type TaskOrigin } from './records'
import { buildNodeExecutionInfo, type NodeExecutionInfo } from './scopes'
import type { ViewMeta } from './storage'
import { t, toolbarLabels } from './i18n'

function collectNodeIds(json: JsonGraph) {
  const graphs = [json, ...Object.values(json.subgraphs)]
  return graphs.flatMap((graph) => graph.nodes.map((node) => node.id))
}

function withAttempt(data: NodeExecutionData | undefined, attempt: NodeAttempt | undefined): NodeExecutionData | undefined {
  if (!attempt) return data
  const { number, maxRetries, remainingRetries, failure, previousFailure } = attempt
  return {
    inputs: data?.inputs ?? attempt.inputs ?? {},
    outputs: data?.outputs ?? attempt.outputs ?? {},
    attempt: { number, maxRetries, remainingRetries, failure, previousFailure },
  }
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
  const liveAttempts = new Map<string, NodeAttempt>()
  for (const attempt of (engine.latestTaskId && engine.getTask(engine.latestTaskId)?.attempts) || []) {
    liveAttempts.set(attempt.nodeId, attempt)
  }
  /** Subgraph files are read asynchronously; prevent repeated Run clicks while loading. */
  let runPending = false
  /**
   * Per-task node display info (title and subgraph scope).
   *
   * Subgraphs may come from standalone files and cannot be found on the canvas, so resolve them from the task graph;
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
      return graph.nodeRegistry.getDefinition(nodeType).name
    } catch {
      return undefined
    }
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

  /** A task is still executing while it runs, waits, pauses, or waits for external input. */
  const isActiveStatus = (status: TaskSnapshot['status']) =>
    status === 'running' || status === 'waiting' || status === 'paused' || status === 'interrupted'

  const hasActiveTask = () => engine.getTasks().some((task) => isActiveStatus(task.status))

  // The debug panel reads data for the selected task on each render; selecting a record switches the canvas graph below.
  const debugData = (): DebugPanelData => {
    const taskId = selectedTaskId ?? engine.latestTaskId
    // A live task has no final snapshot yet, so records cannot be replayed while one is running.
    const canReplay = !hasActiveTask()
    return {
      // Tasks are listed with their live status, so the running task shows as Running until it finishes.
      records: engine.getTasks()
        .slice()
        .reverse()
        .map((task): DebugRecord => ({
          id: task.id,
          title: recordTitle(task),
          status: task.status,
          startedAt: task.startedAt,
          endedAt: task.endedAt,
          detail: task.errors[0]?.message,
          selectable: canReplay,
        })),
      // Logs come from the engine execution log of the selected task, merged with business log lines.
      logs: taskLogEntries(
        taskId ? engine.getTask(taskId) : undefined,
        taskId ? engine.getTaskTrace(taskId) : undefined,
        taskId ? taskInfo(taskId) : new Map<string, NodeExecutionInfo>(),
        (nodeId, info) => titleOf(taskId ?? undefined, nodeId) || info?.title || nodeId,
      ),
    }
  }

  const refreshDebugPanel = () => graph.refreshDebugPanel()

  const exitReplay = () => {
    selectedTaskId = null
    if (graph.isReplayMode()) graph.exitReplay()
    graph.setOptions({ debugPanel: { activeRecordId: null } })
    graph.refreshDebugPanel()
  }

  const refreshToolbar = () => {
    const pausedNode = engine.pausedNode
    graph.setExecutionStatus(
      engine.status === 'running' || engine.status === 'paused' ? engine.status : 'idle',
      pausedNode?.nodeId,
    )
    // A breakpoint hit does not change pending again, so sync prepared inputs in the pause notification.
    if (pausedNode) {
      handleNodeStatus(pausedNode.nodeId, engine.getNodeStatus(pausedNode.nodeId))
    }
    const active = engine.status === 'running' || engine.status === 'paused'
    const labels = toolbarLabels()
    graph.setOptions({
      toolbar: {
        actions: [
          { id: 'run', label: labels.run, iconClass: 'ri-play-line', disabled: active },
          { id: 'debug', label: labels.debug, iconClass: 'ri-bug-line', disabled: active },
          { id: 'resume', label: labels.resume, iconClass: 'ri-play-circle-line', disabled: engine.status !== 'paused' },
          { id: 'stop', label: labels.stop, iconClass: 'ri-stop-line', disabled: !active },
        ],
      }
    })
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
        engine.loadGraph(json)
        graph.resetNodeExecutionStatuses()
        await engine.start({ debug: id === 'debug' })
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error)
        events.onRunError?.(t('error.run', { reason: message }))
      } finally {
        runPending = false
      }
      return
    }
    if (id === 'resume') engine.resume()
    if (id === 'stop') {
      const taskId = engine.latestTaskId
      engine.stop()
      if (taskId && engine.getTask(taskId)?.status === 'cancelled') {
        for (const [nodeId, status] of engine.getNodeStatuses(taskId)) {
          if (status === 'cancelled') graph.setNodeExecutionStatus(nodeId, status)
        }
      }
    }
  }

  const handleRecordSelect = (record: DebugRecord | null) => {
    if (!record) {
      exitReplay()
      return
    }
    // Do not switch the canvas while a task is still running, avoiding live state written into a historical snapshot.
    if (hasActiveTask()) return
    const taskGraph = engine.getTaskGraph(record.id)
    if (!taskGraph) return
    const nodeStatuses: Record<string, NodeExecutionStatus> = {}
    engine.getNodeStatuses(record.id).forEach((status, nodeId) => {
      nodeStatuses[nodeId] = status
    })
    const nodeData: Record<string, NodeExecutionData> = {}
    const attempts = new Map(engine.getTask(record.id)?.attempts?.map((attempt) => [attempt.nodeId, attempt]))
    for (const nodeId of collectNodeIds(taskGraph)) {
      const data = withAttempt(engine.getNodeExecutionData(nodeId, record.id), attempts.get(nodeId))
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
    graph.setOptions({ debugPanel: { activeRecordId: null } })
    graph.refreshDebugPanel()
  }

  const handleTaskCreated = (task: TaskSnapshot) => {
    if (task.id === engine.latestTaskId) {
      liveAttempts.clear()
    }
    // Capture the source here: switching views later will not rewrite this record's title.
    taskOrigins.set(task.id, describeOrigin(task))
    pruneCache(taskOrigins, task.id)
    refreshDebugPanel()
  }

  const handleTaskChanged = () => {
    refreshDebugPanel()
  }

  const handleTaskNodeStatus = () => {
    refreshDebugPanel()
  }

  const handleNodeStatus = (nodeId: string, status: NodeExecutionStatus) => {
    graph.setNodeExecutionStatus(nodeId, status, withAttempt(engine.getNodeExecutionData(nodeId), liveAttempts.get(nodeId)))
  }

  const handleAttempt = (taskId: string, attempt: NodeAttempt) => {
    if (taskId === engine.latestTaskId && attempt.id >= (liveAttempts.get(attempt.nodeId)?.id ?? 0)) {
      liveAttempts.set(attempt.nodeId, attempt)
      if (!graph.isReplayMode()) handleNodeStatus(attempt.nodeId, engine.getNodeStatus(attempt.nodeId))
    }
    refreshDebugPanel()
  }

  const handleNodeChanged = (node: NodeInstanceType, property: string) => {
    if (property === 'breakpoint') engine.setBreakpoint(node.id, node.breakpoint)
  }

  graph.setOptions({
    debugPanel: {
      width: 340,
      data: debugData,
      activeRecordId: null,
      onRecordSelect: handleRecordSelect,
    }
  })
  graph.resetNodeExecutionStatuses()
  engine.getNodeStatuses().forEach((status, nodeId) => handleNodeStatus(nodeId, status))
  refreshToolbar()
  engine.on('status:changed', refreshToolbar)
  engine.on('node:status:changed', handleNodeStatus)
  engine.on('task:created', handleTaskCreated)
  engine.on('task:changed', handleTaskChanged)
  engine.on('task:node:status:changed', handleTaskNodeStatus)
  engine.on('task:node:attempt', handleAttempt)
  graph.on('replay:changed', handleReplayChanged)
  graph.on('toolbar:action', handleToolbarAction)
  graph.on('node:changed', handleNodeChanged)

  return () => {
    engine.off('status:changed', refreshToolbar)
    engine.off('node:status:changed', handleNodeStatus)
    engine.off('task:created', handleTaskCreated)
    engine.off('task:changed', handleTaskChanged)
    engine.off('task:node:status:changed', handleTaskNodeStatus)
    engine.off('task:node:attempt', handleAttempt)
    graph.off('replay:changed', handleReplayChanged)
    graph.off('toolbar:action', handleToolbarAction)
    graph.off('node:changed', handleNodeChanged)
    if (graph.isReplayMode()) graph.exitReplay()
    graph.setOptions({ debugPanel: false })
    resetBusinessLogs()
    taskInfos.clear()
    taskGraphs.clear()
    taskOrigins.clear()
    engine.stop()
    graph.setExecutionStatus('idle')
  }
}
