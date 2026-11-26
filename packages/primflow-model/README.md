# @lyx-pj/primflow-model

English | [简体中文](README.zh-CN.md)

Workflow data definitions. This package describes nodes, ports, links, variables, and complete graphs so that the canvas and engine share the same understanding of a workflow.

## Define a node

```ts
import { defineNode, NodeRegistry } from '@lyx-pj/primflow-model'

const Echo = defineNode({
  executor: 'example.echo',
  definition: {
    name: 'Echo',
    inputs: [
      { name: 'exec', type: 'exec' },
      { name: 'text', type: 'string' },
    ],
    outputs: [
      { name: 'done', type: 'exec' },
      { name: 'text', type: 'string' },
    ],
  },
})

const registry = new NodeRegistry().register('Echo', Echo)
```

`defineNode` preserves the literal types of inline port names and types. `definition.name` supplies the default title for instances. `definition.kind` selects framework behavior, such as `subgraph` or `loop`, and defaults to `default`. Execution ports determine execution order, while data ports carry values.

`executor` can be a colocated function or the name of an executor the engine resolves. A name lets the frontend share the node definition and the runtime supply the implementation. Use `defineExecutor(Echo, execute)` to infer the callback's ports from the node definition. See the [engine guide](../primflow-engine/README.md#define-an-executor).

`register(id, node)` supplies the stable definition ID, exposed as `registry.getDefinition(id).id`. You can register the same definition and ID again. Each distinct definition needs a unique ID. Use that ID in `graph.addNode(id)` and in the graph's `definitionId` field.

Each `NodeInstance` has its own `id`, position, and values. Its `definitionId` refers to the registered definition, and its optional title override is saved as `JsonNode.title`. Graph JSON requires `definitionId` and `kind` on nodes. Subgraph and loop calls use `targetGraphId` to reference their target. A subgraph call card's collapsed presentation is saved as `JsonNode.collapsed`; omitted means expanded.

`definition.executionMode` controls activation. It defaults to `step`, and event sources can declare `source`. A port's `type` describes the value or execution flow it carries. String inputs can select an editor with `editor: 'select'` or `editor: 'textarea'`.

Use `node.getInputPort(name)` and `node.getOutputPort(name)` to find the instance's effective ports. A port's `name` is used by code, `label` is displayed, and its `id` is unique within the node and referenced by links. `showPort`, `showInput`, and `showLabel` control whether the canvas draws the port, its input control, and its label. `labelPosition: { x, y }` offsets the label from its default position next to the port. `NodeStyle.ports.colors` sets the port outline colour and fills a connected port by data type, `ports.shapes` picks a `PortShape` (`circle`, `square`, `diamond`, `triangle`, `hexagon`, `bars`, `arrow`) per type, and `ports.input.port.r` / `ports.output.port.r` set the port radius per direction. Generic `any` ports default to a neutral slate hexagon. A link's `source` refers to an output and `target` to an input. Port ID spelling does not determine direction.

Graph JSON stores configured input values by port name in `inputValues`. Optional `data` stores application-supplied JSON configuration, including `false`, `0`, an empty string, or `null`, and is available as `ctx.data`. Executors use `ctx.getInput(name)` to read values resolved for the current execution.

For a data-only node, define a data input and a compatible data output, and map the output to the input in `definition.valueOutputs`. For example, `valueOutputs: { value: { input: 'value', fallback: 0 } }` declares that the `value` output reads its corresponding input on demand and uses `0` when the input is unset. This node can omit `executor` and has no `exec` ports.

To read task state on demand, declare `valueOutputs: { value: { input: 'name', read: (name, state) => state.values[String(name)] } }`. The reader receives the resolved input and a read-only task snapshot.

Nodes that establish connections or listen for events can implement `onActive` / `onDeactivate` / `onDestroy` to initialize and release resources on startup and stop. See “Node lifecycle” in the [engine README](../primflow-engine/README.md).

Executors can use `ctx.state` to read their starting task snapshot and stage business updates. See [task state](../primflow-engine/README.md#task-state) for commit and concurrency rules.

Scheduled executors can await a JSON response from the host application with `ctx.interrupt(value)`. See [business interruptions](../primflow-engine/README.md#business-interruptions).

Nodes can declare `retryPolicy` and `outputValidators`, and report structured failures with `NodeExecutionError`. The lifecycle methods `ctx.on` and `ctx.once` give each callback an event context that can request an executor activation. See the [engine documentation](../primflow-engine/README.md) for execution behavior.

## Register data types

```ts
import { defineDataType, NodeRegistry, schema } from '@lyx-pj/primflow-model'

const Image = defineDataType({
  id: 'media.image@1',
  schema: schema.object({
    assetId: schema.string(),
    mediaType: schema.enum(['image/png', 'image/jpeg']),
  }),
})

const registry = new NodeRegistry().registerDataType(Image)
```

Use `type: Image` in a `defineNode` port. Graph JSON saves `media.image@1`, and the canvas and engine must install the same definition. Use `schema.optional()` for optional fields, `schema.array()` to validate each element, and `schema.object()` for nested objects. Register a new versioned ID when type semantics change.

`registry.dataTypes.checkConnection()` checks port compatibility. `validateValue()` returns a field-level error. Named types match by ID. Ordinary value ports still allow `any` connections, and the concrete input validates the received value. `validateGraphTypes(json, registry)` returns type errors and legacy diagnostics before loading.

Use the exported predicates instead of comparing port type strings. `isControlPort(type)` matches `exec` and `spacer`, `isSpacerPort(type)` matches `spacer` only, and `isDataPort(type)` matches every other port. `isBuiltinDataType(type)` matches the built-in value types and excludes the control ports.

Custom values should survive graph serialization and task copying. Images and documents can use references that an application service resolves. Define stream ports with `defineStreamType({ id, item })` and register a custom item type first. Streams connect to matching stream ports. The graph file saves the link and type ID.

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

- [primflow-engine](../primflow-engine/README.md) reads `JsonGraph` and executes nodes along connections.
- [primflow-canvas](../primflow-canvas/README.md) reads and edits `JsonGraph`, displaying nodes and links.
- React applications use [primflow-react](../primflow-react/README.md) to mount the canvas and engine in components.

The canvas and engine share `defineNode` and `NodeRegistry` from model, allowing node definitions to be reused in both.

## Development

Run from the repository root:

```sh
pnpm --filter @lyx-pj/primflow-model typecheck
pnpm --filter @lyx-pj/primflow-model lint
```

This package has no standalone tests. After changing nodes, ports, or JSON fields, run consumer tests that use those definitions:

```sh
pnpm --filter @lyx-pj/primflow-engine exec vitest run tests/boundaries.test.ts
pnpm --filter @lyx-pj/primflow-canvas exec vitest run tests/startNodes.test.ts
```
