# @lyx-pj/primflow-model

[English](README.md) | 简体中文

工作流的数据模型与类型定义，用于描述节点、端口、连线、数据类型和图 JSON 结构。

## 定义节点

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

- `definition.name`：实例默认标题；`definition.kind`：节点类型（默认 `'default'`，框架内置 `'subgraph'`、`'loop'` 等）。
- `definition.executionMode`：`'step'`（默认）或 `'source'`（事件源节点）。
- `executor`：执行函数或由引擎解析的执行器名称。
- 端口字段：
  - `name`：代码查找与 `inputValues` 键名；`label`：显示名称；`type`：数据类型或 `'exec'` / `'spacer'`。
  - `editor`：字符串输入可选 `'select'` 或 `'textarea'`；`editorWidth`：覆盖控件宽度。
  - `showPort` / `showInput` / `showLabel`：控制是否显示端口、内联控件和标签；`labelPosition: { x, y }` 调整标签偏移。
- `NodeStyle.ports`：通过 `colors`、`shapes`（`circle`、`square`、`diamond`、`triangle`、`hexagon`、`bars`、`arrow`）、`input.port.r` / `output.port.r` 定制端口外观。
- `definition.valueOutputs`：仅提供数据的节点（无 `exec` 端口）可将输出映射到输入或任务状态，例如 `{ value: { input: 'value', fallback: 0 } }`。

## 注册数据类型

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

- `validateGraphTypes(json, registry)`：载入前校验图中的数据类型与旧图兼容性。
- 端口类型断言：`isControlPort(type)`、`isSpacerPort(type)`、`isDataPort(type)`、`isBuiltinDataType(type)`。

## 图数据结构

- `JsonGraph`：包含 `nodes`、`connections`、`variables`、`subgraphs`、`viewport`。
- `JsonNode`：包含 `id`、`definitionId`、`kind`、`title`、`position`、`inputValues`、`data`（应用自定义 JSON 配置，执行器通过 `ctx.data` 读取）、`collapsed`、`targetGraphId`。
- `JsonConnection`：包含 `source`（输出端口）、`target`（输入端口）。

## 子图与循环

- 子图数据与 `Start` 端口规范见 [子图数据与端口](docs/subgraphs.zh-CN.md)。
- 循环节点配置与端口规范见 [循环结构](docs/loops.zh-CN.md)。
