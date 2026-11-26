import type { JsonValue, StateValues, TaskState, TaskStateSnapshot } from '@lyx-pj/primflow-model'
import type { StateDefinition, StateField, TaskStateCommit } from './types'

type StateChanges = Omit<TaskStateCommit, 'nodeId'>

export type TaskStateActivation = {
  state: TaskState
  commit: () => void
  discard: () => void
}

function invalidJson(key: string) {
  return new TypeError(`State field "${key}" must contain a JSON value.`)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

function copyValue(value: unknown, key: string, ancestors = new Set<object>()): JsonValue {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return value
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value !== 'object' || ancestors.has(value)) throw invalidJson(key)
  ancestors.add(value)
  let copy: JsonValue
  if (Array.isArray(value)) {
    copy = Object.freeze(Array.from(value, (item: unknown) => copyValue(item, key, ancestors)))
  } else if (isRecord(value)) {
    copy = Object.freeze(Object.fromEntries(Object.entries(value).map(([name, item]) => [name, copyValue(item, key, ancestors)])))
  } else {
    throw invalidJson(key)
  }
  ancestors.delete(value)
  return copy
}

function copyFields(value: unknown): Array<[string, JsonValue]> {
  if (!isRecord(value)) throw new TypeError('Task state must be a JSON object.')
  return Object.entries(value).map(([key, item]) => [key, copyValue(item, key)])
}

/** The task owns committed versions; each node activation owns its pending updates. */
export class TaskStateStore {
  private fields = new Map<string, StateField>()
  private revisions = new Map<string, number>()
  private current: TaskStateSnapshot
  private captureUpdates?: (updates: Array<[string, JsonValue]>) => void

  constructor(definition: StateDefinition = {}, initialState: StateValues = {}) {
    const values = new Map<string, JsonValue>()
    for (const [key, field] of Object.entries(definition)) {
      this.fields.set(key, { ...field })
      if (field.initial !== undefined) values.set(key, copyValue(field.initial, key))
    }
    for (const [key, value] of copyFields(initialState)) values.set(key, value)
    for (const [key, value] of values) this.validate(key, value)
    this.current = Object.freeze({ version: 0, values: Object.freeze(Object.fromEntries(values)) })
  }

  /** Read the frozen version for an internal activation. */
  readSnapshot(): TaskStateSnapshot {
    return this.current
  }

  snapshot(): TaskStateSnapshot {
    return structuredClone(this.current)
  }

  /** Stage replay updates with the same field rules until the entire replay succeeds. */
  stage() {
    const version = this.current.version
    const store = new TaskStateStore()
    store.fields = this.fields
    store.current = this.current
    store.revisions = new Map(this.revisions)
    const updates: Array<[string, JsonValue]> = []
    store.captureUpdates = (batch) => updates.push(...batch)
    return {
      store,
      commit: () => updates.length ? this.apply(updates, version, new Map()) : undefined,
    }
  }

  activate(isActive: () => boolean, notify: (changes: StateChanges) => void, canUpdate = isActive): TaskStateActivation {
    const snapshot = this.current
    const ownRevisions = new Map<string, number>()
    const pending: Array<[string, JsonValue]> = []
    let discarded = false
    let failure: { error: unknown } | undefined
    return {
      state: {
        get: (key) => Object.hasOwn(snapshot.values, key) ? snapshot.values[key] : undefined,
        snapshot: () => snapshot,
        update: (patch) => {
          if (!discarded && canUpdate()) pending.push(...copyFields(patch))
        },
      },
      commit: () => {
        if (!isActive()) {
          pending.length = 0
          return
        }
        if (failure) throw failure.error
        if (discarded || !pending.length) return
        const updates = pending.splice(0)
        let commit: StateChanges
        try {
          commit = this.apply(updates, snapshot.version, ownRevisions)
        } catch (error) {
          discarded = true
          failure = { error }
          throw error
        }
        for (const [key] of updates) ownRevisions.set(key, commit.version)
        notify(commit)
      },
      discard: () => {
        pending.length = 0
        discarded = true
      },
    }
  }

  private validate(key: string, value: JsonValue) {
    const validate = this.fields.get(key)?.validate
    if (validate && !validate(value)) throw new TypeError(`State field "${key}" did not pass validation.`)
  }

  private apply(updates: Array<[string, JsonValue]>, version: number, ownRevisions: ReadonlyMap<string, number>): StateChanges {
    const values = new Map(Object.entries(this.current.values))
    const changes = new Map<string, JsonValue>()
    for (const [key, update] of updates) {
      const reducer = this.fields.get(key)?.reducer
      const revision = this.revisions.get(key) ?? 0
      if (!reducer && revision > (ownRevisions.get(key) ?? version)) {
        throw new Error(`State conflict on field "${key}".`)
      }
      const value = reducer ? copyValue(reducer(values.get(key), update), key) : update
      this.validate(key, value)
      values.set(key, value)
      changes.set(key, value)
    }
    this.captureUpdates?.(updates)
    const nextVersion = this.current.version + 1
    this.current = Object.freeze({ version: nextVersion, values: Object.freeze(Object.fromEntries(values)) })
    for (const key of changes.keys()) this.revisions.set(key, nextVersion)
    return { version: nextVersion, changes: Object.freeze(Object.fromEntries(changes)) }
  }
}
