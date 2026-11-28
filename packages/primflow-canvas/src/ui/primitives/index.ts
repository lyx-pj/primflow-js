import { registerPfBadge } from './pf-badge'
import { registerPfButton } from './pf-button'
import { registerPfDivider } from './pf-divider'
import { registerPfField } from './pf-field'
import { registerPfSurface } from './pf-surface'
import { registerPfSwitch } from './pf-switch'
import { registerPfTooltip } from './pf-tooltip'

let registered = false

/** Idempotently register all built-in Lit Web Component UI primitives. */
export function registerPrimitives() {
  if (registered) return
  registered = true
  registerPfSurface()
  registerPfButton()
  registerPfTooltip()
  registerPfSwitch()
  registerPfBadge()
  registerPfDivider()
  registerPfField()
}

export { DESIGN_TOKENS_CSS, PRIMITIVE_RESET_CSS } from './tokens'
export {
  applyFloatingPosition,
  createVirtualPoint,
  trackFloatingElement,
  type FloatingCleanup,
  type FloatingPlacement,
  type FloatingPositionOptions,
} from './floating'
export { PfSurface, type PfSurfacePadding, type PfSurfaceVariant } from './pf-surface'
export { PfButton, type PfButtonSize, type PfButtonVariant } from './pf-button'
export { PfTooltip } from './pf-tooltip'
export { PfSwitch, type PfSwitchSize } from './pf-switch'
export { PfBadge, type PfBadgeTone } from './pf-badge'
export { PfDivider } from './pf-divider'
export { PfField, type PfFieldSize } from './pf-field'
