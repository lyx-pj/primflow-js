# @lyx-pj/primflow-canvas

## 2.0.1

### Patch Changes

- a92bd5d: Include the source repository and package directory in npm metadata so consumers can trace each package to its source and verify its build provenance.
- Updated dependencies [a92bd5d]
  - @lyx-pj/primflow-model@2.0.1

## 2.0.0

### Major Changes

- Use `defineNode` in place of the `Node` export and migrate graph JSON to the new model contract before calling `graph.fromJSON()`. Applications can register custom node renderers and port editors, and pass live task progress and execution results to the canvas.

### Minor Changes

- 466bd65: Add a JSON code editor for `array` and `object` node inputs. The node panel now renders a CodeMirror 6 editor with line numbers, JSON syntax highlighting, bracket matching, search and replace, and parse errors reported in the gutter. The editor writes the parsed value back to the node shortly after typing stops, and keeps the previous value while the document is invalid or does not match the port type. The editor follows the panel theme through the `--bpgraph-panel-*` variables. CodeMirror is now a runtime dependency of the canvas package.
- 083628d: Replace the node panel's selection-driven opening with a toolbar toggle and add Node / Global settings tabs. The panel is open by default; `nodePanel.open: false` starts it closed. The Node tab shows a single selected node or a graph overview when no single node is selected; the overview lists every node in the current view and centers/selects a node when clicked. Applications can provide `overview` and `globalSettings` renderers; the overview renderer receives a `locateNode` callback. Control the panel with `openNodePanel`, `closeNodePanel`, `toggleNodePanel`, `isNodePanelOpen`, and `refreshNodePanel`. The debug panel toggle now uses a console icon, and the toolbar is shown by default while the node panel is enabled.
- 5d248f2: Render subgraph call nodes as fixed-size cards with a live preview instead of the standard node body. Expanded cards are 280×180, collapsed cards are 200×56, and the collapsed state persists as `JsonNode.collapsed`. Previews reuse the canvas node renderers and port editors in a hidden paper, exclude breakpoints and execution state, and never recurse into nested subgraphs. Applications supply external subgraph JSON with `setSubgraphSources` / `updateSubgraphSource`; `renderThumbnail(json, container, options)` renders any view without modifying the live graph. Graph JSON stores no preview image.

### Patch Changes

- 083628d: Keep the selection outline visible for nodes that register an application node renderer. When the built-in body is not drawn, the node keeps a transparent selection shape for the highlighter.
- 083628d: Keep application-provided port editors mounted when a port value changes, and update the node instance before the joint model so value-dependent node renderers re-render with the new value. Custom port controls no longer disappear after a value update, including asset selections made in the node panel.
- Updated dependencies
- Updated dependencies [5d248f2]
  - @lyx-pj/primflow-model@2.0.0

## 1.1.0

### Minor Changes

- Use version tags for releases and GitHub Pages deployments.

### Patch Changes

- Updated dependencies
  - @lyx-pj/primflow-model@1.1.0

## 1.0.0

### Major Changes

- Rename the published packages to `@lyx-pj/primflow-*`. Update package installation and imports to use the new names.

### Patch Changes

- Updated dependencies
  - @lyx-pj/primflow-model@1.0.0
