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
.bpgraph-replay-layer {
  z-index: 2;
}
.bpgraph-toolbar-layer {
  z-index: 3;
}
.bpgraph-palette-tooltip-layer {
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
.bpgraph-node-preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.bpgraph-node-preview-header strong {
  min-width: 0;
  overflow-wrap: anywhere;
  font-size: 13px;
}
.bpgraph-node-preview-header span {
  flex-shrink: 0;
  color: #6ee7b7;
  font-size: 11px;
}
.bpgraph-node-preview-header .is-paused {
  color: #fbbf24;
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
.bpgraph-toolbar {
  position: absolute;
  top: 8px;
  display: flex;
  gap: 6px;
  padding: 4px;
  border-radius: 10px;
  pointer-events: auto;
}
.bpgraph-minimap {
  position: absolute;
  top: 12px;
  right: 12px;
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
.bpgraph-toolbar.is-left {
  left: 8px;
}
.bpgraph-toolbar.is-center {
  left: 50%;
  transform: translateX(-50%);
}
.bpgraph-toolbar.is-right {
  right: 8px;
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
  padding: 0 8px;
  color: var(--bpgraph-toolbar-fg, #e8eaed);
  font: 12px/1.4 system-ui, sans-serif;
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
.bpgraph-palette button:focus-visible,
.bpgraph-palette-search:focus-visible {
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
  top: 8px;
  right: 8px;
  bottom: 8px;
  z-index: 1;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  max-width: calc(100% - 16px);
  background: var(--bpgraph-panel-bg, #1d2024);
  color: var(--bpgraph-panel-fg, #e8eaed);
  border: 1px solid var(--bpgraph-panel-border, rgba(255, 255, 255, 0.12));
  border-radius: 12px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.35);
  font: 12px/1.5 system-ui, -apple-system, 'Segoe UI', sans-serif;
  pointer-events: auto;
  overflow: hidden;
}
.bpgraph-node-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 12px;
  border-bottom: 1px solid var(--bpgraph-panel-border, rgba(255, 255, 255, 0.12));
}
.bpgraph-node-panel-title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
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
.bpgraph-node-panel-scroll {
  flex: 1;
  overflow: auto;
}
.bpgraph-node-panel-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 12px;
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
.bpgraph-debug-panel {
  position: absolute;
  top: 8px;
  right: 8px;
  bottom: 8px;
  z-index: 1;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  max-width: calc(100% - 16px);
  overflow: hidden;
  border: 1px solid var(--bpgraph-panel-border, rgba(255, 255, 255, 0.12));
  border-radius: 12px;
  background: var(--bpgraph-panel-bg, #1d2024);
  color: var(--bpgraph-panel-fg, #e8eaed);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.35);
  font: 12px/1.5 system-ui, -apple-system, 'Segoe UI', sans-serif;
  pointer-events: auto;
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
.bpgraph-debug-chain,
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
.bpgraph-debug-chain {
  display: flex;
  flex-direction: column;
}
.bpgraph-debug-chain-item {
  position: relative;
  display: flex;
  gap: 8px;
  padding-bottom: 8px;
}
.bpgraph-debug-chain-item:last-child {
  padding-bottom: 0;
}
.bpgraph-debug-chain-item:not(:last-child)::before {
  content: '';
  position: absolute;
  top: 22px;
  bottom: 0;
  /* Indent subgraph nodes by level, shifting connectors with them. */
  left: calc(9px + var(--bpgraph-chain-depth, 0) * 14px);
  width: 1px;
  background: var(--bpgraph-panel-border, rgba(255, 255, 255, 0.12));
}
.bpgraph-debug-chain-index {
  position: relative;
  z-index: 1;
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: rgba(148, 163, 184, 0.14);
  color: var(--bpgraph-panel-muted, rgba(255, 255, 255, 0.55));
  font-size: 10px;
  font-variant-numeric: tabular-nums;
}
.bpgraph-debug-chain-item.is-running .bpgraph-debug-chain-index {
  background: rgba(34, 211, 238, 0.2);
  color: #a5f3fc;
  box-shadow: 0 0 0 3px rgba(34, 211, 238, 0.12);
}
.bpgraph-debug-chain-item.is-completed .bpgraph-debug-chain-index {
  background: rgba(52, 211, 153, 0.18);
  color: #a7f3d0;
}
.bpgraph-debug-chain-body {
  display: flex;
  flex: 1;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
  padding-top: 1px;
}
.bpgraph-debug-chain-body strong {
  min-width: 0;
  overflow-wrap: anywhere;
  font-size: 12px;
}
.bpgraph-debug-status {
  flex-shrink: 0;
  color: var(--bpgraph-panel-muted, rgba(255, 255, 255, 0.5));
  font-size: 11px;
}
/* Role labels distinguish subgraph calls, entries, and exits from ordinary nodes. */
.bpgraph-debug-chain-tag {
  flex-shrink: 0;
  padding: 0 4px;
  border-radius: 3px;
  background: rgba(56, 189, 248, 0.16);
  color: #7dd3fc;
  font-size: 10px;
  line-height: 1.6;
}
.bpgraph-debug-chain-tag.is-subgraph-start {
  background: rgba(74, 222, 128, 0.16);
  color: #86efac;
}
.bpgraph-debug-chain-tag.is-subgraph-end {
  background: rgba(251, 146, 60, 0.16);
  color: #fdba74;
}
.bpgraph-debug-status.is-running {
  color: #67e8f9;
}
.bpgraph-debug-status.is-paused {
  color: #fbbf24;
}
.bpgraph-debug-status.is-completed {
  color: #6ee7b7;
}
.bpgraph-debug-status.is-failed {
  color: #fca5a5;
}
.bpgraph-debug-status.is-cancelled {
  color: #94a3b8;
}
.bpgraph-debug-status.is-waiting,
.bpgraph-debug-status.is-pending {
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
.bpgraph-debug-log-level {
  padding: 0 4px;
  border-radius: 3px;
  background: rgba(148, 163, 184, 0.14);
  color: #cbd5e1;
  font-size: 10px;
  line-height: 1.5;
}
.bpgraph-debug-log.is-debug .bpgraph-debug-log-level {
  color: #94a3b8;
}
.bpgraph-debug-log.is-success .bpgraph-debug-log-level {
  background: rgba(52, 211, 153, 0.16);
  color: #a7f3d0;
}
.bpgraph-debug-log.is-warn .bpgraph-debug-log-level {
  background: rgba(251, 191, 36, 0.16);
  color: #fde68a;
}
.bpgraph-debug-log.is-error .bpgraph-debug-log-level {
  background: rgba(248, 113, 113, 0.16);
  color: #fecaca;
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
