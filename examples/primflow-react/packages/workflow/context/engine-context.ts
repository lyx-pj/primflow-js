import { createRuntime } from '../nodes'
import { createEngineContext } from '@lyx-pj/primflow-react'

const runtime = createRuntime()

export const { EngineProvider, useEngine } = createEngineContext(runtime)
