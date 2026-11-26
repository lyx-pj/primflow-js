import { Engine } from '@lyx-pj/primflow-engine'
import { createEngineContext } from '@lyx-pj/primflow-react'
import { businessLog, printExecutor } from '../executors'
import { httpExecutor } from '../executors/http'
import { createRegistry } from '../nodes'
import { httpService } from '../services/http'

export const { EngineProvider, useEngine } = createEngineContext(() =>
  new Engine(createRegistry(), { services: [businessLog, httpService] })
    .registerExecutor(printExecutor)
    .registerExecutor(httpExecutor)
)
