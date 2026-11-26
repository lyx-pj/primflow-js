# @lyx-pj/primflow-canvas

English | [简体中文](README.zh-CN.md)

Edit and display workflows in the browser: nodes, connections, menus, panels, execution states, and history replay. Built-in UI supports English and Chinese.

## Mount the canvas

```ts
import { NodeRegistry } from '@lyx-pj/primflow-model'
import { Graph } from '@lyx-pj/primflow-canvas'

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
| Add and connect | Drop a new connection or a selected link's endpoint on blank space to open a palette filtered to nodes with a compatible visible port. The node and link are created or replaced as one undoable edit. |
| Node menu | Right-click a node to copy, delete, or set breakpoints on executable nodes. |
| Toolbar | Includes undo/redo buttons and application-defined actions. It centers in the canvas area left of open side panels, and actions that no longer fit move into a More menu. |
| Editing | Move nodes, connect ports, and edit port values. A data input can retain multiple incoming links. See [engine source selection](../primflow-engine/README.md#multiple-data-sources-for-one-input). |
| Box selection | Press and drag from blank canvas space to select nodes and links. The rectangle follows the pointer when the canvas is embedded beside a sidebar or below a header. |
| Zoom and pan | Scroll to pan; drag with Space + left button or the right button. Pinch or use `Ctrl/⌘ + wheel` to zoom from 20% to 500%. |
| Zoom controls | At the bottom center. Click the percentage to reset to 100% while retaining the current pan position. |
| Minimap | At the bottom left, scaled to all nodes. Clicking pans without changing zoom. During replay it sits above the replay banner; the compact layout hides it. |
| Start nodes | Main graphs and ordinary subgraphs retain at least one Start. Loop bodies use entry and return nodes; see [Subgraphs and navigation](docs/subgraphs.md). |
| Breakpoints | Set through the context menu and saved with the graph. Pausing requires the application to start the engine with `start({ debug: true })`. |
| Switch branches | Add or remove case ports with `addSwitchCase` / `removeSwitchCase`. |

The canvas manages Switch node `case_*` ports:

```ts
graph.addSwitchCase(node)                     // Append case_N_value / case_N
graph.removeSwitchCase(node, 'case_2_value')  // Remove ports and links; return false for the last case
```

New indices use the largest existing index plus one, so removing a middle case does not produce duplicate port names.

Register custom types in the canvas `NodeRegistry`. Pin connections and the node panel's JSON editor share the type rules. Use `graph.getTypeDiagnostics()` to inspect the current graph, or pass it a `JsonGraph` to inspect a file. Hosts can call `graph.setNodeProgress(nodeId, text)` to update the live preview in the node panel.

## Configure the UI

```ts
const graph = new Graph(registry, {
  palette: {
    // Open on blank-space double-click; false disables automatic triggering
    trigger: true,
    // Offer the filtered add-and-connect palette after a connection is dropped outside a port
    connectOnDrop: true,
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
    defaults: (nodeClass) => (nodeClass.definitionId === 'Concat' ? { inputValues: { string1: 'Hello' } } : undefined),
    // Append entries beyond items, such as one per subgraph file
    entries: (graph) => files.map((file) => ({
      nodeClass: graph.nodeRegistry.getNodeClass('subgraph'),
      title: file.name,
      category: 'Subgraphs',
      defaults: { targetGraphId: file.id, title: file.name },
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
    extra: (node) => (node.definitionId === 'custom' ? createCustomSettings(node) : null),
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
  if (id === 'run') engine.start()
})
```

Set `palette`, `contextMenu`, `nodePanel`, `debugPanel`, or `toolbar` to `false` to disable it.

`toolbar.position` supports `top-left`, `top-center`, and `top-right`. The center and right positions stay inside the canvas area left of open side panels; when the bar no longer fits, trailing actions move into a More menu so it keeps a single row.

Customize styles through `--bpgraph-menu-*` CSS variables or by overriding `.bpgraph-menu*` classes. No separate CSS import is required.

### Port appearance

A port keeps its type colour on the outline, dimmed while nothing is connected,
and fills with the same colour at full strength once a link reaches it. A link
takes the colour of the port it joins, so a type is one colour wherever it
appears; a connection to an `any` port uses the concrete side's colour, while
two `any` ports use the generic data colour. Built-in types ship with a default colour and shape;
override them per type with `ports.colors` and `ports.shapes`. The shapes are `circle`, `square`, `diamond`, `triangle`,
`hexagon`, `bars`, and `arrow`. Execution ports default to `arrow`, typed data
ports to `circle`, and `any` to a neutral slate `hexagon`.

`ports.input.port.r` and `ports.output.port.r` set the port radius per
direction, and the execution port arrow scales with it.

```ts
const registry = new NodeRegistry({
  ports: {
    shapes: { 'media.image@1': 'square' },
    colors: { 'media.image@1': '#D55E00' },
    input: { port: { r: 4 } },
  },
})
```

Every port body carries `data-port-kind="data"` or `data-port-kind="exec"`, so
styling and tests can target port kinds without depending on the SVG element a
shape happens to use.

Hovering a port for a moment shows a canvas tooltip with its label and data
type; a port without a label falls back to its name. The short delay keeps a
quick pointer pass from flashing cards. The port body and label also carry
`data-port-name`, `data-port-label`, `data-port-type`, and
`data-port-direction` (`in` or `out`) for styling and tests.

A link's transparent hit area stops at the port edge, so a connected port still
receives hover and drag: the tooltip keeps working and dragging from the port
starts a new link. Clicking the visible line away from a port selects the link.

## Custom editors

Register an editor to control how a port value is edited. Editors are keyed by
port data type, so a node that uses a custom type gets its own control without
the canvas knowing anything about the domain.

```ts
import { html } from '@lyx-pj/primflow-canvas'

graph.editors.register('media.image@1', {
  // The compact control shown next to the port on the canvas
  port: {
    render: (ctx) => html`
      <button
        class="pick-image"
        @click=${(evt) => ctx.overlay.open({
          anchor: evt.currentTarget,
          placement: 'above',
          render: () => html`<img src=${ctx.value?.url} />`,
        })}
      >Pick</button>
    `,
    width: 32,
  },
  // The full control shown in the node panel
  panel: {
    render: (ctx) => html`<img class="preview" src=${ctx.value?.url} />`,
  },
})
```

A registered editor replaces the built-in control for that type, in the scope
it registers. The two scopes are independent: a canvas port has little room,
so it usually needs a different interaction than the node panel. Registering the
same type again merges the scopes instead of replacing them.

`port` and `panel` renderers receive the current value and a `setValue`
callback that writes back to the node. The port renderer also receives an
`overlay` host. Port controls render inside an SVG `foreignObject`, which clips
content that overflows it, so overlays render in a container attached to the
paper element instead. The application decides what the overlay shows and where
it opens.

Several overlays may be open at once, for example one per port. Each is
positioned against its own anchor, flips to the opposite side when the preferred
side has no room, and stays clamped inside the paper instead of running off an
edge. `open` returns a function that closes only that overlay.

The editor registry is independent from the data type registry. An editor
decides how a value is edited, not whether a port may connect to another port;
connection rules stay in the data type registry.

A port may declare `editorWidth` to override the width of its control, and a
registered port editor may declare `width` for every port of that type.

## Node panel

The right-hand node panel starts open and is controlled by the toolbar's node panel button; selecting a node does not open it automatically. The panel has **Node** and **Global settings** tabs:

- **Node** shows the settings of a single selected node. With no selection, or with multiple objects selected, it shows the graph overview. The overview lists every node in the current view; clicking one centers it and makes it the single selection.
- **Global settings** shows application-provided content; the canvas does not define global settings itself.
- The debug panel and node panel can be open together; the node panel shifts left to make room and the toolbar centers in the remaining canvas area. When the canvas itself is narrower than 768px, the compact layout applies instead: either panel becomes a full-width sheet below the toolbar, only one of them stays open, and the minimap is hidden. The layout uses measured panel widths, so configured widths, closed panels, and the debug offset are all reflected without breakpoints. The canvas container carries `data-bpgraph-compact="true"` in the compact layout, which applications can target when adapting their own chrome.

```ts
const graph = new Graph(registry, {
  nodePanel: {
    // Whether to open on first mount; defaults to true
    open: true,
    // Overview content without a single selected node; omit to list nodes in the current view
    overview: ({ graph, locateNode }) => html`${graph.getNodes().map((node) => html`<button @click=${() => locateNode(node)}>${node.title}</button>`)}`,
    // Global settings tab content; omit to show an empty state
    globalSettings: ({ language }) => html`<p>${language}</p>`,
  },
  debugPanel: true,
  toolbar: { actions: [] },
})
```

Use `openNodePanel()` / `closeNodePanel()` / `toggleNodePanel()` / `isNodePanelOpen()` to control visibility, and `refreshNodePanel()` to reevaluate application content. The `overview` context contains `graph`, `close`, `locateNode`, and `language`; `locateNode` selects a node and centers it on the canvas. The `globalSettings` context contains `graph`, `close`, and `language`. Both `close` callbacks hide the panel without changing the selection.

The node panel is enabled by default, so the toolbar appears by default. Set `toolbar: false` to hide the toolbar entirely; the Graph API can still open the panel. Setting `nodePanel: false` closes the panel and removes its toolbar button.

## Node panel sections

With a single node selected, the **Node** tab renders an ordered list of sections.
Supply `sections` to reorder them, hide the ones you do not want, or insert your own content.

```ts
const graph = new Graph(registry, {
  nodePanel: {
    sections: (node) => [
      'meta',
      // Omit 'inputs' to hide the built-in input controls
      'outputs',
      { id: 'audit', render: ({ graph, node }) => html`<p>Node ${node.id}</p>` },
    ],
  },
})
```

The built-in ids are `meta`, `extra`, `loopLimits`, `inputs`, `outputs`,
`retry`, `description`, `execution`, and `progress`. Omitting an id hides that
section, and returning an empty array leaves only the panel shell (header and tabs). An object
section renders without a wrapper, so the application controls its markup.

`execution` and `progress` show live execution state. Hiding them does not stop
the canvas from tracking that state; it only stops the panel from displaying it.

### Replace the whole content area

Provide `render` to take over everything inside the Node tab.

```ts
const graph = new Graph(registry, {
  nodePanel: {
    render: ({ node, close, language }) => html`
      <div class="my-panel">
        <h3>${node.title}</h3>
        <p>${language}</p>
        <button @click=${close}>Close</button>
      </div>
    `,
  },
})
```

The shell stays with the canvas: width and position, the scroll container, the
header and its close button, the tabs, the offset applied while the debug panel is open,
and the active language. The application owns only the content.

`render` takes precedence over `sections`, which is not called when `render` is
provided. Its context carries `graph`, `node`, `close`, and `language`.

## Custom node renderers

A node renderer replaces the built-in header and body for one node definition.

```ts
graph.nodeRenderers.register('ImageFile', {
  size: { width: 196, height: 104 },
  render: ({ node }) => html`
    <div class="image-card">
      <span>${node?.title}</span>
      <img src=${previewOf(node?.inputValues?.asset)} />
    </div>
  `,
})
```

The renderer owns the node content. The JointJS element and its ports are
unchanged, so links, selection, dragging, breakpoints, and execution visuals
keep working. `size` is required for a custom layout, because the default size
follows the built-in header and port rows.

The built-in header and body are removed once a renderer is registered. Set
`header: true` or `body: true` to keep either of them. The renderer receives the
current node instance, so it can draw values, and it re-renders when the node's
values, title, inputs, or outputs change. The canvas keeps a transparent
selection shape so it can still draw the selection outline around a
custom-rendered node; the application does not need to draw a selected state.

A renderer changes appearance only. Node behavior, port types, and connection
rules stay in the node registry and the data type registry.

### Port placement

By default a port keeps the built-in row layout, which follows the header
height and row spacing. A renderer can place ports itself with `portPosition`:

```ts
graph.nodeRenderers.register('ImageFile', {
  size: { width: 196, height: 104 },
  // Inputs on the left border, the output on the right border.
  portPosition: ({ group, index, width }) => ({
    x: group === 'in' ? 0 : width,
    y: group === 'in' ? 34 + index * 40 : 52,
  }),
  render: ({ node }) => html`<div class="image-card">${node?.title}</div>`,
})
```

Coordinates are node-local. Omit `x` to keep the built-in edge offset for the
port group, which is useful when only the vertical position needs to change.
Return `undefined` for a port to keep its row layout.

A port label still follows the port. A custom layout that draws its own
annotations can hide it with `showLabel: false`, or offset it with
`labelPosition: { x, y }` on the port definition.

A renderer can also place the inline control of a data port with
`portEditorPosition`, which takes the same context as `portPosition`:

```ts
graph.nodeRenderers.register('ImageFile', {
  size: { width: 196, height: 104 },
  portEditorPosition: ({ index }) => ({ x: 24, y: 30 + index * 28 }),
  render: () => html``,
})
```

A node whose declared `size` is too short for the ports left on the row layout
reports a one-time console warning naming the node. Ports placed with
`portPosition` are excluded, because their position is the renderer's choice.

The palette supports category filters and search. `entries` are not deduplicated by node class, allowing external resources such as subgraph files to appear as separate entries. Per-entry `defaults` take precedence over global `defaults`.

The palette also opens when a new connection or a selected link's endpoint is dropped outside a port. It lists only nodes with a visible port accepted by `graph.validateConnection`, connects the first compatible port, and records the new node plus link as one undo step. The draft connection stays visible while the panel is open; cancelling removes it, and choosing a node completes it without recreating the line. Re-routing an existing link replaces that link in the same undo step. `palette.connectOnDrop` turns this off. The connection panel is modal: only the panel, Esc, or its close button can finish or cancel the edit.

The `description` returned by `palette.describe` also appears at the bottom of the node panel. Start does not show Inputs / Outputs. Nodes without an icon use a built-in SVG placeholder. When `iconClass` is configured, the application must load the corresponding icon font.

The node panel shows the registry key as the definition ID and the selected node's own ID as the instance ID. A custom title appears in the heading, with the definition name below when it differs. Loop and subgraph nodes also show their behavior.

String inputs can choose `editor: 'select'` or `editor: 'textarea'`. Links are saved from output to input even when a drag begins at the input.

In the node panel, `array` and `object` inputs open a JSON code editor built on CodeMirror 6. The editor shows line numbers, JSON syntax highlighting, bracket matching, search and replace, and reports parse errors in the gutter. Edits are written back to the node value shortly after typing stops. Invalid JSON keeps the previous value, so a half-typed document never corrupts the node, and a valid document of the wrong shape (an object on an `array` port, for example) is rejected the same way.

The code editor follows the surrounding panel theme through the `--bpgraph-panel-*` variables. Undo and redo work inside the editor with the usual keyboard shortcuts, and the search panel opens with `Ctrl`/`Cmd` + `F`.

Node properties display the retry policy declared by the node class, including rerun eligibility, the retry limit, and the fallback output. Applications can show execution attempts in the debug panel log.

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
- Failed nodes glow red, cancelled nodes orange, and skipped nodes slate blue. Nodes waiting for a business response have a slow violet pulse. Each effect has an accessible status label.
- Hover over a node during a run or replay to see its execution status in text, including nodes that have not run. A retained status such as cancellation remains visible on hover after stopping.
- Completed nodes show their actual inputs and outputs on hover and in the node panel. An active breakpoint shows the prepared inputs. Start nodes show the status label.
- Pass `{ inputs, outputs }` as the third argument to `setNodeExecutionStatus` to provide port data. Include `attempt` to show how many times the node retried and why. Both views show the remaining retry budget during execution and indicate when it runs out.
- `graph.resetNodeExecutionStatuses()` clears all indicators.
- These states exist only in the temporary view; they are not written to graph JSON or undo history.

## Debug panel and history replay

Configuring `debugPanel` adds a console-icon debug panel button to the toolbar to open the right-hand debug panel. The application supplies all panel data; the canvas neither collects logs nor stores task history:

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
      // One entry per engine execution-log event
      logs: toLogEntries(engine.getTaskTrace(selectedTaskId)),
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

Clicking a finished execution record enters replay. The canvas replaces the editing graph with that execution's graph and shows a replay indicator at the bottom left. Dragging, connections, port editing, the palette, context menus, and toolbar buttons are disabled except for the debug panel toggle; the node panel closes because replay data is read-only. Zoom, pan, and node hover remain available. Click the selected record again, use the indicator's exit button, or press Esc to restore the prior editing graph, viewport, and execution state.

- `graph.enterReplay(json, { label, nodeStatuses, nodeData })` / `exitReplay()` / `isReplayMode()` / `replayLabel` are the underlying APIs.
- Entering and leaving replay emit `replay:changed`. The application should pause autosave on entry and resume it on exit.
- Entering replay clears editing undo history; save edits beforehand if they must be retained.
- Only finished records (`completed` / `failed` / `cancelled`) can be selected for replay.
- Records display in the supplied order and support `waiting`, `running`, `paused`, `completed`, `failed`, and `cancelled`.
- Logs form one ordered stream. Each entry carries `time`, `message`, and an optional `level` (`debug`, `info`, `success`, `warn`, `error`), `type` (the engine event type such as `activation:status`), `nodeId`, `scope`, and `activationId`. The panel shows `type` as a badge, the node title before the message, and indents subgraph entries by their scope depth. Entries without `type` fall back to the level label.
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

Adding a `loop` node automatically creates its body, entry, return, and the initial connection from entry to return. Select Loop to set its iteration cap and timeout in the node panel. See [Editing loop bodies](docs/loops.md) for wiring the initial and current iteration inputs.

## Development and tests

Run from the repository root:

```sh
pnpm --filter @lyx-pj/primflow-canvas test
pnpm --filter @lyx-pj/primflow-canvas typecheck
pnpm --filter @lyx-pj/primflow-canvas lint
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

Run a single file with `pnpm --filter @lyx-pj/primflow-canvas exec vitest run tests/replay.test.ts`. Tests use jsdom and an SVG shim; visual behavior still needs checking in the example in a browser. Review [React integration](../primflow-react/docs/adapter-contract.md) when changing the mounting API.
