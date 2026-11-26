# Editing loop bodies

English | [简体中文](loops.zh-CN.md)

The canvas creates, edits, saves, and deletes loop bodies. [engine loop execution](../../primflow-engine/docs/loops.md) handles execution; see [model loop nodes](../../primflow-model/docs/loops.md) for nodes and configuration.

## Creation

- Adding a `loop` node generates a `targetGraphId` and creates a body in `JsonGraph.subgraphs`. If the node has no configuration, the canvas writes `{ version: 1 }`.
- A new body contains one `loop-entry` and one `loop-return`, connected by `loop-entry.exec → loop-return.next`. Replace this connection after adding business nodes.
- The canvas generates `loop-entry` / `loop-return`; they do not appear in the palette and cannot be added independently.
- Connecting the entry and return initially allows a newly created loop to pass engine loading validation.
- Bodies can contain nested loops or ordinary subgraph calls. Event source nodes (`executionMode: 'source'`) are hidden from the palette inside a body and rejected during loading.

## Entering and returning

Double-click a loop node to edit its body. The toolbar button controls the node panel, which starts open, and selecting a node does not open it automatically; if the panel is already open, selecting another node updates it immediately. Return through the toolbar, a blank-space right-button double-click, the context menu, or `Esc`. This shares [subgraph navigation](subgraphs.md) with standalone subgraphs.

## Loop limits and inputs

Open the node panel from the toolbar, select the Loop node, and set **Maximum iterations** or **Timeout (ms)** under **Loop limits**. The iteration limit must be within the engine cap. Clear the iteration field to use the engine cap or the timeout field to remove the loop timeout. The timeout applies to the whole invocation.

Inside the body, connect **Initial value** to use the same input on each iteration, or connect **Iteration input** to use the previous iteration's result. Both ports provide the initial value on the first iteration.

## Saving and loading

- Bodies are saved in their owning graph's `subgraphs`, not as standalone files.
- Loading a body does not insert an ordinary `Start`. Bodies use `LoopEntry` / `LoopReturn` and do not follow Start rules for main graphs and ordinary subgraphs.
- Loop configuration is saved and loaded with the graph. New nodes start with both limits blank in the panel.
- Deleting a loop node also removes its body. Body entry and return nodes cannot be deleted individually.

## Display

- The canvas has no iteration panel. Iteration indices, completion reasons, and per-iteration data are available through engine query APIs; the application chooses how to display them.
- Execution glows, breakpoints, execution logs, and replay are general canvas features; see the [canvas README](../README.md).

## Tests

[startNodes.test.ts](../tests/startNodes.test.ts) covers body creation, nesting, serialization, deletion, `isLoopBody`, and protection against deleting entry and return nodes.
