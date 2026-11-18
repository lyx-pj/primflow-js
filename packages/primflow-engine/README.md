# @lyx-pj/primflow-engine

English | [简体中文](README.zh-CN.md)

Execute workflows defined by graphs. The engine reads graphs defined by [model](../primflow-model/README.md), follows connections between nodes, and handles events, tasks, breakpoints, stopping, loops, and subgraphs.

## Run a workflow

```ts
import { Engine, Runtime, NodeRegistry, type JsonGraph } from '@lyx-pj/primflow-engine'

const registry = new NodeRegistry()
const engine = new Engine(new Runtime(registry))

engine.fromJSON(json)
await engine.process()
const tasks = engine.getTasks()

engine.stop()
await engine.whenStopped()
```

- Register custom node types in `NodeRegistry` before using them in a graph. An empty registry is sufficient for built-in nodes.
- `fromJSON` loads the graph, `process()` runs it once, and `getTasks()` lists tasks created by the execution.
- After startup, `Engine` stays running and continues accepting events. Call `stop()` when the user stops execution or the page unmounts; use `await whenStopped()` when asynchronous cleanup must finish.
- Applications with persistent timers or event listeners should keep `Engine` for the application lifecycle rather than create one for every execution.
- See the [model README](../primflow-model/README.md) for node definitions and registration, and the [example's internal module](../../examples/primflow-react/packages/workflow/README.md) for event sources and timers.

## Events and tasks

Each startup or business event creates a task. Tasks are independent: two events with the same name can run concurrently without overwriting each other's results. Cancellation, pausing, or failure affects only the corresponding task. Executors and registered services are shared within an engine instance. Persistent resources such as connections can be accessed through `ctx.nodeState`; business code is responsible for concurrent access.

Event arguments are copied on submission and must support `structuredClone`. Non-cloneable resources such as connections and functions belong in registered services or lifecycle `state`. Non-cloneable event arguments cause `dispatchEvent()` to reject; `emit()` reports failure through the `error` event. Multiple events can be dispatched concurrently:

```ts
const engine = new Engine(runtime, { maxTaskHistory: 100 })
engine.fromJSON(graph.toJSON())
await engine.process()

const [a, b] = await Promise.all([
  engine.dispatchEvent('message', { text: 'A' }),
  engine.dispatchEvent('message', { text: 'B' }),
])
```

The Promises returned by `process()` and `dispatchEvent()` wait only for the current scheduling pass, not the entire workflow session. If an executor saves `ctx.next()` and calls it later, the task reenters the running state. Nodes can also call `ctx.emitEvent()` to create another task whose `parentTaskId` identifies the source task.

After cancellation, history eviction, or workflow stop, stale contexts cannot advance execution or write outputs. Event tasks start at listener nodes, so event sources do not need a connection to Start. They cannot borrow results from other tasks to satisfy their data dependencies.

### Task states

| State | Meaning |
| --- | --- |
| `running` | Executing, or some nodes have not returned |
| `waiting` | The scheduling pass has exited, but nodes still await data from this task |
| `paused` | A breakpoint was hit; waiting to resume |
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
- Cancelled history retains the last node execution states; the task's overall state is `cancelled`.
- Task snapshots include the id, trigger, state, start/end times, current breakpoint, and error list.
- Retained states, execution data, and the graph used by a task remain queryable by `taskId` after stop or reload.
- A task error with no `nodeId` means task initialization failed as a whole.
- The latest 100 finished tasks are retained by default. Configure `maxTaskHistory`; `0` disables retention. Running, paused, and waiting tasks are not evicted.
- Errors thrown by `engine.on()` observers are logged without affecting other observers or tasks.

Node execution states are `idle`, `pending`, `running`, and `completed`, recorded separately per task. A node completes immediately after handing off through `next()` without waiting for downstream nodes to return. Branches reachable from the current task entry but not yet executed remain `pending`.

## Breakpoints, resuming, and stopping

```ts
void engine.process({ debug: true })
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
- The engine keeps accepting events after the initial task completes. Calling `process()` again while running is rejected; stop first.
- `engine.pausedNode` refers to the latest task's breakpoint. Use `getTask(taskId).pausedNode` for another task.

`process()` accepts execution options, not business data. The main graph's Start has only execution outputs. Supply business data through node inputs, variables, execution context, or events. Ordinary subgraph Start nodes can preserve parameter ports; see “Loops and subgraphs” below.

## Node lifecycle

| Hook | Responsibility |
| --- | --- |
| `onActive(ctx)` | Initialize resources, establish connections, and subscribe to events on engine startup; tasks start after all nodes finish activation |
| `onDeactivate(ctx)` | Remove listeners, disconnect, and stop background activity when the engine stops |
| `onDestroy(ctx)` | Release instance resources permanently; loaded but inactive nodes are also destroyed |

The lifecycle covers nodes in the main graph and every subgraph, including nodes disconnected from Start. It runs once per engine instance, so additional tasks do not create duplicate subscriptions. On stop, all nodes are deactivated before destruction; one cleanup failure does not skip other nodes. Activation failure releases created nodes and causes `process()` to reject.

```ts
import { Node, type NodeLifecycleContext } from '@lyx-pj/primflow-model'

class MessageNode extends Node {
  static definition = {
    inputs: [],
    outputs: [{ name: 'next', type: 'exec' }, { name: 'value', type: 'any' }],
  } as const

  static onActive(ctx: NodeLifecycleContext) {
    ctx.state.listening = true
    ctx.onEvent('message', async (taskCtx, message) => {
      taskCtx.state!.message = message
      taskCtx.setOutput('value', message)
      await taskCtx.next()
    })
    const timer = setInterval(() => { ctx.state.lastTick = Date.now() }, 1000)
    ctx.onCleanup(() => clearInterval(timer))
  }

  static onDeactivate(ctx: NodeLifecycleContext) {
    ctx.state.listening = false
  }

  static onDestroy(ctx: NodeLifecycleContext) {
    delete ctx.state.lastTick
  }
}
```

- `ctx.onEvent(name, handler)` returns an unsubscribe function and becomes inactive on stop. The callback's `taskCtx` reads and writes data for that task.
- Lifecycle `ctx.state` holds engine-level resources. `taskCtx.state` is temporary state isolated per task; `taskCtx.nodeState` provides explicit access to shared resources.
- Inputs, outputs, and `data` initialized during the lifecycle are copied into new tasks as initial values; resource objects themselves are not copied.
- `ctx.onCleanup(fn)` registers additional cleanup functions, executed in reverse registration order. Cleanup errors are reported through `node:error`; `whenStopped()` waits for all cleanup.
- Initialization should respond to `ctx.signal`; stopping waits for activation hooks to exit.
- Hooks do not provide `next`, but deactivation and destruction can still access the old instance's data.
- Explicit stop or reload destroys runtime instances while retaining graph configuration, node definitions, and canvas nodes. The next run rebuilds instances from the retained configuration.

Standalone `runNode()` / `executeNode()` calls execute a node without starting its lifecycle or adding it to the task list.

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
| [boundaries.test.ts](tests/boundaries.test.ts) | Shared node classes and package boundaries |

Run a single file with `pnpm --filter @lyx-pj/primflow-engine exec vitest run tests/loops.test.ts`. Check the example bridge when changing public events or queries, and run `pnpm build` when changing public exports or dependencies. See [Architecture](../../docs/architecture.md) for module relationships and the root [README](../../README.md) for common commands.
