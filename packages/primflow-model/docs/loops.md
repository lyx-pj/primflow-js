# Loop nodes

English | [简体中文](loops.zh-CN.md)

This document describes loop ports, configuration, and body structure. See [engine loop execution](../../primflow-engine/docs/loops.md) for iteration behavior and [canvas loop bodies](../../primflow-canvas/docs/loops.md) for creation and editing.

## Nodes and ports

| Node | Type name | Inputs | Outputs |
| --- | --- | --- | --- |
| `Loop` | `loop` | Execution `exec`, data `input` | Execution `done`, data `output` |
| `LoopEntry` | `loop-entry` | None | Execution `exec`, data `value` and `initialValue` |
| `LoopReturn` | `loop-return` | Data `value`, execution `next` / `break` | None |

Port IDs use the `in-` / `out-` prefixes, such as `in-input` and `out-value`. A loop exposes one execution input and one data input. Iteration numbers and completion reasons are internal engine information, not ports.

Loops have one form: the body runs repeatedly and decides when to stop. Nodes inside the body implement collection traversal, counting, and other uses; the engine does not distinguish modes.

- `Loop.input` supplies the first iteration's entry value. Later iterations receive the value submitted by the previous return node.
- `LoopEntry.initialValue` copies `Loop.input` at the start of the invocation and provides the same initial value on every iteration.
- `LoopEntry.value` is the current iteration's entry value. It starts at `Loop.input` and receives the result submitted through `LoopReturn.next` on later iterations.
- `LoopReturn.next` submits the current iteration and continues; `break` submits it and ends the loop.
- `Loop.output` is the result of a successful loop: the last submitted iteration value.

## Loop configuration

Configuration belongs in `JsonNode.loop`, separate from business `data`. [LoopConfig](../src/types.ts) has one form:

```ts
type LoopConfig = {
  version: 1
  maxIterations?: number
  timeoutMs?: number
}
```

Configuration must be saved explicitly; the runtime does not infer missing values. `maxIterations` can only lower the engine's default limit. `timeoutMs` limits the total running time of an invocation. The engine rejects missing configuration, unknown versions, and invalid parameters during loading; see [Loop execution](../../primflow-engine/docs/loops.md).

New nodes use `DEFAULT_LOOP_CONFIG = { version: 1 }`, written by the canvas and defined in [Loop.ts](../src/builtin/nodes/Loop.ts).

## Loop body structure

The body lives in `JsonGraph.subgraphs[targetGraphId]`, referenced by `Loop.targetGraphId`. It is saved with its owning graph, not as a separate file. The JSON must satisfy these rules:

- Exactly one `loop-entry` and at least one `loop-return`.
- No ordinary `start` / `end` nodes.
- No connections across regions, recursive subgraph references, or arbitrary execution/data cycles.
- Different branches may have separate return nodes, but only one can be reached in an iteration.

The engine validates these rules during loading. See [Loop execution](../../primflow-engine/docs/loops.md) for error handling and iteration behavior.

## Differences from ordinary subgraphs

Ordinary subgraphs use `Start` / `End` for parameters and results; loop bodies use `LoopEntry` / `LoopReturn`. Their port preservation rules differ; see [Subgraph data and ports](subgraphs.md).
