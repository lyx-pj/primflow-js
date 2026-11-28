import { ChangedEventType, type JsonGraph } from '@lyx-pj/primflow-model'
import { translate } from '../ui/i18n'
import type { CanvasGraph } from '../ui/types'
import type { NodeInstanceType } from '../Graph'
import { serializeLinks, serializeNodes } from '../utils/serializer'
import {
  parseCachedPreview,
  serializeCachedPreview,
  subgraphPreviewKey,
  type CachedSubgraphPreview,
  type SubgraphPreviewCacheAdapter,
} from './previewCache'
import { buildPreview, type PreviewResult } from './previewGraph'
import { renderRegionSchematic, type RegionSchematicSource } from './regionSchematic'

interface SlotRecord {
  slot: HTMLElement
  node: NodeInstanceType
  targetId: string
  /** Render generation; a stale completion must not overwrite a newer preview. */
  token: number
  observerTarget: Element
  visible: boolean
}

interface CachedPreview {
  /** Content and language key of the rendered result. */
  key: string
  /** Manager revision that produced the result; negative marks a hydrated entry. */
  revision: number
  result: PreviewResult
  /** Serialized SVG last handed to the application cache, when persistence applies. */
  persisted?: string
}

interface PreviewSource {
  nodes: JsonGraph['nodes']
  links: JsonGraph['links']
}

/** Rendered previews kept in memory; the application owns the persistent copy. */
const PREVIEW_CACHE_LIMIT = 32

/**
 * Container card preview orchestration (subgraph calls and loop cards).
 *
 * Cards only provide a mount point; this manager decides what to render, when
 * the card is visible, and when a cached preview is stale. Embedded regions
 * (subgraphs and loop bodies) are read from the current graph model; external
 * subgraph JSON arrives through `setSubgraphSources` / `updateSubgraphSource`.
 * The canvas never reads application storage, and optional persistence goes
 * through an application-provided `SubgraphPreviewCacheAdapter` for external
 * sources only.
 *
 * Caching is lenient: a card mounts the last preview for its target as soon as
 * it becomes visible, then rebuilds in the background and replaces the image
 * only when the rendered output changed. Embedded regions without a cached
 * image first receive a synchronous structural schematic.
 */
export class SubgraphPreviewManager {
  private readonly graph: CanvasGraph
  private readonly sources = new Map<string, JsonGraph>()
  private readonly slots = new Map<HTMLElement, SlotRecord>()
  private readonly cache = new Map<string, CachedPreview>()
  private readonly pending = new Map<string, Promise<PreviewResult | null>>()
  /** Serialize hidden-paper renders so many visible cards do not allocate papers at once. */
  private buildQueue: Promise<unknown> = Promise.resolve()
  private readonly observer: IntersectionObserver | null
  private adapter: SubgraphPreviewCacheAdapter | null = null
  private revision = 0
  private destroyed = false

  constructor(graph: CanvasGraph) {
    this.graph = graph
    this.graph.on('changed', this.onGraphChanged)
    this.graph.on('node:removed', this.onNodesRemoved)
    this.observer = typeof IntersectionObserver === 'undefined'
      ? null
      : new IntersectionObserver(this.onIntersect, {
        root: graph.container ?? null,
        threshold: 0.01,
      })
  }

  /** Replace the complete external-subgraph source map. */
  setSources(sources: Record<string, JsonGraph> | Map<string, JsonGraph>) {
    const previous = new Set(this.sources.keys())
    this.sources.clear()
    for (const [id, json] of sources instanceof Map ? sources : Object.entries(sources)) {
      this.sources.set(id, json)
    }
    for (const id of previous) {
      if (!this.sources.has(id)) this.forget(id)
    }
    // Persisted entries only exist for external sources; drop hydrated orphans.
    for (const [targetId, entry] of this.cache) {
      if (entry.persisted !== undefined && !this.sources.has(targetId)) this.forget(targetId)
    }
    this.invalidate()
  }

  /** Update or remove one external-subgraph source. */
  updateSource(id: string, json: JsonGraph | null) {
    if (json) this.sources.set(id, json)
    else {
      this.sources.delete(id)
      this.forget(id)
    }
    this.invalidate()
  }

