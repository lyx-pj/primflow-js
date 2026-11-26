# Prim flow

[English](README.md) | 简体中文

基于节点与连线的可视化编程工具库：用同一份图定义连接编辑、执行与调试，适合嵌入流程编辑器、数据处理工具和 AI 工作流应用。仓库包含 4 个库，并附带一个可运行的 React 示例。

体验 [React 在线示例](https://lyx-pj.github.io/primflow-js/)。

## 模块与能力

| 模块                      | 能做什么                       | 文档                                               |
| ------------------------- | ------------------------------ | -------------------------------------------------- |
| `@lyx-pj/primflow-model`  | 定义工作流的数据结构           | [README](packages/primflow-model/README.zh-CN.md)  |
| `@lyx-pj/primflow-engine` | 执行工作流                     | [README](packages/primflow-engine/README.zh-CN.md) |
| `@lyx-pj/primflow-canvas` | 可视化编辑工作流，支持英中界面 | [README](packages/primflow-canvas/README.zh-CN.md) |
| `@lyx-pj/primflow-react`  | 在 React 应用中使用工作流      | [README](packages/primflow-react/README.zh-CN.md)  |

节点可以订阅业务事件并申请执行自身。引擎支持可安全重跑节点的退避重试、失败降级，以及沿线性输入来源追溯重跑。读取任务状态时出现可重试错误，会应用下游节点的重试策略。见[引擎文档](packages/primflow-engine/README.zh-CN.md)。

节点通过注册时指定的稳定定义 ID 创建和恢复，定义名称用作实例的默认显示标题。图文件通过 `inputValues` 保存节点的配置输入，通过端口 ID 记录输出到输入的连线。见[节点模型](packages/primflow-model/README.zh-CN.md)。

用 `defineNode` 声明节点端口，用 `defineExecutor` 从节点推断执行上下文，用 `defineService` 定义引擎服务和依赖。见[引擎接入示例](packages/primflow-engine/README.zh-CN.md#定义执行器)。

应用可以注册结构类型和流端口。画布、图文件和执行器共用 model 的类型规则。React 示例提供本地图片、PDF 和文本流节点。见[类型定义](packages/primflow-model/README.zh-CN.md#注册数据类型)与[流式执行](packages/primflow-engine/README.zh-CN.md#实时进度与流端口)。

## 快速开始

在已有的 React 18 或 19 项目中安装：

```bash
npm install @lyx-pj/primflow-react @lyx-pj/primflow-canvas @lyx-pj/primflow-engine
```

将以下内容放入 `App.tsx`，即可挂载编辑器：

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

此示例用于挂载编辑器。注册自定义节点和接入工作流执行见 [React 接入文档](packages/primflow-react/README.zh-CN.md)；只需执行流程时，用 `NodeRegistry` 创建 `Engine`，依次调用 `engine.loadGraph(json)` 和 `engine.start()`。详见[引擎文档](packages/primflow-engine/README.zh-CN.md)。

## 运行仓库示例

克隆仓库后，先安装 Node.js 和 pnpm，再运行：

```bash
pnpm install
pnpm dev
```

启动后在浏览器打开终端显示的地址即可看到示例应用。
双击画布空白处，选择「基础输入」可添加只有数据端口的节点，包括 JSON 数组和对象。下游节点按需读取这些值。「变量」里的获取变量也按需读取当前任务状态。详见 [React 示例文档](examples/primflow-react/README.zh-CN.md)。

把新连线或已选连线的端点拖到画布空白处，会打开只包含兼容节点的面板；临时连线在选择节点或取消前保持可见，新增节点和连线是一次可撤销的编辑。

一个数据输入可以连接多个输出。引擎优先读取当前执行路径上的来源。详见[数据源选择](packages/primflow-engine/README.zh-CN.md#同一个输入的多个数据源)。

节点可以读写[任务业务状态](packages/primflow-engine/README.zh-CN.md#任务业务状态)。启动任务和每个事件任务各自持有独立状态。

单击 Loop 节点可设置次数上限和超时。循环体中的 Loop Entry 分别提供初始输入和本轮迭代输入。详见 [循环体的编辑](packages/primflow-canvas/docs/loops.zh-CN.md)。

## 架构

引擎保留[结构化执行日志](packages/primflow-engine/docs/execution-trace.zh-CN.md)，可按执行 ID 查节点结果，并定位等待中的上游输出。

执行中的节点可以[等待业务答复](packages/primflow-engine/README.zh-CN.md#业务中断)。画布通过[节点光晕](packages/primflow-canvas/README.zh-CN.md)区分失败、取消、跳过和业务中断。

模块分工、常用概念、数据归属和执行流程见 [架构说明](docs/architecture.zh-CN.md)。

## 当前限制

- 文件保存在浏览器 IndexedDB 中，没有云端同步或多人协作。
- 执行历史只保存在内存中，不跨进程持久化。
- 停止会取消调度并通知节点清理，但不会撤销已发出的请求或外部写入。
- 循环只有“由循环体决定结束”一种形态；子图参数端口需通过代码配置。

## 常用命令

| 命令                                | 作用                                 |
| ----------------------------------- | ------------------------------------ |
| `pnpm dev`                          | 启动示例应用，直接加载库源码         |
| `pnpm dev:dist`                     | 先用构建产物启动示例，并监听库的修改 |
| `pnpm build`                        | 构建所有库，并检查包之间的依赖       |
| `pnpm build:all`                    | 构建全部工作区，包括示例             |
| `pnpm typecheck`                    | 检查全仓库的 TypeScript 类型         |
| `pnpm lint`                        | 检查代码                             |
| `pnpm test`                        | 运行发布脚本、各包和 Playwright 测试  |
| `pnpm test:e2e`                    | 用 Playwright 运行浏览器回归和端到端测试 |
| `pnpm format` / `pnpm format:check` | 格式化 / 检查格式                    |
| `pnpm clean`                        | 删除构建产物                         |

首次运行浏览器测试前，执行 `pnpm exec playwright install chromium`。Playwright 会启动 React 示例，并为每个用例创建独立的 Chromium 浏览器上下文。详见 [React 示例验证说明](examples/primflow-react/README.zh-CN.md#验证)。

## 许可

MIT
