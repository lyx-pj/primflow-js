import type { NodeClassType } from '@lyx-pj/primflow-model'
import { ExecutionTask } from './ExecutionTask'
import type { TaskTraceOptions } from './types'
import type { TaskDefinition } from './types'

/** Bounded task history; evict only finished tasks. */
export class TaskRegistry<NodeDefs extends Record<string, NodeClassType>> {
  private tasks = new Map<string, ExecutionTask<NodeDefs>>()
  private sequence = 0
  latestId?: string

  create(definition: Omit<TaskDefinition, 'id'>, trace: false | Required<TaskTraceOptions>, notify: (event: string, ...payload: unknown[]) => void) {
    const task = new ExecutionTask<NodeDefs>({ ...definition, id: `task_${++this.sequence}` }, trace, notify)
    this.tasks.set(task.id, task)
    this.latestId = task.id
    return task
  }

  get(id = this.latestId) {
    return id ? this.tasks.get(id) : undefined
  }
  list() {
    return [...this.tasks.values()].map((task) => task.snapshot())
  }
  values() {
    return this.tasks.values()
  }

  prune(limit: number) {
    const finished = [...this.tasks.values()]
      .filter((task) => ['completed', 'failed', 'cancelled'].includes(task.status))
      .sort((a, b) => (a.endedAt ?? 0) - (b.endedAt ?? 0))
    for (const task of finished.slice(0, Math.max(0, finished.length - limit))) {
      this.tasks.delete(task.id)
      task.stop()
    }
  }
}
