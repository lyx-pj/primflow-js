# @lyx-pj/workflow-canvas

English | [简体中文](README.zh-CN.md)

Edit and display workflows in the browser: nodes, connections, menus, panels, execution states, and history replay. Built-in UI supports English and Chinese.

## Mount the canvas

```ts
import { NodeRegistry } from '@lyx-pj/workflow-model'
import { Graph } from '@lyx-pj/workflow-canvas'

const registry = new NodeRegistry()
const graph = new Graph(registry, { background: '#000', gridSize: 10 })

const dispose = graph.mount(document.getElementById('app')!, {
  'selection:changed': (selection) => console.log(selection),
})

// Open manually when needed
graph.openPalette()
graph.closeMenus()

// Unmount
dispose()
```

`mount` returns a cleanup function. Call it when the component unmounts or the page is destroyed.

## UI language

The application selects the language through `GraphOptions.language`. Use `'en'` for English or `'zh'` for Chinese; the default is English. Browser language is never consulted, and the canvas has no language switch control.

```ts
const graph = new Graph(registry, { language: 'zh' })
graph.setOptions({ language: 'en' })
```

Language is independent per canvas. Updating it refreshes open built-in menus, panels, status labels, and accessibility text. Node titles, port labels, custom toolbar actions, and log messages supplied by the application stay unchanged. Language is a view option and is not saved in graph JSON.

## Canvas features

| Feature | Description |
| --- | --- |
| Add nodes | Double-click blank space to open the palette; click or drag to add a node. |
| Node menu | Right-click a node to copy, delete, paste, add nodes, or set breakpoints. |
| Toolbar | Includes undo/redo buttons and application-defined actions. |
| Editing | Move nodes, connect ports, and edit port values. |
| Zoom and pan | Scroll to pan; drag with Space + left button or the right button. Pinch or use `Ctrl/⌘ + wheel` to zoom from 20% to 500%. |
| Zoom controls | At the bottom center. Click the percentage to reset to 100% while retaining the current pan position. |
| Minimap | At the top right, scaled to all nodes. Clicking pans without changing zoom. |
| Start nodes | Main graphs and ordinary subgraphs retain at least one Start. Loop bodies use entry and return nodes; see [Subgraphs and navigation](docs/subgraphs.md). |
| Breakpoints | Set through the context menu and saved with the graph. Pausing requires the application to start the engine with `process({ debug: true })`. |
| Switch branches | Add or remove case ports with `addSwitchCase` / `removeSwitchCase`. |

The canvas manages Switch node `case_*` ports:

```ts
graph.addSwitchCase(node)                     // Append case_N_value / case_N
graph.removeSwitchCase(node, 'case_2_value')  // Remove ports and links; return false for the last case
```

New indices use the largest existing index plus one, so removing a middle case does not produce duplicate port names.

## Configure the UI

```ts
const graph = new Graph(registry, {
  palette: {
    // Open on blank-space double-click; false disables automatic triggering
    trigger: true,
    // Available nodes; defaults to all registered nodes
    items: (graph) => graph.nodeRegistry.getNodeClasses(),
    // The application supplies categories, descriptions, icons, and search keywords
    describe: (nodeClass) => ({
      category: 'Text processing',
      description: 'Concatenate two strings',
      iconClass: 'ri-link',
      keywords: ['text', nodeClass.type],
    }),
    // Business defaults belong in the application
    defaults: (nodeClass) => (nodeClass.type === 'Concat' ? { values: { string1: 'Hello' } } : undefined),
    // Append entries beyond items, such as one per subgraph file
    entries: (graph) => files.map((file) => ({
      nodeClass: graph.nodeRegistry.getNodeClass('subgraph'),
      title: file.name,
      category: 'Subgraphs',
      defaults: { subgraphId: file.id, title: file.name },
    })),
  },
  contextMenu: {
    icons: { copy: 'ri-file-copy-line', delete: 'ri-delete-bin-line' },
    // Custom items; omit to use built-in copy / delete / paste / add node actions
    items: (ctx) => [{ id: 'rename', label: 'Rename', iconClass: 'ri-edit-line', run: () => {} }],
  },
  nodePanel: {
    width: 320,
    // Application settings, evaluated only when switching nodes
    extra: (node) => (node.nodeType === 'custom' ? createCustomSettings(node) : null),
  },
  toolbar: {
    position: 'top-center',
    actions: [
      { id: 'run', label: 'Run', iconClass: 'ri-play-line' },
      { id: 'debug', label: 'Debug', iconClass: 'ri-bug-line' },
    ],
  },
})

// Actions without run emit events for the application to handle
graph.on('toolbar:action', (id) => {
  if (id === 'run') engine.process()
})
```

Set `palette`, `contextMenu`, `nodePanel`, `debugPanel`, or `toolbar` to `false` to disable it.

Customize styles through `--bpgraph-menu-*` CSS variables or by overriding `.bpgraph-menu*` classes. No separate CSS import is required.

The palette supports category filters and search. `entries` are not deduplicated by node class, allowing external resources such as subgraph files to appear as separate entries. Per-entry `defaults` take precedence over global `defaults`.

The `description` returned by `palette.describe` also appears at the bottom of the node panel. Start does not show Inputs / Outputs. Nodes without an icon use a built-in SVG placeholder. When `iconClass` is configured, the application must load the corresponding icon font.

## Display execution states

The application subscribes to engine events and passes states to the canvas:

```ts
engine.on('node:status:changed', (nodeId, status) => {
  graph.setNodeExecutionStatus(nodeId, status, engine.getNodeExecutionData(nodeId))
})

engine.on('status:changed', (status) => {
  graph.setExecutionStatus(
    status === 'running' || status === 'paused' ? status : 'idle',
    engine.pausedNode?.nodeId,
  )
})
```

