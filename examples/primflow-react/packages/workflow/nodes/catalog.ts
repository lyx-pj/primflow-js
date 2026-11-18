import { DEFAULT_LOOP_CONFIG, type LoopConfig } from '@lyx-pj/primflow-model'
import type { PaletteItemDescription, PaletteOptions } from '@lyx-pj/primflow-canvas'
import { getLanguage, type AppLanguage } from '../i18n'

interface DemoNode extends PaletteItemDescription {
  values?: Record<string, unknown>
  /** Configuration for container nodes; currently only the loop node needs it. */
  loop?: LoopConfig
}

/** Keep palette display info and demo defaults here without touching the generic node model. */
const demoNodeCopies: Record<string, Record<AppLanguage, DemoNode>> = {
  TextInput: {
    en: {
      category: 'Basic input',
      iconClass: 'ri-text',
      description: 'Provide a text value as input for later steps',
      keywords: ['text', 'string', '文本'],
      values: { value: 'Hello, workflow' },
    },
    zh: {
      category: '基础输入',
      iconClass: 'ri-text',
      description: '提供一段文本，作为后续处理的输入',
      keywords: ['text', 'string', '文本'],
      values: { value: '你好，工作流' },
    },
  },
  NumberInput: {
    en: {
      category: 'Basic input',
      iconClass: 'ri-hashtag',
      description: 'Provide a numeric value to try calculations and comparisons',
      keywords: ['number', '数值'],
      values: { value: 42 },
    },
    zh: {
      category: '基础输入',
      iconClass: 'ri-hashtag',
      description: '提供一个数值，体验计算和比较',
      keywords: ['number', '数值'],
      values: { value: 42 },
    },
  },
  BooleanInput: {
    en: {
      category: 'Basic input',
      iconClass: 'ri-toggle-line',
      description: 'Toggle true or false to control conditional branches',
      keywords: ['boolean', 'bool', '布尔'],
      values: { value: true },
    },
    zh: {
      category: '基础输入',
      iconClass: 'ri-toggle-line',
      description: '切换真或假，控制条件分支',
      keywords: ['boolean', 'bool', '布尔'],
      values: { value: true },
    },
  },
  Concat: {
    en: {
      category: 'Text processing',
      iconClass: 'ri-link',
      description: 'Join two text values with a separator',
      keywords: ['join', '拼接'],
      values: { string1: 'Hello', string2: 'workflow', separator: ', ' },
    },
    zh: {
      category: '文本处理',
      iconClass: 'ri-link',
      description: '用连接符将两段文本拼接起来',
      keywords: ['join', '拼接'],
      values: { string1: '你好', string2: '工作流', separator: '，' },
    },
  },
  TextTemplate: {
    en: {
      category: 'Text processing',
      iconClass: 'ri-file-text-line',
      description: 'Replace {{value}} with the input to produce text',
      keywords: ['template', '模板'],
      values: { template: 'Result: {{value}}', value: 'Hello, workflow' },
    },
    zh: {
      category: '文本处理',
      iconClass: 'ri-file-text-line',
      description: '将 {{value}} 替换为输入，生成文本',
      keywords: ['template', '模板'],
      values: { template: '处理结果：{{value}}', value: '你好，工作流' },
    },
  },
  TextSplit: {
    en: {
      category: 'Text processing',
      iconClass: 'ri-list-unordered',
      description: 'Split text by a separator into a list and output the count',
      keywords: ['split', 'array', '数组'],
      values: { text: 'apple,banana,orange', separator: ',' },
    },
    zh: {
      category: '文本处理',
      iconClass: 'ri-list-unordered',
      description: '按分隔符拆分为列表，并输出数量',
      keywords: ['split', 'array', '数组'],
      values: { text: '苹果,香蕉,橙子', separator: ',' },
    },
  },
  MathOperation: {
    en: {
      category: 'Calculation',
      iconClass: 'ri-calculator-line',
      description: 'Add, subtract, multiply, or divide two numbers',
      keywords: ['math', '计算'],
      values: { a: 12, b: 3, operation: 'add' },
    },
    zh: {
      category: '数据计算',
      iconClass: 'ri-calculator-line',
      description: '对两个数值进行加、减、乘、除',
      keywords: ['math', '计算'],
      values: { a: 12, b: 3, operation: 'add' },
    },
  },
  Compare: {
    en: {
      category: 'Calculation',
      iconClass: 'ri-scales-3-line',
      description: 'Compare two numbers and output a boolean result',
      keywords: ['compare', '判断'],
      values: { a: 42, b: 10, operation: 'gt' },
    },
    zh: {
      category: '数据计算',
      iconClass: 'ri-scales-3-line',
      description: '比较两个数值，输出布尔结果',
      keywords: ['compare', '判断'],
      values: { a: 42, b: 10, operation: 'gt' },
    },
  },
  start: {
    en: {
      category: 'Flow control',
      title: 'Start',
      iconClass: 'ri-play-circle-line',
      description: 'Workflow execution entry point',
      keywords: ['start', '触发'],
    },
    zh: {
      category: '流程控制',
      title: '开始',
      iconClass: 'ri-play-circle-line',
      description: '工作流的执行入口',
      keywords: ['start', '触发'],
    },
  },
  IF: {
    en: {
      category: 'Flow control',
      iconClass: 'ri-git-branch-line',
      description: 'Choose the true or false branch based on a condition',
      keywords: ['if', 'boolean', '条件'],
      values: { condition: true },
    },
    zh: {
      category: '流程控制',
      iconClass: 'ri-git-branch-line',
      description: '根据条件选择「满足」或「不满足」分支',
      keywords: ['if', 'boolean', '条件'],
      values: { condition: true },
    },
  },
  Switch: {
    en: {
      category: 'Flow control',
      iconClass: 'ri-route-line',
      description: 'Match text against multiple cases and add conditions dynamically',
      keywords: ['switch', 'case', '分支'],
      values: { condition: 'pass', case_1_value: 'pass' },
    },
    zh: {
      category: '流程控制',
      iconClass: 'ri-route-line',
      description: '按文本匹配多个分支，支持动态添加条件',
      keywords: ['switch', 'case', '分支'],
      values: { condition: '通过', case_1_value: '通过' },
    },
  },
  Delay: {
    en: {
      category: 'Flow control',
      iconClass: 'ri-timer-line',
      description: 'Wait a number of milliseconds before continuing, useful for observing execution',
      keywords: ['delay', '延时'],
      values: { duration: 500 },
    },
    zh: {
      category: '流程控制',
      iconClass: 'ri-timer-line',
      description: '等待指定毫秒后继续，便于观察执行过程',
      keywords: ['delay', '延时'],
      values: { duration: 500 },
    },
  },
  loop: {
    en: {
      category: 'Flow control',
      iconClass: 'ri-loop-right-line',
      description: 'Repeat a body that decides when to stop; double-click to edit its inner nodes',
      keywords: ['loop', 'for', 'iterate', '循环', '迭代'],
      loop: DEFAULT_LOOP_CONFIG,
    },
    zh: {
      category: '流程控制',
      iconClass: 'ri-loop-right-line',
      description: '循环体反复执行，由循环体自己决定什么时候结束，双击可进入循环体编辑内部节点',
      keywords: ['loop', 'for', 'iterate', '循环', '迭代'],
      loop: DEFAULT_LOOP_CONFIG,
    },
  },
  TimerEvent: {
    en: {
      category: 'Flow control',
      iconClass: 'ri-timer-flash-line',
      description:
        'Repeatedly trigger downstream nodes at an interval (seconds/minutes/hours) or a fixed daily time',
      keywords: ['timer', 'interval', 'cron', 'schedule', '定时', '每天'],
      values: { mode: 'interval', interval: 5, unit: 'second', time: '09:00' },
    },
    zh: {
      category: '流程控制',
      iconClass: 'ri-timer-flash-line',
      description: '按间隔（秒/分/时）或每天固定时间反复触发下游',
      keywords: ['timer', 'interval', 'cron', 'schedule', '定时', '每天'],
      values: { mode: 'interval', interval: 5, unit: 'second', time: '09:00' },
    },
  },
  EventTrigger: {
    en: {
      category: 'Events',
      iconClass: 'ri-send-plane-line',
      description: 'Emit a business event during execution; listener nodes handle it in separate tasks',
      keywords: ['event', 'emit', 'trigger', '触发'],
      values: { event: 'demo:message', payload: 'Hello, event' },
    },
    zh: {
      category: '事件',
      iconClass: 'ri-send-plane-line',
      description: '在执行流中发出业务事件，事件监听节点会在独立任务中响应',
      keywords: ['event', 'emit', 'trigger', '触发'],
      values: { event: 'demo:message', payload: '你好，事件' },
    },
  },
  EventListener: {
    en: {
      category: 'Events',
      iconClass: 'ri-radar-line',
      description: 'Listen for a business event when the session starts and output event data and received count',
      keywords: ['event', 'listen', 'onEvent', '监听'],
      values: { event: 'demo:message' },
    },
    zh: {
      category: '事件',
      iconClass: 'ri-radar-line',
      description: '会话启动时监听业务事件，输出事件数据与累计收到次数',
      keywords: ['event', 'listen', 'onEvent', '监听'],
      values: { event: 'demo:message' },
    },
  },
  Print: {
    en: {
      category: 'Debug output',
      iconClass: 'ri-terminal-box-line',
      description: 'Output any value, visible in the execution preview and console',
      keywords: ['print', 'log', 'console'],
      values: { message: 'Workflow completed' },
    },
    zh: {
      category: '输出调试',
      iconClass: 'ri-terminal-box-line',
      description: '输出任意数据，可在执行预览与控制台查看',
      keywords: ['print', 'log', 'console'],
      values: { message: '工作流执行完成' },
    },
  },
}

/**
 * The node catalog is read in the current language.
 *
 * Keep the catalog's plain-object shape so the canvas can iterate with `Object.keys` / `demoNodes[type]`;
 * resolve values by the current language on each property read.
 */
export const demoNodes = {} as Record<string, DemoNode>
for (const [type, copies] of Object.entries(demoNodeCopies)) {
  Object.defineProperty(demoNodes, type, {
    enumerable: true,
    configurable: true,
    get: () => copies[getLanguage()],
  })
}

export const demoPalette: PaletteOptions = {
  items: (graph) => Object.keys(demoNodes).map((type) => graph.nodeRegistry.get(type)),
  describe: (nodeClass) => demoNodes[nodeClass.type],
  defaults: (nodeClass) => {
    const demo = demoNodes[nodeClass.type]
    return {
      values: demo?.values,
      ...(demo?.loop ? { loop: demo.loop } : {}),
    }
  },
}
