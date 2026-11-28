import { html, nothing, type TemplateResult } from 'lit-html'
import { live } from 'lit-html/directives/live.js'
import { styleMap } from 'lit-html/directives/style-map.js'
import type { InputPort, NodeStyle } from '@lyx-pj/primflow-model'

/** Port editor callbacks route interactions to views while templates remain pure. */
export interface PortEditorHandlers {
  input: (port: InputPort, evt: Event) => void
  focus: (port: InputPort, evt: Event) => void
  blur: (port: InputPort, evt: Event) => void
  toggle: (port: InputPort) => void
  step: (port: InputPort, delta: number) => void
}

/**
 * lit templates for port editors.
 *
 * JointJS port markup provides only the `portEditor` mount point.
 * Declare editor structure and interactions here.
 */
export function portEditorTemplate(
  port: InputPort,
  style: NodeStyle,
  values: Record<string, unknown>,
  handlers: PortEditorHandlers
): TemplateResult | typeof nothing {
  switch (port.editor ?? port.type) {
    case 'string':
      return html`
        <pf-field size="xs" class="bpgraph-port-field-wrap" style=${styleMap(fieldHostStyle(style))}>
          <input
            class="bpgraph-port-field"
            data-port-field=${port.name}
            type="text"
            aria-label=${port.label || port.name}
            title=${String(values[port.name] ?? '')}
            .value=${live(String(values[port.name] ?? ''))}
            @input=${(evt: Event) => handlers.input(port, evt)}
          />
        </pf-field>
      `
    case 'number':
      return html`
        <pf-field size="xs" class="bpgraph-port-field-wrap" style=${styleMap(fieldHostStyle(style))}>
          <input
            class="bpgraph-port-field"
            data-port-field=${port.name}
            type="text"
            aria-label=${port.label || port.name}
            title=${String(values[port.name] ?? '')}
            .value=${live(String(values[port.name] ?? ''))}
            @input=${(evt: Event) => handlers.input(port, evt)}
            @blur=${(evt: Event) => handlers.blur(port, evt)}
          />
          <svg slot="suffix" class="bpgraph-port-stepper" width="12" height="20" viewBox="0 0 12 20">
            <rect
              class="bpgraph-port-step"
              width="12"
              height="11"
              y="0"
              fill="transparent"
              @click=${() => handlers.step(port, 1)}
            />
            <rect
              class="bpgraph-port-step"
              width="12"
              height="11"
              y="11"
              fill="transparent"
              @click=${() => handlers.step(port, -1)}
            />
            <path d="M2 8 L6 4 L10 8" stroke="currentColor" stroke-width="1.2" fill="transparent" pointer-events="none" />
            <path
              d="M2 3 L6 7 L10 3"
              stroke="currentColor"
              stroke-width="1.2"
              fill="transparent"
              pointer-events="none"
              transform="translate(0,11)"
            />
          </svg>
        </pf-field>
      `
    case 'select': {
      const label = port._options?.find((option) => option.value === values[port.name])?.label || ''
      return html`
        <pf-field size="xs" class="bpgraph-port-field-wrap" style=${styleMap(fieldHostStyle(style))}>
          <input
            class="bpgraph-port-field bpgraph-port-select"
            data-port-field=${port.name}
            type="text"
            aria-label=${port.label || port.name}
            title=${label}
            style=${styleMap({ cursor: 'pointer' })}
            .value=${live(label)}
            @focus=${(evt: Event) => handlers.focus(port, evt)}
            @input=${(evt: Event) => handlers.input(port, evt)}
          />
          <svg slot="suffix" class="bpgraph-port-chevron" width="12" height="12" viewBox="0 0 12 12">
            <path d="M2 4 L6 8 L10 4" stroke="currentColor" stroke-width="1.5" fill="transparent" />
          </svg>
        </pf-field>
      `
    }
    case 'boolean':
      return booleanTemplate(port, style, values, handlers)
    default:
      return nothing
  }
}

function booleanTemplate(
  port: InputPort,
  _style: NodeStyle,
  values: Record<string, unknown>,
  handlers: PortEditorHandlers
): TemplateResult {
  const checked = Boolean(values[port.name])
  return html`
    <pf-switch size="sm" ?checked=${checked}>
      <input
        class="bpgraph-port-checkbox"
        data-port-field=${port.name}
        type="checkbox"
        aria-label=${port.label || port.name}
        .checked=${live(checked)}
        @change=${() => handlers.toggle(port)}
      />
    </pf-switch>
  `
}

function fieldHostStyle(style: NodeStyle): Record<string, string | undefined> {
  const box = style.ports?.input?.editor?.box
  return {
    '--pf-border-default': box?.borderColor,
    '--pf-surface-input': box?.background,
    '--pf-fg-primary': box?.color,
    '--pf-radius-xs': box?.borderRadius !== undefined ? `${box.borderRadius}px` : undefined,
    fontSize: box?.fontSize !== undefined ? `${box.fontSize}px` : undefined,
  }
}
