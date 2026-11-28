# @lyx-pj/primflow-canvas

[English](README.md) | 简体中文

用于编辑和展示工作流的 Web 画布，内置 UI 支持英文和中文。

## 挂载画布

```ts
import { NodeRegistry } from '@lyx-pj/primflow-model'
import { Graph } from '@lyx-pj/primflow-canvas'

const registry = new NodeRegistry()
const graph = new Graph(registry, { background: '#000', gridSize: 10 })

const dispose = graph.mount(document.getElementById('app')!, {
  'selection:changed': (selection) => console.log(selection),
})

graph.openPalette() // 手动打开节点面板
graph.closeMenus()  // 关闭所有已打开的菜单和面板

// 组件卸载或页面销毁时清理
dispose()
```

常用图操作：`graph.toJSON()` / `graph.fromJSON(json)` 导出与加载图，`graph.zoom(scale)` 缩放，`graph.select(node)` / `graph.clearSelection()` 管理选中状态。

## 界面语言

通过 `GraphOptions.language` 指定界面语言（`'en'` 或 `'zh'`，默认 `'en'`），需要切换时调用 `setOptions`：

```ts
const graph = new Graph(registry, { language: 'zh' }) // 初始化为中文
graph.setOptions({ language: 'en' })                  // 动态切换为英文
```

## 动态端口与约束

Switch 节点的 `case_*` 端口由画布管理：

```ts
graph.addSwitchCase(node)                     // 追加 case_N_value / case_N
graph.removeSwitchCase(node, 'case_2_value')  // 删除端口并清理连线；最后一个 case 返回 false
```

## 配置界面

可通过 `GraphOptions`（或 `graph.setOptions()`）配置界面模块（传 `false` 可关闭对应模块）：

- `palette`：配置节点面板的触发方式、可用节点条目、分类与默认输入值。
- `contextMenu`：配置右键菜单项与默认操作。
- `nodePanel`：配置面板宽度、展示区块（`sections`）或自定义 `render` 函数。
- `debugPanel`：配置调试面板开关、传入执行记录（`runs`）与日志（`logs`）。
- `toolbar`：配置工具栏自定义动作按钮。

```ts
const graph = new Graph(registry, {
  palette: {
    trigger: true,       // 双击空白处打开；传 false 关闭
    connectOnDrop: true, // 连线拖到空白处时打开兼容节点面板
    items: (graph) => graph.nodeRegistry.getNodeClasses(),
  },
  nodePanel: {
    width: 320,
    sections: ['header', 'meta', 'inputs', 'outputs', 'execution', 'progress'],
  },
  debugPanel: {
    open: false,
    runs: [],
    logs: [],
  },
  toolbar: {
    actions: [
      { id: 'run', label: '运行', onClick: () => {} },
    ],
  },
})
```

## 自定义编辑器

通过 `graph.editors.register(dataTypeId, ...)` 为特定数据类型注册 `port`（节点卡片内）和 `panel`（节点面板内）编辑器：

```ts
import { html } from '@lyx-pj/primflow-canvas'

graph.editors.register('media.image@1', {
  port: {
    width: 140,
    render: (ctx) => html`<button @click=${() => ctx.setValue({ assetId: 'img-1' })}>选择图片</button>`,
  },
  panel: {
    render: (ctx) => html`<img class="preview" src=${ctx.value?.url} />`,
  },
})
```

- `port` 和 `panel` 渲染函数接收当前 `value` 与 `setValue` 回调；`port` 渲染函数还接收 `overlay` 宿主用于打开浮层。
- 再次注册同一类型会合并作用域；可通过端口的 `editorWidth` 或注册时的 `width` 指定控件宽度。

## 自定义节点渲染

通过 `graph.renderers.register(definitionId, ...)` 接管特定节点的卡片内容渲染：

```ts
import { html } from '@lyx-pj/primflow-canvas'

graph.renderers.register('example.preview', {
  layout: 'custom', // 'body'（保留默认标题栏与端口）或 'custom'（接管整个主体，需指定 size）
  size: { width: 220, height: 120 },
  render: (ctx) => html`<div class="card">${ctx.node.title}</div>`,
})
```

## 执行状态、调试与回溯

画布不直接调用引擎，由上层应用将引擎状态同步给画布：

- `graph.setNodeState(nodeId, state)` / `graph.clearNodeStates()`：更新节点运行状态（如运行中、完成、失败、跳过、业务中断）。
- `graph.setNodeProgress(nodeId, text)`：更新节点面板的实时进度文本。
- `graph.enterReplay(json, options)` / `graph.exitReplay()`：进入或退出只读的历史回溯视图。

## 子图与循环

- 内嵌子图与循环体通过 `graph.enterSubgraph(node)` / `graph.exitSubgraph()` 进入与返回；外部独立子图通过 `navigation` 回调处理返回。
- `subgraph` 和 `loop` 调用节点默认渲染为可折叠预览卡片（状态保存在 `JsonNode.collapsed`），注册自定义渲染器可覆盖默认卡片。
- 详细配置与预览缓存规则见 [子图与导航](docs/subgraphs.zh-CN.md) 与 [循环体的编辑](docs/loops.zh-CN.md)。
