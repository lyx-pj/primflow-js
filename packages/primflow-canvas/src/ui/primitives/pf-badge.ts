import '@shoelace-style/shoelace/dist/components/badge/badge.js'
import type SlBadge from '@shoelace-style/shoelace/dist/components/badge/badge.js'
import { LitElement, css, html, nothing } from 'lit'
import { TAILWIND_UTILITIES_CSS } from './tailwind.css'
import { PRIMITIVE_RESET_CSS } from './tokens'

export type PfBadgeTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger'

const TONE_MAP: Record<PfBadgeTone, SlBadge['variant']> = {
  neutral: 'neutral',
  info: 'primary',
  success: 'success',
  warning: 'warning',
  danger: 'danger',
}

/**
 * Compact status pill primitive backed by Shoelace `<sl-badge>`.
 */
export class PfBadge extends LitElement {
  static override properties = {
    tone: { type: String, reflect: true },
    dot: { type: Boolean, reflect: true },
    pulse: { type: Boolean, reflect: true },
  }

  declare tone: PfBadgeTone
  declare dot: boolean
  declare pulse: boolean

  constructor() {
    super()
    this.tone = 'neutral'
    this.dot = false
    this.pulse = false
  }

  static override styles = [
    PRIMITIVE_RESET_CSS,
    TAILWIND_UTILITIES_CSS,
    css`
      :host {
        display: inline-flex;
        vertical-align: middle;
      }
      sl-badge::part(base) {
        font-size: 11px;
        line-height: 1.4;
        padding: 2px 8px;
      }
    `,
  ]

  override render() {
    return html`
      <sl-badge exportparts="base:badge" variant=${TONE_MAP[this.tone] ?? 'neutral'} pill ?pulse=${this.pulse}>
        ${this.dot ? html`<span class="mr-1.5 inline-block size-1.5 rounded-full bg-current" aria-hidden="true"></span>` : nothing}
        <slot></slot>
      </sl-badge>
    `
  }
}

export function registerPfBadge() {
  if (typeof customElements !== 'undefined' && !customElements.get('pf-badge')) {
    customElements.define('pf-badge', PfBadge)
  }
}