  /** Install or clear the application-owned persistence adapter. */
  setCacheAdapter(adapter: SubgraphPreviewCacheAdapter | null) {
    this.adapter = adapter
    // A new adapter starts from its own persisted state; allow entries to be saved again.
    for (const entry of this.cache.values()) entry.persisted = undefined
  }

  /**
   * Load persisted previews into memory.
   *
   * Applications await this during startup, before restoring a view, so the
   * first card mount already finds its cached image.
   */
  async preload() {
    if (!this.adapter || this.destroyed) return
    let entries: Record<string, CachedSubgraphPreview>
    try {
      entries = await this.adapter.load()
    } catch {
      return
    }
    if (this.destroyed || !entries) return
    for (const [targetId, entry] of Object.entries(entries)) {
      const result = parseCachedPreview(entry)
      if (!result) continue
      this.remember(targetId, {
        key: entry.key,
        // Hydrated entries are always revalidated once the card is visible.
        revision: -1,
        result,
        persisted: entry.svg,
      })
    }
    for (const record of this.slots.values()) {
      if (record.visible) this.renderSlot(record)
    }
  }

  /** Attach a card preview slot; called from the card renderer on each render. */
  attach(slot: HTMLElement, node: NodeInstanceType) {
    if (this.destroyed) return
    const targetId = node.targetGraphId
    const existing = this.slots.get(slot)
    if (existing) {
      if (existing.targetId === (targetId ?? '')) {
        existing.node = node
        const nextObserverTarget = slot.closest('g') ?? slot
        if (existing.observerTarget !== nextObserverTarget) {
          this.observer?.unobserve(existing.observerTarget)
          existing.observerTarget = nextObserverTarget
          this.observe(existing)
        }
        this.renderSlot(existing)
        return
      }
      this.observer?.unobserve(existing.observerTarget)
      existing.node = node
      existing.targetId = targetId ?? ''
      existing.visible = !this.observer
      existing.token += 1
      slot.replaceChildren()
      slot.removeAttribute('data-preview-cache')
      slot.removeAttribute('data-schematic-key')
      this.observe(existing)
      if (!targetId) {
        this.showEmpty(slot, translate('No preview', this.language()))
        return
      }
      this.mountInitial(slot, targetId)
      if (!this.observer) this.renderSlot(existing)
      return
    }
    const observerTarget = slot.closest('g') ?? slot
    const record: SlotRecord = {
      slot,
      node,
      targetId: targetId ?? '',
      token: 0,
      observerTarget,
      visible: !this.observer,
    }
    this.slots.set(slot, record)
    if (!targetId) {
      this.showEmpty(slot, translate('No preview', this.language()))
      return
    }
    this.mountInitial(slot, targetId)
    this.observe(record)
    if (!this.observer) this.renderSlot(record)
  }

  /**
   * Paint the best content available before any hidden-paper work starts.
   *
   * A memory or preloaded preview is mounted immediately. An embedded region
   * gets a synchronous schematic so a cold start still shows a first frame;
   * only an external source without a cached image waits on the shimmer.
   */
  private mountInitial(slot: HTMLElement, targetId: string) {
    const cached = this.cache.get(targetId)
    if (cached) {
      this.mount(slot, cached.result, true)
      return
    }
    if (this.showSchematic(slot, targetId)) return
    this.showPending(slot)
  }

  /** Release one card slot. */
  detach(slot: HTMLElement) {
    const record = this.slots.get(slot)
    if (!record) return
    this.observer?.unobserve(record.observerTarget)
    this.slots.delete(slot)
  }

  /**
   * Drop every mounted slot.
   *
   * A graph replacement keeps rendered previews so the next view can mount
   * them immediately; explicit clears and destroy drop the cache as well.
   */
  resetSlots(options: { keepCache?: boolean } = {}) {
    for (const record of this.slots.values()) this.observer?.unobserve(record.observerTarget)
    this.slots.clear()
    if (!options.keepCache) this.cache.clear()
    this.pending.clear()
    this.revision += 1
  }

