# Subgraph data and ports

English | [简体中文](subgraphs.zh-CN.md)

Subgraphs can be embedded in their owning graph's `JsonGraph.subgraphs`, or saved by the application as standalone files referenced by a calling node's `subgraphId`. This document describes their JSON structure and `Start` port rules. See [engine subgraph parameters](../../workflow-engine/docs/subgraphs.md) for parameter passing and [canvas subgraphs and navigation](../../workflow-canvas/docs/subgraphs.md) for entering and returning.

## JSON structure

`JsonGraph.subgraphs` stores embedded regions by id. Each region contains nodes, links, and a viewport:

```ts
type JsonGraph = {
  // ...
  subgraphs: Record<string, {
    nodes: JsonNode[]
    links: JsonLink[]
    viewport: { x: number; y: number; zoom: number }
  }>
}
```

See [types.ts](../src/types.ts) for field definitions.

The meaning of `JsonNode.subgraphId` depends on the current graph:

| Does the graph contain a region with that id? | Meaning |
| --- | --- |
| Yes | An embedded subgraph that can be opened for editing |
| No | An external subgraph reference; the canvas does not create an empty region. The application opens its content or injects it before execution |

A `Loop` body is also a region in `subgraphs`, but uses `LoopEntry` / `LoopReturn`; see [Loop nodes](loops.md).

## Start port handling

`Start`, ordinary subgraphs, and loop bodies use different entry protocols. Loading cannot uniformly remove or preserve data ports:

| Region | Port rules |
| --- | --- |
| Main graph `Start` | Keep only execution outputs |
| Embedded ordinary subgraph `Start` | Keep data ports with an explicit `type` as subgraph parameter inputs |
| Standalone subgraph opened as a file | The application calls `graph.fromJSON` with `keepStartPorts: true` to preserve parameter ports |
| Loop body | Uses `LoopEntry`, not `Start` |

By default, `normalizeStartNodes` keeps only execution outputs and removes links to ports that no longer exist. With `keepDataPorts: true`, it preserves explicitly defined data ports. The main graph's `Start` only triggers execution; it does not automatically receive startup business data. See [normalizeStartNodes.ts](../src/shared/normalizeStartNodes.ts). The engine uses `keepDataPorts: true` when loading embedded subgraphs; the canvas exposes it as `fromJSON(json, { keepStartPorts })`.

Normalization clears `Start.values` and uses stable execution output IDs, defaulting to `out-start`. The main graph has no parameter source and keeps the default behavior; only subgraph entries preserve parameters.

## Ordinary subgraph inputs and outputs

Ordinary subgraphs receive parameters through `Start` and return results through `End`. A subgraph node in the parent graph invokes the subgraph: its input ports receive parameters and its output ports expose returned values. By default, `End` has only an execution input. Add data ports through the node definition or graph JSON when results must be returned.

`LoopEntry` / `LoopReturn` do not participate in ordinary subgraph parameter mapping. The engine applies those rules only to `start` entries and `end` exits. See [engine subgraph parameters](../../workflow-engine/docs/subgraphs.md) for name matching, type checks, and when results are written back.
