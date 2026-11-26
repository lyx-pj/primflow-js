import type { Graph, NodeClassType, PaletteEntry } from '@lyx-pj/primflow-canvas'
import { getJsonNodeDefinitionId, type JsonGraph, type JsonNode } from '@lyx-pj/primflow-model'
import type { ViewMeta } from './storage'
import { getLanguage, listSeparator, quoteName, translate } from './i18n'
import { normalizeDataOnlyPorts } from './nodes/normalize-inputs'

/**
 * Expand subgraph files into palette entries.
 *
 * Each standalone subgraph file maps to one Call Subgraph node with that file's id and name;
 * exclude the current file to avoid direct self-calls. Cross-file cycles are rejected during execution assembly.
 */
export function buildSubgraphPaletteEntries<NodeDefs extends Record<string, NodeClassType>>(
  graph: Graph<NodeDefs>,
  files: ViewMeta[],
  currentFileId: string,
): PaletteEntry[] {
  const language = getLanguage()
  const nodeClass = graph.nodeRegistry.getNodeClass('subgraph')
  return files
    .filter((file) => file.type === 'subgraph' && file.id !== currentFileId)
    .map((file) => ({
      nodeClass,
      title: file.name,
      category: translate(language, 'palette.subgraphs'),
      iconClass: 'ri-node-tree',
      description: translate(language, 'palette.callSubgraph', { name: quoteName(file.name, language) }),
      keywords: ['subgraph', '子图', file.name],
      defaults: { targetGraphId: file.id, title: file.name },
    }))
}

function regionLabel(files: Map<string, ViewMeta>, id: string) {
  return files.get(id)?.name ?? id
}

function validateNodeTypes(
  data: JsonGraph,
  label: string,
  isRegistered: (nodeType: string) => boolean,
) {
  const nodes = [...data.nodes, ...Object.values(data.subgraphs).flatMap((region) => region.nodes)]
  const unsupported = [...new Set(nodes.map(getJsonNodeDefinitionId))].filter((type) => !isRegistered(type))
  if (unsupported.length) {
    throw new Error(
      translate(getLanguage(), 'error.subgraphRemovedNodes', {
        label: quoteName(label),
        types: unsupported.join(listSeparator()),
      }),
    )
  }
}

function assertUniqueNodeIds(graph: JsonGraph, files: Map<string, ViewMeta>) {
  const seen = new Map<string, string>()
  const check = (nodes: JsonNode[], label: string) => {
    for (const node of nodes) {
      const owner = seen.get(node.id)
      if (owner) {
        throw new Error(
          translate(getLanguage(), 'error.duplicateNodeId', {
            id: node.id,
            owner,
            label,
          }),
        )
      }
      seen.set(node.id, label)
    }
  }
  check(graph.nodes, translate(getLanguage(), 'error.currentFile'))
  for (const [id, region] of Object.entries(graph.subgraphs)) {
    check(region.nodes, regionLabel(files, id))
  }
}

/**
 * Assemble the current file and the standalone subgraph files it references into the JsonGraph the engine needs.
 *
 * Subgraph files are saved separately and read by subgraphId only at execution time,
 * then expanded into `subgraphs` for the engine. Loop bodies still belong to their file and come along with it.
 * Assembly validates file existence, direct/indirect cycles, and cross-file node ID conflicts.
 */
export async function assembleExecutionGraph(options: {
  /** The current file's latest canvas JSON (including its own loop bodies). */
  root: JsonGraph
  current: ViewMeta
  files: ViewMeta[]
  load: (id: string) => Promise<JsonGraph | null>
  isRegistered: (nodeType: string) => boolean
}): Promise<JsonGraph> {
  const { root, current, files, load, isRegistered } = options
  const filesById = new Map(files.map((file) => [file.id, file]))
  const merged: JsonGraph = {
    ...root,
    variables: root.variables.map((variable) => ({ ...variable })),
    subgraphs: { ...root.subgraphs },
  }
  const variableNames = new Set(merged.variables.map((variable) => variable.name))
  const stack: string[] = [current.id]

  const scan = async (data: JsonGraph) => {
    const nodes = [
      ...data.nodes,
      ...Object.values(data.subgraphs).flatMap((region) => region.nodes),
    ]
    for (const node of nodes) {
      const subgraphId = node.targetGraphId
      if (node.kind !== 'subgraph' || !subgraphId) continue
      // Check the current recursion path before skipping loaded regions; otherwise cycles like A→B→C→B are missed.
      if (stack.includes(subgraphId)) {
        const chain = [...stack, subgraphId].map((id) => regionLabel(filesById, id)).join(' → ')
        throw new Error(translate(getLanguage(), 'error.subgraphCycle', { chain }))
      }
      // Embedded subgraphs from old data or files already expanded need no second read at execution time.
      if (merged.subgraphs[subgraphId]) continue
      const meta = filesById.get(subgraphId)
      if (!meta) {
        throw new Error(
          translate(getLanguage(), 'error.missingSubgraph', {
            node: quoteName(node.title || node.id),
            id: subgraphId,
          }),
        )
      }
      if (meta.type !== 'subgraph') {
        throw new Error(
          translate(getLanguage(), 'error.notSubgraph', {
            node: quoteName(node.title || node.id),
            name: quoteName(meta.name),
          }),
        )
      }
      const saved = await load(subgraphId)
      if (!saved) {
        throw new Error(translate(getLanguage(), 'error.subgraphRead', { name: quoteName(meta.name) }))
      }
      const data = normalizeDataOnlyPorts(saved)
      validateNodeTypes(data, meta.name, isRegistered)
      merged.subgraphs[subgraphId] = {
        nodes: data.nodes,
        links: data.links,
        viewport: data.viewport,
      }
      for (const [loopId, loop] of Object.entries(data.subgraphs)) {
        if (merged.subgraphs[loopId]) {
          throw new Error(translate(getLanguage(), 'error.duplicateRegion', { id: loopId }))
        }
        merged.subgraphs[loopId] = loop
      }
      for (const variable of data.variables) {
        if (variableNames.has(variable.name)) continue
        variableNames.add(variable.name)
        merged.variables.push({ ...variable })
      }
      stack.push(subgraphId)
      await scan(data)
      stack.pop()
    }
  }

  await scan(root)
  assertUniqueNodeIds(merged, filesById)
  return merged
}
