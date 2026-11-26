import type { JsonValue, NodeExecutionContext } from '@lyx-pj/primflow-model'
import type { TaskInterrupt } from './types'

type InterruptScope = Omit<TaskInterrupt, 'id' | 'value'>
export type InterruptActivation = {
  request: NodeExecutionContext['interrupt']
  close: () => void
}

/** Reply handles belong to the scheduler. Closing an activation retires its outstanding requests. */
export class TaskInterrupts {
  private sequence = 0
  private pending = new Map<string, { info: TaskInterrupt; respond: (answer: JsonValue) => void }>()
  private readonly taskId: string
  private readonly changed: (nodeId: string, delta: number) => void
  private readonly record: (id: string, activationId: number | undefined, status: 'requested' | 'resumed' | 'cancelled') => void

  constructor(taskId: string, changed: (nodeId: string, delta: number) => void, record: TaskInterrupts['record']) {
    this.taskId = taskId
    this.changed = changed
    this.record = record
  }

  list() {
    return [...this.pending.values()].map(({ info }) => info)
  }

  resume(id: string, answer: JsonValue) {
    const entry = this.pending.get(id)
    if (!entry) return false
    entry.respond(structuredClone(answer))
    return true
  }

  activate(scope: InterruptScope, signal: AbortSignal, isActive: () => boolean, activationId?: number): InterruptActivation {
    const cancellations = new Set<() => void>()
    const closeReason = () => signal.reason ?? new Error('Node activation ended before the interrupt was resumed.')
    return {
      request: (value) => {
        if (!isActive() || signal.aborted) throw closeReason()
        const id = `${this.taskId}:interrupt_${++this.sequence}`
        const info = { ...structuredClone(scope), id, value: structuredClone(value) }
        let resolve!: (answer: JsonValue) => void
        let reject!: (reason: unknown) => void
        const promise = new Promise<JsonValue>((accept, decline) => {
          resolve = accept
          reject = decline
        })
        const retire = () => {
          if (!this.pending.delete(id)) return false
          cancellations.delete(cancel)
          signal.removeEventListener('abort', cancel)
          return true
        }
        const cancel = () => {
          if (!retire()) return
          this.record(id, activationId, 'cancelled')
          reject(closeReason())
          this.changed(scope.nodeId, -1)
        }
        this.pending.set(id, { info, respond: (answer) => {
          if (!retire()) return
          this.record(id, activationId, 'resumed')
          resolve(answer)
          this.changed(scope.nodeId, -1)
        } })
        cancellations.add(cancel)
        signal.addEventListener('abort', cancel, { once: true })
        void promise.catch(() => {})
        this.record(id, activationId, 'requested')
        this.changed(scope.nodeId, 1)
        return promise
      },
      close: () => { for (const cancel of cancellations) cancel() },
    }
  }
}
