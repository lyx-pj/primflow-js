# Prim flow

[English](README.md) | 简体中文

基于节点与连线的可视化工作流工具库，用同一份图定义连接可视化编辑、执行与调试。

在线体验：[React 示例](https://lyx-pj.github.io/primflow-js/)

## 模块与文档

| 模块 | 职责 | 文档 |
| --- | --- | --- |
| `@lyx-pj/primflow-model` | 定义节点、端口、数据类型与图结构 | [README](packages/primflow-model/README.zh-CN.md) |
| `@lyx-pj/primflow-engine` | 工作流执行引擎 | [README](packages/primflow-engine/README.zh-CN.md) |
| `@lyx-pj/primflow-canvas` | Web 可视化编辑器与调试画布 | [README](packages/primflow-canvas/README.zh-CN.md) |
| `@lyx-pj/primflow-react` | React 18/19 接入组件 | [README](packages/primflow-react/README.zh-CN.md) |

## 快速开始

在 React 项目中安装：

```bash
npm install @lyx-pj/primflow-react @lyx-pj/primflow-canvas @lyx-pj/primflow-engine
```

挂载最小编辑器：

```tsx
import { NodeRegistry } from '@lyx-pj/primflow-canvas'
import { createGraphContext, GraphView } from '@lyx-pj/primflow-react'

const { GraphProvider, useGraph } = createGraphContext(new NodeRegistry())

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

## 运行仓库示例

```bash
pnpm install
pnpm dev
```

## 常用命令

| 命令 | 作用 |
| --- | --- |
| `pnpm dev` | 启动示例应用 |
| `pnpm build` | 构建所有库包 |
| `pnpm typecheck` | TypeScript 类型检查 |
| `pnpm lint` | 代码检查 |
| `pnpm test` | 运行测试 |

## 许可

MIT
