# @lyx-pj/primflow-engine

[English](README.md) | 简体中文

按图执行工作流。读取 [model](../primflow-model/README.zh-CN.md) 定义的图，按连线推进节点，并处理事件、任务、断点、停止、循环和子图。

## 运行一个工作流

```ts
import { Engine, Runtime, NodeRegistry, type JsonGraph } from '@lyx-pj/primflow-engine'

const registry = new NodeRegistry()
const engine = new Engine(new Runtime(registry))

engine.fromJSON(json)
await engine.process()
const tasks = engine.getTasks()

engine.stop()
await engine.whenStopped()
```

- `NodeRegistry` 要先注册图里用到的自定义节点；只用内置节点时可以直接使用空的注册表。
- `fromJSON` 加载图，`process()` 执行一次，`getTasks()` 查看这次执行产生的任务。
- `Engine` 启动后会保持运行，继续接收事件。用户停止或页面卸载时调用 `stop()`；需要等待异步清理时再 `await whenStopped()`。
- 含常驻 Timer 或事件监听的应用，建议把 `Engine` 保存在应用生命周期里，而不是每次执行都新建。
- 节点怎么定义和注册见 [model README](../primflow-model/README.zh-CN.md)；事件源和定时器的例子见 [示例内部模块](../../examples/primflow-react/packages/workflow/README.zh-CN.md)。

## 事件和任务

每次启动或每次业务事件都会创建一个任务。任务之间互相独立：同名的两个事件可以同时执行，结果不会互相覆盖，取消、暂停或失败也只影响对应的任务。执行器和服务注册在同一个引擎实例内共享；连接等长驻资源可以通过 `ctx.nodeState` 访问，并发一致性由业务代码保证。

事件参数在提交时复制，需要支持 `structuredClone`。连接、函数等不可克隆资源应放在注册服务或生命周期 `state` 中；不可克隆的事件参数会让 `dispatchEvent()` 拒绝，`emit()` 则通过 `error` 事件报告失败。可以同时投递多个事件：

```ts
const engine = new Engine(runtime, { maxTaskHistory: 100 })
engine.fromJSON(graph.toJSON())
await engine.process()

const [a, b] = await Promise.all([
  engine.dispatchEvent('message', { text: 'A' }),
  engine.dispatchEvent('message', { text: 'B' }),
])
```

`process()` 和 `dispatchEvent()` 返回的 Promise 只等待本轮调度，不代表整个工作流结束。执行器把 `ctx.next()` 保存下来、之后再调用时，任务会重新进入运行状态。节点里也可以用 `ctx.emitEvent()` 发出事件，这会创建另一个任务，并记录来源任务的 `parentTaskId`。

任务被取消、历史淘汰或工作流停止后，旧上下文不再推进执行或写入输出。事件任务从监听节点开始，允许事件源不连 Start，也不会借用其他任务的结果补齐自己的数据依赖。

### 任务状态

| 状态 | 含义 |
| --- | --- |
| `running` | 正在执行，或有节点还没返回 |
| `waiting` | 本轮已经退出，但仍有节点在等待本任务的数据 |
| `paused` | 命中断点，等待继续 |
| `completed` | 本轮执行结束，没有未满足的数据依赖 |
| `failed` | 本轮执行结束，但发生了错误 |
| `cancelled` | 任务被主动取消 |

### 查询和监听

```ts
const tasks = engine.getTasks()
const task = engine.getTask(taskId)
const graph = engine.getTaskGraph(taskId)
const statuses = engine.getNodeStatuses(taskId)
const status = engine.getNodeStatus(nodeId, taskId)
const data = engine.getNodeExecutionData(nodeId, taskId)

engine.on('task:created', (task) => console.log(task.id, task.trigger))
engine.on('task:changed', (task) => console.log(task.id, task.status))
engine.on('task:node:status:changed', (taskId, nodeId, status) => {})
engine.on('task:breakpoint:hit', (taskId, breakpoint) => {})
engine.on('task:error', (taskId, error, nodeId) => {})
```

- 查询返回副本，调用方修改不会影响任务。
- 不传 `taskId` 的节点查询默认查看最新任务；工作流停止或最新任务取消后返回空状态。并发观察时应显式传 `taskId`。
- 取消后的历史保留节点最后的执行状态，任务整体状态为 `cancelled`。
- 任务快照包含 id、来源、状态、开始和结束时间、当前断点及错误列表。
- 停止或重新加载后，仍可按 `taskId` 查询保留下来的状态、执行数据和当时的图。
- `nodeId` 为空的任务错误表示任务整体初始化失败。
- 默认保留最近 100 个已结束任务，可用 `maxTaskHistory` 调整，设为 `0` 表示不保留。运行、暂停和等待中的任务不会被淘汰。
- `engine.on()` 的观察者抛错只会被记录，不会影响其他观察者或任务。

节点执行状态为 `idle`、`pending`、`running`、`completed`，每个任务独立记录。`next()` 交接后本节点立即完成，不等待下游返回；从当前任务入口可达但还没执行的分支保持 `pending`。

## 断点、继续和停止

```ts
void engine.process({ debug: true })
engine.setBreakpoint(nodeId, true)
engine.resume(taskId)     // 只继续指定任务
engine.resume()           // 继续全部暂停任务
engine.stopTask(taskId)   // 取消指定任务，保留工作流监听
engine.stop()             // 取消全部任务，停用并销毁运行时节点
await engine.whenStopped()
```

