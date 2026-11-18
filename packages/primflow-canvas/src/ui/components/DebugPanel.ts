import { html, nothing, type TemplateResult } from 'lit-html'
import { styleMap } from 'lit-html/directives/style-map.js'
import type { NodeExecutionStatus } from '@lyx-pj/primflow-model'
import type {
  CanvasGraph,
  DebugChainItem,
  DebugChainKind,
  DebugLogEntry,
  DebugPanelData,
  DebugPanelOptions,
  DebugRecord,
  DebugRecordStatus,
} from '../types'
import { OverlayComponent } from '../OverlayComponent'
import type { OverlayLayer } from '../OverlayLayer'
import { stopWheel } from '../helpers'

const recordStatusLabels: Record<DebugRecordStatus, string> = {
  waiting: 'Waiting',
  running: 'Running',
  paused: 'Paused',
  completed: 'Completed',
  failed: 'Failed',
  cancelled: 'Cancelled',
}

const chainStatusLabels: Record<NodeExecutionStatus, string> = {
  idle: 'Idle',
  pending: 'Pending',
  running: 'Running',
  completed: 'Completed',
}

/** Role labels for subgraph-related nodes in the execution chain. */
const chainKindLabels: Record<DebugChainKind, string> = {
  node: 'Node',
  subgraph: 'Subgraph',
  'subgraph-start': 'Subgraph entry',
  'subgraph-end': 'Subgraph exit',
}

/** Indentation pixels per subgraph level. */
const CHAIN_INDENT = 14

/** Only finished records have final snapshots available for replay. */
const finishedRecordStatuses: ReadonlySet<DebugRecordStatus> = new Set(['completed', 'failed', 'cancelled'])

const logLevelLabels = {
  debug: 'Debug',
  info: 'Info',
  success: 'Success',
  warn: 'Warning',
  error: 'Error',
} as const

/** Right-hand debug panel displaying application-supplied records, chains, and logs. */
export class DebugPanel extends OverlayComponent {
  private expanded = false
  private readonly graph: CanvasGraph
  private readonly options: () => DebugPanelOptions | null
  private readonly onVisibilityChange: () => void

  refreshLanguage() {
    this.render()
  }

  constructor(
    graph: CanvasGraph,
    overlay: OverlayLayer,
    options: () => DebugPanelOptions | null,
    onVisibilityChange: () => void = () => {}
  ) {
    super(overlay, 'bpgraph-debug-panel-layer', () => graph.options.language)
    this.graph = graph
    this.options = options
    this.onVisibilityChange = onVisibilityChange
    this.expanded = Boolean(this.options()?.open)
    this.graph.on('replay:changed', this.onReplayChanged)
    this.render()
  }

  /** Current width, used to position node panels alongside it. */
  get width() {
    return this.options()?.width ?? 340
  }

  isOpen() {
    return this.expanded
  }

  open() {
    this.setOpen(true)
  }

  close() {
    this.setOpen(false)
  }

  toggle() {
    this.setOpen(!this.expanded)
  }

  destroy() {
    this.graph.off('replay:changed', this.onReplayChanged)
    super.destroy()
  }

  /** Reevaluate application data; close the panel if its configuration is removed. */
  refresh() {
    if (!this.options()) {
      this.setOpen(false)
      return
    }
    if (this.expanded) this.render()
  }

  private setOpen(next: boolean) {
    // Stay closed without debugPanel configuration so isOpen matches the DOM.
    if (next && !this.options()) return
    if (this.expanded === next) return
    this.expanded = next
    this.render()
    this.onVisibilityChange()
  }

  private onReplayChanged = () => {
    if (this.expanded) this.render()
  }

