import { Engine } from '@lyx-pj/primflow-engine'
import type { JsonGraph, JsonNode, NodeClassType } from '@lyx-pj/primflow-model'
import { createRegistry } from '../packages/workflow/nodes'
import { demoNodes } from '../packages/workflow/nodes/catalog'
import { businessLog, printExecutor } from '../packages/workflow/executors'
import { httpExecutor } from '../packages/workflow/executors/http'
import { httpService } from '../packages/workflow/services/http'

export const registry = createRegistry()
export type DemoType = keyof typeof registry.registry
export type DemoEngine = Engine<ReturnType<typeof createRegistry>['registry']>

const engines: DemoEngine[] = []

/** Build graph JSON from node definitions, layering in demo defaults from the node catalog. */
export function node(nodeType: DemoType, id: string = nodeType, inputValues: Record<string, unknown> = {}): JsonNode {
  const definition: NodeClassType['definition'] = registry.get(nodeType).definition
  return {
    id,
    definitionId: nodeType,
    kind: definition.kind ?? definition.type ?? 'default',
    position: { x: 0, y: 0 },
    inputValues: { ...(demoNodes[nodeType]?.inputValues ?? {}), ...inputValues },
    inputs: definition.inputs.map((port) => ({ name: port.name, type: port.type, id: `in-${port.name}` })),
    outputs: definition.outputs.map((port) => ({ name: port.name, type: port.type, id: `out-${port.name}` })),
  }
}

/** Create an execution or data link; port ids follow `in-<name>` / `out-<name>`. */
export function link(source: string, output: string, target: string, input = 'exec') {
  return {
    id: `${source}-${output}-${target}-${input}`,
    source: { id: source, port: `out-${output}` },
    target: { id: target, port: `in-${input}` },
  }
}

/** Create a real engine using the example registry and register it for stop-all on teardown. */
export function createEngine(
  nodes: JsonNode[],
  links: JsonGraph['links'],
  subgraphs: JsonGraph['subgraphs'] = {}
) {
  const instance = new Engine(createRegistry(), { services: [businessLog, httpService] })
    .registerExecutor(printExecutor)
    .registerExecutor(httpExecutor)
  instance.loadGraph({ nodes, links, subgraphs, variables: [], viewport: { x: 0, y: 0, zoom: 1 } })
  engines.push(instance)
  return instance
}

export function stopEngines() {
  engines.splice(0).forEach((engine) => engine.stop())
}
