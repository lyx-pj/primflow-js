import { NodeRegistry } from '@lyx-pj/primflow-model'
import { Image, ImageFile } from './Assets'
import { ConcatText } from './Concat'
import { Delay } from './Delay'
import { CustomCard } from './DemoCard'
import { EmitEvent, OnEvent } from './Event'
import { ManualApproval, ThrowError } from './Execution'
import { HttpRequest } from './HttpRequest'
import { If } from './IF'
import {
  ArrayInput,
  BooleanInput,
  MultilineInput,
  NumberInput,
  ObjectInput,
  SelectInput,
  TextInput,
} from './Input'
import { Arithmetic, Compare } from './Math'
import { Print } from './Print'
import { Switch } from './Switch'
import { CheckText, SplitText, TextTemplate } from './Text'
import { Timer } from './Timer'
import { GetVariable, SetVariable } from './Variable'

export function createRegistry() {
  return new NodeRegistry()
    .registerDataType(Image)
    .register('ImageFile', ImageFile)
    .register('TextInput', TextInput)
    .register('NumberInput', NumberInput)
    .register('BooleanInput', BooleanInput)
    .register('ArrayInput', ArrayInput)
    .register('ObjectInput', ObjectInput)
    .register('MultilineInput', MultilineInput)
    .register('SelectInput', SelectInput)
    .register('SetVariable', SetVariable)
    .register('GetVariable', GetVariable)
    .register('ConcatText', ConcatText)
    .register('TextTemplate', TextTemplate)
    .register('SplitText', SplitText)
    .register('CheckText', CheckText)
    .register('Arithmetic', Arithmetic)
    .register('Compare', Compare)
    .register('If', If)
    .register('Switch', Switch)
    .register('Delay', Delay)
    .register('Timer', Timer)
    .register('ManualApproval', ManualApproval)
    .register('ThrowError', ThrowError)
    .register('EmitEvent', EmitEvent)
    .register('OnEvent', OnEvent)
    .register('HttpRequest', HttpRequest)
    .register('Print', Print)
    .register('CustomCard', CustomCard)
}