  private render() {
    if (!this.expanded || !this.options()) {
      this.commit(nothing)
      return
    }
    const data = this.readData()
    this.commit(html`
      <aside
        class="bpgraph-debug-panel"
        role="region"
        aria-label=${this.t('Debug panel')}
        style=${styleMap({ width: `${this.width}px` })}
        @wheel=${stopWheel}
      >
        <header class="bpgraph-debug-panel-header">
          <div>
            <h2 class="bpgraph-debug-panel-title">${this.t('Debug panel')}</h2>
            <p class="bpgraph-debug-panel-subtitle">${this.t('Records · Execution chain · Logs')}</p>
          </div>
          <button
            type="button"
            class="bpgraph-debug-panel-close"
            aria-label=${this.t('Close debug panel')}
            @click=${() => this.close()}
          >
            ×
          </button>
        </header>
        <div class="bpgraph-debug-panel-scroll">
          ${this.recordsSection(data.records)} ${this.chainSection(data.chain)} ${this.logsSection(data.logs)}
        </div>
      </aside>
    `)
  }

  private recordsSection(records: readonly DebugRecord[]) {
    return html`
      <section class="bpgraph-debug-panel-section" aria-label=${this.t('Execution records')}>
        <h3 class="bpgraph-debug-panel-section-title">
          ${this.t('Execution records')}<span>${records.length}</span>
        </h3>
        ${records.length > 0
          ? html`<ol class="bpgraph-debug-records">
              ${records.map((record) => this.recordTemplate(record))}
            </ol>`
          : html`<p class="bpgraph-debug-panel-empty">${this.t('No execution records')}</p>`}
      </section>
    `
  }

  private recordTemplate(record: DebugRecord): TemplateResult {
    const options = this.options()
    const duration = formatDuration(record.startedAt, record.endedAt)
    const active = options?.activeRecordId === record.id
    // Waiting, running, and paused records lack final state and cannot be replayed.
    const selectable =
      Boolean(options?.onRecordSelect) &&
      record.selectable !== false &&
      finishedRecordStatuses.has(record.status)
    return html`
      <li>
        <button
          type="button"
          class=${`bpgraph-debug-record is-${record.status}${active ? ' is-active' : ''}${
            selectable ? ' is-selectable' : ''
          }`}
          aria-pressed=${active}
          ?disabled=${!selectable}
          title=${selectable ? (active ? this.t('Click again to exit replay') : this.t('View this execution graph and logs')) : nothing}
          @click=${() => this.selectRecord(record)}
        >
          <span class="bpgraph-debug-record-dot" aria-hidden="true"></span>
          <span class="bpgraph-debug-record-body">
            <span class="bpgraph-debug-record-head">
              <strong>${record.title}</strong>
              <span class=${`bpgraph-debug-status is-${record.status}`}>
                ${this.t(recordStatusLabels[record.status]) ?? record.status}
              </span>
            </span>
            <span class="bpgraph-debug-record-meta">
              ${formatTime(record.startedAt)}${duration ? ` · ${duration}` : ''}
            </span>
            ${record.detail
              ? html`<span class="bpgraph-debug-record-detail">${record.detail}</span>`
              : nothing}
          </span>
        </button>
      </li>
    `
  }

  private selectRecord(record: DebugRecord) {
    const options = this.options()
    if (!options?.onRecordSelect) return
    if (!finishedRecordStatuses.has(record.status)) return
    options.onRecordSelect(options.activeRecordId === record.id ? null : record)
  }

  private chainSection(chain: readonly DebugChainItem[]) {
    return html`
      <section class="bpgraph-debug-panel-section" aria-label=${this.t('Execution chain')}>
        <h3 class="bpgraph-debug-panel-section-title">
          ${this.t('Execution chain')}<span>${chain.length}</span>
        </h3>
        ${chain.length > 0
          ? html`<ol class="bpgraph-debug-chain">
              ${chain.map((item, index) => this.chainTemplate(item, index))}
            </ol>`
          : html`<p class="bpgraph-debug-panel-empty">${this.t('No execution chain')}</p>`}
      </section>
    `
  }

