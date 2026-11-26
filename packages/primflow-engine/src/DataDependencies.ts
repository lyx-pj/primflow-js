import type { TaskStateSnapshot } from '@lyx-pj/primflow-model'
import type { DataSource, ExecutionPortEntry } from './GraphCompiler'
import type { ActivationInputSource, WaitingInput } from './types'

export type PublishedValues = Readonly<Record<string, unknown>>
export type ExecutionPath = {
  nodeId: string
  values: PublishedValues
  activationId?: number
  previous?: ExecutionPath
}

type SelectedSource = { source: DataSource; values?: PublishedValues; activationId?: number }
export type InputSelections = Map<string, SelectedSource>
type OutputOverride = (nodeId: string, port: string, original: unknown) => unknown
export type StateInput = {
  nodeId: string
  port: string
  stateVersion: number
  read: (state: TaskStateSnapshot, override?: OutputOverride) => unknown
}

export function describeInputSource(
  inputPortId: string, source: DataSource, version: number | undefined, activationId: number | undefined,
): ActivationInputSource {
  return {
    inputPortId,
    producer: source.dependency === undefined ? undefined : {
      nodeId: source.dependency, outputPort: (source.output ?? source.upstreamOutput)!, activationId,
    },
    state: source.stateSource && version !== undefined ? { ...source.stateSource, version } : undefined,
  }
}

/** Bind multi-source inputs once per trigger. Single-source inputs retain their existing ready checks. */
export function inputsReady(
  item: ExecutionPortEntry,
  isReady: (nodeId: string) => boolean,
  publications: ReadonlyMap<string, PublishedValues>,
  path?: ExecutionPath,
  selections?: InputSelections,
  missing?: WaitingInput[],
  producers?: ReadonlyMap<string, number>,
) {
  let ready = true
  const blocked = (inputPortId: string, candidates: DataSource[]) => {
    ready = false
    missing?.push({ inputPortId, sources: candidates.map((source) => ({
      nodeId: source.dependency!, outputPort: (source.output ?? source.upstreamOutput)!,
    })) })
  }
  for (const [portId, candidates] of Object.entries(item.dataInputs)) {
    if (candidates.length === 1) {
      const dependency = candidates[0].dependency
      if (dependency !== undefined && !isReady(dependency)) blocked(portId, candidates)
      continue
    }
    if (selections!.has(portId)) continue
    const selected = selectSource(candidates, publications, path, producers)
    if (selected) selections!.set(portId, selected)
    else blocked(portId, candidates)
  }
  return ready
}

function selectSource(
  candidates: DataSource[],
  publications: ReadonlyMap<string, PublishedValues>,
  path?: ExecutionPath,
  producers?: ReadonlyMap<string, number>,
): SelectedSource | undefined {
  for (let current = path; current; current = current.previous) {
    for (let index = candidates.length - 1; index >= 0; index--) {
      const source = candidates[index]
      if (source.dependency === current.nodeId) return { source, values: current.values, activationId: current.activationId }
    }
  }
  for (let index = candidates.length - 1; index >= 0; index--) {
    const source = candidates[index]
    if (source.dependency === undefined) return { source }
    const values = publications.get(source.dependency)
    if (values) return { source, values, activationId: producers?.get(source.dependency) }
  }
}

export function bindInput(
  candidates: DataSource[],
  readOutput: (nodeId: string, name: string) => unknown,
  selection?: SelectedSource,
) {
  const source = selection?.source ?? candidates[0]
  const lookup = selection ? (_: string, name: string) => selection.values?.[name] : readOutput
  if (!source.stateSource) return { source, read: () => source.read(lookup) }

  // Bind data inputs to the producer values selected for this read; only task state is refreshed on retry.
  const captured = new Map<string, unknown>()
  const read = (state?: TaskStateSnapshot, override?: OutputOverride) =>
    source.read((id, port) => {
      const key = `${id}:${port}`
      if (!captured.has(key)) captured.set(key, structuredClone(lookup(id, port)))
      const original = captured.get(key)
      return override ? override(id, port, original) : original
    }, state)
  return { source, read }
}
