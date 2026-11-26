import { defineExecutor, defineService } from '@lyx-pj/primflow-engine'
import { appendBusinessLog } from '../debug'
import { Print } from '../nodes/Print'

/**
 * Executors that run outside the node package.
 *
 * A node declares only its ports and names the executor it needs. The
 * implementation lives here, so the node definition can be published to a
 * frontend while the behavior stays on the backend.
 */

/** Format business node output so object logs do not degrade to [object Object]. */
function describeValue(value: unknown) {
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value) ?? String(value)
  } catch {
    return String(value)
  }
}

export const businessLog = defineService('businessLog', { value: appendBusinessLog })

/** Write a value to the console and the business log, then publish it downstream. */
export const printExecutor = defineExecutor(Print, ({ getInput, setOutput, next, taskId, services }) => {
  const message = getInput('message')
  console.log(message)
  // Business output joins the engine log of the same task as one application line.
  const businessLog = services.require('businessLog')
  businessLog(taskId, describeValue(message))
  setOutput('result', message)
  next(['done'])
}, { services: [businessLog] })
