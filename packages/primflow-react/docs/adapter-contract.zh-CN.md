# React 与画布接入

[English](adapter-contract.md) | 简体中文

React 包负责让画布和引擎配合组件的挂载、更新和卸载。菜单、节点面板、调试面板等界面由 [canvas](../../primflow-canvas/README.zh-CN.md) 提供，文件保存和运行控制由应用负责。

完整用法见 [React README](../README.zh-CN.md)，模块关系见 [架构说明](../../../docs/architecture.zh-CN.md)。

## 各层分别做什么

| 位置 | 负责的工作 |
| --- | --- |
| canvas | 创建画布、处理节点和连线、绑定画布事件、显示菜单与面板 |
| react | 提供 `GraphProvider`、`EngineProvider` 和 `GraphView`，保存组件使用的实例 |
| 应用 | 注册业务节点、执行流程、保存文件，把引擎结果传给画布 |

画布不会直接调用引擎；节点状态、日志和历史记录都由应用传入。

## 挂载和卸载

`GraphView` 必须接收 `graph` 属性，并设置明确高度，或让父容器提供高度。它内部调用 `graph.mount`，组件卸载时调用返回的清理函数。

核心做法如下，完整实现见 [GraphView](../src/components/graph-view/graph-view.tsx)：

```tsx
useEffect(() => {
  const container = containerRef.current
  if (!container) return
  return graph.mount(container, () => handlersRef.current, optionsRef.current)
}, [graph])
```

- `GraphProvider` 在同一次挂载期间保留同一个 `Graph` 实例。
- `EngineProvider` 保留同一个 `Engine`，卸载时调用 `stop()`；需要等待异步清理时使用 `whenStopped()`。
- 事件触发时读取最新回调，避免使用已经过期的 props。
- 不在 React 中重新实现画布菜单，也不直接操作 JointJS 内部对象。

## 画布能力

画布的挂载、事件名、保存加载、缩放、子图导航、回溯和 UI 配置由 canvas 维护，完整接口见 [canvas README](../../primflow-canvas/README.zh-CN.md)：

| 需要做什么 | 调用方式 |
| --- | --- |
| 挂载画布 | `graph.mount(container, handlers, options)`，返回清理函数 |
| 保存或加载图 | `graph.toJSON()` / `graph.fromJSON(json)` |
| 缩放和选择节点 | `graph.zoom(scale)`、`graph.select(node)`、`graph.clearSelection()` |
| 进入或退出内嵌子图 | `graph.enterSubgraph()` / `graph.exitSubgraph()` |
| 返回来源文件 | `graph.setOptions({ navigation })`，见 [子图与导航](../../primflow-canvas/docs/subgraphs.zh-CN.md) |
| 历史回溯 | `graph.enterReplay(json, options)` / `graph.exitReplay()` |
| 菜单和面板 | `palette`、`contextMenu`、`nodePanel`、`debugPanel`、`toolbar` 配置；设为 `false` 关闭 |

`handlers` 使用 `Graph` 的事件名，例如 `node:click`、`selection:changed`，不需要使用 JointJS 的事件名。它可以是回调表，也可以是每次返回最新回调表的函数。

进入回溯后，应用应暂停自动保存，退出后恢复。画布只负责显示历史内容并恢复编辑图，不保存任务历史。

## 构建

包之间从公开入口导入。canvas、engine 和 React 由使用方安装；React 包构建时不会把它们打包进来，避免出现两份节点类。

运行 `pnpm build` 会检查源码依赖、类型声明和构建文件。检查脚本见 [verify-boundaries.mjs](../../../scripts/verify-boundaries.mjs)，也可以单独运行 `pnpm verify`。

## 相关测试

- [React 测试](../tests/index.test.ts)：实例稳定、组件卸载后清理引擎资源。
- [画布交互测试](../../primflow-canvas/tests/ui.test.ts)：菜单、面板、回溯和交互清理。
- [engine](../../primflow-engine/tests/boundaries.test.ts) 和 [canvas](../../primflow-canvas/tests/boundaries.test.ts) 的共享类测试：确认各包使用相同的节点类。

`GraphView` 的新行为需要补充对应测试；现有 React 测试主要覆盖 Provider。
