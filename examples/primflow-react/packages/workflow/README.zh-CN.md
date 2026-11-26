# 示例内部 workflow 模块

[English](README.md) | 简体中文

这是 `primflow-react-example` 内部的应用集成模块，通过相对路径导入，不是独立 workspace 包，也不单独发布。它连接通用库与示例的节点、文件、运行控制、日志和自动保存。

## 文件与责任

| 入口 | 责任 | 示例测试 |
| --- | --- | --- |
| [index.ts](index.ts) | 对页面暴露 Provider、hooks、语言工具和文件类型 | 集成测试 |
| [i18n.ts](i18n.ts) | 浏览器语言检测、应用文案、节点显示语言 | `i18n.test.ts`、`nodes.test.ts`、`view-switcher.test.tsx` |
| [context/graph-context.ts](context/graph-context.ts) | 画布 options、节点默认值、palette、面板和工具栏 | `debug.test.ts`、`nodes.test.ts` |
| [context/asset-editors.ts](context/asset-editors.ts) | 为图片数据类型注册的端口编辑器和面板编辑器 | `e2e/workflow.e2e.ts` |
| [context/asset-preview.ts](context/asset-preview.ts) | 资产对象 URL 缓存，供节点卡片和面板预览共用 | `e2e/workflow.e2e.ts` |
| [context/node-renderers.ts](context/node-renderers.ts)、[panel-sections.ts](context/panel-sections.ts) | 演示节点和图片文件节点的自定义卡片，以及面板区块 | `e2e/workflow.e2e.ts` |
| [context/engine-context.ts](context/engine-context.ts) | 为引擎 Provider 装配引擎、服务和执行器 | `executors.test.ts` |
| [nodes/index.ts](nodes/index.ts)、[nodes/catalog.ts](nodes/catalog.ts) | 注册节点、展示分类、关键词与默认值 | `nodes.test.ts`、`events.test.ts`、`timer.test.ts`、`loop.test.ts` |
| [executors/index.ts](executors/index.ts) | 节点之外的执行器实现 | `executors.test.ts` |
| [executors/http.ts](executors/http.ts)、[services/http.ts](services/http.ts) | HTTP 节点执行器，以及通过 `defineService` 注册的浏览器 Fetch 服务 | `http.test.ts` |
| [use-workflow.ts](use-workflow.ts) | 文件管理、恢复、自动保存与 React 生命周期 | `autosave.test.ts`、`restore.test.ts`、`subgraphs.test.ts` |
| [storage.ts](storage.ts) | IndexedDB 中的文件与元数据 CRUD | `storage.test.ts` |
| [views.ts](views.ts) | 文件命名、恢复校验、独立子图 Start id 规范化 | `views.test.ts`、`restore.test.ts` |
| [subgraphs.ts](subgraphs.ts) | 子图面板条目、执行前跨文件递归组装 | `subgraphs.test.ts` |
| [events.ts](events.ts) | 工具栏动作、引擎事件到 canvas 的桥接、历史回溯 | `debug.test.ts` |
| [debug.ts](debug.ts) | 引擎执行日志到面板日志的转换、业务日志通道 | `debug.test.ts` |
| [records.ts](records.ts) | 固定执行来源、记录标题与事件监听节点定位 | `records.test.ts` |
| [scopes.ts](scopes.ts) | 从任务图推导节点标题与子图作用域 | `scopes.test.ts` |

测试文件均在应用的 [tests/](../../tests) 下。从仓库根运行，过滤名使用 `primflow-react-example`。

## 集成链路

**语言**：应用启动时从 `navigator.language` / `navigator.languages` 取首个受支持的 `zh` / `en` 标签，页面文案、节点目录、节点定义、工具栏和画布内置 UI 使用同一语言；不支持的语言回退英文。语言只影响展示，不改变节点类型、协议值或已保存的图 JSON，文件里的自定义标题保持原样。

**编辑与保存**：Graph 变化 → `useWorkflow` 标记待保存 → 延迟 600ms 写入当前文件；切换前保存来源文件。首次启动先读取本地文件，`booting` 期间用加载遮罩盖住画布，读完后再展示；恢复失败保留原数据。Hook 会安装 IndexedDB 预览缓存适配器，并在恢复文件前等待 `preloadSubgraphPreviews()`，使子图卡片首帧就能显示缓存图。回溯显示历史图时暂停自动保存。

