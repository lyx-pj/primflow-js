/**
 * Application language.
 *
 * The example supports Simplified Chinese and English. Language is chosen from
 * the browser's preference list at startup; `setLanguage` exists so tests and
 * embedders can pin a language explicitly.
 */
export type AppLanguage = 'en' | 'zh'

const english = {
  'app.title': 'Workflow Example',
  'app.loading': 'Loading workflow…',
  'save.pending': 'Pending…',
  'save.saving': 'Saving…',
  'save.savedAt': 'Saved {time}',
  'save.saved': 'Saved',
  'save.error': 'Save failed: {message}',
  'file.untitled': 'Untitled file',
  'file.view': 'View',
  'file.subgraph': 'Subgraph',
  'file.views': 'Views',
  'file.subgraphs': 'Subgraphs',
  'file.new': 'New…',
  'file.confirmDelete': 'Confirm delete',
  'file.renameLabel': 'Rename {type} {name}',
  'file.deleteLabel': 'Delete {type} {name}',
  'file.confirmDeleteLabel': 'Confirm deleting {type} {name}',
  'file.cancelDeleteLabel': 'Cancel deleting {type} {name}',
  'dialog.newView': 'New view',
  'dialog.newSubgraph': 'New subgraph',
  'dialog.renameView': 'Rename view',
  'dialog.renameSubgraph': 'Rename subgraph',
  'dialog.createViewDescription': 'The application switches to the new view after creation.',
  'dialog.createSubgraphDescription':
    'A subgraph is an independent file; the application switches to it after creation.',
  'dialog.renameDescription': 'The selector and the title update after saving.',
  'dialog.create': 'Create',
  'dialog.save': 'Save',
  'dialog.cancel': 'Cancel',
  'dialog.createMode': 'Create as',
  'dialog.viewOption': 'View',
  'dialog.subgraphOption': 'Subgraph',
  'dialog.viewName': 'View name',
  'dialog.subgraphName': 'Subgraph name',
  'dialog.viewPlaceholder': 'e.g. Order flow',
  'dialog.subgraphPlaceholder': 'e.g. Order validation',
  'default.viewName': 'View {index}',
  'default.untitledView': 'Untitled view',
  'error.load':
    'Unable to restore workflow. {reason}. The saved file was kept and autosave is paused; press Ctrl/Cmd + S to overwrite it with the current canvas.',
  'error.storage': 'Check browser storage',
  'error.missingFile': 'File not found',
  'error.missingView': 'View not found',
  'error.noCurrentFile': 'No file is loaded yet',
  'error.run': 'Unable to run workflow. {reason}',
  'error.unsupportedNodes': 'Saved file contains removed nodes: {types}',
  'error.subgraphRemovedNodes': 'Subgraph file {label} contains removed nodes: {types}',
  'error.duplicateNodeId': 'Duplicate node ID: {id} ({owner} and {label})',
  'error.currentFile': 'current file',
  'error.subgraphCycle': 'Subgraph cycle: {chain}',
  'error.missingSubgraph': 'Node {node} references a missing subgraph file: {id}',
  'error.notSubgraph': 'Node {node} references {name}, which is not a subgraph file',
  'error.subgraphRead': 'Subgraph file {name} could not be read or was deleted',
  'error.duplicateRegion': 'Duplicate subgraph region ID: {id}',
  'subgraph.parameter': 'Parameter',
  'subgraph.returnValue': 'Return value',
  'palette.subgraphs': 'Subgraphs',
  'palette.callSubgraph': 'Call subgraph file {name}',
  'record.flow': 'Run [{name}]',
  'record.subgraph': 'Run [Subgraph] [{name}]',
  'record.event': 'Run event [{node}] [{event}]',
  'record.unnamedEvent': 'Unnamed event',
  'record.unknownNode': 'Unknown node',
  'record.unnamedView': 'Untitled view',
  'record.node': 'Node',
  'log.resumed': 'Resumed execution',
  'log.pausedAt': 'Paused at {node}',
  'log.stopped': 'Execution stopped',
  'log.started': 'Started workflow execution',
  'log.taskCompleted': 'Task completed',
  'log.taskFailed': 'Task failed',
  'log.taskCancelled': 'Task cancelled',
  'log.nodeStarted': 'Started {node}',
  'log.nodeCompleted': '{node} completed',
  'log.nodeFailed': '{node} failed: {message}',
  'log.breakpoint': 'Breakpoint hit at {node}',
  'toolbar.run': 'Run',
  'toolbar.debug': 'Debug',
  'toolbar.resume': 'Resume',
  'toolbar.stop': 'Stop',
  'list.separator': ', ',
} as const

