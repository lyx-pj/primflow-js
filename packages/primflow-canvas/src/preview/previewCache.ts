import type { JsonGraph } from '@lyx-pj/primflow-model'
import type { CanvasLanguage } from '../ui/i18n'
import type { PreviewResult } from './previewGraph'

/**
 * Bump when the cached payload or preview markup becomes incompatible.
 *
 * Entries from another version are ignored instead of being mounted, because
 * an old preview may not match the current renderer or CSS contract.
 */
export const SUBGRAPH_PREVIEW_CACHE_VERSION = 1

/** Serializable preview data handed to the application-owned cache adapter. */
export interface CachedSubgraphPreview {
  /** Cache schema version; `SUBGRAPH_PREVIEW_CACHE_VERSION` at write time. */
  version: number
  /** Content and language fingerprint; used to decide when a preview is stale. */
  key: string
  /** Serialized preview SVG. */
  svg: string
  /** Nodes omitted by the preview limits. */
  omittedNodes: number
  /** Links omitted by the preview limits. */
  omittedLinks: number
}

/**
 * Application-provided persistence for subgraph card previews.
 *
 * The canvas decides when to read, write, or drop an entry; the application
 * decides where entries live, how long they are kept, and how they are pruned.
 * A synchronous `load()` result is not required: call `preloadSubgraphPreviews`
 * during startup, before the first card mounts.
 */
export interface SubgraphPreviewCacheAdapter {
  /** Load persisted entries keyed by target graph id. */
  load(): Record<string, CachedSubgraphPreview> | Promise<Record<string, CachedSubgraphPreview>>
  /** Persist one rendered preview; failures must not affect rendering. */
  save(targetId: string, preview: CachedSubgraphPreview): void | Promise<void>
  /** Drop a removed subgraph file's entry. */
  remove?(targetId: string): void | Promise<void>
}

export interface PreviewSourceLike {
  nodes: JsonGraph['nodes']
  links: JsonGraph['links']
}

/**
 * Stable key for one preview source.
 *
 * Content and language both affect the rendered markup. The hash keeps cache
 * keys small; lengths and item counts guard against accidental collisions.
 */
export function subgraphPreviewKey(source: PreviewSourceLike, language: CanvasLanguage): string {
  const serialized = JSON.stringify({ nodes: source.nodes, links: source.links })
  let hash = 0x811c9dc5
  for (let index = 0; index < serialized.length; index += 1) {
    hash ^= serialized.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  const value = (hash >>> 0).toString(36)
  return `${language}:${source.nodes.length}:${source.links.length}:${serialized.length}:${value}`
}

/** Convert a rendered preview into the plain payload an application can persist. */
export function serializeCachedPreview(preview: PreviewResult, key: string): CachedSubgraphPreview {
  return {
    version: SUBGRAPH_PREVIEW_CACHE_VERSION,
    key,
    svg: preview.svg.outerHTML,
    omittedNodes: preview.omittedNodes,
    omittedLinks: preview.omittedLinks,
  }
}

/**
 * Rebuild a preview result from persisted data.
 *
 * The payload comes from application storage, so reject anything that is not
 * a current-version SVG document and strip scripts before mounting it.
 */
export function parseCachedPreview(data: CachedSubgraphPreview | undefined | null): PreviewResult | null {
  if (!data || data.version !== SUBGRAPH_PREVIEW_CACHE_VERSION || typeof data.svg !== 'string') return null
  // The payload is produced by `outerHTML` (HTML serialization), so parse it as HTML:
  // XML parsing rejects HTML entities such as `&nbsp;` used inside `foreignObject`.
  const parsed = new DOMParser().parseFromString(data.svg, 'text/html')
  const root = parsed.querySelector('svg')
  if (!root) return null
  for (const unsafe of root.querySelectorAll('script, iframe, object, embed, link, meta')) unsafe.remove()
  for (const element of root.querySelectorAll('*')) {
    for (const attribute of [...element.attributes]) {
      if (/^on/i.test(attribute.name)) element.removeAttribute(attribute.name)
    }
  }
  root.classList.add('bpgraph-subgraph-preview-svg')
  const svg = document.importNode(root, true) as unknown as SVGSVGElement
  return {
    svg,
    omittedNodes: Math.max(0, data.omittedNodes || 0),
    omittedLinks: Math.max(0, data.omittedLinks || 0),
  }
}
