# Prim flow

English | [简体中文](README.zh-CN.md)

A visual programming toolkit built around nodes and connections. A single graph definition connects editing, execution, and debugging, making the toolkit suitable for embedded workflow editors, data processing tools, and AI workflow applications. The repository contains four libraries and a runnable React example.

Try the [live React example](https://lyx-pj.github.io/primflow-js/).

## Packages and capabilities

| Package                   | Purpose                                            | Documentation                                |
| ------------------------- | -------------------------------------------------- | -------------------------------------------- |
| `@lyx-pj/primflow-model`  | Define workflow data structures                    | [README](packages/primflow-model/README.md)  |
| `@lyx-pj/primflow-engine` | Execute workflows                                  | [README](packages/primflow-engine/README.md) |
| `@lyx-pj/primflow-canvas` | Edit workflows visually with English or Chinese UI | [README](packages/primflow-canvas/README.md) |
| `@lyx-pj/primflow-react`  | Use workflows in React applications                | [README](packages/primflow-react/README.md)  |

Nodes can subscribe to business events and request their own execution. The engine supports backoff retries for safe-to-rerun nodes, fallback outputs, and upstream re-execution along a traced linear input path. A retryable read from task state uses the consumer's retry policy. See the [engine documentation](packages/primflow-engine/README.md).

Nodes are created and restored using their registered definition IDs. The definition name supplies the default title for each instance. Graph files store configured inputs in `inputValues` and connect output ports to input ports by ID. See the [node model](packages/primflow-model/README.md).

Use `defineNode` to declare ports, `defineExecutor` to infer the execution context from a node, and `defineService` to declare engine services and their dependencies. See the [engine example](packages/primflow-engine/README.md#define-an-executor).

Applications can register structured types and stream ports. The canvas, graph files, and engine share the same model type rules. The React example includes local image, PDF, and text-stream nodes. See [data types](packages/primflow-model/README.md#register-data-types) and [stream execution](packages/primflow-engine/README.md#live-progress-and-stream-ports).

## Quick start

Install the packages in an existing React 18 or 19 project:

```bash
npm install @lyx-pj/primflow-react @lyx-pj/primflow-canvas @lyx-pj/primflow-engine
```

Add the following to `App.tsx` to mount an editor:

```tsx
import { NodeRegistry } from '@lyx-pj/primflow-canvas'
import { createGraphContext, GraphView } from '@lyx-pj/primflow-react'

const { GraphProvider, useGraph } = createGraphContext(new NodeRegistry())

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

This example mounts the editor. See the [React guide](packages/primflow-react/README.md) to register custom nodes and connect workflow execution. For execution without a UI, construct an `Engine` with a `NodeRegistry`, call `engine.loadGraph(json)`, then `engine.start()`. See the [engine guide](packages/primflow-engine/README.md).

## Run the repository example

After cloning the repository, install Node.js and pnpm, then run:

```bash
pnpm install
pnpm dev
```

Open the URL printed in the terminal to try the example application.
Double-click blank canvas space and choose **Basic input** to add data-only nodes, including JSON arrays and objects. Downstream nodes read their values on demand. Get Variable under **Variables** also reads the current task state on demand. See the [React example guide](examples/primflow-react/README.md).

Dropping a new connection or a selected link's endpoint on blank canvas opens a palette limited to nodes with a compatible port. The draft connection stays visible until a node is chosen or the edit is cancelled; the added node and link are one undoable edit.

A data input can connect to multiple outputs. The engine prefers a source on the current execution path. See [data source selection](packages/primflow-engine/README.md#multiple-data-sources-for-one-input).

Nodes can read and update [task state](packages/primflow-engine/README.md#task-state). Each startup or event task gets its own state.

Select a Loop node to set its iteration cap and timeout. Inside the body, Loop Entry exposes the initial input and the current iteration input as separate outputs. See [Editing loop bodies](packages/primflow-canvas/docs/loops.md).

## Architecture

The engine keeps [structured execution logs](packages/primflow-engine/docs/execution-trace.md) with individual node results and the upstream outputs a waiting task needs.

Nodes can [wait for a business response](packages/primflow-engine/README.md#business-interruptions) during execution. The canvas distinguishes failure, cancellation, skipped branches, and business interruptions with [node glows](packages/primflow-canvas/README.md).

See [Architecture](docs/architecture.md) for module responsibilities, terminology, data ownership, and the execution flow.

## Current limitations

- Files are stored in the browser's IndexedDB. Cloud synchronization and collaborative editing are not provided.
- Execution history stays in memory and does not persist across processes.
- Stopping cancels scheduling and requests node cleanup, but does not undo requests or external writes already made.
- Loops have one form: the loop body decides when to stop. Subgraph parameter ports must be configured in code.

## Common commands

| Command                             | Purpose                                                                                    |
| ----------------------------------- | ------------------------------------------------------------------------------------------ |
| `pnpm dev`                          | Start the example using library source files                                               |
| `pnpm dev:dist`                     | Build the libraries, start the example using their build output, and watch library changes |
| `pnpm build`                        | Build all libraries and check package boundaries                                           |
| `pnpm build:all`                    | Build the entire workspace, including the example                                          |
| `pnpm typecheck`                    | Check TypeScript types throughout the repository                                           |
| `pnpm lint` / `pnpm test`           | Lint code / run tests                                                                      |
| `pnpm format` / `pnpm format:check` | Format files / check formatting                                                            |
| `pnpm clean`                        | Remove build output                                                                        |

## License

MIT