  private chainTemplate(item: DebugChainItem, index: number): TemplateResult {
    const status = item.status ?? 'idle'
    const kind = item.kind ?? 'node'
    // Indent subgraph nodes by level to distinguish them from main graph nodes.
    const depth = item.scope?.depth ?? 0
    return html`
      <li
        class=${`bpgraph-debug-chain-item is-${status} is-${kind}`}
        style=${styleMap({
          paddingLeft: `${depth * CHAIN_INDENT}px`,
          '--bpgraph-chain-depth': String(depth),
        })}
      >
        <span class="bpgraph-debug-chain-index" aria-hidden="true">${index + 1}</span>
        <div class="bpgraph-debug-chain-body">
          <strong>${this.nodeLabel(item)}</strong>
          ${kind === 'node'
            ? nothing
            : html`<span class=${`bpgraph-debug-chain-tag is-${kind}`} title=${item.scope?.title ?? item.label ?? ''}>
                ${this.t(chainKindLabels[kind])}
              </span>`}
          <span class=${`bpgraph-debug-status is-${status}`}>
            ${this.t(chainStatusLabels[status]) ?? status}
          </span>
        </div>
      </li>
    `
  }

  private logsSection(logs: readonly DebugLogEntry[]) {
    return html`
      <section class="bpgraph-debug-panel-section" aria-label=${this.t('Logs')}>
        <h3 class="bpgraph-debug-panel-section-title">
          ${this.t('Logs')}<span>${logs.length}</span>
        </h3>
        ${logs.length > 0
          ? html`<ul class="bpgraph-debug-logs">
              ${logs.map((entry) => this.logTemplate(entry))}
            </ul>`
          : html`<p class="bpgraph-debug-panel-empty">${this.t('No logs')}</p>`}
      </section>
    `
  }

  private logTemplate(entry: DebugLogEntry): TemplateResult {
    const level = entry.level ?? 'info'
    const nodeLabel = entry.nodeId ? this.nodeLabel({ nodeId: entry.nodeId }) : ''
    // Prefix subgraph logs with [subgraph name] to distinguish their source.
    const scopeLabel = entry.scope?.title ? `[${entry.scope.title}]` : ''
    // Render logs on one line and expose full messages through title.
    const fullText = [scopeLabel, nodeLabel, entry.message].filter(Boolean).join(' · ')
    return html`
      <li class=${`bpgraph-debug-log is-${level}`}>
        <span class="bpgraph-debug-log-time">${formatTime(entry.time)}</span>
        <span class="bpgraph-debug-log-level">${this.t(logLevelLabels[level]) ?? level}</span>
        <span class="bpgraph-debug-log-message" title=${fullText}>
          ${scopeLabel
            ? html`<span class="bpgraph-debug-log-scope">${scopeLabel}</span>`
            : nothing}
          ${nodeLabel
            ? html`<span class="bpgraph-debug-log-node">${nodeLabel}</span>`
            : nothing}
          ${entry.message}
        </span>
      </li>
    `
  }

  /** Nodes may belong to subgraphs or be deleted; prefer application-supplied titles. */
  private nodeLabel(item: DebugChainItem) {
    if (item.label) return item.label
    // Search all subgraphs for titles of nodes outside the currently displayed graph.
    return this.graph.findNodeAnywhere(item.nodeId)?.title ?? item.nodeId
  }

  private readData(): Required<DebugPanelData> {
    let data: DebugPanelData | undefined
    try {
      const value = this.options()?.data
      data = typeof value === 'function' ? value() : value
    } catch {
      // Keep the panel structure on data-read failure so canvas mounting still succeeds.
      data = undefined
    }
    return {
      records: data?.records ?? [],
      logs: data?.logs ?? [],
      chain: data?.chain ?? [],
    }
  }
}

function formatTime(timestamp: number) {
  if (!Number.isFinite(timestamp)) return '--:--:--'
  const date = new Date(timestamp)
  return [date.getHours(), date.getMinutes(), date.getSeconds()]
    .map((value) => String(value).padStart(2, '0'))
    .join(':')
}

function formatDuration(startedAt: number, endedAt?: number) {
  if (endedAt === undefined || !Number.isFinite(startedAt) || !Number.isFinite(endedAt)) return ''
  const elapsed = endedAt - startedAt
  if (elapsed < 0) return ''
  if (elapsed < 1000) return `${elapsed}ms`
  if (elapsed < 60_000) return `${(elapsed / 1000).toFixed(1)}s`
  const minutes = Math.floor(elapsed / 60_000)
  const seconds = Math.round((elapsed % 60_000) / 1000)
  return `${minutes}m ${seconds}s`
}
