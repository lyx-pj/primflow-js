# 子图与导航

[English](subgraphs.md) | 简体中文

画布区分内嵌子图和外部子图引用，负责进入、返回与显示。JSON 结构与 Start 端口规则见 [model 子图数据与端口](../../primflow-model/docs/subgraphs.zh-CN.md)，参数与执行规则见 [engine 子图参数](../../primflow-engine/docs/subgraphs.zh-CN.md)。

## 内嵌子图与外部引用

| 节点状态 | 画布行为 |
| --- | --- |
| `subgraph` 节点没有 `subgraphId` | 生成 id 并创建内嵌子图区域 |
| 有 `subgraphId`，当前图存在同名区域 | 内嵌子图，双击可进入编辑 |
| 有 `subgraphId`，当前图没有同名区域 | 外部子图引用：不自动创建空区域，`enterSubgraph()` 不进入，应用负责打开、保存和执行时注入内容 |

画布创建内嵌子图时生成带参数端口的 `Start` 和带 `result` 数据端口的 `End`（id 分别为 `start-<subgraphId>`、`end-<subgraphId>`）。外部子图引用只保存 id，文件由应用管理。

## 开始节点规则

普通主图和普通子图至少保留一个 `Start`，作为执行入口。新建、清空画布以及加载缺少 Start 的普通区域时会自动补齐；循环体使用 `LoopEntry` / `LoopReturn`，不补普通 `Start`。

- 主图允许多个 Start；通过右键菜单、Delete / Backspace 或 `graph.removeNodes()` 删除时，最后一个 Start 会被保留。
- 批量删除所有 Start 时保留主图节点列表中的第一个，其余选中节点照常删除；子图已有的 Start / End 删除保护不变。
- `graph.clear()` 会回到主图、清除撤销记录并创建一个 Start；自动补齐的 Start 不进入撤销记录。
- 独立子图作为文件打开时，应用以 `graph.fromJSON(json, { keepStartPorts: true })` 保留参数端口；主图保持默认，只保留执行出口。

## 返回导航

应用通过 `navigation` 接入外部视图的返回路径：

```ts
graph.setOptions({
  navigation: {
    canGoBack: () => sourceViews.length > 0,
    goBack: () => openSourceView(),
  },
})
```

`graph.canGoBack()` 判断是否有可返回的内嵌上层或外部来源；`graph.goBack()` 优先退出内嵌子图，再调用应用的 `goBack`。空白处右键双击、返回菜单、工具栏返回按钮与 `Esc` 共用此导航；右键菜单延迟约 300ms 打开，以便识别第二次右键，返回后抑制迟到的菜单事件。回溯期间禁止导航，`Esc` 先退出回溯。

应用负责保存修改、处理异步切换失败并刷新导航选项；卸载时传入 `navigation: null` 解除回调。导航路径不写入图 JSON、文件存储或撤销栈。返回时先退出文件内的内嵌层级，到文件根层级再交给应用；应用在返回成功后消费一层来源路径，并恢复仍存在的来源内嵌区域；保存失败不切换、不消费路径，目标加载失败保留原存档并暂停自动保存。

## 容器节点的面板

容器节点（内嵌子图与外部子图引用）首次单击时，节点面板会在约 200ms 的短暂防闪窗口后展开：双击时立即取消待展开任务并收起已有面板，不依赖应用完成外部子图的异步加载，避免切换视图前面板先弹出。面板已经打开时改选其他节点（包括容器节点）会立即更新为新节点数据，不再等防闪窗口。

## 测试

- [startNodes.test.ts](../tests/startNodes.test.ts)：内嵌子图创建、Start 端口保留、保存加载。
- [viewport.test.ts](../tests/viewport.test.ts)、[ui.test.ts](../tests/ui.test.ts)：返回导航、菜单与面板交互。
- [replay.test.ts](../tests/replay.test.ts)：回溯期间禁止导航、退出后恢复编辑图。
