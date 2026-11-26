import type { InputPort, OutputPort } from '@lyx-pj/primflow-model'
import type { LinkInstanceType, LinkEnds, NodeInstanceType } from '../Graph'
import type { CanvasGraph } from './types'
import { isPortVisible, type PortDirection } from '../utils/ports'

export type ConnectionPort = InputPort | OutputPort

/** The already-connected end that a new node must attach to. */
export interface ConnectionSource {
  node: NodeInstanceType
  port: ConnectionPort
  direction: PortDirection
}

/** Context passed from a dropped connection to the palette. */
export interface PaletteConnectionRequest {
  source: ConnectionSource
  /** Existing link to replace when the user re-routed one of its endpoints. */
  replaceLink?: LinkInstanceType
  /** Draft link kept visible while the palette is open. */
  pendingLinkId?: string
  clientX: number
  clientY: number
}

/** Resolve a link end to its port and direction on the owning node. */
export function resolveSourcePort(
  node: NodeInstanceType,
  portId: string,
): { port: ConnectionPort; direction: PortDirection } | null {
  const output = node.outputs.find((port) => port.id === portId)
  if (output) return { port: output, direction: 'out' }
  const input = node.inputs.find((port) => port.id === portId)
  if (input) return { port: input, direction: 'in' }
  return null
}

/**
 * First visible port on `candidate` that accepts the source connection.
 *
 * Ports are scanned in declaration order. When the source is an output, the
 * candidate must provide an input; an input source needs an output.
 */
export function findCompatiblePort(
  graph: CanvasGraph,
  candidate: NodeInstanceType,
  source: ConnectionSource,
): ConnectionPort | null {
  if (source.direction === 'out') {
    const input = candidate.inputs.find((port) =>
      isPortVisible(port, 'in') &&
      graph.validateConnection(source.node, source.port as OutputPort, candidate, port)
    )
    return input ?? null
  }
  const output = candidate.outputs.find((port) =>
    isPortVisible(port, 'out') &&
    graph.validateConnection(candidate, port, source.node, source.port as InputPort)
  )
  return output ?? null
}

/** Build normalized link ends; the model always stores output -> input. */
export function connectionEnds(
  source: ConnectionSource,
  candidate: NodeInstanceType,
  port: ConnectionPort,
): LinkEnds {
  if (source.direction === 'out') {
    return {
      source: { id: source.node.id, port: source.port.id! },
      target: { id: candidate.id, port: port.id! },
    }
  }
  return {
    source: { id: candidate.id, port: port.id! },
    target: { id: source.node.id, port: source.port.id! },
  }
}
