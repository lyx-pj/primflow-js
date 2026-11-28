# @lyx-pj/primflow-engine

English | [简体中文](README.zh-CN.md)

Workflow execution engine for Node.js, browsers, Web Workers, and servers.

## Run a workflow

```ts
import { NodeRegistry } from '@lyx-pj/primflow-model'
import { Engine } from '@lyx-pj/primflow-engine'

const registry = new NodeRegistry()
const engine = new Engine(registry, {
  maxTaskHistory: 50,
  trace: { maxEntries: 1000, captureData: false },
})

await engine.loadGraph(graphJson)       // Load and validate the graph
await engine.start({ debug: false })    // Start session (debug: true enables breakpoints)
await engine.dispatchEvent('tick', {})  // Dispatch a business event to trigger listeners
await engine.stop()                     // Stop session and clean up resources
```

## Define executors and services

- `defineExecutor(nodeDef, fn)`: infers input/output port types from a node definition and binds execution logic; register via `engine.registerExecutor(name, executor)`.
- `defineService(serviceDef)`: defines an external service (e.g., HTTP client, storage) injectable into execution contexts; register via `engine.registerService(service)` and access via `ctx.getService(service)`.

```ts
import { defineExecutor, defineService } from '@lyx-pj/primflow-engine'

const HttpService = defineService({ id: 'http', create: () => fetch })
const myExecutor = defineExecutor(MyNode, async (ctx) => {
  const input = ctx.getInput('text')
  ctx.setOutput('result', input)
  ctx.next('done')
})
```

## Live progress, streams, and task state

- **Live progress**: call `ctx.reportProgress(text)` inside a node; subscribe on the host via `engine.on('node:progress', ...)`.
- **Stream ports**: write stream items via `ctx.openOutputStream(port)` and consume them downstream via `ctx.readInputStream(port)`.
- **Task state**: read the current task state snapshot via `ctx.state` and stage updates via `ctx.setState(patch)` (committed when the node finishes).

## Interruptions and debug control

- **Business interruptions**: call `await ctx.interrupt(payload)` inside a node to pause the task and wait for an external reply; submit the reply from the host via `engine.resumeInterrupt(taskId, interruptId, reply)`.
- **Breakpoints and task control**: when started with `engine.start({ debug: true })`, breakpoints pause the corresponding task; call `engine.resume(taskId)` to continue or `engine.stopTask(taskId)` to cancel a single task.

## Node lifecycle

Nodes managing persistent connections or event subscriptions can implement lifecycle hooks:

- `onActive(ctx)`: called when the session starts; use `ctx.on(event, handler)` / `ctx.once(event, handler)` to subscribe to events and trigger execution.
- `onDeactivate(ctx)`: called when the session stops to release connections or listeners.
- `onDestroy(ctx)`: called when the node instance is destroyed.

## Failures and retries

- Configure `retryPolicy` (e.g., `maxAttempts`, `backoffMs`) on a node definition to enable automatic retries.
- Throw `NodeExecutionError` to attach structured error codes and a `retryable` flag.

## Queries, traces, and subgraphs

- **Queries and events**: inspect tasks and traces with `engine.getTasks()`, `engine.getTask(taskId)`, and `engine.getTaskTrace(taskId)`, or subscribe to live events with `engine.on(...)`. See [Execution trace](docs/execution-trace.md).
- **Subgraphs and loops**: ordinary subgraphs pass parameters through `Start` / `End`, and loops use `LoopEntry` / `LoopReturn`. See [Subgraph parameters](docs/subgraphs.md) and [Loops](docs/loops.md).
