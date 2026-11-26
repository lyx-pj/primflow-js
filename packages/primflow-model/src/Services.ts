/**
 * Type-safe service registry contract.
 *
 * The application defines services and the engine holds their resolved values.
 * A service map maps a service name to the type of the value behind it, so
 * `ctx.services.get('http')` returns the declared type instead of `unknown`.
 *
 * A service map is a plain object type. It deliberately does not require an
 * index signature: a closed map rejects an unregistered service name at
 * compile time.
 */

/** A map of service names to their value types. */
export type ServiceMap = object

/**
 * The service map used when an application does not declare one.
 *
 * It accepts any name and returns `unknown`, which keeps untyped callers
 * working while a declared map stays fully typed.
 */
export type AnyServiceMap = Record<string, unknown>

/** Names of the services available in a map. */
export type ServiceName<S extends ServiceMap> = Extract<keyof S, string>

/**
 * Services available to an executor.
 *
 * `get` returns `undefined` when the service was never registered, so the
 * caller decides whether a missing service is fatal. `require` turns a
 * missing service into an error that names it.
 */
export type ServiceContext<S extends ServiceMap = AnyServiceMap> = {
  get: <K extends ServiceName<S>>(name: K) => S[K] | undefined
  require: <K extends ServiceName<S>>(name: K) => S[K]
}
