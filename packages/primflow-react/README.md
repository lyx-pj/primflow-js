# @lyx-pj/primflow-react

English | [简体中文](README.zh-CN.md)

Use the canvas and engine in React applications. This package provides `GraphProvider`, `EngineProvider`, and `GraphView` to manage mounting and unmounting. Menus, node panels, and the debug panel come from [canvas](../primflow-canvas/README.md); the application handles file storage and execution controls.

## Mount the canvas

```tsx
import { NodeRegistry } from '@lyx-pj/primflow-canvas'
import { createGraphContext, GraphView } from '@lyx-pj/primflow-react'

const registry = new NodeRegistry()
const { GraphProvider, useGraph } = createGraphContext(registry, {
  background: '#18181b',
  gridSize: 10,
})

function Editor() {
  const graph = useGraph()
  return <GraphView graph={graph} height={480} />
}

export default function App() {
  return (
    <GraphProvider>
      <Editor />
    </GraphProvider>
  )
}
```

- `createGraphContext` takes a node registry and canvas options, returning `GraphProvider` and `useGraph`.
- `GraphView` requires an explicit `graph` prop; it does not read a Context you created yourself.
- The container needs a defined height. `GraphView` defaults to `height="100%"`, which requires a parent with a computable height.

This example mounts only the editor. Add the engine when you need workflow execution.

To register application editors, pass the object form instead of plain canvas options. The editors are registered before the first node renders, so a port control always exists when the canvas builds it.

```ts
const { GraphProvider, useGraph } = createGraphContext(registry, {
  canvas: { background: '#18181b' },
  editors: (editors) => {
    editors.register('media.image@1', {
      port: {
        render: (ctx) => html`
          <button
            @click=${(evt) => ctx.overlay.open({
              anchor: evt.currentTarget,
              render: () => html`<input type="file" />`,
            })}
          >Pick</button>
        `,
      },
    })
  },
})
```

See [canvas custom editors](../primflow-canvas/README.md#custom-editors) for the editor API.

The same object form takes `nodeRenderers` to replace the built-in content of a
node definition. Registering both is common: editors decide how a port value is
edited, and renderers decide how the node looks.

```ts
const { GraphProvider, useGraph } = createGraphContext(registry, {
  canvas: { background: '#18181b' },
  nodeRenderers: (renderers) => {
    renderers.register('ImageFile', {
      size: { width: 196, height: 104 },
      render: ({ node }) => html`<div class="image-card">${node?.title}</div>`,
    })
  },
})
```

See [canvas custom node renderers](../primflow-canvas/README.md#custom-node-renderers) for the renderer API.

## Connect the engine

```ts
import { Engine, NodeRegistry } from '@lyx-pj/primflow-engine'
import { createEngineContext } from '@lyx-pj/primflow-react'

const registry = new NodeRegistry()
export const { EngineProvider, useEngine } = createEngineContext(() => new Engine(registry))
```

Wrap components that need execution with `EngineProvider`. Children use `useEngine()` to access the same engine instance. The canvas and engine must register the same custom node types.

The application connects them: read `graph.toJSON()`, assemble standalone subgraphs, call `engine.loadGraph()` and `engine.start({ debug })`, and convert engine events into canvas display states. See the [example's events.ts](../../examples/primflow-react/packages/workflow/events.ts) for a complete integration.

`EngineProvider` does not automatically execute workflows or display execution states on the canvas.

## API and lifecycle

| API | Purpose |
| --- | --- |
| `createGraphContext(registry, options?)` | Create `GraphProvider` and `useGraph`; `options` takes canvas options, or `{ canvas, editors, nodeRenderers }` to also register application editors and node renderers |
| `createEngineContext(createEngine)` | Create `EngineProvider` and `useEngine` |
| `GraphView` | Mount the canvas; accepts `graph`, dimensions, className, event callbacks, and view options |

- Provider instances stay stable across renders. Do not repeatedly call `createGraphContext` / `createEngineContext` inside component render functions.
- `useGraph()` / `useEngine()` must run within the corresponding Provider or they throw.
- `EngineProvider` calls `engine.stop()` on unmount. Use `engine.whenStopped()` when asynchronous resource cleanup must finish.
- `GraphView` reads the latest callbacks when events fire, avoiding stale props.
- The engine factory creates and configures an engine for the Provider. Start the engine in application code after mounting. Use `graph.setOptions()` to update canvas options.
- `GraphView` passes view options to the mounting process; changing a prop does not guarantee instance reconstruction.

`GraphView` supports callbacks such as `onNodeClick`, `onNodeDoubleClick`, `onNodeSelection`, and `onBlankClick`. See [GraphViewProps](src/components/graph-view/graph-view.tsx) for all props. Use Graph APIs for port and canvas interactions.

## License

MIT
