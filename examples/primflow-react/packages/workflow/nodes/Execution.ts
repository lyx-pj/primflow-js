import { defineNode } from '@lyx-pj/primflow-model'
import { localize } from '../i18n'

export const MANUAL_APPROVAL_KIND = 'manual-approval'

export const ManualApproval = defineNode({
  get definition() {
    return {
      name: localize('Manual Approval', '人工审批'),
      inputs: [
        { name: 'exec', type: 'exec' },
        { name: 'prompt', type: 'string', label: localize('Prompt', '审批提示') },
      ] as const,
      outputs: [
        { name: 'approved', type: 'exec', label: localize('Approved', '通过') },
        { name: 'rejected', type: 'exec', label: localize('Rejected', '拒绝') },
        { name: 'decision', type: 'boolean', label: localize('Decision', '审批结果') },
      ] as const,
      style: { header: { background: '#634489', color: '#fff' } },
    } as const
  },

  executor: async ({ getInput, interrupt, setOutput, next }) => {
    const prompt = String(getInput('prompt') ?? '').trim()
    const approved = (await interrupt({ kind: MANUAL_APPROVAL_KIND, prompt })) === true
    setOutput('decision', approved)
    return next([approved ? 'approved' : 'rejected'])
  },
})

export const ThrowError = defineNode({
  get definition() {
    return {
      name: localize('Throw Error', '抛出错误'),
      inputs: [
        { name: 'exec', type: 'exec' },
        { name: 'message', type: 'string', label: localize('Message', '错误消息') },
      ] as const,
      outputs: [] as const,
      style: { header: { background: '#863d48', color: '#fff' } },
    } as const
  },

  executor: ({ getInput }) => {
    const message = String(getInput('message') ?? '').trim()
    throw new Error(message || localize('Intentional workflow error', '工作流主动抛出错误'))
  },
})
