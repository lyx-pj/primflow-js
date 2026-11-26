import { useEffect, useId, useState } from 'react'
import { translate, useEngine, type AppLanguage } from '../../packages/workflow'
import { MANUAL_APPROVAL_KIND } from '../../packages/workflow/nodes/Execution'

type ApprovalRequest = { taskId: string; id: string; prompt: string }

export function ApprovalPanel({ language }: { language: AppLanguage }) {
  const engine = useEngine()
  const panelId = useId()
  const [requests, setRequests] = useState<ApprovalRequest[]>([])

  useEffect(() => {
    const sync = () => {
      const pending: ApprovalRequest[] = []
      for (const task of engine.getTasks()) {
        for (const { id, value } of task.interrupts) {
          if (!value || typeof value !== 'object' || !('kind' in value) || value.kind !== MANUAL_APPROVAL_KIND) continue
          if ('prompt' in value && typeof value.prompt === 'string') pending.push({ taskId: task.id, id, prompt: value.prompt })
        }
      }
      setRequests(pending)
    }
    engine.on('task:changed', sync)
    sync()
    return () => { engine.off('task:changed', sync) }
  }, [engine])

  if (!requests.length) return null
  return (
    <aside className="workflow-approvals" aria-labelledby={panelId}>
      <h2 id={panelId} className="text-sm font-semibold text-violet-200">
        {translate(language, 'approval.pending')}
      </h2>
      {requests.map(({ taskId, id, prompt }) => (
        <div key={id} role="group" aria-labelledby={`${panelId}-${id}`} className="mt-3 border-t border-white/10 pt-3">
          <p id={`${panelId}-${id}`} className="mb-3 whitespace-pre-wrap break-words text-sm">
            {prompt || translate(language, 'approval.question')}
          </p>
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" className="workflow-approval-button" onClick={() => engine.resumeInterrupt(taskId, id, false)}>
              {translate(language, 'approval.reject')}
            </button>
            <button type="button" className="workflow-approval-button workflow-approval-button--primary" onClick={() => engine.resumeInterrupt(taskId, id, true)}>
              {translate(language, 'approval.approve')}
            </button>
          </div>
        </div>
      ))}
    </aside>
  )
}
