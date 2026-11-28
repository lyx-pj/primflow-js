# @lyx-pj/primflow-engine

[English](README.md) | 简体中文

工作流执行引擎，可在 Node.js、浏览器、Web Worker 和服务端运行。

## 运行工作流

```ts
import { NodeRegistry } from '@lyx-pj/primflow-model'
import { Engine } from '@lyx-pj/primflow-engine'

const registry = new NodeRegistry()
const engine = new Engine(registry, {
  maxTaskHistory: 50,
  trace: { maxEntries: 1000, captureData: false },
})

await engine.loadGraph(graphJson)       // 加载并校验图
await engine.start({ debug: false })    // 启动会话（debug: true 启用断点暂停）
await engine.dispatchEvent('tick', {})  // 派发业务事件，触发监听节点
await engine.stop()                     // 停止会话并清理资源
```

## 定义执行器与服务

- `defineExecutor(nodeDef, fn)`：根据节点定义推断输入输出端口类型并绑定执行逻辑，通过 `engine.registerExecutor(name, executor)` 注册。
- `defineService(serviceDef)`：定义可注入执行上下文的外部服务（如 HTTP 客户端、存储），通过 `engine.registerService(service)` 注册，在节点中通过 `ctx.getService(service)` 获取。

```ts
import { defineExecutor, defineService } from '@lyx-pj/primflow-engine'

const HttpService = defineService({ id: 'http', create: () => fetch })
const myExecutor = defineExecutor(MyNode, async (ctx) => {
  const input = ctx.getInput('text')
  ctx.setOutput('result', input)
  ctx.next('done')
})
```

## 实时进度、流端口与任务状态

- **实时进度**：节点内调用 `ctx.reportProgress(text)` 上报进度，宿主通过 `engine.on('node:progress', ...)` 订阅。
- **流端口**：通过 `ctx.openOutputStream(port)` 写入流数据，下游通过 `ctx.readInputStream(port)` 消费。
- **任务业务状态**：`ctx.state` 读取当前任务的状态快照，通过 `ctx.setState(patch)` 暂存更新（节点执行完成后提交）。

## 业务中断与调试控制

- **业务中断**：节点内调用 `await ctx.interrupt(payload)` 暂停当前任务并等待外部答复；宿主通过 `engine.resumeInterrupt(taskId, interruptId, reply)` 提交答复并继续执行。
- **断点与任务控制**：以 `engine.start({ debug: true })` 启动后，遇到节点断点会暂停对应任务；调用 `engine.resume(taskId)` 继续执行，调用 `engine.stopTask(taskId)` 取消单个任务。

## 节点生命周期

需要管理长连接或订阅外部事件的节点可实现生命周期钩子：

- `onActive(ctx)`：会话启动时调用，可用 `ctx.on(event, handler)` / `ctx.once(event, handler)` 订阅事件并在回调中触发执行。
- `onDeactivate(ctx)`：会话停止时调用，用于释放连接或取消监听。
- `onDestroy(ctx)`：节点实例销毁时调用。

## 节点失败与重试

- 在节点定义中配置 `retryPolicy`（如 `maxAttempts`、`backoffMs`）启用自动重试。
- 抛出 `NodeExecutionError` 可携带结构化错误码与是否可重试标记（`retryable`）。

## 查询、日志与子图

- **查询与监听**：通过 `engine.getTasks()`、`engine.getTask(taskId)`、`engine.getTaskTrace(taskId)` 查询任务与执行日志，或通过 `engine.on(...)` 订阅实时事件。详见 [执行日志与排障](docs/execution-trace.zh-CN.md)。
- **子图与循环**：普通子图通过 `Start` / `End` 传递参数，循环使用 `LoopEntry` / `LoopReturn`。详见 [子图参数](docs/subgraphs.zh-CN.md) 与 [循环执行](docs/loops.zh-CN.md)。
