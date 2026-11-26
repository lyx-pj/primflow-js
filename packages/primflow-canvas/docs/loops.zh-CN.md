# 循环体的编辑

[English](loops.md) | 简体中文

画布负责创建、编辑、保存和删除循环体；执行由 [engine 循环执行](../../primflow-engine/docs/loops.zh-CN.md) 完成，节点与配置见 [model 循环节点](../../primflow-model/docs/loops.zh-CN.md)。

## 创建

- 添加 `loop` 节点时，画布生成 `targetGraphId`，在 `JsonGraph.subgraphs` 中创建循环体；节点未提供配置时写入默认值 `{ version: 1 }`。
- 循环体初始包含一个 `loop-entry` 和一个 `loop-return`，画布同时建立 `loop-entry.exec → loop-return.next` 连线；用户添加业务节点后替换这条连线即可。
- `loop-entry` / `loop-return` 由画布生成，不出现在添加面板，也不能独立添加。
- 新建的循环体先接好入口到返回，保证刚创建的循环能通过引擎加载时的检查。
- 循环体可以继续嵌套循环或调用普通子图；事件源节点（`executionMode: 'source'`）在循环体内从添加面板隐藏，加载校验也会拒绝。

## 进入和返回

双击循环节点进入循环体编辑。节点面板由工具栏按钮控制，默认打开；选中节点不会自动弹出面板，面板已打开时改选节点会立即更新。返回上一层使用工具栏、空白处右键双击、右键菜单或 `Esc`，与独立子图共用 [子图导航](subgraphs.zh-CN.md)。

## 循环上限与输入

打开工具栏的节点面板并单击 Loop 节点，在「循环上限」中设置「最大循环次数」或「超时（毫秒）」。设置的次数须在引擎上限内，清空次数时沿用引擎上限。超时按整次调用计时，清空后循环不设超时。

在循环体内，连接 `Initial value` 可让每轮读取同一个初始值，连接 `Iteration input` 可接收上一轮的结果。两个端口在首轮都提供初始值。

## 保存和加载

- 循环体随所属图保存在 `subgraphs`，不单独成为文件。
- 加载循环体不补普通 `Start`；循环体使用 `LoopEntry` / `LoopReturn`，不适用主图和普通子图的 Start 规则。
- 循环配置随图保存和加载；新建节点面板中的两项上限默认留空。
- 删除循环节点时，画布一并移除它的循环体；循环体的入口和返回节点不能单独删除。

## 展示

- 画布没有轮次面板；轮次、结束原因和每轮数据通过引擎查询 API 查看，展示由应用决定。
- 执行光晕、断点、执行日志和回溯属于通用画布能力，见 [canvas README](../README.zh-CN.md)。

## 测试

[startNodes.test.ts](../tests/startNodes.test.ts) 覆盖循环体创建、嵌套、保存加载、删除、`isLoopBody` 判断，以及入口与返回节点的删除保护。
