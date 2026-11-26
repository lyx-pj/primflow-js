import { html, nothing, type TemplateResult } from 'lit-html'
import type { NodeInstanceType } from '../../../Graph'
import { translate, type CanvasLanguage } from '../../../ui/i18n'
import type { NodeRendererRegistration } from '../../../ui/nodeRenderers'
import type { CanvasGraph } from '../../../ui/types'
import { createContainerCardRenderer, createContainerPlaceholderRenderer } from './containerCard'

/** Format a loop timeout for the compact card chip. */
export function formatLoopTimeout(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return ''
  if (ms < 1000) return `${Math.round(ms)}ms`
  const seconds = ms / 1000
  return `${Number.isInteger(seconds) ? seconds : seconds.toFixed(1)}s`
}

export interface LoopLimitSummary {
  /** Compact text shown in the card header, such as `×3 · 1.5s`. */
  compact: string
  /** Expanded text used for the tooltip and accessible name. */
  title: string
}

/**
 * Configured limits for one loop card.
 *
 * Only explicit configuration appears on the card; an unset limit keeps the
 * node compact and leaves the engine default in the node panel.
 */
export function loopLimitSummary(
  node: NodeInstanceType,
  language: CanvasLanguage,
): LoopLimitSummary | null {
  const config = node.loop
  if (!config) return null
  const parts: string[] = []
  const titles: string[] = []
  if (typeof config.maxIterations === 'number' && config.maxIterations > 0) {
    parts.push(`×${config.maxIterations}`)
    titles.push(translate('Maximum iterations: {count}', language, { count: config.maxIterations }))
  }
  if (typeof config.timeoutMs === 'number') {
    const duration = formatLoopTimeout(config.timeoutMs)
    if (duration) {
      parts.push(duration)
      titles.push(translate('Timeout: {duration}', language, { duration }))
    }
  }
  if (parts.length === 0) return null
  return {
    compact: parts.join(' · '),
    title: titles.join(' · '),
  }
}

function loopHeaderExtra(node: NodeInstanceType, language: CanvasLanguage): TemplateResult | typeof nothing {
  const summary = loopLimitSummary(node, language)
  if (!summary) return nothing
  const label = translate('Loop limits: {text}', language, { text: summary.title })
  return html`
    <span class="bpgraph-loop-limit" title=${label} aria-label=${label}>${summary.compact}</span>
  `
}

/** Circular-arrow glyph that keeps the loop type visible after a custom title. */
const LOOP_GLYPH = html`
  <svg class="bpgraph-loop-glyph" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M20 11a8 8 0 1 0-2.35 5.65" />
    <path d="M20 4v7h-7" />
  </svg>
`

/** Built-in presentation for a loop node. */
export function createLoopCardRenderer(
  graph: CanvasGraph,
  instance: NodeInstanceType,
): NodeRendererRegistration {
  return createContainerCardRenderer(graph, instance, {
    variant: 'loop',
    expandLabel: 'Expand loop card',
    collapseLabel: 'Collapse loop card',
    icon: LOOP_GLYPH,
    headerExtra: loopHeaderExtra,
    badgeLabel: 'Loop',
  })
}

/** Placeholder rendering for a loop node inside another preview; previews never recurse. */
export function createLoopPlaceholderRenderer(
  graph: CanvasGraph,
  instance: NodeInstanceType,
): NodeRendererRegistration {
  return createContainerPlaceholderRenderer(graph, instance, {
    variant: 'loop',
    expandLabel: 'Expand loop card',
    collapseLabel: 'Collapse loop card',
    badgeLabel: 'Loop',
  })
}
