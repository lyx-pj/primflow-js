import { LitElement, css, html } from 'lit'
import { TAILWIND_UTILITIES_CSS } from './tailwind.css'
import { PRIMITIVE_RESET_CSS } from './tokens'

export type PfFieldSize = 'xs' | 'sm' | 'md'

const SIZE_CLASSES: Record<PfFieldSize, string> = {
  xs: 'h-[22px] px-1.5 gap-1 rounded-(--pf-radius-xs) text-xs',
  sm: 'h-[30px] px-2.5 gap-2 rounded-(--pf-radius-sm) text-[12.5px]',
  md: 'h-9 px-3 gap-2 rounded-(--pf-radius-md) text-[12.5px]',
}

/**
 * Styled input shell wrapping a slotted input/textarea/select control using
 * compiled Tailwind CSS utilities.
 *
 * Keeping the native input in light DOM preserves direct focus, selection,
 * keyboard shortcuts, and test queries while Shadow DOM owns visual chrome,
 * prefix/suffix slots, and focus rings.
 */
export class PfField extends LitElement {
  static override properties = {
    size: { type: String, reflect: true },
    multiline: { type: Boolean, reflect: true },
    invalid: { type: Boolean, reflect: true },
  }

  declare size: PfFieldSize
  declare multiline: boolean
  declare invalid: boolean

  constructor() {
    super()
    this.size = 'sm'
    this.multiline = false
    this.invalid = false
  }

  static override styles = [
    PRIMITIVE_RESET_CSS,
    TAILWIND_UTILITIES_CSS,
    css`
      :host {
        display: block;
        flex-shrink: 0;
        width: 100%;
        min-width: 0;
      }
      ::slotted([slot='prefix']),
      ::slotted([slot='suffix']) {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex: none;
        color: var(--pf-fg-muted, #7f8b9e);
      }
      ::slotted(input),
      ::slotted(textarea),
      ::slotted(select) {
        width: 100%;
        min-width: 0;
        flex: 1 1 auto;
        border: none !important;
        outline: none !important;
        background: transparent !important;
        color: var(--pf-fg-primary, #eef2f8) !important;
        font: inherit;
        font-size: inherit;
        padding: 0 !important;
        margin: 0 !important;
      }
      ::slotted(select) {
        appearance: none !important;
        -webkit-appearance: none !important;
        cursor: pointer;
      }
    `,
  ]

  override render() {
    const classes = [
      'field flex w-full min-w-0 border border-solid bg-(--pf-surface-input) transition-colors duration-150',
      this.multiline
        ? 'h-auto items-stretch py-1.5 px-2.5 gap-2 rounded-(--pf-radius-sm) text-[12.5px]'
        : `items-center ${SIZE_CLASSES[this.size] ?? SIZE_CLASSES.sm}`,
      this.invalid
        ? 'border-(--pf-danger) focus-within:ring-2 focus-within:ring-(--pf-danger-soft)'
        : 'border-(--pf-border-default) hover:border-(--pf-border-strong) focus-within:border-(--pf-accent) focus-within:ring-2 focus-within:ring-(--pf-accent-ring)',
    ].join(' ')
    return html`
      <div class=${classes} part="field">
        <slot name="prefix"></slot>
        <slot></slot>
        <slot name="suffix"></slot>
      </div>
    `
  }
}

export function registerPfField() {
  if (typeof customElements !== 'undefined' && !customElements.get('pf-field')) {
    customElements.define('pf-field', PfField)
  }
}
