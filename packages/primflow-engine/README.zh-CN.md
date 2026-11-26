# @lyx-pj/primflow-engine

[English](README.md) | 简体中文

按图执行工作流。读取 [model](../primflow-model/README.zh-CN.md) 定义的图，按连线推进节点，并处理事件、任务、断点、停止、循环和子图。

## 支持的宿主环境

引擎不绑定特定宿主环境，不访问 DOM、文件系统或浏览器 API，可以运行在浏览器、Node、Worker 或其他提供 Web 标准全局 API（`structuredClone`、`AbortController`、`setTimeout` 等）的宿主中。

节点执行器由应用提供，需要连接、文件或计时器时，由应用在注册服务或节点生命周期里完成。引擎只接收已经准备好的图，不读取浏览器文件，也不假设自己在浏览器里。

## 运行一个工作流

```ts
import { Engine, NodeRegistry } from '@lyx-pj/primflow-engine'

const registry = new NodeRegistry()
const engine = new Engine(registry)

engine.loadGraph(json)
await engine.start()
const tasks = engine.getTasks()

engine.stop()
await engine.whenStopped()
```

- `NodeRegistry` 要先注册图里用到的自定义节点；只用内置节点时可以直接使用空的注册表。
- `loadGraph()` 加载并校验图，`start()` 启动会话和首个任务，`getTasks()` 查看这次执行产生的任务。
- `Engine` 启动后会保持运行，继续接收事件。用户停止或页面卸载时调用 `stop()`；需要等待异步清理时再 `await whenStopped()`。
- 含常驻 Timer 或事件监听的应用，建议把 `Engine` 保存在应用生命周期里，而不是每次执行都新建。
- 节点怎么定义和注册见 [model README](../primflow-model/README.zh-CN.md)；事件源和定时器的例子见 [示例内部模块](../../examples/primflow-react/packages/workflow/README.zh-CN.md)。

声明 `definition.valueOutputs` 的节点在下游准备输入时按需求值，在子图和循环帧中规则相同。引擎沿数据连线寻找上游值，需要上游执行节点产出时会等待，连线没有可用值时读取节点的配置值或默认值。这类节点保持空闲，不出现在执行链中。如果下游使用的取值链形成环，加载图时会报错。

使用 `valueOutputs.read` 的输出在下游准备输入时读取同一份任务状态快照。读取抛错时，调度器将错误记在下游节点的对应输入上，并保留错误码。读取器抛出标记了 `retryable: true` 的 `NodeExecutionError` 时，按下游节点的策略重试。下游校验拒绝读到的值时也适用这套重试规则。重试先读取最新状态，再调用执行器。错误记录中的 `inputSource.stateVersion` 标识失败那次读取的状态版本。

### 定义执行器

用 `defineNode` 声明端口和执行器名称，用 `defineExecutor` 绑定实现。应用可以把节点定义发布给前端，并在运行端注册执行器。

```ts
import { defineExecutor, defineNode, defineService, Engine, NodeRegistry } from '@lyx-pj/primflow-engine'

const FindUser = defineNode({
  executor: 'backend.find-user',
  definition: {
    inputs: [{ name: 'exec', type: 'exec' }, { name: 'id', type: 'string' }],
    outputs: [{ name: 'done', type: 'exec' }, { name: 'body', type: 'string' }],
  },
})

const http = defineService('http', { value: httpClient })
const user = defineService('user', {
  dependsOn: [http],
  create(ctx) {
    const client = ctx.getService('http')
    return { getById: (id: string) => client.get(`/users/${id}`) }
  },
})

const findUser = defineExecutor(FindUser, async ({ getInput, setOutput, next, services }) => {
  const id = getInput('id')
  if (id === undefined) throw new Error('User ID is required.')
  setOutput('body', await services.require('user').getById(id))
  await next(['done'])
}, { services: [user] })

const registry = new NodeRegistry().register('FindUser', FindUser)
const engine = new Engine(registry, { services: [user, http] })
engine.registerExecutor(findUser)
```

上例的 `httpClient.get` 接收路径并返回 `Promise<string>`。`defineExecutor` 从定义推断数据输入、数据输出和执行分支。输入可能缺失，`any` 端口的值按 `unknown` 读取。画布编辑和 JSON 加载产生的运行时数据仍应按业务所需校验。

