import { html, nothing } from 'lit-html'
import { styleMap } from 'lit-html/directives/style-map.js'
import { createRef, ref } from 'lit-html/directives/ref.js'
import type { NodeClassType, NodeOptions } from '@lyx-pj/workflow-model'
import type { NodeInstanceType } from '../../Graph'
import type { GraphAdapter } from '../../adapters/GraphAdapter'
import type { CanvasGraph, PaletteItemDescription, PaletteOptions } from '../types'
import { OverlayComponent } from '../OverlayComponent'
import type { OverlayLayer } from '../OverlayLayer'
import { stopEvent, stopWheel } from '../helpers'
import { PaletteTooltip } from './PaletteTooltip'

type Point = { x: number; y: number }
type PaletteDefaults = Omit<NodeOptions<NodeClassType>, 'position'>
type PaletteItem = PaletteItemDescription & {
  nodeClass: NodeClassType
  title: string
  category: string
  /** Entry defaults take precedence over global defaults. */
  defaults?: PaletteDefaults
}

type PaletteDrag = {
  item: PaletteItem
  node: NodeInstanceType
  previousSkips: boolean
}

/** Node palette opened by blank double-click; supports search, click, and drag creation. */
export class Palette extends OverlayComponent {
  private open = false
  private point: Point = { x: 16, y: 16 }
  private client: Point = { x: 0, y: 0 }
  private query = ''
  private category: string | null = null
  private hidden = false
  private drag: PaletteDrag | null = null
  private readonly searchRef = createRef<HTMLInputElement>()
  private readonly panelRef = createRef<HTMLDivElement>()
  private readonly tooltip: PaletteTooltip

  private readonly graph: CanvasGraph
  private readonly adapter: GraphAdapter
  private readonly options: () => PaletteOptions | null

  refreshLanguage() {
    this.render()
  }

  constructor(graph: CanvasGraph, adapter: GraphAdapter, overlay: OverlayLayer, options: () => PaletteOptions | null) {
    super(overlay, 'bpgraph-palette-layer', () => graph.options.language)
    this.graph = graph
    this.adapter = adapter
    this.options = options
    this.tooltip = new PaletteTooltip(overlay)
  }

  isOpen() {
    return this.open
  }

  openAt(clientX?: number, clientY?: number) {
    const client =
      clientX === undefined || clientY === undefined ? this.defaultClientPoint() : { x: clientX, y: clientY }
    this.client = client
    this.point = this.clamp(this.overlay.localPoint(client.x, client.y), 400, 520)
    this.query = ''
    this.category = null
    this.hidden = false
    this.open = true
    this.render()
    const rect = this.panelRef.value?.getBoundingClientRect()
    if (rect?.width && rect.height) {
      this.point = this.clamp(this.point, rect.width, rect.height)
      this.render()
    }
    this.searchRef.value?.focus()
  }

  close() {
    this.tooltip.close()
    if (!this.open) return
    this.open = false
    this.commit(nothing)
  }

  destroy() {
    this.cancelDrag()
    this.tooltip.destroy()
    super.destroy()
  }

  private render() {
    this.tooltip.close()
    if (!this.open) {
      this.commit(nothing)
      return
    }
    const items = this.paletteItems()
    const categories = [...new Set(items.map((item) => item.category))]
    if (this.category !== null && !categories.includes(this.category)) this.category = null
    const matching = this.matchingItems(items)
    const visible = this.visibleItems(matching)
    this.commit(html`
      <div
        ${ref(this.panelRef)}
        class="bpgraph-menu bpgraph-palette ${this.hidden ? 'is-hidden' : ''}"
        role="dialog"
        aria-label=${this.t('Add node')}
        style=${styleMap({
          left: `${this.point.x}px`,
          top: `${this.point.y}px`,
          maxHeight: `${Math.max(0, this.overlay.rect().height - 8)}px`,
        })}
        @pointerdown=${stopEvent}
        @wheel=${stopWheel}
      >
        <div class="bpgraph-palette-header">
          <div>
            <strong>${this.t('Add node')}</strong>
            <p>${this.t('Choose a node to build your workflow')}</p>
          </div>
          <button
            type="button"
            class="bpgraph-palette-close"
            aria-label=${this.t('Close node palette')}
            @click=${() => this.close()}
          >
            ×
          </button>
        </div>
        <input
          ${ref(this.searchRef)}
          class="bpgraph-palette-search"
          aria-label=${this.t('Search nodes')}
          placeholder=${this.t('Search by name, category, or purpose…')}
          .value=${this.query}
          @input=${this.onSearch}
          @keydown=${this.onKeyDown}
        />
        <nav class="bpgraph-palette-categories" aria-label=${this.t('Node categories')}>
          ${[null, ...categories].map(
            (category) => html`
              <button
                type="button"
                class="bpgraph-palette-category"
                aria-pressed=${this.category === category}
                @click=${() => {
                  this.category = category
                  this.render()
                }}
              >
                ${category ?? this.t('All')}<span
                  >${category === null
                    ? matching.length
                    : matching.filter((item) => item.category === category).length}</span
                >
              </button>
            `
          )}
        </nav>
        <div class="bpgraph-palette-list" @scroll=${this.tooltip.close}>
          ${visible.length === 0
            ? html`<div class="bpgraph-palette-empty" role="status">
                ${this.t('No matching nodes')}<br /><small>${this.t('Try another keyword or category')}</small>
              </div>`
            : categories
                .filter((category) => visible.some((item) => item.category === category))
                .map(
                  (category) => html`
                    <section class="bpgraph-palette-group" aria-label=${category}>
                      <h3>${category}<span>${visible.filter((item) => item.category === category).length}</span></h3>
                      ${visible.filter((item) => item.category === category).map((item) => this.itemTemplate(item))}
                    </section>
                  `
                )}
        </div>
        <div class="bpgraph-palette-footer">
          <span>${this.t('Click to add · Drag onto canvas')}</span><span>${this.t('Enter Add first result · Esc to close')}</span>
        </div>
      </div>
    `)
  }

