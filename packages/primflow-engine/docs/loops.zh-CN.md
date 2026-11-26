# 循环执行

[English](loops.md) | 简体中文

引擎内置 `loop`、`loop-entry`、`loop-return` 三种控制节点。节点端口、`loop` 配置字段和 JSON 结构由 [model 循环节点](../../primflow-model/docs/loops.zh-CN.md) 定义，循环节点类和相关类型也从 engine 入口导出。本文说明引擎怎么执行循环、怎么处理错误、停止和查询；画布怎么创建和编辑循环体见 [canvas 循环体](../../primflow-canvas/docs/loops.zh-CN.md)。

## 一轮怎么进行

- `next`：提交本轮结果，继续下一轮。
- `break`：提交本轮结果，结束循环。
- 返回节点的 `value` 没有连线时，本轮提交值沿用本轮入口值；有连线时使用实际值，包括 `undefined`。
- 至少执行一轮。循环体一直没有走到 `break` 时，按轮数上限报 `LoopLimitExceeded`，不发布部分结果。
- 整个循环成功后才输出结果，并触发一次 `done`。失败或取消时不向后续节点传递部分结果，已完成轮次仍可查询。

## 跨轮的值

| 循环入口输出 | 第一轮 | 后续轮次 |
| --- | --- | --- |
| `initialValue` | 调用开始时的 `Loop.input` | 同一初始输入的副本 |
| `value` | 调用开始时的 `Loop.input` | 上一轮提交的结果 |

累加结果或遍历集合时连接 `value`。校验失败后，用同一份输入重新生成时连接 `initialValue`。循环体可在同一轮使用两个输出。

## 每轮数据如何分开

一次启动或事件产生一个任务（`taskId`）。进入一次 `Loop` 产生一个循环调用（`invocationId`），每轮保存一组独立数据，称为循环帧（`frameId`）。循环不会为每轮新建任务。

| 数据 | 处理方式 |
| --- | --- |
| 节点输入、输出、`data`、临时 `ctx.taskState`、等待中的数据 | 每轮独立，不能读取上一轮的临时结果 |
| 跨轮的值 | 由返回节点的 `value` 传给下一轮的入口 |
| 输入、变量和应用上下文 | 从循环开始时的数据复制，轮内修改不自动写回父图或其他轮次 |
| 业务状态 `ctx.state` | 在同一任务内共享。后续轮次失败时保留已提交的更新。如果要求整个循环成功后再写，在 `done` 下游更新 |
| `nodeState`、服务、外部系统 | 仍可共享，业务代码负责避免相互干扰 |

循环体调用普通子图时，也使用本轮的独立数据。同一 `Loop` 被重复或同时调用时，各次调用分别记录数据。

