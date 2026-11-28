import type { NodeInstanceType, PanelSection } from '@lyx-pj/primflow-canvas'
import { createReactMount } from '@lyx-pj/primflow-react'
import { localize } from '../i18n'

/**
 * Panel sections for the custom card demo node.
 *
 * Other nodes return nothing, so they keep the default sections. `CustomCard`
 * shows all three section controls at once: it inserts its own hint first,
 * moves Inputs above the metadata block, and drops the built-in outputs,
 * description, retry, and execution blocks.
 */
export function demoPanelSections(node: NodeInstanceType): PanelSection[] | void {
  if (node.definitionId !== 'CustomCard') return undefined
  return [
    {
      id: 'demoHint',
      mount: createReactMount(() => (
        <div className="bpgraph-node-panel-section">
          <p className="bpgraph-node-panel-description">
            {localize(
              'This node draws its own body. Edit the label here and watch the card update.',
              '这个节点自己绘制节点主体。在这里修改标题，卡片会同步更新。'
            )}
          </p>
        </div>
      )),
    },
    'inputs',
    'meta',
  ]
}
