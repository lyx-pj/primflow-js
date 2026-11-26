# Internal workflow module for the example

English | [简体中文](README.zh-CN.md)

This application integration module belongs to `primflow-react-example` and is imported through relative paths. It is not a standalone workspace package and is not published separately. It connects the general-purpose libraries to the example's nodes, files, execution controls, logs, and autosave.

## Files and responsibilities

| Entry | Responsibility | Example tests |
| --- | --- | --- |
| [index.ts](index.ts) | Expose Providers, hooks, and file types to the page | Integration tests |
| [context/graph-context.ts](context/graph-context.ts) | Canvas options, node defaults, palette, panels, and toolbar | `debug.test.ts`, `nodes.test.ts` |
| [context/asset-editors.ts](context/asset-editors.ts) | Port and panel editors registered for the image data type | `e2e/workflow.e2e.ts` |
| [context/asset-preview.ts](context/asset-preview.ts) | Cached object URLs shared by the node-card and panel previews | `e2e/workflow.e2e.ts` |
| [context/node-renderers.ts](context/node-renderers.ts), [panel-sections.ts](context/panel-sections.ts) | Custom node cards for the demo and image nodes, and panel sections | `e2e/workflow.e2e.ts` |
| [context/engine-context.ts](context/engine-context.ts) | Assemble the engine, services, and executors for the Engine Provider | `executors.test.ts` |
| [nodes/index.ts](nodes/index.ts), [nodes/catalog.ts](nodes/catalog.ts) | Register nodes and define categories, keywords, and defaults | `nodes.test.ts`, `events.test.ts`, `timer.test.ts`, `loop.test.ts` |
| [executors/index.ts](executors/index.ts) | Executor implementations outside the node package | `executors.test.ts` |
| [executors/http.ts](executors/http.ts), [services/http.ts](services/http.ts) | HTTP node executor and browser Fetch service registered through `defineService` | `http.test.ts` |
| [use-workflow.ts](use-workflow.ts) | File management, restoration, autosave, and React lifecycle | `autosave.test.ts`, `restore.test.ts`, `subgraphs.test.ts` |
| [storage.ts](storage.ts) | IndexedDB CRUD for files, metadata, and rendered subgraph previews | `storage.test.ts` |
| [views.ts](views.ts) | File naming, restoration validation, and standalone subgraph Start id normalization | `views.test.ts`, `restore.test.ts` |
| [subgraphs.ts](subgraphs.ts) | Subgraph palette entries and recursive file assembly before execution | `subgraphs.test.ts` |
| [events.ts](events.ts) | Toolbar actions, engine-to-canvas event bridge, and replay | `debug.test.ts` |
| [debug.ts](debug.ts) | Convert engine execution logs into panel entries and own the business log channel | `debug.test.ts` |
| [records.ts](records.ts) | Capture execution sources, record titles, and event listener locations | `records.test.ts` |
| [scopes.ts](scopes.ts) | Derive node titles and subgraph scopes from task graphs | `scopes.test.ts` |

All tests live in the application's [tests/](../../tests). Run them from the repository root with the filter `primflow-react-example`.

## Integration flows

**Language**: at startup the application picks the first supported `zh` / `en` tag from `navigator.language` / `navigator.languages`. Page copy, the node palette, node definitions, toolbar actions, and the built-in canvas UI share that language; unsupported languages fall back to English. Language only affects display: node types, protocol values, and saved graph JSON are unchanged, and custom titles in files are preserved.

**Editing and saving**: Graph changes → `useWorkflow` marks the file pending → save to the current file after 600ms. Save the source file before switching. On first startup the stored file is read before the canvas is revealed (`booting` shows a loading overlay), so the default canvas does not flash; failed restoration preserves stored data. The Hook installs the IndexedDB preview-cache adapter and awaits `preloadSubgraphPreviews()` before restoring the file, so subgraph cards can paint cached images on the first frame. Autosave pauses while replay displays a historical graph.

