---
"@lyx-pj/primflow-canvas": minor
"@lyx-pj/primflow-model": minor
---

Render subgraph call nodes as fixed-size cards with a live preview instead of the standard node body. Expanded cards are 280×180, collapsed cards are 200×56, and the collapsed state persists as `JsonNode.collapsed`. Previews reuse the canvas node renderers and port editors in a hidden paper, exclude breakpoints and execution state, and never recurse into nested subgraphs. Applications supply external subgraph JSON with `setSubgraphSources` / `updateSubgraphSource`; `renderThumbnail(json, container, options)` renders any view without modifying the live graph. Graph JSON stores no preview image.