  private itemTemplate(item: PaletteItem) {
    const { nodeClass } = item
    return html`
      <button
        type="button"
        class="bpgraph-menu-item bpgraph-palette-item"
        data-type=${nodeClass.type}
        draggable="true"
        @mouseenter=${(evt: MouseEvent) =>
          this.tooltip.enter(evt.currentTarget as HTMLElement, item.description, 'hover')}
        @mouseleave=${(evt: MouseEvent) => this.tooltip.leave(evt.currentTarget as HTMLElement, 'hover')}
        @focus=${(evt: FocusEvent) => this.tooltip.enter(evt.currentTarget as HTMLElement, item.description, 'focus')}
        @blur=${(evt: FocusEvent) => this.tooltip.leave(evt.currentTarget as HTMLElement, 'focus')}
        @click=${(evt: MouseEvent) =>
          this.createNodeAt(
            item,
            evt.detail === 0 ? this.client.x : evt.clientX,
            evt.detail === 0 ? this.client.y : evt.clientY
          )}
        @dragstart=${(evt: DragEvent) => this.startNodeDrag(evt, item)}
        @dragend=${this.endNodeDrag}
      >
        <span
          class="bpgraph-palette-icon"
          aria-hidden="true"
          style=${styleMap({ background: nodeClass.definition.style?.header?.background })}
          >${item.iconClass
            ? html`<i class=${item.iconClass}></i>`
            : (item.icon ??
              html`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
                <rect x="3" y="3" width="7" height="7" rx="1.5" />
                <rect x="14" y="14" width="7" height="7" rx="1.5" />
                <path d="M10 6.5h7.5v7.5M6.5 10v7.5H14" />
              </svg>`)}</span
        >
        <span class="bpgraph-palette-copy"><span class="bpgraph-palette-title">${item.title}</span></span>
        <span class="bpgraph-palette-add" aria-hidden="true">+</span>
      </button>
    `
  }

  private onSearch = (evt: Event) => {
    this.query = (evt.target as HTMLInputElement).value
    this.render()
  }

  private onKeyDown = (evt: KeyboardEvent) => {
    if (evt.isComposing) return
    if (evt.key === 'Escape') {
      evt.stopPropagation()
      this.close()
      return
    }
    if (evt.key !== 'Enter') return
    evt.preventDefault()
    const [first] = this.visibleItems(this.matchingItems(this.paletteItems()))
    if (!first) return
    this.createNodeAt(first, this.client.x, this.client.y)
  }

  private paletteItems(): PaletteItem[] {
    const options = this.options()
    if (!options) return []
    const classes = options.items
      ? options.items(this.graph)
      : (this.graph.nodeRegistry.getNodeClasses() as NodeClassType[])
    const inSubgraph = this.graph.model.subgraphStack.length > 1
    const inLoopBody = this.graph.model.isLoopBody?.() ?? false
    // Generate loop entries and returns only with their bodies; ordinary loop nodes remain addable.
    const allowed = (nodeClass: NodeClassType) =>
      !['loop-entry', 'loop-return'].includes(nodeClass.definition.type ?? '') &&
      !(inSubgraph && nodeClass.type === 'start') &&
      // Hide event sources and persistent timers inside bodies to avoid engine rejection later.
      !(inLoopBody && nodeClass.definition.executionMode === 'source')
    const regular = classes
      .filter(allowed)
      .map((nodeClass) => {
        const description = options.describe?.(nodeClass, this.graph)
        return {
          ...description,
          nodeClass,
          title: description?.title || this.nodeTitle(nodeClass),
          category: description?.category || this.t('Other nodes'),
        }
      })
    // The same class may appear for multiple resources such as subgraph files.
    // Keep extra entries separate and use their own titles and defaults.
    // Application resource entries, such as subgraph files, appear before ordinary nodes.
    const extra = (options.entries?.(this.graph) ?? [])
      .filter((entry) => allowed(entry.nodeClass))
      .map((entry) => ({
        ...entry,
        title: entry.title || this.nodeTitle(entry.nodeClass),
        category: entry.category || this.t('Other nodes'),
      }))
    return [...extra, ...regular]
  }

