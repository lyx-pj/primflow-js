import { vi } from 'vitest'
import type { ViewMeta, ViewRecord } from '../packages/workflow/storage'

const records = new Map<string, ViewRecord>()

function toMeta(view: ViewRecord): ViewMeta {
  return {
    id: view.id,
    name: view.name,
    type: view.type === 'subgraph' ? 'subgraph' : 'view',
    updatedAt: view.updatedAt,
  }
}

/** In-memory storage for testing view orchestration without IndexedDB. */
export const fakeStorage = {
  listViews: vi.fn(async (): Promise<ViewMeta[]> =>
    [...records.values()].map(toMeta).sort((a, b) => b.updatedAt - a.updatedAt),
  ),
  loadView: vi.fn(async (id: string) => records.get(id)?.data ?? null),
  saveView: vi.fn(async (view: ViewRecord) => {
    records.set(view.id, view)
  }),
  renameView: vi.fn(async (id: string, name: string) => {
    const view = records.get(id)
    if (!view) throw new Error('视图不存在')
    // Match real storage: change only the name, preserving graph data and updatedAt.
    records.set(id, { ...view, name })
  }),
  deleteView: vi.fn(async (id: string) => {
    records.delete(id)
  }),
}

/** Seed a record to simulate an existing view; tests without a type treat it as an ordinary view. */
export function seedView(view: ViewRecord) {
  records.set(view.id, { ...view, type: view.type === 'subgraph' ? 'subgraph' : 'view' })
}

/** Clear records before each case so tests do not affect each other. */
export function resetFakeStorage() {
  records.clear()
  fakeStorage.listViews.mockClear()
  fakeStorage.loadView.mockClear()
  fakeStorage.saveView.mockClear()
  fakeStorage.renameView.mockClear()
  fakeStorage.deleteView.mockClear()
}
