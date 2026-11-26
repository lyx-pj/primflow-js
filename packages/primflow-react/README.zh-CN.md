# @lyx-pj/primflow-react

[English](README.md) | 简体中文

在 React 应用里使用画布和引擎。它提供 `GraphProvider`、`EngineProvider` 和 `GraphView`，负责组件的挂载与卸载；菜单、节点面板和调试面板仍由 [canvas](../primflow-canvas/README.zh-CN.md) 提供，文件保存和运行控制由应用自己处理。

## 挂载画布

```tsx
import { NodeRegistry } from '@lyx-pj/primflow-canvas'
import { createGraphContext, GraphView } from '@lyx-pj/primflow-react'

const registry = new NodeRegistry()
const { GraphProvider, useGraph } = createGraphContext(registry, {
  background: '#18181b',
  gridSize: 10,
})

function Editor() {
  const graph = useGraph()
  return <GraphView graph={graph} height={480} />
}

export default function App() {
  return (
    <GraphProvider>
      <Editor />
    </GraphProvider>
  )
}
```

- `createGraphContext` 接收节点注册表和画布配置，返回 `GraphProvider` 和 `useGraph`。
- `GraphView` 必须显式传入 `graph`，不会去读你自己创建的 Context。
- 容器要有明确高度。`GraphView` 默认 `height="100%"`，这时父元素必须有可计算的高度。

上面的例子只挂载编辑器，不连接执行。需要运行工作流时，再接入引擎。

要注册应用编辑器，改用对象形式传入配置。编辑器会在首个节点渲染前完成注册，因此画布构建端口控件时它已经就位。

```ts
const { GraphProvider, useGraph } = createGraphContext(registry, {
  canvas: { background: '#18181b' },
  editors: (editors) => {
    editors.register('media.image@1', {
      port: {
        render: (ctx) => html`
          <button
            @click=${(evt) => ctx.overlay.open({
              anchor: evt.currentTarget,
              render: () => html`<input type="file" />`,
            })}
          >选择图片</button>
        `,
      },
    })
  },
})
```

编辑器 API 见 [画布自定义编辑器](../primflow-canvas/README.zh-CN.md#自定义编辑器)。

同一个对象形式还接受 `nodeRenderers`，用于替换某个节点定义内置的内容。两者常一起注册：编辑器决定端口值怎么编辑，渲染器决定节点长什么样。

```ts
const { GraphProvider, useGraph } = createGraphContext(registry, {
  canvas: { background: '#18181b' },
  nodeRenderers: (renderers) => {
    renderers.register('ImageFile', {
      size: { width: 196, height: 104 },
      render: ({ node }) => html`<div class="image-card">${node?.title}</div>`,
    })
  },
})
```

渲染器 API 见 [画布自定义节点渲染](../primflow-canvas/README.zh-CN.md#自定义节点渲染)。

## 接入引擎

```ts
import { Engine, NodeRegistry } from '@lyx-pj/primflow-engine'
import { createEngineContext } from '@lyx-pj/primflow-react'

const registry = new NodeRegistry()
export const { EngineProvider, useEngine } = createEngineContext(() => new Engine(registry))
```

把 `EngineProvider` 放在需要运行的组件树外层，子组件用 `useEngine()` 拿到同一个引擎实例。画布和引擎要注册相同的自定义节点类型。

画布和引擎之间的连接由应用完成：读取 `graph.toJSON()`，组装独立子图，调用 `engine.loadGraph()` 和 `engine.start({ debug })`；再把引擎事件转换成画布要显示的状态。完整例子见 [示例的 events.ts](../../examples/primflow-react/packages/workflow/events.ts)。

`EngineProvider` 不会自动运行流程，也不会自动把执行状态画到画布上。

## API 和生命周期

| 接口 | 作用 |
| --- | --- |
| `createGraphContext(registry, options?)` | 创建 `GraphProvider` 和 `useGraph`；`options` 可传画布配置，也可用 `{ canvas, editors, nodeRenderers }` 同时注册应用编辑器和节点渲染器 |
| `createEngineContext(createEngine)` | 创建 `EngineProvider` 和 `useEngine` |
| `GraphView` | 挂载画布；接收 `graph`、尺寸、className、事件回调和视图选项 |

- Provider 实例在多次渲染之间保持不变；不要在组件 render 里反复调用 `createGraphContext` / `createEngineContext`。
- `useGraph()` / `useEngine()` 必须放在对应的 Provider 里，否则会抛错。
- `EngineProvider` 卸载时会调用 `engine.stop()`；需要等待异步资源释放时用 `engine.whenStopped()`。
- `GraphView` 在事件触发时读取最新回调，不会捕获旧的 props。
- 工厂函数为 Provider 创建和配置引擎。挂载后由应用启动引擎，画布选项通过 `graph.setOptions()` 更新。
- `GraphView` 的视图选项交给挂载流程，不保证修改 prop 就自动重建实例。

`GraphView` 支持 `onNodeClick`、`onNodeDoubleClick`、`onNodeSelection`、`onBlankClick` 等回调，完整属性见 [GraphViewProps](src/components/graph-view/graph-view.tsx)。端口和画布交互通过 Graph 的 API 使用，不需要直接操作 JointJS。

## 构建

canvas、engine 和 React 由使用方安装。这个包构建时不会把它们打包进来，避免出现两份节点类。

运行 `pnpm build` 会检查包之间的依赖是否符合要求，规则见 [React 接入](docs/adapter-contract.zh-CN.md)，检查脚本见 [verify-boundaries.mjs](../../scripts/verify-boundaries.mjs)。

## 开发与测试

从仓库根运行：

```sh
pnpm --filter @lyx-pj/primflow-react test
pnpm --filter @lyx-pj/primflow-react typecheck
pnpm --filter @lyx-pj/primflow-react lint
```

现有 [index.test.ts](tests/index.test.ts) 覆盖严格模式下的实例稳定性和卸载后的引擎清理；新增交互需要补充对应测试。打包或公开导出变化时运行根 `pnpm build`。

## 许可

MIT
