export type ServiceDefinition<Name extends string = string, Value = unknown> = { readonly name: Name } & (
  | { readonly kind: 'value'; readonly value: Value }
  | {
    readonly kind: 'factory'
    readonly dependsOn: readonly ServiceDefinition[]
    readonly create: (context: { getService(name: string): unknown }) => Value
  }
)

/** Map the registered service names to their resolved values. */
export type ServiceValues<D extends readonly ServiceDefinition[]> = {
  [P in D[number] as P['name']]: P extends ServiceDefinition<string, infer Value> ? Value : never
}

type FactoryOptions<D extends readonly ServiceDefinition[], Value> = {
  dependsOn?: D
  create: (context: {
    getService<K extends keyof ServiceValues<D>>(name: K): ServiceValues<D>[K]
  }) => Value & (Value extends PromiseLike<unknown> ? never : unknown)
}

/** Declare a service value or a synchronous factory and its dependencies. */
export function defineService<const Name extends string, Value>(
  name: Name, options: { value: Value },
): ServiceDefinition<Name, Value>
export function defineService<
  const Name extends string,
  Value,
  const D extends readonly ServiceDefinition[] = readonly [],
>(name: Name, options: FactoryOptions<D, Value>): ServiceDefinition<Name, Value>
export function defineService(
  name: string,
  options: { value: unknown } | Omit<Extract<ServiceDefinition, { kind: 'factory' }>, 'kind' | 'name' | 'dependsOn'> & {
    dependsOn?: readonly ServiceDefinition[]
  },
): ServiceDefinition {
  if ('value' in options) return { name, kind: 'value', value: options.value }
  return { name, kind: 'factory', dependsOn: options.dependsOn ?? [], create: options.create }
}

export function resolveServices(definitions: readonly ServiceDefinition[]): Map<string, unknown> {
  const byName = new Map<string, ServiceDefinition>()
  for (const definition of definitions) {
    if (!definition.name.trim()) throw new Error('Service name must not be empty.')
    if (byName.has(definition.name)) throw new Error(`Duplicate service "${definition.name}".`)
    byName.set(definition.name, definition)
  }

  const ordered = new Set<ServiceDefinition>()
  const visiting = new Set<ServiceDefinition>()
  const visit = (definition: ServiceDefinition) => {
    if (ordered.has(definition)) return
    if (visiting.has(definition)) {
      throw new Error(`Circular service dependency: ${[...visiting, definition].map(({ name }) => name).join(' -> ')}.`)
    }
    visiting.add(definition)
    if (definition.kind === 'factory') {
      for (const dependency of definition.dependsOn) {
        const registered = byName.get(dependency.name)
        if (!registered) throw new Error(`Service "${definition.name}" is missing dependency "${dependency.name}".`)
        if (registered !== dependency) {
          throw new Error(`Service "${definition.name}" depends on a different definition of "${dependency.name}".`)
        }
        visit(dependency)
      }
    }
    visiting.delete(definition)
    ordered.add(definition)
  }
  definitions.forEach(visit)

  const values = new Map<string, unknown>()
  for (const definition of ordered) {
    if (definition.kind === 'value') {
      values.set(definition.name, definition.value)
      continue
    }
    const dependencyNames = new Set(definition.dependsOn.map(({ name }) => name))
    const value = definition.create({
      getService(name) {
        if (!dependencyNames.has(name)) {
          throw new Error(`Service "${definition.name}" did not declare dependency "${name}".`)
        }
        return values.get(name)
      },
    })
    if (value && typeof (value as Partial<PromiseLike<unknown>>).then === 'function') {
      void Promise.resolve(value).catch(() => {})
      throw new Error(`Service "${definition.name}" must use a synchronous factory.`)
    }
    values.set(definition.name, value)
  }
  return values
}
