import { createContext, useContext, useState, type ReactNode } from 'react'
import {
  Graph,
  type NodeRegistry,
  type GraphOptions,
  type NodeClassType,
  type EditorRegistry,
  type NodeRendererRegistry
} from '@lyx-pj/primflow-canvas'
import { CanvasPortalHost } from '../react-mount/canvas-portal-host'
import {
  createReactPortalRegistry,
  PortalRegistryContext,
  type ReactMountFactory,
} from '../react-mount/react-mount'

export interface GraphContextHelpers {
  /** Mount React JSX into canvas containers via portals inside `GraphProvider`. */
  reactMount: ReactMountFactory
}

export interface GraphContextOptions {
  /** Canvas options forwarded to the Graph constructor. */
  canvas?: GraphOptions
  /**
   * Register application editors before the first node renders.
   *
   * Editors decide how a port value is edited, so they must be in place before
   * the canvas builds any port control.
   */
  editors?: (editors: EditorRegistry, helpers: GraphContextHelpers) => void
  /**
   * Register application node renderers before the first node renders.
   *
   * A renderer decides how a node definition looks, so it must be in place
   * before the canvas builds the node markup.
   */
  nodeRenderers?: (renderers: NodeRendererRegistry, helpers: GraphContextHelpers) => void
}

export function createGraphContext<NodeDefs extends Record<string, NodeClassType>>(
  registry: NodeRegistry<NodeDefs>,
  options?: GraphOptions
): { GraphProvider: (props: { children: ReactNode }) => ReactNode; useGraph: () => Graph<NodeDefs> }
export function createGraphContext<NodeDefs extends Record<string, NodeClassType>>(
  registry: NodeRegistry<NodeDefs>,
  options: GraphContextOptions
): { GraphProvider: (props: { children: ReactNode }) => ReactNode; useGraph: () => Graph<NodeDefs> }
export function createGraphContext<NodeDefs extends Record<string, NodeClassType>>(
  registry: NodeRegistry<NodeDefs>,
  options?: GraphOptions | GraphContextOptions
) {
  const GraphContext = createContext<Graph<NodeDefs> | null>(null)
  const canvasOptions = options && 'canvas' in options ? options.canvas : options as GraphOptions | undefined
  const setupEditors = options && 'editors' in options ? options.editors : undefined
  const setupNodeRenderers = options && 'nodeRenderers' in options ? options.nodeRenderers : undefined

  function GraphProvider({ children }: { children: ReactNode }) {
    // Lazy initialization creates one Graph instance and one portal registry for
    // the mount lifetime. Recreating Graph on render would invalidate external
    // references and rebuild the canvas.
    const [{ graph, portals }] = useState(() => {
      const portalRegistry = createReactPortalRegistry()
      const helpers: GraphContextHelpers = {
        reactMount: (render) => portalRegistry.mount(render),
      }
      const instance = new Graph(registry, canvasOptions)
      setupEditors?.(instance.editors, helpers)
      setupNodeRenderers?.(instance.nodeRenderers, helpers)
      return { graph: instance, portals: portalRegistry }
    })
    return (
      <PortalRegistryContext.Provider value={portals}>
        <GraphContext.Provider value={graph}>
          {children}
          <CanvasPortalHost registry={portals} />
        </GraphContext.Provider>
      </PortalRegistryContext.Provider>
    )
  }

  function useGraph() {
    const ctx = useContext(GraphContext)
    if (!ctx) throw new Error('GraphContext not found')
    return ctx
  }

  return { GraphProvider, useGraph }
}
