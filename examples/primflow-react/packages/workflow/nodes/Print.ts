import { Node } from '@lyx-pj/primflow-model'
import type { ExecutorFn } from '@lyx-pj/primflow-engine'
import { appendDebugLog, describeDebugValue } from '../debug'
import { localize } from '../i18n'

export class Print extends Node {
  static get definition() {
    return {
      type: 'default',
      title: localize('Debug Output', '调试输出'),
      inputs: [
        { name: 'exec', type: 'exec' },
        { name: 'message', type: 'any', label: localize('Content', '内容') },
      ] as const,
      outputs: [
        { name: 'done', type: 'exec' },
        { name: 'result', type: 'any', label: localize('Content', '内容') },
      ] as const,
      style: {
        header: { background: '#4c647b', color: '#fff' },
      },
    } as const
  }

  static executor: ExecutorFn = ({ getInput, setOutput, next, taskId }) => {
    const message = getInput('message')
    console.log(message)
    appendDebugLog(describeDebugValue(message), { taskId })
    setOutput('result', message)
    next(['done'])
  }
}
