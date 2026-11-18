# @lyx-pj/primflow-canvas

[English](README.md) | 简体中文

在网页里编辑和展示工作流：节点、连线、菜单、面板、运行状态和历史回溯。内置 UI 支持英文和中文。

## 挂载画布

```ts
import { NodeRegistry } from '@lyx-pj/primflow-model'
import { Graph } from '@lyx-pj/primflow-canvas'

const registry = new NodeRegistry()
const graph = new Graph(registry, { background: '#000', gridSize: 10 })

const dispose = graph.mount(document.getElementById('app')!, {
  'selection:changed': (selection) => console.log(selection),
})

// 需要时手动打开
graph.openPalette()
graph.closeMenus()

// 卸载
dispose()
```

`mount` 返回清理函数，组件卸载或页面销毁时调用它。

## 界面语言

上层应用通过 `GraphOptions.language` 指定语言：`'en'` 为英文，`'zh'` 为中文，默认英文。不读取浏览器语言，也不提供画布内的语言切换入口。

```ts
const graph = new Graph(registry, { language: 'zh' })
graph.setOptions({ language: 'en' })
```

每个画布实例独立配置。更新语言会刷新已打开的内置菜单、面板、状态标签和无障碍文案。应用提供的节点标题、端口标签、自定义工具栏按钮和日志内容保持原样。语言属于视图配置，不写入图 JSON。

## 画布功能清单

| 功能 | 说明 |
| --- | --- |
| 添加节点 | 双击空白处打开节点面板，点击或拖入节点。 |
| 节点菜单 | 右键节点可以复制、删除、粘贴、添加节点和设置断点。 |
| 工具栏 | 内置撤销 / 恢复按钮，也可以由应用配置动作按钮。 |
| 编辑 | 移动节点、连接端口、修改端口值。 |
| 缩放和平移 | 滚轮平移；空格 + 左键或右键拖动；捏合或 `Ctrl/⌘ + 滚轮` 缩放，范围 20%–500%。 |
| 缩放控件 | 位于底部中央，点击百分比恢复 100%，保留当前平移位置。 |
| 小地图 | 位于右上角，按全部节点范围绘制；点击只平移画布，保持当前缩放。 |
| 开始节点 | 主图和普通子图至少保留一个 Start；循环体使用循环入口和返回节点，规则见 [子图与导航](docs/subgraphs.zh-CN.md)。 |
| 断点 | 右键设置，随图保存和加载；应用以 `process({ debug: true })` 启动引擎后才会暂停。 |
| Switch 分支 | 用 `addSwitchCase` / `removeSwitchCase` 增删 case 端口。 |

Switch 节点的 `case_*` 端口由画布管理：

```ts
graph.addSwitchCase(node)                     // 追加 case_N_value / case_N
graph.removeSwitchCase(node, 'case_2_value')  // 删除端口并清理连线；最后一个 case 返回 false
```

新增序号取已有最大序号加一，删除中间的 case 后不会出现重名端口。

## 配置界面

