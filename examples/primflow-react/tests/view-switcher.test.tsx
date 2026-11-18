// @vitest-environment jsdom
import './language'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import type { AppLanguage, CreateTarget, ViewMeta } from '../packages/workflow'
import { ViewSwitcher } from '../src/components/ViewSwitcher'

const views: ViewMeta[] = [
  { id: 'a', name: '视图 A', type: 'view', updatedAt: 10 },
  { id: 'b', name: '视图 B', type: 'view', updatedAt: 20 },
  { id: 'sub', name: '订单子图', type: 'subgraph', updatedAt: 30 },
]

let root: Root
let container: HTMLDivElement
const onSelect = vi.fn()
const onCreate = vi.fn<(name: string, target: CreateTarget) => void>()
const onRename = vi.fn()
const onDelete = vi.fn()

// jsdom lacks ResizeObserver, and Headless UI's floating layer uses it to observe trigger size.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true, ResizeObserver: ResizeObserverStub })
  vi.clearAllMocks()
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
})

async function render(overrides: { currentViewId?: string; language?: AppLanguage } = {}) {
  await act(async () => {
    root.render(
      createElement(ViewSwitcher, {
        views,
        currentViewId: 'b',
        onSelect,
        onCreate,
        onRename,
        onDelete,
        ...overrides,
      }),
    )
  })
}

function byLabel(label: string): HTMLElement {
  const element = [...document.querySelectorAll<HTMLElement>('[aria-label]')].find(
    (item) => item.getAttribute('aria-label') === label,
  )
  expect(element, `找不到 aria-label 为「${label}」的元素`).toBeDefined()
  return element as HTMLElement
}

function buttonByText(text: string): HTMLButtonElement {
  const button = [...document.querySelectorAll('button')].find((item) => item.textContent === text)
  expect(button, `找不到文案为「${text}」的按钮`).toBeDefined()
  return button as HTMLButtonElement
}

function optionByText(text: string): HTMLElement {
  const option = [...document.querySelectorAll<HTMLElement>('[role="option"]')].find((item) =>
    item.textContent?.includes(text),
  )
  expect(option, `找不到文案包含「${text}」的选项`).toBeDefined()
  return option as HTMLElement
}

function radioByText(text: string): HTMLElement {
  const radio = [...document.querySelectorAll<HTMLElement>('[role="radio"]')].find(
    (item) => item.textContent?.trim() === text,
  )
  expect(radio, `找不到文案为「${text}」的创建方式`).toBeDefined()
  return radio as HTMLElement
}

async function click(element: Element) {
  await act(async () => {
    element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
  })
}