  /** Refresh visible cards without dropping cached images. */
  invalidate() {
    if (this.destroyed) return
    this.revision += 1
    // Cached previews stay available; visible cards revalidate in the background.
    for (const record of this.slots.values()) {
      if (record.visible) this.renderSlot(record)
    }
  }

  destroy() {
    if (this.destroyed) return
    this.destroyed = true
    this.observer?.disconnect()
    this.graph.off('changed', this.onGraphChanged)
    this.graph.off('node:removed', this.onNodesRemoved)
    this.slots.clear()
    this.cache.clear()
    this.pending.clear()
    this.adapter = null
  }

  private readonly onGraphChanged = (event: {
    change?: ChangedEventType
    propertyName?: string
    object?: unknown
    newValue?: unknown
    oldValue?: unknown
  }) => {
    if (event.change === ChangedEventType.Delete) {
      this.detachNodes(event.object)
      this.detachNodes(event.oldValue)
    }
    // Moving or renaming a container node in the parent graph does not modify
    // its embedded region; only consider `targetGraphId` when a container is
    // inserted or its target binding changes.
    const includeTargetBinding =
      event.change === ChangedEventType.Insert || event.propertyName === 'targetGraphId'
    if (
      this.touchesRegion(event.object, includeTargetBinding) ||
      this.touchesRegion(event.newValue, includeTargetBinding) ||
      this.touchesRegion(event.oldValue, includeTargetBinding)
    ) {
      this.invalidate()
    }
  }

  private detachNodes(value: unknown) {
    if (!Array.isArray(value)) return
    for (const [slot, record] of this.slots) {
      if (!value.includes(record.node)) continue
      this.observer?.unobserve(record.observerTarget)
      this.slots.delete(slot)
    }
  }

  private touchesRegion(value: unknown, includeTargetBinding: boolean): boolean {
    if (Array.isArray(value)) return value.some((item) => this.touchesRegion(item, includeTargetBinding))
    const item = value as { graphId?: string; targetGraphId?: string } | null
    // A newly added container node creates its region in the same task, after
    // its card first attached; invalidate so the new source reaches the card.
    if (includeTargetBinding && item?.targetGraphId && this.graph.model.hasSubgraph(item.targetGraphId)) return true
    return Boolean(item?.graphId && this.graph.model.hasSubgraph(item.graphId))
  }

  private readonly onNodesRemoved = (nodes: NodeInstanceType[]) => {
    for (const [slot, record] of this.slots) {
      if (!nodes.includes(record.node)) continue
      this.observer?.unobserve(record.observerTarget)
      this.slots.delete(slot)
    }
  }

  private readonly onIntersect: IntersectionObserverCallback = (entries) => {
    for (const entry of entries) {
      const record = this.slots.get(entry.target as HTMLElement)
      const bySlot = record ?? this.slotForObserver(entry.target)
      if (!bySlot) continue
      bySlot.visible = entry.isIntersecting
      if (entry.isIntersecting) this.renderSlot(bySlot)
    }
  }

  private slotForObserver(target: Element): SlotRecord | undefined {
    for (const record of this.slots.values()) {
      if (record.observerTarget === target) return record
    }
    return undefined
  }

  private observe(record: SlotRecord) {
    if (!this.observer) return
    this.observer.unobserve(record.observerTarget)
    this.observer.observe(record.observerTarget)
  }

  private language() {
    return this.graph.options.language ?? 'en'
  }

  private cacheKey(source: PreviewSource): string {
    return subgraphPreviewKey(source, this.language())
  }

  /** Move one entry to the end of the LRU and drop the oldest entries. */
  private remember(targetId: string, entry: CachedPreview) {
    this.cache.delete(targetId)
    this.cache.set(targetId, entry)
    while (this.cache.size > PREVIEW_CACHE_LIMIT) {
      const oldest = this.cache.keys().next().value
      if (oldest === undefined) break
      this.cache.delete(oldest)
    }
  }

