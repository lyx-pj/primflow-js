import { createRuntime } from '../nodes'
import { createEngineContext } from '@lyx-pj/workflow-react'

const runtime = createRuntime()

export const { EngineProvider, useEngine } = createEngineContext(runtime)
