import { html } from '@lyx-pj/primflow-canvas'
import type { NodeInstanceType, PanelSection } from '@lyx-pj/primflow-canvas'
import { localize } from '../i18n'

/**
 * Panel sections for the demo node.
 *
 * Other nodes return nothing, so they keep the default sections. The demo node
 * shows all three section controls at once: it inserts its own hint first,
 * moves Inputs above the metadata block, and drops the built-in outputs,
 * description, retry, and execution blocks.
 */
export function demoPanelSections(node: NodeInstanceType): PanelSection[] | void {
  if (node.definitionId !== 'DemoCard') return undefined
  return [
    {
      id: 'demoHint',
      render: () => html`
        <div class="bpgraph-node-panel-section">
          <p class="bpgraph-node-panel-description">
            ${localize(
              'This node draws its own body. Edit the caption here and watch the card update.',
              '这个节点自己绘制节点主体。在这里修改标题文字，卡片会同步更新。'
            )}
          </p>
        </div>
      `,
    },
    'inputs',
    'meta',
  ]
}
