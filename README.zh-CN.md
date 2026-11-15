# Workflow JS

[English](README.md) | 简体中文

基于节点与连线的可视化编程工具库：用同一份图定义连接编辑、执行与调试，适合嵌入流程编辑器、数据处理工具和 AI 工作流应用。仓库包含 4 个库，并附带一个可运行的 React 示例。

## 模块与能力

| 模块 | 能做什么 | 文档 |
| --- | --- | --- |
| `@lyx-pj/workflow-model` | 定义工作流的数据结构 | [README](packages/workflow-model/README.zh-CN.md) |
| `@lyx-pj/workflow-engine` | 执行工作流 | [README](packages/workflow-engine/README.zh-CN.md) |
| `@lyx-pj/workflow-canvas` | 可视化编辑工作流，支持英中界面 | [README](packages/workflow-canvas/README.zh-CN.md) |
| `@lyx-pj/workflow-react` | 在 React 应用中使用工作流 | [README](packages/workflow-react/README.zh-CN.md) |

## 快速开始

需要先安装 Node.js 和 pnpm。

```bash
pnpm install
pnpm dev
```

启动后在浏览器打开终端显示的地址即可看到示例应用。

## 架构

模块分工、常用概念、数据归属和执行流程见 [架构说明](docs/architecture.zh-CN.md)。

## 当前限制

- 文件保存在浏览器 IndexedDB 中，没有云端同步或多人协作。
- 执行历史只保存在内存中，不跨进程持久化。
- 停止会取消调度并通知节点清理，但不会撤销已发出的请求或外部写入。
- 循环只有“由循环体决定结束”一种形态；子图参数端口需通过代码配置。

## 常用命令

| 命令 | 作用 |
| --- | --- |
| `pnpm dev` | 启动示例应用，直接加载库源码 |
| `pnpm dev:dist` | 先用构建产物启动示例，并监听库的修改 |
| `pnpm build` | 构建所有库，并检查包之间的依赖 |
| `pnpm build:all` | 构建全部工作区，包括示例 |
| `pnpm typecheck` | 检查全仓库的 TypeScript 类型 |
| `pnpm lint` / `pnpm test` | 检查代码 / 运行测试 |
| `pnpm format` / `pnpm format:check` | 格式化 / 检查格式 |
| `pnpm clean` | 删除构建产物 |

## 许可

MIT
