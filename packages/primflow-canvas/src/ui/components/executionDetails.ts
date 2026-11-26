import { html, nothing } from 'lit-html'
import type { NodeExecutionStatus } from '@lyx-pj/primflow-model'
import { formatExecutionValue } from '../executionFormat'
import { translate, type CanvasLanguage } from '../i18n'
import { nodeExecutionLabels } from '../nodeExecution'
import type { NodeExecutionData } from '../types'

type ExecutionStatus = NodeExecutionStatus | 'paused'

export function executionStatus(status: ExecutionStatus, language?: CanvasLanguage) {
  const label = translate(nodeExecutionLabels[status], language)
  return html`<span class=${`bpgraph-execution-badge bpgraph-execution-status is-${status}`}>${label}</span>`
}

export function executionAttempt(
  attempt: NonNullable<NodeExecutionData['attempt']>, status: ExecutionStatus, language?: CanvasLanguage,
) {
  const retries = attempt.number - 1
  const failure = attempt.failure ?? attempt.previousFailure
  const showRemaining = (status === 'running' || status === 'paused') &&
    attempt.remainingRetries > 0 && (retries > 0 || !!failure)
  const exhausted = status === 'failed' && retries > 0 && attempt.remainingRetries === 0
  if (!retries && !failure) return nothing
  return html`
    <section class="bpgraph-node-preview-section bpgraph-execution-attempt">
      ${retries || showRemaining ? html`<div class="bpgraph-execution-badges">
        ${retries > 0 ? html`<span class="bpgraph-execution-badge is-retry">
          ${translate(retries === 1 ? 'Retried once' : 'Retried {count} times', language, { count: retries })}
        </span>` : nothing}
        ${showRemaining ? html`<span class="bpgraph-execution-badge">
          ${translate('Remaining retries: {count}', language, { count: attempt.remainingRetries })}
        </span>` : nothing}
        ${exhausted ? html`<span class="bpgraph-execution-badge is-failed">
          ${translate('Retry limit reached', language)}
        </span>` : nothing}
      </div>` : nothing}
      ${failure ? html`
        <div class="bpgraph-execution-error">
          <div class="bpgraph-execution-error-heading">
            ${attempt.failure ? nothing : html`<span>${translate('Retry reason', language)}</span>`}
            <code>${failure.code}</code>
          </div>
          <div>${failure.message}</div>
        </div>
      ` : nothing}
    </section>
  `
}

export function executionPorts(label: string, values: Record<string, unknown>, language?: CanvasLanguage) {
  const entries = Object.entries(values)
  return html`
    <section class="bpgraph-node-preview-section">
      <h4>${translate(label, language)}</h4>
      ${entries.length ? html`<dl>
        ${entries.map(([name, value]) => html`
          <div><dt>${name}</dt><dd><pre>${formatExecutionValue(value, language)}</pre></dd></div>
        `)}
      </dl>` : html`<p class="bpgraph-node-preview-empty">${translate('No data ports', language)}</p>`}
    </section>
  `
}
