import { html, nothing, type TemplateResult } from 'lit-html'
import { ref } from 'lit-html/directives/ref.js'
import { isSpacerPort } from '@lyx-pj/primflow-model'
import type { NodeInstanceType } from '../../../Graph'
import { translate, type CanvasLanguage } from '../../../ui/i18n'
import type { NodeRendererRegistration, PortLayoutContext } from '../../../ui/nodeRenderers'
import type { CanvasGraph } from '../../../ui/types'

/** Expanded container card size. */
export const CONTAINER_CARD_WIDTH = 280
export const CONTAINER_CARD_HEIGHT = 180
/** Collapsed container card size. */
export const CONTAINER_CARD_COLLAPSED_WIDTH = 200
export const CONTAINER_CARD_COLLAPSED_HEIGHT = 56

/** Kind of region a container card represents. */
export type ContainerCardVariant = 'subgraph' | 'loop'

/** Card size for one collapse state; shared with the adapter that resizes a toggled card. */
export function containerCardSize(collapsed: boolean) {
  return collapsed
    ? { width: CONTAINER_CARD_COLLAPSED_WIDTH, height: CONTAINER_CARD_COLLAPSED_HEIGHT }
    : { width: CONTAINER_CARD_WIDTH, height: CONTAINER_CARD_HEIGHT }
}

/** Internal marker so the adapter only resizes built-in container cards. */
export type ContainerCardRegistration = NodeRendererRegistration & {
  containerCard: ContainerCardVariant
  /** Backward-compatible marker for subgraph cards. */
  subgraphCard?: true
}

export function isContainerCardRenderer(
  renderer: NodeRendererRegistration | undefined,
): renderer is ContainerCardRegistration {
  const variant = (renderer as ContainerCardRegistration | undefined)?.containerCard
  return variant === 'subgraph' || variant === 'loop'
}

/** Preview host owned by the canvas; the card only supplies the mount point. */
export interface ContainerPreviewHost {
  /** Mount (or refresh) the preview of one region inside a card slot. */
  attach(slot: HTMLElement, node: NodeInstanceType): void
  /** Release the slot; called when the card body is replaced or removed. */
  detach(slot: HTMLElement): void
}

type PreviewGraph = CanvasGraph & { subgraphPreviews?: ContainerPreviewHost }

function previewHost(graph: CanvasGraph | undefined): ContainerPreviewHost | undefined {
  return (graph as PreviewGraph | undefined)?.subgraphPreviews
}

function languageOf(graph: CanvasGraph | undefined): CanvasLanguage {
  return graph?.options.language ?? 'en'
}

function titleOf(node: NodeInstanceType): string {
  return node.title || node.definition.name || node.definitionId
}

function stopPointer(evt: Event) {
  evt.stopPropagation()
}

function toggleCollapsed(node: NodeInstanceType) {
  node.collapsed = !node.collapsed
}

/** Non-spacer ports on one side, used for even card-edge placement. */
function portsOf(node: NodeInstanceType, group: 'in' | 'out') {
  const ports = group === 'in' ? node.inputs : node.outputs
  return [...ports].filter((port) => !isSpacerPort(port.type))
}

/**
 * Place one port on the card border.
 *
 * The title bar stays clear at the top; remaining ports are distributed over
 * the available edge so a card with extra application ports still reads.
 */
export function containerCardPortPosition(
  node: NodeInstanceType,
  context: PortLayoutContext,
): { x: number; y: number } {
  const { port, group, width, height } = context
  const ports = portsOf(node, group)
  const index = ports.findIndex((item) => item.id === port.id || item.name === port.name)
  if (node.collapsed) {
    // The compact card only has room for one row per edge. Spread the two
    // ports below the header so they keep 24px center spacing.
    const top = 28
    const bottom = Math.max(top, height - 4)
    const y = ports.length > 1
      ? top + ((index < 0 ? 0 : index) * (bottom - top)) / (ports.length - 1)
      : height / 2
    return { x: group === 'in' ? 0 : width, y }
  }
  const count = Math.max(1, ports.length)
  const top = 30
  const bottom = Math.max(top, height - 10)
  const span = bottom - top
  const y = ports.length > 0
    ? top + ((index < 0 ? 0 : index) + 0.5) * (span / count)
    : height / 2
  return { x: group === 'in' ? 0 : width, y }
}

/** Variant-specific presentation hooks shared by the card and its preview placeholder. */
export interface ContainerCardOptions {
  variant: ContainerCardVariant
  /** Translation key for the expand control's accessible name. */
  expandLabel: string
  /** Translation key for the collapse control's accessible name. */
  collapseLabel: string
  /** Optional header glyph, rendered before the title text. */
  icon?: TemplateResult
  /** Optional header content rendered after the title text. */
  headerExtra?: (node: NodeInstanceType, language: CanvasLanguage) => TemplateResult | typeof nothing
  /** Translation key for the generic preview placeholder badge. */
  badgeLabel: string
}