固定端口适合使用推断式执行器，动态端口可在 `defineNode` 中使用同文件的 `executor` 函数，从 `ctx.inputs` 与 `ctx.outputs` 读取实例端口。引擎依次查找同文件的执行函数、按节点声明名称注册的执行器，以及按定义 ID 注册的执行器描述。找不到实现时，节点运行失败并报告 `No executor for <definitionId>`。

### 定义服务

用 `value` 提供已创建的对象或可调用函数，用 `create` 提供同步工厂。工厂通过 `dependsOn` 声明直接依赖，`ctx.getService(name)` 从这些依赖推断服务类型。引擎在构造时先检查缺失、同名不同定义、重复和循环依赖，再按依赖顺序创建服务。每个工厂在一次引擎构造中执行一次，后续任务复用其结果。

`defineExecutor` 的 `services` 选项为回调提供服务类型。注册执行器时，引擎检查相同的服务定义是否已经装入。执行器通过 `ctx.services.require(name)` 或 `ctx.services.get(name)` 读取该值。`require` 在缺失时抛出包含服务名的错误，`get` 返回 `undefined`。应用负责释放服务资源，随会话释放的节点资源使用生命周期钩子。

应用还可以用 `EngineOptions.context` 或 `engine.setContext(value)` 提供任务级上下文。引擎为每个任务复制一份，节点通过 `ctx.context` 读取。不可复制的对象可通过服务传入。

### 同一个输入的多个数据源

输入只有一条数据线时，即使节点由其他执行分支触发，它也会等这条线的数据源就绪。一个输入有多条数据线时，引擎按每次触发分别选源：

1. 从当前执行路径往回查找，使用最近的候选节点在本次执行中提交的输出。
2. 当前路径上没有候选时，按图 JSON 的 `links` 顺序倒查，使用排在最后的已就绪来源。所有候选都还未就绪时，有候选提交后再倒查。如果多条数据线命中同一次节点执行，也按 `links` 顺序取最后一条。

选定的来源和值会固定，即使这次触发还在等其他输入。例如，执行路径是 `a → b → e` 和 `a → c → e`，且 `b`、`c` 的输出连到 `e` 的同一个输入，两次执行分别读取本次 `b` 或 `c` 的输出。每次触发只等本次选中的数据源。按需求值的数据节点沿输入追踪实际的执行来源，子图和循环帧在各自的区域内选源。

## 实时进度与流端口

执行器可调用 `ctx.emitProgress('text', fragment)`，应用订阅 `task:node:progress`，用 `taskId`、`executionId` 和 `sequence` 更新预览。每次重试使用不同的执行标识，关闭 trace 时仍能接收。最终值通过 `setOutput()` 写入。

节点间使用流时，生产者调用 `ctx.openStream('deltas')`，依次等待 `writer.write(chunk)`，最后调用 `writer.close()`。消费者声明 `executionMode: 'stream'`，在流打开后执行，并通过 `for await (const chunk of ctx.getStream('deltas'))` 读取。每块数据按注册类型校验，队列满时写入等待。异常和取消会解除读写等待，有 trace 时记录写入数量。

流可用于主图的普通节点。一条流只允许一个生产者和一个消费者。消费者只有一个流输入，可以另外配置普通输入值。带流端口的节点不配置重试，也不能放在子图或循环体中。

`loadGraph()` 检查缺失的类型定义和预设值。已有内置类型不匹配的连线默认兼容，传入 `strictDataTypes: true` 可让引擎加载时拒绝。

## 任务业务状态

每个任务都拥有一份独立的 JSON 状态。启动和每次投递事件分别创建任务。主图、子图和循环帧里的节点都通过 `ctx.state` 访问所属任务的状态。单独调用 `runNode()` 或 `executeNode()` 也会为这次调用创建一份状态。

```ts
const CountStep = defineNode({
  executor: 'count-step',
  definition: {
    inputs: [{ name: 'exec', type: 'exec' }],
    outputs: [{ name: 'done', type: 'exec' }],
  },
})
const registry = new NodeRegistry().register('CountStep', CountStep)
const engine = new Engine(registry, {
  context: { username: 'alice' },
  state: {
    count: {
      initial: 0,
      reducer: (current: number, delta: number) => current + delta,
    },
  },
})

engine.registerExecutor(defineExecutor(CountStep, async (ctx) => {
  ctx.state.update({ count: 1 })
  await ctx.next()
}))

engine.loadGraph(json)
await engine.start({ initialState: { count: 10 } })
const event = await engine.dispatchEventWithOptions('increment', { initialState: { count: 7 } }, payload)
if (event) console.log(engine.getTaskState(event.id))
```

