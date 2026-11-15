import type { LoopConfig } from '@lyx-pj/workflow-model'
import type { NodeInstanceType } from './Runtime'
import type { GraphCompiler } from './GraphCompiler'

export function validateLoopConfig(config: LoopConfig | undefined, nodeId: string): asserts config is LoopConfig {
  if (
    !config ||
    config.version !== 1 ||
    (config.maxIterations !== undefined &&
      (!Number.isSafeInteger(config.maxIterations) || config.maxIterations < 1)) ||
    (config.timeoutMs !== undefined && (!Number.isFinite(config.timeoutMs) || config.timeoutMs <= 0))
  )
    throw new Error(`LoopConfigInvalid: ${nodeId} has missing configuration, an unknown version, or invalid parameters`)
}

/** Apply stricter rules to loop regions without changing ordinary graph back edges. */
export function validateLoops(compiler: GraphCompiler, regions: Map<string, NodeInstanceType[]>) {
  function requirePorts(node: NodeInstanceType, direction: 'inputs' | 'outputs', names: string[], execNames: string[]) {
    for (const name of [...names, ...execNames]) {
      const port = node[direction].find((p) => p.name === name)
      if (!port || (port.type === 'exec') !== execNames.includes(name))
        throw new Error(`Invalid loop control port: ${node.id}.${name}`)
    }
    for (const port of node[direction]) {
      if (!port.id.startsWith(direction === 'inputs' ? 'in-' : 'out-'))
        throw new Error(`Invalid loop control port direction: ${node.id}.${port.id}`)
    }
  }
  const owners = new Set<string>()
  for (const nodes of regions.values())
    for (const node of nodes) {
      if (node.type.startsWith('loop-') && !['loop-entry', 'loop-return'].includes(node.type))
        throw new Error(`Unknown loop control node: ${node.type}`)
      if (node.type !== 'loop') {
        if (node.loop) throw new Error(`LoopConfigInvalid: ${node.id} is not a loop node`)
        continue
      }
      validateLoopConfig(node.loop, node.id)
      // Loops have one data input and one data output; other information remains internal.
      requirePorts(node, 'inputs', ['input'], ['exec'])
      requirePorts(node, 'outputs', ['output'], ['done'])
      if (!node.subgraphId || !regions.has(node.subgraphId)) throw new Error(`Loop body not found: ${node.id}`)
      owners.add(node.subgraphId)
    }
  for (const [id, nodes] of regions) {
    if (owners.has(id)) {
      if (nodes.filter((n) => n.type === 'loop-entry').length !== 1 || !nodes.some((n) => n.type === 'loop-return')) {
        throw new Error(`Loop body ${id} requires one LoopEntry and at least one LoopReturn`)
      }
      if (nodes.some((n) => ['start', 'end'].includes(n.type))) throw new Error(`Loop body ${id} cannot use Start/End`)
      for (const node of nodes) {
        if (node.type === 'loop-entry') {
          requirePorts(node, 'outputs', ['value'], ['exec'])
          if (node.inputs.length) throw new Error(`Loop entry cannot have inputs: ${node.id}`)
        }
        if (node.type === 'loop-return') {
          requirePorts(node, 'inputs', ['value'], ['next', 'break'])
          if (
            node.outputs.length ||
            node.inputs.some((p) => p.type === 'exec' && !['next', 'break'].includes(p.name))
          )
            throw new Error(`Invalid loop return ports: ${node.id}`)
        }
      }
    } else if (nodes.some((n) => ['loop-entry', 'loop-return'].includes(n.type))) {
      throw new Error(`Loop controls are only allowed in loop bodies: ${id}`)
    }
  }
  const visiting = new Set<string>()
  const visited = new Set<string>()
  function references(id: string) {
    if (visiting.has(id)) throw new Error(`Recursive subgraph reference: ${id}`)
    if (visited.has(id)) return
    visiting.add(id)
    for (const n of regions.get(id) ?? [])
      if (['loop', 'subgraph'].includes(n.type) && n.subgraphId) {
        if (!regions.has(n.subgraphId)) throw new Error(`Subgraph not found: ${n.subgraphId}`)
        if (n.type === 'subgraph' && owners.has(n.subgraphId)) throw new Error(`Ordinary subgraphs cannot call loop bodies: ${n.id}`)
        references(n.subgraphId)
      }
    visiting.delete(id)
    visited.add(id)
  }
  for (const id of regions.keys()) references(id)

  const strict = new Set<string>()
  function checkRegion(id: string) {
    if (strict.has(id)) return
    strict.add(id)
    const nodes = regions.get(id)!
    for (const n of nodes) {
      n.inLoopBody = true
      if (n.executionMode === 'source' || n.onEvent) throw new Error(`Event sources are forbidden in loop bodies: ${n.id}`)
      if (['subgraph', 'loop'].includes(n.type) && n.subgraphId) checkRegion(n.subgraphId)
    }
    const exec = new Map<string, Set<string>>()
    const data = new Map<string, Set<string>>()
    for (const n of nodes) {
      exec.set(n.id, new Set())
      data.set(n.id, new Set())
    }
    for (const item of compiler.graphs.get(id)!.values()) {
      for (const next of item.next) exec.get(item.node.id)!.add(compiler.graphs.get(id)!.get(next)!.node.id)
      for (const dep of Object.values(item.dataInputs)) data.get(dep.split(':')[0])!.add(item.node.id)
    }
    for (const edges of [exec, data]) {
      const active = new Set<string>(),
        done = new Set<string>()
      function walk(n: string) {
        if (active.has(n)) throw new Error(`Back edges are forbidden in loop regions: ${id}/${n}`)
        if (done.has(n)) return
        active.add(n)
        for (const next of edges.get(n)!) walk(next)
        active.delete(n)
        done.add(n)
      }
      for (const n of nodes) walk(n.id)
    }
    if (owners.has(id)) {
      const canReturn = new Set(nodes.filter((n) => n.type === 'loop-return').map((n) => n.id))
      for (let changed = true; changed; ) {
        changed = false
        for (const [n, next] of exec)
          if (!canReturn.has(n) && [...next].some((k) => canReturn.has(k))) {
            canReturn.add(n)
            changed = true
          }
      }
      const entry = nodes.find((n) => n.type === 'loop-entry')!
      const reachable = new Set<string>()
      function reach(n: string) {
        if (reachable.has(n)) return
        reachable.add(n)
        for (const next of exec.get(n)!) reach(next)
      }
      reach(entry.id)
      for (const n of reachable) if (!canReturn.has(n)) throw new Error(`Loop body node has no path to a return: ${n}`)
    }
  }
  for (const id of owners) checkRegion(id)
}
