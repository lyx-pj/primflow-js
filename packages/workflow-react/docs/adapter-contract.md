# React and canvas integration

English | [简体中文](adapter-contract.zh-CN.md)

The React package connects the canvas and engine to component mounting, updates, and unmounting. [canvas](../../workflow-canvas/README.md) provides menus, node panels, and the debug panel. The application handles file storage and execution controls.

See the [React README](../README.md) for usage and [Architecture](../../../docs/architecture.md) for module relationships.

## Layer responsibilities

| Layer | Responsibility |
| --- | --- |
| canvas | Create the canvas, manage nodes and links, bind canvas events, and display menus and panels |
| react | Provide `GraphProvider`, `EngineProvider`, and `GraphView`, retaining instances used by components |
| Application | Register business nodes, execute workflows, save files, and pass engine results to the canvas |

The canvas does not call the engine directly. The application supplies node states, logs, and history.

## Mounting and unmounting

`GraphView` requires a `graph` prop and a defined height, either directly or through its parent container. It calls `graph.mount` internally and invokes the returned cleanup function on unmount.

The core approach is shown below; see [GraphView](../src/components/graph-view/graph-view.tsx) for the complete implementation:

```tsx
useEffect(() => {
  const container = containerRef.current
  if (!container) return
  return graph.mount(container, () => handlersRef.current, optionsRef.current)
}, [graph])
```

- `GraphProvider` retains the same `Graph` instance during a mount.
- `EngineProvider` retains the same `Engine` and calls `stop()` on unmount. Use `whenStopped()` to await asynchronous cleanup.
- Event handlers read the latest callbacks rather than stale props.
- Do not reimplement canvas menus in React or manipulate JointJS internals directly.

## Canvas capabilities

canvas owns mounting, event names, serialization, zoom, subgraph navigation, replay, and UI configuration. See the [canvas README](../../workflow-canvas/README.md) for the full API:

| Action | API |
| --- | --- |
| Mount the canvas | `graph.mount(container, handlers, options)`, returning a cleanup function |
| Save or load a graph | `graph.toJSON()` / `graph.fromJSON(json)` |
| Zoom and select nodes | `graph.zoom(scale)`, `graph.select(node)`, `graph.clearSelection()` |
| Enter or leave an embedded subgraph | `graph.enterSubgraph()` / `graph.exitSubgraph()` |
| Return to a source file | `graph.setOptions({ navigation })`; see [Subgraphs and navigation](../../workflow-canvas/docs/subgraphs.md) |
| Replay history | `graph.enterReplay(json, options)` / `graph.exitReplay()` |
| Menus and panels | Configure `palette`, `contextMenu`, `nodePanel`, `debugPanel`, and `toolbar`; use `false` to disable |

`handlers` uses `Graph` event names such as `node:click` and `selection:changed`, not JointJS event names. It can be a callback map or a function returning the latest callback map.

The application should pause autosave when entering replay and resume it on exit. The canvas displays historical content and restores the editing graph; it does not store task history.

## Build

Packages import through public entry points. Consumers install canvas, engine, and React. The React package keeps them external during bundling to avoid duplicate node classes.

`pnpm build` checks source dependencies, type declarations, and build output. See [verify-boundaries.mjs](../../../scripts/verify-boundaries.mjs). Run `pnpm verify` to execute the checks separately.

## Related tests

- [React tests](../tests/index.test.ts): instance stability and engine resource cleanup on unmount.
- [Canvas interaction tests](../../workflow-canvas/tests/ui.test.ts): menus, panels, replay, and interaction cleanup.
- Shared-class tests in [engine](../../workflow-engine/tests/boundaries.test.ts) and [canvas](../../workflow-canvas/tests/boundaries.test.ts): ensure packages use the same node classes.

Add tests for new `GraphView` behavior. Existing React tests mainly cover Providers.
