# 循环节点

[English](loops.md) | 简体中文

本文说明循环节点的端口、配置和循环体结构。逐轮执行见 [engine 循环执行](../../workflow-engine/docs/loops.zh-CN.md)，画布的创建与编辑见 [canvas 循环体](../../workflow-canvas/docs/loops.zh-CN.md)。

## 节点与端口

| 节点 | 类型名 | 输入 | 输出 |
| --- | --- | --- | --- |
| `Loop` | `loop` | 执行 `exec`、数据 `input` | 执行 `done`、数据 `output` |
| `LoopEntry` | `loop-entry` | 无 | 执行 `exec`、数据 `value` |
| `LoopReturn` | `loop-return` | 数据 `value`、执行 `next` / `break` | 无 |

端口 ID 使用 `in-` / `out-` 前缀（如 `in-input`、`out-value`），定义见 [Loop.ts](../src/builtin/nodes/Loop.ts)。循环对外只有一个执行入口和一个数据入口；轮次、结束原因是引擎内部信息，不占用端口。

循环只有一种形态：循环体反复执行，什么时候结束由循环体自己决定；遍历、计数等具体玩法由循环体里的节点实现，引擎不区分模式。

- `Loop.input` 提供首轮入口值；之后每轮的入口值由上一轮返回节点提交。
- `LoopEntry.value` 是本轮入口值；`LoopReturn.value` 是本轮提交值，同时成为下一轮的入口值。
- `LoopReturn.next` 提交本轮并继续，`break` 提交本轮并结束。
- `Loop.output` 是整个循环成功后的结果，即最后一轮提交的值。

## 循环配置

配置放在 `JsonNode.loop`，不混入业务 `data`。[LoopConfig](../src/types.ts) 只有一种形态：

```ts
type LoopConfig = {
  version: 1
  maxIterations?: number
  timeoutMs?: number
}
```

配置必须显式保存，运行时不猜测缺失值。`maxIterations` 只能收紧引擎默认上限；`timeoutMs` 限制整个调用的累计运行时间。缺失配置、未知版本和非法参数由引擎在加载时拒绝，细节见 [循环执行](../../workflow-engine/docs/loops.zh-CN.md)。

新建节点的默认配置是 `DEFAULT_LOOP_CONFIG = { version: 1 }`，由画布写入，定义在 [Loop.ts](../src/builtin/nodes/Loop.ts)。

## 循环体结构

循环体存放在 `JsonGraph.subgraphs[subgraphId]`，`Loop.subgraphId` 指向它。循环体随所属图保存，不单独成为文件。JSON 必须满足：

- 恰好一个 `loop-entry`，至少一个 `loop-return`。
- 不能放普通 `start` / `end`。
- 不能跨区域连线、递归引用子图，或建立任意执行／数据回路。
- 不同分支可以各放一个返回节点，但每轮只能实际到达一个。

引擎加载时会校验这些规则；错误处理和逐轮执行见 [循环执行](../../workflow-engine/docs/loops.zh-CN.md)。

## 与普通子图的区别

普通子图用 `Start` / `End` 传参，循环体用 `LoopEntry` / `LoopReturn` 返回；两者的端口保留规则不同，见 [子图数据与端口](subgraphs.zh-CN.md)。
