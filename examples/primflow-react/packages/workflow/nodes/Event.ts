import { defineNode, type NodeLifecycleContext } from '@lyx-pj/primflow-model'
import { localize } from '../i18n'
import { headerStyle } from './theme'

const style = headerStyle('events')

/**
 * Emit Event: emits a business event in the current execution flow.
 * The event creates a separate task; this node does not wait for listeners and continues its own downstream.
 */
export const EmitEvent = defineNode({
  get definition() {
    return {
      name: localize('Emit Event', '发送事件'),
      inputs: [
        { name: 'exec', type: 'exec' },
        { name: 'event', type: 'string', label: localize('Event', '事件') },
        { name: 'payload', type: 'any', label: localize('Payload', '数据') },
      ] as const,
      outputs: [
        { name: 'exec', type: 'exec' },
        { name: 'payload', type: 'any', label: localize('Payload', '数据') },
      ] as const,
      style,
    } as const
  },

  executor: ({ getInput, setOutput, emitEvent, next }) => {
    const eventName = (getInput<string>('event') ?? '').trim()
    if (!eventName) throw new Error(localize('Emit Event requires an event name', '发送事件需要配置事件名'))
    const payload = getInput('payload')
    emitEvent(eventName, payload)
    // Also pass event data downstream so the emitter can join an ordinary execution chain.
    setOutput('payload', payload)
    next()
  },
})

/**
 * On Event: has no execution entry and subscribes to business events through lifecycle hooks at session start.
 * Each event maps to a separate task; the handler writes outputs with that task's context and advances downstream.
 */
export const OnEvent = defineNode({
  get definition() {
    return {
      executionMode: 'source' as const,
      name: localize('On Event', '监听事件'),
      inputs: [{ name: 'event', type: 'string', label: localize('Event', '事件') }] as const,
      outputs: [
        { name: 'exec', type: 'exec' },
        { name: 'payload', type: 'any', label: localize('Payload', '数据') },
        { name: 'count', type: 'number', label: localize('Count', '次数') },
      ] as const,
      style,
    } as const
  },

  onActive: (ctx: NodeLifecycleContext) => {
    const eventName = (ctx.getInput<string>('event') ?? '').trim()
    if (!eventName) return
    ctx.nodeState.count = 0
    ctx.nodeState.eventName = eventName

    ctx.nodeState.unsubscribe = ctx.on(eventName, async (task, ...payload) => {
      const count = Number(ctx.nodeState.count ?? 0) + 1
      ctx.nodeState.count = count
      task.setOutput('payload', payload.length > 1 ? payload : (payload[0] ?? null))
      task.setOutput('count', count)
      await task.next()
    })
  },

  onDeactivate: (ctx: NodeLifecycleContext) => {
    if (typeof ctx.nodeState.unsubscribe === 'function') ctx.nodeState.unsubscribe()
    delete ctx.nodeState.unsubscribe
  },

  onDestroy: (ctx: NodeLifecycleContext) => {
    delete ctx.nodeState.count
    delete ctx.nodeState.eventName
  },
})
