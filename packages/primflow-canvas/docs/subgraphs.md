# Subgraphs and navigation

English | [简体中文](subgraphs.zh-CN.md)

The canvas distinguishes embedded subgraphs from external references and handles entering, returning, and display. See [model subgraph data and ports](../../primflow-model/docs/subgraphs.md) for JSON structure and Start port rules, and [engine subgraph parameters](../../primflow-engine/docs/subgraphs.md) for parameters and execution.

## Embedded subgraphs and external references

| Node state | Canvas behavior |
| --- | --- |
| A `subgraph` node has no `targetGraphId` | Generate an id and create an embedded region |
| A `targetGraphId` matches a region in the current graph | Treat as an embedded subgraph; double-click to edit |
| A `targetGraphId` has no matching region in the current graph | Treat as an external reference. No empty region is created and `enterSubgraph()` does not enter it. The application opens, saves, and injects its content for execution |

When creating an embedded subgraph, the canvas generates a `Start` with parameter ports and an `End` with a `result` data port. Their IDs are `start-<subgraphId>` and `end-<subgraphId>`. External references save only the id; the application manages files.

## Start node rules

Ordinary main graphs and subgraphs retain at least one `Start` as an execution entry. The canvas inserts one when creating or clearing a graph, or loading an ordinary region without Start. Loop bodies use `LoopEntry` / `LoopReturn` and do not receive an ordinary `Start`.

- Main graphs allow multiple Start nodes. Deletion through the context menu, Delete / Backspace, or `graph.removeNodes()` preserves the last Start.
- Bulk deletion of all Start nodes preserves the first in the main graph's node list while removing other selected nodes normally. Existing Start / End deletion protection in subgraphs remains in effect.
- `graph.clear()` returns to the main graph, clears undo history, and creates a Start. Automatically inserted Start nodes are not added to undo history.
- When opening a standalone subgraph as a file, the application preserves parameter ports with `graph.fromJSON(json, { keepStartPorts: true })`. Main graphs use the default and retain only execution outputs.

## Back navigation

The application provides a return path to external views through `navigation`:

```ts
graph.setOptions({
  navigation: {
    canGoBack: () => sourceViews.length > 0,
    goBack: () => openSourceView(),
  },
})
```

`graph.canGoBack()` checks for an embedded parent or external source. `graph.goBack()` exits embedded subgraphs before calling the application's `goBack`. Blank-space right-button double-click, back menus, the toolbar back button, and `Esc` share this navigation. Context menus wait about 300ms to detect a second right click; late menu events are suppressed after returning. Navigation is disabled during replay, and `Esc` exits replay first.

The application saves edits, handles asynchronous switching failures, and refreshes navigation options. Pass `navigation: null` on unmount to remove callbacks. The navigation path is not stored in graph JSON, files, or undo history. Returning first exits embedded levels within the current file, then delegates to the application at the file root. After a successful return, the application consumes one source-path entry and restores the source's embedded region if it still exists. A save failure neither switches files nor consumes the path. A target loading failure preserves its stored data and pauses autosave.

## Container node panels

The toolbar button controls the node panel, which starts open, and selecting a container node, whether an embedded subgraph or external reference, does not open it automatically. If the panel is already open, selecting a container shows its settings. Double-clicking into a subgraph or loop body keeps the panel open and returns it to the graph overview until a node is selected in the new view. External subgraph loading does not control the panel, so a failed asynchronous switch leaves the current content in place.

## Tests

- [startNodes.test.ts](../tests/startNodes.test.ts): embedded creation, Start port preservation, saving and loading.
- [viewport.test.ts](../tests/viewport.test.ts), [ui.test.ts](../tests/ui.test.ts): back navigation, menus, and panel interactions.
- [replay.test.ts](../tests/replay.test.ts): disabled navigation during replay and editing graph restoration on exit.
- [previewCache.test.ts](../tests/previewCache.test.ts), [subgraphPreviewManager.test.ts](../tests/subgraphPreviewManager.test.ts), [regionSchematic.test.ts](../tests/regionSchematic.test.ts): cache keys, persisted payload validation, embedded first-frame schematics, instant cache mounts, and background revalidation.
