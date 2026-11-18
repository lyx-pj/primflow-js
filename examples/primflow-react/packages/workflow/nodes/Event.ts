import { Node, type NodeLifecycleContext } from '@lyx-pj/primflow-model'
import type { ExecutorFn } from '@lyx-pj/primflow-engine'
import { localize } from '../i18n'

const style = { header: { background: '#7a4b9e', color: '#fff' } }

/**
 * Event Emit: emits a business event in the current execution flow.
 * The event creates a separate task; this node does not wait for listeners and continues its own downstream.
 */
export class EventTrigger extends Node {
  static get definition() {
    return {
      title: localize('Event Emit', '事件触发'),
      inputs: [
        { name: 'exec', type: 'exec' },
        { name: 'event', type: 'string', label: localize('Event name', '事件名') },
        { name: 'payload', type: 'any', label: localize('Event data', '事件数据') },
      ] as const,
      outputs: [
        { name: 'exec', type: 'exec' },
        { name: 'payload', type: 'any', label: localize('Event data', '事件数据') },
      ] as const,
      style,
    } as const
  }

  static executor: ExecutorFn = ({ getInput, setOutput, emitEvent, next }) => {
    const eventName = (getInput<string>('event') ?? '').trim()
    if (!eventName) throw new Error(localize('Event Emit requires an event name', '事件触发需要配置事件名'))
    const payload = getInput('payload')
    emitEvent(eventName, payload)
    // Also pass event data downstream so the trigger node can join an ordinary execution chain.
    setOutput('payload', payload)
    next()
  }
}

/**
 * Event Listen: has no execution entry and subscribes to business events through lifecycle hooks at session start.
 * Each event maps to a separate task; the handler writes outputs with that task's context and advances downstream.
 */
export class EventListener extends Node {
  static get definition() {
    return {
      executionMode: 'source' as const,
      title: localize('Event Listen', '事件监听'),
      inputs: [{ name: 'event', type: 'string', label: localize('Listen event', '监听事件') }] as const,
      outputs: [
        { name: 'exec', type: 'exec' },
        { name: 'payload', type: 'any', label: localize('Event data', '事件数据') },
        { name: 'count', type: 'number', label: localize('Received count', '收到次数') },
      ] as const,
      style,
    } as const
  }

  static onActive = (ctx: NodeLifecycleContext) => {
    const eventName = (ctx.getInput<string>('event') ?? '').trim()
    if (!eventName) return
    ctx.state.count = 0
    ctx.state.eventName = eventName
    ctx.state.unsubscribe = ctx.onEvent(eventName, async (task, ...payload) => {
      const count = Number(ctx.state.count ?? 0) + 1
      ctx.state.count = count
      task.setOutput('payload', payload.length > 1 ? payload : (payload[0] ?? null))
      task.setOutput('count', count)
      await task.next()
    })
  }

  static onDeactivate = (ctx: NodeLifecycleContext) => {
    if (typeof ctx.state.unsubscribe === 'function') ctx.state.unsubscribe()
    delete ctx.state.unsubscribe
  }

  static onDestroy = (ctx: NodeLifecycleContext) => {
    delete ctx.state.count
    delete ctx.state.eventName
  }
}
