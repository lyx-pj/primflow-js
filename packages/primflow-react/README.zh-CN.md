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

## 接入引擎

```ts
import { NodeRegistry, Runtime } from '@lyx-pj/primflow-engine'
import { createEngineContext } from '@lyx-pj/primflow-react'

const runtime = new Runtime(new NodeRegistry())
export const { EngineProvider, useEngine } = createEngineContext(runtime)
```

把 `EngineProvider` 放在需要运行的组件树外层，子组件用 `useEngine()` 拿到同一个引擎实例。画布和引擎要注册相同的自定义节点类型。

画布和引擎之间的连接由应用完成：读取 `graph.toJSON()`，组装独立子图，调用 `engine.fromJSON()` 和 `engine.process({ debug })`；再把引擎事件转换成画布要显示的状态。完整例子见 [示例的 events.ts](../../examples/primflow-react/packages/workflow/events.ts)。

`EngineProvider` 不会自动运行流程，也不会自动把执行状态画到画布上。

## API 和生命周期

| 接口 | 作用 |
| --- | --- |
| `createGraphContext(registry, options?)` | 创建 `GraphProvider` 和 `useGraph`，画布配置在创建时指定 |
| `createEngineContext(runtime, options?)` | 创建 `EngineProvider` 和 `useEngine` |
| `GraphView` | 挂载画布；接收 `graph`、尺寸、className、事件回调和视图选项 |

- Provider 实例在多次渲染之间保持不变；不要在组件 render 里反复调用 `createGraphContext` / `createEngineContext`。
- `useGraph()` / `useEngine()` 必须放在对应的 Provider 里，否则会抛错。
- `EngineProvider` 卸载时会调用 `engine.stop()`；需要等待异步资源释放时用 `engine.whenStopped()`。
- `GraphView` 在事件触发时读取最新回调，不会捕获旧的 props。
- 工厂的 options 只在创建实例时使用，之后改配置请调用 `graph.setOptions()`。
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