  /**
   * Drop one target's memory and persisted entry.
   *
   * Only external sources are persisted, so embedded regions never write to
   * the application cache and need no cleanup here.
   */
  private forget(targetId: string) {
    this.cache.delete(targetId)
    // Embedded regions have no persisted entry; only external files can be removed.
    if (!this.adapter || this.graph.model.hasSubgraph(targetId)) return
    try {
      void Promise.resolve(this.adapter.remove?.(targetId)).catch(() => {})
    } catch {
      // Application cache failures must not affect rendering.
    }
  }

  private persist(targetId: string, key: string, result: PreviewResult, entry: CachedPreview) {
    // Embedded regions, including loop bodies, belong to the view JSON; only
    // external files outlive a reload and are written to the application cache.
    if (!this.adapter || this.graph.model.hasSubgraph(targetId) || !this.sources.has(targetId)) return
    const svg = result.svg.outerHTML
    if (entry.persisted === svg) return
    entry.persisted = svg
    try {
      void Promise.resolve(this.adapter.save(targetId, serializeCachedPreview(result, key))).catch(() => {})
    } catch {
      // Application cache failures must not affect rendering.
    }
  }

  private showPending(slot: HTMLElement) {
    if (!slot.isConnected) return
    if (slot.querySelector('.bpgraph-subgraph-preview-svg')) {
      // Keep the previous preview visible while the next one is built.
      slot.setAttribute('data-preview-state', 'refreshing')
      return
    }
    if (slot.querySelector('.bpgraph-region-schematic')) {
      // Keep the fast first frame visible until the live preview replaces it.
      slot.setAttribute('data-preview-state', 'schematic')
      return
    }
    // Replace a stale empty message with the loading shimmer.
    if (slot.querySelector('.bpgraph-subgraph-preview-empty')) slot.replaceChildren()
    slot.setAttribute('data-preview-state', 'pending')
  }

  private showEmpty(slot: HTMLElement, message: string) {
    if (!slot.isConnected) return
    slot.setAttribute('data-preview-state', 'empty')
    slot.removeAttribute('data-preview-cache')
    slot.removeAttribute('data-schematic-key')
    slot.replaceChildren(this.emptyMessage(message))
  }

  private emptyMessage(message: string) {
    const span = document.createElement('span')
    span.className = 'bpgraph-subgraph-preview-empty'
    span.textContent = message
    return span
  }

  /** Embedded region behind a target id, or null for an external source. */
  private regionFor(targetId: string): RegionSchematicSource | null {
    if (!this.graph.model.hasSubgraph(targetId)) return null
    const region = this.graph.model.subgraphs.get(targetId)
    if (!region) return null
    return { nodes: region.nodes, links: region.links }
  }

  private sourceFor(targetId: string): PreviewSource | null {
    const region = this.regionFor(targetId)
    if (region) {
      return {
        nodes: serializeNodes([...region.nodes]),
        links: serializeLinks([...region.links]),
      }
    }
    const json = this.sources.get(targetId)
    if (!json) return null
    return { nodes: json.nodes, links: json.links }
  }

  /**
   * Draw the synchronous structural first frame for an embedded region.
   *
   * Returns false when the target is external or the region has nothing to
   * draw, leaving the normal pending state in place.
   */
  private showSchematic(slot: HTMLElement, targetId: string): boolean {
    if (this.destroyed || !slot.isConnected) return false
    if (slot.querySelector('.bpgraph-subgraph-preview-svg')) return false
    const region = this.regionFor(targetId)
    if (!region || region.nodes.length === 0) return false
    const source = {
      nodes: serializeNodes([...region.nodes]),
      links: serializeLinks([...region.links]),
    }
    const key = this.cacheKey(source)
    if (slot.getAttribute('data-schematic-key') === key && slot.querySelector('.bpgraph-region-schematic')) {
      return true
    }
    const svg = renderRegionSchematic(this.graph, region)
    if (!svg) return false
    slot.setAttribute('data-preview-state', 'schematic')
    slot.setAttribute('data-schematic-key', key)
    slot.removeAttribute('data-preview-cache')
    slot.setAttribute('inert', '')
    slot.replaceChildren(svg)
    return true
  }