```ts
const graph = new Graph(registry, {
  palette: {
    // 双击空白处打开；传 false 关闭自动触发
    trigger: true,
    // 可添加的节点，默认是注册表里的全部节点
    items: (graph) => graph.nodeRegistry.getNodeClasses(),
    // 分类、说明、图标和搜索关键词由应用提供
    describe: (nodeClass) => ({
      category: '文本处理',
      description: '将两段文本拼接起来',
      iconClass: 'ri-link',
      keywords: ['text', nodeClass.type],
    }),
    // 业务默认值放在应用层
    defaults: (nodeClass) => (nodeClass.type === 'Concat' ? { values: { string1: '你好' } } : undefined),
    // 在 items 之外追加条目，例如每个子图文件一条
    entries: (graph) => files.map((file) => ({
      nodeClass: graph.nodeRegistry.getNodeClass('subgraph'),
      title: file.name,
      category: '子图',
      defaults: { subgraphId: file.id, title: file.name },
    })),
  },
  contextMenu: {
    icons: { copy: 'ri-file-copy-line', delete: 'ri-delete-bin-line' },
    // 返回自定义菜单项；不传则使用内置的复制 / 删除 / 粘贴 / 添加节点
    items: (ctx) => [{ id: 'rename', label: '重命名', iconClass: 'ri-edit-line', run: () => {} }],
  },
  nodePanel: {
    width: 320,
    // 应用自己的设置区，只在切换节点时求值
    extra: (node) => (node.nodeType === 'custom' ? createCustomSettings(node) : null),
  },
  toolbar: {
    position: 'top-center',
    actions: [
      { id: 'run', label: '执行', iconClass: 'ri-play-line' },
      { id: 'debug', label: '调试', iconClass: 'ri-bug-line' },
    ],
  },
})

// 没有 run 的动作会触发事件，由应用处理
graph.on('toolbar:action', (id) => {
  if (id === 'run') engine.process()
})
```

`palette`、`contextMenu`、`nodePanel`、`debugPanel` 和 `toolbar` 都可以设为 `false` 关闭。

样式通过 `--bpgraph-menu-*` CSS 变量或覆盖 `.bpgraph-menu*` class 定制，不需要额外引入 CSS。

添加面板支持分类筛选和搜索。`entries` 不会按节点类去重，适合把子图文件这类外部资源展开成多条；条目自带的 `defaults` 优先于全局 `defaults`。

`palette.describe` 返回的 `description` 也会显示在节点面板底部；Start 不展示 Inputs / Outputs。未配置图标的节点使用内置 SVG 占位图标，配置 `iconClass` 时由应用加载对应字体图标。

## 显示执行状态

应用订阅引擎事件，把状态交给画布：

```ts
engine.on('node:status:changed', (nodeId, status) => {
  graph.setNodeExecutionStatus(nodeId, status, engine.getNodeExecutionData(nodeId))
})

engine.on('status:changed', (status) => {
  graph.setExecutionStatus(
    status === 'running' || status === 'paused' ? status : 'idle',
    engine.pausedNode?.nodeId,
  )
})
```

- 待执行节点保持普通外观；命中断点的节点显示黄色光晕；运行中的节点显示呼吸光晕；已完成的节点半透明并显示绿色光晕。
- 悬停已完成节点会显示该次执行的 Inputs / Outputs；断点节点只显示已经准备好的输入，并标注「断点暂停」。
- `setNodeExecutionStatus` 的第三个参数是 `{ inputs, outputs }`，只传状态时会显示「暂无执行数据」。
- `graph.resetNodeExecutionStatuses()` 清除所有标记。
- 这些状态只保存在临时视图里，不写入图 JSON，也不进入撤销记录。

## 调试面板和历史回溯

配置 `debugPanel` 后，工具栏会出现一个侧栏按钮，用来打开右侧调试面板。面板数据完全由应用提供，画布不采集日志，也不保存任务历史：

```ts
graph.setOptions({
  debugPanel: {
    width: 340,
    // 每次打开或 refreshDebugPanel() 时求值，也可以直接传数据快照
    data: () => ({
      records: engine.getTasks().map((task) => ({
        id: task.id,
        title: task.trigger.type === 'start' ? '执行主流程' : task.trigger.eventName ?? '事件',
        status: task.status,
        startedAt: task.startedAt,
        endedAt: task.endedAt,
      })),
      chain: getTaskChain(selectedTaskId),
      logs: getTaskLogs(selectedTaskId),
    }),
    activeRecordId: selectedTaskId,
    onRecordSelect: (record) => {
      if (!record) {
        selectedTaskId = null
        graph.exitReplay()
        graph.refreshDebugPanel()
        return
      }
      selectedTaskId = record.id
      graph.enterReplay(engine.getTaskGraph(record.id)!, {
        label: record.title,
        nodeStatuses: Object.fromEntries(engine.getNodeStatuses(record.id)),
        nodeData: collectNodeData(engine, record.id),
      })
      graph.setOptions({ debugPanel: { activeRecordId: record.id } })
    },
  },
})

graph.refreshDebugPanel()
```

