import type { JsonGraph, NodeExecutionStatus, LoopScope } from '@lyx-pj/workflow-model'

export interface ProcessOptions {
  ctx?: unknown
  debug?: boolean
  /** Maximum retained finished tasks; active tasks are never evicted. */
  maxTaskHistory?: number
  /** Engine hard limits; node configuration may only lower them. */
  maxLoopIterations?: number
  maxNodeActivations?: number
  maxLoopDepth?: number
  maxLoopIterationHistory?: number
}

export type EngineStatus = 'idle' | 'running' | 'paused' | 'stopped'
export type TaskStatus = 'running' | 'waiting' | 'paused' | 'completed' | 'failed' | 'cancelled'
export interface BreakpointHit {
  nodeId: string
  nodeType: string
  subgraphId: string
  inputs: Record<string, unknown>
  frameId?: string
  loop?: LoopScope
}
export interface TaskSnapshot {
  id: string
  parentTaskId?: string
  trigger: { type: 'start' | 'event'; eventName?: string; payload?: unknown[] }
  status: TaskStatus
  startedAt: number
  endedAt?: number
  pausedNode: BreakpointHit | null
  errors: { nodeId: string; message: string; frameId?: string; loop?: LoopScope }[]
}
export type LoopInvocationSnapshot = {
  invocationId: string
  loopNodeId: string
  parentFrameId?: string
  status: 'running' | 'completed' | 'failed' | 'cancelled'
  iterations: number
  state?: unknown
  result?: unknown
  reason?: 'break' | 'limit'
  error?: string
}
export type LoopIterationSnapshot = {
  frameId: string
  graphId: string
  loop: LoopScope
  status: 'running' | 'completed' | 'failed' | 'cancelled'
  state?: unknown
  result?: unknown
  error?: string
}
export type NodeExecutionData = { inputs: Record<string, unknown>; outputs: Record<string, unknown> }
export type EngineEventPayloads = {
  [eventName: string]: unknown[]
  'status:changed': [status: EngineStatus]
  'breakpoint:hit': [breakpoint: BreakpointHit]
  'node:error': [error: unknown, nodeId: string]
  'node:status:changed': [nodeId: string, status: NodeExecutionStatus]
  'task:created': [task: TaskSnapshot]
  'task:changed': [task: TaskSnapshot]
  'task:node:status:changed': [taskId: string, nodeId: string, status: NodeExecutionStatus]
  'task:breakpoint:hit': [taskId: string, breakpoint: BreakpointHit]
  'task:error': [taskId: string, error: unknown, nodeId: string]
  'loop:started': [taskId: string, invocation: LoopInvocationSnapshot]
  'loop:iteration:started': [taskId: string, iteration: LoopIterationSnapshot]
  'loop:iteration:completed': [taskId: string, iteration: LoopIterationSnapshot]
  'loop:finished': [taskId: string, invocation: LoopInvocationSnapshot]
}
export type TaskDefinition = {
  id: string
  parentTaskId?: string
  trigger: TaskSnapshot['trigger']
  json: JsonGraph
}
