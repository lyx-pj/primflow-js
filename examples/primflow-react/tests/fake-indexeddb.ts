// jsdom has no IndexedDB; provide a minimal implementation covering only the example storage layer:
// open / upgrade / transaction / store get, getAll, put, delete.

type Handler = ((event?: unknown) => void) | null
type StoreRecord = Record<string, unknown>

class FakeRequest<T = unknown> {
  onsuccess: Handler = null
  onerror: Handler = null
  result: T | undefined = undefined
  error: unknown = null
  transaction: FakeTransaction | null = null
}

type FakeStore = {
  keyPath: string
  records: Map<string, StoreRecord>
}

class FakeObjectStore {
  constructor(
    private readonly tx: FakeTransaction,
    private readonly name: string,
  ) {}

  private get store(): FakeStore | undefined {
    return this.tx.db.stores.get(this.name)
  }

  get(key: string) {
    const request = new FakeRequest<StoreRecord | undefined>()
    request.transaction = this.tx
    this.tx.pending += 1
    queueMicrotask(() => {
      const record = this.store?.records.get(key)
      request.result = record ? structuredClone(record) : undefined
      request.onsuccess?.({ target: request })
      this.tx.settle()
    })
    return request
  }

  getAll() {
    const request = new FakeRequest<StoreRecord[]>()
    request.transaction = this.tx
    this.tx.pending += 1
    queueMicrotask(() => {
      request.result = [...(this.store?.records.values() ?? [])].map((record) => structuredClone(record))
      request.onsuccess?.({ target: request })
      this.tx.settle()
    })
    return request
  }

  put(record: StoreRecord) {
    const request = new FakeRequest<string>()
    request.transaction = this.tx
    this.tx.pending += 1
    queueMicrotask(() => {
      const store = this.store
      if (!store) {
        request.error = new Error(`仓库不存在：${this.name}`)
        request.onerror?.({ target: request })
        this.tx.settle()
        return
      }
      const key = String(record[store.keyPath])
      store.records.set(key, structuredClone(record))
      request.result = key
      request.onsuccess?.({ target: request })
      this.tx.settle()
    })
    return request
  }

  delete(key: string) {
    const request = new FakeRequest<undefined>()
    request.transaction = this.tx
    this.tx.pending += 1
    queueMicrotask(() => {
      this.store?.records.delete(key)
      request.onsuccess?.({ target: request })
      this.tx.settle()
    })
    return request
  }
}

class FakeTransaction {
  oncomplete: Handler = null
  onerror: Handler = null
  onabort: Handler = null
  error: unknown = null
  pending = 0
  private done = false

  constructor(
    readonly db: FakeDatabase,
    readonly mode: string,
  ) {}

  objectStore(name: string) {
    return new FakeObjectStore(this, name)
  }

  settle() {
    this.pending -= 1
    this.maybeComplete()
  }

  maybeComplete() {
    if (this.done || this.pending > 0) return
    this.done = true
    queueMicrotask(() => this.oncomplete?.({ target: this }))
  }
}

class FakeDatabase {
  version: number
  stores: Map<string, FakeStore> = new Map()
  objectStoreNames = {
    contains: (name: string) => this.stores.has(name),
  }

  constructor(version: number) {
    this.version = version
  }

  createObjectStore(name: string, options?: { keyPath?: string }) {
    this.stores.set(name, { keyPath: options?.keyPath ?? 'id', records: new Map() })
    return { name, keyPath: options?.keyPath ?? 'id' }
  }

  deleteObjectStore(name: string) {
    this.stores.delete(name)
  }

  transaction(_names: string | string[], mode = 'readonly') {
    return new FakeTransaction(this, mode)
  }
}

export type FakeIndexedDB = {
  install: () => void
  seed: (name: string, version: number, stores: Record<string, StoreRecord[]>) => void
  databases: Map<string, FakeDatabase>
}

/** Create a fake installable on window.indexedDB. */
export function createFakeIndexedDB(): FakeIndexedDB {
  const databases = new Map<string, FakeDatabase>()

  function open(name: string, version: number) {
    const request = new FakeRequest<FakeDatabase>()
    queueMicrotask(() => {
      let db = databases.get(name)
      if (!db) {
        db = new FakeDatabase(0)
        databases.set(name, db)
      }
      request.result = db
      if (version > db.version) {
        db.version = version
        const tx = new FakeTransaction(db, 'versionchange')
        request.transaction = tx
        request.onupgradeneeded?.({ target: request })
        tx.oncomplete = () => request.onsuccess?.({ target: request })
        tx.maybeComplete()
        return
      }
      request.onsuccess?.({ target: request })
    })
    return request
  }

  return {
    databases,
    install() {
      Object.defineProperty(window, 'indexedDB', { value: { open }, configurable: true })
    },
    seed(name, version, stores) {
      const db = new FakeDatabase(version)
      for (const [storeName, records] of Object.entries(stores)) {
        const store: FakeStore = { keyPath: 'id', records: new Map() }
        for (const record of records) store.records.set(String(record.id), structuredClone(record))
        db.stores.set(storeName, store)
      }
      databases.set(name, db)
    },
  }
}