点击已结束的执行记录会进入回溯：画布用那一次的图替换当前编辑图，左下角显示「回溯模式」，禁用拖拽、连线、端口编辑、调色板、右键菜单和工具栏按钮（只保留调试面板开关），但保留缩放、平移和节点悬停。再次点击当前记录、点提示条上的退出按钮或按 Esc 会恢复进入前的编辑图、视口和运行状态。

- `graph.enterReplay(json, { label, nodeStatuses, nodeData })` / `exitReplay()` / `isReplayMode()` / `replayLabel` 是底层接口。
- 进入和退出都会触发 `replay:changed`；应用应在进入时暂停自动保存，退出后恢复。
- 进入回溯会清空编辑撤销记录；需要保留的编辑内容要提前保存。
- 只有已结束的记录（`completed` / `failed` / `cancelled`）可以点击回溯。
- 记录按传入顺序展示，状态支持 `waiting`、`running`、`paused`、`completed`、`failed`、`cancelled`；执行链按数组顺序渲染，`label` 不传时使用当前图的节点标题。
- 日志级别支持 `debug`、`info`、`success`、`warn`、`error`。
- 面板也可以用 `openDebugPanel()` / `closeDebugPanel()` / `toggleDebugPanel()` / `isDebugPanelOpen()` 控制；`debugPanel: false` 或移除配置会收起面板并移除工具栏按钮。

## 子图和返回导航

应用可以通过 `navigation` 接入外部视图的返回路径：

```ts
graph.setOptions({
  navigation: {
    canGoBack: () => sourceViews.length > 0,
    goBack: () => openSourceView(),
  },
})
```

`graph.canGoBack()` 和 `graph.goBack()` 会先退出当前文件内的子图，再交给应用的 `goBack`。空白处右键双击、工具栏返回按钮、右键菜单和 Esc 共用这套导航。返回顺序、保存失败和异步切换的处理见 [子图与导航](docs/subgraphs.zh-CN.md)。

## 循环体

添加 `loop` 节点时，画布会自动创建循环体、循环入口和循环返回，并连好入口到返回的初始连线。循环体的创建、编辑、保存和删除见 [循环体的编辑](docs/loops.zh-CN.md)。

## 开发与测试

从仓库根运行：

```sh
pnpm --filter @lyx-pj/primflow-canvas test
pnpm --filter @lyx-pj/primflow-canvas typecheck
pnpm --filter @lyx-pj/primflow-canvas lint
```

| 测试 | 覆盖的行为 |
| --- | --- |
| [ui.test.ts](tests/ui.test.ts) | 菜单、调色板、面板、工具栏与交互清理 |
| [startNodes.test.ts](tests/startNodes.test.ts)、[switchCases.test.ts](tests/switchCases.test.ts) | 图内容约束、循环创建、动态端口与序列化 |
| [portEditors.test.ts](tests/portEditors.test.ts) | 端口编辑和值回显 |
| [replay.test.ts](tests/replay.test.ts) | 历史视图、只读交互与退出恢复 |
| [executionPreviewState.test.ts](tests/executionPreviewState.test.ts) | 执行状态、断点与节点数据 |
| [viewport.test.ts](tests/viewport.test.ts)、[minimap.test.ts](tests/minimap.test.ts) | 平移、缩放、小地图与导航 |
| [boundaries.test.ts](tests/boundaries.test.ts) | 共享节点类与包依赖 |

单文件测试使用 `pnpm --filter @lyx-pj/primflow-canvas exec vitest run tests/replay.test.ts`。测试使用 jsdom 和 SVG shim，视觉效果仍需运行示例在浏览器中检查。挂载接口变化时核对 [React 接入](../primflow-react/docs/adapter-contract.zh-CN.md)。
