# @lyx-pj/primflow-model

[English](README.md) | 简体中文

工作流的数据定义。它描述节点、端口、连线、变量和整张图，让画布和引擎对同一份工作流有一致的理解。

## 定义节点

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

`defineNode` 会保留内联端口名称和类型的字面量。`definition.name` 是实例的默认标题，`definition.kind` 控制框架行为，例如 `subgraph` 或 `loop`，默认值为 `default`。`exec` 端口决定执行顺序，数据端口传递值。

`executor` 可以是同文件中的执行函数，也可以是由引擎解析的执行器名称。名称适合在前端共享节点定义、在运行端提供实现。用 `defineExecutor(Echo, execute)` 可从节点定义推断回调的端口，参见 [引擎文档](../primflow-engine/README.zh-CN.md#定义执行器)。

`register(id, node)` 提供稳定的定义 ID，可通过 `registry.getDefinition(id).id` 读取。重复注册同一个定义和 ID 是安全的。注册不同定义时需使用不同的 ID。`graph.addNode(id)` 和图里的 `definitionId` 都使用这个 ID。

每个 `NodeInstance` 有自己的 `id`、位置和值。`definitionId` 引用已注册的定义，自定义标题保存到 `JsonNode.title`。图 JSON 的节点需要 `definitionId` 和 `kind`。调用子图或循环体时通过 `targetGraphId` 引用目标。子图调用卡片的折叠状态保存为 `JsonNode.collapsed`，省略表示展开。

`definition.executionMode` 描述节点如何进入执行，默认是普通步骤 `step`，主动触发执行的事件源可声明为 `source`。端口的 `type` 描述传递的值或执行流，字符串输入可通过 `editor: 'select'` 或 `editor: 'textarea'` 选择编辑方式。

用 `node.getInputPort(name)` 和 `node.getOutputPort(name)` 查找实例当前生效的端口。端口的 `name` 供代码查找，`label` 用于显示，`id` 在节点内唯一并供连线引用。`showPort`、`showInput` 和 `showLabel` 分别控制画布是否绘制端口、输入控件和端口标签。`labelPosition: { x, y }` 用于调整标签相对端口默认位置的偏移。`NodeStyle.ports.colors` 决定端口轮廓颜色，并在连上连线后按数据类型填色，`ports.shapes` 按类型选择 `PortShape`（`circle`、`square`、`diamond`、`triangle`、`hexagon`、`bars`、`arrow`），`ports.input.port.r` 和 `ports.output.port.r` 分别设置两个方向的端口半径；通用 `any` 端口默认使用中性青灰色六边形。`source` 指向输出端口，`target` 指向输入端口，端口 ID 的拼写不影响方向。

图 JSON 的 `inputValues` 保存按端口名配置的输入值。可选的 `data` 保存应用提供的 JSON 配置，执行器通过 `ctx.data` 读取，包括 `false`、`0`、空字符串和 `null`。执行器的 `ctx.getInput(name)` 读取本次执行解析后的输入值。

仅提供数据的节点可以定义兼容的数据输入和输出，并在 `definition.valueOutputs` 中把输出映射到输入。例如，`valueOutputs: { value: { input: 'value', fallback: 0 } }` 声明 `value` 输出按需读取对应输入，未设置输入时用 `0`。这类节点无需定义 `executor`，也没有 `exec` 端口。

要按需读取任务状态，可声明 `valueOutputs: { value: { input: 'name', read: (name, state) => state.values[String(name)] } }`。读取函数接收解析后的输入和只读任务状态快照。

需要建立连接或监听事件时，节点还可以实现 `onActive` / `onDeactivate` / `onDestroy`，在启动和停止时初始化、清理资源，用法见 [engine README](../primflow-engine/README.zh-CN.md) 的「节点生命周期」。

执行器可以通过 `ctx.state` 读取本次开始时的任务快照并暂存业务更新。提交和并发规则见[任务业务状态](../primflow-engine/README.zh-CN.md#任务业务状态)。

已调度的执行器可以通过 `ctx.interrupt(value)` 等待宿主应用的 JSON 答复。见[业务中断](../primflow-engine/README.zh-CN.md#业务中断)。

节点可声明 `retryPolicy`、`outputValidators`，并用 `NodeExecutionError` 报告结构化错误。订阅业务事件时，生命周期的 `ctx.on` 和 `ctx.once` 会给回调提供可申请调度自身的事件上下文。执行行为见[引擎文档](../primflow-engine/README.zh-CN.md)。

## 注册数据类型

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

在 `defineNode` 的端口中使用 `type: Image`。图 JSON 保存 `media.image@1`，画布和引擎需要安装同一份类型定义。可以用 `schema.optional()` 声明可选字段，用 `schema.array()` 检查每个数组元素，也可以嵌套对象。需要修改类型语义时，注册新版本 ID。

`registry.dataTypes.checkConnection()` 检查连线，`validateValue()` 返回精确到字段的错误。命名类型通过相同 ID 匹配。普通值端口仍可连到 `any`，到达具体输入时检查值。`validateGraphTypes(json, registry)` 可在载入前列出类型错误和旧图诊断。

判断端口类型请使用导出的断言函数，不要直接比较类型字符串。`isControlPort(type)` 匹配 `exec` 和 `spacer`，`isSpacerPort(type)` 只匹配 `spacer`，`isDataPort(type)` 匹配其余所有端口。`isBuiltinDataType(type)` 匹配内置值类型，不包含控制端口。

自定义值应能随图保存和随任务复制。图片或文档可以保存为资源引用，由应用服务解析。用 `defineStreamType({ id, item })` 定义流端口，先注册自定义的 `item` 类型。流只连接同一类型的流端口，图文件保存连线与类型 ID。

## 工作流的数据

一张工作流可以保存为 JSON，交给画布显示或引擎执行：

| 字段 | 内容 |
| --- | --- |
| `nodes` | 节点列表，包含节点类型、位置、端口和值 |
| `links` | 连线，记录源端口和目标端口 |
| `variables` | 变量表 |
| `subgraphs` | 内嵌子图，按 id 保存 |
| `viewport` | 画布的位置和缩放 |

完整字段见 [types.ts](src/types.ts)。

内置节点包括开始 `Start`、结束 `End`、子图 `Subgraph`，以及循环用的 `Loop`、`LoopEntry`、`LoopReturn`。它们由 `NodeRegistry` 直接提供；自定义节点用 `register` 添加。

## 循环和子图

- 循环节点怎么配置、循环体怎么连：[循环节点](docs/loops.zh-CN.md)
- 子图的参数端口和保存结构：[子图数据与端口](docs/subgraphs.zh-CN.md)

## 和其他包一起用

`model` 只定义数据和节点，不执行也不渲染：

- [primflow-engine](../primflow-engine/README.zh-CN.md) 读取 `JsonGraph`，按连线执行节点。
- [primflow-canvas](../primflow-canvas/README.zh-CN.md) 读取和编辑 `JsonGraph`，显示节点与连线。
- React 应用用 [primflow-react](../primflow-react/README.zh-CN.md) 把画布和引擎挂到组件上。

画布和引擎共享 model 中的 `defineNode` 和 `NodeRegistry`，节点定义可在两者之间复用。

## 开发

从仓库根运行：

```sh
pnpm --filter @lyx-pj/primflow-model typecheck
pnpm --filter @lyx-pj/primflow-model lint
```

本包没有独立测试。修改节点、端口或 JSON 字段后，运行使用这些定义的消费者测试：

```sh
pnpm --filter @lyx-pj/primflow-engine exec vitest run tests/boundaries.test.ts
pnpm --filter @lyx-pj/primflow-canvas exec vitest run tests/startNodes.test.ts
```