- `ctx.state.get(key)` 和 `ctx.state.snapshot()` 读取本次节点执行开始时的只读版本。尚未写入的字段返回 `undefined`，快照包含 `{ version, values }`。
- `ctx.state.update(patch)` 暂存局部更新。节点调用 `next()` 时，引擎先原子提交再交给下游。执行器正常返回时也会提交剩余更新。失败或取消会丢弃尚未提交的更新，已提交的值仍可读取。任务仍有效时，重复或延迟调用 `next()` 只提交新暂存的更新。循环帧接受写入直到本次节点交接或结束。
- 状态默认从 `{}` 开始。`EngineOptions.state` 可以按字段配置 `initial`、`validate` 和 `reducer`。应用在启动、投递事件或独立执行时传入的 `initialState` 直接覆盖对应初始值。校验函数检查初始值和提交值。状态字段使用 JSON 值，节点可以写入未配置的新字段。
- Reducer 同步执行且应保持纯函数行为。它接收当前批次暂存的最新字段值，或此前已提交的字段值，以及节点提交的更新。两个并行节点各加 `1` 会累加为 `2`。没有 reducer 的字段使用替换规则。如果该字段在节点开始读取后，或在该节点上次提交此字段后已被其他执行修改，则整批替换报冲突。顺序敏感的 reducer 按提交顺序运行，需要固定顺序时用执行依赖表达。

通过 `engine.getTaskState(taskId)` 查看最新提交的快照。任务结束或停止后仍可查询保留的快照。通过 `engine.on('task:state:committed', (taskId, { nodeId, version, changes }) => …)` 监听提交后的字段值。每批非空更新成功提交后，版本加一。状态保存在内存中，随任务历史一起淘汰。

生命周期钩子可继续使用 `ctx.nodeState` 管理会话资源。用 `on()` 或 `once()` 注册的回调会拿到事件任务的状态。静态 `onEvent` 过滤器仅在触发执行器时提交暂存的更新。

## 事件和任务

每次启动或每次业务事件都会创建一个任务。任务之间互相独立：同名的两个事件可以同时执行，结果不会互相覆盖，取消、暂停或失败也只影响对应的任务。执行器和服务注册在同一个引擎实例内共享；连接等长驻资源可以通过 `ctx.nodeState` 访问，并发一致性由业务代码保证。

事件参数在提交时复制，需要支持 `structuredClone`。连接、函数等不可克隆资源应放在注册服务或生命周期的 `nodeState` 中。不可克隆的事件参数会让 `dispatchEvent()` 拒绝，节点通过 `ctx.emitEvent()` 投递时则由引擎的 `error` 事件报告失败。可以同时投递多个事件：

```ts
const engine = new Engine(registry, { maxTaskHistory: 100 })
engine.loadGraph(graph.toJSON())
await engine.start()

const [a, b] = await Promise.all([
  engine.dispatchEvent('message', { text: 'A' }),
  engine.dispatchEvent('message', { text: 'B' }),
])
```

`start()` 和 `dispatchEvent()` 返回的 Promise 只等待本轮调度，不代表整个工作流结束。执行器把 `ctx.next()` 保存下来、之后再调用时，任务会重新进入运行状态。节点里也可以用 `ctx.emitEvent()` 发出事件，这会创建另一个任务，并记录来源任务的 `parentTaskId`。

任务被取消、历史淘汰或工作流停止后，旧上下文不再推进执行或写入输出。事件任务从监听节点开始，允许事件源不连 Start，也不会借用其他任务的结果补齐自己的数据依赖。

### 任务状态

| 状态 | 含义 |
| --- | --- |
| `running` | 正在执行，或有节点还没返回 |
| `waiting` | 本轮已经退出，但仍有节点在等待本任务的数据 |
| `paused` | 命中断点，等待继续 |
| `interrupted` | 至少一个节点正在等待业务答复 |
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
- 取消任务时，正在运行、等待业务答复或已触发但仍在等依赖的节点，会在任务历史中记为 `cancelled`。其余节点保留最后的记录。
- 任务快照包含 id、来源、状态、开始和结束时间、当前断点、待答复的中断和错误列表。
- 停止或重新加载后，仍可按 `taskId` 查询保留下来的状态、执行数据和当时的图。
- `nodeId` 为空的任务错误表示任务整体初始化失败。
- 默认保留最近 100 个已结束任务，可用 `maxTaskHistory` 调整，设为 `0` 表示不保留。运行、断点暂停、依赖等待和业务中断中的任务会保留到结束或停止。
- `engine.on()` 的观察者抛错只会被记录，不会影响其他观察者或任务。

