# 示例内部 workflow 模块

[English](README.md) | 简体中文

这是 `primflow-react-example` 内部的应用集成模块，通过相对路径导入，不是独立 workspace 包，也不单独发布。它连接通用库与示例的节点、文件、运行控制、日志和自动保存。

## 文件与责任

| 入口 | 责任 | 示例测试 |
| --- | --- | --- |
| [index.ts](index.ts) | 对页面暴露 Provider、hooks、语言工具和文件类型 | 集成测试 |
| [i18n.ts](i18n.ts) | 浏览器语言检测、应用文案、节点显示语言 | `i18n.test.ts`、`nodes.test.ts`、`view-switcher.test.tsx` |
| [context/graph-context.ts](context/graph-context.ts) | 画布 options、节点默认值、palette、面板和工具栏 | `debug.test.ts`、`nodes.test.ts` |
| [context/engine-context.ts](context/engine-context.ts) | 创建 Runtime 和 Engine Context | `nodes.test.ts` |
| [nodes/index.ts](nodes/index.ts)、[nodes/catalog.ts](nodes/catalog.ts) | 注册节点、展示分类、关键词与默认值 | `nodes.test.ts`、`events.test.ts`、`timer.test.ts`、`loop.test.ts` |
| [use-workflow.ts](use-workflow.ts) | 文件管理、恢复、自动保存与 React 生命周期 | `autosave.test.ts`、`restore.test.ts`、`subgraphs.test.ts` |
| [storage.ts](storage.ts) | IndexedDB 中的文件与元数据 CRUD | `storage.test.ts` |
| [views.ts](views.ts) | 文件命名、恢复校验、独立子图 Start id 规范化 | `views.test.ts`、`restore.test.ts` |
| [subgraphs.ts](subgraphs.ts) | 子图面板条目、执行前跨文件递归组装 | `subgraphs.test.ts` |
| [events.ts](events.ts) | 工具栏动作、引擎事件到 canvas 的桥接、历史回溯 | `debug.test.ts` |
| [debug.ts](debug.ts) | 按任务保留日志和执行链临时记录 | `debug.test.ts` |
| [records.ts](records.ts) | 固定执行来源、记录标题与事件监听节点定位 | `records.test.ts` |
| [scopes.ts](scopes.ts) | 从任务图推导节点标题、子图作用域与角色 | `scopes.test.ts` |

测试文件均在应用的 [tests/](../../tests) 下。从仓库根运行，过滤名使用 `primflow-react-example`。

## 集成链路

**语言**：应用启动时从 `navigator.language` / `navigator.languages` 取首个受支持的 `zh` / `en` 标签，页面文案、节点目录、节点定义、工具栏和画布内置 UI 使用同一语言；不支持的语言回退英文。语言只影响展示，不改变节点类型、协议值或已保存的图 JSON，文件里的自定义标题保持原样。

**编辑与保存**：Graph 变化 → `useWorkflow` 标记待保存 → 延迟 600ms 写入当前文件；切换前保存来源文件。首次启动先读取本地文件，`booting` 期间用加载遮罩盖住画布，读完后再展示；恢复失败保留原数据。回溯显示历史图时暂停自动保存。

**编辑导航**：双击外部子图 → `useWorkflow.openSubgraph()` 记录来源文件 id 与内嵌层级 → 保存来源并切换。画布的 `navigation` 回调由 Hook 提供，空白处右键双击等返回入口先退出内嵌层级，再返回来源文件。路径只存于当前会话的 ref，不进入图 JSON、文件存储或撤销栈；直接选择文件与新建文件会清空路径，返回保存失败时保留路径供重试。

**运行与子图**：工具栏动作 → `events.ts` 请求执行图 → `subgraphs.ts` 读取独立子图并递归组装 → `engine.fromJSON()` / `process({ debug })`。文件的独立保存结构不等于引擎的内嵌执行图，保存时不要把运行时组装结果写回源文件。

**观察与回溯**：Engine 任务事件 → 按 taskId 记录日志、执行链、来源与节点作用域 → 转换为 canvas 的展示数据。已停止会话中的历史任务可回溯；退出后恢复编辑图。引擎保留任务真值，canvas 不采集或持久化日志。

## 子图作用域与调试记录

- 执行链按子图层级缩进，并区分调用节点、入口、内部节点和出口；日志加上子图名称，帮助判断记录来源。
- 应用根据执行时保存的图查找节点名称和所在子图；切换编辑文件后，已有记录仍显示执行时的名称。
- 更新执行状态时按任务和节点查找记录，避免把子图调用的完成状态写到最后一个内部节点上。
- 相关类型是 `DebugScope` 与 `DebugChainKind`，解析见 [scopes.ts](scopes.ts)。执行链可以显示子图层级，但不能按子图折叠。

## 新增业务节点

1. 在 `nodes/` 添加 `Node` 子类，声明端口与执行器。资源节点使用生命周期钩子，长期事件源声明 `executionMode: 'source'`。
2. 在 `nodes/index.ts` 注册类型名，确保图的 `nodeType` 与注册名一致。
3. 在 `nodes/catalog.ts` 添加分类、说明、搜索关键词与演示默认值；canvas 通过回调读取这些应用信息。
4. 在应用 `tests/` 添加行为测试，覆盖输入输出、执行分支，以及适用的停止和资源释放场景。
5. 更新 [示例 README](../../README.zh-CN.md) 的节点能力与操作例子。

节点定义和目录以英文为源：中文放在 `localize` 的第二个参数和 `demoNodeCopies` 的 `zh` 条目里。示例代码注释统一使用英文。

局部算法节点可参考 [Concat.ts](nodes/Concat.ts)，事件和资源可参考 [Event.ts](nodes/Event.ts) 与 [Timer.ts](nodes/Timer.ts)。循环使用 model 的内置控制节点与 engine 的循环协议。

## 数据边界与验证

文件使用 IndexedDB `bpgraph/views`；localStorage 的 `bpgraph:lastViewId` 仅保存最近文件 id。调试日志与执行链是有数量限制的内存记录，不属于文件存档或持久化审计。

```sh
pnpm --filter primflow-react-example exec vitest run tests/autosave.test.ts tests/subgraphs.test.ts
pnpm --filter primflow-react-example typecheck
pnpm --filter primflow-react-example lint
```

复用 `tests/helpers.ts`、`fake-storage.ts` 和 `fake-indexeddb.ts`；不要使用真实外部服务验证本地示例节点。
