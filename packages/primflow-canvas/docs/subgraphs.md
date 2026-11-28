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

## Container cards and previews (subgraph / loop)

Subgraph and `loop` call nodes render as collapsible preview cards by default. The collapsed state is persisted as `JsonNode.collapsed` (not part of undo history). During replay the toggle is disabled and previews use the replay JSON. An application renderer registered for `loop` or `subgraph` overrides the built-in card.

Previews never recurse. A subgraph call or loop call inside a preview is drawn as a generic card with its title, badge, ports, and collapse-aware size; a nested loop uses the generic loop card with a `Loop` badge.

The canvas does not read storage. Embedded subgraphs are read from the current graph model; external references need application-supplied JSON:

```ts
graph.setSubgraphSources({ [fileId]: subgraphJson })
graph.updateSubgraphSource(fileId, nextSubgraphJson)
graph.updateSubgraphSource(fileId, null)
```

The application refreshes a source after saving that subgraph file and removes it when the file is deleted. Missing sources show an empty preview.

Rendered previews are cached in memory per target and content. A card mounts the last preview for its target immediately, then rebuilds in the background and replaces it only when the rendered output changed. Switching views therefore shows the previous thumbnail on the first paint instead of the empty state. Entries from an incompatible cache version, invalid SVG markup, or an unknown target are ignored.

On a cold start without a memory cache, an embedded region (an embedded subgraph or loop body) first paints a synchronous structural schematic: up to 80 nodes and 160 links in reading order, with header-coloured rounded blocks, no hidden paper, and no font or image waits. The preview slot reports `data-preview-state="schematic"` until the live preview replaces it; a failed live build keeps the schematic. External subgraph references keep the persisted-cache or loading path.

Persistence is optional and application-owned. The canvas never reads storage directly; install an adapter and preload entries before restoring a view:

```ts
graph.setSubgraphPreviewCache({
  load: () => readPreviews(), // Record<targetId, CachedSubgraphPreview>
  save: (targetId, preview) => writePreview(targetId, preview),
  remove: (targetId) => deletePreview(targetId),
})
await graph.preloadSubgraphPreviews()
```

`load()` may be asynchronous: await `preloadSubgraphPreviews()` during startup, before the first card renders. Only external subgraph sources are persisted; embedded subgraphs and loop bodies belong to the current view, stay in memory, and never call the application's `save` or `remove`. The application owns storage location, retention, and cleanup, and `remove` is called when a source is deleted. A refreshed source keeps its previous persisted preview until the next render replaces it.

Any view JSON can be rendered with `graph.renderThumbnail(json, container, options)`, which returns `{ ready, dispose }` and never modifies the live graph. Graph JSON has no thumbnail field.

Assets that finish loading within 250ms are captured; images that finish later are not.

A preview draws at most 200 nodes and 400 links in reading order; dangling links are dropped and a `+N` badge reports omitted nodes. Cards render when visible and keep showing the previous preview while a new one is built.

## Container node panels

The toolbar button controls the node panel, which starts open, and selecting a container node, whether an embedded subgraph or external reference, does not open it automatically. If the panel is already open, selecting a container shows its settings. Double-clicking into a subgraph or loop body keeps the panel open and returns it to the graph overview until a node is selected in the new view. External subgraph loading does not control the panel, so a failed asynchronous switch leaves the current content in place.
