import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { NodeInstance, type JsonGraph } from '@lyx-pj/primflow-model'
import type { Graph, NodeClassType } from '@lyx-pj/primflow-canvas'
import { useGraph } from './context/graph-context'
import { useEngine } from './context/engine-context'
import { bindWorkflowEvents } from './events'
import {
  deleteView as removeStoredView,
  listViews,
  loadView,
  renameView as renameStoredView,
  saveView,
  type ViewMeta,
  type ViewType,
} from './storage'
import { assembleExecutionGraph, buildSubgraphPaletteEntries } from './subgraphs'
import { createViewId, ensureSubgraphStartId, nextViewName, restoreGraph } from './views'
import { getLanguage, translate } from './i18n'

/** Autosave debounce: persist after continuous actions stop, avoiding frequent IndexedDB writes during drags. */
export const AUTOSAVE_DELAY = 600

/** Last opened file; prefer restoring it on re-entry. */
const LAST_VIEW_KEY = 'bpgraph:lastViewId'

/** Load result; determines whether autosave can start. */
type LoadState = 'loading' | 'ready' | 'failed'

export type SaveStatus = {
  /** idle: never saved; pending: changes wait to be saved; saving: writing; saved: saved; error: save failed. */
  state: 'idle' | 'pending' | 'saving' | 'saved' | 'error'
  /** Timestamp of the last successful save; only set when state is saved. */
  savedAt?: number
  /** Failure reason; only set when state is error. */
  message?: string
}

/** Create target: a standalone view file or a subgraph file callable by other files. */
export type CreateTarget = 'view' | 'subgraph'

function describeLoadError(error: unknown) {
  return translate(getLanguage(), 'error.load', {
    reason: error instanceof Error ? error.message : translate(getLanguage(), 'error.storage'),
  })
}

function describeSaveError(error: unknown) {
  return error instanceof Error ? error.message : translate(getLanguage(), 'error.storage')
}

/** Remember the last opened file; ignore when localStorage is unavailable in private mode. */
function rememberLastView(id: string) {
  try {
    window.localStorage.setItem(LAST_VIEW_KEY, id)
  } catch {
    // If it cannot be stored, the app still works.
  }
}

/** Prefer the last opened file, otherwise the most recently updated one. */
function pickInitialView(list: ViewMeta[]): ViewMeta {
  try {
    const last = window.localStorage.getItem(LAST_VIEW_KEY)
    if (last) {
      const found = list.find((view) => view.id === last)
      if (found) return found
    }
  } catch {
    // If it cannot be read, fall back to the most recently updated file.
  }
  return list[0]
}

/** New files start from the default viewport instead of inheriting the previous file's pan and zoom. */
function resetViewport<NodeDefs extends Record<string, NodeClassType>>(graph: Graph<NodeDefs>) {
  graph.zoom(1)
  graph.position = { x: 0, y: 0 }
  // Imperative changes do not emit viewport events, so notify the model to keep the old viewport out of the new file.
  graph.emit('viewport:change', { x: 0, y: 0, scale: 1 })
}

/**
 * Configure boundary nodes for a subgraph file.
 *
 * The entry node receives parameters from the parent graph and exposes them to the subgraph under the same names;
 * The exit node receives the value to return and writes it back to the parent subgraph node's output port.
 */
function addSubgraphEndNode<NodeDefs extends Record<string, NodeClassType>>(graph: Graph<NodeDefs>) {
  const start = graph.getNodes().find((node) => node.type === 'start')
  if (start) {
    start.inputs = [
      ...start.inputs,
      { id: 'in-input', name: 'input', type: 'any', label: translate(getLanguage(), 'subgraph.parameter') },
    ]
    start.outputs = [
      ...start.outputs,
      { id: 'out-input', name: 'input', type: 'any', label: translate(getLanguage(), 'subgraph.parameter') },
    ]
  }
  const EndClass = graph.nodeRegistry.getEndNodeClass()
  const end = new NodeInstance(EndClass, {
    position: { x: 600, y: 300 },
    inputs: [
      { id: 'in-end', name: 'end', type: 'exec' },
      { id: 'in-result', name: 'result', type: 'any', label: translate(getLanguage(), 'subgraph.returnValue') },
    ],
  })
  graph.addNode(end)
}

