import { expect, expectTypeOf, test } from 'vitest'
import { NodeRegistry } from '@lyx-pj/primflow-model'
import { Engine } from '../src/Engine'
import { defineExecutor, defineNode, defineService, type ServiceValues } from '../src'

test('definition helpers infer ports, executor names, and service contracts', () => {
  const format = defineService('format', { value: (value: number) => value.toFixed(2) })
  const formatter = defineService('formatter', {
    dependsOn: [format],
    create({ getService }) {
      const formatNumber = getService('format')
      expectTypeOf(formatNumber).toEqualTypeOf<(value: number) => string>()
      if (false) {
        // @ts-expect-error Only declared dependencies can be looked up.
        getService('missing')
      }
      return { formatNumber }
    },
  })
  const Format = defineNode({
    executor: 'workflow.format',
    definition: {
      inputs: [{ name: 'exec', type: 'exec' }, { name: 'value', type: 'number' }],
      outputs: [{ name: 'done', type: 'exec' }, { name: 'result', type: 'string' }],
    },
  })
  expectTypeOf(Format.definition.inputs[1].name).toEqualTypeOf<'value'>()
  const executor = defineExecutor(Format, ({ getInput, setOutput, next, services }) => {
    const value = getInput('value')
    expectTypeOf(value).toEqualTypeOf<number | undefined>()
    setOutput('result', services.require('formatter').formatNumber(value ?? 0))
    next(['done'])
    // @ts-expect-error Unknown input name.
    getInput('vale')
    // @ts-expect-error Execution ports are not data inputs.
    getInput('exec')
    // @ts-expect-error The result port requires a string.
    setOutput('result', 42)
    // @ts-expect-error Data ports cannot be used as execution branches.
    next(['result'])
    // @ts-expect-error Only the declared service is visible to this executor.
    services.require('format')
    // @ts-expect-error The factory inferred a number parameter for the returned service.
    services.require('formatter').formatNumber('1')
  }, { services: [formatter] })
  expectTypeOf(executor.name).toEqualTypeOf<'workflow.format'>()

  const engine = new Engine(new NodeRegistry().register('Format', Format), { services: [formatter, format] })
  engine.registerExecutor(executor)
  expectTypeOf<ServiceValues<[typeof formatter, typeof format]>>().toEqualTypeOf<{
    format: (value: number) => string
    formatter: { formatNumber: (value: number) => string }
  }>()
  expect(engine).toBeTruthy()

  if (false) {
    // @ts-expect-error Executor registration requires a definition.
    engine.registerExecutor('workflow.format', () => {})
    // @ts-expect-error Services are installed at engine construction.
    engine.registerService('format', () => '')
  }
})
