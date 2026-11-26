import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Engine, NodeClassType } from '@lyx-pj/primflow-engine'

export function createEngineContext<NodeDefs extends Record<string, NodeClassType>>(createEngine: () => Engine<NodeDefs>) {
  const EngineContext = createContext<Engine<NodeDefs> | null>(null)

  function EngineProvider({ children }: { children: ReactNode }) {
    const [engine] = useState(createEngine)
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
