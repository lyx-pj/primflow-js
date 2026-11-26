export type JsonValue = null | boolean | number | string | readonly JsonValue[] | { readonly [key: string]: JsonValue }
export type StateValues = Record<string, JsonValue>
type ReadonlyState<T> = JsonValue extends T ? T : T extends object ? { readonly [K in keyof T]: ReadonlyState<T[K]> } : T

export type TaskStateSnapshot<S extends StateValues = StateValues> = {
  readonly version: number
  readonly values: ReadonlyState<S>
}

/** Read the activation's starting snapshot and stage updates for its next handoff or successful return. */
export interface TaskState<S extends StateValues = StateValues> {
  get<K extends keyof S & string>(key: K): ReadonlyState<S[K]> | undefined
  snapshot(): TaskStateSnapshot<S>
  update(patch: Partial<S>): void
}
