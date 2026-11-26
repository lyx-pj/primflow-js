const STYLE_ID = 'bpgraph-ui-styles'

/**
 * Default styles for canvas UI.
 *
 * Consumers can override these internal classes or
 * `--bpgraph-*` variables without importing a separate stylesheet.
 */
const STYLES = `
[data-node-execution-status] {
  opacity: 1;
  filter: none;
  transition: opacity 180ms ease;
}
[data-node-execution-status="completed"] {
  opacity: 0.7;
}
[data-node-execution-status="completed"]:hover {
  opacity: 1;
}
[data-execution-status="running"] [data-node-execution-status="idle"],
[data-execution-status="paused"] [data-node-execution-status="idle"] {
  opacity: 0.45;
  filter: grayscale(1);
}

[data-replay="true"] .bpgraph-port-field,
[data-replay="true"] .bpgraph-port-step,
[data-replay="true"] .bpgraph-port-checkbox {
  pointer-events: none;
  opacity: 0.85;
}
[data-replay="true"] .bpgraph-node-tools-view {
  display: none;
}
.bpgraph-node-execution-halo {
  opacity: 0.45;
  filter: blur(12px);
  transform-box: fill-box;
  transform-origin: center;
}
.bpgraph-node-execution.is-running .bpgraph-node-execution-halo {
  animation: bpgraph-node-glow 1.8s ease-in-out infinite;
}
.bpgraph-node-execution.is-completed .bpgraph-node-execution-halo {
  opacity: 0.45;
}
.bpgraph-node-execution.is-failed .bpgraph-node-execution-halo {
  opacity: 0.7;
}
.bpgraph-node-execution.is-cancelled .bpgraph-node-execution-halo {
  opacity: 0.52;
}
.bpgraph-node-execution.is-skipped .bpgraph-node-execution-halo {
  opacity: 0.3;
  filter: blur(8px);
}
.bpgraph-node-execution.is-interrupted .bpgraph-node-execution-halo {
  animation: bpgraph-node-glow 2.8s ease-in-out infinite;
}
[data-node-execution-status="completed"]:hover .bpgraph-node-execution-halo {
  opacity: 0.7;
}
[data-execution-status="paused"] .bpgraph-node-execution * {
  animation-play-state: paused;
}
@keyframes bpgraph-node-glow {
  0%, 100% { opacity: 0.22; transform: scale(0.99); }
  50% { opacity: 0.55; transform: scale(1.025); }
}
.bpgraph-execution-layer {
  z-index: 0;
  overflow: hidden;
  border-radius: inherit;
}
.bpgraph-execution-aura {
  --bpgraph-execution-color: 56 189 248;
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0;
  transition: opacity 400ms ease;
  box-shadow: inset 0 0 24px rgb(var(--bpgraph-execution-color) / 0.12);
}
.bpgraph-execution-aura.is-running,
.bpgraph-execution-aura.is-paused {
  opacity: 1;
}
.bpgraph-execution-aura.is-paused {
  --bpgraph-execution-color: 251 191 36;
}
.bpgraph-execution-fog {
  position: absolute;
  pointer-events: none;
  background: radial-gradient(ellipse at 50% 0%,
    rgb(var(--bpgraph-execution-color) / 0.22),
    rgb(var(--bpgraph-execution-color) / 0.07) 45%, transparent 75%);
  opacity: 0.7;
}
.bpgraph-execution-fog.is-top,
.bpgraph-execution-fog.is-bottom {
  left: -10%;
  width: 120%;
  height: clamp(32px, 7vh, 80px);
}
.bpgraph-execution-fog.is-top { top: 0; }
.bpgraph-execution-fog.is-bottom {
  bottom: 0;
  rotate: 180deg;
  animation-delay: -2s;
}
.bpgraph-execution-fog.is-left,
.bpgraph-execution-fog.is-right {
  top: -10%;
  height: 120%;
  width: clamp(28px, 5vw, 72px);
  background: radial-gradient(ellipse at 0% 50%,
    rgb(var(--bpgraph-execution-color) / 0.2),
    rgb(var(--bpgraph-execution-color) / 0.06) 45%, transparent 75%);
}
.bpgraph-execution-fog.is-left { left: 0; animation-delay: -1s; }
.bpgraph-execution-fog.is-right { right: 0; rotate: 180deg; animation-delay: -3s; }
.bpgraph-execution-aura.is-running .bpgraph-execution-fog {
  animation-name: bpgraph-canvas-fog;
  animation-duration: 5s;
  animation-timing-function: ease-in-out;
  animation-iteration-count: infinite;
  animation-direction: alternate;
}
@keyframes bpgraph-canvas-fog {
  from { opacity: 0.5; transform: scale(1); }
  to { opacity: 1; transform: scale(1.08); }
}
@media (prefers-reduced-motion: reduce) {
  .bpgraph-node-execution *,
  .bpgraph-execution-aura.is-running .bpgraph-execution-fog {
    animation: none;
  }
  .bpgraph-execution-aura,
  [data-node-execution-status] { transition: none; }
}
.bpgraph-overlay {
  --bpgraph-ui-gap: 8px;
  position: absolute;
  inset: 0;
  z-index: 30;
  pointer-events: none;
}
.bpgraph-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.bpgraph-panel-layer,
.bpgraph-debug-panel-layer {
  z-index: 1;
}
.bpgraph-palette-layer,
.bpgraph-context-layer {
  z-index: 2;
}
.bpgraph-palette-layer.is-connection-modal {
  z-index: 10;
}
.bpgraph-connection-backdrop {
  position: absolute;
  inset: 0;
  pointer-events: auto;
  background: transparent;
}
.bpgraph-replay-layer {
  z-index: 2;
}
.bpgraph-toolbar-layer {
  z-index: 3;
}
.bpgraph-palette-tooltip-layer {
  z-index: 11;
}
.bpgraph-port-tooltip-layer {
  z-index: 4;
}
.bpgraph-palette-tooltip {
  position: absolute;
  box-sizing: border-box;
  width: max-content;
  padding: 8px 11px;
  border: 1px solid var(--bpgraph-menu-border, rgba(148, 163, 184, 0.24));
  border-radius: 7px;
  background: var(--bpgraph-tooltip-bg, #14171d);
  color: var(--bpgraph-menu-fg, #e8eaed);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.35);
  font: 12px/1.6 system-ui, -apple-system, 'Segoe UI', sans-serif;
  overflow-wrap: anywhere;
  overflow: auto;
  overscroll-behavior: contain;
  pointer-events: auto;
}
.bpgraph-port-tooltip {
  position: absolute;
  display: flex;
  align-items: center;
  gap: 8px;
  box-sizing: border-box;
  max-width: 240px;
  padding: 5px 9px;
  border: 1px solid var(--bpgraph-menu-border, rgba(148, 163, 184, 0.24));
  border-radius: 6px;
  background: var(--bpgraph-tooltip-bg, #14171d);
  color: var(--bpgraph-menu-fg, #e8eaed);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  font: 12px/1.5 system-ui, -apple-system, 'Segoe UI', sans-serif;
  pointer-events: none;
}
.bpgraph-port-tooltip-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.bpgraph-port-tooltip-type {
  flex: none;
  padding: 0 5px;
  border-radius: 4px;
  background: rgba(148, 163, 184, 0.16);
  color: var(--bpgraph-menu-muted, #a5acb8);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 11px;
  line-height: 18px;
}
.bpgraph-preview-layer {
  z-index: 1;
}
.bpgraph-node-preview {
  position: absolute;
  box-sizing: border-box;
  width: 360px;
  overflow: auto;
  overscroll-behavior: contain;
  padding: 14px;
  border: 1px solid var(--bpgraph-menu-border, rgba(148, 163, 184, 0.24));
  border-radius: 12px;
  background: var(--bpgraph-menu-bg, rgba(20, 24, 31, 0.97));
  color: var(--bpgraph-menu-fg, #e2e8f0);
  box-shadow: 0 12px 36px rgba(0, 0, 0, 0.3);
  font: 12px/1.5 system-ui, -apple-system, 'Segoe UI', sans-serif;
  pointer-events: auto;
  user-select: text;
  backdrop-filter: blur(12px);
}
.bpgraph-node-preview-header,
.bpgraph-node-panel-execution-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.bpgraph-node-preview.is-status-only {
  width: max-content;
  padding: 8px 12px;
}
.bpgraph-node-preview-header strong {
  min-width: 0;
  overflow-wrap: anywhere;
  font-size: 13px;
}
.bpgraph-node-preview-header .bpgraph-execution-status,
.bpgraph-node-panel-execution-header .bpgraph-execution-status {
  max-width: 60%;
}
.bpgraph-node-panel-execution-header .bpgraph-node-panel-section-title {
  margin: 0;
}
.bpgraph-execution-badge {
  box-sizing: border-box;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.14);
  background: color-mix(in srgb, currentColor 14%, transparent);
  color: #cbd5e1;
  font-size: 11px;
  font-weight: 600;
  line-height: 1.5;
  text-align: center;
  overflow-wrap: anywhere;
}
.bpgraph-execution-badge.is-retry {
  color: #fcd34d;
}
.bpgraph-execution-attempt {
  display: grid;
  gap: 8px;
}
.bpgraph-execution-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.bpgraph-execution-error {
  display: grid;
  gap: 4px;
  padding: 8px 10px;
  border: 1px solid rgba(248, 113, 113, 0.25);
  border-radius: 8px;
  background: rgba(248, 113, 113, 0.09);
  color: #fca5a5;
  overflow-wrap: anywhere;
  user-select: text;
}
.bpgraph-execution-error-heading {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 8px;
  align-items: baseline;
  font-weight: 600;
}
.bpgraph-execution-error-heading code {
  color: inherit;
  font-size: 10px;
}
.bpgraph-node-preview-section {
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid rgba(148, 163, 184, 0.14);
}
.bpgraph-node-preview-section h4 {
  margin: 0 0 8px;
  color: #94a3b8;
  font-size: 11px;
  font-weight: 600;
}
.bpgraph-node-preview-section dl,
.bpgraph-node-preview-section dd { margin: 0; }
.bpgraph-node-preview-section dl > div + div { margin-top: 10px; }
.bpgraph-node-preview-section dt {
  margin-bottom: 4px;
  overflow-wrap: anywhere;
  color: #cbd5e1;
}
.bpgraph-node-preview-section pre {
  margin: 0;
  padding: 8px 10px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.2);
  font: 11px/1.6 ui-monospace, SFMono-Regular, Menlo, monospace;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.bpgraph-node-preview-empty {
  margin: 8px 0 0;
  color: #94a3b8;
}
.bpgraph-toolbar-layer {
  display: flex;
  align-items: flex-start;
  box-sizing: border-box;
  /* The right padding is the measured space covered by side panels plus one gap. */
  padding: var(--bpgraph-ui-gap) calc(var(--bpgraph-ui-gap) + var(--bpgraph-toolbar-inset, 0px)) 0
    var(--bpgraph-ui-gap);
}
.bpgraph-toolbar {
  display: flex;
  flex: none;
  flex-wrap: nowrap;
  align-items: center;
  box-sizing: border-box;
  gap: 6px;
  padding: 4px;
  border-radius: 10px;
  pointer-events: auto;
}
.bpgraph-minimap {
  position: absolute;
  bottom: 12px;
  left: 12px;
  box-sizing: border-box;
  width: 162px;
  max-width: calc(100% - 24px);
  overflow: hidden;
  border: 1px solid var(--bpgraph-menu-border, rgba(148, 163, 184, 0.2));
  border-radius: 7px;
  background: var(--bpgraph-menu-bg, rgba(20, 24, 31, 0.78));
  color: var(--bpgraph-menu-fg, #e8eaed);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.18);
  opacity: 0.75;
  pointer-events: auto;
  cursor: crosshair;
}
.bpgraph-minimap:hover { opacity: 1; }
/* The replay banner also occupies the bottom left; stack the minimap above it. */
[data-replay="true"] .bpgraph-minimap {
  bottom: 56px;
}
.bpgraph-minimap-map {
  display: block;
  width: 100%;
  height: auto;
  aspect-ratio: 5 / 3;
}
.bpgraph-minimap-link {
  fill: none;
  stroke: rgba(203, 213, 225, 0.5);
  stroke-width: 1;
  vector-effect: non-scaling-stroke;
  pointer-events: none;
}
.bpgraph-minimap-node { pointer-events: none; }
/* Compact canvases trade the overview for room to edit; zoom controls stay available. */
[data-bpgraph-compact="true"] .bpgraph-minimap-layer {
  display: none;
}
.bpgraph-toolbar.is-left {
  margin-right: auto;
}
.bpgraph-toolbar.is-center {
  margin-inline: auto;
}
.bpgraph-toolbar.is-right {
  margin-left: auto;
}
.bpgraph-toolbar-item {
  position: relative;
  display: inline-flex;
}
.bpgraph-toolbar-tooltip {
  display: none;
  position: absolute;
  top: calc(100% + 8px);
  left: 50%;
  z-index: 1;
  width: max-content;
  max-width: min(260px, calc(100vw - 24px));
  padding: 6px 9px;
  border: 1px solid var(--bpgraph-menu-border, rgba(148, 163, 184, 0.24));
  border-radius: 6px;
  background: var(--bpgraph-tooltip-bg, #14171d);
  color: var(--bpgraph-menu-fg, #e8eaed);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  font: 12px/1.5 system-ui, -apple-system, 'Segoe UI', sans-serif;
  overflow-wrap: anywhere;
  transform: translateX(-50%);
  pointer-events: none;
}
.bpgraph-toolbar-item:hover > .bpgraph-toolbar-tooltip,
.bpgraph-toolbar-button:focus-visible + .bpgraph-toolbar-tooltip {
  display: block;
}
.bpgraph-toolbar.is-left .bpgraph-toolbar-tooltip {
  left: 0;
  transform: none;
}
.bpgraph-toolbar.is-right .bpgraph-toolbar-tooltip {
  right: 0;
  left: auto;
  transform: none;
}
.bpgraph-toolbar-button {
  padding: 5px 12px;
  border: 1px solid var(--bpgraph-toolbar-border, rgba(255, 255, 255, 0.16));
  border-radius: 7px;
  background: var(--bpgraph-toolbar-button-bg, rgba(20, 22, 26, 0.45));
  color: var(--bpgraph-toolbar-fg, #e8eaed);
  font: 12px/1.4 system-ui, -apple-system, 'Segoe UI', sans-serif;
  cursor: pointer;
  backdrop-filter: blur(6px);
}
.bpgraph-toolbar-status {
  align-self: center;
  max-width: 160px;
  overflow: hidden;
  padding: 0 8px;
  color: var(--bpgraph-toolbar-fg, #e8eaed);
  font: 12px/1.4 system-ui, sans-serif;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.bpgraph-toolbar-button.is-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  font-size: 16px;
  line-height: 1;
}
.bpgraph-toolbar-button:focus-visible {
  outline: 2px solid var(--bpgraph-toolbar-fg, #e8eaed);
  outline-offset: 2px;
}
.bpgraph-toolbar-button:hover:not(:disabled) {
  background: var(--bpgraph-toolbar-button-hover, rgba(255, 255, 255, 0.12));
}
.bpgraph-toolbar-button.is-pressed {
  border-color: var(--bpgraph-toolbar-active-border, rgba(125, 211, 252, 0.6));
  background: var(--bpgraph-toolbar-button-active, rgba(56, 189, 248, 0.18));
  color: var(--bpgraph-toolbar-active-fg, #bae6fd);
}
.bpgraph-toolbar-button:disabled {
  opacity: 0.45;
  cursor: default;
}
/* Non-modal dialog renders in the top layer, so it stays above host overlays near the toolbar. */
.bpgraph-toolbar-overflow {
  position: fixed;
  inset: auto;
  max-width: min(280px, calc(100vw - 16px));
  max-height: calc(100vh - 16px);
  margin: 0;
  padding: 4px;
  overflow: auto;
  border: 1px solid var(--bpgraph-menu-border, rgba(148, 163, 184, 0.24));
  border-radius: 8px;
  background: var(--bpgraph-menu-bg, #23262b);
  color: var(--bpgraph-menu-fg, #e8eaed);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
  font: 12px/1.5 system-ui, -apple-system, 'Segoe UI', sans-serif;
}
.bpgraph-toolbar-overflow-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 6px 8px;
  border: 0;
  border-radius: 5px;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  white-space: nowrap;
  cursor: pointer;
}
.bpgraph-toolbar-overflow-item:hover:not(:disabled) {
  background: var(--bpgraph-menu-hover, rgba(255, 255, 255, 0.08));
}
.bpgraph-toolbar-overflow-item:focus-visible {
  outline: 2px solid var(--bpgraph-toolbar-fg, #e8eaed);
  outline-offset: -2px;
}
.bpgraph-toolbar-overflow-item:disabled {
  opacity: 0.45;
  cursor: default;
}
.bpgraph-toolbar-overflow-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  flex: none;
}
.bpgraph-replay-banner {
  position: absolute;
  left: 12px;
  bottom: 12px;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: 8px;
  max-width: calc(100% - 24px);
  padding: 6px 8px 6px 10px;
  border: 1px solid rgba(34, 211, 238, 0.45);
  border-radius: 8px;
  background: rgba(8, 47, 73, 0.92);
  color: #e0f2fe;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.35);
  font: 12px/1.4 system-ui, -apple-system, 'Segoe UI', sans-serif;
  pointer-events: auto;
}
.bpgraph-replay-dot {
  flex-shrink: 0;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #22d3ee;
  box-shadow: 0 0 0 3px rgba(34, 211, 238, 0.2);
  animation: bpgraph-debug-pulse 1.6s ease-in-out infinite;
}
.bpgraph-replay-mode {
  flex-shrink: 0;
  color: #a5f3fc;
  font-weight: 600;
}
.bpgraph-replay-label {
  min-width: 0;
  max-width: 240px;
  overflow: hidden;
  color: #bae6fd;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.bpgraph-replay-exit {
  flex-shrink: 0;
  padding: 2px 6px;
  border: 1px solid rgba(186, 230, 253, 0.35);
  border-radius: 4px;
  background: rgba(186, 230, 253, 0.1);
  color: inherit;
  font: inherit;
  cursor: pointer;
}
.bpgraph-replay-exit:hover {
  background: rgba(186, 230, 253, 0.2);
}
.bpgraph-replay-exit:focus-visible {
  outline: 2px solid #bae6fd;
  outline-offset: 2px;
}
.bpgraph-zoom-controls {
  position: absolute;
  bottom: 12px;
  left: 50%;
  display: flex;
  align-items: center;
  padding: 2px;
  border: 1px solid var(--bpgraph-toolbar-border, rgba(255, 255, 255, 0.16));
  border-radius: 6px;
  background: var(--bpgraph-menu-bg, rgba(35, 38, 43, 0.72));
  color: var(--bpgraph-toolbar-fg, #e8eaed);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  transform: translateX(-50%);
  opacity: 0.7;
  transition: opacity 160ms ease;
  pointer-events: auto;
}
.bpgraph-zoom-controls:hover,
.bpgraph-zoom-controls:focus-within {
  opacity: 1;
}
.bpgraph-zoom-button {
  width: 22px;
  height: 22px;
  padding: 0;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: inherit;
  font: 15px/1 system-ui, -apple-system, 'Segoe UI', sans-serif;
  cursor: pointer;
}
.bpgraph-zoom-value {
  width: 44px;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}
.bpgraph-zoom-fit {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-left: 3px;
  border-left: 1px solid var(--bpgraph-toolbar-border, rgba(255, 255, 255, 0.16));
}
.bpgraph-zoom-button:hover:not(:disabled) {
  background: var(--bpgraph-menu-hover, rgba(255, 255, 255, 0.08));
}
.bpgraph-zoom-button:focus-visible {
  outline: 2px solid var(--bpgraph-toolbar-fg, #e8eaed);
  outline-offset: -2px;
}
.bpgraph-zoom-button:disabled {
  opacity: 0.4;
  cursor: default;
}
.bpgraph-menu {
  position: absolute;
  box-sizing: border-box;
  min-width: 180px;
  padding: 4px;
  background: var(--bpgraph-menu-bg, #23262b);
  color: var(--bpgraph-menu-fg, #e8eaed);
  border: 1px solid var(--bpgraph-menu-border, rgba(255, 255, 255, 0.12));
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
  font: 12px/1.5 system-ui, -apple-system, 'Segoe UI', sans-serif;
  pointer-events: auto;
  user-select: none;
}
.bpgraph-menu-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  width: 100%;
  padding: 6px 8px;
  border: 0;
  border-radius: 5px;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}
.bpgraph-menu-item:hover:not(:disabled) {
  background: var(--bpgraph-menu-hover, rgba(255, 255, 255, 0.08));
}
.bpgraph-menu-item:disabled {
  opacity: 0.4;
  cursor: default;
}
.bpgraph-menu-item.is-danger {
  color: var(--bpgraph-menu-danger, #ff8a8a);
}
.bpgraph-menu-shortcut {
  color: var(--bpgraph-menu-muted, rgba(255, 255, 255, 0.45));
  font-size: 11px;
}
.bpgraph-context {
  width: 240px;
  min-width: 0;
  max-width: calc(100% - 8px);
  padding: 6px;
  overflow: auto;
  overscroll-behavior: contain;
  border-radius: 12px;
  box-shadow: 0 12px 36px rgba(0, 0, 0, 0.42);
  font-size: 13px;
}
.bpgraph-context-heading {
  padding: 5px 10px 8px;
  color: var(--bpgraph-menu-muted, #a5acb8);
  font-size: 10px;
  font-weight: 500;
}
.bpgraph-context-item {
  gap: 10px;
  min-height: 36px;
  padding: 7px 10px;
  border-radius: 7px;
}
.bpgraph-context-icon {
  display: grid;
  flex: 0 0 18px;
  place-items: center;
  height: 18px;
  color: var(--bpgraph-menu-muted, #a5acb8);
  font-size: 17px;
  line-height: 1;
}
.bpgraph-context-label {
  flex: 1;
  min-width: 0;
  overflow-wrap: anywhere;
}
.bpgraph-context-separator {
  height: 1px;
  margin: 5px 6px;
  background: var(--bpgraph-menu-border, rgba(255, 255, 255, 0.1));
}
.bpgraph-context kbd {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 26px;
  min-height: 24px;
  padding: 1px 6px;
  border: 1px solid var(--bpgraph-menu-border, rgba(255, 255, 255, 0.1));
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.16);
  font: inherit;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.4;
  text-align: center;
  white-space: nowrap;
}
.bpgraph-context-hint {
  font-size: 12px;
}
.bpgraph-context-item:focus-visible {
  outline: 2px solid var(--bpgraph-focus, #93b4ff);
  outline-offset: -2px;
  background: var(--bpgraph-menu-hover, rgba(255, 255, 255, 0.08));
}
.bpgraph-context-item.is-danger .bpgraph-context-icon {
  color: inherit;
}
.bpgraph-context-item.is-danger:hover:not(:disabled) {
  background: rgba(248, 113, 113, 0.1);
}
.bpgraph-context-item:disabled {
  color: var(--bpgraph-menu-muted, #a5acb8);
  opacity: 0.5;
  cursor: not-allowed;
}
.bpgraph-palette {
  display: flex;
  flex-direction: column;
  width: 400px;
  min-width: 0;
  max-width: calc(100% - 8px);
  padding: 14px;
  overflow: hidden;
  border-radius: 12px;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.45);
}
.bpgraph-palette.is-connecting {
  z-index: 1;
}
.bpgraph-palette.is-connecting .bpgraph-palette-item {
  cursor: pointer;
}
.bpgraph-palette-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}
.bpgraph-palette-header strong {
  font-size: 15px;
}
.bpgraph-palette-header p {
  margin: 3px 0 0;
  color: var(--bpgraph-menu-muted, #a5acb8);
  font-size: 11px;
}
.bpgraph-palette-close {
  border: 0;
  border-radius: 5px;
  background: transparent;
  color: var(--bpgraph-menu-muted, #a5acb8);
  font: 20px/1 system-ui, sans-serif;
  cursor: pointer;
}
.bpgraph-palette button:focus-visible {
  outline: 2px solid var(--bpgraph-focus, #93b4ff);
  outline-offset: 2px;
}
.bpgraph-palette-search {
  box-sizing: border-box;
  flex-shrink: 0;
  width: 100%;
  padding: 9px 11px;
  border: 1px solid var(--bpgraph-menu-border, rgba(255, 255, 255, 0.12));
  border-radius: 7px;
  outline: none;
  background: rgba(0, 0, 0, 0.25);
  color: inherit;
  font: inherit;
}
.bpgraph-palette-categories {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 12px 0;
}
.bpgraph-palette-category {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 8px;
  border: 1px solid transparent;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.04);
  color: var(--bpgraph-menu-muted, #a5acb8);
  font: inherit;
  font-size: 11px;
  cursor: pointer;
}
.bpgraph-palette-category[aria-pressed="true"] {
  border-color: rgba(147, 180, 255, 0.35);
  background: rgba(147, 180, 255, 0.12);
  color: var(--bpgraph-focus, #b7ccff);
}
.bpgraph-palette-category span {
  opacity: 0.7;
  font-size: 10px;
}
.bpgraph-palette-list {
  min-height: 0;
  max-height: 300px;
  margin: 0 -6px;
  padding: 0 6px;
  overflow: auto;
  overscroll-behavior: contain;
}
.bpgraph-palette-group + .bpgraph-palette-group {
  margin-top: 12px;
}
.bpgraph-palette-group h3 {
  display: flex;
  justify-content: space-between;
  margin: 0 0 4px;
  padding: 0 8px;
  color: var(--bpgraph-menu-muted, #a5acb8);
  font-size: 10px;
  font-weight: 500;
}
.bpgraph-palette-item {
  gap: 10px;
  padding: 6px 8px;
  border-radius: 8px;
  cursor: grab;
}
.bpgraph-palette-icon {
  display: grid;
  flex: 0 0 28px;
  place-items: center;
  height: 28px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  background: #3e495c;
  color: #fff;
  font: 600 13px/1 ui-monospace, monospace;
}
.bpgraph-palette-icon > i {
  font-size: 18px;
  line-height: 1;
}
.bpgraph-palette-copy {
  flex: 1;
  min-width: 0;
}
.bpgraph-palette-title {
  font-size: 12px;
  font-weight: 500;
}
.bpgraph-palette-add {
  color: var(--bpgraph-menu-muted, #a5acb8);
  font-size: 18px;
}
.bpgraph-palette-empty {
  padding: 28px 8px;
  color: var(--bpgraph-menu-muted, #a5acb8);
  text-align: center;
}
.bpgraph-palette-footer {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 4px;
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid var(--bpgraph-menu-border, rgba(255, 255, 255, 0.12));
  color: var(--bpgraph-menu-muted, #a5acb8);
  font-size: 10px;
}
.bpgraph-menu.is-hidden {
  opacity: 0;
  pointer-events: none;
}
.bpgraph-port-editor {
  position: relative;
  display: flex;
  align-items: center;
  flex-wrap: nowrap;
  width: 100%;
  height: 100%;
  white-space: nowrap;
}
.bpgraph-port-checkbox {
  flex: 0 0 16px;
  width: 16px;
  height: 16px;
  margin: 0;
  cursor: pointer;
}
.bpgraph-port-stepper {
  position: absolute;
  right: 2px;
  top: 50%;
  transform: translateY(-50%);
}
.bpgraph-port-chevron {
  position: absolute;
  right: 4px;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
}
.bpgraph-port-step {
  cursor: pointer;
}
.bpgraph-node-panel {
  position: absolute;
  top: var(--bpgraph-ui-gap);
  right: var(--bpgraph-ui-gap);
  bottom: var(--bpgraph-ui-gap);
  z-index: 1;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  max-width: calc(100% - var(--bpgraph-ui-gap) * 2);
  background: var(--bpgraph-panel-bg, #1d2024);
  color: var(--bpgraph-panel-fg, #e8eaed);
  border: 1px solid var(--bpgraph-panel-border, rgba(255, 255, 255, 0.12));
  border-radius: 12px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.35);
  font: 12px/1.5 system-ui, -apple-system, 'Segoe UI', sans-serif;
  pointer-events: auto;
  overflow: hidden;
}
/* Compact sheets start below the toolbar instead of floating over it. */
.bpgraph-node-panel.is-compact {
  top: calc(var(--bpgraph-toolbar-bottom, 0px) + var(--bpgraph-ui-gap));
}
.bpgraph-node-panel-header {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 12px 0;
  border-bottom: 1px solid var(--bpgraph-panel-border, rgba(255, 255, 255, 0.12));
}
.bpgraph-node-panel-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.bpgraph-node-panel-title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  overflow-wrap: anywhere;
}
.bpgraph-node-panel-tabs {
  display: flex;
  gap: 4px;
}
.bpgraph-node-panel-tab {
  padding: 7px 10px 8px;
  border: 0;
  border-bottom: 2px solid transparent;
  border-radius: 4px 4px 0 0;
  background: transparent;
  color: var(--bpgraph-panel-muted, rgba(255, 255, 255, 0.5));
  font: inherit;
  cursor: pointer;
}
.bpgraph-node-panel-tab:hover {
  color: var(--bpgraph-panel-fg, #e8eaed);
}
.bpgraph-node-panel-tab[aria-selected="true"] {
  border-bottom-color: var(--bpgraph-focus, #93b4ff);
  color: var(--bpgraph-panel-fg, #e8eaed);
}
.bpgraph-node-panel-tab:focus-visible {
  outline: 2px solid var(--bpgraph-focus, #93b4ff);
  outline-offset: 2px;
}
.bpgraph-node-panel-close {
  padding: 0 4px;
  border: 0;
  background: transparent;
  color: var(--bpgraph-panel-muted, rgba(255, 255, 255, 0.5));
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
}
.bpgraph-node-panel-close:hover {
  color: var(--bpgraph-panel-fg, #e8eaed);
}
.bpgraph-node-custom-root {
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  overflow: hidden;
}
.bpgraph-element.is-subgraph-collapsed .bpgraph-node-body,
.bpgraph-element.is-container-collapsed .bpgraph-node-body {
  fill-opacity: var(--bpgraph-container-collapsed-body-opacity, var(--bpgraph-subgraph-collapsed-body-opacity, 0.5));
  stroke-opacity: var(--bpgraph-container-collapsed-body-opacity, var(--bpgraph-subgraph-collapsed-body-opacity, 0.5));
}
.bpgraph-subgraph-card {
  position: relative;
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  overflow: hidden;
  border-radius: inherit;
  color: #fff;
  font: 12px/1.4 system-ui, -apple-system, 'Segoe UI', sans-serif;
  /* The SVG body stays the hit area; only explicit controls opt back in. */
  pointer-events: none;
}
.bpgraph-subgraph-toggle {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 3;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  color: #dbeafe;
  background: transparent;
  border: 0;
  border-radius: 6px;
  cursor: pointer;
  pointer-events: auto;
  transition: background-color 120ms ease, color 120ms ease;
}
.bpgraph-subgraph-toggle:disabled {
  opacity: 0.4;
  cursor: default;
}
.bpgraph-subgraph-toggle:hover:not(:disabled) {
  color: #fff;
  background: rgba(255, 255, 255, 0.12);
}
.bpgraph-subgraph-toggle:active:not(:disabled) {
  background: rgba(255, 255, 255, 0.18);
}
.bpgraph-subgraph-toggle:focus-visible {
  outline: 2px solid var(--bpgraph-focus, #7dd3fc);
  outline-offset: -2px;
}
.bpgraph-subgraph-toggle svg {
  width: 14px;
  height: 14px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
  transition: transform 140ms ease;
}
.bpgraph-subgraph-card:not(.is-collapsed) .bpgraph-subgraph-toggle svg {
  transform: rotate(90deg);
}
.bpgraph-subgraph-title {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 2;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: 6px;
  height: 24px;
  padding: 0 26px 0 32px;
  overflow: hidden;
  color: var(--bpgraph-subgraph-header-fg, #f0f7ff);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.01em;
  line-height: 23px;
  text-overflow: ellipsis;
  white-space: nowrap;
  background: var(--bpgraph-subgraph-header-bg, linear-gradient(180deg, rgba(33, 150, 243, 0.24), rgba(33, 150, 243, 0.1)));
  border-bottom: 1px solid var(--bpgraph-subgraph-header-border, rgba(96, 165, 250, 0.32));
  text-shadow: none;
}
.bpgraph-subgraph-title-text {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.bpgraph-subgraph-card.is-loop .bpgraph-subgraph-title {
  color: var(--bpgraph-loop-header-fg, #f5f3ff);
  background: var(--bpgraph-loop-header-bg, linear-gradient(180deg, rgba(124, 58, 237, 0.30), rgba(124, 58, 237, 0.12)));
  border-bottom-color: var(--bpgraph-loop-header-border, rgba(167, 139, 250, 0.38));
}
.bpgraph-subgraph-card.is-loop .bpgraph-subgraph-toggle {
  color: #ddd6fe;
}
.bpgraph-subgraph-card.is-loop .bpgraph-subgraph-toggle:focus-visible {
  outline-color: #c4b5fd;
}
.bpgraph-loop-glyph {
  flex: none;
  width: 14px;
  height: 14px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
  opacity: 0.9;
}
.bpgraph-loop-limit {
  flex: none;
  margin-left: auto;
  padding: 1px 5px;
  overflow: hidden;
  color: #ede9fe;
  font-size: 10px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  line-height: 1.4;
  text-overflow: ellipsis;
  white-space: nowrap;
  background: rgba(124, 58, 237, 0.24);
  border: 1px solid rgba(196, 181, 253, 0.30);
  border-radius: 999px;
}
/* The loop card is a preview first; port labels stay available in the node panel. */
.bpgraph-element.is-loop-card > .bpgraph-port [joint-selector="portLabel"] {
  display: none;
}
.bpgraph-subgraph-preview {
  position: absolute;
  /* Keep the title strip on the card body so the preview reads as its own surface. */
  inset: 24px 0 0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  pointer-events: none;
  /* A darker inset canvas separates inner nodes from the card body without leaving the dark theme. */
  background:
    radial-gradient(circle at 1px 1px, rgba(255, 255, 255, 0.1) 1px, transparent 1.5px) 0 0 / 12px 12px,
    radial-gradient(120% 90% at 50% 0%, rgba(125, 211, 252, 0.07), transparent 62%),
    var(--bpgraph-subgraph-preview-bg, rgba(5, 7, 9, 0.55));
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.07),
    inset 0 10px 24px rgba(0, 0, 0, 0.45);
}
.bpgraph-subgraph-preview > svg {
  display: block;
  width: 100%;
  height: 100%;
  animation: bpgraph-preview-fade 140ms ease-out;
}
.bpgraph-subgraph-card.is-loop .bpgraph-subgraph-preview {
  background:
    radial-gradient(circle at 1px 1px, rgba(255, 255, 255, 0.1) 1px, transparent 1.5px) 0 0 / 12px 12px,
    radial-gradient(120% 90% at 50% 0%, rgba(167, 139, 250, 0.09), transparent 62%),
    var(--bpgraph-loop-preview-bg, rgba(5, 7, 9, 0.55));
  box-shadow:
    inset 0 0 0 1px rgba(167, 139, 250, 0.12),
    inset 0 10px 24px rgba(0, 0, 0, 0.45);
}
.bpgraph-region-schematic {
  display: block;
  width: 100%;
  height: 100%;
}
@keyframes bpgraph-preview-fade {
  from { opacity: 0; }
  to { opacity: 1; }
}
@media (prefers-reduced-motion: reduce) {
  .bpgraph-subgraph-preview > svg {
    animation: none;
  }
}
.bpgraph-subgraph-preview-empty {
  color: rgba(255, 255, 255, 0.55);
  font-size: 11px;
}
.bpgraph-subgraph-breakpoint {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 3;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #f87171;
  box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.45);
}
.bpgraph-subgraph-card.is-generic {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  background: linear-gradient(180deg, rgba(33, 150, 243, 0.16), rgba(0, 0, 0, 0.12));
}
.bpgraph-subgraph-card.is-generic.is-loop {
  background: linear-gradient(180deg, rgba(124, 58, 237, 0.16), rgba(0, 0, 0, 0.12));
}
.bpgraph-subgraph-card.is-generic .bpgraph-subgraph-title {
  position: static;
  height: auto;
  padding: 0 12px;
  font-size: 13px;
  line-height: 1.3;
  text-align: center;
  white-space: normal;
  background: none;
}
.bpgraph-subgraph-card.is-generic .bpgraph-subgraph-title-text {
  overflow: visible;
  white-space: normal;
}
.bpgraph-subgraph-badge {
  color: rgba(255, 255, 255, 0.65);
  font-size: 10px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.bpgraph-subgraph-omitted {
  position: absolute;
  right: 6px;
  bottom: 6px;
  z-index: 3;
  padding: 1px 5px;
  color: rgba(255, 255, 255, 0.8);
  font-size: 10px;
  line-height: 1.4;
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 999px;
}
.bpgraph-standalone-preview {
  position: relative;
  overflow: hidden;
  pointer-events: none;
}
.bpgraph-standalone-preview > svg {
  display: block;
  width: 100%;
  height: 100%;
}
.bpgraph-standalone-preview[data-preview-state="pending"],
.bpgraph-subgraph-preview[data-preview-state="pending"] {
  background: linear-gradient(100deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.04));
  background-size: 200% 100%;
  animation: bpgraph-preview-shimmer 1.2s ease-in-out infinite;
}
@keyframes bpgraph-preview-shimmer {
  from { background-position: 150% 0; }
  to { background-position: -50% 0; }
}

.bpgraph-node-panel-scroll {
  flex: 1;
  overflow: auto;
}
.bpgraph-node-panel-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 12px;
  overflow-wrap: anywhere;
  color: var(--bpgraph-panel-muted, rgba(255, 255, 255, 0.5));
  border-bottom: 1px solid var(--bpgraph-panel-border, rgba(255, 255, 255, 0.12));
}
.bpgraph-node-panel-extra {
  padding: 8px 12px;
  border-bottom: 1px solid var(--bpgraph-panel-border, rgba(255, 255, 255, 0.12));
}
.bpgraph-node-panel-section {
  padding: 10px 12px;
  border-bottom: 1px solid var(--bpgraph-panel-border, rgba(255, 255, 255, 0.12));
}
.bpgraph-node-panel-section-title {
  margin: 0 0 8px;
  font-size: 12px;
  font-weight: 600;
}
.bpgraph-node-panel-description {
  margin: 0;
  color: var(--bpgraph-panel-muted, rgba(255, 255, 255, 0.7));
  line-height: 1.65;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.bpgraph-node-panel-field {
  margin-bottom: 10px;
}
.bpgraph-node-panel-label {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
  color: var(--bpgraph-panel-muted, rgba(255, 255, 255, 0.65));
}
.bpgraph-node-panel-label-meta {
  color: var(--bpgraph-panel-muted, rgba(255, 255, 255, 0.4));
}
.bpgraph-node-panel-input {
  box-sizing: border-box;
  width: 100%;
  padding: 4px 6px;
  border: 1px solid var(--bpgraph-panel-border, rgba(255, 255, 255, 0.16));
  border-radius: 4px;
  outline: none;
  background: rgba(0, 0, 0, 0.25);
  color: inherit;
  font: inherit;
}
.bpgraph-node-panel-input:focus {
  border-color: var(--bpgraph-panel-accent, #4b9fff);
}
.bpgraph-node-panel-limit-error {
  display: none;
  margin-top: 4px;
  color: #fca5a5;
}
.bpgraph-node-panel-limit-field .bpgraph-node-panel-input:invalid {
  border-color: #fca5a5;
}
.bpgraph-node-panel-limit-field .bpgraph-node-panel-input:invalid + .bpgraph-node-panel-limit-error {
  display: block;
}
.bpgraph-node-panel-select {
  position: relative;
}
.bpgraph-node-panel-select > select {
  appearance: none;
  padding-right: 30px;
  cursor: pointer;
}
.bpgraph-node-panel-select-arrow {
  position: absolute;
  top: 50%;
  right: 10px;
  width: 12px;
  height: 12px;
  transform: translateY(-50%);
  color: var(--bpgraph-panel-muted, rgba(255, 255, 255, 0.65));
  pointer-events: none;
}
.bpgraph-node-panel-checkbox {
  width: 14px;
  height: 14px;
  accent-color: var(--bpgraph-panel-accent, #4b9fff);
}
.bpgraph-node-panel-danger {
  margin-left: auto;
  padding: 0 4px;
  border: 0;
  background: transparent;
  color: var(--bpgraph-menu-danger, #ff8a8a);
  cursor: pointer;
}
.bpgraph-node-panel-outputs {
  margin: 0;
  padding-left: 16px;
  color: var(--bpgraph-panel-muted, rgba(255, 255, 255, 0.65));
}
.bpgraph-node-panel-empty {
  margin: 0;
  color: var(--bpgraph-panel-muted, rgba(255, 255, 255, 0.4));
}
.bpgraph-node-panel-empty-block {
  padding: 12px;
}
.bpgraph-node-panel-overview {
  padding: 12px;
}
.bpgraph-node-panel-overview-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.bpgraph-node-panel-overview-item {
  box-sizing: border-box;
  width: 100%;
  padding: 7px 9px;
  border: 1px solid transparent;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.04);
  color: inherit;
  font: inherit;
  text-align: left;
  overflow-wrap: anywhere;
  cursor: pointer;
}
.bpgraph-node-panel-overview-item:hover {
  background: rgba(255, 255, 255, 0.08);
}
.bpgraph-node-panel-overview-item:focus-visible {
  outline: 2px solid var(--bpgraph-focus, #93b4ff);
  outline-offset: 2px;
}
/* JSON code editor ----------------------------------------------------- */
.bpgraph-json-editor {
  box-sizing: border-box;
  border: 1px solid var(--bpgraph-panel-border, rgba(255, 255, 255, 0.16));
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.25);
  overflow: hidden;
}
.bpgraph-json-editor .cm-editor {
  max-height: 260px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
  line-height: 1.6;
  background: transparent;
  color: var(--bpgraph-panel-fg, #e8eaed);
}
.bpgraph-json-editor .cm-editor.cm-focused {
  outline: none;
}
.bpgraph-json-editor .cm-scroller {
  font-family: inherit;
  line-height: inherit;
}
.bpgraph-json-editor .cm-content {
  padding: 6px 0;
  caret-color: var(--bpgraph-panel-accent, #4b9fff);
}
.bpgraph-json-editor .cm-gutters {
  border-right: 1px solid var(--bpgraph-panel-border, rgba(255, 255, 255, 0.1));
  background: transparent;
  color: var(--bpgraph-panel-muted, rgba(255, 255, 255, 0.35));
}
.bpgraph-json-editor .cm-lineNumbers .cm-gutterElement {
  padding: 0 6px 0 8px;
}
.bpgraph-json-editor .cm-activeLine {
  background: rgba(255, 255, 255, 0.05);
}
.bpgraph-json-editor .cm-activeLineGutter {
  background: transparent;
  color: var(--bpgraph-panel-muted, rgba(255, 255, 255, 0.7));
}
.bpgraph-json-editor .cm-selectionBackground,
.bpgraph-json-editor .cm-editor .cm-selectionBackground,
.bpgraph-json-editor .cm-editor.cm-focused .cm-selectionBackground,
.bpgraph-json-editor .cm-editor ::selection {
  background: rgba(75, 159, 255, 0.25);
}
.bpgraph-json-editor .cm-cursor {
  border-left-color: var(--bpgraph-panel-accent, #4b9fff);
}
.bpgraph-json-editor .cm-placeholder {
  color: var(--bpgraph-panel-muted, rgba(255, 255, 255, 0.35));
}
/* Syntax colors come from the editor's own highlight style, which CodeMirror
   scopes to generated class names. */
/* Diagnostics. */
.bpgraph-json-editor .cm-lintRange-error {
  background: rgba(255, 138, 138, 0.16);
  text-decoration: underline wavy var(--bpgraph-menu-danger, #ff8a8a);
  text-underline-offset: 3px;
}
.bpgraph-json-editor .cm-lintPoint-error {
  position: relative;
  display: inline-block;
  width: 8px;
  height: 8px;
  margin-left: -4px;
  border-radius: 50%;
  background: var(--bpgraph-menu-danger, #ff8a8a);
  vertical-align: middle;
}
.bpgraph-json-editor .cm-lint-marker-error {
  content: '';
  display: inline-block;
  width: 12px;
  height: 12px;
  margin-left: 2px;
  vertical-align: middle;
  border-radius: 50%;
  background: var(--bpgraph-menu-danger, #ff8a8a);
}
.bpgraph-json-editor .cm-lint-marker-error::after {
  content: '!';
  display: block;
  color: #1d2024;
  font-size: 9px;
  font-weight: 700;
  line-height: 12px;
  text-align: center;
}
.bpgraph-json-editor .cm-tooltip {
  border: 1px solid var(--bpgraph-panel-border, rgba(255, 255, 255, 0.16));
  border-radius: 4px;
  background: var(--bpgraph-panel-bg, #1d2024);
  color: var(--bpgraph-panel-fg, #e8eaed);
  font-family: inherit;
  font-size: 11px;
}
.bpgraph-json-editor .cm-tooltip .cm-diagnostic {
  padding: 4px 8px;
}
.bpgraph-json-editor .cm-tooltip .cm-diagnostic-error {
  color: var(--bpgraph-menu-danger, #ff8a8a);
}
/* Search panel. */
.bpgraph-json-editor .cm-panels {
  background: var(--bpgraph-panel-bg, #1d2024);
  color: var(--bpgraph-panel-fg, #e8eaed);
  border-bottom: 1px solid var(--bpgraph-panel-border, rgba(255, 255, 255, 0.12));
}
.bpgraph-json-editor .cm-panels input,
.bpgraph-json-editor .cm-panels button {
  font-family: inherit;
  font-size: 11px;
  color: inherit;
}
.bpgraph-json-editor .cm-panels input {
  padding: 2px 6px;
  border: 1px solid var(--bpgraph-panel-border, rgba(255, 255, 255, 0.16));
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.25);
}
.bpgraph-json-editor .cm-panels button {
  padding: 2px 8px;
  border: 1px solid var(--bpgraph-panel-border, rgba(255, 255, 255, 0.16));
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.06);
  cursor: pointer;
}
.bpgraph-json-editor .cm-panels button:hover {
  background: rgba(255, 255, 255, 0.12);
}
.bpgraph-json-editor .cm-searchMatch {
  background: rgba(255, 212, 121, 0.25);
  outline: 1px solid rgba(255, 212, 121, 0.5);
}
.bpgraph-json-editor .cm-searchMatch-selected {
  background: rgba(255, 212, 121, 0.45);
}
.bpgraph-debug-panel {
  position: absolute;
  top: var(--bpgraph-ui-gap);
  right: var(--bpgraph-ui-gap);
  bottom: var(--bpgraph-ui-gap);
  z-index: 1;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  max-width: calc(100% - var(--bpgraph-ui-gap) * 2);
  overflow: hidden;
  border: 1px solid var(--bpgraph-panel-border, rgba(255, 255, 255, 0.12));
  border-radius: 12px;
  background: var(--bpgraph-panel-bg, #1d2024);
  color: var(--bpgraph-panel-fg, #e8eaed);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.35);
  font: 12px/1.5 system-ui, -apple-system, 'Segoe UI', sans-serif;
  pointer-events: auto;
}
/* Compact sheets start below the toolbar instead of floating over it. */
.bpgraph-debug-panel.is-compact {
  top: calc(var(--bpgraph-toolbar-bottom, 0px) + var(--bpgraph-ui-gap));
}
.bpgraph-debug-panel-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 12px;
  border-bottom: 1px solid var(--bpgraph-panel-border, rgba(255, 255, 255, 0.12));
}
.bpgraph-debug-panel-title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}
.bpgraph-debug-panel-subtitle {
  margin: 2px 0 0;
  color: var(--bpgraph-panel-muted, rgba(255, 255, 255, 0.5));
  font-size: 11px;
}
.bpgraph-debug-panel-close {
  flex-shrink: 0;
  padding: 0 4px;
  border: 0;
  background: transparent;
  color: var(--bpgraph-panel-muted, rgba(255, 255, 255, 0.5));
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
}
.bpgraph-debug-panel-close:hover {
  color: var(--bpgraph-panel-fg, #e8eaed);
}
.bpgraph-debug-panel-scroll {
  flex: 1;
  overflow: auto;
  overscroll-behavior: contain;
}
.bpgraph-debug-panel-section {
  padding: 10px 12px;
  border-bottom: 1px solid var(--bpgraph-panel-border, rgba(255, 255, 255, 0.12));
}
.bpgraph-debug-panel-section:last-child {
  border-bottom: 0;
}
.bpgraph-debug-panel-section-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin: 0 0 8px;
  font-size: 12px;
  font-weight: 600;
}
.bpgraph-debug-panel-section-title > span {
  min-width: 18px;
  padding: 0 5px;
  border-radius: 8px;
  background: rgba(148, 163, 184, 0.14);
  color: var(--bpgraph-panel-muted, rgba(255, 255, 255, 0.55));
  font-size: 10px;
  font-weight: 500;
  text-align: center;
}
.bpgraph-debug-panel-empty {
  margin: 0;
  color: var(--bpgraph-panel-muted, rgba(255, 255, 255, 0.4));
}
.bpgraph-debug-records,
.bpgraph-debug-logs {
  margin: 0;
  padding: 0;
  list-style: none;
}
.bpgraph-debug-records {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.bpgraph-debug-record {
  box-sizing: border-box;
  display: flex;
  gap: 8px;
  width: 100%;
  padding: 6px 8px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: default;
}
.bpgraph-debug-record.is-selectable {
  cursor: pointer;
}
.bpgraph-debug-record.is-selectable:hover {
  background: rgba(148, 163, 184, 0.08);
}
.bpgraph-debug-record.is-active {
  border-color: rgba(125, 211, 252, 0.45);
  background: rgba(56, 189, 248, 0.12);
}
.bpgraph-debug-record:focus-visible {
  outline: 2px solid var(--bpgraph-focus, #93b4ff);
  outline-offset: -2px;
}
.bpgraph-debug-record:disabled {
  opacity: 1;
  color: inherit;
  cursor: default;
}
.bpgraph-debug-record-dot {
  flex-shrink: 0;
  width: 8px;
  height: 8px;
  margin-top: 4px;
  border-radius: 50%;
  background: #64748b;
  box-shadow: 0 0 0 3px rgba(100, 116, 139, 0.16);
}
.bpgraph-debug-record.is-running .bpgraph-debug-record-dot {
  background: #22d3ee;
  box-shadow: 0 0 0 3px rgba(34, 211, 238, 0.18);
  animation: bpgraph-debug-pulse 1.6s ease-in-out infinite;
}
.bpgraph-debug-record.is-paused .bpgraph-debug-record-dot {
  background: #fbbf24;
  box-shadow: 0 0 0 3px rgba(251, 191, 36, 0.18);
}
.bpgraph-debug-record.is-interrupted .bpgraph-debug-record-dot {
  background: #c084fc;
  box-shadow: 0 0 0 3px rgba(192, 132, 252, 0.18);
}
.bpgraph-debug-record.is-completed .bpgraph-debug-record-dot {
  background: #34d399;
  box-shadow: 0 0 0 3px rgba(52, 211, 153, 0.16);
}
.bpgraph-debug-record.is-failed .bpgraph-debug-record-dot {
  background: #f87171;
  box-shadow: 0 0 0 3px rgba(248, 113, 113, 0.18);
}
.bpgraph-debug-record.is-waiting .bpgraph-debug-record-dot {
  background: #60a5fa;
  box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.16);
}
.bpgraph-debug-record-body {
  display: block;
  flex: 1;
  min-width: 0;
}
.bpgraph-debug-record-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}
.bpgraph-debug-record-head strong {
  min-width: 0;
  overflow-wrap: anywhere;
  font-size: 12px;
  font-weight: 600;
}
.bpgraph-debug-record-meta {
  display: block;
  margin: 2px 0 0;
  color: var(--bpgraph-panel-muted, rgba(255, 255, 255, 0.48));
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}
.bpgraph-debug-record-detail {
  display: block;
  margin: 4px 0 0;
  color: #cbd5e1;
  font-size: 11px;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}
.bpgraph-debug-status {
  flex-shrink: 0;
  color: var(--bpgraph-panel-muted, rgba(255, 255, 255, 0.5));
  font-size: 11px;
}
.bpgraph-debug-status.is-running,
.bpgraph-execution-status.is-running {
  color: #67e8f9;
}
.bpgraph-debug-status.is-paused,
.bpgraph-execution-status.is-paused {
  color: #fbbf24;
}
.bpgraph-debug-status.is-completed,
.bpgraph-execution-status.is-completed {
  color: #6ee7b7;
}
.bpgraph-debug-status.is-failed,
.bpgraph-execution-badge.is-failed {
  color: #fca5a5;
}
.bpgraph-debug-status.is-cancelled,
.bpgraph-execution-status.is-cancelled {
  color: #fdba74;
}
.bpgraph-debug-status.is-skipped,
.bpgraph-execution-status.is-skipped {
  color: #94a3b8;
}
.bpgraph-debug-status.is-interrupted,
.bpgraph-execution-status.is-interrupted {
  color: #d8b4fe;
}
.bpgraph-debug-status.is-waiting,
.bpgraph-debug-status.is-pending,
.bpgraph-execution-status.is-pending {
  color: #93c5fd;
}
.bpgraph-debug-logs {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.bpgraph-debug-log {
  display: grid;
  grid-template-columns: auto auto minmax(0, 1fr);
  gap: 6px;
  align-items: baseline;
}
.bpgraph-debug-log-time {
  color: var(--bpgraph-panel-muted, rgba(255, 255, 255, 0.45));
  font-size: 10px;
  font-variant-numeric: tabular-nums;
}
/* Engine trace event type, shown as a compact badge before the message. */
.bpgraph-debug-log-type {
  padding: 0 4px;
  border-radius: 3px;
  background: rgba(148, 163, 184, 0.14);
  color: #cbd5e1;
  font-size: 10px;
  line-height: 1.5;
  white-space: nowrap;
}
.bpgraph-debug-log-type.is-plain {
  background: rgba(148, 163, 184, 0.14);
  color: #cbd5e1;
}
.bpgraph-debug-log.is-debug .bpgraph-debug-log-type {
  color: #94a3b8;
}
.bpgraph-debug-log.is-success .bpgraph-debug-log-type {
  background: rgba(52, 211, 153, 0.16);
  color: #a7f3d0;
}
.bpgraph-debug-log.is-warn .bpgraph-debug-log-type {
  background: rgba(251, 191, 36, 0.16);
  color: #fde68a;
}
.bpgraph-debug-log.is-error .bpgraph-debug-log-type {
  background: rgba(248, 113, 113, 0.16);
  color: #fecaca;
}
/* Task-level events describe the run itself, not one node. */
.bpgraph-debug-log.is-task-status .bpgraph-debug-log-type {
  background: rgba(56, 189, 248, 0.16);
  color: #7dd3fc;
}
.bpgraph-debug-log.is-activation-status .bpgraph-debug-log-type {
  background: rgba(34, 211, 238, 0.14);
  color: #a5f3fc;
}
.bpgraph-debug-log.is-loop-invocation .bpgraph-debug-log-type,
.bpgraph-debug-log.is-loop-frame .bpgraph-debug-log-type {
  background: rgba(167, 139, 250, 0.16);
  color: #c4b5fd;
}
/* Keep logs on one line with ellipsis so long messages do not expand the panel. */
.bpgraph-debug-log-message {
  min-width: 0;
  color: #cbd5e1;
  font-size: 11px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.bpgraph-debug-log-node {
  margin-right: 4px;
  color: #93c5fd;
}
.bpgraph-debug-log-node::after {
  content: '·';
  margin-left: 4px;
  color: var(--bpgraph-panel-muted, rgba(255, 255, 255, 0.4));
}
/* Subgraph log prefix: [subgraph name]. */
.bpgraph-debug-log-scope {
  margin-right: 4px;
  color: #7dd3fc;
}
.bpgraph-debug-log-scope::after {
  content: '·';
  margin-left: 4px;
  color: var(--bpgraph-panel-muted, rgba(255, 255, 255, 0.4));
}
@keyframes bpgraph-debug-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.45; }
}
@media (prefers-reduced-motion: reduce) {
  .bpgraph-debug-record.is-running .bpgraph-debug-record-dot,
  .bpgraph-replay-dot {
    animation: none;
  }
}
.bpgraph-node-tools-view {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
}
.bpgraph-node-tool-view {
  pointer-events: auto;
}
.bpgraph-node-dropdown-host {
  position: absolute;
  inset: 0;
  z-index: 9999;
  pointer-events: none;
}
.bpgraph-node-dropdown {
  pointer-events: auto;
}
.bpgraph-node-dropdown-option {
  padding: 2px 4px;
  cursor: pointer;
}
.bpgraph-node-dropdown-option:hover {
  background: rgba(255, 255, 255, 0.08);
}
.bpgraph-node-overlay-host {
  position: absolute;
  inset: 0;
  z-index: 10000;
  pointer-events: none;
}
.bpgraph-node-overlay {
  position: absolute;
  pointer-events: auto;
}
`

let installedStyle: HTMLStyleElement | null = null

/** Graphs share styles; refresh existing styles on hot reload to avoid stale rules. */
export function ensureUiStyles() {
  if (typeof document === 'undefined') return
  if (installedStyle?.isConnected) return
  const existing = document.getElementById(STYLE_ID) as HTMLStyleElement | null
  const style = existing ?? document.createElement('style')
  style.id = STYLE_ID
  if (style.textContent !== STYLES) style.textContent = STYLES
  if (!existing) document.head.appendChild(style)
  installedStyle = style
}
