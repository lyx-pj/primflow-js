import { createRuntime } from '@/nodes'
import { createEngineContext } from 'workflow-react'

const runtime = createRuntime()

export const { EngineProvider, useEngine } = createEngineContext(runtime)