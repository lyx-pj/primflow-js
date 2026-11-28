import { nothing, type TemplateResult } from 'lit-html'
import type { InputPort, OutputPort } from '@lyx-pj/primflow-model'
import type { CanvasUIMountFn } from './slots'
import type { CanvasGraph } from './types'
import type { NodeInstanceType } from '../Graph'

/** Context passed to a node renderer. */
export interface NodeRendererContext {
  /** The canvas graph; absent when the node renders outside a mounted graph. */
  graph?: CanvasGraph
  /** The canvas node instance; absent when the node renders outside a mounted graph. */
  node?: NodeInstanceType
  width: number
  height: number
}

/**
 * Geometry available when a renderer places a port.
 *
 * The context is intentionally geometry-only: port markup is built before the
 * node joins the graph, so the node instance is not always reachable there.
 */
export interface PortLayoutContext {
  port: InputPort | OutputPort
  group: 'in' | 'out'
  /** Index within its direction, in declaration order, including spacer ports. */
  index: number
  width: number
  height: number
}

/**
 * Application renderer for a node definition.
 *
 * A registered renderer replaces the built-in node content, so a node can use
 * its own layout instead of the standard header and body. Ports and links keep
 * working, because the JointJS element and its ports are unchanged.
 */
export interface NodeRendererRegistration {
  render?: (context: NodeRendererContext) => TemplateResult | typeof nothing
  /** Framework-agnostic DOM mounter for the node body (React, Vue, vanilla DOM). */
  mount?: CanvasUIMountFn<NodeRendererContext>
  /**
   * Node size owned by the renderer.
   *
   * The default size follows the built-in header and port rows, which does not
   * describe a custom layout, so a renderer that draws its own content should
   * declare its size.
   */
  size?: { width: number; height: number }
  /** Draw the built-in title bar; defaults to false once a renderer is registered. */
  header?: boolean
  /** Draw the built-in body rectangle; defaults to false once a renderer is registered. */
  body?: boolean
  /**
   * Place one port in node coordinates.
   *
   * Omit `x` to keep the built-in edge offset for the port group, which is
   * useful when only the vertical position needs to change. Return undefined
   * to keep the built-in row layout for that port.
   */
  portPosition?: (context: PortLayoutContext) => { x?: number; y: number } | undefined
  /**
   * Place the inline port control in node coordinates.
   *
   * Applies to the built-in control of a data port. Omit `x` to keep the
   * position after the port label. Return undefined to keep the built-in slot.
   */
  portEditorPosition?: (context: PortLayoutContext) => { x?: number; y: number } | undefined
}

/**
 * Registry of application node renderers, keyed by definition ID.
 *
 * A renderer describes how one node definition looks. It does not change node
 * behavior, port types, or connection rules; those stay in the node registry
 * and the data type registry.
 */
export class NodeRendererRegistry {
  private readonly registrations = new Map<string, NodeRendererRegistration>()

  /** Register the renderer for one node definition. */
  register(definitionId: string, registration: NodeRendererRegistration): this {
    if (!definitionId.trim()) throw new Error('Node renderer definition ID must not be empty.')
    this.registrations.set(definitionId, registration)
    return this
  }

  /** Remove the renderer registered for a node definition. */
  unregister(definitionId: string): boolean {
    return this.registrations.delete(definitionId)
  }

  /** Renderer for one node definition, or undefined when it uses the built-in layout. */
  get(definitionId: string): NodeRendererRegistration | undefined {
    return this.registrations.get(definitionId)
  }

  /** Whether a node definition has a registered renderer. */
  has(definitionId: string): boolean {
    return this.registrations.has(definitionId)
  }

  /** Node definitions that have a registered renderer. */
  getRegisteredDefinitions(): string[] {
    return [...this.registrations.keys()]
  }
}
