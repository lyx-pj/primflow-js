# Internal workflow module for the example

English | [简体中文](README.zh-CN.md)

This application integration module belongs to `workflow-react-example` and is imported through relative paths. It is not a standalone workspace package and is not published separately. It connects the general-purpose libraries to the example's nodes, files, execution controls, logs, and autosave.

## Files and responsibilities

| Entry | Responsibility | Example tests |
| --- | --- | --- |
| [index.ts](index.ts) | Expose Providers, hooks, and file types to the page | Integration tests |
| [context/graph-context.ts](context/graph-context.ts) | Canvas options, node defaults, palette, panels, and toolbar | `debug.test.ts`, `nodes.test.ts` |
| [context/engine-context.ts](context/engine-context.ts) | Create Runtime and Engine Context | `nodes.test.ts` |
| [nodes/index.ts](nodes/index.ts), [nodes/catalog.ts](nodes/catalog.ts) | Register nodes and define categories, keywords, and defaults | `nodes.test.ts`, `events.test.ts`, `timer.test.ts`, `loop.test.ts` |
| [use-workflow.ts](use-workflow.ts) | File management, restoration, autosave, and React lifecycle | `autosave.test.ts`, `restore.test.ts`, `subgraphs.test.ts` |
| [storage.ts](storage.ts) | IndexedDB CRUD for files and metadata | `storage.test.ts` |
| [views.ts](views.ts) | File naming, restoration validation, and standalone subgraph Start id normalization | `views.test.ts`, `restore.test.ts` |
| [subgraphs.ts](subgraphs.ts) | Subgraph palette entries and recursive file assembly before execution | `subgraphs.test.ts` |
| [events.ts](events.ts) | Toolbar actions, engine-to-canvas event bridge, and replay | `debug.test.ts` |
| [debug.ts](debug.ts) | Temporary logs and execution chains per task | `debug.test.ts` |
| [records.ts](records.ts) | Capture execution sources, record titles, and event listener locations | `records.test.ts` |
| [scopes.ts](scopes.ts) | Derive node titles, subgraph scopes, and roles from task graphs | `scopes.test.ts` |

All tests live in the application's [tests/](../../tests). Run them from the repository root with the filter `workflow-react-example`.

## Integration flows

**Language**: at startup the application picks the first supported `zh` / `en` tag from `navigator.language` / `navigator.languages`. Page copy, the node palette, node definitions, toolbar actions, and the built-in canvas UI share that language; unsupported languages fall back to English. Language only affects display: node types, protocol values, and saved graph JSON are unchanged, and custom titles in files are preserved.

**Editing and saving**: Graph changes → `useWorkflow` marks the file pending → save to the current file after 600ms. Save the source file before switching. On first startup the stored file is read before the canvas is revealed (`booting` shows a loading overlay), so the default canvas does not flash; failed restoration preserves stored data. Autosave pauses while replay displays a historical graph.

**Editing navigation**: Double-click an external subgraph → `useWorkflow.openSubgraph()` records the source file id and embedded level → save the source and switch. The Hook supplies canvas `navigation` callbacks. Return actions such as blank-space right-button double-click exit embedded levels before returning to the source file. The path stays in a session ref, outside graph JSON, file storage, and undo history. Selecting a file directly or creating one clears it; a failed save on return retains it for retry.

**Execution and subgraphs**: Toolbar action → `events.ts` requests an execution graph → `subgraphs.ts` reads standalone subgraphs and assembles them recursively → `engine.fromJSON()` / `process({ debug })`. Independently saved files differ from the engine's embedded execution graph. Do not save the runtime assembly result back to source files.

**Observation and replay**: Engine task events → record logs, execution chains, sources, and node scopes by taskId → convert them to canvas display data. Historical tasks from stopped sessions can be replayed; leaving replay restores the editing graph. The engine owns task state; canvas neither collects nor persists logs.

## Subgraph scopes and debug records

- Execution chains indent by subgraph level and distinguish call nodes, entries, internal nodes, and exits. Logs include subgraph names to identify their sources.
- The application resolves node names and subgraph locations using the graph saved at execution time. Existing records keep those names after editing files are switched.
- Execution state updates locate records by task and node so that subgraph call completion does not overwrite the last internal node's state.
- Related types are `DebugScope` and `DebugChainKind`; see [scopes.ts](scopes.ts). Execution chains display subgraph hierarchy but cannot collapse by subgraph.

## Add a business node

1. Add a `Node` subclass under `nodes/` with ports and an executor. Resource nodes use lifecycle hooks; persistent event sources declare `executionMode: 'source'`.
2. Register the type name in `nodes/index.ts`. The graph's `nodeType` must match it.
3. Add the category, description, search keywords, and demonstration defaults to `nodes/catalog.ts`. canvas reads this application information through callbacks.
4. Add behavior tests under the application's `tests/`, covering inputs, outputs, execution branches, and applicable stop and resource cleanup scenarios.
5. Update node capabilities and usage examples in the [example README](../../README.md).

Node definitions and catalog copy use English as the source: Chinese lives in the second argument of `localize` and in `demoNodeCopies`'s `zh` entries. Example code comments are in English.

See [Concat.ts](nodes/Concat.ts) for a local computation node, and [Event.ts](nodes/Event.ts) / [Timer.ts](nodes/Timer.ts) for events and resources. Loops use model's built-in control nodes and engine's loop protocol.

## Data boundaries and validation

Files use IndexedDB `bpgraph/views`. The localStorage key `bpgraph:lastViewId` stores only the most recent file id. Debug logs and execution chains are bounded in-memory records, not saved files or a persistent audit trail.

```sh
pnpm --filter workflow-react-example exec vitest run tests/autosave.test.ts tests/subgraphs.test.ts
pnpm --filter workflow-react-example typecheck
pnpm --filter workflow-react-example lint
```

Reuse `tests/helpers.ts`, `fake-storage.ts`, and `fake-indexeddb.ts`. Do not use real external services to validate local example nodes.
