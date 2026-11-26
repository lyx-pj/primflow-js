import type { JsonGraph } from '@lyx-pj/primflow-model'
import type {
  CachedSubgraphPreview,
  SubgraphPreviewCacheAdapter,
} from '@lyx-pj/primflow-canvas'
import { getLanguage, translate } from './i18n'

/** File types: an ordinary view is an execution entry, while a subgraph is an independent flow callable by other files. */
export type ViewType = 'view' | 'subgraph'

/** View record: the persisted result of a workflow, including nodes, links, and viewport. */
export type ViewRecord = {
  id: string
  name: string
  type: ViewType
  data: JsonGraph
  updatedAt: number
}

/** The view list only needs metadata; graph data is read on demand. */
export type ViewMeta = {
  id: string
  name: string
  type: ViewType
  updatedAt: number
}

const DB_NAME = 'bpgraph'
const DB_VERSION = 3
const VIEW_STORE = 'views'
/** Rendered subgraph card previews, keyed by target graph id. */
const PREVIEW_STORE = 'previews'
/** Old versions had one fixed archive store; migrate it to the first view on upgrade. */
const LEGACY_STORE = 'graphs'
const LEGACY_VIEW_ID = 'view-legacy'

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      const tx = request.transaction
      if (!db.objectStoreNames.contains(PREVIEW_STORE)) {
        db.createObjectStore(PREVIEW_STORE, { keyPath: 'targetId' })
      }
      if (db.objectStoreNames.contains(VIEW_STORE)) return
      db.createObjectStore(VIEW_STORE, { keyPath: 'id' })
      // Old versions stored the whole workflow under a fixed key; move it into the view store on upgrade to avoid data loss.
      if (!db.objectStoreNames.contains(LEGACY_STORE) || !tx) return
      const legacy = tx.objectStore(LEGACY_STORE)
      const read = legacy.getAll()
      read.onsuccess = () => {
        const target = tx.objectStore(VIEW_STORE)
        for (const record of read.result as Array<{ data?: JsonGraph; updatedAt?: number }>) {
          if (!record?.data) continue
          target.put({
            id: LEGACY_VIEW_ID,
            name: translate(getLanguage(), 'default.viewName', { index: 1 }),
            type: 'view',
            data: record.data,
            updatedAt: record.updatedAt ?? Date.now(),
          })
        }
        db.deleteObjectStore(LEGACY_STORE)
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

/** List all views, most recently updated first. */
export async function listViews(): Promise<ViewMeta[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(VIEW_STORE, 'readonly')
    const request = tx.objectStore(VIEW_STORE).getAll()
    request.onsuccess = () => {
      const views = (request.result as ViewRecord[])
        .filter((view): view is ViewRecord => Boolean(view) && typeof view.id === 'string')
        .map((view): ViewMeta => ({
          id: view.id,
          name: view.name || translate(getLanguage(), 'default.untitledView'),
          // Old records have no type field and are treated as ordinary views; only explicit subgraphs enter the subgraph list.
          type: view.type === 'subgraph' ? 'subgraph' : 'view',
          updatedAt: view.updatedAt ?? 0,
        }))
        .sort((a, b) => b.updatedAt - a.updatedAt)
      resolve(views)
    }
    request.onerror = () => reject(request.error)
  })
}

/**
 * Read every standalone subgraph file as a canvas preview source.
 *
 * Canvas never reads storage; the application pushes this map once at boot and
 * refreshes individual entries when a subgraph file is saved or deleted.
 */
export async function loadSubgraphSources(): Promise<Record<string, JsonGraph>> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(VIEW_STORE, 'readonly')
    const request = tx.objectStore(VIEW_STORE).getAll()
    request.onsuccess = () => {
      const sources: Record<string, JsonGraph> = {}
      for (const view of request.result as ViewRecord[]) {
        if (!view || view.type !== 'subgraph' || !view.data || typeof view.id !== 'string') continue
        sources[view.id] = view.data
      }
      resolve(sources)
    }
    request.onerror = () => reject(request.error)
  })
}