- 暂停按任务生效，其他任务和新事件仍然继续。
- 已经开始的执行器不能被强制暂停或终止，应响应任务的 `ctx.signal` 取消请求。
- 取消任务后，等待该任务本轮投递的 Promise 会结束；不响应信号的旧代码可能继续运行，但旧上下文不能再推进流程或修改输出。
- `engine.status` 为 `idle`、`running`、`paused` 或 `stopped`。所有未结束任务都暂停时显示 `paused`，仍有其他活动任务时显示 `running`。
- 首轮任务完成后引擎仍保持运行以接收事件；运行中再次 `process()` 会被拒绝，需要先停止。
- `engine.pausedNode` 对应最新任务的断点；查看其他任务的断点请用 `getTask(taskId).pausedNode`。

`process()` 只接受运行选项，不接收业务数据。主图 Start 只有执行出口，业务数据通过节点输入、变量、执行上下文或事件提供。普通子图 Start 可以保留参数端口，见下文「循环和子图」。

## 节点生命周期

| 钩子 | 负责什么 |
| --- | --- |
| `onActive(ctx)` | 引擎启动时初始化资源、建立连接、订阅事件；全部节点激活完成后才开始执行任务 |
| `onDeactivate(ctx)` | 引擎停止时取消监听、断开连接、停止后台活动 |
| `onDestroy(ctx)` | 最终释放实例资源；已加载但未激活的节点也会销毁 |

生命周期覆盖主图和全部子图节点，包括没有连到 Start 的节点。它只按引擎实例触发一次，执行多少任务都不会重复建立订阅。停止时所有节点先停用再销毁，单个清理失败不会跳过其他节点。激活失败会回收已创建的节点，并让 `process()` 拒绝。

```ts
import { Node, type NodeLifecycleContext } from '@lyx-pj/primflow-model'

class MessageNode extends Node {
  static definition = {
    inputs: [],
    outputs: [{ name: 'next', type: 'exec' }, { name: 'value', type: 'any' }],
  } as const

  static onActive(ctx: NodeLifecycleContext) {
    ctx.state.listening = true
    ctx.onEvent('message', async (taskCtx, message) => {
      taskCtx.state!.message = message
      taskCtx.setOutput('value', message)
      await taskCtx.next()
    })
    const timer = setInterval(() => { ctx.state.lastTick = Date.now() }, 1000)
    ctx.onCleanup(() => clearInterval(timer))
  }

  static onDeactivate(ctx: NodeLifecycleContext) {
    ctx.state.listening = false
  }

  static onDestroy(ctx: NodeLifecycleContext) {
    delete ctx.state.lastTick
  }
}
```

- `ctx.onEvent(name, handler)` 返回退订函数，停止时自动失效。回调里的 `taskCtx` 用于读写本次任务的数据。
- 生命周期的 `ctx.state` 保存引擎级别的资源；`taskCtx.state` 是每个任务独立的临时状态；`taskCtx.nodeState` 用于显式共享资源。
- 生命周期里初始化的输入、输出和 `data` 会复制成新任务的初始值，资源对象本身不会被复制。
- `ctx.onCleanup(fn)` 注册额外的清理函数，按注册的逆序执行；清理错误通过 `node:error` 报告，`whenStopped()` 会等待全部清理完成。
- 初始化应响应 `ctx.signal`；停止时会等待激活钩子退出。
- 钩子不提供 `next`，但停用和销毁时仍可访问旧实例的数据。
- 主动停止或重新加载会销毁运行时实例，保留图配置、节点定义和画布节点；下一次运行会从保留的配置重建。

单独的 `runNode()` / `executeNode()` 只执行节点，不启动生命周期，也不会进入任务列表。

## 循环和子图

引擎内置 `loop`、`loop-entry`、`loop-return` 三种控制节点。循环体保存在 `JsonGraph.subgraphs`，配置放在节点的 `loop` 字段。默认每次循环最多 1000 轮、每任务累计执行节点最多 10000 次、最多嵌套 8 层。端口和配置见 [model 循环节点](../primflow-model/docs/loops.zh-CN.md)，逐轮执行、错误、停止和查询见 [循环执行](docs/loops.zh-CN.md)。

普通子图用 `Start` 接收参数、用 `End` 返回结果，参数按名匹配，类型不兼容或值为 `undefined` 时跳过。完整规则见 [子图参数](docs/subgraphs.zh-CN.md)。独立子图文件由应用读取并组装，引擎不访问存储。

## 开发与测试

从仓库根运行：

```sh
pnpm --filter @lyx-pj/primflow-engine test
pnpm --filter @lyx-pj/primflow-engine typecheck
pnpm --filter @lyx-pj/primflow-engine lint
```

| 测试 | 覆盖的行为 |
| --- | --- |
| [engine.test.ts](tests/engine.test.ts) | 调度、依赖、断点、停止、普通子图参数 |
| [tasks.test.ts](tests/tasks.test.ts) | 并发隔离、事件、单任务取消与历史 |
| [lifecycle.test.ts](tests/lifecycle.test.ts) | 生命周期资源、初始化失败与清理 |
| [loops.test.ts](tests/loops.test.ts) | 逐轮执行、跨轮的值、每轮数据隔离、限额与取消 |
| [boundaries.test.ts](tests/boundaries.test.ts) | 共享节点类与包边界 |

单文件测试使用 `pnpm --filter @lyx-pj/primflow-engine exec vitest run tests/loops.test.ts`。修改公共事件或查询时核对示例桥接，修改公开导出或依赖时运行 `pnpm build`。架构关系见 [架构说明](../../docs/architecture.zh-CN.md)，常用命令见根 [README](../../README.zh-CN.md)。