节点执行状态为 `idle`、`pending`、`running`、`completed`、`failed`、`cancelled`、`skipped` 和 `interrupted`，每个任务独立记录。`next()` 交接后本节点立即完成，无需等待下游返回。如果执行器在交接后抛错，节点会记为 `failed`，已发生的交接仍然有效。

节点选择执行出口后，只能经由本次未选出口到达的下游节点可以标记为 `skipped`。可由其他路径到达的节点和已触发但正在等输入的节点保留当前状态。这个状态记录当次分支决策，后续交接仍可激活已跳过的节点。

通过[执行日志](docs/execution-trace.zh-CN.md)直接查询每次节点执行、等待的输入、分支交接、重试与循环轮次。

## 业务中断

已调度的节点可以先等待应用答复，再向下游交接执行：

```ts
const answer = await ctx.interrupt({ question: 'Approve this request?' })
return ctx.next([answer === true ? 'approved' : 'rejected'])
```

监听 `task:changed` 或查询 `engine.getTask(taskId)?.interrupts`，可获取每个请求的 `id`、`nodeId` 和 JSON `value`。循环内的请求还带有 `frameId` 和 `loop` 作用域。收到答复后调用 `engine.resumeInterrupt(taskId, interruptId, answer)`。接受答复时返回 `true`，请求已关闭或标识不匹配时返回 `false`。

答复会让原有引擎会话里的 `await` 继续执行。重启引擎或重新加载图会结束会话并丢弃未答复的请求。`engine.resume()` 用于继续调试断点。如果同一任务同时有断点和业务中断，任务状态显示 `paused`，业务请求仍可在 `interrupts` 中查询。

## 断点、继续和停止

```ts
void engine.start({ debug: true })
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
- 首轮任务完成后引擎仍保持运行以接收事件；运行中再次 `start()` 会被拒绝，需要先停止。
- `engine.pausedNode` 对应最新任务的断点；查看其他任务的断点请用 `getTask(taskId).pausedNode`。

`start()` 只接受运行选项，不接收业务数据。主图 Start 只有执行出口，业务数据通过节点输入、变量、执行上下文或事件提供。普通子图 Start 可以保留参数端口，见下文「循环和子图」。

## 节点生命周期

| 钩子 | 负责什么 |
| --- | --- |
| `onActive(ctx)` | 引擎启动时初始化资源、建立连接、订阅事件；全部节点激活完成后才开始执行任务 |
| `onDeactivate(ctx)` | 引擎停止时取消监听、断开连接、停止后台活动 |
| `onDestroy(ctx)` | 最终释放实例资源；已加载但未激活的节点也会销毁 |

生命周期覆盖主图和全部子图节点，包括没有连到 Start 的节点。它只在每次工作流会话中触发一次，执行多少任务都不会重复建立订阅。停止时所有节点先停用再销毁，单个清理失败不会跳过其他节点。激活失败会回收已创建的节点，并让 `start()` 拒绝。

```ts
import { defineNode } from '@lyx-pj/primflow-model'