**编辑导航**：双击外部子图 → `useWorkflow.openSubgraph()` 记录来源文件 id 与内嵌层级 → 保存来源并切换。画布的 `navigation` 回调由 Hook 提供，空白处右键双击等返回入口先退出内嵌层级，再返回来源文件。路径只存于当前会话的 ref，不进入图 JSON、文件存储或撤销栈；直接选择文件与新建文件会清空路径，返回保存失败时保留路径供重试。

**运行与子图**：工具栏动作 → `events.ts` 请求执行图 → `subgraphs.ts` 读取独立子图并递归组装 → `engine.loadGraph()` / `start({ debug })`。文件的独立保存结构不等于引擎的内嵌执行图，保存时不要把运行时组装结果写回源文件。

**观察与回溯**：面板的任务记录来自 `engine.getTasks()`，日志来自 `engine.getTaskTrace()` 的执行日志事件，按事件逐条转换后与业务日志合并，按时间排序成一条流。执行记录按任务列出，正在执行的任务也显示为「运行中」，结束后更新为最终状态；有任务在运行时记录不可回溯，回溯结束后恢复编辑图。引擎保留任务真值，canvas 不采集或持久化日志。

**人工审批**由[示例节点](nodes/Execution.ts)调用 `ctx.interrupt()` 发起。[待审批面板](../../src/components/ApprovalPanel.tsx)读取任务快照中的待答复请求，并通过 `engine.resumeInterrupt()` 提交用户的布尔答复。任务结束或停止后，面板会移除相应请求。

## 调试面板与引擎日志

- 面板不自行监听引擎事件收集日志：任务记录读 `engine.getTasks()`，日志读 `engine.getTaskTrace()`，逐条把 `TaskTraceEvent` 转成面板日志项。
- 每条日志保留引擎事件类型（如 `activation:status`、`task:status`、`loop:invocation`），面板按类型显示标签，节点执行、重试等待和循环轮次一眼可辨。
- 重试失败的原因取自引擎的尝试记录（`attempts[].failure`），包含错误码、消息和无效输入来源；面板不重复采集。
- 业务节点自己的输出写入 `appendBusinessLog(taskId, message)`，作为 `app:log` 一类并入同一条流。
- 应用根据执行时保存的图查找节点名称和所在子图；切换编辑文件后，已有记录仍显示执行时的名称。
- 子图作用域来自 `scopes.ts`，日志按层级缩进并加上子图名称前缀。

## 新增业务节点

1. 在 `nodes/` 用 `defineNode` 声明端口。纯逻辑节点可以在同一份定义中写 `executor` 函数。需要外部依赖或分离发布的节点声明执行器名称，再在 `executors/` 用 `defineExecutor` 绑定实现。资源节点使用生命周期钩子，长期事件源声明 `executionMode: 'source'`。
2. 在 `nodes/index.ts` 注册定义 ID，确保图的 `definitionId` 与注册值一致。
3. 在 `context/engine-context.ts` 注册独立执行器，并装入所需的服务定义。
4. 在 `nodes/catalog.ts` 添加分类、说明、搜索关键词与演示默认值；canvas 通过回调读取这些应用信息。
5. 在应用 `tests/` 添加行为测试，覆盖输入输出、执行分支，以及适用的停止和资源释放场景。
6. 更新 [示例 README](../../README.zh-CN.md) 的节点能力与操作例子。

节点定义和目录以英文为源：中文放在 `localize` 的第二个参数和 `demoNodeCopies` 的 `zh` 条目里。示例代码注释统一使用英文。

局部算法节点可参考 [Concat.ts](nodes/Concat.ts)，事件和资源可参考 [Event.ts](nodes/Event.ts) 与 [Timer.ts](nodes/Timer.ts)。只有定义的节点可参考 [Print.ts](nodes/Print.ts) 与 [executors/index.ts](executors/index.ts)。循环使用 model 的内置控制节点与 engine 的循环协议。

## 数据边界与验证

文件使用 IndexedDB `bpgraph/views`；localStorage 的 `bpgraph:lastViewId` 仅保存最近文件 id。调试日志随引擎任务保留，不属于文件存档或持久化审计；业务日志是有数量限制的内存记录。

```sh
pnpm --filter primflow-react-example exec vitest run tests/autosave.test.ts tests/subgraphs.test.ts
pnpm --filter primflow-react-example typecheck
pnpm --filter primflow-react-example lint
```

复用 `tests/helpers.ts`、`fake-storage.ts` 和 `fake-indexeddb.ts`；不要使用真实外部服务验证本地示例节点。
