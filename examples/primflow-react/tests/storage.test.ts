// @vitest-environment jsdom
import './language'
import { afterEach, beforeEach, expect, test } from 'vitest'
import type { JsonGraph } from '@lyx-pj/primflow-model'
import type { CachedSubgraphPreview } from '@lyx-pj/primflow-canvas'
import {
  createPreviewCacheAdapter,
  deleteView,
  listViews,
  loadView,
  renameView,
  saveView,
} from '../packages/workflow/storage'
import { createFakeIndexedDB, type FakeIndexedDB } from './fake-indexeddb'

const emptyGraph = (): JsonGraph => ({
  nodes: [],
  links: [],
  variables: [],
  subgraphs: {},
  viewport: { x: 0, y: 0, zoom: 1 },
})

let fake: FakeIndexedDB

beforeEach(() => {
  fake = createFakeIndexedDB()
  fake.install()
})

afterEach(() => {
  Reflect.deleteProperty(window, 'indexedDB')
})

test('保存后能列出视图并读回工作流数据', async () => {
  const data = emptyGraph()
  await saveView({ id: 'a', name: '视图 A', type: 'view', data, updatedAt: 10 })

  const views = await listViews()
  expect(views).toEqual([{ id: 'a', name: '视图 A', type: 'view', updatedAt: 10 }])
  expect(await loadView('a')).toEqual(data)
  expect(await loadView('missing')).toBeNull()
})

test('同一 id 重复保存会覆盖旧内容', async () => {
  const first = emptyGraph()
  first.viewport = { x: 1, y: 2, zoom: 2 }
  await saveView({ id: 'a', name: '视图 A', type: 'view', data: first, updatedAt: 10 })

  const second = emptyGraph()
  second.viewport = { x: 9, y: 9, zoom: 0.5 }
  await saveView({ id: 'a', name: '视图 A', type: 'view', data: second, updatedAt: 20 })

  expect(await listViews()).toHaveLength(1)
  expect((await loadView('a'))?.viewport).toEqual({ x: 9, y: 9, zoom: 0.5 })
})

test('删除视图后列表不再包含它', async () => {
  await saveView({ id: 'a', name: '视图 A', type: 'view', data: emptyGraph(), updatedAt: 10 })
  await saveView({ id: 'b', name: '视图 B', type: 'view', data: emptyGraph(), updatedAt: 20 })

  await deleteView('a')

  const views = await listViews()
  expect(views.map((view) => view.id)).toEqual(['b'])
  expect(await loadView('a')).toBeNull()
})

test('重命名只改名称，保留图形数据和更新时间', async () => {
  const data = emptyGraph()
  data.viewport = { x: 1, y: 2, zoom: 2 }
  await saveView({ id: 'a', name: '视图 A', type: 'view', data, updatedAt: 10 })

  await renameView('a', '订单流程')

  expect(await listViews()).toEqual([{ id: 'a', name: '订单流程', type: 'view', updatedAt: 10 }])
  expect(await loadView('a')).toEqual(data)
})

test('重命名不存在的视图会失败，且不影响已有视图', async () => {
  await saveView({ id: 'a', name: '视图 A', type: 'view', data: emptyGraph(), updatedAt: 10 })

  await expect(renameView('missing', '新名字')).rejects.toThrow('视图不存在')
  expect((await listViews()).map((view) => view.name)).toEqual(['视图 A'])
})

test('视图列表按最近更新排序', async () => {
  await saveView({ id: 'old', name: '旧视图', type: 'view', data: emptyGraph(), updatedAt: 10 })
  await saveView({ id: 'new', name: '新视图', type: 'view', data: emptyGraph(), updatedAt: 30 })
  await saveView({ id: 'mid', name: '中间视图', type: 'view', data: emptyGraph(), updatedAt: 20 })

  expect((await listViews()).map((view) => view.id)).toEqual(['new', 'mid', 'old'])
})

test('子图作为独立文件保存并带上类型，旧记录默认按普通视图读取', async () => {
  const data = emptyGraph()
  // Seed an old record with no type field; the list treats it as an ordinary view.
  fake.seed('bpgraph', 2, {
    views: [{ id: 'legacy', name: '旧视图', data, updatedAt: 10 }],
  })
  await saveView({ id: 'sub', name: '订单子图', type: 'subgraph', data, updatedAt: 30 })
  await saveView({ id: 'old', name: '旧记录', type: 'view', data, updatedAt: 20 })

  const views = await listViews()

  expect(views.find((view) => view.id === 'sub')?.type).toBe('subgraph')
  expect(views.find((view) => view.id === 'old')?.type).toBe('view')
  expect(views.find((view) => view.id === 'legacy')?.type).toBe('view')
  expect(await loadView('sub')).toEqual(data)
})

test('旧版本的单存档升级后迁移成第一个视图', async () => {
  const data = emptyGraph()
  fake.seed('bpgraph', 1, { graphs: [{ id: 1, data, updatedAt: 123 }] })

  const views = await listViews()

  expect(views).toHaveLength(1)
  expect(views[0].name).toBe('视图 1')
  expect(views[0].updatedAt).toBe(123)
  expect(await loadView(views[0].id)).toEqual(data)
  // Delete the old store after migration so two copies are not left behind.
  expect(fake.databases.get('bpgraph')?.objectStoreNames.contains('graphs')).toBe(false)
})

test('预览缓存可以读写，并在删除文件时一并清理', async () => {
  const adapter = createPreviewCacheAdapter()
  const preview: CachedSubgraphPreview = {
    version: 1,
    key: 'content-key',
    svg: '<svg xmlns="http://www.w3.org/2000/svg"></svg>',
    omittedNodes: 0,
    omittedLinks: 0,
  }

  await adapter.save('sub', preview)
  expect((await adapter.load()).sub).toEqual(preview)

  await adapter.remove('sub')
  expect((await adapter.load()).sub).toBeUndefined()

  await adapter.save('sub', preview)
  await deleteView('sub')
  expect((await adapter.load()).sub).toBeUndefined()
})
