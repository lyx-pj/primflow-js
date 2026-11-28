# @lyx-pj/primflow-model

English | [简体中文](README.zh-CN.md)

Data model and type definitions for workflows: nodes, ports, connections, data types, and graph JSON.

## Define nodes

```ts
import { defineNode, NodeRegistry } from '@lyx-pj/primflow-model'

const Echo = defineNode({
  executor: 'example.echo',
  definition: {
    name: 'Echo',
    inputs: [
      { name: 'exec', type: 'exec' },
      { name: 'text', type: 'string', editor: 'textarea' },
    ],
    outputs: [
      { name: 'done', type: 'exec' },
      { name: 'text', type: 'string' },
    ],
  },
})

const registry = new NodeRegistry().register('Echo', Echo)
```

- `definition.name`: default instance title; `definition.kind`: node kind (`'default'`, or built-ins like `'subgraph'`, `'loop'`).
- `definition.executionMode`: `'step'` (default) or `'source'` (event source node).
- `executor`: execution function or executor name resolved by the engine.
- Port fields:
  - `name`: key for code lookup and `inputValues`; `label`: display label; `type`: data type or `'exec'` / `'spacer'`.
  - `editor`: `'select'` or `'textarea'` for string inputs; `editorWidth`: override control width.
  - `showPort` / `showInput` / `showLabel`: toggle port, inline control, and label visibility; `labelPosition: { x, y }` adjusts label offset.
- `NodeStyle.ports`: customize port appearance via `colors`, `shapes` (`circle`, `square`, `diamond`, `triangle`, `hexagon`, `bars`, `arrow`), and `input.port.r` / `output.port.r`.
- `definition.valueOutputs`: data-only nodes (without `exec` ports) can map outputs to inputs or task state, e.g. `{ value: { input: 'value', fallback: 0 } }`.

## Register data types

```ts
import { defineDataType, defineStreamType, NodeRegistry, schema } from '@lyx-pj/primflow-model'

const Image = defineDataType({
  id: 'media.image@1',
  schema: schema.object({
    assetId: schema.string(),
    mediaType: schema.enum(['image/png', 'image/jpeg']),
  }),
})

const ImageStream = defineStreamType({ id: 'media.image.stream@1', item: Image })

const registry = new NodeRegistry()
  .registerDataType(Image)
  .registerDataType(ImageStream)
```

- `validateGraphTypes(json, registry)`: validate data types and legacy graph compatibility before loading.
- Port type guards: `isControlPort(type)`, `isSpacerPort(type)`, `isDataPort(type)`, `isBuiltinDataType(type)`.

## Graph data structures

- `JsonGraph`: contains `nodes`, `connections`, `variables`, `subgraphs`, `viewport`.
- `JsonNode`: contains `id`, `definitionId`, `kind`, `title`, `position`, `inputValues`, `data` (application JSON config, read via `ctx.data`), `collapsed`, `targetGraphId`.
- `JsonConnection`: contains `source` (output port) and `target` (input port).

## Subgraphs and loops

- See [Subgraph data and ports](docs/subgraphs.md) for subgraph structure and `Start` port rules.
- See [Loop structure](docs/loops.md) for loop node configuration and port rules.
