# Prim flow React example

English | [简体中文](README.zh-CN.md)

Run from the repository root:

```sh
pnpm dev
```

By default, the application loads workflow library source files directly. Use `pnpm dev:dist` to validate library build output.

This application demonstrates how to integrate the libraries; it is not a standalone cloud workflow service. See the root [README](../../README.md) for capabilities and limitations, and the [internal workflow documentation](packages/workflow/README.md) for nodes, files, and event flows.

The example follows the browser language: `packages/workflow/i18n.ts` reads `navigator.language` / `navigator.languages` and uses the first supported language to localize page copy, the node palette and definitions, toolbar actions, and the built-in canvas UI (through `GraphOptions.language`). Unsupported languages fall back to English. There is no in-app language switcher, and language only affects display, not protocol values or saved graph data.

## GitHub Pages

The [online example](https://lyx-pj.github.io/primflow-js/) uses the `/primflow-js/` base path. To preview the same build locally, run from the repository root:

```sh
pnpm build
pnpm --filter primflow-react-example build --base=/primflow-js/
pnpm --filter primflow-react-example preview --base=/primflow-js/
```

Open `/primflow-js/` on the preview server. Workflows remain stored in each visitor's browser through IndexedDB; Pages does not provide shared server storage.

## Code structure

`src/App.tsx` directly composes `GraphProvider`, `EngineProvider`, and `GraphView` with a minimal canvas layout.
`src/components/ViewSwitcher.tsx` provides the top-left file selector, grouping ordinary views and subgraphs using a Headless UI Listbox and Tailwind.
`src/components/ViewNameDialog.tsx` provides the centered file name dialog shared by creation and renaming. Headless UI Dialog handles the overlay, focus trap, and Esc dismissal; form controls use Field / Label / Input / Button.
`useWorkflow` connects workflow events, file switching, and autosave.

Workflow-related example code lives in `packages/workflow`, keeping nodes and their configuration together:

```text
packages/workflow/
├── index.ts                  # Shared entry point used by the example
├── context/
│   ├── graph-context.ts      # Canvas context, node defaults, and panel options
│   └── engine-context.ts     # Execution engine context
├── i18n.ts                   # Browser language detection, app copy, and language override
├── nodes/                    # Definitions, executors, registration, and catalog.ts
├── events.ts                 # Toolbar actions, breakpoints, states, and debug panel bridge
├── debug.ts                  # Temporary logs and execution chains isolated per task
├── records.ts                # Execution sources and titles captured at task creation
├── scopes.ts                 # Node titles and subgraph scopes resolved from task graphs
├── storage.ts                # IndexedDB access and type detection for view/subgraph files
├── views.ts                  # File ids, default names, validation, and subgraph Start ids
├── subgraphs.ts              # Palette entries and file assembly before execution
└── use-workflow.ts           # Events, file switching, and autosave in the React lifecycle
```

Here, `packages/workflow` is internal to the example and uses relative imports. General-purpose model, engine, canvas, and React adapters still come from the root repository's `packages/*`.

## Views and subgraph files

See [model subgraph data and ports](../../packages/primflow-model/docs/subgraphs.md), [engine subgraph parameters](../../packages/primflow-engine/docs/subgraphs.md), and [canvas subgraphs and navigation](../../packages/primflow-canvas/docs/subgraphs.md) for data, parameters, and navigation respectively.

After double-clicking a standalone subgraph node to edit its file, return to the source file with two consecutive right-button clicks on blank canvas space, the Back button, the context menu, or `Esc`. Nested file visits return one level at a time. If entered from a loop body, returning restores that embedded level. Navigation paths exist only for the current session. Direct file selection, file creation, or deletion of the current file clears them; deleting a source file removes its path entries. The current file is saved before returning. A failed save keeps the file and path unchanged; a failed load still allows returning to the source and does not overwrite the failed file's stored data.

Workflows are saved as separate files. The top-left selector lists ordinary views and subgraphs separately and marks the current file with a leading checkmark. Subgraphs are independent files that can be created, renamed, deleted, or opened separately. Canvas subgraph nodes reference only their file id; double-clicking a node or selecting a file opens it. The New item at the end of the list opens a centered dialog for a name and a choice of ordinary view or subgraph. New subgraphs contain Start and End and open immediately after creation. Each file stores its nodes, links, variables, and viewport independently; subgraphs are not saved inside their callers. The file list lives in IndexedDB's `bpgraph/views` store, with metadata distinguishing views and subgraphs. Reopening the page restores the last file; a loading overlay covers the canvas until that file is read, so the default canvas does not flash first. Embedded regions are saved with their owning view and entered by double-click; standalone subgraphs are saved separately and referenced by calling nodes.

Workflows save automatically 600ms after canvas content or viewport changes, including zoom and pan. The bottom-right indicator shows pending, saving, saved, or failed. `Ctrl/Cmd + S` saves immediately. Switching first saves edits to the current file so they are not written to the destination. The toolbar supports Run, Debug, Resume, and Stop. Before execution, referenced standalone subgraphs are read from storage and assembled recursively, including references within subgraph files. The toolbar's sidebar icon toggles the right-hand debug panel, which displays execution records, node execution chains, and logs, including Debug Output node content. Records include only stopped runs; the current run does not appear until Stop is clicked, even if its nodes have finished. Record titles identify their source: Run [view name], Run [Subgraph] [subgraph name], or Run event [listener node] [event name]. Names are captured at task creation and do not change when switching editing files. Selecting a finished record displays its task logs and chain and replaces the canvas with that task graph's historical snapshot. Hovering a node shows that execution's Inputs / Outputs in a canvas card without changing the debug panel. Click the current record again, use Exit replay at the bottom left, or press Esc to restore the editing graph. Autosave pauses during replay to prevent historical snapshots from overwriting the current file. Loop bodies remain embedded in their owning files. Return through the toolbar's Back button, blank-space right-button double-click, the blank-space context menu's Back action, or `Esc`. Inside loop bodies, blank-space context menus wait about 300ms to detect the second right click. On macOS with Smart Zoom enabled, a two-finger double-tap triggers system zoom rather than two right-click events. Use two two-finger clicks, disable Smart Zoom, or use Back / `Esc`.

Execution and debugging start through `engine.process({ debug })` without default business data.
An ordinary view's Start triggers downstream nodes through a single execution output and does not show Inputs/Outputs in the node panel; configure business data in business nodes. Standalone subgraph Start nodes can preserve explicit parameter ports for caller arguments.

## Demo nodes

Double-click blank canvas space or use the context menu to open the palette. It supports category filters, searching by name or purpose, clicking to add, and dragging to add. Business nodes include demonstration defaults.

| Category | Nodes | Demonstrates |
| --- | --- | --- |
| Basic input | Text Input, Number Input, Toggle Input | String, number, and boolean ports and editors |
| Text processing | Concatenate Text, Text Template, Split Text | String processing, `{{value}}` replacement, array and count outputs |
| Calculation | Arithmetic, Numeric Comparison | Dropdown options, arithmetic, and boolean results |
| Flow control | Start, Condition, Switch, Delay, Loop, Timer | Execution connections, boolean branches, dynamic cases, cancellable delays, subgraph-style loops, interval or daily triggers |
| Events | Event Emit, Event Listen | Emitting/listening to business events, independent tasks, lifecycle subscriptions and cleanup |
| Debug output | Debug Output | Arbitrary input types, execution data previews, and console logs |

All nodes registered by default execute locally without API keys or external services.
Condition uses a boolean input, so Numeric Comparison results can connect directly. Delay supports 0–60000ms and is cancelled on stop.
Subgraphs are not in the static node list. Once subgraph files exist, a Subgraphs category appears in the palette with one call-node entry per file, automatically binding its id and name when added.

Event nodes demonstrate engine tasks and lifecycle hooks. Timer demonstrates a persistent executor that repeatedly triggers downstream nodes:

- Event Emit calls `ctx.emitEvent(event, payload)`. Events create independent tasks; the emitting node does not wait for listeners.
- Event Listen has no execution input. In `onActive`, it uses `ctx.onEvent` to subscribe to the configured event name. Each event writes event data and received count in an independent task context and calls `next()`. `onDeactivate` unsubscribes; `onDestroy` clears state.
- Timer belongs to flow control and neither subscribes to nor depends on events. Its executor waits for the next interval in seconds/minutes/hours or a daily HH:mm time, writes the trigger time and count, and calls `next()` to execute connected downstream nodes directly. Stopping cancels the wait through the task's `signal`. Configure the trigger mode, interval unit, and daily time in the node panel.

### Loop nodes

See [model loop nodes](../../packages/primflow-model/docs/loops.md), [engine loop execution](../../packages/primflow-engine/docs/loops.md), and [canvas loop bodies](../../packages/primflow-canvas/docs/loops.md) for nodes, execution, and editing respectively.

A loop is a subgraph-style container. Its node exposes execution and data ports, and its body is stored in the owning file's `subgraphs`. Adding a loop automatically creates a body containing Loop Entry and Loop Return. Double-click the loop node to edit internal nodes without first opening the node panel. On the first single click, the panel waits about 200ms to avoid flashing; if already open, selecting another node updates it immediately. Bodies are saved with their files, not separately. Return with the toolbar's Back button, blank-space right-button double-click, the blank-space context menu's Back action, or `Esc`.

| Port | Direction | Description |
| --- | --- | --- |
| `exec` | Input | Enter the loop and execute according to its configuration |
| `input` | Input | Loop input: the first body's entry value |
| `done` | Output | Fires once after all iterations finish successfully |
| `output` | Output | Loop output: the value submitted by the last body iteration |

A loop exposes one execution entry and one execution exit. Iteration indices and completion reasons are maintained internally and available through loop query APIs. There is no dedicated iteration panel.

Automatically generated body ports:

| Node | Ports | Description |
| --- | --- | --- |
| Loop Entry | Outputs `exec`, `value` | Writes the entry value at the start of each iteration |
| Loop Return | Execution inputs `next` / `break`; data input `value` | Submits the result, which also becomes the next iteration's entry value |

Rules:

- A body must contain exactly one Loop Entry and at least one Loop Return, with no ordinary Start. Entry and return nodes are generated when the body is created, hidden from the palette, and protected from individual deletion. New bodies include `Loop Entry.exec → Loop Return.next`; replace this connection after adding business nodes.
- Loops have one form: the body runs repeatedly and decides when to end by reaching Loop Return's `break`. Nodes inside the body implement collection traversal, counting, and similar uses.
- Each iteration has separate node inputs, outputs, and execution states. Temporary values do not carry over; submit values through Loop Return's `value` to the next Loop Entry's `value`.
- Iterations run sequentially. Missing returns, duplicate returns, or unresolved data dependencies fail the task without starting the next iteration.
- If the body never reaches `break`, the iteration limit raises `LoopLimitExceeded`, without publishing partial results or firing `done`.
- New loop configuration contains only `version: 1`. The engine's default limit is 1000 iterations.
- Bodies can contain ordinary nodes, subgraph calls, or nested loops. Event sources such as Event Listen and Timer are rejected by validation before execution and hidden from the palette inside bodies.

Example workflow; connect both execution and corresponding data ports:

- Start → Arithmetic → Loop: connect Arithmetic's result to the loop's initial value (`input`) and the loop's completion output to Debug Output after the loop. Inside the body, connect Loop Entry exec → Arithmetic exec; Loop Entry value → Arithmetic value A; Arithmetic completion → Numeric Comparison exec; Numeric Comparison result → Condition condition; Condition true → Loop Return break; Condition false → Loop Return next; Arithmetic result → Loop Return value. Configure the nodes to increment the value each iteration and stop above a threshold. The loop output is the last iteration's value.

Try these five workflows, connecting both execution and corresponding data ports:

- Start → Split Text → Text Template → Debug Output: connect the split count to the template replacement value, then template text to output content.
- Start → Number Input → Arithmetic → Numeric Comparison → Condition → Debug Output: connect data results in order and select a branch through the true/false execution outputs.
- Start → Event Emit → Debug Output, with Event Listen connected to another Debug Output: the listener outputs event data in an independent task. Repeated emissions increment its received count.
- Start → Timer → Debug Output: connect trigger time to output content. Execution repeatedly outputs at the configured interval or daily time and increments trigger count. Stopping prevents further triggers.
- Start → Arithmetic → Loop → Debug Output: wire the body as above. The body decides when to end each iteration, and completion fires only after the loop ends.

Categories, descriptions, keywords, and defaults live in `nodes/catalog.ts`. The canvas reads display information through `palette.describe`, keeping the general-purpose model separate from demo business logic.
Node icons use the Remix Icon font loaded by the example entry point through `remixicon/fonts/remixicon.css`. Vite bundles font files without relying on an external CDN.
If a saved file contains unregistered node types, the application reports that the view cannot be restored and preserves the stored file. Autosave pauses for that view. Switch to another view to continue editing, or use `Ctrl/Cmd + S` to overwrite it with the current canvas.

## Validation

Run from the repository root:

```sh
pnpm --filter primflow-react-example typecheck
pnpm --filter primflow-react-example test
pnpm --filter primflow-react-example lint
pnpm --filter primflow-react-example build
```

For a local change, start with `pnpm --filter primflow-react-example exec vitest run tests/autosave.test.ts` and substitute the relevant test file. Autosave and restoration, storage, standalone subgraphs, debugging, nodes, and UI each have corresponding tests.
