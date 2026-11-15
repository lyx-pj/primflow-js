# @lyx-pj/workflow-react

English | [简体中文](README.zh-CN.md)

Use the canvas and engine in React applications. This package provides `GraphProvider`, `EngineProvider`, and `GraphView` to manage mounting and unmounting. Menus, node panels, and the debug panel come from [canvas](../workflow-canvas/README.md); the application handles file storage and execution controls.

## Mount the canvas

```tsx
import { NodeRegistry } from '@lyx-pj/workflow-canvas'
import { createGraphContext, GraphView } from '@lyx-pj/workflow-react'

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

## Connect the engine

```ts
import { NodeRegistry, Runtime } from '@lyx-pj/workflow-engine'
import { createEngineContext } from '@lyx-pj/workflow-react'

const runtime = new Runtime(new NodeRegistry())
export const { EngineProvider, useEngine } = createEngineContext(runtime)
```

Wrap components that need execution with `EngineProvider`. Children use `useEngine()` to access the same engine instance. The canvas and engine must register the same custom node types.

The application connects them: read `graph.toJSON()`, assemble standalone subgraphs, call `engine.fromJSON()` and `engine.process({ debug })`, and convert engine events into canvas display states. See the [example's events.ts](../../examples/workflow-react/packages/workflow/events.ts) for a complete integration.

`EngineProvider` does not automatically execute workflows or display execution states on the canvas.

## API and lifecycle

| API | Purpose |
| --- | --- |
| `createGraphContext(registry, options?)` | Create `GraphProvider` and `useGraph`, with canvas options specified at creation |
| `createEngineContext(runtime, options?)` | Create `EngineProvider` and `useEngine` |
| `GraphView` | Mount the canvas; accepts `graph`, dimensions, className, event callbacks, and view options |

- Provider instances stay stable across renders. Do not repeatedly call `createGraphContext` / `createEngineContext` inside component render functions.
- `useGraph()` / `useEngine()` must run within the corresponding Provider or they throw.
- `EngineProvider` calls `engine.stop()` on unmount. Use `engine.whenStopped()` when asynchronous resource cleanup must finish.
- `GraphView` reads the latest callbacks when events fire, avoiding stale props.
- Factory options apply only when creating instances. Use `graph.setOptions()` for later configuration changes.
- `GraphView` passes view options to the mounting process; changing a prop does not guarantee instance reconstruction.

`GraphView` supports callbacks such as `onNodeClick`, `onNodeDoubleClick`, `onNodeSelection`, and `onBlankClick`. See [GraphViewProps](src/components/graph-view/graph-view.tsx) for all props. Use Graph APIs for port and canvas interactions without manipulating JointJS directly.

## Build

Consumers install canvas, engine, and React. This package keeps them external during bundling to avoid duplicate node classes.

`pnpm build` checks package boundaries. See [React integration](docs/adapter-contract.md) for the rules and [verify-boundaries.mjs](../../scripts/verify-boundaries.mjs) for the checks.

## Development and tests

Run from the repository root:

```sh
pnpm --filter @lyx-pj/workflow-react test
pnpm --filter @lyx-pj/workflow-react typecheck
pnpm --filter @lyx-pj/workflow-react lint
```

The existing [index.test.ts](tests/index.test.ts) covers instance stability in Strict Mode and engine cleanup on unmount. Add corresponding tests for new interactions. Run the root `pnpm build` when changing bundling or public exports.

## License

MIT
