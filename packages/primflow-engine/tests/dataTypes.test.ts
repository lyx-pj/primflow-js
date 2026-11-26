import { describe, expect, expectTypeOf, it } from 'vitest'
import {
  defineDataType,
  defineNode,
  isBuiltinDataType,
  isControlPort,
  isDataPort,
  isSpacerPort,
  NodeRegistry,
  schema,
  type JsonGraph
} from '@lyx-pj/primflow-model'
import { defineExecutor, Engine } from '../src'

const Image = defineDataType({
  id: 'media.image@1',
  schema: schema.object({ assetId: schema.string(), mediaType: schema.enum(['image/png', 'image/jpeg']) }),
})
const Document = defineDataType({
  id: 'document.pdf@1',
  schema: schema.object({ assetId: schema.string() }),
})
const Source = defineNode({ executor: 'asset.source', definition: { inputs: [], outputs: [{ name: 'value', type: Image }] } })
const Target = defineNode({ definition: { inputs: [{ name: 'value', type: Document }], outputs: [] } })

function setup() {
  return new NodeRegistry().registerDataType(Image).registerDataType(Document)
    .register('asset-source', Source).register('asset-target', Target)
}
function graph(): JsonGraph {
  return {
    nodes: [
      { id: 'source', kind: 'default', definitionId: 'asset-source', position: { x: 0, y: 0 },
        inputs: [], outputs: [{ name: 'value', id: 'out' }], inputValues: {} },
      { id: 'target', kind: 'default', definitionId: 'asset-target', position: { x: 0, y: 0 },
        inputs: [{ name: 'value', id: 'in' }], outputs: [], inputValues: {} },
    ],
    links: [{ id: 'link', source: { id: 'source', port: 'out' }, target: { id: 'target', port: 'in' } }],
    subgraphs: {}, variables: [], viewport: { x: 0, y: 0, zoom: 1 },
  }
}

describe('registered workflow types', () => {
  it('infers the allowed fields and media types in a typed executor', () => {
    defineExecutor(Source, (ctx) => {
      expectTypeOf<Parameters<typeof ctx.setOutput>[1]>()
        .toMatchTypeOf<{ assetId: string; mediaType: 'image/png' | 'image/jpeg' }>()
      ctx.setOutput('value', { assetId: 'file', mediaType: 'image/png' })
      // @ts-expect-error Wrong media type for the registered output.
      ctx.setOutput('value', { assetId: 'file', mediaType: 'application/pdf' })
    })
  })

  it('reports nested errors and uses the same validation for runtime writes', () => {
    const registry = setup()
    const engine = new Engine(registry)
    const source = engine.createNodeInstance('asset-source')
    expect(() => source.setOutput('value', { assetId: 'one', mediaType: 'application/pdf' })).toThrow(/value.mediaType/)
    expect(() => source.setOutput('value', { assetId: 'one', mediaType: 'image/png' })).not.toThrow()
  })

  it('rejects incompatible named types when loading a graph', () => {
    expect(() => new Engine(setup()).loadGraph(graph())).toThrow(/media.image@1.*document.pdf@1/)
  })

  it('validates persisted inputs before execution', () => {
    const json = graph()
    json.links = []
    json.nodes[1]!.inputValues = { value: {} }
    expect(() => new Engine(setup()).loadGraph(json)).toThrow(/value.assetId/)
  })
})

describe('port type predicates', () => {
  it('separates control ports from data ports', () => {
    expect(isControlPort('exec')).toBe(true)
    expect(isControlPort('spacer')).toBe(true)
    expect(isControlPort('string')).toBe(false)
    expect(isControlPort('media.image@1')).toBe(false)

    expect(isSpacerPort('spacer')).toBe(true)
    expect(isSpacerPort('exec')).toBe(false)

    expect(isDataPort('string')).toBe(true)
    expect(isDataPort('media.image@1')).toBe(true)
    expect(isDataPort('exec')).toBe(false)
    expect(isDataPort('spacer')).toBe(false)
  })

  it('treats control ports as outside the builtin data type set', () => {
    expect(isBuiltinDataType('exec')).toBe(false)
    expect(isBuiltinDataType('spacer')).toBe(false)
    expect(isBuiltinDataType('string')).toBe(true)
  })

  it('keeps control port connection rules', () => {
    const types = setup().dataTypes
    expect(types.checkConnection('exec', 'exec')).toBe(true)
    expect(types.checkConnection('exec', 'string')).toBe(false)
    expect(types.checkConnection('spacer', 'spacer')).toBe(false)
    expect(types.checkConnection('spacer', 'string')).toBe(false)
    expect(types.checkConnection('media.image@1', 'media.image@1')).toBe(true)
    expect(types.checkConnection('media.image@1', 'document.pdf@1')).toBe(false)
    expect(types.checkConnection('media.image@1', 'any')).toBe(true)
  })
})