- Pending nodes keep their normal appearance. Breakpoint nodes have a yellow glow, running nodes have a pulsing glow, and completed nodes become translucent with a green glow.
- Hovering a completed node shows its execution Inputs / Outputs. Breakpoint nodes show only prepared inputs and a paused-at-breakpoint label.
- The third argument to `setNodeExecutionStatus` is `{ inputs, outputs }`. Passing only a state displays a no-execution-data message.
- `graph.resetNodeExecutionStatuses()` clears all indicators.
- These states exist only in the temporary view; they are not written to graph JSON or undo history.

## Debug panel and history replay

Configuring `debugPanel` adds a sidebar button to the toolbar to open the right-hand debug panel. The application supplies all panel data; the canvas neither collects logs nor stores task history:

```ts
graph.setOptions({
  debugPanel: {
    width: 340,
    // Evaluated on opening or refreshDebugPanel(); a data snapshot also works
    data: () => ({
      records: engine.getTasks().map((task) => ({
        id: task.id,
        title: task.trigger.type === 'start' ? 'Run main workflow' : task.trigger.eventName ?? 'Event',
        status: task.status,
        startedAt: task.startedAt,
        endedAt: task.endedAt,
      })),
      chain: getTaskChain(selectedTaskId),
      logs: getTaskLogs(selectedTaskId),
    }),
    activeRecordId: selectedTaskId,
    onRecordSelect: (record) => {
      if (!record) {
        selectedTaskId = null
        graph.exitReplay()
        graph.refreshDebugPanel()
        return
      }
      selectedTaskId = record.id
      graph.enterReplay(engine.getTaskGraph(record.id)!, {
        label: record.title,
        nodeStatuses: Object.fromEntries(engine.getNodeStatuses(record.id)),
        nodeData: collectNodeData(engine, record.id),
      })
      graph.setOptions({ debugPanel: { activeRecordId: record.id } })
    },
  },
})

graph.refreshDebugPanel()
```

Clicking a finished execution record enters replay. The canvas replaces the editing graph with that execution's graph and shows a replay indicator at the bottom left. Dragging, connections, port editing, the palette, context menus, and toolbar buttons are disabled except for the debug panel toggle. Zoom, pan, and node hover remain available. Click the selected record again, use the indicator's exit button, or press Esc to restore the prior editing graph, viewport, and execution state.

- `graph.enterReplay(json, { label, nodeStatuses, nodeData })` / `exitReplay()` / `isReplayMode()` / `replayLabel` are the underlying APIs.
- Entering and leaving replay emit `replay:changed`. The application should pause autosave on entry and resume it on exit.
- Entering replay clears editing undo history; save edits beforehand if they must be retained.
- Only finished records (`completed` / `failed` / `cancelled`) can be selected for replay.
- Records display in the supplied order and support `waiting`, `running`, `paused`, `completed`, `failed`, and `cancelled`. Execution chains render in array order; if `label` is omitted, the current graph's node title is used.
- Log levels are `debug`, `info`, `success`, `warn`, and `error`.
- Control the panel with `openDebugPanel()` / `closeDebugPanel()` / `toggleDebugPanel()` / `isDebugPanelOpen()`. Setting `debugPanel: false` or removing its configuration closes it and removes the toolbar button.

## Subgraphs and back navigation

The application can provide a return path to external views through `navigation`:

```ts
graph.setOptions({
  navigation: {
    canGoBack: () => sourceViews.length > 0,
    goBack: () => openSourceView(),
  },
})
```

`graph.canGoBack()` and `graph.goBack()` exit subgraphs within the current file before delegating to the application's `goBack`. Blank-space right-button double-click, the toolbar back button, context menus, and Esc share this navigation. See [Subgraphs and navigation](docs/subgraphs.md) for return order, save failures, and asynchronous switching.

## Loop bodies

Adding a `loop` node automatically creates its body, entry, return, and the initial connection from entry to return. See [Editing loop bodies](docs/loops.md) for creation, editing, saving, and deletion.

## Development and tests

Run from the repository root:

```sh
pnpm --filter @lyx-pj/workflow-canvas test
pnpm --filter @lyx-pj/workflow-canvas typecheck
pnpm --filter @lyx-pj/workflow-canvas lint
```

| Test | Coverage |
| --- | --- |
| [ui.test.ts](tests/ui.test.ts) | Menus, palette, panels, toolbar, and interaction cleanup |
| [startNodes.test.ts](tests/startNodes.test.ts), [switchCases.test.ts](tests/switchCases.test.ts) | Graph constraints, loop creation, dynamic ports, and serialization |
| [portEditors.test.ts](tests/portEditors.test.ts) | Port editing and value display |
| [replay.test.ts](tests/replay.test.ts) | Historical views, read-only interactions, and restoration on exit |
| [executionPreviewState.test.ts](tests/executionPreviewState.test.ts) | Execution states, breakpoints, and node data |
| [viewport.test.ts](tests/viewport.test.ts), [minimap.test.ts](tests/minimap.test.ts) | Pan, zoom, minimap, and navigation |
| [boundaries.test.ts](tests/boundaries.test.ts) | Shared node classes and package dependencies |

Run a single file with `pnpm --filter @lyx-pj/workflow-canvas exec vitest run tests/replay.test.ts`. Tests use jsdom and an SVG shim; visual behavior still needs checking in the example in a browser. Review [React integration](../workflow-react/docs/adapter-contract.md) when changing the mounting API.
