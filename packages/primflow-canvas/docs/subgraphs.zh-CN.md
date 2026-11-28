# 子图与导航

[English](subgraphs.md) | 简体中文

画布区分内嵌子图和外部子图引用，负责进入、返回与显示。JSON 结构与 Start 端口规则见 [model 子图数据与端口](../../primflow-model/docs/subgraphs.zh-CN.md)，参数与执行规则见 [engine 子图参数](../../primflow-engine/docs/subgraphs.zh-CN.md)。

## 内嵌子图与外部引用

| 节点状态 | 画布行为 |
| --- | --- |
| `subgraph` 节点没有 `targetGraphId` | 生成 id 并创建内嵌子图区域 |
| 有 `targetGraphId`，当前图存在同名区域 | 内嵌子图，双击可进入编辑 |
| 有 `targetGraphId`，当前图没有同名区域 | 外部子图引用：不自动创建空区域，`enterSubgraph()` 不进入，应用负责打开、保存和执行时注入内容 |

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

## 容器卡片与预览（子图 / 循环）

子图和 `loop` 调用节点默认显示为可折叠的预览卡片，折叠状态保存在 `JsonNode.collapsed`（不进入撤销记录）。回溯期间折叠不可用，预览使用回溯 JSON。应用为 `loop` 或 `subgraph` 注册的自定义渲染器优先于内置卡片。

预览不会递归。预览里的子图调用和 Loop 调用都画成通用卡，保留标题、标记、端口和随折叠态变化的尺寸；Loop 通用卡带 `Loop` 徽标。

画布不读取存储。内嵌子图直接读当前图模型；外部引用需要应用推送 JSON：

```ts
graph.setSubgraphSources({ [fileId]: subgraphJson })
graph.updateSubgraphSource(fileId, nextSubgraphJson)
graph.updateSubgraphSource(fileId, null)
```

应用在保存子图文件后刷新对应 source，删除文件时移除。source 缺失时显示空预览。

渲染结果按目标和内容缓存在内存中。卡片会先挂载该目标上一张预览图，同时在后台重新渲染；只有输出发生变化时才替换。因此切换视图时首帧就能看到缩略图，而不是空状态。缓存版本不兼容、SVG 标记无效或目标已不存在的条目会被忽略。

内嵌区域（内嵌子图与循环体）在冷启动、没有内存缓存时，会先同步绘制结构示意图：按阅读顺序最多 80 个节点、160 条连线，节点用 header 色画成圆角块，不创建隐藏 paper，也不等待字体和图片。此时预览区为 `data-preview-state="schematic"`；高清预览生成后替换它，构建失败时保留示意图而不是空状态。外部子图 reference 仍使用持久化缓存或加载态。

持久化是可选的，由应用负责。画布不直接读取存储；应用设置适配器，并在恢复视图前预加载：

```ts
graph.setSubgraphPreviewCache({
  load: () => readPreviews(), // Record<targetId, CachedSubgraphPreview>
  save: (targetId, preview) => writePreview(targetId, preview),
  remove: (targetId) => deletePreview(targetId),
})
await graph.preloadSubgraphPreviews()
```

`load()` 可以是异步的：在启动阶段、第一张卡片渲染前 `await preloadSubgraphPreviews()`。只有外部子图 source 会持久化；内嵌子图和循环体属于当前视图，只进入内存缓存，不会调用应用的 `save` / `remove`。存储位置、保留策略和清理都由应用决定；source 被删除时画布会调用 `remove`。source 内容刷新后，上一张持久化预览会保留到下一次渲染替换它。

任意视图 JSON 都可以用 `graph.renderThumbnail(json, container, options)` 渲染，返回 `{ ready, dispose }`，不修改当前图。图 JSON 没有缩略图字段。

250ms 内加载完成的资源会进入预览，之后才完成的图片不会。

单个预览最多绘制 200 个节点、400 条连线，按阅读顺序截断；悬空连线丢弃，省略节点数显示为 `+N`。卡片进入视口才渲染，新预览构建期间继续显示上一张预览。

## 容器节点的面板

节点面板由工具栏按钮控制，默认打开；选中容器节点（内嵌子图与外部子图引用）不会自动弹出面板。面板已经打开时，选中容器节点会显示它的设置；双击进入子图或循环体后，面板保持打开并回到视图总览，直到在新视图中选中节点。外部子图异步切换失败时，面板不依赖加载结果，保持当前内容。
