/**
 * Shared header color tokens for example workflow nodes.
 *
 * Each category uses a distinct vibrant accent with high contrast for white
 * header text on the dark canvas (`#0b0e14`).
 */
export const NODE_COLORS = {
  inputs: '#2563eb',
  files: '#0d9488',
  variables: '#475569',
  text: '#7c3aed',
  math: '#d97706',
  flow: '#059669',
  error: '#dc2626',
  events: '#db2777',
  network: '#0284c7',
  debug: '#4f46e5',
  custom: '#334155',
} as const

export type NodeColorKey = keyof typeof NODE_COLORS

export function headerStyle(color: NodeColorKey) {
  return {
    header: { background: NODE_COLORS[color], color: '#ffffff' },
  } as const
}
