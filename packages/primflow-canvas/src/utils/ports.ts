import type { InputPort, OutputPort } from '@lyx-pj/primflow-model'

export type PortDirection = 'in' | 'out'

/**
 * Whether a port is drawn as an interactive magnet.
 *
 * Select editors hide their port unless the definition explicitly shows it.
 * The palette uses the same rule so automatic connection never targets a port
 * the user cannot see or drag.
 */
export function isPortVisible(port: InputPort | OutputPort, direction: PortDirection): boolean {
  if (port.showPort === false) return false
  if (direction === 'in' && 'editor' in port && port.editor === 'select' && port.showPort !== true) return false
  return true
}
