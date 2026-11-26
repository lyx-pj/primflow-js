// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it } from 'vitest'
import { assetStore } from '../packages/workflow/services/assets'
import { createFakeIndexedDB } from './fake-indexeddb'

beforeEach(() => createFakeIndexedDB().install())
afterEach(() => Reflect.deleteProperty(window, 'indexedDB'))

it('persists references and reads the same bytes', async () => {
  const bytes = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]).buffer
  const reference = await assetStore.put(bytes, 'image/png')
  const reopened = JSON.parse(JSON.stringify(reference)) as typeof reference
  expect(await assetStore.read(reopened)).toEqual(bytes)
})

it('rejects files whose signature does not match the selected type', async () => {
  const bytes = new TextEncoder().encode('not a png').buffer
  await expect(assetStore.put(bytes, 'image/png')).rejects.toThrow(/format/)
  await expect(assetStore.read({ assetId: 'missing', mediaType: 'image/png' })).rejects.toThrow(/missing/)
})