同一输入有多个数据源时，每轮在自己的帧内应用[选源规则](../README.zh-CN.md#同一个输入的多个数据源)。本轮只使用本帧的就绪数据。

执行上下文包含 `frameId` 和只读的 `loop` 信息：调用 ID、循环节点 ID、从 0 开始的轮次以及父帧 ID。

## 一轮何时结束

返回节点只登记返回值，实际提交由引擎完成：引擎收到返回值后，还会等待本轮所有已启动的节点和分支结束。只有返回一次、没有缺失的数据、没有执行错误时，才保存本轮结果并决定是否继续。

异步工作应由执行器返回的 Promise 表示，或在执行器返回前通过 `next` 启动。不能让执行器先返回，再靠定时器调用 `next`；引擎无法把这种回调作为本轮未完成的工作继续等待。

第一次 `next` 会固定节点输出。之后该节点不能再次写输出或发送事件；执行器结束或本轮关闭后，保存的 `setOutput`、`emitEvent`、`next` 也不能继续使用。

普通图允许在任务仍有效时延迟调用 `next`，循环体的规则更严格。

## 配置、错误和停止

配置放在节点的 `loop` 字段，当前版本为 1。画布默认只写 `version`；`maxIterations` 只能收紧本次轮数上限。加载时检查配置、端口、区域结构和连线。

| 情况 | 处理结果 |
| --- | --- |
| 没有返回、返回多次、同一节点重复执行 | 本轮失败，报告调用和轮次信息 |
| 需要的数据没有产生 | `LoopDependencyUnresolved`，不能借用上轮数据 |
| 循环体一直没决定结束 | 达到轮数上限时报 `LoopLimitExceeded`，不发布部分结果 |
| 节点报错或循环超时 | 取消本次循环，保留错误，不触发 `done`；超时报 `LoopTimeout` |
| `stopTask` / `stop` | 取消对应任务或全部任务中的循环，通知节点清理 |
| 命中断点 | 暂停对应任务，继续后从当前轮接着执行 |

引擎默认每次循环最多 1000 轮、每任务累计执行节点最多 10000 次（含嵌套循环和控制节点）、最多嵌套 8 层，默认保留最近 100 个已结束轮次。轮数、激活次数和嵌套深度是硬上限，节点配置只能降低单次轮数。

```ts
const engine = new Engine(registry, {
  maxLoopIterations: 1000,
  maxNodeActivations: 10_000,
  maxLoopDepth: 8,
  maxLoopIterationHistory: 100,
})
```

`timeoutMs` 限制整个循环的累计运行时间，断点暂停时间从中扣除，通过 `ctx.interrupt()` 等待业务答复的时间计入。循环发出的中断请求包含帧与轮次信息。引擎会定期让出事件循环，停止可以取消活动帧，但不会无限等待不响应取消信号的业务 Promise，也不能撤销已经发生的外部操作。断点每轮可以重新命中，并带有相同的循环信息。

即使同步执行延迟了计时器，引擎也会在提交当轮结果和发布最终输出前检查是否超时。

## 事件源与限制

循环体的结构要求（入口、返回、禁用 Start/End、禁止跨区域连线和递归引用）由加载校验执行，规则见 [model 循环节点](../../primflow-model/docs/loops.zh-CN.md)。

事件源、常驻定时器和业务事件订阅不能放进循环体及其调用的普通子图：

- `executionMode: 'source'` 的节点和静态 `onEvent` 节点会被加载校验拒绝。
- 生命周期 `onActive` 仍可初始化资源，但不应用于业务事件订阅。
- 循环内 `emitEvent` 会创建另一个独立任务，保留 `parentTaskId`，本轮不等待它结束；依赖其计算结果时应直接等待异步调用。

添加面板在循环体内隐藏事件源节点，属于画布行为，见 [canvas 循环体](../../primflow-canvas/docs/loops.zh-CN.md)。

## 查询和事件

| 想查什么 | 接口 |
| --- | --- |
| 某个任务的循环调用 | `getLoopInvocations(taskId)` |
| 一次循环的各轮记录 | `getLoopIterations(taskId, invocationId)` |
| 某轮某个节点的数据 | `getFrameNodeExecutionData(taskId, frameId, nodeId)` |

```ts
const calls = engine.getLoopInvocations(taskId)
const frames = engine.getLoopIterations(taskId, calls[0].invocationId)
const values = engine.getFrameNodeExecutionData(taskId, frames[0].frameId, nodeId)

engine.on('loop:started', (taskId, invocation) => {})
engine.on('loop:iteration:started', (taskId, iteration) => {})
engine.on('loop:iteration:completed', (taskId, iteration) => {})
engine.on('loop:finished', (taskId, invocation) => {})
```

查询返回副本。每任务默认保留最近 100 个已结束轮次，正在执行的轮次会保留；清理轮次记录不影响最终结果。同时执行多个循环时，用 `frameId` 指定要查看的那一轮；按原 `nodeId` 查询提供聚合状态及最近完成数据。`getLoopInvocations` 的 `reason` 为 `break`（循环体决定结束）或 `limit`（撞到轮数上限）。

通过[执行日志](execution-trace.zh-CN.md)可以用循环调用的 `activationId` 定位调用节点，再按 `frameId` 查某一轮内的逐次执行结果。执行日志与轮次记录有各自的保留上限。

## 代码和测试

执行逻辑见 [LoopController.ts](../src/LoopController.ts)，图结构检查见 [LoopValidation.ts](../src/LoopValidation.ts)。

- [loops.test.ts](../tests/loops.test.ts)：一轮一轮的执行、跨轮的值、数据隔离、等待异步工作、限额、停止和查询。
- [engine.test.ts](../tests/engine.test.ts)：调度、依赖和普通子图参数。

```sh
pnpm --filter @lyx-pj/primflow-engine exec vitest run tests/loops.test.ts
```
