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
        <input
          class="bpgraph-port-field"
          data-port-field=${port.name}
          type="text"
          aria-label=${port.label || port.name}
          title=${String(values[port.name] ?? '')}
          style=${styleMap(fieldStyle(style))}
          .value=${live(String(values[port.name] ?? ''))}
          @input=${(evt: Event) => handlers.input(port, evt)}
        />
      `
    case 'number':
      return html`
        <input
          class="bpgraph-port-field"
          data-port-field=${port.name}
          type="text"
          aria-label=${port.label || port.name}
          title=${String(values[port.name] ?? '')}
          style=${styleMap({ ...fieldStyle(style), paddingRight: '16px' })}
          .value=${live(String(values[port.name] ?? ''))}
          @input=${(evt: Event) => handlers.input(port, evt)}
          @blur=${(evt: Event) => handlers.blur(port, evt)}
        />
        <svg class="bpgraph-port-stepper" width="12" height="20" viewBox="0 0 12 20">
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
      `
    case 'select': {
      const label = port._options?.find((option) => option.value === values[port.name])?.label || ''
      return html`
        <input
          class="bpgraph-port-field bpgraph-port-select"
          data-port-field=${port.name}
          type="text"
          aria-label=${port.label || port.name}
          title=${label}
          style=${styleMap({ ...fieldStyle(style), paddingRight: '16px', cursor: 'pointer' })}
          .value=${live(label)}
          @focus=${(evt: Event) => handlers.focus(port, evt)}
          @input=${(evt: Event) => handlers.input(port, evt)}
        />
        <svg class="bpgraph-port-chevron" width="12" height="12" viewBox="0 0 12 12">
          <path d="M2 4 L6 8 L10 4" stroke="currentColor" stroke-width="1.5" fill="transparent" />
        </svg>
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
  style: NodeStyle,
  values: Record<string, unknown>,
  handlers: PortEditorHandlers
): TemplateResult {
  const box = style.ports?.input?.editor?.box
  return html`
    <input
      class="bpgraph-port-checkbox"
      data-port-field=${port.name}
      type="checkbox"
      aria-label=${port.label || port.name}
      style=${styleMap({ accentColor: box?.color ?? '#ff6666' })}
      .checked=${live(Boolean(values[port.name]))}
      @change=${() => handlers.toggle(port)}
    />
  `
}

function fieldStyle(style: NodeStyle) {
  const box = style.ports?.input?.editor?.box
  return {
    outline: 'none',
    boxSizing: 'border-box' as const,
    width: '100%',
    height: '22px',
    maxHeight: '100%',
    minWidth: '0',
    lineHeight: 'normal',
    paddingLeft: '4px',
    paddingRight: '4px',
    border: `1px solid ${box?.borderColor ?? 'rgba(255, 255, 255, 0.2)'}`,
    background: box?.background ?? 'transparent',
    color: box?.color ?? '#fff',
    fontSize: `${box?.fontSize ?? 12}px`,
    borderRadius: `${box?.borderRadius ?? 4}px`,
  }
}
