# Loop execution

English | [简体中文](loops.zh-CN.md)

The engine includes the control nodes `loop`, `loop-entry`, and `loop-return`. [model loop nodes](../../primflow-model/docs/loops.md) defines their ports, `loop` configuration, and JSON structure. Loop node classes and related types are also exported from the engine entry point. This document covers execution, errors, stopping, and queries; see [canvas loop bodies](../../primflow-canvas/docs/loops.md) for creation and editing.

## Iteration behavior

- `next`: submit the current result and continue to the next iteration.
- `break`: submit the current result and end the loop.
- If the return node's `value` has no connection, the submitted value is the current iteration's entry value. If connected, the actual value is used, including `undefined`.
- At least one iteration runs. If the body never reaches `break`, the iteration limit raises `LoopLimitExceeded` without publishing partial results.
- The result is output and `done` fires once only after the entire loop succeeds. Failure or cancellation does not pass partial results downstream; completed iterations remain queryable.

## Values between iterations

| Loop Entry output | First iteration | Later iterations |
| --- | --- | --- |
| `initialValue` | `Loop.input` at invocation start | A copy of the same initial input |
| `value` | `Loop.input` at invocation start | The preceding iteration's submitted result |

Connect `value` to accumulate results or traverse a collection. Connect `initialValue` to rerun a generator with the same input after a validation failure. The body can use both outputs in one iteration.

## Per-iteration isolation

A startup or event creates a task (`taskId`). Entering a `Loop` creates a loop invocation (`invocationId`). Each iteration owns an independent set of data called a loop frame (`frameId`). Loops do not create a task per iteration.

| Data | Handling |
| --- | --- |
| Node inputs, outputs, `data`, temporary `ctx.taskState`, and pending data | Isolated per iteration; temporary results from earlier iterations are unavailable |
| Values carried between iterations | Passed from the return node's `value` to the next entry |
| Inputs, variables, and application context | Copied from data at loop entry; changes inside an iteration do not automatically write back to the parent graph or other iterations |
| Business state `ctx.state` | Shared within the task. Once committed, updates remain visible if a later iteration fails. To update only after loop success, write from the `done` path |
| `nodeState`, services, and external systems | Can remain shared; business code must avoid interference |

Ordinary subgraphs called from the body also use the current iteration's isolated data. Repeated or concurrent invocations of the same `Loop` record their data separately.

Inputs with multiple sources use the [same selection rules](../README.md#multiple-data-sources-for-one-input) within each frame. Data from another iteration cannot satisfy a dependency in the current frame.

The execution context includes `frameId` and read-only `loop` information: invocation ID, loop node ID, zero-based iteration index, and parent frame ID.

## When an iteration finishes

A return node registers the return value; the engine commits it. After receiving the return value, the engine waits for all nodes and branches started in the iteration to finish. It saves the result and decides whether to continue only when there is exactly one return, no missing data, and no execution errors.

Asynchronous work must be represented by the executor's returned Promise or started through `next` before the executor returns. An executor cannot return first and call `next` later from a timer: the engine cannot track that callback as unfinished work in the iteration.

The first `next` freezes a node's outputs. The node cannot subsequently write outputs or emit events. Saved `setOutput`, `emitEvent`, and `next` callbacks also become unusable after the executor finishes or the frame closes.

Ordinary graphs allow delayed `next` calls while a task remains valid; loop bodies follow stricter rules.

## Configuration, errors, and stopping

Configuration belongs in the node's `loop` field; the current version is 1. The canvas writes only `version` by default. `maxIterations` can only lower the invocation's iteration limit. Loading validates configuration, ports, region structure, and connections.

| Situation | Result |
| --- | --- |
| No return, multiple returns, or repeated execution of one node | The iteration fails and reports invocation and iteration details |
| Required data was not produced | `LoopDependencyUnresolved`; data from the previous iteration cannot be reused |
| The body never decides to stop | `LoopLimitExceeded` at the iteration limit; no partial results are published |
| Node error or loop timeout | Cancel the invocation, retain the error, and do not fire `done`; timeout reports `LoopTimeout` |
| `stopTask` / `stop` | Cancel loops in the specified task or all tasks, and request node cleanup |
| Breakpoint hit | Pause the task and continue the current iteration on resume |

Defaults allow at most 1000 iterations per loop, 10000 node activations per task including nested loops and control nodes, and 8 nesting levels. The latest 100 finished iterations are retained by default. Iteration, activation, and nesting limits are hard limits; node configuration can only lower the per-invocation iteration count.

```ts
const engine = new Engine(registry, {
  maxLoopIterations: 1000,
  maxNodeActivations: 10_000,
  maxLoopDepth: 8,
  maxLoopIterationHistory: 100,
})
```

`timeoutMs` limits the loop's total running time, excluding breakpoint pauses. Time spent awaiting business input through `ctx.interrupt()` counts toward this limit. Interrupt requests from a loop carry its frame and iteration scope. The engine periodically yields to the event loop. Stopping can cancel active frames, but does not wait indefinitely for business Promises that ignore cancellation or undo external operations already performed. Breakpoints can be hit again in each iteration and carry the same loop context information.

The engine checks the deadline before committing an iteration and before publishing the final output, including when synchronous work delays the timer.

## Event sources and restrictions

Loading validates body structure: entry and return nodes, the absence of Start/End, and the prohibition of connections across regions and recursive references. See [model loop nodes](../../primflow-model/docs/loops.md).

Event sources, persistent timers, and business event subscriptions cannot appear inside a loop body or ordinary subgraphs it calls:

- Nodes with `executionMode: 'source'` and static `onEvent` nodes are rejected during loading.
- Lifecycle `onActive` can still initialize resources, but should not subscribe to business events.
- `emitEvent` inside a loop creates a separate task and retains `parentTaskId`. The iteration does not wait for it; use an awaited asynchronous call when its result is needed.

Hiding event source nodes from the palette inside loop bodies is canvas behavior; see [canvas loop bodies](../../primflow-canvas/docs/loops.md).

## Queries and events

| Query | API |
| --- | --- |
| Loop invocations in a task | `getLoopInvocations(taskId)` |
| Iteration records for one invocation | `getLoopIterations(taskId, invocationId)` |
| A node's data in one iteration | `getFrameNodeExecutionData(taskId, frameId, nodeId)` |

```ts
const calls = engine.getLoopInvocations(taskId)
const frames = engine.getLoopIterations(taskId, calls[0].invocationId)
const values = engine.getFrameNodeExecutionData(taskId, frames[0].frameId, nodeId)

engine.on('loop:started', (taskId, invocation) => {})
engine.on('loop:iteration:started', (taskId, iteration) => {})
engine.on('loop:iteration:completed', (taskId, iteration) => {})
engine.on('loop:finished', (taskId, invocation) => {})
```

Queries return copies. Each task retains the latest 100 finished iterations by default, plus active iterations. Evicting iteration records does not affect the final result. Use `frameId` to select a specific iteration when multiple loops run concurrently. Queries by the original `nodeId` provide aggregated status and the latest completed data. `getLoopInvocations` reports `reason` as `break` when the body decides to end, or `limit` when the iteration limit is reached.

Use the [execution log](execution-trace.md) to link an invocation's `activationId` to its caller and inspect individual node outcomes by `frameId`. Trace and iteration records have independent retention limits.
