# Prim flow

English | [简体中文](README.zh-CN.md)

Node-and-wire visual workflow library connecting editing, execution, and debugging with a single graph definition.

Live demo: [React Example](https://lyx-pj.github.io/primflow-js/)

## Packages

| Package | Purpose | Docs |
| --- | --- | --- |
| `@lyx-pj/primflow-model` | Node, port, data type, and graph definitions | [README](packages/primflow-model/README.md) |
| `@lyx-pj/primflow-engine` | Workflow execution engine | [README](packages/primflow-engine/README.md) |
| `@lyx-pj/primflow-canvas` | Web visual editor and debug canvas | [README](packages/primflow-canvas/README.md) |
| `@lyx-pj/primflow-react` | React 18/19 integration components | [README](packages/primflow-react/README.md) |

## Quick start

Install in a React project:

```bash
npm install @lyx-pj/primflow-react @lyx-pj/primflow-canvas @lyx-pj/primflow-engine
```

Mount a minimal editor:

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

## Run the example

```bash
pnpm install
pnpm dev
```

## Common commands

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Start the example app |
| `pnpm build` | Build all packages |
| `pnpm typecheck` | Run TypeScript typechecking |
| `pnpm lint` | Run linter |
| `pnpm test` | Run tests |

## License

MIT
