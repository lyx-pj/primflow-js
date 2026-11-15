import { html } from 'lit-html'
import type { CanvasExecutionStatus } from '../types'
import { OverlayComponent } from '../OverlayComponent'
import type { OverlayLayer } from '../OverlayLayer'

/** Viewport-edge decorations excluded from canvas zoom and pointer hit testing. */
export class ExecutionEffects extends OverlayComponent {
  constructor(overlay: OverlayLayer) {
    super(overlay, 'bpgraph-execution-layer')
  }

  refresh(status: CanvasExecutionStatus) {
    this.commit(html`
      <div class="bpgraph-execution-aura is-${status}" aria-hidden="true">
        <span class="bpgraph-execution-fog is-top"></span>
        <span class="bpgraph-execution-fog is-right"></span>
        <span class="bpgraph-execution-fog is-bottom"></span>
        <span class="bpgraph-execution-fog is-left"></span>
      </div>
    `)
  }
}