/** Setting a controlled input's value directly does not trigger React; use the native setter and dispatch an input event. */
async function typeInto(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
  await act(async () => {
    setter?.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

test('下拉列表里的编辑按钮打开重命名弹窗，预填当前名称并可保存', async () => {
  await render()
  await click(container.querySelector('button')!)
  await click(byLabel('重命名视图「视图 A」'))
  // Headless UI collapses the dropdown when the dialog opens, avoiding two floating layers overlapping.
  expect(document.querySelector('[role="listbox"]')).toBeNull()

  const input = document.querySelector<HTMLInputElement>('[role="dialog"] input')!
  expect(input.value).toBe('视图 A')

  await typeInto(input, '  订单流程  ')
  await click(buttonByText('保存'))

  expect(onRename).toHaveBeenCalledWith('a', '订单流程')
  expect(document.querySelector('[role="dialog"]')).toBeNull()
})

test('重命名弹窗取消后不触发改名', async () => {
  await render()
  await click(container.querySelector('button')!)
  await click(byLabel('重命名视图「视图 B」'))
  await click(buttonByText('取消'))

  expect(onRename).not.toHaveBeenCalled()
  expect(document.querySelector('[role="dialog"]')).toBeNull()
})

test('名称清空后保存按钮禁用，不会提交改名', async () => {
  await render()
  await click(container.querySelector('button')!)
  await click(byLabel('重命名视图「视图 A」'))

  // Renaming prefills the current name, so saving is allowed as soon as the dialog opens.
  expect(buttonByText('保存').disabled).toBe(false)
  await typeInto(document.querySelector<HTMLInputElement>('[role="dialog"] input')!, '   ')
  expect(buttonByText('保存').disabled).toBe(true)

  await click(buttonByText('保存'))
  expect(onRename).not.toHaveBeenCalled()
})

test('列表按类型分组，子图作为独立文件可以直接切换编辑', async () => {
  await render()
  await click(container.querySelector('button')!)

  expect(optionByText('订单子图').textContent).toContain('子图')
  await click(optionByText('订单子图'))

  expect(onSelect).toHaveBeenCalledWith('sub')
  expect(document.querySelector('[role="listbox"]')).toBeNull()
})

test('当前文件是子图时，触发器带子图标识并可切回普通视图', async () => {
  await render({ currentViewId: 'sub' })
  expect(container.textContent).toContain('订单子图')
  expect(container.textContent).toContain('子图')

  await click(container.querySelector('button')!)
  await click(optionByText('视图 A'))

  expect(onSelect).toHaveBeenCalledWith('a')
})

test('子图文件支持独立重命名，弹窗使用子图文案', async () => {
  await render()
  await click(container.querySelector('button')!)
  await click(byLabel('重命名子图「订单子图」'))

  const dialog = document.querySelector('[role="dialog"]')
  expect(dialog?.textContent).toContain('重命名子图')
  expect(dialog?.textContent).toContain('子图名称')
  const input = document.querySelector<HTMLInputElement>('[role="dialog"] input')!
  expect(input.value).toBe('订单子图')

  await typeInto(input, '订单校验')
  await click(buttonByText('保存'))

  expect(onRename).toHaveBeenCalledWith('sub', '订单校验')
})

test('新建弹窗默认创建普通视图', async () => {
  await render()
  await click(container.querySelector('button')!)
  await click(optionByText('新建…'))

  expect(document.querySelector('[role="dialog"]')?.textContent).toContain('新建视图')
  await typeInto(document.querySelector<HTMLInputElement>('[role="dialog"] input')!, '订单流程')
  await click(buttonByText('创建'))

  expect(onCreate).toHaveBeenCalledWith('订单流程', 'view')
})

test('新建弹窗可以切换成独立子图文件，提交时带上创建方式', async () => {
  await render()
  await click(container.querySelector('button')!)
  await click(optionByText('新建…'))
  await click(radioByText('子图'))

  const dialogText = document.querySelector('[role="dialog"]')?.textContent ?? ''
  expect(dialogText).toContain('新建子图')
  expect(dialogText).toContain('子图名称')
  expect(dialogText).toContain('子图是独立文件')

  await typeInto(document.querySelector<HTMLInputElement>('[role="dialog"] input')!, '订单校验')
  await click(buttonByText('创建'))

  expect(onCreate).toHaveBeenCalledWith('订单校验', 'subgraph')
})

test('英文语言下文件列表、重命名弹窗和新建方式都显示英文', async () => {
  await render({ language: 'en' })
  await click(container.querySelector('button')!)

  expect(document.body.textContent).toContain('Views')
  expect(document.body.textContent).toContain('Subgraphs')
  expect(optionByText('订单子图').textContent).toContain('Subgraph')

  await click(byLabel('Rename view "视图 A"'))
  const renameDialog = document.querySelector('[role="dialog"]')
  expect(renameDialog?.textContent).toContain('Rename view')
  expect(renameDialog?.textContent).toContain('View name')
  await click(buttonByText('Cancel'))
  await click(container.querySelector('button')!)

  await click(optionByText('New…'))
  const createDialog = document.querySelector('[role="dialog"]')
  expect(createDialog?.textContent).toContain('New view')
  expect(createDialog?.textContent).toContain('Create as')
  await click(radioByText('Subgraph'))
  expect(createDialog?.textContent).toContain('New subgraph')
  expect(createDialog?.textContent).toContain('Subgraph name')
  expect(createDialog?.textContent).toContain('A subgraph is an independent file')
  await typeInto(document.querySelector<HTMLInputElement>('[role="dialog"] input')!, 'Order validation')
  await click(buttonByText('Create'))

  expect(onCreate).toHaveBeenCalledWith('Order validation', 'subgraph')
})
