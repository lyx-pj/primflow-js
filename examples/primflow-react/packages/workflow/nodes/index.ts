import { Image, ImageFile } from './Assets'
import { NodeRegistry } from '@lyx-pj/primflow-model'
import { IF } from './IF'
import { Switch } from './Switch'
import { Print } from './Print'
import { HttpRequest } from './HttpRequest'
import { Concat } from './Concat'
import { TextInput, NumberInput, BooleanInput, ArrayInput, ObjectInput, MultilineTextInput, SelectInput } from './Input'
import { TextTemplate, TextSplit, CheckString } from './Text'
import { MathOperation, Compare } from './Math'
import { Delay } from './Delay'
import { DemoCard } from './DemoCard'
import { ManualApproval, ThrowError } from './Execution'
import { EventListener, EventTrigger } from './Event'
import { Timer } from './Timer'
import { GetVariable, SetVariable } from './Variable'

export function createRegistry() {
  return new NodeRegistry()
    .registerDataType(Image)
    .register('ImageFile', ImageFile)
    .register('IF', IF)
    .register('Switch', Switch)
    .register('Print', Print)
    .register('HttpRequest', HttpRequest)
    .register('Concat', Concat)
    .register('TextInput', TextInput)
    .register('NumberInput', NumberInput)
    .register('BooleanInput', BooleanInput)
    .register('ArrayInput', ArrayInput)
    .register('ObjectInput', ObjectInput)
    .register('MultilineTextInput', MultilineTextInput)
    .register('SelectInput', SelectInput)
    .register('TextTemplate', TextTemplate)
    .register('TextSplit', TextSplit)
    .register('CheckString', CheckString)
    .register('MathOperation', MathOperation)
    .register('Compare', Compare)
    .register('Delay', Delay)
    .register('DemoCard', DemoCard)
    .register('ManualApproval', ManualApproval)
    .register('ThrowError', ThrowError)
    .register('SetVariable', SetVariable)
    .register('GetVariable', GetVariable)
    .register('EventTrigger', EventTrigger)
    .register('EventListener', EventListener)
    // Keep the TimerEvent registration so saved graphs can still recognize this node type.
    .register('TimerEvent', Timer)
}
