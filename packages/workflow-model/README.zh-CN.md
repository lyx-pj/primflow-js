# @lyx-pj/workflow-model

[English](README.md) | 简体中文

工作流的数据定义。它描述节点、端口、连线、变量和整张图，让画布和引擎对同一份工作流有一致的理解。

## 定义节点

```ts
import { Node, NodeRegistry, type ExecutorFn } from '@lyx-pj/workflow-model'

class Echo extends Node {
  static definition = {
    title: '回显',
    inputs: [
      { name: 'exec', type: 'exec' },
      { name: 'text', type: 'string' },
    ] as const,
    outputs: [
      { name: 'exec', type: 'exec' },
      { name: 'text', type: 'string' },
    ] as const,
  }

  static executor: ExecutorFn = ({ getInput, setOutput, next }) => {
    setOutput('text', getInput<string>('text') ?? '')
    return next(['exec'])
  }
}

const registry = new NodeRegistry().register('Echo', Echo)
```

`definition` 描述节点长什么样：标题和输入、输出端口。`exec` 端口决定执行顺序，`string`、`number`、`any` 等数据端口传递值。

`executor` 描述节点做什么：`getInput` 读取输入，`setOutput` 写入输出，`next` 触发下游节点。注册名 `Echo` 要和图里的 `nodeType` 一致，否则引擎找不到节点。

一个节点类可以在图里使用多次，每次是一个 `NodeInstance`，有自己的 id、位置和值。

需要建立连接或监听事件时，节点还可以实现 `onActive` / `onDeactivate` / `onDestroy`，在启动和停止时初始化、清理资源，用法见 [engine README](../workflow-engine/README.zh-CN.md) 的「节点生命周期」。

## 工作流的数据

一张工作流可以保存为 JSON，交给画布显示或引擎执行：

| 字段 | 内容 |
| --- | --- |
| `nodes` | 节点列表，包含节点类型、位置、端口和值 |
| `links` | 连线，记录源端口和目标端口 |
| `variables` | 变量表 |
| `subgraphs` | 内嵌子图，按 id 保存 |
| `viewport` | 画布的位置和缩放 |

完整字段见 [types.ts](src/types.ts)。

内置节点包括开始 `Start`、结束 `End`、子图 `Subgraph`，以及循环用的 `Loop`、`LoopEntry`、`LoopReturn`。它们由 `NodeRegistry` 直接提供；自定义节点用 `register` 添加。

## 循环和子图

- 循环节点怎么配置、循环体怎么连：[循环节点](docs/loops.zh-CN.md)
- 子图的参数端口和保存结构：[子图数据与端口](docs/subgraphs.zh-CN.md)

## 和其他包一起用

`model` 只定义数据和节点，不执行也不渲染：

- [workflow-engine](../workflow-engine/README.zh-CN.md) 读取 `JsonGraph`，按连线执行节点。
- [workflow-canvas](../workflow-canvas/README.zh-CN.md) 读取和编辑 `JsonGraph`，显示节点与连线。
- React 应用用 [workflow-react](../workflow-react/README.zh-CN.md) 把画布和引擎挂到组件上。

画布和引擎共享 model 中的 `Node` 和 `NodeRegistry`，节点定义可在两者之间复用。

## 开发

从仓库根运行：

```sh
pnpm --filter @lyx-pj/workflow-model typecheck
pnpm --filter @lyx-pj/workflow-model lint
```

本包没有独立测试。修改节点、端口或 JSON 字段后，运行使用这些定义的消费者测试：

```sh
pnpm --filter @lyx-pj/workflow-engine exec vitest run tests/boundaries.test.ts
pnpm --filter @lyx-pj/workflow-canvas exec vitest run tests/startNodes.test.ts
```