export type MessageKey = keyof typeof english

const chinese: Record<MessageKey, string> = {
  'app.title': '工作流示例',
  'app.loading': '正在加载工作流…',
  'save.pending': '待保存…',
  'save.saving': '保存中…',
  'save.savedAt': '已保存 {time}',
  'save.saved': '已保存',
  'save.error': '保存失败：{message}',
  'file.untitled': '未命名文件',
  'file.view': '视图',
  'file.subgraph': '子图',
  'file.views': '视图',
  'file.subgraphs': '子图',
  'file.new': '新建…',
  'file.confirmDelete': '确认删除',
  'file.renameLabel': '重命名{type}{name}',
  'file.deleteLabel': '删除{type}{name}',
  'file.confirmDeleteLabel': '确认删除{type}{name}',
  'file.cancelDeleteLabel': '取消删除{type}{name}',
  'dialog.newView': '新建视图',
  'dialog.newSubgraph': '新建子图',
  'dialog.renameView': '重命名视图',
  'dialog.renameSubgraph': '重命名子图',
  'dialog.createViewDescription': '创建后会自动切换到新视图。',
  'dialog.createSubgraphDescription': '子图是独立文件，创建后会自动切换过去。',
  'dialog.renameDescription': '保存后下拉框和左上角的名称会同步更新。',
  'dialog.create': '创建',
  'dialog.save': '保存',
  'dialog.cancel': '取消',
  'dialog.createMode': '创建方式',
  'dialog.viewOption': '普通视图',
  'dialog.subgraphOption': '子图',
  'dialog.viewName': '视图名称',
  'dialog.subgraphName': '子图名称',
  'dialog.viewPlaceholder': '例如：订单流程',
  'dialog.subgraphPlaceholder': '例如：订单校验',
  'default.viewName': '视图 {index}',
  'default.untitledView': '未命名视图',
  'error.load':
    '无法恢复工作流。{reason}。原存档仍保留，自动保存已暂停；按 Ctrl/Cmd + S 会用当前画布覆盖它。',
  'error.storage': '请检查浏览器存储',
  'error.missingFile': '文件不存在',
  'error.missingView': '视图不存在',
  'error.noCurrentFile': '当前文件尚未加载',
  'error.run': '无法执行工作流。{reason}',
  'error.unsupportedNodes': '存档包含已移除的节点：{types}',
  'error.subgraphRemovedNodes': '子图文件{label}包含已移除的节点：{types}',
  'error.duplicateNodeId': '节点 ID 重复：{id}（{owner} 与 {label}）',
  'error.currentFile': '当前文件',
  'error.subgraphCycle': '子图循环引用：{chain}',
  'error.missingSubgraph': '节点{node}引用的子图文件不存在：{id}',
  'error.notSubgraph': '节点{node}引用的{name}不是子图文件',
  'error.subgraphRead': '子图文件{name}读取失败或已被删除',
  'error.duplicateRegion': '子图区域 ID 重复：{id}',
  'subgraph.parameter': '参数',
  'subgraph.returnValue': '返回值',
  'palette.subgraphs': '子图',
  'palette.callSubgraph': '调用子图文件{name}',
  'record.flow': '执行【{name}】',
  'record.subgraph': '执行【子图】【{name}】',
  'record.event': '执行事件【{node}】【{event}】',
  'record.unnamedEvent': '未命名事件',
  'record.unknownNode': '未知节点',
  'record.unnamedView': '未命名视图',
  'record.node': '节点',
  'log.resumed': '继续执行',
  'log.pausedAt': '暂停于{node}',
  'log.stopped': '执行已停止',
  'log.started': '开始执行工作流',
  'log.taskCompleted': '任务执行完成',
  'log.taskFailed': '任务执行失败',
  'log.taskCancelled': '任务已取消',
  'log.nodeStarted': '开始执行{node}',
  'log.nodeCompleted': '{node}执行完成',
  'log.nodeFailed': '{node}执行失败：{message}',
  'log.breakpoint': '命中断点{node}',
  'toolbar.run': '执行',
  'toolbar.debug': '调试',
  'toolbar.resume': '继续',
  'toolbar.stop': '停止',
  'list.separator': '、',
}

