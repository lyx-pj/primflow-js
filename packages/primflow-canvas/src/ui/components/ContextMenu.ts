import { html, nothing } from 'lit-html'
import { styleMap } from 'lit-html/directives/style-map.js'
import { createRef, ref } from 'lit-html/directives/ref.js'
import type { CanvasGraph, ContextMenuContext, ContextMenuItem, ContextMenuOptions } from '../types'
import { OverlayComponent } from '../OverlayComponent'
import type { OverlayLayer } from '../OverlayLayer'
import { stopEvent, stopWheel } from '../helpers'
import { isMac } from '../../utils/KeyboardManager'

type Point = { x: number; y: number }

type ContextMenuState = {
  point: Point
  items: ContextMenuItem[]
  context: ContextMenuContext
}

/** Built-in menus work without an icon font library. */
const iconPaths: Record<string, string> = {
  'add-node': 'M4 4h16v16H4z M12 8v8 M8 12h8',
  back: 'M15 18l-6-6 6-6 M9 12h12',
  copy: 'M8 8h12v12H8z M16 8V4H4v12h4',
  paste: 'M9 5H5v16h14V5h-4 M9 3h6v4H9z M8 12h8 M8 16h6',
  breakpoint:
    'M8 8h8a2 2 0 0 1 2 2v6a6 6 0 0 1-12 0v-6a2 2 0 0 1 2-2Z M9 8V6a3 3 0 0 1 6 0v2 M8 2l2 2 M16 2l-2 2 M12 9v12 M3 9l3 2 M2 15h4 M3 21l4-3 M21 9l-3 2 M22 15h-4 M21 21l-4-3',
  delete: 'M4 6h16 M9 6V3h6v3 M6 6l1 15h10l1-15 M10 10v7 M14 10v7',
}

/** Canvas context menu with default breakpoint, copy, and delete actions; applications may replace it. */
export class ContextMenu extends OverlayComponent {
  private state: ContextMenuState | null = null
  private readonly menuRef = createRef<HTMLDivElement>()

  private readonly graph: CanvasGraph
  private readonly options: () => ContextMenuOptions | null
  private readonly openPalette: (clientX: number, clientY: number) => void

  refreshLanguage() {
    if (this.state && !this.options()?.items) {
      this.state.items = this.defaultItems(this.state.context)
    }
    this.render()
  }

  constructor(
    graph: CanvasGraph,
    overlay: OverlayLayer,
    options: () => ContextMenuOptions | null,
    openPalette: (clientX: number, clientY: number) => void
  ) {
    super(overlay, 'bpgraph-context-layer', () => graph.options.language)
    this.graph = graph
    this.options = options
    this.openPalette = openPalette
  }

  isOpen() {
    return this.state !== null
  }

  open(clientX: number, clientY: number, target: Pick<ContextMenuContext, 'target' | 'node' | 'link'>) {
    const options = this.options()
    if (!options) return
    const context: ContextMenuContext = {
      graph: this.graph,
      clientX,
      clientY,
      ...target,
    }
    const items = options.items?.(context) ?? this.defaultItems(context)
    if (items.length === 0) return
    const origin = this.overlay.localPoint(clientX, clientY)
    const point = this.clamp(origin, 240, items.length * 40 + 44)
    this.state = { point, items, context }
    this.render()
    const rect = this.menuRef.value?.getBoundingClientRect()
    if (rect?.width && rect.height) {
      this.state.point = this.clamp(origin, rect.width, rect.height)
      this.render()
    }
  }

  close() {
    if (!this.state) return
    this.state = null
    this.commit(nothing)
  }

