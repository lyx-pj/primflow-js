# @lyx-pj/primflow-canvas

English | [简体中文](README.zh-CN.md)

Web canvas for editing and displaying Primflow graphs and execution results, with built-in English and Chinese UI.

## Mount the canvas

```ts
import { NodeRegistry } from '@lyx-pj/primflow-model'
import { Graph } from '@lyx-pj/primflow-canvas'

const registry = new NodeRegistry()
const graph = new Graph(registry, { background: '#000', gridSize: 10 })

const dispose = graph.mount(document.getElementById('app')!, {
  'selection:changed': (selection) => console.log(selection),
})

graph.openPalette() // Open the node palette manually
graph.closeMenus()  // Close all open menus and panels

// Clean up when the component unmounts or page is destroyed
dispose()
```

Common graph operations: `graph.toJSON()` / `graph.fromJSON(json)` to export and load graphs, `graph.zoom(scale)` to zoom, and `graph.select(node)` / `graph.clearSelection()` to manage selection.

## UI language

Select the UI language via `GraphOptions.language` (`'en'` or `'zh'`, defaulting to `'en'`), and update it with `setOptions`:

```ts
const graph = new Graph(registry, { language: 'zh' }) // Set Chinese at initialization
graph.setOptions({ language: 'en' })                  // Switch to English dynamically
```

## Dynamic ports and constraints

The canvas manages Switch node `case_*` ports:

```ts
graph.addSwitchCase(node)                     // Append case_N_value / case_N
graph.removeSwitchCase(node, 'case_2_value')  // Remove ports and links; return false for the last case
```

## Configure the UI

Configure UI modules via `GraphOptions` or `graph.setOptions()` (pass `false` to disable a module):

- `palette`: configure palette trigger, available node items, categories, and defaults.
- `contextMenu`: configure context menu items and default actions.
- `nodePanel`: configure panel width, visible `sections`, or a custom `render` function.
- `debugPanel`: configure panel visibility, execution `runs`, and `logs`.
- `toolbar`: configure custom toolbar action buttons.

```ts
const graph = new Graph(registry, {
  palette: {
    trigger: true,       // Open on blank double-click; pass false to disable
    connectOnDrop: true, // Open filtered palette when dropping a link on blank space
    items: (graph) => graph.nodeRegistry.getNodeClasses(),
  },
  nodePanel: {
    width: 320,
    sections: ['header', 'meta', 'inputs', 'outputs', 'execution', 'progress'],
  },
  debugPanel: {
    open: false,
    runs: [],
    logs: [],
  },
  toolbar: {
    actions: [
      { id: 'run', label: 'Run', onClick: () => {} },
    ],
  },
})
```

## Custom editors

Register `port` (on the node card) and `panel` (in the node panel) editors for a data type via `graph.editors.register(dataTypeId, ...)`:

```ts
import { html } from '@lyx-pj/primflow-canvas'

graph.editors.register('media.image@1', {
  port: {
    width: 140,
    render: (ctx) => html`<button @click=${() => ctx.setValue({ assetId: 'img-1' })}>Pick image</button>`,
  },
  panel: {
    render: (ctx) => html`<img class="preview" src=${ctx.value?.url} />`,
  },
})
```

- `port` and `panel` renderers receive the current `value` and `setValue` callback; `port` renderers also receive an `overlay` host for floating UI.
- Re-registering the same type merges scopes. Control width can be set via `editorWidth` on a port or `width` on the port editor.

## Custom node renderers

Customize a node card's content via `graph.renderers.register(definitionId, ...)`:

```ts
import { html } from '@lyx-pj/primflow-canvas'

graph.renderers.register('example.preview', {
  layout: 'custom', // 'body' (keeps built-in header and ports) or 'custom' (owns full body, requires size)
  size: { width: 220, height: 120 },
  render: (ctx) => html`<div class="card">${ctx.node.title}</div>`,
})
```

## Execution state, debugging, and replay

The canvas does not call the engine directly; the application synchronizes engine state to the canvas:

- `graph.setNodeState(nodeId, state)` / `graph.clearNodeStates()`: update node execution states (e.g., running, completed, failed, skipped, interrupted).
- `graph.setNodeProgress(nodeId, text)`: update live progress text in the node panel.
- `graph.enterReplay(json, options)` / `graph.exitReplay()`: enter or exit read-only historical replay.

## Subgraphs and loops

- Embedded subgraphs and loop bodies are entered and exited via `graph.enterSubgraph(node)` / `graph.exitSubgraph()`; external subgraphs use the `navigation` callback.
- `subgraph` and `loop` call nodes render as collapsible preview cards by default (persisted in `JsonNode.collapsed`) and can be overridden with custom renderers.
- See [Subgraphs and navigation](docs/subgraphs.md) and [Editing loop bodies](docs/loops.md) for configuration and preview cache details.
