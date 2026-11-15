// @vitest-environment jsdom
import { expect, test, vi } from 'vitest'
import { act, createElement, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Node, NodeRegistry, Runtime } from '@lyx-pj/workflow-engine'
import { createEngineContext } from '../src/components/create-engine-provider/create-engine-provider'

test('React Strict Mode preserves instances and Provider unmount stops execution', async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  const runtime = new Runtime(new NodeRegistry())
  const { EngineProvider, useEngine } = createEngineContext(runtime)
  let engine!: ReturnType<typeof useEngine>
  function Consumer() {
    engine = useEngine()
    return null
  }
  const root = createRoot(document.createElement('div'))
  try {
    await act(async () => root.render(createElement(StrictMode, null,
      createElement(EngineProvider, null, createElement(Consumer)))))
    const first = engine
    await engine.process()
    await act(async () => root.render(createElement(StrictMode, null,
      createElement(EngineProvider, null, createElement(Consumer)))))
    expect(engine).toBe(first)
    expect(engine.status).toBe('running')
  } finally {
    await act(async () => root.unmount())
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: false })
  }
  expect(engine.status).toBe('stopped')
})

test('Provider unmount deactivates and destroys nodes; repeated stop does not repeat cleanup', async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  const deactivate = vi.fn()
  const destroy = vi.fn()
  class Resource extends Node {
    static definition = {
      inputs: [{ name: 'exec', type: 'exec' }] as const,
      outputs: [] as const,
    }
    static executor = () => {}
    static onDeactivate = deactivate
    static onDestroy = destroy
  }
  const runtime = new Runtime(new NodeRegistry().register('resource', Resource))
  const { EngineProvider, useEngine } = createEngineContext(runtime)
  let engine!: ReturnType<typeof useEngine>
  function Consumer() {
    engine = useEngine()
    return null
  }
  const root = createRoot(document.createElement('div'))
  try {
    await act(async () => root.render(createElement(EngineProvider, null, createElement(Consumer))))
    engine.fromJSON({
      nodes: [
        { id: 'start', nodeType: 'start', type: 'start', position: { x: 0, y: 0 }, values: {}, inputs: [],
          outputs: [{ name: 'start', type: 'exec', id: 'out-exec' }] },
        { id: 'resource', nodeType: 'resource', type: 'default', position: { x: 0, y: 0 }, values: {},
          inputs: [{ name: 'exec', type: 'exec', id: 'in-exec' }], outputs: [] },
      ],
      links: [{ id: 'exec', source: { id: 'start', port: 'out-exec' }, target: { id: 'resource', port: 'in-exec' } }],
      variables: [], subgraphs: {}, viewport: { x: 0, y: 0, zoom: 1 },
    })
    await engine.process()
  } finally {
    await act(async () => root.unmount())
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: false })
  }
  await engine.whenStopped()
  await engine.stop().whenStopped()
  expect(deactivate).toHaveBeenCalledTimes(1)
  expect(destroy).toHaveBeenCalledTimes(1)
})