  private render() {
    const state = this.state
    if (!state) {
      this.commit(nothing)
      return
    }
    this.commit(html`
      <div
        ${ref(this.menuRef)}
        class="bpgraph-menu bpgraph-context"
        aria-label=${this.t('Context menu')}
        style=${styleMap({
          left: `${state.point.x}px`,
          top: `${state.point.y}px`,
          maxHeight: `${Math.max(0, this.overlay.rect().height - 8)}px`,
        })}
        @pointerdown=${stopEvent}
        @contextmenu=${stopEvent}
        @wheel=${stopWheel}
      >
        <div class="bpgraph-context-heading">
          ${state.context.target === 'blank' ? this.t('Canvas actions') : state.context.target === 'node' ? this.t('Node actions') : this.t('Link actions')}
        </div>
        ${state.items.map(
          (item, index) => html`
            ${index > 0 && item.separatorBefore
              ? html`<div class="bpgraph-context-separator" role="separator"></div>`
              : nothing}
            <button
              type="button"
              class="bpgraph-menu-item bpgraph-context-item ${item.danger ? 'is-danger' : ''}"
              ?disabled=${Boolean(item.disabled)}
              data-id=${item.id}
              @click=${() => this.run(item)}
            >
              <span class="bpgraph-context-icon" aria-hidden="true">${this.icon(item)}</span>
              <span class="bpgraph-context-label">${item.label}</span>
              ${item.shortcut
                ? html`<span class="bpgraph-menu-shortcut">
                    ${item.id === 'add-node' && item.shortcut === this.t('Double-click')
                      ? html`<span class="bpgraph-context-hint">${item.shortcut}</span>`
                      : html`<kbd>${item.shortcut}</kbd>`}
                  </span>`
                : nothing}
            </button>
          `
        )}
      </div>
    `)
  }

  private icon(item: ContextMenuItem) {
    const iconClass = item.iconClass ?? this.options()?.icons?.[item.id]
    if (iconClass) return html`<i class=${iconClass}></i>`
    const path = iconPaths[item.id]
    return path
      ? html`<svg
          width="17"
          height="17"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.7"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d=${path} />
        </svg>`
      : nothing
  }

  private run(item: ContextMenuItem) {
    const state = this.state
    if (!state || item.disabled) return
    this.close()
    item.run(state.context)
  }

  private defaultItems(context: ContextMenuContext): ContextMenuItem[] {
    const modifier = isMac() ? '⌘' : 'Ctrl'
    if (context.target === 'blank') {
      const canGoBack = this.graph.canGoBack()
      return [
        ...(canGoBack
          ? [
              {
                id: 'back',
                label: this.t('Back'),
                shortcut: 'Esc',
                run: () => this.graph.goBack(),
              },
            ]
          : []),
        {
          id: 'add-node',
          label: this.t('Add node'),
          shortcut: this.t('Double-click'),
          separatorBefore: canGoBack,
          run: (ctx) => this.openPalette(ctx.clientX, ctx.clientY),
        },
        {
          id: 'paste',
          label: this.t('Paste'),
          shortcut: `${modifier}+V`,
          separatorBefore: true,
          run: () => this.graph.pasteClipboard(),
        },
      ]
    }
    return [
      ...(context.node
        ? [
            {
              id: 'breakpoint',
              label: context.node.breakpoint ? this.t('Remove breakpoint') : this.t('Set breakpoint'),
              run: () => {
                context.node!.breakpoint = !context.node!.breakpoint
              },
            },
          ]
        : []),
      {
        id: 'copy',
        label: this.t('Copy'),
        shortcut: `${modifier}+C`,
        separatorBefore: Boolean(context.node),
        run: () => this.graph.copySelection(),
      },
      {
        id: 'delete',
        label: this.t('Delete'),
        shortcut: isMac() ? '⌫' : 'Del',
        separatorBefore: true,
        danger: true,
        disabled: !this.graph.canDeleteSelection(),
        run: () => this.graph.deleteSelection(),
      },
    ]
  }

  private clamp(point: Point, width: number, height: number): Point {
    const rect = this.overlay.rect()
    return {
      x: Math.max(4, Math.min(point.x, rect.width - width - 4)),
      y: Math.max(4, Math.min(point.y, rect.height - height - 4)),
    }
  }
}