/**
 * Built-in presentation for a container call node.
 *
 * The card owns its header, title, breakpoint marker, and preview slot. Ports,
 * links, selection, execution visuals, and double-click navigation keep using
 * the normal node pipeline.
 */
export function createContainerCardRenderer(
  graph: CanvasGraph,
  instance: NodeInstanceType,
  options: ContainerCardOptions,
): NodeRendererRegistration {
  let previewSlot: HTMLElement | null = null
  const previewRef = (element: Element | undefined, target: NodeInstanceType) => {
    const host = previewHost(graph)
    if (!(element instanceof HTMLElement)) {
      if (previewSlot) host?.detach(previewSlot)
      previewSlot = null
      return
    }
    previewSlot = element
    host?.attach(element, target)
  }
  const registration: ContainerCardRegistration = {
    size: containerCardSize(instance.collapsed),
    containerCard: options.variant,
    ...(options.variant === 'subgraph' ? { subgraphCard: true as const } : {}),
    header: false,
    body: true,
    portPosition: (context) => containerCardPortPosition(instance, context),
    portEditorPosition: ({ group, width, height }) => ({
      x: group === 'in' ? 18 : width - 98,
      y: height / 2 - 10,
    }),
    render: ({ node }) => {
      const target = node ?? instance
      const collapsed = target.collapsed
      const language = languageOf(graph)
      const replaying = graph.isReplayMode()
      // The preview host owns its children imperatively; a Lit child part here
      // would be ejected when the manager mounts the cloned SVG.
      return html`
        <div
          class="bpgraph-subgraph-card bpgraph-container-card${collapsed ? ' is-collapsed' : ''}${options.variant === 'loop' ? ' is-loop' : ''}"
          data-container-card=${options.variant}
        >
          <button
            type="button"
            class="bpgraph-subgraph-toggle"
            aria-expanded=${collapsed ? 'false' : 'true'}
            aria-label=${translate(collapsed ? options.expandLabel : options.collapseLabel, language)}
            title=${translate(
              replaying
                ? 'Collapse is disabled during replay'
                : collapsed ? options.expandLabel : options.collapseLabel,
              language,
            )}
            ?disabled=${replaying}
            @mousedown=${stopPointer}
            @pointerdown=${stopPointer}
            @touchstart=${stopPointer}
            @dblclick=${stopPointer}
            @click=${(evt: Event) => {
              stopPointer(evt)
              if (replaying) return
              toggleCollapsed(target)
            }}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M9 6 L15 12 L9 18" />
            </svg>
          </button>
          <span class="bpgraph-subgraph-title" title=${titleOf(target)}>
            ${options.icon ?? nothing}
            <span class="bpgraph-subgraph-title-text">${titleOf(target)}</span>
            ${options.headerExtra?.(target, language) ?? nothing}
          </span>
          ${target.breakpoint
            ? html`<span
                class="bpgraph-subgraph-breakpoint"
                role="img"
                aria-label=${translate('Breakpoint', language)}
                title=${translate('Breakpoint: pause before execution while debugging', language)}
              ></span>`
            : nothing}
          ${collapsed
            ? nothing
            : html`
                <div
                  class="bpgraph-subgraph-preview"
                  data-preview-state="pending"
                  ${ref((element) => previewRef(element, target))}
                ></div>
              `}
        </div>
      `
    },
  }
  return registration
}

/**
 * Placeholder rendering for a container node that appears inside a preview.
 *
 * Previews never recurse: a nested container keeps its size and ports but
 * shows a simple labelled card instead of another preview.
 */
export function createContainerPlaceholderRenderer(
  graph: CanvasGraph,
  instance: NodeInstanceType,
  options: ContainerCardOptions,
): NodeRendererRegistration {
  const registration: ContainerCardRegistration = {
    size: containerCardSize(instance.collapsed),
    containerCard: options.variant,
    ...(options.variant === 'subgraph' ? { subgraphCard: true as const } : {}),
    header: false,
    body: true,
    portPosition: (context) => containerCardPortPosition(instance, context),
    portEditorPosition: ({ group, width, height }) => ({
      x: group === 'in' ? 18 : width - 98,
      y: height / 2 - 10,
    }),
    render: ({ node }) => {
      const target = node ?? instance
      const language = languageOf(graph)
      return html`
        <div
          class="bpgraph-subgraph-card bpgraph-container-card is-generic${target.collapsed ? ' is-collapsed' : ''}${options.variant === 'loop' ? ' is-loop' : ''}"
          data-container-card=${options.variant}
        >
          <span class="bpgraph-subgraph-title" title=${titleOf(target)}>
            <span class="bpgraph-subgraph-title-text">${titleOf(target)}</span>
          </span>
          <span class="bpgraph-subgraph-badge">${translate(options.badgeLabel, language)}</span>
        </div>
      `
    },
  }
  return registration
}
