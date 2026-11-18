import { translate, type CanvasLanguage } from './i18n'
import { nothing, render, type TemplateResult } from 'lit-html'
import type { OverlayLayer } from './OverlayLayer'

/**
 * Base class for canvas UI components.
 *
 * Each component owns a layer for independent rendering and disposal.
 * `CanvasUI` only orchestrates components and routes events.
 */
export abstract class OverlayComponent {
  protected readonly overlay: OverlayLayer
  protected readonly host: HTMLElement
  private readonly language: () => CanvasLanguage | undefined

  constructor(overlay: OverlayLayer, className: string, language: () => CanvasLanguage | undefined = () => undefined) {
    this.overlay = overlay
    this.host = overlay.createHost(className)
    this.language = language
  }

  protected t(message: string, values?: Record<string, string | number>) {
    return translate(message, this.language(), values)
  }

  protected commit(template: TemplateResult | typeof nothing) {
    render(template, this.host)
  }

  destroy() {
    this.commit(nothing)
    this.host.remove()
  }
}