const MessageNode = defineNode({
  definition: {
    inputs: [],
    outputs: [{ name: 'next', type: 'exec' }, { name: 'value', type: 'any' }],
  },

  onActive(ctx) {
    ctx.nodeState.listening = true
    ctx.on('message', async (taskCtx, message) => {
      taskCtx.taskState!.message = message
      taskCtx.setOutput('value', message)
      await taskCtx.next()
    })
    const timer = setInterval(() => { ctx.nodeState.lastTick = Date.now() }, 1000)
    ctx.onCleanup(() => clearInterval(timer))
  },

  onDeactivate(ctx) {
    ctx.nodeState.listening = false
  },

  onDestroy(ctx) {
    delete ctx.nodeState.lastTick
  },
})
```

- `ctx.on(name, handler)` 和 `ctx.once(name, handler)` 返回退订函数，停止时自动失效。即使事件并发到达，`once` 也会在第一次调用回调前退订。
- 回调可用 `taskCtx.executeSelf()` 申请由调度器在本次事件任务中运行当前节点的执行器，执行器通过 `ctx.event.name` 和 `ctx.event.payload` 读取事件。回调也可以设置输出后调用 `taskCtx.next()` 直接交接下游。每个回调选择一种交接方式。
- 生命周期的 `ctx.nodeState` 保存引擎级别的资源；`taskCtx.taskState` 是每个任务独立的临时状态；`taskCtx.nodeState` 用于显式共享资源。
- 生命周期里初始化的输入、输出和 `data` 会复制成新任务的初始值，资源对象本身不会被复制。
- `ctx.onCleanup(fn)` 注册额外的清理函数，按注册的逆序执行；清理错误通过 `node:error` 报告，`whenStopped()` 会等待全部清理完成。
- 初始化应响应 `ctx.signal`；停止时会等待激活钩子退出。
- 钩子不提供 `next`，但停用和销毁时仍可访问旧实例的数据。
- 主动停止或重新加载会销毁运行时实例，保留图配置、节点定义和画布节点；下一次运行会从保留的配置重建。

单独的 `runNode()` / `executeNode()` 只执行节点，不启动生命周期，也不会进入任务列表。

## 节点失败与重试

节点通过 `retryPolicy: { idempotent: true, maxRetries: 2 }` 声明同一操作可安全重跑，初次执行失败后最多再试两次。声明前应确认外部写入也可以安全重复。执行器可用 `new NodeExecutionError('Request timed out', { kind: 'execution', code: 'TIMEOUT', retryable: true })` 报告可重试的故障。调度器用本次输入重试，重试发生在执行器调用 `next()` 交接之前。`once` 只接收一次事件，执行器重试继续使用同一份事件数据。

重试时序可在构造引擎时设置，也可在 `start()` 中逐字段覆盖本次会话（包括事件任务）。

```ts
const engine = new Engine(registry, {
  retry: { initialIntervalMs: 500, maxIntervalMs: 8_000, timeoutMs: 10_000 },
})
await engine.start({ retry: { initialIntervalMs: 1_500, jitter: false } })
```

- 首次等待默认 500 毫秒，基础间隔每次翻倍，上限默认 128000 毫秒。默认打开抖动，每次在基础间隔上随机增加 0 到 1000 毫秒。
- `timeoutMs` 从首次触发恢复的失败开始计时。超时后停止发起后续重试，并以 `RETRY_TIMEOUT` 走失败路径。已经开始的尝试可继续执行。默认不限时，`null` 可以清除构造时设置的超时。
- 等待期间其他分支继续执行。停止任务会取消等待，上游重跑在等待结束后读取新的状态快照。

输入数据无效时，抛出带 `kind: 'input'`、`retryable: true` 和 `inputPort` 端口名的 `NodeExecutionError`。引擎根据本次实际取值追溯生产节点及输出。路径上的节点用 `outputValidators: { outputName: (value) => /* 返回校验结果 */ }` 声明纯校验规则。追溯到第一个校验通过的上游输出后，调度器从它的生产节点起，在同一任务内重跑到消费节点。重跑经过的每个节点都须允许重试且预算充足。首版追溯覆盖普通图中沿单一执行路径直连的单一数据来源。来源无法确认、缺少校验、路径不明确或预算用完时，保留失败。

执行器可从 `ctx.retry` 读取当前尝试编号、剩余次数、重跑起点和上一次错误。通过 `NodeExecutionError` 的可选 JSON `details` 字段传递缺失字段等诊断信息，上游执行器重跑时也能读取。

每次尝试暂存输出和未提交的 `ctx.state` 更新。上游重跑区间的新状态在恢复节点成功后发布。已提交的状态和已经发生的外部操作仍然保留。重试策略用于主图和普通子图中由调度器执行的节点，循环帧内沿用循环的失败行为。节点交接下游后发生的错误会记录为失败。

可通过 `retryPolicy.fallback` 配置已声明的执行出口 `port` 和替代数据 `outputs`。无法继续恢复时，引擎走该出口，并通过下游的 `ctx.error` 传递原始错误。未处理的失败会终止当前路径。任务快照的 `attempts` 字段和 `task:node:attempt` 事件提供尝试次数、错误详情和输入来源。

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
| [boundaries.test.ts](tests/boundaries.test.ts) | 共享节点定义入口与包边界 |

单文件测试使用 `pnpm --filter @lyx-pj/primflow-engine exec vitest run tests/loops.test.ts`。修改公共事件或查询时核对示例桥接，修改公开导出或依赖时运行 `pnpm build`。架构关系见 [架构说明](../../docs/architecture.zh-CN.md)，常用命令见根 [README](../../README.zh-CN.md)。