/** Read one view's workflow data; return null when the view does not exist. */
export async function loadView(id: string): Promise<JsonGraph | null> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(VIEW_STORE, 'readonly')
    const request = tx.objectStore(VIEW_STORE).get(id)
    request.onsuccess = () => resolve(request.result?.data ?? null)
    request.onerror = () => reject(request.error)
  })
}

/** One persisted preview row; the canvas-owned payload stays opaque to this module. */
type PreviewRecord = {
  targetId: string
  preview: CachedSubgraphPreview
}

/** Load persisted card previews; a cache failure must not block startup. */
async function loadCachedPreviews(): Promise<Record<string, CachedSubgraphPreview>> {
  const db = await openDB()
  return new Promise((resolve) => {
    const tx = db.transaction(PREVIEW_STORE, 'readonly')
    const request = tx.objectStore(PREVIEW_STORE).getAll()
    request.onsuccess = () => {
      const entries: Record<string, CachedSubgraphPreview> = {}
      for (const row of request.result as PreviewRecord[]) {
        if (row && typeof row.targetId === 'string' && row.preview) entries[row.targetId] = row.preview
      }
      resolve(entries)
    }
    request.onerror = () => resolve({})
  })
}

/** Persist one rendered preview; failures are ignored because the canvas can render again. */
async function saveCachedPreview(targetId: string, preview: CachedSubgraphPreview): Promise<void> {
  const db = await openDB()
  await new Promise<void>((resolve) => {
    const tx = db.transaction(PREVIEW_STORE, 'readwrite')
    tx.objectStore(PREVIEW_STORE).put({ targetId, preview } satisfies PreviewRecord)
    tx.oncomplete = () => resolve()
    tx.onerror = () => resolve()
    tx.onabort = () => resolve()
  })
}

/** Drop one file's cached preview. */
async function removeCachedPreview(targetId: string): Promise<void> {
  const db = await openDB()
  await new Promise<void>((resolve) => {
    const tx = db.transaction(PREVIEW_STORE, 'readwrite')
    tx.objectStore(PREVIEW_STORE).delete(targetId)
    tx.oncomplete = () => resolve()
    tx.onerror = () => resolve()
    tx.onabort = () => resolve()
  })
}

/** Application-owned persistence for subgraph card previews. */
export function createPreviewCacheAdapter(): SubgraphPreviewCacheAdapter {
  return {
    load: loadCachedPreviews,
    save(targetId, preview) {
      return saveCachedPreview(targetId, preview).catch(() => {})
    },
    remove(targetId) {
      return removeCachedPreview(targetId).catch(() => {})
    },
  }
}

/** Write (or overwrite) a view. */
export async function saveView(view: ViewRecord): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(VIEW_STORE, 'readwrite')
    tx.objectStore(VIEW_STORE).put(view)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })
}

/**
 * Change only the view name, keeping graph data and updatedAt unchanged.
 *
 * View records are overwritten whole. Reading first and then writing back a separate name update
 * could let autosave restore the old name between the steps, so read and write in the same transaction.
 * Do not change `updatedAt`; renaming should not move a view to the top of the list.
 */
export async function renameView(id: string, name: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(VIEW_STORE, 'readwrite')
    const store = tx.objectStore(VIEW_STORE)
    const request = store.get(id)
    let missing = false
    request.onsuccess = () => {
      const view = request.result as ViewRecord | undefined
      // Treat a deleted view as failure so the in-memory name and storage stay consistent.
      if (!view) {
        missing = true
        return
      }
      store.put({ ...view, name })
    }
    request.onerror = () => reject(request.error)
    tx.oncomplete = () =>
      missing ? reject(new Error(translate(getLanguage(), 'error.missingView'))) : resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })
}

/** Delete a view and its cached card preview. */
export async function deleteView(id: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction([VIEW_STORE, PREVIEW_STORE], 'readwrite')
    tx.objectStore(VIEW_STORE).delete(id)
    tx.objectStore(PREVIEW_STORE).delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })
}