  private matchingItems(items: PaletteItem[]) {
    const keyword = this.query.trim().toLowerCase()
    const matching = items.filter((item) =>
      [
        item.title,
        this.nodeTitle(item.nodeClass),
        item.nodeClass.type,
        item.category,
        item.description,
        ...(item.keywords ?? []),
      ]
        .join(' ')
        .toLowerCase()
        .includes(keyword)
    )
    // Preserve category order after search so Enter matches the first visible result.
    return [...new Set(items.map((item) => item.category))].flatMap((category) =>
      matching.filter((item) => item.category === category)
    )
  }

  private visibleItems(items: PaletteItem[]) {
    return items.filter((item) => this.category === null || item.category === this.category)
  }

  private createNodeAt(item: PaletteItem, clientX: number, clientY: number) {
    this.graph.startTransaction()
    const node = this.graph.addNode(item.nodeClass, this.paletteDefaults(item))
    this.moveNode(node, clientX, clientY)
    this.graph.commitTransaction()
    this.close()
  }

  private startNodeDrag(evt: DragEvent, item: PaletteItem) {
    if (!evt.dataTransfer) return
    const { nodeClass } = item
    // Menu presses may leave a canvas selection origin; clear it before dragging.
    this.adapter.cancelSelection()
    evt.dataTransfer.effectAllowed = 'copy'
    evt.dataTransfer.setData('text/plain', nodeClass.type)

    const previousSkips = this.graph.skipsUndoManager
    this.graph.skipsUndoManager = true
    const node = this.graph.addNode(nodeClass, this.paletteDefaults(item))
    this.moveNode(node, evt.clientX, evt.clientY)

    this.drag = { item, node, previousSkips }
    document.addEventListener('dragover', this.onDragOver, true)
    document.addEventListener('dragend', this.endNodeDrag, true)
    // Retain the DOM during drag to avoid interrupting it; hide through templates only.
    this.hidden = true
    this.render()
  }

  private onDragOver = (evt: DragEvent) => {
    evt.preventDefault()
    if (!this.drag) return
    this.moveNode(this.drag.node, evt.clientX, evt.clientY)
  }

  private endNodeDrag = () => {
    const drag = this.drag
    if (!drag) return
    this.drag = null
    this.detachDragListeners()

    // The dragged node is only a preview; commit one undoable command on completion.
    this.graph.removeNodes([drag.node])
    this.graph.skipsUndoManager = drag.previousSkips
    const position = { ...drag.node.position }
    this.graph.startTransaction()
    this.graph.addNode(drag.item.nodeClass, { ...this.paletteDefaults(drag.item), position })
    this.graph.commitTransaction()
    this.close()
  }

  private cancelDrag() {
    const drag = this.drag
    if (!drag) return
    this.drag = null
    this.detachDragListeners()
    this.graph.removeNodes([drag.node])
    this.graph.skipsUndoManager = drag.previousSkips
  }

  private detachDragListeners() {
    document.removeEventListener('dragover', this.onDragOver, true)
    document.removeEventListener('dragend', this.endNodeDrag, true)
  }

  private moveNode(node: NodeInstanceType, clientX: number, clientY: number) {
    const point = this.graph.clientToGraphPoint(clientX, clientY)
    const size = this.adapter.getNodeSize(node.id)
    node.position = {
      x: point.x - (size?.width ?? 0) / 2,
      y: point.y - (size?.height ?? 0) / 2,
    }
  }

  private paletteDefaults(item: PaletteItem): NodeOptions<NodeClassType> {
    const globalDefaults = this.options()?.defaults?.(item.nodeClass, this.graph) ?? {}
    return {
      ...globalDefaults,
      ...item.defaults,
    } as NodeOptions<NodeClassType>
  }

  private nodeTitle(nodeClass: NodeClassType) {
    return nodeClass.definition.title || nodeClass.type
  }

  private defaultClientPoint(): Point {
    const rect = this.overlay.rect()
    return { x: rect.left + 16, y: rect.top + 16 }
  }

  private clamp(point: Point, width: number, height: number): Point {
    const rect = this.overlay.rect()
    return {
      x: Math.max(4, Math.min(point.x, rect.width - width - 4)),
      y: Math.max(4, Math.min(point.y, rect.height - height - 4)),
    }
  }
}
