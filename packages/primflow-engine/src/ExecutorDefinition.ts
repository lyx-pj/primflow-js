import type {
  AnyServiceMap, ExecutorFn, NodeClassType, NodeExecutionContext, NodePortValue, OutputPort, PortType, ServiceMap, StreamType, StreamWriter,
} from '@lyx-pj/primflow-model'
import type { ServiceDefinition, ServiceValues } from './ServiceDefinition'

type DataPort<P extends OutputPort<PortType>> = Exclude<P, { type: 'exec' | 'spacer' | StreamType }>
type DataPortValue<P extends OutputPort<PortType>, K extends string> = NodePortValue<Extract<P, { name: K }>['type']>

type StreamPort<P> = Extract<P, { type: StreamType }>
type StreamItem<P, K extends string> = Extract<P, { name: K }> extends { type: StreamType<infer T> } ? T : never

/** The usual execution context with data and execution ports inferred from the node. */
export type TypedExecutorContext<
  N extends NodeClassType,
  S extends ServiceMap = AnyServiceMap,
  I extends OutputPort<PortType> = N['definition']['inputs'][number],
  O extends OutputPort<PortType> = N['definition']['outputs'][number],
> = Omit<NodeExecutionContext<S>, 'getInput' | 'setOutput' | 'getStream' | 'openStream' | 'next'> & {
  getInput: string extends I['name'] ? NodeExecutionContext<S>['getInput'] :
    <K extends DataPort<I>['name']>(name: K) => DataPortValue<I, K> | undefined
  setOutput: string extends O['name'] ? NodeExecutionContext<S>['setOutput'] :
    <K extends DataPort<O>['name']>(name: K, value: DataPortValue<O, NoInfer<K>>) => void
  getStream: string extends I['name'] ? NodeExecutionContext<S>['getStream'] :
    <K extends StreamPort<I>['name']>(name: K) => AsyncIterable<StreamItem<I, K>>
  openStream: string extends O['name'] ? NodeExecutionContext<S>['openStream'] :
    <K extends StreamPort<O>['name']>(name: K) => StreamWriter<StreamItem<O, K>>
  next: string extends O['name'] ? NodeExecutionContext<S>['next'] :
    (branches?: Array<Extract<O, { type: 'exec' }>['name']>) => void | Promise<void>
}

export type ExecutorDefinition<Name extends string = string> = {
  readonly name: Name
  readonly execute: ExecutorFn
  readonly services?: readonly ServiceDefinition[]
}

/** Bind an executor implementation to a node that declares an executor name. */
export function defineExecutor<
  N extends NodeClassType,
  const Name extends string,
  const D extends readonly ServiceDefinition[] = readonly [],
>(
  node: N & { readonly executor: Name },
  execute: (context: TypedExecutorContext<N, ServiceValues<D>>) => void | Promise<void>,
  options?: { services: D },
): ExecutorDefinition<Name> {
  return {
    name: node.executor,
    execute: execute as ExecutorFn,
    services: options?.services ?? [],
  }
}
