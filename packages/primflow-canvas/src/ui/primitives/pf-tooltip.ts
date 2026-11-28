import '@shoelace-style/shoelace/dist/components/tooltip/tooltip.js'
import type SlTooltip from '@shoelace-style/shoelace/dist/components/tooltip/tooltip.js'
import { LitElement, css, html } from 'lit'
import type { FloatingPlacement } from './floating'
import { PRIMITIVE_RESET_CSS } from './tokens'

/**
 * Tooltip primitive backed by Shoelace `<sl-tooltip>`.
 *
 * Automatically hides when the trigger is clicked or pressed to prevent sticky
 * tooltips on state transitions.
 */
export class PfTooltip extends LitElement {
  static override properties = {
    content: { type: String },
    placement: { type: String },
    delay: { type: Number },
    disabled: { type: Boolean, reflect: true },
    open: { type: Boolean, reflect: true },
  }

  declare content: string
  declare placement: FloatingPlacement
  declare delay: number
  declare disabled: boolean
  declare open: boolean

  constructor() {
    super()
    this.content = ''
    this.placement = 'bottom'
    this.delay = 220
    this.disabled = false
    this.open = false
  }

  static override styles = [
    PRIMITIVE_RESET_CSS,
    css`
      :host {
        display: inline-flex;
        align-items: center;
      }
    `,
  ]

  hideImmediate = () => {
    this.open = false
    const sl = this.shadowRoot?.querySelector<SlTooltip>('sl-tooltip')
    if (sl?.open) void sl.hide()
  }

  override render() {
    const isDisabled = this.disabled || !this.content
    return html`
      <sl-tooltip
        exportparts="base, body:tooltip"
        content=${this.content}
        placement=${this.placement}
        ?disabled=${isDisabled}
        ?open=${this.open}
        hoist
        @pointerdown=${this.hideImmediate}
        @click=${this.hideImmediate}
      >
        <slot></slot>
      </sl-tooltip>
    `
  }
}

export function registerPfTooltip() {
  if (typeof customElements !== 'undefined' && !customElements.get('pf-tooltip')) {
    customElements.define('pf-tooltip', PfTooltip)
  }
}