**Editing navigation**: Double-click an external subgraph → `useWorkflow.openSubgraph()` records the source file id and embedded level → save the source and switch. The Hook supplies canvas `navigation` callbacks. Return actions such as blank-space right-button double-click exit embedded levels before returning to the source file. The path stays in a session ref, outside graph JSON, file storage, and undo history. Selecting a file directly or creating one clears it; a failed save on return retains it for retry.

**Execution and subgraphs**: Toolbar action → `events.ts` requests an execution graph → `subgraphs.ts` reads standalone subgraphs and assembles them recursively → `engine.loadGraph()` / `start({ debug })`. Independently saved files differ from the engine's embedded execution graph. Do not save the runtime assembly result back to source files.

**Observation and replay**: the panel's task records come from `engine.getTasks()` and its logs from `engine.getTaskTrace()`. Each `TaskTraceEvent` becomes one log entry, merged with the business log lines and ordered by time into a single stream. Execution records are listed per task; a running task appears as Running and switches to its final status when it ends. Records cannot be replayed while a task is running; leaving replay restores the editing graph. The engine owns task state; canvas neither collects nor persists logs.

**Manual approval** uses `ctx.interrupt()` in [the example node](nodes/Execution.ts). The [approval panel](../../src/components/ApprovalPanel.tsx) reads open requests from task snapshots and passes the user's boolean response to `engine.resumeInterrupt()`. When a task ends or is stopped, the panel removes its request.

## Debug panel and engine logs

- The panel does not subscribe to engine events to collect logs: records read `engine.getTasks()`, logs read `engine.getTaskTrace()`, and every trace event is converted into one panel entry.
- Each entry keeps the engine event type (`activation:status`, `task:status`, `loop:invocation`, ...), which the panel shows as a badge so node runs, retry waits, and loop frames are distinguishable.
- Retry failure details come from the engine's attempt records (`attempts[].failure`), including the error code, message, and rejected input source. The panel does not collect them separately.
- A business node writes its own output with `appendBusinessLog(taskId, message)`, which joins the same stream as an `app:log` entry.
- The application resolves node names and subgraph locations using the graph saved at execution time. Existing records keep those names after editing files are switched.
- Subgraph scopes come from [scopes.ts](scopes.ts); log entries are indented by level and prefixed with the subgraph name.

## Add a business node

1. Declare ports with `defineNode` under `nodes/`. Local logic can use an inline `executor` function. For separate implementations, name the executor in the node and bind it with `defineExecutor` under `executors/`. Resource nodes use lifecycle hooks, and persistent event sources declare `executionMode: 'source'`.
2. Register the definition ID in `nodes/index.ts`. The graph's `definitionId` must match it.
3. Register any separate executor and install its services in `context/engine-context.ts`. Add the category, description, search keywords, and demonstration defaults to `nodes/catalog.ts`. canvas reads this application information through callbacks.
4. Add behavior tests under the application's `tests/`, covering inputs, outputs, execution branches, and applicable stop and resource cleanup scenarios.
5. Update node capabilities and usage examples in the [example README](../../README.md).

Node definitions and catalog copy use English as the source: Chinese lives in the second argument of `localize` and in `demoNodeCopies`'s `zh` entries. Example code comments are in English.

See [Concat.ts](nodes/Concat.ts) for a local computation node, and [Event.ts](nodes/Event.ts) / [Timer.ts](nodes/Timer.ts) for events and resources. For a definition-only node, see [Print.ts](nodes/Print.ts) and [executors/index.ts](executors/index.ts). Loops use model's built-in control nodes and engine's loop protocol.

## Data boundaries and validation

Files use IndexedDB `bpgraph/views`. The localStorage key `bpgraph:lastViewId` stores only the most recent file id. Debug logs follow the engine's task retention and are not saved files or a persistent audit trail; business logs are bounded in-memory records.

```sh
pnpm --filter primflow-react-example exec vitest run tests/autosave.test.ts tests/subgraphs.test.ts
pnpm --filter primflow-react-example typecheck
pnpm --filter primflow-react-example lint
```

Reuse `tests/helpers.ts`, `fake-storage.ts`, and `fake-indexeddb.ts`. Do not use real external services to validate local example nodes.
