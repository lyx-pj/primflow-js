import '@shoelace-style/shoelace/dist/components/divider/divider.js'
import { LitElement, css, html } from 'lit'
import { PRIMITIVE_RESET_CSS } from './tokens'

/**
 * Hairline separator backed by Shoelace `<sl-divider>`.
 */
export class PfDivider extends LitElement {
  static override properties = {
    vertical: { type: Boolean, reflect: true },
  }

  declare vertical: boolean

  constructor() {
    super()
    this.vertical = false
  }

  static override styles = [
    PRIMITIVE_RESET_CSS,
    css`
      :host {
        display: block;
        width: 100%;
      }
      :host([vertical]) {
        display: inline-flex;
        width: auto;
        height: 18px;
        align-self: center;
      }
      sl-divider {
        --color: var(--pf-border-subtle, rgba(148, 163, 184, 0.16));
        --spacing: 4px;
      }
      :host([vertical]) sl-divider {
        --spacing: 3px;
        height: 100%;
      }
    `,
  ]

  override render() {
    return html`<sl-divider ?vertical=${this.vertical}></sl-divider>`
  }
}

export function registerPfDivider() {
  if (typeof customElements !== 'undefined' && !customElements.get('pf-divider')) {
    customElements.define('pf-divider', PfDivider)
  }
}
