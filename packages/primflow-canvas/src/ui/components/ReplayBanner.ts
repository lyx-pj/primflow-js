import type { CanvasLanguage } from '../i18n'
import { html, nothing } from 'lit-html'
import { OverlayComponent } from '../OverlayComponent'
import type { OverlayLayer } from '../OverlayLayer'
import type { CanvasGraph, ReplayBannerSlotContext } from '../types'

/** Banner shown while replaying historical execution. */
export class ReplayBanner extends OverlayComponent {
  private visible = false
  private label = ''
  private readonly onExit: () => void
  private readonly graph?: CanvasGraph

  refreshLanguage() {
    this.render()
  }

  refresh() {
    this.render()
  }

  constructor(
    overlay: OverlayLayer,
    onExit: () => void,
    language?: () => CanvasLanguage | undefined,
    graph?: CanvasGraph
  ) {
    super(overlay, 'bpgraph-replay-layer', language)
    this.onExit = onExit
    this.graph = graph
  }

  show(label: string) {
    this.visible = true
    this.label = label
    this.render()
  }

  hide() {
    if (!this.visible) return
    this.visible = false
    this.label = ''
    this.render()
  }

  private render() {
    const slot = this.graph?.options.ui?.replayBanner
    if (this.graph && slot !== undefined) {
      const context: ReplayBannerSlotContext = {
        graph: this.graph,
        language: this.currentLanguage(),
        t: this.t,
        visible: this.visible,
        label: this.label,
        exitReplay: this.onExit,
      }
      if (this.syncSlot(slot, context)) return
    } else if (this.graph) {
      this.syncSlot(undefined, {
        graph: this.graph,
        language: this.currentLanguage(),
        t: this.t,
        visible: this.visible,
        label: this.label,
        exitReplay: this.onExit,
      })
    }

    if (!this.visible) {
      this.commit(nothing)
      return
    }
    this.commit(html`
      <pf-surface variant="pill" elevated class="bpgraph-replay-banner" role="status">
        <span class="bpgraph-replay-dot" aria-hidden="true"></span>
        <span class="bpgraph-replay-mode">${this.t('Replay mode')}</span>
        ${this.label ? html`<span class="bpgraph-replay-label" title=${this.label}>${this.label}</span>` : nothing}
        <button type="button" class="bpgraph-replay-exit" @click=${this.onExit}>${this.t('Exit replay')}</button>
      </pf-surface>
    `)
  }
}
