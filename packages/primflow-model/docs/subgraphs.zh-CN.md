# 子图数据与端口

[English](subgraphs.md) | 简体中文

子图有两种存在方式：内嵌在所属图的 `JsonGraph.subgraphs` 中，或由应用保存为独立文件、通过调用节点的 `targetGraphId` 引用。本文说明这两种情况的 JSON 结构和 `Start` 端口规则；参数怎么传递见 [engine 子图参数](../../primflow-engine/docs/subgraphs.zh-CN.md)，画布怎么进入和返回见 [canvas 子图与导航](../../primflow-canvas/docs/subgraphs.zh-CN.md)。

## JSON 结构

`JsonGraph.subgraphs` 按 id 保存内嵌区域，每个区域包含节点、连线和视口：

```ts
type JsonGraph = {
  // ...
  subgraphs: Record<string, {
    nodes: JsonNode[]
    links: JsonLink[]
    viewport: { x: number; y: number; zoom: number }
  }>
}
```

节点的 `graphId` 由它在主图或子图中的位置确定，主图用空字符串。`targetGraphId` 指向调用目标，可引用普通子图或循环体。

字段定义见 [types.ts](../src/types.ts)。

`JsonNode.targetGraphId` 的含义取决于当前图：

| 当前图是否存在同名区域 | 含义 |
| --- | --- |
| 存在 | 内嵌子图，可以进入编辑 |
| 不存在 | 外部子图引用；画布不补空区域，内容由应用打开或执行前注入 |

`Loop` 的循环体同样是 `subgraphs` 中的区域，但使用 `LoopEntry` / `LoopReturn`，见 [循环节点](loops.zh-CN.md)。

子图调用节点可以把卡片的折叠状态保存为 `JsonNode.collapsed`，省略表示展开。图 JSON 不保存预览图片；画布根据被引用子图的数据现场渲染预览。

## Start 端口怎么处理

`Start`、普通子图和循环体的入口协议不同，加载时不能一律删除或保留数据端口：

| 区域 | 端口规则 |
| --- | --- |
| 主图 `Start` | 只保留执行出口 |
| 内嵌普通子图 `Start` | 保留显式带 `type` 的数据端口，作为子图参数入口 |
| 独立子图文件作为文件打开 | 应用以 `keepStartPorts: true` 调用 `graph.fromJSON`，保留参数端口 |
| 循环体 | 不使用 `Start`，入口是 `LoopEntry` |

`normalizeStartNodes` 默认只保留执行输出，并过滤掉不再存在的端口上的连线；传入 `keepDataPorts: true` 时保留显式定义的数据端口。主图 `Start` 只有执行入口语义，不自动承接启动业务数据。引擎在加载内嵌子图时使用 `keepDataPorts: true`；画布把该选项暴露为 `fromJSON(json, { keepStartPorts })`。

标准化会清空 `Start` 的 `inputValues`，并给执行出口使用稳定 id（缺省为 `out-start`）。主图没有参数来源，保持默认；只有子图入口保留参数。

## 普通子图的进出

普通子图用 `Start` 接收参数，用 `End` 返回结果。父图中的子图节点负责调用它：输入端口接收参数，输出端口提供返回值。`End` 默认只有执行输入；需要返回数据时，通过节点定义或图 JSON 提供数据端口。

`LoopEntry` / `LoopReturn` 不参与普通子图参数映射：引擎只对 `start` 入口和 `end` 出口应用参数规则。参数按名配对、类型校验和写回时机见 [engine 子图参数](../../primflow-engine/docs/subgraphs.zh-CN.md)。
