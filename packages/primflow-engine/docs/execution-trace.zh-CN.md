# 执行日志与排障

[English](execution-trace.md)

引擎为每个调度任务保留结构化执行日志。应用可以在任务运行中或结束后主动查询，定位某一次节点执行的结果、数据来源和调度等待。实时界面仍可通过 [任务事件](../README.zh-CN.md#查询和监听) 获取状态更新。

## 从任务查到某一次节点执行

```ts
const engine = new Engine(registry, {
  trace: { maxEntries: 2000, captureData: true },
})

// After loadGraph() and start(), use the ID returned for the event task.
const task = await engine.dispatchEvent('message', 'hello')
if (task) {
  const trace = engine.getTaskTrace(task.id)
  const executions = trace?.activations.filter(({ nodeId }) => nodeId === 'transform') ?? []
  for (const { id } of executions) {
    const execution = engine.getNodeActivation(task.id, id)
    console.log(execution?.status, execution?.data?.outputs, execution?.failure)
  }
}
```

启动任务可在 `start()` 后通过 `getTasks()` 按 `trigger.type === 'start'` 找到。`dispatchEvent()` 返回本次事件的任务快照，返回时任务可能还在等依赖。保留原始 `taskId` 继续查询。并发时 `latestTaskId` 可能已指向另一个任务。

| 查询或字段 | 排障用途 |
| --- | --- |
| `getTask(taskId)` | 查看触发原因、任务状态、错误、断点、业务中断和重试尝试。 |
| `getTaskTrace(taskId)` | 返回按 `sequence` 排序的 `events`、按创建顺序排列的 `activations` 和两类淘汰计数。`at`、`startedAt`、`endedAt` 为毫秒时间戳。同一毫秒内以 `sequence` 为准。 |
| `getNodeActivation(taskId, activationId)` | 按任务内的执行 ID 查一次逻辑执行。同一 `nodeId` 多次进入时，每次有独立 ID、状态和结果。`portId` 标识触发的执行端口，`graphId` 为空表示主图。事件处理和过滤可能使用引擎生成的 `in-event` 或 `out-event`。 |
| `getTaskGraph(taskId)` | 查看该任务的图快照，用节点、端口和子图 ID 定位当时的定义。 |

`parentActivationId` 指向触发当前执行的记录。普通子图的入口指向调用节点，后续子图执行沿自身链路推进。节点发出事件后，新任务通过 `parentTaskId` 和 `parentActivationId` 指回来源，来源任务的日志保留 `activation:emit`。静态事件过滤器的 `activation:event-filter` 记录 `triggered`，监听回调和 `executeSelf()` 调度的执行器各有自己的执行 ID。

`completed` 可发生在 `next()` 交接时，也可发生在执行器直接返回时。节点交接后抛错时，同一执行记录会更新为 `failed`，相应的 `activation:handoff` 和下游记录仍在。保留的延迟 `next()` 也能在节点结束后产生交接记录。`data` 在节点结束时采集，后续交接应结合下游实际读取的输入查看。

## 查明任务在等哪个输出

```ts
const trace = engine.getTaskTrace(taskId)
for (const execution of trace?.activations ?? []) {
  if (execution.status !== 'waiting') continue
  for (const input of execution.waitingFor ?? []) {
    console.log(execution.nodeId, input.inputPortId, input.sources)
  }
}
```

`waitingFor` 的每一项对应一个尚未就绪的数据输入。`inputPortId` 是消费者的端口 ID，`sources` 中的 `nodeId` 和 `outputPort` 是上游节点 ID 和输出端口名。同一输入有多个候选时，任一候选可满足该输入。经过纯值节点的连接仍指向需要先发布数据的实际生产者。

查找日志中的生产者执行与 `activation:handoff`，可以区分生产者尚未运行、仍在运行，或已返回但尚未交接。等待只使用本任务的数据，其他任务中的同名节点输出不会解除等待。依赖就绪后，原执行 ID 从 `waiting` 变回 `pending` 再开始执行，`inputSources` 记录调度时绑定的来源，包含可用的生产者执行 ID 和任务状态读取版本。若同一单源入口的等待被后续触发替换，原记录为 `superseded`。取消时，未解除的等待原因随记录保留。

## 沿日志关联失败与恢复

| 日志类型 | 关联方式 |
| --- | --- |
| `task:status`、`task:error` | 查看任务状态流转。`errorIndex` 对应 `getTask(taskId).errors` 的从零开始的下标。 |
| `activation:status`、`activation:handoff` | 查看某次执行何时进入、等待、恢复和结束。`ports` 为实际选择的执行出口名。`failure` 保留错误代码、消息和已报告的输入端口。 |
| `activation:attempt` | 用 `attemptId` 关联任务快照的 `attempts[].id`，查每次尝试的错误、输入来源、数据和是否走了降级。普通重试共享一个执行 ID，上游重跑有独立的 `replay` 执行记录。 |
| `activation:retry-wait`、`branch:skipped` | 查看何时进入重试等待、何时可以重试或等待超时。分支跳过记录标出被跳过的节点和作出分支选择的执行 ID。 |
| `activation:breakpoint`、`activation:interrupt` | 关联暂停的节点执行和业务中断。中断日志保留请求、答复或取消的状态和 `interruptId`。 |
| `state:committed` | 查询提交状态的 `activationId` 和提交后的 `version`，可与连接到任务状态的 `inputSources[].state.version` 对照。 |
| `loop:invocation`、`loop:frame` | 用 `activationId` 定位循环调用，用 `invocationId` 关联轮次。循环体记录通过 `frameId` 归属到具体轮次。日志保留轮次索引、状态和循环的结束原因。进一步查询见 [循环运行资料](loops.zh-CN.md)。 |

## 记录与保留选项

- 引擎默认采集诊断元数据。使用 `trace: { captureData: true }` 保存节点结束时的输入、输出快照，无法复制的值用 `dataUnavailable` 标记。错误消息也可能包含业务信息。查询结果是副本。
- `trace.maxEntries` 默认为 `1000`，分别限制每个任务的时间线条目和终态执行记录。两者独立淘汰最旧记录，分别增加 `droppedEvents` 和 `droppedActivations`。尚未结束的执行记录保留到结束。已淘汰记录的 ID 仍可能出现在关联字段里。
- 日志和任务一起保留。停止或重新加载图后，仍可用原 `taskId` 查询保留的任务。任务经 `maxTaskHistory` 淘汰后，查询返回 `undefined`。循环轮次查询有独立的 `maxLoopIterationHistory` 限制。
- `trace: false` 关闭新任务的记录。`setOptions()` 的记录配置在创建任务时生效。`runNode()` 和 `executeNode()` 是独立执行入口，使用各自的返回结果。会话资源钩子和节点内部业务步骤由应用自行记录。
- 日志保存在引擎实例的内存中。需要跨进程或长期保留时，由应用读取并保存所需快照。