  private renderSlot(record: SlotRecord) {
    if (this.destroyed || !record.visible || !record.slot.isConnected) return
    const source = this.sourceFor(record.targetId)
    if (!source) {
      this.showEmpty(record.slot, translate('No preview', this.language()))
      return
    }

    const key = this.cacheKey(source)
    const cached = this.cache.get(record.targetId)
    if (cached && !record.slot.querySelector('.bpgraph-subgraph-preview-svg')) {
      // Show the last rendered image before doing any work; it may be stale.
      this.mount(record.slot, cached.result, true)
    } else if (!cached && !record.slot.querySelector('.bpgraph-subgraph-preview-svg')) {
      // Cold start: paint the region schematic synchronously, then upgrade it.
      this.showSchematic(record.slot, record.targetId)
    }
    if (cached && cached.key === key && cached.revision === this.revision) {
      // Fresh memory hit: no rebuild is needed.
      record.token += 1
      return
    }

    const token = ++record.token
    this.showPending(record.slot)

    let build = this.pending.get(key)
    if (!build) {
      build = this.enqueue(source)
      this.pending.set(key, build)
      void build.finally(() => {
        if (this.pending.get(key) === build) this.pending.delete(key)
      }).catch(() => {})
    }
    build.then((result) => {
      if (this.destroyed || token !== record.token || !this.slots.has(record.slot) || !record.slot.isConnected) return
      if (!result) {
        // The source exists but has no drawable nodes; do not keep a stale image.
        this.forget(record.targetId)
        this.showEmpty(record.slot, translate('No preview', this.language()))
        return
      }
      // Compare with the image this slot actually shows, not the shared cache:
      // another card may have refreshed the cache while this slot still displays
      // the previous preview.
      const previous = this.cache.get(record.targetId)
      const changed = !cached
        || cached.result.svg.outerHTML !== result.svg.outerHTML
        || cached.result.omittedNodes !== result.omittedNodes
        || cached.result.omittedLinks !== result.omittedLinks
      const entry: CachedPreview = {
        key,
        revision: this.revision,
        result,
        persisted: previous?.persisted,
      }
      this.remember(record.targetId, entry)
      if (changed) this.mount(record.slot, result, false)
      else record.slot.setAttribute('data-preview-state', 'ready')
      this.persist(record.targetId, key, result, entry)
    }).catch(() => {
      if (this.destroyed || token !== record.token) return
      if (this.cache.has(record.targetId)) {
        record.slot.setAttribute('data-preview-state', 'ready')
        return
      }
      if (record.slot.querySelector('.bpgraph-region-schematic')) {
        // The schematic is still a truthful view of the region; keep it
        // instead of replacing it with an empty message.
        record.slot.setAttribute('data-preview-state', 'schematic')
        return
      }
      this.showEmpty(record.slot, translate('No preview', this.language()))
    })
  }

  private enqueue(source: PreviewSource): Promise<PreviewResult | null> {
    const run = this.buildQueue.then(() => this.destroyed ? null : buildPreview(this.graph, source))
    this.buildQueue = run.then(() => undefined, () => undefined)
    return run
  }

  private mount(slot: HTMLElement, result: PreviewResult, fromCache: boolean) {
    if (!slot.isConnected) return
    const svg = result.svg.cloneNode(true) as SVGSVGElement
    slot.setAttribute('data-preview-state', 'ready')
    slot.removeAttribute('data-schematic-key')
    // Record the first display source for diagnostics and tests; a live refresh
    // must not erase the fact that the card opened from a cached image.
    if (fromCache) slot.setAttribute('data-preview-cache', 'hit')
    else if (!slot.hasAttribute('data-preview-cache')) slot.setAttribute('data-preview-cache', 'miss')
    slot.setAttribute('inert', '')
    slot.replaceChildren(svg)
    if (result.omittedNodes > 0) {
      const badge = document.createElement('span')
      badge.className = 'bpgraph-subgraph-omitted'
      badge.textContent = `+${result.omittedNodes}`
      badge.title = translate('Nodes hidden in this preview', this.language(), {
        count: result.omittedNodes,
      })
      slot.appendChild(badge)
    }
  }
}
