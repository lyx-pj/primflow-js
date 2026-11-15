import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { Engine, type Runtime, type NodeClassType, type ProcessOptions } from '@lyx-pj/workflow-engine'

export type EngineProviderProps<NodeDefs extends Record<string, NodeClassType>> = {
  runtime: Runtime<NodeDefs>
  children: ReactNode
  options?: ProcessOptions
}

export function createEngineContext<NodeDefs extends Record<string, NodeClassType>>(
  runtime: Runtime<NodeDefs>,
  options?: ProcessOptions
) {
  const EngineContext = createContext<Engine<NodeDefs> | null>(null)

  function EngineProvider({ children }: { children: ReactNode }) {
    // Keep Engine stable across renders to preserve runtime state.
    const [engine] = useState(() => new Engine(runtime, options))
    useEffect(
      () => () => {
        engine.stop()
      },
      [engine]
    )
    return <EngineContext.Provider value={engine}>{children}</EngineContext.Provider>
  }

  function useEngine() {
    const ctx = useContext(EngineContext)
    if (!ctx) throw new Error('EngineContext not found')
    return ctx
  }

  return { EngineProvider, useEngine }
}