const messages: Record<AppLanguage, Record<MessageKey, string>> = { en: english, zh: chinese }

function browserLanguages(): readonly string[] {
  if (typeof navigator === 'undefined') return []
  const primary = navigator.language
  const languages = navigator.languages ?? []
  if (primary) return [primary, ...languages.filter((language) => language !== primary)]
  return languages
}

/**
 * Pick the first supported language from the browser preference list.
 *
 * Chinese tags (`zh`, `zh-CN`, `zh-TW`, …) map to Chinese; any other list that
 * contains English maps to English. Unsupported languages fall back to English,
 * matching the canvas default.
 */
export function detectLanguage(languages: readonly string[] = browserLanguages()): AppLanguage {
  for (const language of languages) {
    const tag = language.trim().toLowerCase()
    if (tag.startsWith('zh')) return 'zh'
    if (tag.startsWith('en')) return 'en'
  }
  return 'en'
}

let override: AppLanguage | null = null

/** Current application language; browser detection is the default. */
export function getLanguage(): AppLanguage {
  return override ?? detectLanguage()
}

/** Pin the application language; pass `null` to resume browser detection. */
export function setLanguage(language: AppLanguage | null): void {
  override = language
}

function interpolate(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (placeholder, key: string) =>
    values[key] === undefined ? placeholder : String(values[key]),
  )
}

/** Translate one application message for an explicit language. */
export function translate(
  language: AppLanguage,
  key: MessageKey,
  values: Record<string, string | number> = {},
): string {
  return interpolate(messages[language][key] ?? english[key] ?? key, values)
}

/** Translate one application message in the current language. */
export function t(key: MessageKey, values: Record<string, string | number> = {}): string {
  return translate(getLanguage(), key, values)
}

/**
 * Choose a value by language, with English as the source text.
 *
 * Node definitions and demo catalog entries are read whenever the canvas builds
 * a node, so resolving at read time keeps labels aligned with the page language.
 */
export function localize<T>(englishValue: T, chineseValue: T): T {
  return getLanguage() === 'zh' ? chineseValue : englishValue
}

/** Quote a user-provided file name in the punctuation of the current language. */
export function quoteName(name: string, language: AppLanguage = getLanguage()): string {
  return language === 'zh' ? `「${name}」` : `"${name}"`
}

/** Separator for type lists in error messages. */
export function listSeparator(language: AppLanguage = getLanguage()): string {
  return translate(language, 'list.separator')
}

/** Toolbar labels shared by the initial graph options and runtime refresh. */
export function toolbarLabels(language: AppLanguage = getLanguage()) {
  return {
    run: translate(language, 'toolbar.run'),
    debug: translate(language, 'toolbar.debug'),
    resume: translate(language, 'toolbar.resume'),
    stop: translate(language, 'toolbar.stop'),
  }
}
