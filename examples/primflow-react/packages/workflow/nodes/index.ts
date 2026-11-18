import { NodeRegistry } from '@lyx-pj/primflow-model'
import { Runtime } from '@lyx-pj/primflow-engine'
import { IF } from './IF'
import { Switch } from './Switch'
import { Print } from './Print'
import { Concat } from './Concat'
import { TextInput, NumberInput, BooleanInput } from './Input'
import { TextTemplate, TextSplit } from './Text'
import { MathOperation, Compare } from './Math'
import { Delay } from './Delay'
import { EventListener, EventTrigger } from './Event'
import { Timer } from './Timer'

export function createRegistry() {
  return new NodeRegistry()
    .register('IF', IF)
    .register('Switch', Switch)
    .register('Print', Print)
    .register('Concat', Concat)
    .register('TextInput', TextInput)
    .register('NumberInput', NumberInput)
    .register('BooleanInput', BooleanInput)
    .register('TextTemplate', TextTemplate)
    .register('TextSplit', TextSplit)
    .register('MathOperation', MathOperation)
    .register('Compare', Compare)
    .register('Delay', Delay)
    .register('EventTrigger', EventTrigger)
    .register('EventListener', EventListener)
    // Keep the TimerEvent registration so saved graphs can still recognize this node type.
    .register('TimerEvent', Timer)
}

export function createRuntime() {
  return new Runtime(createRegistry())
}
