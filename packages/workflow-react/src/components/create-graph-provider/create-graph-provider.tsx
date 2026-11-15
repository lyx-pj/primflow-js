import { createContext, useContext, useState, type ReactNode } from 'react'
import { Graph, type NodeRegistry, type GraphOptions, type NodeClassType } from '@lyx-pj/workflow-canvas'

export function createGraphContext<NodeDefs extends Record<string, NodeClassType>>(
  registry: NodeRegistry<NodeDefs>,
  options?: GraphOptions
) {
  const GraphContext = createContext<Graph<NodeDefs> | null>(null)

  function GraphProvider({ children }: { children: ReactNode }) {
    // Lazy initialization creates one Graph instance for the mount lifetime.
    // Recreating Graph on render would invalidate external references and rebuild the canvas.
    const [graph] = useState(() => new Graph(registry, options))
    return <GraphContext.Provider value={graph}>{children}</GraphContext.Provider>
  }

  function useGraph() {
    const ctx = useContext(GraphContext)
    if (!ctx) throw new Error('GraphContext not found')
    return ctx
  }

  return { GraphProvider, useGraph }
}
