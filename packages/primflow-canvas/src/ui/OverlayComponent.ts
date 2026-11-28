import { translate, type CanvasLanguage } from './i18n'
import { nothing, render, type TemplateResult } from 'lit-html'
import type { OverlayLayer } from './OverlayLayer'
import { SlotHost, type CanvasUISlot } from './slots'

/**
 * Base class for canvas UI components.
 *
 * Each component owns a layer for independent rendering and disposal, plus an
 * optional external slot host so applications can replace any control cleanly.
 * `CanvasUI` only orchestrates components and routes events.
 */
export abstract class OverlayComponent {
  protected readonly overlay: OverlayLayer
  protected readonly host: HTMLElement
  private readonly language: () => CanvasLanguage | undefined
  private slotHost: SlotHost<unknown> | null = null

  constructor(overlay: OverlayLayer, className: string, language: () => CanvasLanguage | undefined = () => undefined) {
    this.overlay = overlay
    this.host = overlay.createHost(className)
    this.language = language
  }

  protected currentLanguage(): CanvasLanguage | undefined {
    return this.language()
  }

  protected t = (message: string, values?: Record<string, string | number>) => {
    return translate(message, this.language(), values)
  }

  /**
   * Synchronize an optional external replacement slot.
   * Returns `true` if the external slot took ownership (disabled or custom UI).
   */
  protected syncSlot<TCtx>(slot: CanvasUISlot<TCtx> | undefined, context: TCtx): boolean {
    if (slot === undefined && !this.slotHost) return false
    if (!this.slotHost) this.slotHost = new SlotHost<unknown>(this.host)
    return (this.slotHost as SlotHost<TCtx>).sync(slot, context)
  }

  protected commit(template: TemplateResult | typeof nothing) {
    render(template, this.host)
  }

  destroy() {
    this.slotHost?.dispose()
    this.slotHost = null
    this.commit(nothing)
    this.host.remove()
  }
}
