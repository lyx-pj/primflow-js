import '@shoelace-style/shoelace/dist/components/button/button.js'
import type SlButton from '@shoelace-style/shoelace/dist/components/button/button.js'
import { LitElement, css, html } from 'lit'
import { ifDefined } from 'lit/directives/if-defined.js'
import { PRIMITIVE_RESET_CSS } from './tokens'

export type PfButtonVariant = 'ghost' | 'subtle' | 'primary' | 'danger'
export type PfButtonSize = 'xs' | 'sm' | 'md'

const VARIANT_MAP: Record<PfButtonVariant, SlButton['variant']> = {
  ghost: 'text',
  subtle: 'default',
  primary: 'primary',
  danger: 'danger',
}

/**
 * Action button primitive backed by Shoelace `<sl-button>`.
 */
export class PfButton extends LitElement {
  static override properties = {
    variant: { type: String, reflect: true },
    size: { type: String, reflect: true },
    iconOnly: { type: Boolean, attribute: 'icon-only', reflect: true },
    pill: { type: Boolean, reflect: true },
    pressed: { type: Boolean, reflect: true },
    disabled: { type: Boolean, reflect: true },
    label: { type: String },
  }

  declare variant: PfButtonVariant
  declare size: PfButtonSize
  declare iconOnly: boolean
  declare pill: boolean
  declare pressed: boolean
  declare disabled: boolean
  declare label: string

  constructor() {
    super()
    this.variant = 'ghost'
    this.size = 'sm'
    this.iconOnly = false
    this.pill = false
    this.pressed = false
    this.disabled = false
    this.label = ''
  }

  static override styles = [
    PRIMITIVE_RESET_CSS,
    css`
      :host {
        display: inline-flex;
        vertical-align: middle;
      }
      :host([size='xs']) sl-button::part(base) {
        min-height: 24px;
        line-height: 22px;
        font-size: 11px;
        padding: 0 8px;
      }
    `,
  ]

  override focus(options?: FocusOptions) {
    this.shadowRoot?.querySelector<SlButton>('sl-button')?.focus(options)
  }

  private onClick = (event: MouseEvent) => {
    if (this.disabled) {
      event.preventDefault()
      event.stopImmediatePropagation()
    }
  }

  override render() {
    const ariaLabel = this.label || this.getAttribute('aria-label') || undefined
    return html`
      <sl-button
        exportparts="base:button"
        variant=${VARIANT_MAP[this.variant] ?? 'text'}
        size=${this.size === 'md' ? 'medium' : 'small'}
        ?pill=${this.pill}
        ?circle=${this.iconOnly && this.pill}
        ?outline=${this.pressed}
        ?disabled=${this.disabled}
        aria-label=${ifDefined(ariaLabel)}
        aria-pressed=${ifDefined(this.hasAttribute('pressed') ? String(this.pressed) : undefined)}
        @click=${this.onClick}
      >
        <slot></slot>
      </sl-button>
    `
  }
}

export function registerPfButton() {
  if (typeof customElements !== 'undefined' && !customElements.get('pf-button')) {
    customElements.define('pf-button', PfButton)
  }
}
