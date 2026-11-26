# @lyx-pj/primflow-engine

English | [简体中文](README.zh-CN.md)

Execute workflows defined by graphs. The engine reads graphs defined by [model](../primflow-model/README.md), follows connections between nodes, and handles events, tasks, breakpoints, stopping, loops, and subgraphs.

## Supported hosts

The engine is not bound to a specific host environment. It does not touch the DOM, the file system, or browser APIs, so it runs in browsers, Node, workers, or any other host that provides the standard Web globals it uses (`structuredClone`, `AbortController`, `setTimeout`, and similar).

Node executors come from the application. Anything that needs a connection, a file, or a timer belongs in a registered service or a node lifecycle hook. The engine receives a prepared graph and never reads browser files or assumes it runs in a browser.

## Run a workflow

```ts
import { Engine, NodeRegistry } from '@lyx-pj/primflow-engine'

const registry = new NodeRegistry()
const engine = new Engine(registry)

engine.loadGraph(json)
await engine.start()
const tasks = engine.getTasks()

engine.stop()
await engine.whenStopped()
```

- Register custom node types in `NodeRegistry` before using them in a graph. An empty registry is sufficient for built-in nodes.
- `loadGraph()` loads and validates the graph, `start()` opens a session and runs the initial task, and `getTasks()` lists tasks created by the execution.
- After startup, `Engine` stays running and continues accepting events. Call `stop()` when the user stops execution or the page unmounts; use `await whenStopped()` when asynchronous cleanup must finish.
- Applications with persistent timers or event listeners should keep `Engine` for the application lifecycle rather than create one for every execution.
- See the [model README](../primflow-model/README.md) for node definitions and registration, and the [example's internal module](../../examples/primflow-react/packages/workflow/README.md) for event sources and timers.

Nodes with `definition.valueOutputs` provide data when a downstream node prepares its inputs, including inside subgraphs and loop frames. The engine follows linked inputs through these nodes, waits for the upstream executor when one supplies the value, and uses the configured input or fallback when no linked value is available. These data-only nodes stay idle and do not appear in the execution chain. A cycle in a consumed chain of value outputs is rejected when the graph loads.

A `valueOutputs.read` output uses the task snapshot available when its consumer prepares inputs. If the read throws, the scheduler records it as a failure of the consumer's input and keeps its error code. A `NodeExecutionError` with `retryable: true` can trigger a retry when the consumer's retry policy allows it. The same retry rules apply when the consumer rejects the value. Each retry reads the latest task snapshot before invoking the executor, and the failure records the version it read in `inputSource.stateVersion`.

### Define an executor

Use `defineNode` to declare ports and name an executor. Bind the implementation with `defineExecutor`. Applications can publish the node definition to the frontend and register the implementation on the runtime side.

```ts
import { defineExecutor, defineNode, defineService, Engine, NodeRegistry } from '@lyx-pj/primflow-engine'

const FindUser = defineNode({
  executor: 'backend.find-user',
  definition: {
    inputs: [{ name: 'exec', type: 'exec' }, { name: 'id', type: 'string' }],
    outputs: [{ name: 'done', type: 'exec' }, { name: 'body', type: 'string' }],
  },
})

const http = defineService('http', { value: httpClient })
const user = defineService('user', {
  dependsOn: [http],
  create(ctx) {
    const client = ctx.getService('http')
    return { getById: (id: string) => client.get(`/users/${id}`) }
  },
})

const findUser = defineExecutor(FindUser, async ({ getInput, setOutput, next, services }) => {
  const id = getInput('id')
  if (id === undefined) throw new Error('User ID is required.')
  setOutput('body', await services.require('user').getById(id))
  await next(['done'])
}, { services: [user] })

const registry = new NodeRegistry().register('FindUser', FindUser)
const engine = new Engine(registry, { services: [user, http] })
engine.registerExecutor(findUser)
```

In this example, `httpClient.get` accepts a path and returns `Promise<string>`. `defineExecutor` infers data inputs, data outputs, and execution branches from the node. Inputs can be missing, and values from `any` ports are read as `unknown`. Apply business validation to runtime data from canvas edits and loaded JSON as needed.

Use inferred executors for fixed ports. For dynamic ports, a colocated `executor` function in `defineNode` can read the instance's ports from `ctx.inputs` and `ctx.outputs`. The engine checks the colocated function first, then an executor registered under the node's declared name, then one registered under its definition ID. A node with a missing implementation fails at runtime with `No executor for <definitionId>`.

### Define services

Supply an existing object or callable function with `value`, or a synchronous factory with `create`. A factory lists its direct dependencies in `dependsOn`, which supplies the types for `ctx.getService(name)`. Engine construction checks for missing or different definitions with the same name, duplicate names, and cycles before running factories in dependency order. Each factory runs once per engine construction, and subsequent tasks reuse its result.

The `services` option of `defineExecutor` supplies service types to the callback. When registering the executor, the engine checks that those service definitions were installed. An executor reads the installed value using `ctx.services.require(name)` or `ctx.services.get(name)`. For a missing service, `require` throws an error naming the service, and `get` returns `undefined`. The application manages service cleanup. Use node lifecycle hooks for resources tied to a workflow session.

Use `EngineOptions.context` or `engine.setContext(value)` to supply task-level application context. The engine copies it for each task, and nodes read it through `ctx.context`. Pass objects that cannot be copied through services.

### Multiple data sources for one input

An input with one data link waits for that source, even when a different execution branch triggers the node. For an input with multiple data links, the engine selects a source separately for each trigger:

1. It checks the current execution path backwards and selects the nearest matching node's output from that activation.
2. If the path contains no candidate, it checks the graph's `links` in reverse order and uses the first ready source. If none is ready, it checks again when a candidate publishes its output. When multiple links match the same activation, the later link in `links` wins.

The selected source and value stay fixed while that trigger waits for its other inputs. For example, with execution paths `a → b → e` and `a → c → e` and both data outputs linked to the same input on `e`, the two executions of `e` use the values from `b` and `c` respectively. Each trigger waits only for the sources it selects. Data-only value transformations inherit the execution source of their input. Subgraphs and loop frames resolve sources within their own region.

## Live progress and stream ports

Executors can call `ctx.emitProgress('text', fragment)`. Subscribe to `task:node:progress` and use `taskId`, `executionId`, and `sequence` to update a preview. Retries get new execution IDs, and progress works with tracing disabled. Write the final value with `setOutput()`.

To stream between nodes, the producer calls `ctx.openStream('deltas')`, awaits each `writer.write(chunk)`, and calls `writer.close()`. A consumer with `executionMode: 'stream'` starts when the stream opens and reads chunks with `for await (const chunk of ctx.getStream('deltas'))`. The engine validates each chunk and waits when the queue fills. Failure and cancellation release pending reads and writes. Traces record chunk counts.

Streams support ordinary nodes in the root graph, with one producer and one consumer per stream. Consumers have one stream input and may have other configured values. Nodes with stream ports cannot declare retries or run in subgraphs or loop bodies.

`loadGraph()` checks type registration and configured values. It accepts existing links between incompatible built-in data types by default. Set `strictDataTypes: true` to reject those links during load.

## Task state

Every task has an independent JSON state object. Startup and each dispatched event create separate tasks. Nodes in the main graph, subgraphs, and loop frames all use their owning task's `ctx.state`. A standalone `runNode()` or `executeNode()` call also gets fresh state for that call.

```ts
const CountStep = defineNode({
  executor: 'count-step',
  definition: {
    inputs: [{ name: 'exec', type: 'exec' }],
    outputs: [{ name: 'done', type: 'exec' }],
  },
})
const registry = new NodeRegistry().register('CountStep', CountStep)
const engine = new Engine(registry, {
  context: { username: 'alice' },
  state: {
    count: {
      initial: 0,
      reducer: (current: number, delta: number) => current + delta,
    },
  },
})

engine.registerExecutor(defineExecutor(CountStep, async (ctx) => {
  ctx.state.update({ count: 1 })
  await ctx.next()
}))

engine.loadGraph(json)
await engine.start({ initialState: { count: 10 } })
const event = await engine.dispatchEventWithOptions('increment', { initialState: { count: 7 } }, payload)
if (event) console.log(engine.getTaskState(event.id))
```

- `ctx.state.get(key)` and `ctx.state.snapshot()` read the same immutable starting version for one node activation. Unset fields return `undefined`. A snapshot contains `{ version, values }`.
- `ctx.state.update(patch)` stages a partial update. A call to `next()` commits the staged batch before it hands off execution. A successful executor return commits any remaining updates. A failure or cancellation discards uncommitted updates while earlier commits remain visible. Repeated or delayed handoffs only commit newly staged updates while their task is active. Loop activations accept writes until handoff or settlement.
- State starts as `{}` unless defaults or initial values are provided. `EngineOptions.state` configures optional `initial`, `validate`, and `reducer` functions per field. Initial values passed at startup, event submission, or standalone execution replace the defaults directly. Validators check initial and committed values. State fields accept JSON values, and an update may introduce a field without configuration.
- Reducers are synchronous and pure. They receive the latest staged or committed field value and the submitted update. For example, two concurrent increments of `1` add up to `2`. A field without a reducer is replaced. If it changed after the activation's starting snapshot or its own last commit to that field, the entire replacement batch fails with a state conflict. Order-sensitive reducers follow commit order. Use execution dependencies to enforce an order when it matters.

Read the latest committed snapshot with `engine.getTaskState(taskId)`, including after stop while the task is retained. Subscribe to `engine.on('task:state:committed', (taskId, { nodeId, version, changes }) => …)` to observe committed field values. Each successful nonempty batch advances the version by one. State is in memory and follows task history retention.

A lifecycle hook can still use `ctx.nodeState` for session resources. Event callbacks registered through `on()` or `once()` receive the event task's state. A synchronous static `onEvent` filter commits staged state only when it triggers the executor.

## Events and tasks

Each startup or business event creates a task. Tasks are independent: two events with the same name can run concurrently without overwriting each other's results. Cancellation, pausing, or failure affects only the corresponding task. Executors and registered services are shared within an engine instance. Persistent resources such as connections can be accessed through `ctx.nodeState`; business code is responsible for concurrent access.

Event arguments are copied on submission and must support `structuredClone`. Non-cloneable resources such as connections and functions belong in registered services or lifecycle `nodeState`. Non-cloneable event arguments cause `dispatchEvent()` to reject. When a node submits them through `ctx.emitEvent()`, the engine reports an `error` event. Multiple events can be dispatched concurrently:

```ts
const engine = new Engine(registry, { maxTaskHistory: 100 })
engine.loadGraph(graph.toJSON())
await engine.start()

const [a, b] = await Promise.all([
  engine.dispatchEvent('message', { text: 'A' }),
  engine.dispatchEvent('message', { text: 'B' }),
])
```

The Promises returned by `start()` and `dispatchEvent()` wait only for the current scheduling pass, not the entire workflow session. If an executor saves `ctx.next()` and calls it later, the task reenters the running state. Nodes can also call `ctx.emitEvent()` to create another task whose `parentTaskId` identifies the source task.

After cancellation, history eviction, or workflow stop, stale contexts cannot advance execution or write outputs. Event tasks start at listener nodes, so event sources do not need a connection to Start. They cannot borrow results from other tasks to satisfy their data dependencies.

### Task states

| State | Meaning |
| --- | --- |
| `running` | Executing, or some nodes have not returned |
| `waiting` | The scheduling pass has exited, but nodes still await data from this task |
| `paused` | A breakpoint was hit; waiting to resume |
| `interrupted` | At least one node is waiting for a business response |
| `completed` | The scheduling pass finished with no unresolved data dependencies |
| `failed` | The scheduling pass finished with an error |
| `cancelled` | The task was explicitly cancelled |

### Queries and subscriptions

```ts
const tasks = engine.getTasks()
const task = engine.getTask(taskId)
const graph = engine.getTaskGraph(taskId)
const statuses = engine.getNodeStatuses(taskId)
const status = engine.getNodeStatus(nodeId, taskId)
const data = engine.getNodeExecutionData(nodeId, taskId)

engine.on('task:created', (task) => console.log(task.id, task.trigger))
engine.on('task:changed', (task) => console.log(task.id, task.status))
engine.on('task:node:status:changed', (taskId, nodeId, status) => {})
engine.on('task:breakpoint:hit', (taskId, breakpoint) => {})
engine.on('task:error', (taskId, error, nodeId) => {})
```

- Queries return copies; modifying them does not affect the task.
- Node queries without `taskId` use the latest task and return empty state after workflow stop or cancellation of that task. Pass `taskId` explicitly when observing concurrent tasks.
- Cancellation marks running, interrupted, or already triggered nodes waiting on dependencies as `cancelled` in the task history. Other nodes retain their last recorded state.
- Task snapshots include the id, trigger, state, start/end times, current breakpoint, open interrupts, and errors.
- Retained states, execution data, and the graph used by a task remain queryable by `taskId` after stop or reload.
- A task error with no `nodeId` means task initialization failed as a whole.
- The latest 100 finished tasks are retained by default. Configure `maxTaskHistory`; `0` disables retention. Running, paused, waiting, and interrupted tasks are kept until they finish or are stopped.
- Errors thrown by `engine.on()` observers are logged without affecting other observers or tasks.

Node execution states are `idle`, `pending`, `running`, `completed`, `failed`, `cancelled`, `skipped`, and `interrupted`, recorded separately per task. A node completes immediately after handing off through `next()` without waiting for downstream nodes. If its executor subsequently throws, the node records `failed`; any handoff already performed remains in effect.

When a node selects execution outputs, descendants reachable only through its omitted outputs can become `skipped`. Shared downstream paths and nodes already waiting on inputs keep their current state. This records the observed branch decision, so a later handoff can activate a skipped node.

Use the [execution log](docs/execution-trace.md) to inspect individual node runs, unresolved inputs, handoffs, retries, and loop frames without subscribing to events.

## Business interruptions

A scheduled node can await an application response before passing control onward:

```ts
const answer = await ctx.interrupt({ question: 'Approve this request?' })
return ctx.next([answer === true ? 'approved' : 'rejected'])
```

Observe `task:changed` or query `engine.getTask(taskId)?.interrupts` to obtain each request's `id`, `nodeId`, and JSON `value`. A request inside a loop also carries its `frameId` and `loop` scope. After getting a response, call `engine.resumeInterrupt(taskId, interruptId, answer)`. It returns `true` when it accepts the response and `false` when the request is no longer open or the identifiers do not match.

The response resolves the original `await` in the running engine session. Restarting the engine or reloading the graph ends the session and discards open requests. `engine.resume()` resumes debug breakpoints. If a task has both a breakpoint and a business interruption, its status is `paused` and the interruption remains available in `interrupts`.

## Breakpoints, resuming, and stopping

```ts
void engine.start({ debug: true })
engine.setBreakpoint(nodeId, true)
engine.resume(taskId)     // Resume only the specified task
engine.resume()           // Resume all paused tasks
engine.stopTask(taskId)   // Cancel one task while keeping workflow listeners active
engine.stop()             // Cancel all tasks, deactivate and destroy runtime nodes
await engine.whenStopped()
```

- Pausing applies per task; other tasks and new events continue.
- Executors that have already started cannot be forcibly paused or terminated. They should respond to cancellation through `ctx.signal`.
- Cancelling a task settles the Promise awaiting its current dispatch. Old code that ignores the signal may keep running, but stale contexts cannot advance the workflow or modify outputs.
- `engine.status` is `idle`, `running`, `paused`, or `stopped`. It is `paused` when all unfinished tasks are paused, and `running` while other active tasks remain.
- The engine keeps accepting events after the initial task completes. Calling `start()` again while running is rejected; stop first.
- `engine.pausedNode` refers to the latest task's breakpoint. Use `getTask(taskId).pausedNode` for another task.

`start()` accepts execution options, not business data. The main graph's Start has only execution outputs. Supply business data through node inputs, variables, execution context, or events. Ordinary subgraph Start nodes can preserve parameter ports; see “Loops and subgraphs” below.

## Node lifecycle

| Hook | Responsibility |
| --- | --- |
| `onActive(ctx)` | Initialize resources, establish connections, and subscribe to events on engine startup; tasks start after all nodes finish activation |
| `onDeactivate(ctx)` | Remove listeners, disconnect, and stop background activity when the engine stops |
| `onDestroy(ctx)` | Release instance resources permanently; loaded but inactive nodes are also destroyed |

The lifecycle covers nodes in the main graph and every subgraph, including nodes disconnected from Start. It runs once per workflow session, so additional tasks do not create duplicate subscriptions. On stop, all nodes are deactivated before destruction; one cleanup failure does not skip other nodes. Activation failure releases created nodes and causes `start()` to reject.

```ts
import { defineNode } from '@lyx-pj/primflow-model'

const MessageNode = defineNode({
  definition: {
    inputs: [],
    outputs: [{ name: 'next', type: 'exec' }, { name: 'value', type: 'any' }],
  },

  onActive(ctx) {
    ctx.nodeState.listening = true
    ctx.on('message', async (taskCtx, message) => {
      taskCtx.taskState!.message = message
      taskCtx.setOutput('value', message)
      await taskCtx.next()
    })
    const timer = setInterval(() => { ctx.nodeState.lastTick = Date.now() }, 1000)
    ctx.onCleanup(() => clearInterval(timer))
  },

  onDeactivate(ctx) {
    ctx.nodeState.listening = false
  },

  onDestroy(ctx) {
    delete ctx.nodeState.lastTick
  },
})
```

- `ctx.on(name, handler)` and `ctx.once(name, handler)` return an unsubscribe function and become inactive on stop. `once` unregisters before invoking the first callback, including when concurrent events are dispatched.
- In the callback, use `taskCtx.executeSelf()` to ask the scheduler to run the current node's executor in the event task. The executor reads `ctx.event.name` and `ctx.event.payload`. The callback can also set outputs and call `taskCtx.next()` to hand off directly. Each callback chooses one way to hand off.
- Lifecycle `ctx.nodeState` holds engine-level resources. `taskCtx.taskState` is temporary state isolated per task; `taskCtx.nodeState` provides explicit access to shared resources.
- Inputs, outputs, and `data` initialized during the lifecycle are copied into new tasks as initial values; resource objects themselves are not copied.
- `ctx.onCleanup(fn)` registers additional cleanup functions, executed in reverse registration order. Cleanup errors are reported through `node:error`; `whenStopped()` waits for all cleanup.
- Initialization should respond to `ctx.signal`; stopping waits for activation hooks to exit.
- Hooks do not provide `next`, but deactivation and destruction can still access the old instance's data.
- Explicit stop or reload destroys runtime instances while retaining graph configuration, node definitions, and canvas nodes. The next run rebuilds instances from the retained configuration.

Standalone `runNode()` / `executeNode()` calls execute a node without starting its lifecycle or adding it to the task list.

## Retrying and recovering from node failures

Set `retryPolicy: { idempotent: true, maxRetries: 2 }` in the node definition to allow two additional executions of the same logical operation. Opt in only when repeating the operation is safe, including external effects. A retryable execution failure can be reported with `new NodeExecutionError('Request timed out', { kind: 'execution', code: 'TIMEOUT', retryable: true })`. The scheduler reuses the inputs and retries before the executor hands off with `next()`. A `once` subscription receives one event; its executor attempts use the same event data.

Set retry timing on the engine and override individual fields for the current session in `start()`, including event tasks.

```ts
const engine = new Engine(registry, {
  retry: { initialIntervalMs: 500, maxIntervalMs: 8_000, timeoutMs: 10_000 },
})
await engine.start({ retry: { initialIntervalMs: 1_500, jitter: false } })
```

- The base delay starts at 500 ms by default and doubles on each retry, up to a default cap of 128000 ms. With jitter enabled, each wait adds a random 0 to 1000 ms to its base delay.
- `timeoutMs` starts when a failure first initiates recovery. The scheduler stops starting retries at the deadline and routes `RETRY_TIMEOUT` through error handling. Attempts already started can finish. The default has no deadline, and `null` clears an engine-level timeout.
- Other branches can continue during the wait. Stopping the task cancels the wait. Upstream re-execution takes a fresh state snapshot after waiting.

For invalid upstream data, report a retryable `NodeExecutionError` with `kind: 'input'` and the `inputPort` name. The engine follows the recorded producer and output for that input. Nodes on this path declare `outputValidators: { outputName: (value) => /* return whether the value is valid */ }`. Starting with the invalid data, tracing stops at the first validated upstream output, and the scheduler reruns its producer and the linear path back to the consumer in the same task. Each rerun node must opt in and have enough retries. Validation callbacks should be pure. Tracing currently covers direct, single-source data links along a linear execution path in an ordinary graph. A disconnected or unvalidated source, an ambiguous path, or exhausted retries leaves the failure unresolved.

An executor can read the attempt number, remaining retries, origin and previous error from `ctx.retry`. Put structured diagnostic information, such as missing fields, in `NodeExecutionError`'s optional JSON `details` so the upstream executor can use it during a rerun.

Each attempt stages its output and uncommitted `ctx.state` updates. During upstream replay, the retry segment's new state publishes only after the recovering node succeeds. State committed earlier and external effects remain. Retry policies apply to scheduled executors in the main graph and ordinary subgraphs outside loop frames. Once an executor has handed off to downstream execution, any later failure is reported without retrying it.

Optionally configure `retryPolicy.fallback` with a declared execution output `port` and replacement data `outputs`. If recovery cannot continue, the engine hands off through that port and supplies the original error as `ctx.error`. An unresolved failure ends its path. Task snapshots expose `attempts`, and `task:node:attempt` emits updates for applications that display retry counts, failure details, and input provenance.

## Loops and subgraphs

The engine includes the control nodes `loop`, `loop-entry`, and `loop-return`. Loop bodies live in `JsonGraph.subgraphs`, and configuration lives in the node's `loop` field. Defaults allow at most 1000 iterations per loop, 10000 node activations per task, and 8 nesting levels. See [model loop nodes](../primflow-model/docs/loops.md) for ports and configuration, and [Loop execution](docs/loops.md) for iteration behavior, errors, stopping, and queries.

Ordinary subgraphs receive parameters through `Start` and return results through `End`. Ports are matched by name; incompatible types and `undefined` values are skipped according to the parameter rules. See [Subgraph parameters](docs/subgraphs.md) for details. The application loads and assembles standalone subgraph files; the engine does not access storage.

## Development and tests

Run from the repository root:

```sh
pnpm --filter @lyx-pj/primflow-engine test
pnpm --filter @lyx-pj/primflow-engine typecheck
pnpm --filter @lyx-pj/primflow-engine lint
```

| Test | Coverage |
| --- | --- |
| [engine.test.ts](tests/engine.test.ts) | Scheduling, dependencies, breakpoints, stopping, ordinary subgraph parameters |
| [tasks.test.ts](tests/tasks.test.ts) | Concurrent isolation, events, single-task cancellation, and history |
| [lifecycle.test.ts](tests/lifecycle.test.ts) | Lifecycle resources, initialization failure, and cleanup |
| [loops.test.ts](tests/loops.test.ts) | Iterations, values carried between iterations, per-iteration isolation, limits, and cancellation |
| [boundaries.test.ts](tests/boundaries.test.ts) | Shared node factory and package boundaries |

Run a single file with `pnpm --filter @lyx-pj/primflow-engine exec vitest run tests/loops.test.ts`. Check the example bridge when changing public events or queries, and run `pnpm build` when changing public exports or dependencies. See [Architecture](../../docs/architecture.md) for module relationships and the root [README](../../README.md) for common commands.
