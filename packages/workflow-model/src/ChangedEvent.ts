import type { NodeHost } from './types'
import { ChangedEventType } from './types'

export { ChangedEventType }

export class ChangedEvent {
  public static Property = ChangedEventType.Property
  public static Insert = ChangedEventType.Insert
  public static Delete = ChangedEventType.Delete

  private _change: ChangedEventType
  private _graph!: NodeHost
  private _propertyName: string
  private _oldValue?: unknown
  private _newValue?: unknown
  private _object?: unknown

  get change() {
    return this._change
  }

  set change(value: ChangedEventType) {
    this._change = value
    this._propertyName = ''
  }

  get graph() {
    return this._graph
  }

  set graph(value: NodeHost) {
    this._graph = value
  }

  get propertyName() {
    return this._propertyName
  }

  set propertyName(value: string) {
    this._propertyName = value
  }

  get oldValue() {
    return this._oldValue
  }

  set oldValue(value: unknown) {
    this._oldValue = value
  }

  get newValue() {
    return this._newValue
  }

  set newValue(value: unknown) {
    this._newValue = value
  }
  get object() {
    return this._object
  }

  set object(value: unknown) {
    this._object = value
  }

  constructor() {
    this._change = ChangedEvent.Property
    this._propertyName = ''
    this._oldValue = null
    this._newValue = null
    this._object = null
  }
}
