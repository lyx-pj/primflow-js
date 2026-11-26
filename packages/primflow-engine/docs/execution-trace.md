# Execution logs and troubleshooting

[简体中文](execution-trace.zh-CN.md)

The engine keeps a structured execution log for each scheduled task. Query it during or after execution to find a specific node result, its input sources, and outstanding dependencies. Live interfaces can subscribe to [task events](../README.md#queries-and-subscriptions) for updates.

## Find a specific node execution

```ts
const engine = new Engine(registry, {
  trace: { maxEntries: 2000, captureData: true },
})

// After loadGraph() and start(), use the ID returned for the event task.
const task = await engine.dispatchEvent('message', 'hello')
if (task) {
  const trace = engine.getTaskTrace(task.id)
  const executions = trace?.activations.filter(({ nodeId }) => nodeId === 'transform') ?? []
  for (const { id } of executions) {
    const execution = engine.getNodeActivation(task.id, id)
    console.log(execution?.status, execution?.data?.outputs, execution?.failure)
  }
}
```

After `start()`, find the startup task in `getTasks()` by `trigger.type === 'start'`. `dispatchEvent()` returns the snapshot of its event task, which may still be waiting for dependencies. Keep the original `taskId` for follow-up queries. Concurrent work may move `latestTaskId` to another task.

| Query or field | What it shows |
| --- | --- |
| `getTask(taskId)` | Trigger, task status, errors, breakpoint, business interruptions, and retry attempts. |
| `getTaskTrace(taskId)` | `events` sorted by `sequence`, `activations` in creation order, and both eviction counts. `at`, `startedAt`, and `endedAt` use millisecond timestamps. Use `sequence` to order events within the same millisecond. |
| `getNodeActivation(taskId, activationId)` | One logical execution by its task-local ID. Each execution of a `nodeId` has its own ID, status, and result. `portId` identifies the execution port. An empty `graphId` denotes the root graph. Event handlers and filters may use the engine-generated `in-event` or `out-event` ports. |
| `getTaskGraph(taskId)` | The graph snapshot used by the task. Locate definitions by node, port, and subgraph ID. |

`parentActivationId` points to the activation that triggered the execution. A subgraph entry points to its caller, and nodes inside the subgraph follow their own chain. When a node emits an event, the new task links back through `parentTaskId` and `parentActivationId`, and the source task records `activation:emit`. A static event filter records `triggered` in `activation:event-filter`. An event handler and the executor it schedules through `executeSelf()` each have an ID.

An activation can become `completed` at a `next()` handoff or when the executor returns directly. If the executor throws after handing off, the same activation becomes `failed` and the handoff and downstream records remain. A saved `next()` can also produce a handoff after the activation has ended. `data` is captured when the activation ends. For later handoffs, inspect the inputs read by downstream activations.

## Find the upstream output blocking a task

```ts
const trace = engine.getTaskTrace(taskId)
for (const execution of trace?.activations ?? []) {
  if (execution.status !== 'waiting') continue
  for (const input of execution.waitingFor ?? []) {
    console.log(execution.nodeId, input.inputPortId, input.sources)
  }
}
```

Each item in `waitingFor` identifies one unresolved data input. `inputPortId` is the consumer's port ID. Each source lists the upstream `nodeId` and `outputPort` name. For inputs with multiple candidates, any listed producer can satisfy that input. A connection through a value-only node identifies the upstream producer that must publish first.

Use the producer's activations and `activation:handoff` events to see whether it has yet to run, is still running, or has returned without handing off. Dependency resolution uses task-local data. An output produced in another task leaves the waiter unchanged. When the dependency becomes ready, the same activation returns to `pending` before running. `inputSources` records the bindings made by the scheduler, including producer activation IDs and state read versions when available. A later trigger that replaces a wait at the same single-source entry marks the earlier activation `superseded`. Cancellation preserves unresolved dependencies on the affected activation records.

## Follow failures and recovery

| Log event | How to correlate it |
| --- | --- |
| `task:status`, `task:error` | Inspect task lifecycle transitions. `errorIndex` is the zero-based position in `getTask(taskId).errors`. |
| `activation:status`, `activation:handoff` | Follow an activation through scheduling, dependency waits, and completion. `ports` lists the selected execution output names. Read `failure` on the activation for its error code, message, and reported input port. |
| `activation:attempt` | Match `attemptId` to `attempts[].id` in the task snapshot for the attempt's error, input source, values, or handled fallback. Ordinary retries share one activation ID. An upstream re-execution has its own `replay` activation. |
| `activation:retry-wait`, `branch:skipped` | See when a retry is scheduled, becomes ready, or times out. Skips name the excluded node and the activation that selected the branch. |
| `activation:breakpoint`, `activation:interrupt` | Find the paused activation or follow a business interruption by `interruptId` through request, response, or cancellation. |
| `state:committed` | Find the activation and committed `version`. Compare it with `inputSources[].state.version` for a state-backed input. |
| `loop:invocation`, `loop:frame` | Use `activationId` to find the loop call and `invocationId` to group iterations. Body activations identify their iteration by `frameId`. The log keeps the iteration index, status, and loop termination reason. See [loop runtime inspection](loops.md) for related queries. |

## Capture and retention options

- The engine captures diagnostic metadata by default. Use `trace: { captureData: true }` to store input and output snapshots when nodes finish. `dataUnavailable` marks values that could not be cloned. Error messages can contain application data. Queries return copies.
- `trace.maxEntries` defaults to `1000` and limits the timeline and terminal activation records independently for each task. The oldest records are evicted within each limit. `droppedEvents` and `droppedActivations` count those evictions. Active records stay available until they finish. Correlation fields may still reference evicted IDs.
- Logs follow task retention. Stop or reload the graph and the original `taskId` still works for retained tasks. Both trace queries return `undefined` after eviction by `maxTaskHistory`. Loop iteration queries use their own `maxLoopIterationHistory` limit.
- `trace: false` disables recording for new tasks. Trace configuration passed to `setOptions()` applies at task creation. `runNode()` and `executeNode()` are standalone calls with their own return values. Applications can log session resource hooks and business actions inside executors separately.
- The engine keeps logs in memory. Applications can read and export the snapshots they need for persistent storage or collection across processes.
