import { DEFAULT_LOOP_CONFIG, type LoopConfig } from '@lyx-pj/primflow-model'
import type { PaletteItemDescription, PaletteOptions } from '@lyx-pj/primflow-canvas'
import { getLanguage, type AppLanguage } from '../i18n'

interface DemoNode extends PaletteItemDescription {
  inputValues?: Record<string, unknown>
  /** Configuration for container nodes; currently only the loop node needs it. */
  loop?: LoopConfig
}

const httpDefaults = { method: 'GET', url: `${import.meta.env.BASE_URL}http-example.json` }

/** Keep palette display info and demo defaults here without touching the generic node model. */
const demoNodeCopies: Record<string, Record<AppLanguage, DemoNode>> = {
  ImageFile: {
    en: {
      category: 'Files',
      iconClass: 'ri-image-line',
      description: 'Pick a PNG or JPEG image and preview it inside the node card',
    },
    zh: {
      category: '文件',
      iconClass: 'ri-image-line',
      description: '选择 PNG 或 JPEG 图片并在节点卡片中预览',
    },
  },
  TextInput: {
    en: {
      category: 'Inputs',
      iconClass: 'ri-text',
      description: 'Provide a text value for downstream nodes',
      keywords: ['text', 'string', '文本'],
      inputValues: { value: 'Hello, workflow' },
    },
    zh: {
      category: '基础输入',
      iconClass: 'ri-text',
      description: '提供一段文本，供后续节点使用',
      keywords: ['text', 'string', '文本'],
      inputValues: { value: '你好，工作流' },
    },
  },
  NumberInput: {
    en: {
      category: 'Inputs',
      iconClass: 'ri-hashtag',
      description: 'Provide a numeric value for math and comparisons',
      keywords: ['number', '数值'],
      inputValues: { value: 42 },
    },
    zh: {
      category: '基础输入',
      iconClass: 'ri-hashtag',
      description: '提供一个数值，用于计算和比较',
      keywords: ['number', '数值'],
      inputValues: { value: 42 },
    },
  },
  BooleanInput: {
    en: {
      category: 'Inputs',
      iconClass: 'ri-toggle-line',
      description: 'Toggle true or false to control conditional branches',
      keywords: ['boolean', 'bool', 'toggle', '布尔'],
      inputValues: { value: true },
    },
    zh: {
      category: '基础输入',
      iconClass: 'ri-toggle-line',
      description: '切换真或假，控制条件分支',
      keywords: ['boolean', 'bool', 'toggle', '布尔'],
      inputValues: { value: true },
    },
  },
  ArrayInput: {
    en: {
      category: 'Inputs',
      iconClass: 'ri-brackets-line',
      description: 'Edit a JSON array in the node panel',
      keywords: ['array', 'list', 'json', '数组'],
      inputValues: { value: [1, 2, 3] },
    },
    zh: {
      category: '基础输入',
      iconClass: 'ri-brackets-line',
      description: '在节点面板中编辑 JSON 数组',
      keywords: ['array', 'list', 'json', '数组'],
      inputValues: { value: [1, 2, 3] },
    },
  },
  ObjectInput: {
    en: {
      category: 'Inputs',
      iconClass: 'ri-braces-line',
      description: 'Edit a JSON object in the node panel',
      keywords: ['object', 'json', '对象'],
      inputValues: { value: { name: 'Workflow', enabled: true } },
    },
    zh: {
      category: '基础输入',
      iconClass: 'ri-braces-line',
      description: '在节点面板中编辑 JSON 对象',
      keywords: ['object', 'json', '对象'],
      inputValues: { value: { name: '工作流', enabled: true } },
    },
  },
  MultilineInput: {
    en: {
      category: 'Inputs',
      iconClass: 'ri-paragraph',
      description: 'Enter multi-line text in the node panel',
      keywords: ['textarea', 'multiline', '多行文本'],
      inputValues: { value: 'First line\nSecond line' },
    },
    zh: {
      category: '基础输入',
      iconClass: 'ri-paragraph',
      description: '在节点面板中输入多行文本',
      keywords: ['textarea', 'multiline', '多行文本'],
      inputValues: { value: '第一行\n第二行' },
    },
  },
  SelectInput: {
    en: {
      category: 'Inputs',
      iconClass: 'ri-list-check',
      description: 'Choose an option from a dropdown and output its value',
      keywords: ['select', 'dropdown', '下拉选择'],
      inputValues: { value: 'small' },
    },
    zh: {
      category: '基础输入',
      iconClass: 'ri-list-check',
      description: '从下拉菜单选择选项并输出其值',
      keywords: ['select', 'dropdown', '下拉选择'],
      inputValues: { value: 'small' },
    },
  },
  SetVariable: {
    en: {
      category: 'Variables',
      iconClass: 'ri-save-line',
      description: 'Store a named JSON value in the current task',
      keywords: ['variable', 'state', 'set', '变量'],
      inputValues: { name: 'status', value: 'wrong' },
    },
    zh: {
      category: '变量',
      iconClass: 'ri-save-line',
      description: '在当前任务中按名称保存 JSON 值',
      keywords: ['变量', '设置', '任务状态'],
      inputValues: { name: 'status', value: 'wrong' },
    },
  },
  GetVariable: {
    en: {
      category: 'Variables',
      iconClass: 'ri-database-2-line',
      description: 'Read a named value from the current task',
      keywords: ['variable', 'state', 'get', '变量'],
      inputValues: { name: 'status' },
    },
    zh: {
      category: '变量',
      iconClass: 'ri-database-2-line',
      description: '从当前任务读取指定名称的变量值',
      keywords: ['变量', '获取', '任务状态'],
      inputValues: { name: 'status' },
    },
  },
  ConcatText: {
    en: {
      category: 'Text',
      iconClass: 'ri-link',
      description: 'Join two text values with a separator',
      keywords: ['concat', 'join', '拼接'],
      inputValues: { a: 'Hello', b: 'workflow', separator: ', ' },
    },
    zh: {
      category: '文本处理',
      iconClass: 'ri-link',
      description: '用分隔符将两段文本拼接起来',
      keywords: ['concat', 'join', '拼接'],
      inputValues: { a: '你好', b: '工作流', separator: '，' },
    },
  },
  TextTemplate: {
    en: {
      category: 'Text',
      iconClass: 'ri-file-text-line',
      description: 'Replace {{value}} in a template to produce text',
      keywords: ['template', 'format', '模板'],
      inputValues: { template: 'Result: {{value}}', value: 'Hello, workflow' },
    },
    zh: {
      category: '文本处理',
      iconClass: 'ri-file-text-line',
      description: '将模板中的 {{value}} 替换为输入值',
      keywords: ['template', 'format', '模板'],
      inputValues: { template: '处理结果：{{value}}', value: '你好，工作流' },
    },
  },
  SplitText: {
    en: {
      category: 'Text',
      iconClass: 'ri-list-unordered',
      description: 'Split text by a separator into a list and count',
      keywords: ['split', 'array', '拆分', '数组'],
      inputValues: { text: 'apple,banana,orange', separator: ',' },
    },
    zh: {
      category: '文本处理',
      iconClass: 'ri-list-unordered',
      description: '按分隔符拆分为列表并输出数量',
      keywords: ['split', 'array', '拆分', '数组'],
      inputValues: { text: '苹果,香蕉,橙子', separator: ',' },
    },
  },
  CheckText: {
    en: {
      category: 'Text',
      iconClass: 'ri-checkbox-circle-line',
      description: 'Continue when the incoming value matches the expected text',
      keywords: ['text', 'check', 'validate', 'retry', '校验', '重试'],
      inputValues: { expected: 'ready' },
    },
    zh: {
      category: '文本处理',
      iconClass: 'ri-checkbox-circle-line',
      description: '输入值与期望文本一致时继续执行',
      keywords: ['文本', '校验', '重试'],
      inputValues: { expected: 'ready' },
    },
  },
  Arithmetic: {
    en: {
      category: 'Math',
      iconClass: 'ri-calculator-line',
      description: 'Add, subtract, multiply, or divide two numbers',
      keywords: ['math', 'calc', '计算'],
      inputValues: { a: 12, b: 3, operation: 'add' },
    },
    zh: {
      category: '数据计算',
      iconClass: 'ri-calculator-line',
      description: '对两个数值进行加、减、乘、除',
      keywords: ['math', 'calc', '计算'],
      inputValues: { a: 12, b: 3, operation: 'add' },
    },
  },
  Compare: {
    en: {
      category: 'Math',
      iconClass: 'ri-scales-3-line',
      description: 'Compare two numbers and output a boolean result',
      keywords: ['compare', '判断', '比较'],
      inputValues: { a: 42, b: 10, operation: 'gt' },
    },
    zh: {
      category: '数据计算',
      iconClass: 'ri-scales-3-line',
      description: '比较两个数值并输出布尔结果',
      keywords: ['compare', '判断', '比较'],
      inputValues: { a: 42, b: 10, operation: 'gt' },
    },
  },
  start: {
    en: {
      category: 'Flow',
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
  If: {
    en: {
      category: 'Flow',
      iconClass: 'ri-git-branch-line',
      description: 'Route execution to True or False based on a condition',
      keywords: ['if', 'condition', 'boolean', 'skipped', '条件', '跳过'],
      inputValues: { condition: true },
    },
    zh: {
      category: '流程控制',
      iconClass: 'ri-git-branch-line',
      description: '根据条件选择「是」或「否」分支',
      keywords: ['if', 'condition', 'boolean', 'skipped', '条件', '跳过'],
      inputValues: { condition: true },
    },
  },
  Switch: {
    en: {
      category: 'Flow',
      iconClass: 'ri-route-line',
      description: 'Match text against multiple cases and add branches dynamically',
      keywords: ['switch', 'case', '分支'],
      inputValues: { value: 'pass', case_1_value: 'pass' },
    },
    zh: {
      category: '流程控制',
      iconClass: 'ri-route-line',
      description: '按文本匹配多个分支，支持动态添加条件',
      keywords: ['switch', 'case', '分支'],
      inputValues: { value: '通过', case_1_value: '通过' },
    },
  },
  Delay: {
    en: {
      category: 'Flow',
      iconClass: 'ri-timer-line',
      description: 'Wait for a duration in milliseconds before continuing',
      keywords: ['delay', 'wait', 'cancelled', '等待', '取消'],
      inputValues: { duration: 500 },
    },
    zh: {
      category: '流程控制',
      iconClass: 'ri-timer-line',
      description: '等待指定毫秒后继续执行',
      keywords: ['delay', 'wait', 'cancelled', '等待', '取消'],
      inputValues: { duration: 500 },
    },
  },
  Timer: {
    en: {
      category: 'Flow',
      iconClass: 'ri-timer-flash-line',
      description: 'Repeatedly trigger downstream nodes on a fixed interval',
      keywords: ['timer', 'interval', 'schedule', '定时'],
      inputValues: { interval: 5 },
    },
    zh: {
      category: '流程控制',
      iconClass: 'ri-timer-flash-line',
      description: '按固定间隔反复触发下游节点',
      keywords: ['timer', 'interval', 'schedule', '定时'],
      inputValues: { interval: 5 },
    },
  },
  ManualApproval: {
    en: {
      category: 'Flow',
      iconClass: 'ri-user-follow-line',
      description: 'Pause for a user to approve or reject, then follow that branch',
      keywords: ['approval', 'interrupted', 'human', '审批', '中断'],
      inputValues: { prompt: 'Approve this request?' },
    },
    zh: {
      category: '流程控制',
      iconClass: 'ri-user-follow-line',
      description: '暂停等待用户通过或拒绝，再沿对应分支继续',
      keywords: ['approval', 'interrupted', 'human', '审批', '中断'],
      inputValues: { prompt: '是否通过这项请求？' },
    },
  },
  ThrowError: {
    en: {
      category: 'Flow',
      iconClass: 'ri-error-warning-line',
      description: 'Fail this node with a configurable error message',
      keywords: ['error', 'throw', 'failed', '错误', '失败'],
      inputValues: { message: 'The request could not be processed.' },
    },
    zh: {
      category: '流程控制',
      iconClass: 'ri-error-warning-line',
      description: '使用配置的错误消息让当前节点执行失败',
      keywords: ['error', 'throw', 'failed', '错误', '失败'],
      inputValues: { message: '无法处理该请求。' },
    },
  },
  loop: {
    en: {
      category: 'Flow',
      iconClass: 'ri-loop-right-line',
      description: 'Repeat a body until it stops; double-click to edit inner nodes',
      keywords: ['loop', 'for', 'iterate', '循环', '迭代'],
      loop: DEFAULT_LOOP_CONFIG,
    },
    zh: {
      category: '流程控制',
      iconClass: 'ri-loop-right-line',
      description: '反复执行循环体直至结束，双击可编辑内部节点',
      keywords: ['loop', 'for', 'iterate', '循环', '迭代'],
      loop: DEFAULT_LOOP_CONFIG,
    },
  },
  EmitEvent: {
    en: {
      category: 'Events',
      iconClass: 'ri-send-plane-line',
      description: 'Emit a named event; listeners handle it in separate tasks',
      keywords: ['event', 'emit', 'trigger', '事件', '发送'],
      inputValues: { event: 'demo', payload: 'Hello' },
    },
    zh: {
      category: '事件',
      iconClass: 'ri-send-plane-line',
      description: '发出业务事件，监听节点会在独立任务中响应',
      keywords: ['event', 'emit', 'trigger', '事件', '发送'],
      inputValues: { event: 'demo', payload: '你好' },
    },
  },
  OnEvent: {
    en: {
      category: 'Events',
      iconClass: 'ri-radar-line',
      description: 'Listen for a named event and output its payload and count',
      keywords: ['event', 'listen', 'subscribe', '事件', '监听'],
      inputValues: { event: 'demo' },
    },
    zh: {
      category: '事件',
      iconClass: 'ri-radar-line',
      description: '监听业务事件并输出事件数据与累计次数',
      keywords: ['event', 'listen', 'subscribe', '事件', '监听'],
      inputValues: { event: 'demo' },
    },
  },
  HttpRequest: {
    en: {
      category: 'Network',
      iconClass: 'ri-global-line',
      description: 'Send an HTTP request and output its status and response body',
      keywords: ['http', 'api', 'fetch', '网络'],
      inputValues: httpDefaults,
    },
    zh: {
      category: '网络',
      iconClass: 'ri-global-line',
      description: '发送 HTTP 请求并输出状态码和响应体',
      keywords: ['http', 'api', '请求', '网络'],
      inputValues: httpDefaults,
    },
  },
  Print: {
    en: {
      category: 'Debug',
      iconClass: 'ri-terminal-box-line',
      description: 'Print any value to the execution log and console',
      keywords: ['print', 'log', 'console', '输出', '打印'],
      inputValues: { value: 'Workflow completed' },
    },
    zh: {
      category: '调试输出',
      iconClass: 'ri-terminal-box-line',
      description: '将任意值打印到执行日志与控制台',
      keywords: ['print', 'log', 'console', '输出', '打印'],
      inputValues: { value: '工作流执行完成' },
    },
  },
  CustomCard: {
    en: {
      iconClass: 'ri-layout-card-line',
      description: 'Demo node that renders a custom card body via nodeRenderers',
      keywords: ['custom', 'renderer', 'card', '自定义', '渲染'],
      inputValues: { label: 'Custom card' },
    },
    zh: {
      iconClass: 'ri-layout-card-line',
      description: '演示节点：通过自定义渲染器绘制卡片主体',
      keywords: ['custom', 'renderer', 'card', '自定义', '渲染'],
      inputValues: { label: '自定义卡片' },
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
  describe: (nodeClass) => demoNodes[nodeClass.definitionId ?? ''],
  defaults: (nodeClass) => {
    const demo = demoNodes[nodeClass.definitionId ?? '']
    return {
      inputValues: structuredClone(demo?.inputValues),
      ...(demo?.loop ? { loop: demo.loop } : {}),
    }
  },
}
