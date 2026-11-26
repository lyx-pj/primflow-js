export interface Schema<T, Optional extends boolean = boolean> {
  readonly optional: Optional
  readonly validate: (value: unknown, path: string) => string | undefined
  readonly value?: T
}

type FieldShape = Readonly<Record<string, Schema<unknown>>>
type Infer<S> = S extends Schema<infer T> ? T : never
type ObjectValue<F extends FieldShape> = {
  -readonly [K in keyof F as F[K]['optional'] extends true ? never : K]: Infer<F[K]>
} & {
  -readonly [K in keyof F as F[K]['optional'] extends true ? K : never]?: Infer<F[K]>
}

function check<T>(expected: string, accepts: (value: unknown) => boolean): Schema<T, false> {
  return { optional: false, validate: (value, path) => accepts(value) ? undefined : `${path} expects ${expected}.` }
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

export const schema = {
  string: () => check<string>('a string value', value => typeof value === 'string'),
  number: () => check<number>('a number value', value => typeof value === 'number' && !Number.isNaN(value)),
  boolean: () => check<boolean>('a boolean value', value => typeof value === 'boolean'),
  enum<const T extends readonly [string, ...string[]]>(values: T): Schema<T[number], false> {
    const choices = new Set<string>(values)
    return check(values.join(' or '), value => typeof value === 'string' && choices.has(value))
  },
  optional<S extends Schema<unknown>>(field: S): Schema<Infer<S>, true> {
    return { optional: true, validate: (value, path) => value === undefined ? undefined : field.validate(value, path) }
  },
  array<S extends Schema<unknown>>(item: S): Schema<Infer<S>[], false> {
    return {
      optional: false,
      validate(value, path) {
        if (!Array.isArray(value)) return `${path} expects an array value.`
        for (const [index, entry] of value.entries()) {
          const issue = item.validate(entry, `${path}[${index}]`)
          if (issue) return issue
        }
      },
    }
  },
  object<const F extends FieldShape>(fields: F): Schema<ObjectValue<F>, false> {
    const entries = Object.entries(fields)
    return {
      optional: false,
      validate(value, path) {
        if (!isObject(value)) return `${path} expects an object value.`
        for (const [key, field] of entries) {
          const issue = field.validate(Object.hasOwn(value, key) ? value[key] : undefined, `${path}.${key}`)
          if (issue) return issue
        }
      },
    }
  },
}

const builtinSchemas = {
  string: schema.string(),
  number: schema.number(),
  boolean: schema.boolean(),
  array: check<unknown[]>('an array value', Array.isArray),
  object: check<Record<string, unknown>>('an object value', isObject),
  any: check<unknown>('a value', () => true),
}

export type BuiltinDataType = keyof typeof builtinSchemas
export type ControlPort = 'exec' | 'spacer'

export interface DataType<T = unknown, Id extends string = string> {
  readonly id: Id
  readonly kind?: 'value'
  readonly schema: Schema<T>
}

export function defineDataType<const Id extends string, T>(definition: DataType<T, Id>): DataType<T, Id> {
  return Object.freeze({ ...definition })
}

export interface StreamType<T = unknown, Id extends string = string> {
  readonly id: Id
  readonly kind: 'stream'
  readonly item: BuiltinDataType | DataType<T>
}

export function defineStreamType<const Id extends string, const Item extends BuiltinDataType | DataType>(
  definition: { id: Id; item: Item },
): StreamType<PortValue<Item>, Id> {
  return Object.freeze({ ...definition, kind: 'stream' }) as StreamType<PortValue<Item>, Id>
}

export interface StreamWriter<T = unknown> {
  write(value: T): Promise<void>
  close(): void
}

export type PortType = BuiltinDataType | ControlPort | DataType | StreamType
export type PortValue<T> = T extends keyof typeof builtinSchemas ? Infer<(typeof builtinSchemas)[T]>
  : T extends DataType<infer V> ? V : never

export type PortTypeId<T> = T extends { readonly id: infer Id extends string } ? Id : T
export function portTypeId<T extends string | DataType | StreamType>(type: T): PortTypeId<T> {
  return (typeof type === 'string' ? type : type.id) as PortTypeId<T>
}

export function isBuiltinDataType(type: string): type is BuiltinDataType {
  return Object.hasOwn(builtinSchemas, type)
}

/** Control ports carry execution flow instead of data. */
export function isControlPort(type: string): type is ControlPort {
  return type === 'exec' || type === 'spacer'
}

/** Spacer ports occupy a layout row without carrying flow or values. */
export function isSpacerPort(type: string): boolean {
  return type === 'spacer'
}

/** Data ports carry values; every non-control port is a data port. */
export function isDataPort(type: string): boolean {
  return !isControlPort(type)
}

export class DataTypeRegistry {
  private readonly definitions = new Map<string, DataType | StreamType>()

  register(type: DataType | StreamType): this {
    if (!type.id.trim() || isBuiltinDataType(type.id) || isControlPort(type.id)) {
      throw new TypeError(`Invalid data type ID "${type.id}".`)
    }
    if (type.kind === 'stream' && typeof type.item !== 'string' && this.get(type.item.id) !== type.item) {
      throw new TypeError(`Register stream item type "${type.item.id}" before "${type.id}".`)
    }
    const existing = this.definitions.get(type.id)
    if (existing && existing !== type) throw new TypeError(`Data type "${type.id}" is already registered.`)
    this.definitions.set(type.id, type)
    return this
  }

  get(id: string): DataType | StreamType | undefined {
    return this.definitions.get(id)
  }

  checkConnection(source: string, target: string): boolean {
    // Spacer ports never connect; exec ports only connect to exec.
    if (isSpacerPort(source) || isSpacerPort(target)) return false
    if (source === 'exec' || target === 'exec') return source === target
    if (!this.has(source) || !this.has(target)) return false
    if (this.getStream(source) || this.getStream(target)) return source === target
    return source === target || source === 'any' || target === 'any'
  }

  getStream(id: string): StreamType | undefined {
    const definition = this.get(id)
    return definition?.kind === 'stream' ? definition : undefined
  }

  has(type: string): boolean {
    return isBuiltinDataType(type) || this.definitions.has(type)
  }

  validateValue(type: string, value: unknown, path = 'Value'): string | undefined {
    const definition = this.get(type)
    if (definition?.kind === 'stream') return `${path} must be transferred through a stream.`
    const validator = isBuiltinDataType(type) ? builtinSchemas[type] : definition?.schema
    return validator ? validator.validate(value, path) : `${path} has unknown data type "${type}".`
  }

  assertValue(type: string, value: unknown, path?: string): void {
    const issue = this.validateValue(type, value, path)
    if (issue) throw new TypeError(issue)
  }
}
