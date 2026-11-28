import { nothing, type TemplateResult } from 'lit-html'
import type { InputPort, NodeStyle } from '@lyx-pj/primflow-model'
import type { CanvasUIMountFn, CanvasUIMountHandle } from './slots'
import type { CanvasGraph } from './types'
import type { NodeInstanceType } from '../Graph'

/**
 * Editor scopes.
 *
 * `port` renders the compact control shown next to a port on the canvas.
 * `panel` renders the full control shown in the right-hand node panel.
 * The same data type may register both, because a canvas port has far less
 * room than a panel and usually needs a different interaction.
 */
export type EditorScope = 'port' | 'panel'

/** Placement of a paper-level overlay relative to its anchor. */
export type OverlayPlacement = 'above' | 'below' | 'left' | 'right'

/**
 * A paper-level overlay anchored to a canvas element.
 *
 * Port editors render inside an SVG `foreignObject`, which clips content that
 * overflows its box. Overlays therefore render in a host attached to the paper
 * element instead, and the application decides what to show and where.
 */
export interface PortOverlayOptions {
  /** Element the overlay is positioned against, usually the editor control. */
  anchor: HTMLElement
  /** Overlay content rendered with lit-html. */
  render?: () => TemplateResult | typeof nothing
  /** Framework-agnostic DOM mounter for overlay content (React, Vue, vanilla DOM). */
  mount?: (container: HTMLElement) => CanvasUIMountHandle<void> | void
  /** Preferred placement; the canvas may fall back when space is tight. */
  placement?: OverlayPlacement
  /** Close the overlay when the pointer leaves the overlay and its anchor. */
  closeOnOutsideClick?: boolean
}

/** Host that opens paper-level overlays for a port editor. */
export interface PortOverlayHost {
  open(options: PortOverlayOptions): () => void
}

/** Context passed to a port editor renderer. */
export interface PortEditorContext {
  /** The canvas graph; absent when the port renders outside a mounted graph. */
  graph?: CanvasGraph
  /** The canvas node instance; absent when the port renders outside a mounted graph. */
  node?: NodeInstanceType
  port: InputPort
  /** Current value of the port. */
  value: unknown
  /** Write a new value to the port. */
  setValue: (value: unknown) => void
  /** Node style, so custom controls can match the built-in editors. */
  style: NodeStyle
  /** Paper-level overlay host; use it for content that must escape the port box. */
  overlay: PortOverlayHost
}

/** Context passed to a panel editor renderer. */
export interface PanelEditorContext {
  /** The canvas graph. */
  graph: CanvasGraph
  /** The canvas node instance. */
  node: NodeInstanceType
  port: InputPort
  /** Current value of the port. */
  value: unknown
  /** Write a new value to the port. */
  setValue: (value: unknown) => void
}

/** Renderer or framework-agnostic mounter for the compact control shown next to a port on the canvas. */
export interface PortEditorRegistration {
  render?: (context: PortEditorContext) => TemplateResult | typeof nothing
  mount?: CanvasUIMountFn<PortEditorContext>
  /** Width of the control in pixels; overrides the global editor box width. */
  width?: number
}

/** Renderer or framework-agnostic mounter for the full control shown in the right-hand node panel. */
export interface PanelEditorRegistration {
  render?: (context: PanelEditorContext) => TemplateResult | typeof nothing
  mount?: CanvasUIMountFn<PanelEditorContext>
}

/** Editor registration for one data type. */
export interface EditorRegistration {
  port?: PortEditorRegistration
  panel?: PanelEditorRegistration
}

/**
 * Registry of application-provided editors, keyed by port data type.
 *
 * A registered editor takes precedence over the built-in rendering, so an
 * application can replace the control of a builtin type as well as provide a
 * control for a custom type. The registry is independent from the data type
 * registry: an editor describes how a value is edited, not whether a port may
 * connect to another port.
 */
export class EditorRegistry {
  private readonly registrations = new Map<string, EditorRegistration>()

  /**
   * Register editors for one data type.
   *
   * Registering the same type again merges the new scopes into the existing
   * registration, so an application can add a panel editor without dropping a
   * port editor registered earlier.
   */
  register(type: string, registration: EditorRegistration): this {
    if (!type.trim()) throw new Error('Editor data type must not be empty.')
    const existing = this.registrations.get(type)
    if (!existing) {
      this.registrations.set(type, { ...registration })
      return this
    }
    this.registrations.set(type, {
      port: registration.port ?? existing.port,
      panel: registration.panel ?? existing.panel,
    })
    return this
  }

  /** Remove every editor registered for a data type. */
  unregister(type: string): boolean {
    return this.registrations.delete(type)
  }

  /** Registered editor for one scope, or undefined when the type has none. */
  get(type: string, scope: 'port'): PortEditorRegistration | undefined
  get(type: string, scope: 'panel'): PanelEditorRegistration | undefined
  get(type: string, scope: EditorScope): EditorRegistration[EditorScope] | undefined
  get(type: string, scope: EditorScope): EditorRegistration[EditorScope] | undefined {
    return this.registrations.get(type)?.[scope]
  }

  /** Whether one scope has a registered editor for the data type. */
  has(type: string, scope: EditorScope): boolean {
    return this.registrations.get(type)?.[scope] !== undefined
  }

  /** Data types that have at least one registered editor. */
  getRegisteredTypes(): string[] {
    return [...this.registrations.keys()]
  }
}
