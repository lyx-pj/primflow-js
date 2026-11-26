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
| 添加并连接 | 把新连线或已选连线的端点拖到空白处，会打开只包含兼容节点的面板；节点与连线作为一次可撤销编辑一起创建或替换。 |
| 节点菜单 | 右键节点可以复制、删除，也可以为可执行节点设置断点。 |
| 工具栏 | 内置撤销 / 恢复按钮，也可以由应用配置动作按钮。工具栏在已打开面板左侧的画布区域内居中，放不下的动作收进「更多」菜单。 |
| 编辑 | 移动节点、连接端口、修改端口值。一个数据输入可以保留多条连线，运行时按[引擎选源规则](../primflow-engine/README.zh-CN.md#同一个输入的多个数据源)取值。 |
| 框选 | 从画布空白处按住并拖动，选中框内的节点和连线。画布嵌在侧栏旁或顶栏下方时，选框也会跟随光标。 |
| 缩放和平移 | 滚轮平移；空格 + 左键或右键拖动；捏合或 `Ctrl/⌘ + 滚轮` 缩放，范围 20%–500%。 |
| 缩放控件 | 位于底部中央，点击百分比恢复 100%，保留当前平移位置。 |
| 小地图 | 位于左下角，按全部节点范围绘制；点击只平移画布，保持当前缩放。回溯模式下会停在回溯横幅上方；紧凑布局下隐藏。 |
| 开始节点 | 主图和普通子图至少保留一个 Start；循环体使用循环入口和返回节点，规则见 [子图与导航](docs/subgraphs.zh-CN.md)。 |
| 断点 | 右键设置，随图保存和加载；应用以 `start({ debug: true })` 启动引擎后才会暂停。 |
| Switch 分支 | 用 `addSwitchCase` / `removeSwitchCase` 增删 case 端口。 |

Switch 节点的 `case_*` 端口由画布管理：

```ts
graph.addSwitchCase(node)                     // 追加 case_N_value / case_N
graph.removeSwitchCase(node, 'case_2_value')  // 删除端口并清理连线；最后一个 case 返回 false
```

新增序号取已有最大序号加一，删除中间的 case 后不会出现重名端口。

为画布使用的 `NodeRegistry` 注册自定义类型，端口连线会应用注册的类型规则。用 `graph.getTypeDiagnostics()` 检查当前图，或传入一个 `JsonGraph` 检查文件。宿主可以调用 `graph.setNodeProgress(nodeId, text)` 更新节点面板的实时预览。

## 配置界面

```ts
const graph = new Graph(registry, {
  palette: {
    // 双击空白处打开；传 false 关闭自动触发
    trigger: true,
    // 连线拖到端口外时，打开过滤后的“添加并连接”面板
    connectOnDrop: true,
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
    defaults: (nodeClass) => (nodeClass.definitionId === 'Concat' ? { inputValues: { string1: '你好' } } : undefined),
    // 在 items 之外追加条目，例如每个子图文件一条
    entries: (graph) => files.map((file) => ({
      nodeClass: graph.nodeRegistry.getNodeClass('subgraph'),
      title: file.name,
      category: '子图',
      defaults: { targetGraphId: file.id, title: file.name },
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
    extra: (node) => (node.definitionId === 'custom' ? createCustomSettings(node) : null),
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
  if (id === 'run') engine.start()
})
```

`palette`、`contextMenu`、`nodePanel`、`debugPanel` 和 `toolbar` 都可以设为 `false` 关闭。

`toolbar.position` 支持 `top-left`、`top-center` 和 `top-right`。居中与靠右两种位置会保持在已打开面板左侧的画布区域内；放不下时尾部动作收进「更多」菜单，工具栏始终保持单行。

样式通过 `--bpgraph-menu-*` CSS 变量或覆盖 `.bpgraph-menu*` class 定制，不需要额外引入 CSS。

### 端口外观

端口的轮廓始终使用数据类型对应的颜色，未连接时降低透明度；连上连线后用同一种颜色填满，透明度恢复为不透明。连线的颜色取自它所连接的端口，因此同一类型在端口和连线上是同一种颜色；连到具体类型时取具体类型那一侧的颜色，两端都是 `any` 时使用通用数据色。内置数据类型自带默认的颜色和形状，可以通过 `ports.colors` 和 `ports.shapes` 按类型覆盖；可选形状为 `circle`、`square`、`diamond`、`triangle`、`hexagon`、`bars` 和 `arrow`。执行端口默认是 `arrow`，具体数据类型默认是 `circle`，`any` 默认是中性青灰色 `hexagon`。

`ports.input.port.r` 和 `ports.output.port.r` 分别设置两个方向的端口半径，执行端口的箭头会随之缩放。

```ts
const registry = new NodeRegistry({
  ports: {
    shapes: { 'media.image@1': 'square' },
    colors: { 'media.image@1': '#D55E00' },
    input: { port: { r: 4 } },
  },
})
```

每个端口主体都带 `data-port-kind="data"` 或 `data-port-kind="exec"`，样式和测试都可以据此定位端口类型，不必关心某种形状恰好使用了哪个 SVG 元素。

悬停端口片刻后，画布会显示包含端口名称和数据类型的 tooltip；端口没有 `label` 时回退到 `name`。短暂延迟可避免快速划过时闪烁出现。端口主体和端口标签还带有 `data-port-name`、`data-port-label`、`data-port-type` 与 `data-port-direction`（`in` 或 `out`），便于样式和测试定位。

连线的透明命中区在端口边缘结束，因此已连接的端口仍能响应悬停和拖拽：tooltip 继续显示，从端口按下也可以拉出新连线。点击端口之外的可见连线仍可选中连线。

## 自定义编辑器

注册编辑器即可接管某个端口值的编辑方式。编辑器按端口数据类型索引，使用自定义类型的节点会自动获得自己的控件，画布本身不需要了解任何业务概念。

```ts
import { html } from '@lyx-pj/primflow-canvas'

graph.editors.register('media.image@1', {
  // 画布端口旁的紧凑控件
  port: {
    render: (ctx) => html`
      <button
        class="pick-image"
        @click=${(evt) => ctx.overlay.open({
          anchor: evt.currentTarget,
          placement: 'above',
          render: () => html`<img src=${ctx.value?.url} />`,
        })}
      >选择图片</button>
    `,
    width: 32,
  },
  // 节点面板中的完整控件
  panel: {
    render: (ctx) => html`<img class="preview" src=${ctx.value?.url} />`,
  },
})
```

注册的编辑器会替换该类型在对应作用域下的内置控件。两个作用域相互独立：画布端口空间有限，通常需要与节点面板不同的交互方式。再次注册同一类型时会合并作用域，而不是整体替换。

`port` 和 `panel` 渲染函数都会收到当前值和写回节点的 `setValue` 回调。端口渲染函数还会收到 `overlay` 宿主。端口控件渲染在 SVG `foreignObject` 内，超出其范围的内容会被裁剪，因此浮层改为渲染在挂到 paper 元素上的容器中。浮层显示什么、打开到什么位置，都由应用决定。

可以同时打开多个浮层，例如每个端口一个。每个浮层各自对着自己的锚点定位，首选方向放不下时自动翻到对侧，并始终被限制在 paper 范围内，不会越出边缘。`open` 返回的函数只关闭对应的那个浮层。

编辑器注册表与数据类型注册表相互独立。编辑器决定值怎么编辑，不决定端口能否与其它端口连线；连线规则仍由数据类型注册表负责。

端口可以通过 `editorWidth` 覆盖自身控件宽度，注册端口编辑器也可以用 `width` 统一指定该类型所有端口的宽度。

## 节点面板

右侧节点面板默认打开，由工具栏的节点面板按钮控制，选中节点不会自动弹出面板。面板顶部有「节点」和「全局设置」两个标签页：

- 「节点」显示当前单选节点的设置；没有选中节点或选中多个对象时显示视图总览，总览列出当前视图的所有节点，点击节点会将其居中并设为单选。
- 「全局设置」显示应用提供的内容；画布本身不定义全局设置。
- 调试面板和节点面板可以同时打开，节点面板会自动向左让位，工具栏在剩余画布区域内居中。画布宽度小于 768px 时改用紧凑布局：两个面板都变成工具栏下方的全宽面板，同一时间只保留一个，小地图隐藏。布局按面板实测宽度计算，面板关闭、配置宽度变化和调试面板偏移都会自动反映，不依赖额外断点。紧凑布局下画布容器带有 `data-bpgraph-compact="true"`，应用可以据此调整自己的界面。

```ts
const graph = new Graph(registry, {
  nodePanel: {
    // 首次挂载时是否打开；默认 true
    open: true,
    // 没有单选节点时的总览内容；不传则列出当前视图的节点
    overview: ({ graph, locateNode }) => html`${graph.getNodes().map((node) => html`<button @click=${() => locateNode(node)}>${node.title}</button>`)}`,
    // 「全局设置」标签页内容；不传时显示空状态
    globalSettings: ({ language }) => html`<p>${language}</p>`,
  },
  debugPanel: true,
  toolbar: { actions: [] },
})
```

`openNodePanel()` / `closeNodePanel()` / `toggleNodePanel()` / `isNodePanelOpen()` 控制面板可见性，`refreshNodePanel()` 重新求值应用内容。`overview` 的上下文包含 `graph`、`close`、`locateNode` 和 `language`；`locateNode` 会选中节点并在画布上居中。`globalSettings` 的上下文包含 `graph`、`close` 和 `language`。两个 `close` 都关闭面板但不改变选中项。

节点面板默认启用，因此工具栏默认会出现；需要完全隐藏工具栏时设置 `toolbar: false`，此时仍可通过上述 API 打开面板。`nodePanel: false` 会关闭面板并移除工具栏按钮。

## 节点面板区块

选中单个节点时，面板的「节点」标签页按顺序渲染一组区块。传 `sections` 可以调整顺序、隐藏不需要的区块，或插入自己的内容。

```ts
const graph = new Graph(registry, {
  nodePanel: {
    sections: (node) => [
      'meta',
      // 不写 'inputs' 就隐藏内置的输入控件
      'outputs',
      { id: 'audit', render: ({ graph, node }) => html`<p>节点 ${node.id}</p>` },
    ],
  },
})
```

内置区块 id 为 `meta`、`extra`、`loopLimits`、`inputs`、`outputs`、`retry`、`description`、`execution` 和 `progress`。不写某个 id 就隐藏对应区块，返回空数组则只保留面板外壳（标题栏和标签页）。对象形式的区块渲染时不加包裹层，标记结构完全由应用决定。

`execution` 和 `progress` 用于显示实时执行状态。隐藏它们不会让画布停止跟踪状态，只是不再在面板中展示。

### 替换整个内容区

传 `render` 即可接管「节点」标签页里的全部内容。

```ts
const graph = new Graph(registry, {
  nodePanel: {
    render: ({ node, close, language }) => html`
      <div class="my-panel">
        <h3>${node.title}</h3>
        <p>${language}</p>
        <button @click=${close}>关闭</button>
      </div>
    `,
  },
})
```

外壳仍由画布负责：宽度和位置、滚动容器、标题栏及其关闭按钮、标签页、调试面板展开时的偏移，以及当前语言。应用只负责内容。

`render` 的优先级高于 `sections`；提供 `render` 时不会再调用 `sections`。它的上下文包含 `graph`、`node`、`close` 和 `language`。

## 自定义节点渲染

节点渲染器可以替换某个节点定义内置的标题栏和主体。

```ts
graph.nodeRenderers.register('ImageFile', {
  size: { width: 196, height: 104 },
  render: ({ node }) => html`
    <div class="image-card">
      <span>${node?.title}</span>
      <img src=${previewOf(node?.inputValues?.asset)} />
    </div>
  `,
})
```

渲染器拥有节点内容。JointJS 元素及其端口保持不变，所以连线、选中、拖拽、断点和执行状态显示都不受影响。自定义布局必须声明 `size`，因为默认尺寸是按内置标题栏和端口行计算的。

注册渲染器后会移除内置的标题栏和主体。需要保留其中一个时，设置 `header: true` 或 `body: true`。渲染器会收到当前节点实例，因此可以直接绘制节点值；当节点的值、标题、输入或输出变化时会重新渲染。画布通过一个透明的选中形状保留节点选中轮廓，应用不需要自己绘制选中态。

渲染器只改变外观。节点行为、端口类型和连线规则仍由节点注册表和数据类型注册表负责。

### 端口定位

默认情况下端口沿用内置行布局，位置由标题栏高度和行间距决定。渲染器可以通过 `portPosition` 自己摆放端口：

```ts
graph.nodeRenderers.register('ImageFile', {
  size: { width: 196, height: 104 },
  // 输入贴在左边框，输出贴在右边框
  portPosition: ({ group, index, width }) => ({
    x: group === 'in' ? 0 : width,
    y: group === 'in' ? 34 + index * 40 : 52,
  }),
  render: ({ node }) => html`<div class="image-card">${node?.title}</div>`,
})
```

坐标相对节点自身。不返回 `x` 时保留该端口组的内置边缘偏移，适合只调整纵向位置；对某个端口返回 `undefined` 则保留它的行布局。

端口标签仍然跟随端口。如果自定义布局自己绘制标注，可以在端口定义上设置 `showLabel: false` 隐藏标签，或用 `labelPosition: { x, y }` 调整标签偏移。

渲染器还可以用 `portEditorPosition` 摆放数据端口的内置控件，它收到的上下文与 `portPosition` 相同：

```ts
graph.nodeRenderers.register('ImageFile', {
  size: { width: 196, height: 104 },
  portEditorPosition: ({ index }) => ({ x: 24, y: 30 + index * 28 }),
  render: () => html``,
})
```

如果节点声明的 `size` 装不下仍使用行布局的端口，会输出一次控制台警告并指出节点 id。通过 `portPosition` 摆放的端口不计入，因为那是渲染器自己的选择。

添加面板支持分类筛选和搜索。`entries` 不会按节点类去重，适合把子图文件这类外部资源展开成多条；条目自带的 `defaults` 优先于全局 `defaults`。

把新连线或已选连线的端点拖到端口外时，也会打开添加面板。面板只列出具有可见且能通过 `graph.validateConnection` 的端口的节点，选择后连接第一个兼容端口；新节点和连线记录为一次撤销。面板打开期间临时连线保持可见：取消时删除，选择节点时直接完成连接，不重新创建连线。重连已有连线时，原连线会在同一次撤销中被替换。`palette.connectOnDrop` 可以关闭该行为。连线面板是模态的：只有面板、Esc 或关闭按钮可以完成或取消这次编辑。

`palette.describe` 返回的 `description` 也会显示在节点面板底部；Start 不展示 Inputs / Outputs。未配置图标的节点使用内置 SVG 占位图标，配置 `iconClass` 时由应用加载对应字体图标。

节点面板将注册键显示为定义 ID，并将选中节点自身的 ID 显示为实例 ID。设置自定义标题后，如果它与定义名称不同，面板会在标题下方显示定义名称。循环和子图节点还会显示行为类别。

字符串输入可在定义中指定 `editor: 'select'` 或 `editor: 'textarea'`。连线始终以输出为起点、输入为终点，画布也支持从输入端开始拖拽。

代码编辑器通过 `--bpgraph-panel-*` 变量适配面板主题。编辑器内可用常规快捷键撤销和重做，`Ctrl`/`Cmd` + `F` 打开查找面板。

节点属性会显示节点类声明的重试策略，包括重跑许可、次数上限和降级出口。应用可将执行尝试放入调试面板的日志。

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
- 失败节点显示红色光晕，取消节点显示橙色，跳过节点显示灰蓝色，等待业务答复的节点显示紫色慢呼吸光晕。每种效果都带有无障碍状态标签。
- 在运行或回溯时悬停节点，卡片会用文字显示当前状态，包括尚未执行的节点。停止后仍保留的状态，例如已取消，也能悬停查看。
- 已完成的节点在悬浮卡和节点面板显示实际输入和输出，命中断点的节点显示已准备好的输入。Start 节点显示状态名称。
- 通过 `setNodeExecutionStatus` 的第三个参数 `{ inputs, outputs }` 提供端口数据。添加 `attempt` 后，悬浮卡和节点面板会显示已重试次数和原因，并在执行中提示剩余次数，在失败后提示次数已用完。
- `graph.resetNodeExecutionStatuses()` 清除所有标记。
- 这些状态只保存在临时视图里，不写入图 JSON，也不进入撤销记录。

## 调试面板和历史回溯

配置 `debugPanel` 后，工具栏会出现一个终端图标的调试面板按钮，用来打开右侧调试面板。面板数据完全由应用提供，画布不采集日志，也不保存任务历史：

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
      // 每条引擎执行日志事件对应一项
      logs: toLogEntries(engine.getTaskTrace(selectedTaskId)),
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

点击已结束的执行记录会进入回溯：画布用那一次的图替换当前编辑图，左下角显示「回溯模式」，禁用拖拽、连线、端口编辑、调色板、右键菜单和工具栏按钮（只保留调试面板开关）；节点面板会关闭，因为回溯数据只读；缩放、平移和节点悬停仍然可用。再次点击当前记录、点提示条上的退出按钮或按 Esc 会恢复进入前的编辑图、视口和运行状态。

- `graph.enterReplay(json, { label, nodeStatuses, nodeData })` / `exitReplay()` / `isReplayMode()` / `replayLabel` 是底层接口。
- 进入和退出都会触发 `replay:changed`；应用应在进入时暂停自动保存，退出后恢复。
- 进入回溯会清空编辑撤销记录；需要保留的编辑内容要提前保存。
- 只有已结束的记录（`completed` / `failed` / `cancelled`）可以点击回溯。
- 记录按传入顺序展示，状态支持 `waiting`、`running`、`paused`、`completed`、`failed`、`cancelled`。
- 日志是一条有序的流。每项包含 `time`、`message`，以及可选的 `level`（`debug`、`info`、`success`、`warn`、`error`）、`type`（引擎事件类型，如 `activation:status`）、`nodeId`、`scope` 和 `activationId`。面板把 `type` 显示为标签，节点标题显示在消息之前，子图条目按作用域层级缩进。没有 `type` 的条目回退显示级别名称。
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

添加 `loop` 节点时，画布会自动创建循环体、循环入口和循环返回，并连好入口到返回的初始连线。单击 Loop 节点可在节点面板设置次数上限和超时。初始输入和本轮迭代输入的连法见 [循环体的编辑](docs/loops.zh-CN.md)。

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
