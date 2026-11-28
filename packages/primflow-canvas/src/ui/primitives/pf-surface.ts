import { LitElement, css, html } from 'lit'
import { TAILWIND_UTILITIES_CSS } from './tailwind.css'
import { PRIMITIVE_RESET_CSS } from './tokens'

export type PfSurfaceVariant = 'glass' | 'panel' | 'card' | 'pill' | 'menu'
export type PfSurfacePadding = 'none' | 'xs' | 'sm' | 'md'

const VARIANT_CLASSES: Record<PfSurfaceVariant, string> = {
  glass: 'rounded-(--pf-radius-md) bg-(--pf-surface-elevated) border-(--pf-border-default)',
  panel: 'rounded-(--pf-radius-lg) bg-(--pf-surface-panel) border-(--pf-border-subtle)',
  card: 'rounded-(--pf-radius-md) bg-(--pf-surface-card) border-(--pf-border-default)',
  pill: 'rounded-full bg-(--pf-surface-elevated) border-(--pf-border-default)',
  menu: 'rounded-(--pf-radius-lg) bg-(--pf-surface-panel) border-(--pf-border-default) shadow-(--pf-shadow-lg)',
}

const PADDING_CLASSES: Record<PfSurfacePadding, string> = {
  none: '',
  xs: 'p-1',
  sm: 'p-2',
  md: 'p-3',
}

/**
 * Elevated container primitive styled with compiled Tailwind CSS utilities.
 */
export class PfSurface extends LitElement {
  static override properties = {
    variant: { type: String, reflect: true },
    padding: { type: String, reflect: true },
    elevated: { type: Boolean, reflect: true },
  }

  declare variant: PfSurfaceVariant
  declare padding: PfSurfacePadding
  declare elevated: boolean

  constructor() {
    super()
    this.variant = 'glass'
    this.padding = 'none'
    this.elevated = true
  }

  static override styles = [
    PRIMITIVE_RESET_CSS,
    TAILWIND_UTILITIES_CSS,
    css`
      :host {
        display: block;
      }
      .surface {
        display: inherit;
        flex-direction: inherit;
        align-items: inherit;
        justify-content: inherit;
        gap: inherit;
        width: 100%;
        height: 100%;
        backdrop-filter: var(--pf-backdrop-blur, blur(14px) saturate(140%));
        -webkit-backdrop-filter: var(--pf-backdrop-blur, blur(14px) saturate(140%));
      }
    `,
  ]

  override render() {
    const classes = [
      'surface border border-solid text-(--pf-fg-primary) transition-colors duration-150',
      VARIANT_CLASSES[this.variant] ?? VARIANT_CLASSES.glass,
      PADDING_CLASSES[this.padding] ?? '',
      this.elevated && this.variant !== 'menu' ? 'shadow-(--pf-shadow-md)' : '',
    ]
      .filter(Boolean)
      .join(' ')
    return html`<div class=${classes} part="surface"><slot></slot></div>`
  }
}

export function registerPfSurface() {
  if (typeof customElements !== 'undefined' && !customElements.get('pf-surface')) {
    customElements.define('pf-surface', PfSurface)
  }
}