/** Normalize data by file type before saving: a subgraph file's root Start must be unique across files. */
function serializeRecord<NodeDefs extends Record<string, NodeClassType>>(
  graph: Graph<NodeDefs>,
  meta: ViewMeta,
): JsonGraph {
  const data = graph.toJSON()
  return meta.type === 'subgraph' ? ensureSubgraphStartId(data, meta.id) : data
}

export function useWorkflow() {
  const graph = useGraph()
  const engine = useEngine()
  const [loadError, setLoadError] = useState('')
  const [runError, setRunError] = useState('')
  const [loadState, setLoadState] = useState<LoadState>('loading')
  // Wait for local files to load before showing the canvas on first startup, avoiding a flash of the default graph.
  const [booting, setBooting] = useState(true)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>({ state: 'idle' })
  const [views, setViews] = useState<ViewMeta[]>([])
  const [currentViewId, setCurrentViewId] = useState('')

  // Do not write state or persist after unmount.
  const aliveRef = useRef(true)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const saveSeqRef = useRef(0)
  // Hold the current file and list in refs: file switching is async, and callbacks must see the latest values.
  const currentViewRef = useRef<ViewMeta | null>(null)
  const viewsRef = useRef<ViewMeta[]>([])
  // Disable autosave while switching files so the new canvas is not written into the old file.
  const switchingRef = useRef(false)
  // Record only the source of double-click navigation; it is session navigation state, not graph JSON.
  const navigationRef = useRef<Array<{ viewId: string; subgraphs: string[] }>>([])

  const updateViews = useCallback((updater: (prev: ViewMeta[]) => ViewMeta[]) => {
    const next = updater(viewsRef.current)
    viewsRef.current = next
    setViews(next)
  }, [])

  const cancelPendingSave = useCallback(() => {
    if (!timerRef.current) return
    clearTimeout(timerRef.current)
    timerRef.current = null
  }, [])

  /** Read a file's content back into the canvas; on failure pause autosave and report the reason. */
  const restoreInto = useCallback(
    async (target: ViewMeta) => {
      try {
        const data = await loadView(target.id)
        // Do not touch the canvas after unmount, avoiding writes into a destroyed instance.
        if (!aliveRef.current) return false
        // A subgraph file's root Start is the subgraph entry and must keep its parameter ports.
        if (!data) throw new Error(translate(getLanguage(), 'error.missingFile'))
        restoreGraph(graph, data, { keepStartPorts: target.type === 'subgraph' })
        setLoadError('')
        setRunError('')
        setLoadState('ready')
        return true
      } catch (error: unknown) {
        if (!aliveRef.current) return false
        setLoadError(describeLoadError(error))
        setLoadState('failed')
        return false
      }
    },
    [graph],
  )

  /** Write the current canvas back to the current file as a fallback before switching. */
  const persistCurrent = useCallback(async () => {
    // The replay canvas is a historical snapshot; restore the editing graph before saving so it is not overwritten.
    if (graph.isReplayMode()) graph.exitReplay()
    const current = currentViewRef.current
    if (!current) return
    const updatedAt = Date.now()
    await saveView({
      id: current.id,
      name: current.name,
      type: current.type,
      data: serializeRecord(graph, current),
      updatedAt,
    })
    updateViews((prev) => prev.map((view) => (view.id === current.id ? { ...view, updatedAt } : view)))
  }, [graph, updateViews])

  /** Save the current file immediately; autosave and manual save share this path. */
  const saveNow = useCallback(async () => {
    if (switchingRef.current || graph.isReplayMode()) return
    const current = currentViewRef.current
    if (!current) return
    cancelPendingSave()
    const seq = ++saveSeqRef.current
    setSaveStatus({ state: 'saving' })
    try {
      const updatedAt = Date.now()
      await saveView({
        id: current.id,
        name: current.name,
        type: current.type,
        data: serializeRecord(graph, current),
        updatedAt,
      })
      if (!aliveRef.current || seq !== saveSeqRef.current) return
      updateViews((prev) => prev.map((view) => (view.id === current.id ? { ...view, updatedAt } : view)))
      setSaveStatus({ state: 'saved', savedAt: updatedAt })
    } catch (error: unknown) {
      if (!aliveRef.current || seq !== saveSeqRef.current) return
      setSaveStatus({ state: 'error', message: describeSaveError(error) })
    }
  }, [cancelPendingSave, graph, updateViews])

  /**
   * Assemble the subgraphs referenced by the current file before execution.
   *
   * Subgraph files are stored independently and read by each node's subgraphId only at runtime;
   * loop bodies belong to the current file and come along with graph.toJSON().
   */
  const buildExecutionGraph = useCallback(async () => {
    const current = currentViewRef.current
    if (!current) throw new Error(translate(getLanguage(), 'error.noCurrentFile'))
    if (graph.isReplayMode()) graph.exitReplay()
    setRunError('')
    return assembleExecutionGraph({
      root: graph.toJSON(),
      current,
      files: viewsRef.current,
      load: loadView,
      isRegistered: (nodeType) =>
        graph.nodeRegistry.isRegistered(nodeType as keyof typeof graph.nodeRegistry.registry),
    })
  }, [graph])

  /** Switch to another file: persist the current file first, then read the target file into the canvas. */
  const navigateView = useCallback(
    async (id: string, direction: 'select' | 'enter' | 'back') => {
      if (switchingRef.current) return
      if (id === currentViewRef.current?.id && direction !== 'back') {
        if (direction !== 'select') return
        navigationRef.current = []
        // Selecting the already open file means returning to that file's root graph (it may be inside a loop body).
        while (graph.model && graph.model.subgraphStack.length > 1) graph.exitSubgraph()
        // The back path is stored in a ref; refresh the toolbar's back entry proactively.
        graph.setOptions({})
        return
      }
      const target = viewsRef.current.find((view) => view.id === id)
      if (!target) return
      switchingRef.current = true
      try {
        // Do not persist a file that failed to restore, or the current canvas would overwrite its unrestored record.
        if (loadState === 'ready') {
          try {
            await persistCurrent()
          } catch (error: unknown) {
            setSaveStatus({ state: 'error', message: describeSaveError(error) })
            return
          }
        }
        if (!aliveRef.current) return
        cancelPendingSave()
        if (direction === 'enter' && currentViewRef.current) {
          navigationRef.current.push({
            viewId: currentViewRef.current.id,
            subgraphs: graph.model?.subgraphStack.slice(1).map((region) => region.id) ?? [],
          })
        } else if (direction === 'select') {
          navigationRef.current = []
        }
        currentViewRef.current = target
        setCurrentViewId(target.id)
        rememberLastView(target.id)
        setLoadState('loading')
        const restored = await restoreInto(target)
        if (restored && direction === 'back') {
          const source = navigationRef.current.pop()
          // The source node may be inside a loop body; restore that editing level, and skip regions that no longer exist.
          for (const subgraphId of source?.subgraphs ?? []) {
            if (!graph.model.hasSubgraph(subgraphId)) break
            graph.enterSubgraph(subgraphId)
          }
        }
      } finally {
        switchingRef.current = false
      }
    },
    [cancelPendingSave, graph, loadState, persistCurrent, restoreInto],
  )

  const switchView = useCallback((id: string) => navigateView(id, 'select'), [navigateView])

  /** Keep the source when double-clicking an external subgraph so right-click double-click can return level by level. */
  const openSubgraph = useCallback(async (id: string) => {
    if (!viewsRef.current.some((view) => view.id === id && view.type === 'subgraph')) return
    await navigateView(id, 'enter')
  }, [navigateView])

  const goBack = useCallback(async () => {
    const source = navigationRef.current.at(-1)
    if (source) await navigateView(source.viewId, 'back')
  }, [navigateView])

  useEffect(() => {
    graph.setOptions({
      navigation: {
        canGoBack: () => navigationRef.current.length > 0,
        goBack,
      },
    })
    return () => graph.setOptions({ navigation: null })
  }, [graph, goBack, currentViewId, views])

  /** Create a standalone file and switch to it; subgraph files start with Start + End. */
  const createFile = useCallback(
    async (name: string, type: ViewType) => {
      const trimmed = name.trim()
      if (!trimmed) return
      switchingRef.current = true
      try {
        // Do not persist a file that failed to restore, or the current canvas would overwrite its unrestored record.
        if (loadState === 'ready') {
          try {
            await persistCurrent()
          } catch (error: unknown) {
            setSaveStatus({ state: 'error', message: describeSaveError(error) })
            return
          }
        }
        cancelPendingSave()
        graph.clear()
        resetViewport(graph)
        if (type === 'subgraph') addSubgraphEndNode(graph)
        const id = createViewId()
        const meta: ViewMeta = { id, name: trimmed, type, updatedAt: Date.now() }
        await saveView({ ...meta, data: serializeRecord(graph, meta) })
        navigationRef.current = []
        currentViewRef.current = meta
        updateViews((prev) => [...prev, meta])
        setCurrentViewId(meta.id)
        rememberLastView(meta.id)
        setLoadError('')
        setRunError('')
        setLoadState('ready')
        setSaveStatus({ state: 'saved', savedAt: meta.updatedAt })
      } catch (error: unknown) {
        setSaveStatus({ state: 'error', message: describeSaveError(error) })
      } finally {
        cancelPendingSave()
        switchingRef.current = false
      }
    },
    [cancelPendingSave, graph, loadState, persistCurrent, updateViews],
  )

  const createView = useCallback((name: string) => createFile(name, 'view'), [createFile])
  const createSubgraph = useCallback((name: string) => createFile(name, 'subgraph'), [createFile])

  /** Delete a file; deleting the current file switches to the first remaining one, and deleting all creates a blank view. */
  const deleteView = useCallback(
    async (id: string) => {
      const target = viewsRef.current.find((view) => view.id === id)
      if (!target) return
      const remaining = viewsRef.current.filter((view) => view.id !== id)
      switchingRef.current = true
      try {
        await removeStoredView(id)
        navigationRef.current = navigationRef.current.filter((source) => source.viewId !== id)
        if (currentViewRef.current?.id === id) navigationRef.current = []
        if (!remaining.length) {
          // Keep at least one file: after deleting all, create a blank ordinary view.
          cancelPendingSave()
          graph.clear()
          resetViewport(graph)
          const createdId = createViewId()
          const meta: ViewMeta = { id: createdId, name: nextViewName([]), type: 'view', updatedAt: Date.now() }
          await saveView({ ...meta, data: serializeRecord(graph, meta) })
          currentViewRef.current = meta
          updateViews(() => [meta])
          setCurrentViewId(meta.id)
          rememberLastView(meta.id)
          setLoadError('')
          setLoadState('ready')
        } else {
          updateViews(() => remaining)
          if (currentViewRef.current?.id === id) {
            cancelPendingSave()
            const next = remaining[0]
            currentViewRef.current = next
            setCurrentViewId(next.id)
            rememberLastView(next.id)
            setLoadState('loading')
            await restoreInto(next)
          }
        }
      } catch (error: unknown) {
        setSaveStatus({ state: 'error', message: describeSaveError(error) })
      } finally {
        switchingRef.current = false
      }
    },
    [cancelPendingSave, graph, restoreInto, updateViews],
  )

  /**
   * Rename a file.
   *
   * Update the in-memory name before persisting: autosave and file switching both read names from `currentViewRef`;
   * the reverse order could let concurrent saves write the old name back. Roll back on failure to keep UI and storage consistent.
   */
  const renameView = useCallback(
    async (id: string, name: string) => {
      const trimmed = name.trim()
      if (!trimmed) return
      const target = viewsRef.current.find((view) => view.id === id)
      if (!target || target.name === trimmed) return
      const renamingCurrent = currentViewRef.current?.id === id
      updateViews((prev) => prev.map((view) => (view.id === id ? { ...view, name: trimmed } : view)))
      if (renamingCurrent && currentViewRef.current) {
        currentViewRef.current = { ...currentViewRef.current, name: trimmed }
      }
      try {
        await renameStoredView(id, trimmed)
      } catch (error: unknown) {
        updateViews((prev) => prev.map((view) => (view.id === id ? { ...view, name: target.name } : view)))
        if (renamingCurrent && currentViewRef.current) {
          currentViewRef.current = { ...currentViewRef.current, name: target.name }
        }
        setSaveStatus({ state: 'error', message: describeSaveError(error) })
      }
    },
    [updateViews],
  )

  useEffect(() => {
    aliveRef.current = true
    return () => {
      aliveRef.current = false
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  // First entry: read the file list and restore the last opened file; create the first one if none exist.
  useEffect(() => {
    let cancelled = false
    const boot = async () => {
      try {
        let list: ViewMeta[]
        try {
          list = await listViews()
        } catch (error: unknown) {
          if (!cancelled) {
            setLoadError(describeLoadError(error))
            setLoadState('failed')
          }
          return
        }
        if (cancelled) return
        updateViews(() => list)

        if (!list.length) {
          const id = createViewId()
          const meta: ViewMeta = { id, name: nextViewName([]), type: 'view', updatedAt: Date.now() }
          try {
            await saveView({ ...meta, data: serializeRecord(graph, meta) })
          } catch (error: unknown) {
            if (!cancelled) {
              setLoadError(describeLoadError(error))
              setLoadState('failed')
            }
            return
          }
          if (cancelled) return
          currentViewRef.current = meta
          updateViews(() => [meta])
          setCurrentViewId(meta.id)
          rememberLastView(meta.id)
          setLoadState('ready')
          return
        }

        const target = pickInitialView(list)
        currentViewRef.current = target
        setCurrentViewId(target.id)
        await restoreInto(target)
      } finally {
        // End the booting state even on failure so the error notice and manual overwrite entry stay visible.
        if (!cancelled) setBooting(false)
      }
    }
    void boot()
    return () => {
      cancelled = true
    }
  }, [graph, restoreInto, updateViews])

  // The Subgraphs palette category comes from standalone files; reload after files are added, removed, or renamed.
  useEffect(() => {
    graph.setOptions({
      palette: {
        entries: (currentGraph) =>
          buildSubgraphPaletteEntries(currentGraph, viewsRef.current, currentViewRef.current?.id ?? ''),
      },
    })
  }, [graph])

  useEffect(
    () =>
      bindWorkflowEvents(graph, engine, {
        loadExecutionGraph: buildExecutionGraph,
        onRunError: setRunError,
        // Execution records are named after the view that started them; read the ref so switching files does not rebind events.
        getCurrentView: () => currentViewRef.current,
      }),
    [buildExecutionGraph, graph, engine],
  )

  // Autosave: persist to the current file after content or viewport changes.
  // Keep the stored record when restore fails; pause autosave and allow only manual overwrite.
  useEffect(() => {
    if (loadState !== 'ready') return
    const schedule = () => {
      // Replay replaces canvas content; do not write those temporary changes back to the file record.
      if (graph.isReplayMode()) return
      // Drag events are dense; return the previous object when the state is unchanged to avoid repeated renders.
      setSaveStatus((prev) =>
        prev.state === 'pending' || prev.state === 'error' ? prev : { state: 'pending' },
      )
      cancelPendingSave()
      timerRef.current = setTimeout(() => {
        timerRef.current = null
        void saveNow()
      }, AUTOSAVE_DELAY)
    }
    const onChanged = () => schedule()
    graph.on('changed', onChanged)
    graph.on('viewport:change', onChanged)
    return () => {
      graph.off('changed', onChanged)
      graph.off('viewport:change', onChanged)
      cancelPendingSave()
    }
  }, [cancelPendingSave, graph, loadState, saveNow])

  const handleKeyDown = (event: KeyboardEvent) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 's') {
      event.preventDefault()
      void saveNow()
    }
  }

  return {
    graph,
    booting,
    handleKeyDown,
    loadError,
    runError,
    saveStatus,
    views,
    currentViewId,
    switchView,
    openSubgraph,
    createView,
    createSubgraph,
    deleteView,
    renameView,
    buildExecutionGraph,
  }
}
