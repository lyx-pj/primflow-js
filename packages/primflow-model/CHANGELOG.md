# @lyx-pj/primflow-model

## 3.0.0

## 2.0.1

### Patch Changes

- a92bd5d: Include the source repository and package directory in npm metadata so consumers can trace each package to its source and verify its build provenance.

## 2.0.0

### Major Changes

- Use `defineNode` to declare custom nodes in place of the `Node` class export. When upgrading existing graph files, rename each node's `nodeType` to `definitionId`, `type` to `kind`, `values` to `inputValues`, and `subgraphId` to `targetGraphId` before loading the graph. Apply the same conversion to nodes in embedded subgraphs. The model also exposes a shared registry for structured data and stream types.

### Minor Changes

- 5d248f2: Render subgraph call nodes as fixed-size cards with a live preview instead of the standard node body. Expanded cards are 280×180, collapsed cards are 200×56, and the collapsed state persists as `JsonNode.collapsed`. Previews reuse the canvas node renderers and port editors in a hidden paper, exclude breakpoints and execution state, and never recurse into nested subgraphs. Applications supply external subgraph JSON with `setSubgraphSources` / `updateSubgraphSource`; `renderThumbnail(json, container, options)` renders any view without modifying the live graph. Graph JSON stores no preview image.

## 1.1.0

### Minor Changes

- Use version tags for releases and GitHub Pages deployments.

## 1.0.0

### Major Changes

- Rename the published packages to `@lyx-pj/primflow-*`. Update package installation and imports to use the new names.
