import { css } from 'lit'
import slDarkTheme from '@shoelace-style/shoelace/dist/themes/dark.styles.js'
import slLightTheme from '@shoelace-style/shoelace/dist/themes/light.styles.js'

/**
 * Semantic design tokens for Primflow Canvas UI and Shoelace themes.
 *
 * Consumers can override `--pf-*` (or legacy `--bpgraph-*` / `--sl-*`) custom
 * properties on the canvas container or `:root`, or switch themes with
 * `data-pf-theme="light"`.
 */
export const DESIGN_TOKENS_CSS = `
${slLightTheme.cssText}
${slDarkTheme.cssText}
:root,
.bpgraph-overlay,
[data-pf-theme="dark"] {
  --pf-font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --pf-font-mono: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;

  /* Surfaces */
  --pf-surface-canvas: #0b0e14;
  --pf-surface-elevated: rgba(18, 22, 31, 0.88);
  --pf-surface-panel: rgba(15, 19, 27, 0.92);
  --pf-surface-card: rgba(24, 29, 40, 0.86);
  --pf-surface-subtle: rgba(148, 163, 184, 0.08);
  --pf-surface-hover: rgba(148, 163, 184, 0.14);
  --pf-surface-active: rgba(56, 189, 248, 0.16);
  --pf-surface-input: rgba(10, 13, 19, 0.72);
  --pf-surface-tooltip: rgba(12, 15, 22, 0.96);

  /* Borders & Highlights */
  --pf-border-subtle: rgba(148, 163, 184, 0.14);
  --pf-border-default: rgba(148, 163, 184, 0.22);
  --pf-border-strong: rgba(148, 163, 184, 0.34);
  --pf-border-accent: rgba(56, 189, 248, 0.56);
  --pf-highlight-top: inset 0 1px 0 rgba(255, 255, 255, 0.06);

  /* Typography */
  --pf-fg-primary: #eef2f8;
  --pf-fg-secondary: #b6c0d0;
  --pf-fg-muted: #7f8b9e;
  --pf-fg-inverse: #0b0e14;

  /* Semantic Accents */
  --pf-accent: #38bdf8;
  --pf-accent-strong: #0ea5e9;
  --pf-accent-soft: rgba(56, 189, 248, 0.16);
  --pf-accent-ring: rgba(56, 189, 248, 0.32);

  --pf-success: #4ade80;
  --pf-success-soft: rgba(74, 222, 128, 0.16);
  --pf-warning: #fbbf24;
  --pf-warning-soft: rgba(251, 191, 36, 0.16);
  --pf-danger: #f87171;
  --pf-danger-soft: rgba(248, 113, 113, 0.16);

  /* Geometry & Depth */
  --pf-radius-xs: 5px;
  --pf-radius-sm: 7px;
  --pf-radius-md: 10px;
  --pf-radius-lg: 14px;
  --pf-radius-pill: 999px;
  --pf-backdrop-blur: blur(14px) saturate(140%);
  --pf-shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.28);
  --pf-shadow-md: 0 8px 24px rgba(0, 0, 0, 0.4), 0 2px 6px rgba(0, 0, 0, 0.24);
  --pf-shadow-lg: 0 16px 44px rgba(0, 0, 0, 0.52), 0 4px 12px rgba(0, 0, 0, 0.32);

  /* Motion */
  --pf-ease: cubic-bezier(0.2, 0.8, 0.2, 1);
  --pf-duration-fast: 120ms;
  --pf-duration-normal: 180ms;

  /* Legacy --bpgraph-* aliases kept for external overrides */
  --bpgraph-menu-bg: var(--pf-surface-panel);
  --bpgraph-menu-fg: var(--pf-fg-primary);
  --bpgraph-menu-muted: var(--pf-fg-muted);
  --bpgraph-menu-border: var(--pf-border-default);
  --bpgraph-menu-hover: var(--pf-surface-hover);
  --bpgraph-menu-accent: var(--pf-accent);
  --bpgraph-menu-danger: var(--pf-danger);
  --bpgraph-tooltip-bg: var(--pf-surface-tooltip);
  --bpgraph-toolbar-bg: var(--pf-surface-elevated);
  --bpgraph-toolbar-border: var(--pf-border-default);
  --bpgraph-toolbar-hover: var(--pf-surface-hover);
  --bpgraph-panel-bg: var(--pf-surface-panel);
  --bpgraph-panel-fg: var(--pf-fg-primary);
  --bpgraph-panel-muted: var(--pf-fg-muted);
  --bpgraph-panel-border: var(--pf-border-subtle);
  --bpgraph-panel-input-bg: var(--pf-surface-input);
  --bpgraph-panel-accent: var(--pf-accent);
  --bpgraph-panel-danger: var(--pf-danger);
  --bpgraph-minimap-bg: var(--pf-surface-elevated);
  --bpgraph-minimap-border: var(--pf-border-default);
  --bpgraph-minimap-link: rgba(148, 163, 184, 0.52);
  --bpgraph-replay-bg: var(--pf-surface-elevated);
  --bpgraph-replay-fg: var(--pf-fg-primary);
  --bpgraph-replay-muted: var(--pf-fg-secondary);
  --bpgraph-replay-border: var(--pf-border-default);
  --bpgraph-replay-dot: var(--pf-accent);

  /* Shoelace theme alignment */
  --sl-font-sans: var(--pf-font-sans);
  --sl-font-mono: var(--pf-font-mono);
  --sl-color-primary-500: var(--pf-accent-strong);
  --sl-color-primary-600: var(--pf-accent);
  --sl-color-primary-700: var(--pf-accent-strong);
  --sl-focus-ring-color: var(--pf-accent-ring);
  --sl-input-background-color: var(--pf-surface-input);
  --sl-input-border-color: var(--pf-border-default);
  --sl-input-border-color-hover: var(--pf-border-strong);
  --sl-input-border-color-focus: var(--pf-accent);
  --sl-input-color: var(--pf-fg-primary);
  --sl-tooltip-background-color: var(--pf-surface-tooltip);
  --sl-tooltip-color: var(--pf-fg-primary);
  --sl-tooltip-border-radius: var(--pf-radius-xs);
  --sl-tooltip-font-size: 11px;
  --sl-tooltip-padding: 5px 9px;
}

[data-pf-theme="light"],
[data-pf-theme="light"] .bpgraph-overlay {
  --pf-surface-canvas: #f4f6fa;
  --pf-surface-elevated: rgba(255, 255, 255, 0.88);
  --pf-surface-panel: rgba(255, 255, 255, 0.94);
  --pf-surface-card: rgba(248, 250, 252, 0.95);
  --pf-surface-subtle: rgba(15, 23, 42, 0.05);
  --pf-surface-hover: rgba(15, 23, 42, 0.08);
  --pf-surface-active: rgba(2, 132, 199, 0.12);
  --pf-surface-input: rgba(241, 245, 249, 0.88);
  --pf-surface-tooltip: rgba(15, 23, 42, 0.94);

  --pf-border-subtle: rgba(15, 23, 42, 0.1);
  --pf-border-default: rgba(15, 23, 42, 0.16);
  --pf-border-strong: rgba(15, 23, 42, 0.28);
  --pf-border-accent: rgba(2, 132, 199, 0.5);
  --pf-highlight-top: inset 0 1px 0 rgba(255, 255, 255, 0.8);

  --pf-fg-primary: #0f172a;
  --pf-fg-secondary: #334155;
  --pf-fg-muted: #64748b;
  --pf-fg-inverse: #ffffff;

  --pf-accent: #0284c7;
  --pf-accent-strong: #0369a1;
  --pf-accent-soft: rgba(2, 132, 199, 0.12);
  --pf-accent-ring: rgba(2, 132, 199, 0.28);

  --pf-shadow-sm: 0 2px 8px rgba(15, 23, 42, 0.08);
  --pf-shadow-md: 0 8px 24px rgba(15, 23, 42, 0.12), 0 2px 6px rgba(15, 23, 42, 0.06);
  --pf-shadow-lg: 0 16px 44px rgba(15, 23, 42, 0.16), 0 4px 12px rgba(15, 23, 42, 0.08);
}
`

/** Shared Shadow DOM base rules for Lit primitives. */
export const PRIMITIVE_RESET_CSS = css`
  :host {
    box-sizing: border-box;
    font-family: var(--pf-font-sans, system-ui, -apple-system, 'Segoe UI', sans-serif);
    color: var(--pf-fg-primary, #eef2f8);
    -webkit-font-smoothing: antialiased;
  }
  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }
  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      transition-duration: 0.01ms !important;
      animation-duration: 0.01ms !important;
    }
  }
`
