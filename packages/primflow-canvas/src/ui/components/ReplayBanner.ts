import type { CanvasLanguage } from '../i18n'
import { html, nothing } from 'lit-html'
import { OverlayComponent } from '../OverlayComponent'
import type { OverlayLayer } from '../OverlayLayer'

/** Banner shown while replaying historical execution. */
export class ReplayBanner extends OverlayComponent {
  private visible = false
  private label = ''
  private readonly onExit: () => void

  refreshLanguage() {
    this.render()
  }

  constructor(overlay: OverlayLayer, onExit: () => void, language?: () => CanvasLanguage | undefined) {
    super(overlay, 'bpgraph-replay-layer', language)
    this.onExit = onExit
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
    this.commit(nothing)
  }

  private render() {
    if (!this.visible) {
      this.commit(nothing)
      return
    }
    this.commit(html`
      <div class="bpgraph-replay-banner" role="status">
        <span class="bpgraph-replay-dot" aria-hidden="true"></span>
        <span class="bpgraph-replay-mode">${this.t('Replay mode')}</span>
        ${this.label ? html`<span class="bpgraph-replay-label" title=${this.label}>${this.label}</span>` : nothing}
        <button type="button" class="bpgraph-replay-exit" @click=${this.onExit}>${this.t('Exit replay')}</button>
      </div>
    `)
  }
}
