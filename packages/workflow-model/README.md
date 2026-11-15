# @lyx-pj/workflow-model

English | [简体中文](README.zh-CN.md)

Workflow data definitions. This package describes nodes, ports, links, variables, and complete graphs so that the canvas and engine share the same understanding of a workflow.

## Define a node

```ts
import { Node, NodeRegistry, type ExecutorFn } from '@lyx-pj/workflow-model'

class Echo extends Node {
  static definition = {
    title: 'Echo',
    inputs: [
      { name: 'exec', type: 'exec' },
      { name: 'text', type: 'string' },
    ] as const,
    outputs: [
      { name: 'exec', type: 'exec' },
      { name: 'text', type: 'string' },
    ] as const,
  }

  static executor: ExecutorFn = ({ getInput, setOutput, next }) => {
    setOutput('text', getInput<string>('text') ?? '')
    return next(['exec'])
  }
}

const registry = new NodeRegistry().register('Echo', Echo)
```

`definition` describes the node's appearance: its title and input/output ports. `exec` ports determine execution order; data ports such as `string`, `number`, and `any` carry values.

`executor` describes the node's behavior: `getInput` reads inputs, `setOutput` writes outputs, and `next` triggers downstream nodes. The registration name `Echo` must match the graph's `nodeType`, or the engine cannot find the node.

A node class can appear multiple times in a graph. Each occurrence is a `NodeInstance` with its own id, position, and values.

Nodes that establish connections or listen for events can implement `onActive` / `onDeactivate` / `onDestroy` to initialize and release resources on startup and stop. See “Node lifecycle” in the [engine README](../workflow-engine/README.md).

## Workflow data

A workflow can be saved as JSON and passed to the canvas for display or the engine for execution:

| Field | Contents |
| --- | --- |
| `nodes` | Nodes with their types, positions, ports, and values |
| `links` | Connections identifying source and target ports |
| `variables` | Variable table |
| `subgraphs` | Embedded subgraphs indexed by id |
| `viewport` | Canvas position and zoom |

See [types.ts](src/types.ts) for all fields.

Built-in nodes include `Start`, `End`, `Subgraph`, and the loop nodes `Loop`, `LoopEntry`, and `LoopReturn`. `NodeRegistry` provides them directly; use `register` to add custom nodes.

## Loops and subgraphs

- Loop configuration and body connections: [Loop nodes](docs/loops.md)
- Subgraph parameter ports and storage structure: [Subgraph data and ports](docs/subgraphs.md)

## Use with other packages

`model` defines data and nodes; it does not execute or render them:

- [workflow-engine](../workflow-engine/README.md) reads `JsonGraph` and executes nodes along connections.
- [workflow-canvas](../workflow-canvas/README.md) reads and edits `JsonGraph`, displaying nodes and links.
- React applications use [workflow-react](../workflow-react/README.md) to mount the canvas and engine in components.

The canvas and engine share `Node` and `NodeRegistry` from model, allowing node definitions to be reused in both.

## Development

Run from the repository root:

```sh
pnpm --filter @lyx-pj/workflow-model typecheck
pnpm --filter @lyx-pj/workflow-model lint
```

This package has no standalone tests. After changing nodes, ports, or JSON fields, run consumer tests that use those definitions:

```sh
pnpm --filter @lyx-pj/workflow-engine exec vitest run tests/boundaries.test.ts
pnpm --filter @lyx-pj/workflow-canvas exec vitest run tests/startNodes.test.ts
```
