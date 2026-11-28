import '@shoelace-style/shoelace/dist/components/switch/switch.js'
import type SlSwitch from '@shoelace-style/shoelace/dist/components/switch/switch.js'
import { LitElement, css, html, nothing } from 'lit'
import { TAILWIND_UTILITIES_CSS } from './tailwind.css'
import { PRIMITIVE_RESET_CSS } from './tokens'

export type PfSwitchSize = 'sm' | 'md'

/**
 * Toggle switch primitive backed by Shoelace `<sl-switch>`.
 *
 * Supports standalone usage (`checked` + `change` event) or wrapping a slotted
 * `<input type="checkbox">` so existing DOM/form queries and accessibility
 * hooks keep working while `<sl-switch>` renders and handles interactions.
 */
export class PfSwitch extends LitElement {
  static override properties = {
    checked: { type: Boolean, reflect: true },
    disabled: { type: Boolean, reflect: true },
    size: { type: String, reflect: true },
    label: { type: String },
  }

  declare checked: boolean
  declare disabled: boolean
  declare size: PfSwitchSize
  declare label: string

  constructor() {
    super()
    this.checked = false
    this.disabled = false
    this.size = 'md'
    this.label = ''
  }

  static override styles = [
    PRIMITIVE_RESET_CSS,
    TAILWIND_UTILITIES_CSS,
    css`
      :host {
        display: inline-flex;
        align-items: center;
        vertical-align: middle;
      }
      sl-switch {
        display: inline-flex;
        align-items: center;
        line-height: 1;
        --width: 32px;
        --height: 18px;
        --thumb-size: 14px;
      }
      sl-switch::part(base) {
        align-items: center;
      }
      :host([size='sm']) sl-switch {
        --width: 28px;
        --height: 16px;
        --thumb-size: 12px;
      }
      ::slotted(input[type='checkbox']) {
        opacity: 0 !important;
        appearance: none !important;
        -webkit-appearance: none !important;
        pointer-events: none !important;
      }
    `,
  ]

  override connectedCallback() {
    super.connectedCallback()
    this.addEventListener('change', this.onSlottedChange)
  }

  override disconnectedCallback() {
    this.removeEventListener('change', this.onSlottedChange)
    super.disconnectedCallback()
  }

  private slottedInput(): HTMLInputElement | null {
    return this.querySelector('input[type="checkbox"]')
  }

  private onSlottedChange = (event: Event) => {
    const input = this.slottedInput()
    if (!input || event.target !== input) return
    if (this.checked !== input.checked) {
      this.checked = input.checked
    }
  }

  private onSlChange = (event: Event) => {
    event.stopPropagation()
    const target = event.currentTarget as SlSwitch
    const next = Boolean(target.checked)
    this.checked = next
    const input = this.slottedInput()
    if (input) {
      input.checked = next
      input.dispatchEvent(new Event('change', { bubbles: true }))
      return
    }
    this.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
  }

  override render() {
    const slotted = this.slottedInput()
    const ariaLabel = this.label || slotted?.getAttribute('aria-label') || ''
    return html`
      <sl-switch
        exportparts="base, control:track, thumb, label"
        size=${this.size === 'sm' ? 'small' : 'medium'}
        ?checked=${this.checked}
        ?disabled=${this.disabled}
        aria-label=${ariaLabel}
        @sl-change=${this.onSlChange}
      >
        ${this.label || nothing}
      </sl-switch>
      <span class="sr-only"><slot></slot></span>
    `
  }
}

export function registerPfSwitch() {
  if (typeof customElements !== 'undefined' && !customElements.get('pf-switch')) {
    customElements.define('pf-switch', PfSwitch)
  }
}
