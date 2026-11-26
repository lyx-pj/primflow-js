import { expect, test, type Locator, type Page } from '@playwright/test'

function canvasNode(page: Page, title: string) {
  return page.locator('.bpgraph-element').filter({ has: page.getByText(title, { exact: true }) })
}

/** Body nodes are real cells; a preview clone can carry the same model id. */
function loopEntryNode(page: Page) {
  return page.locator(
    'xpath=//*[contains(concat(" ", normalize-space(@class), " "), " bpgraph-element ") ' +
    'and starts-with(@model-id, "loop-entry-") ' +
    'and not(ancestor::*[contains(@class, "bpgraph-subgraph-preview")])]',
  ).filter({ visible: true }).first()
}

async function openPalette(page: Page, x: number, y: number) {
  await page.mouse.dblclick(x, y)
  const palette = page.getByRole('dialog', { name: 'Add node' })
  await expect(palette).toBeVisible()
  return palette
}

/**
 * Identify a canvas node by its model id.
 *
 * Same-titled nodes share a locator and the DOM order does not follow the
 * creation order, so the stable model id is the only reliable handle.
 */
function nodeById(page: Page, modelId: string) {
  return page.locator(`.bpgraph-element[model-id="${modelId}"]`)
}

async function addNode(page: Page, title: string, x: number, y: number) {
  const palette = await openPalette(page, x, y)
  await palette.getByRole('textbox', { name: 'Search nodes' }).fill(title)
  await palette.getByRole('button', { name: title, exact: true }).click()
  const node = canvasNode(page, title).last()
  await expect(node).toBeVisible()
  return node
}

async function center(locator: Locator) {
  await expect(locator).toBeVisible()
  const box = (await locator.boundingBox())!
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

/**
 * Wait until the edit is written to storage.
 *
 * The indicator shows whole seconds, so a save that finishes in the same second
 * as the previous one keeps the same timestamp text. The new save still reports
 * a pending/saving state first; accept either that state or a changed timestamp.
 */
async function waitForSaved(page: Page, previous?: string | null) {
  const saved = page.getByRole('status').filter({ hasText: /^Saved/ })
  if (previous === undefined) {
    await expect(saved).toBeVisible()
    return
  }
  await expect.poll(async () => {
    if (await page.getByRole('status').filter({ hasText: /^(Pending|Saving)/ }).count()) return 'writing'
    const changed = (await saved.count()) > 0 && (await saved.textContent()) !== previous
    return changed ? 'saved' : 'waiting'
  }).not.toBe('waiting')
  await expect(saved).toBeVisible()
}

async function addNodeAt(page: Page, title: string, x: number, y: number) {
  const node = await addNode(page, title, x, 115)
  // Place nodes explicitly after the palette closes so their port hit areas stay separate.
  const from = await center(node.getByText(title, { exact: true }).first())
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(x, y, { steps: 10 })
  await page.mouse.up()
  // Return a locator bound to this node's model id, so same-titled nodes stay distinct.
  const modelId = (await node.getAttribute('model-id'))!
  return nodeById(page, modelId)
}

/** Select a node through its body; card titles ignore pointer events. */
async function clickNodeCenter(page: Page, node: Locator) {
  const box = (await node.boundingBox())!
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
}

async function dblclickNodeCenter(page: Page, node: Locator) {
  const box = (await node.boundingBox())!
  await page.mouse.dblclick(box.x + box.width / 2, box.y + box.height / 2)
}

async function openNodePanel(page: Page) {
  const panel = page.locator('.bpgraph-node-panel')
  if (await panel.isVisible()) return
  await page.locator('[data-action="node-panel"]').click()
  await expect(panel).toBeVisible()
}

async function closeNodePanel(page: Page) {
  const panel = page.locator('.bpgraph-node-panel')
  if (!(await panel.isVisible())) return
  await page.locator('[data-action="node-panel"]').click()
  await expect(panel).toHaveCount(0)
}

async function connect(page: Page, source: Locator, target: Locator) {
  const from = await center(source)
  const to = await center(target)
  const before = await page.locator('.bpgraph-link').count()
  // A drag can miss the port magnet, so retry once until the link appears.
  for (let attempt = 0; attempt < 2; attempt += 1) {
    await page.mouse.move(from.x, from.y)
    await page.mouse.down()
    await page.mouse.move(to.x, to.y, { steps: 10 })
    await page.mouse.up()
    // A missed drop now keeps a draft link and opens the add-and-connect palette.
    if (await page.locator('.bpgraph-palette').count()) {
      await page.keyboard.press('Escape')
      continue
    }
    if ((await page.locator('.bpgraph-link').count()) > before) return
  }
  await expect(page.locator('.bpgraph-palette')).toHaveCount(0)
  expect(await page.locator('.bpgraph-link').count()).toBe(before + 1)
}

async function dragPortToBlank(page: Page, source: Locator, x: number, y: number) {
  const from = await center(source)
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(x, y, { steps: 10 })
  await page.mouse.up()
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'View 1' })).toBeVisible()
  await expect(canvasNode(page, 'Start')).toBeVisible()
})

test('画布避开侧栏和顶栏后，框选仍跟随光标并选中框内节点', async ({ page }) => {
  await closeNodePanel(page)
  const text = await addNodeAt(page, 'Text Input', 630, 305)
  await page.addStyleTag({ content: `
    div:has(> .graph-view) {
      position: absolute !important;
      inset: 72px 0 0 240px;
      width: auto !important;
      height: auto !important;
    }
  ` })
  await page.getByRole('button', { name: 'Zoom in' }).click()

  const startBox = (await canvasNode(page, 'Start').boundingBox())!
  const textBox = (await text.boundingBox())!
  const left = Math.floor(Math.min(startBox.x, textBox.x)) - 24
  const top = Math.floor(Math.min(startBox.y, textBox.y)) - 24
  const right = Math.ceil(Math.max(startBox.x + startBox.width, textBox.x + textBox.width)) + 24
  const bottom = Math.ceil(Math.max(startBox.y + startBox.height, textBox.y + textBox.height)) + 24

  await page.mouse.move(right, bottom)
  await page.mouse.down()
  // The canvas starts drawing the rectangle only after a 100 ms press.
  await page.waitForTimeout(120)
  await page.mouse.move(left, top, { steps: 10 })

  const rectangle = page.locator('.graph-view > svg > rect')
  await expect(rectangle).toBeVisible()
  const box = (await rectangle.boundingBox())!
  // The measured bounds include the stroke, which extends past each edge.
  expect(Math.abs(box.x - left)).toBeLessThanOrEqual(1)
  expect(Math.abs(box.y - top)).toBeLessThanOrEqual(1)
  expect(Math.abs(box.x + box.width - right)).toBeLessThanOrEqual(1)
  expect(Math.abs(box.y + box.height - bottom)).toBeLessThanOrEqual(1)

  await page.mouse.up()
  await expect(rectangle).toHaveClass('selection-effect')
})

test('从输入端反向拖出的连线可以保存、恢复和执行', async ({ page }) => {
  const output = await addNodeAt(page, 'Debug Output', 535, 280)
  await waitForSaved(page)
  const status = page.getByRole('status').filter({ hasText: /^Saved/ })
  const beforeLink = await status.textContent()
  await connect(
    page,
    output.locator('[port-group="in"] [data-port-kind="exec"]'),
    canvasNode(page, 'Start').locator('[port-group="out"] [data-port-kind="exec"]'),
  )
  await waitForSaved(page, beforeLink)
  await page.reload()
  await expect(page.locator('.bpgraph-link')).toHaveCount(1)
  await page.getByRole('button', { name: 'Run', exact: true }).click()
  await expect(output).toHaveAttribute('data-node-execution-status', 'completed')
})

test('拖到空白处按端口过滤节点，并原子添加节点和连线', async ({ page }) => {
  await closeNodePanel(page)
  const start = canvasNode(page, 'Start')
  const execOut = start.locator('[port-group="out"] [data-port-kind="exec"]')
  const beforeNodes = await page.locator('.bpgraph-element').count()
  const beforeLinks = await page.locator('.bpgraph-link').count()

  await dragPortToBlank(page, execOut, 820, 480)
  const palette = page.getByRole('dialog', { name: 'Add and connect node' })
  await expect(palette).toBeVisible()
  // The draft link stays visible while the palette is open.
  await expect(page.locator('.bpgraph-link')).toHaveCount(beforeLinks + 1)
  await expect(palette.locator('.bpgraph-palette-item[data-type="Delay"]')).toBeVisible()
  // TextInput has no exec input, so it must not be offered for an exec output.
  await expect(palette.locator('.bpgraph-palette-item[data-type="TextInput"]')).toHaveCount(0)
  // The connection palette is modal: clicking outside the panel does not dismiss it.
  await page.mouse.click(200, 600)
  await expect(palette).toBeVisible()

  await palette.locator('.bpgraph-palette-item[data-type="Delay"]').click()
  await expect(page.locator('.bpgraph-element')).toHaveCount(beforeNodes + 1)
  await expect(page.locator('.bpgraph-link')).toHaveCount(beforeLinks + 1)

  await page.locator('[data-action="undo"]').click()
  await expect(page.locator('.bpgraph-element')).toHaveCount(beforeNodes)
  await expect(page.locator('.bpgraph-link')).toHaveCount(beforeLinks)
})

test('Esc 放弃连线触发的添加面板，不修改图', async ({ page }) => {
  await closeNodePanel(page)
  const start = canvasNode(page, 'Start')
  const beforeNodes = await page.locator('.bpgraph-element').count()
  const beforeLinks = await page.locator('.bpgraph-link').count()

  await dragPortToBlank(page, start.locator('[port-group="out"] [data-port-kind="exec"]'), 820, 480)
  const palette = page.getByRole('dialog', { name: 'Add and connect node' })
  await expect(palette).toBeVisible()
  await expect(page.locator('.bpgraph-link')).toHaveCount(beforeLinks + 1)
  await page.keyboard.press('Escape')
  await expect(palette).toHaveCount(0)
  await expect(page.locator('.bpgraph-element')).toHaveCount(beforeNodes)
  await expect(page.locator('.bpgraph-link')).toHaveCount(beforeLinks)
})

test('已有连线端点拖到空白后替换目标节点，并可一次撤销恢复', async ({ page }) => {
  await closeNodePanel(page)
  const start = canvasNode(page, 'Start')
  const output = await addNodeAt(page, 'Delay', 600, 300)
  await connect(
    page,
    start.locator('[port-group="out"] [data-port-kind="exec"]'),
    output.locator('[port-group="in"] [data-port-kind="exec"]'),
  )
  const link = page.locator('.bpgraph-link').first()
  const linkBox = (await link.boundingBox())!
  await page.mouse.click(linkBox.x + linkBox.width / 2, linkBox.y + linkBox.height / 2)
  const handle = page.locator('.target-arrowhead')
  await expect(handle).toBeVisible()

  const beforeNodes = await page.locator('.bpgraph-element').count()
  await dragPortToBlank(page, handle, 840, 500)
  const palette = page.getByRole('dialog', { name: 'Add and connect node' })
  await expect(palette).toBeVisible()
  await palette.locator('.bpgraph-palette-item[data-type="TextTemplate"]').click()

  // The original link is replaced rather than duplicated.
  await expect(page.locator('.bpgraph-element')).toHaveCount(beforeNodes + 1)
  await expect(page.locator('.bpgraph-link')).toHaveCount(1)
  await page.locator('[data-action="undo"]').click()
  await expect(page.locator('.bpgraph-element')).toHaveCount(beforeNodes)
  await expect(page.locator('.bpgraph-link')).toHaveCount(1)
})


test('下拉和多行编辑器保留字符串输入类型', async ({ page }) => {
  const select = await addNodeAt(page, 'Select Input', 530, 180)
  const text = await addNodeAt(page, 'Multiline Text Input', 750, 340)
  const panel = page.locator('.bpgraph-node-panel')
  await openNodePanel(page)
  await select.getByText('Select Input', { exact: true }).click()
  await expect(panel.getByText('value · string', { exact: true })).toBeVisible()
  await panel.locator('select[data-field="value"]').selectOption('medium')

  await text.getByText('Multiline Text Input', { exact: true }).click()
  await expect(panel.getByText('value · string', { exact: true })).toBeVisible()
  await panel.locator('textarea[data-field="value"]').fill('First\nSecond')
  await expect(panel.locator('textarea[data-field="value"]')).toHaveValue('First\nSecond')
})

test('右侧节点面板默认打开，总览可定位节点并切换标签', async ({ page }) => {
  const toggle = page.locator('[data-action="node-panel"]')
  const panel = page.locator('.bpgraph-node-panel')
  await expect(panel).toBeVisible()
  await expect(panel.getByRole('heading', { name: 'Graph overview' })).toBeVisible()
  await expect(toggle).toHaveAttribute('aria-label', 'Hide node panel')

  const overview = panel.getByRole('list', { name: 'Nodes in this view' })
  await overview.getByRole('button', { name: 'Start' }).click()
  await expect(panel.getByRole('heading', { name: 'Start' })).toBeVisible()

  // Clicking an overview node centers it in the canvas viewport.
  const nodeBox = (await canvasNode(page, 'Start').boundingBox())!
  const canvasBox = (await page.locator('.graph-view').boundingBox())!
  expect(Math.abs(nodeBox.x + nodeBox.width / 2 - (canvasBox.x + canvasBox.width / 2))).toBeLessThan(2)
  expect(Math.abs(nodeBox.y + nodeBox.height / 2 - (canvasBox.y + canvasBox.height / 2))).toBeLessThan(2)

  // The minimap sits in the bottom-left corner and stays clear of the open right-side panel.
  const minimapBox = (await page.locator('.bpgraph-minimap').boundingBox())!
  const panelBox = (await panel.boundingBox())!
  expect(Math.abs(minimapBox.x - canvasBox.x - 12)).toBeLessThanOrEqual(1)
  expect(Math.abs(canvasBox.y + canvasBox.height - (minimapBox.y + minimapBox.height) - 12)).toBeLessThanOrEqual(1)
  expect(minimapBox.x + minimapBox.width).toBeLessThan(panelBox.x)

  // The toolbar centers in the canvas area left of the open panel, and the file control
  // moved below the toolbar band so a left-aligned toolbar cannot cover it.
  const toolbar = page.locator('.bpgraph-toolbar')
  const toolbarBox = (await toolbar.boundingBox())!
  const selectorBox = (await page.locator('.view-switcher').boundingBox())!
  expect(Math.abs(toolbarBox.x + toolbarBox.width / 2 - (canvasBox.x + panelBox.x) / 2)).toBeLessThanOrEqual(1)
  expect(toolbarBox.x + toolbarBox.width).toBeLessThan(panelBox.x)
  expect(Math.abs(selectorBox.y - 56)).toBeLessThanOrEqual(1)

  await panel.getByRole('tab', { name: 'Global settings' }).click()
  await expect(panel.getByRole('heading', { name: 'Global settings' })).toBeVisible()
  await expect(panel.getByText('No global settings')).toBeVisible()

  await panel.getByRole('button', { name: 'Close' }).click()
  await expect(panel).toHaveCount(0)
  await expect(toggle).toHaveAttribute('aria-label', 'Show node panel')
  const fullWidthBox = (await toolbar.boundingBox())!
  expect(Math.abs(fullWidthBox.x + fullWidthBox.width / 2 - (canvasBox.x + canvasBox.width / 2))).toBeLessThanOrEqual(1)
  await toggle.click()
  await expect(panel).toBeVisible()
  const restoredBox = (await toolbar.boundingBox())!
  expect(Math.abs(restoredBox.x + restoredBox.width / 2 - (canvasBox.x + panelBox.x) / 2)).toBeLessThanOrEqual(1)
})

test('窄窗口下工具栏避开面板并把多余动作收进更多菜单', async ({ page }) => {
  await page.locator('[data-action="debug-panel"]').click()
  await expect(page.locator('.bpgraph-debug-panel')).toBeVisible()

  // Both panels fit at the default width; the toolbar centers between the canvas and the node panel.
  const wideCanvas = (await page.locator('.graph-view').boundingBox())!
  const widePanel = (await page.locator('.bpgraph-node-panel').boundingBox())!
  const wideToolbar = (await page.locator('.bpgraph-toolbar').boundingBox())!
  expect(Math.abs(wideToolbar.x + wideToolbar.width / 2 - (wideCanvas.x + widePanel.x) / 2)).toBeLessThanOrEqual(1)

  await page.setViewportSize({ width: 960, height: 720 })

  const more = page.locator('[data-action="more"]')
  await expect(more).toBeVisible()
  const toolbarBox = (await page.locator('.bpgraph-toolbar').boundingBox())!
  const panelBox = (await page.locator('.bpgraph-node-panel').boundingBox())!
  const selectorBox = (await page.locator('.view-switcher').boundingBox())!
  expect(toolbarBox.x + toolbarBox.width).toBeLessThan(panelBox.x)
  expect(toolbarBox.y + toolbarBox.height).toBeLessThanOrEqual(selectorBox.y)

  await more.click()
  const menu = page.getByRole('menu', { name: 'More actions' })
  await expect(menu).toBeVisible()
  await menu.getByRole('menuitem', { name: 'Hide debug panel' }).click()
  await expect(page.locator('.bpgraph-debug-panel')).toHaveCount(0)
  await expect(more).toHaveCount(0)
  const restoredBox = (await page.locator('.bpgraph-toolbar').boundingBox())!
  const restoredPanelBox = (await page.locator('.bpgraph-node-panel').boundingBox())!
  expect(restoredBox.x + restoredBox.width).toBeLessThan(restoredPanelBox.x)
})

test('Loop 节点面板保存次数上限和超时，清空时恢复默认值', async ({ page }) => {
  const node = await addNode(page, 'Loop', 500, 180)
  await waitForSaved(page)
  await openNodePanel(page)
  await clickNodeCenter(page, node)
  const panel = page.locator('.bpgraph-node-panel')
  await expect(panel.getByText('Behavior: Loop', { exact: true })).toBeVisible()
  const iterations = page.getByRole('spinbutton', { name: 'Maximum iterations' })
  const timeout = page.getByRole('spinbutton', { name: 'Timeout (ms)' })
  await expect(iterations).toHaveValue('')
  await expect(timeout).toHaveValue('')

  // The loop limit fields are plain panel rows; the card's limit chip styling must not leak in.
  const limitField = iterations.locator('xpath=..')
  await expect(limitField).toHaveClass(/bpgraph-node-panel-field/)
  await expect(limitField).not.toHaveClass(/bpgraph-loop-limit/)
  await expect(limitField).toHaveCSS('border-top-width', '0px')
  await expect(limitField).toHaveCSS('border-radius', '0px')

  const status = page.getByRole('status').filter({ hasText: /^Saved/ })
  const beforeEdit = await status.textContent()
  await iterations.fill('3')
  await timeout.fill('1500')
  await timeout.press('Tab')
  await waitForSaved(page, beforeEdit)

  await page.reload()
  await openNodePanel(page)
  await clickNodeCenter(page, node)
  await expect(iterations).toHaveValue('3')
  await expect(timeout).toHaveValue('1500')

  await iterations.fill('1.5')
  await iterations.press('Tab')
  await expect.poll(() => iterations.evaluate((input: HTMLInputElement) => input.validity.valid)).toBe(false)
  await timeout.fill('0')
  await timeout.press('Tab')
  await expect.poll(() => timeout.evaluate((input: HTMLInputElement) => input.validity.valid)).toBe(false)
  await timeout.fill('')
  await timeout.press('Tab')
  await waitForSaved(page)

  await page.reload()
  await openNodePanel(page)
  await clickNodeCenter(page, node)
  await expect(iterations).toHaveValue('3')
  await expect(timeout).toHaveValue('')

  await dblclickNodeCenter(page, node)
  const entry = loopEntryNode(page)
  await expect(entry.getByText('Initial value', { exact: true }).filter({ visible: true }).first()).toBeVisible()
  await expect(entry.getByText('Iteration input', { exact: true }).filter({ visible: true }).first()).toBeVisible()

  await page.getByRole('button', { name: 'Back', exact: true }).click()
  await connect(
    page,
    canvasNode(page, 'Start').locator('[port-group="out"] [data-port-kind="exec"]'),
    node.locator('[port-group="in"] [data-port-kind="exec"]'),
  )
  await page.getByRole('button', { name: 'Run', exact: true }).click()
  await expect(node).toHaveAttribute('data-node-execution-status', 'failed')
  await page.getByRole('button', { name: 'Show debug panel' }).click()
  await expect(page.getByRole('region', { name: 'Logs' })
    .getByText(/Loop failed \(limit\).*LoopLimitExceeded.*index=2/)).toBeVisible()
})

test('添加面板的搜索框聚焦时不显示 outline', async ({ page }) => {
  const palette = await openPalette(page, 500, 180)
  const search = palette.getByRole('textbox', { name: 'Search nodes' })
  await expect(search).toBeFocused()
  expect(await search.evaluate((element) => getComputedStyle(element).outlineStyle)).toBe('none')
})

test('基础输入分类展示七种节点，并可按 JSON 搜索', async ({ page }) => {
  const palette = await openPalette(page, 500, 180)
  await palette.getByRole('button', { name: /^Basic input/ }).click()
  const group = palette.getByRole('region', { name: 'Basic input' })
  await expect(group.getByRole('button')).toHaveCount(7)
  for (const title of [
    'Text Input', 'Number Input', 'Toggle Input', 'Array Input',
    'Object Input', 'Multiline Text Input', 'Select Input',
  ]) {
    await expect(group.getByRole('button', { name: title, exact: true })).toBeVisible()
  }

  await palette.getByRole('textbox', { name: 'Search nodes' }).fill('json')
  await expect(group.getByRole('button')).toHaveCount(2)
  await expect(group.getByRole('button', { name: 'Array Input' })).toBeVisible()
  await expect(group.getByRole('button', { name: 'Object Input' })).toBeVisible()
})

test('Object Input 使用 JSON 代码编辑器修改值并在刷新后恢复已保存的值', async ({ page }) => {
  const node = await addNode(page, 'Object Input', 500, 180)
  await openNodePanel(page)
  await node.click({ position: { x: 24, y: 12 } })

  // Structured values use a code editor instead of a plain textarea.
  const editor = page.locator('.bpgraph-json-editor')
  await expect(editor).toBeVisible()
  await expect(editor).toHaveAttribute('aria-label', 'Object')
  await expect(editor.locator('.cm-editor')).toBeVisible()
  // The code editor exposes the document as an editable textbox.
  const surface = editor.locator('.cm-content')
  await expect(surface).toHaveAttribute('contenteditable', 'true')
  // The node starts with its default object value.
  await expect(surface).toContainText('"name": "Workflow"')
  // JSON tokens are highlighted with distinct colors.
  const colors = await surface.locator('span').evaluateAll((els) =>
    els.map((el) => ({ text: el.textContent ?? '', color: getComputedStyle(el).color }))
  )
  const nameColor = colors.find((token) => token.text === '"name"')?.color
  const valueColor = colors.find((token) => token.text === '"Workflow"')?.color
  expect(nameColor).toBeTruthy()
  expect(valueColor).toBeTruthy()
  // Property names and string values use different colors.
  expect(nameColor).not.toBe(valueColor)

  // Type a new value into the document.
  const savedBefore = await page.getByRole('status').filter({ hasText: /^Saved/ }).textContent().catch(() => null)
  await surface.click()
  await page.keyboard.press('ControlOrMeta+a')
  await page.keyboard.type('{ "count": 7 }')

  await waitForSaved(page, savedBefore)

  await page.reload()
  await expect(node).toBeVisible()
  await openNodePanel(page)
  await node.click({ position: { x: 24, y: 12 } })
  const restored = page.locator('.bpgraph-json-editor')
  await expect(restored).toBeVisible()
  await expect(restored.locator('.cm-content')).toContainText('"count": 7')
})

test('Array Input 使用 JSON 代码编辑器修改值并在刷新后恢复已保存的值', async ({ page }) => {
  const node = await addNode(page, 'Array Input', 500, 180)
  await openNodePanel(page)
  await node.click({ position: { x: 24, y: 12 } })

  const editor = page.locator('.bpgraph-json-editor')
  await expect(editor).toBeVisible()
  await expect(editor).toHaveAttribute('aria-label', 'Array')
  await expect(editor.locator('.cm-editor')).toBeVisible()

  const surface = editor.locator('.cm-content')
  const savedBefore = await page.getByRole('status').filter({ hasText: /^Saved/ }).textContent().catch(() => null)
  await surface.click()
  await page.keyboard.press('ControlOrMeta+a')
  await page.keyboard.type('[7, 8]')

  await waitForSaved(page, savedBefore)

  await page.reload()
  await expect(node).toBeVisible()
  await openNodePanel(page)
  await node.click({ position: { x: 24, y: 12 } })
  const restored = page.locator('.bpgraph-json-editor')
  await expect(restored).toBeVisible()
  await expect(restored.locator('.cm-content')).toContainText('7')
})

test('JSON 代码编辑器在语法错误时保留上一次的有效值', async ({ page }) => {
  const node = await addNode(page, 'Object Input', 500, 180)
  await openNodePanel(page)
  await node.click({ position: { x: 24, y: 12 } })

  const editor = page.locator('.bpgraph-json-editor')
  await expect(editor).toBeVisible()
  const surface = editor.locator('.cm-content')

  await surface.click()
  await page.keyboard.press('ControlOrMeta+a')
  await page.keyboard.type('{ "count": 7 }')
  await waitForSaved(page)
  // An incomplete document is reported as a lint error and keeps the value.
  await page.keyboard.press('ControlOrMeta+a')
  await page.keyboard.type('{ "count": ')
  // The linter runs on a delay, so the marker appears shortly after typing.
  await expect(editor.locator('.cm-lintPoint-error')).toBeVisible()

  await page.reload()
  await expect(node).toBeVisible()
  await openNodePanel(page)
  await node.click({ position: { x: 24, y: 12 } })
  await expect(page.locator('.bpgraph-json-editor .cm-content')).toContainText('"count": 7')
})

test('执行节点按需读取基础输入的值，基础输入无需执行连线', async ({ page }) => {
  const start = canvasNode(page, 'Start')
  const input = await addNode(page, 'Text Input', 500, 180)
  const output = await addNode(page, 'Debug Output', 780, 180)
  await input.getByRole('textbox', { name: 'Text' }).fill('Playwright workflow result')

  const exec = '[port-group="out"] [data-port-kind="exec"]'
  const execInput = '[port-group="in"] [data-port-kind="exec"]'
  await expect(input.locator('[data-port-kind="exec"]')).toHaveCount(0)
  await input.click({ button: 'right', position: { x: 24, y: 12 } })
  await expect(page.getByText('Node actions', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Set breakpoint' })).toHaveCount(0)
  await page.keyboard.press('Escape')
  await connect(page, start.locator(exec), output.locator(execInput))
  await connect(page, input.locator('[port-group="out"] [data-port-kind="data"]'), output.locator('[port-group="in"] [data-port-kind="data"]'))
  await expect(page.locator('.bpgraph-link')).toHaveCount(2)

  await page.getByRole('button', { name: 'Run', exact: true }).click()
  await page.getByRole('button', { name: 'Show debug panel' }).click()
  // Business output joins the engine log of the same task as one application line.
  await expect(page.getByRole('region', { name: 'Logs' }).getByText('Playwright workflow result', { exact: true })).toBeVisible()
})

test('HTTP 节点从画布加载同源示例并显示响应', async ({ page }) => {
  const http = await addNodeAt(page, 'HTTP Request', 660, 320)
  await connect(
    page,
    canvasNode(page, 'Start').locator('[port-group="out"] [data-port-kind="exec"]'),
    http.locator('[port-group="in"] [data-port-kind="exec"]'),
  )

  const response = page.waitForResponse(request => new URL(request.url()).pathname.endsWith('/http-example.json'))
  await page.getByRole('button', { name: 'Run', exact: true }).click()
  expect((await response).status()).toBe(200)
  await expect(http).toHaveAttribute('data-node-execution-status', 'completed')
  await http.getByText('HTTP Request', { exact: true }).hover()
  const tooltip = page.getByRole('tooltip', { name: 'HTTP Request execution data' })
  await expect(tooltip).toContainText('200')
  await expect(tooltip).toContainText('Hello from Primflow')
})

test('HTTP 请求失败时错误分支执行，成功分支被跳过', async ({ page }) => {
  await closeNodePanel(page)
  // The request never reaches a response, so the node cannot report a status code.
  await page.route('**/http-example.json', (route) => route.abort('connectionrefused'))

  const http = await addNodeAt(page, 'HTTP Request', 660, 320)
  const success = await addNodeAt(page, 'Debug Output', 900, 220)
  const failure = await addNodeAt(page, 'Debug Output', 900, 420)

  const execOut = '[port-group="out"] [data-port-kind="exec"]'
  const execIn = '[port-group="in"] [data-port-kind="exec"]'
  await connect(page, canvasNode(page, 'Start').locator(execOut), http.locator(execIn))
  // Success is the first execution output, HTTP error the second.
  await connect(page, http.locator(execOut).nth(0), success.locator(execIn))
  await connect(page, http.locator(execOut).nth(1), failure.locator(execIn))
  await expect(page.locator('.bpgraph-link')).toHaveCount(3)

  await page.getByRole('button', { name: 'Run', exact: true }).click()

  await expect(http).toHaveAttribute('data-node-execution-status', 'completed')
  await expect(failure).toHaveAttribute('data-node-execution-status', 'completed')
  await expect(success).toHaveAttribute('data-node-execution-status', 'skipped')
})

test('未选中的条件分支显示灰蓝色光晕', async ({ page }) => {
  const condition = await addNode(page, 'Condition', 500, 180)
  const delay = await addNode(page, 'Delay', 800, 360)
  const out = '[port-group="out"] [data-port-kind="exec"]'
  const input = '[port-group="in"] [data-port-kind="exec"]'
  await connect(page, canvasNode(page, 'Start').locator(out), condition.locator(input))
  await connect(page, condition.locator(out).nth(1), delay.locator(input))
  await expect(page.locator('.bpgraph-link')).toHaveCount(2)

  await page.getByRole('button', { name: 'Run', exact: true }).click()
  await expect(condition).toHaveAttribute('data-node-execution-status', 'completed')
  await expect(delay).toHaveAttribute('data-node-execution-status', 'skipped')
  await expect(delay.getByRole('img', { name: 'Skipped' })).toBeVisible()
  await expect(delay.locator('.bpgraph-node-execution-halo')).toHaveCSS('filter', 'blur(8px)')
  await delay.getByText('Delay', { exact: true }).hover()
  await expect(page.getByRole('tooltip', { name: 'Delay execution status' })).toContainText('Skipped')
})

test('停止等待节点显示橙色取消光晕', async ({ page }) => {
  const delay = await addNode(page, 'Delay', 540, 180)
  await connect(page, canvasNode(page, 'Start').locator('[port-group="out"] [data-port-kind="exec"]'),
    delay.locator('[port-group="in"] [data-port-kind="exec"]'))
  await expect(page.locator('.bpgraph-link')).toHaveCount(1)
  const milliseconds = delay.getByRole('textbox', { name: 'Milliseconds' })
  const run = page.getByRole('button', { name: 'Run', exact: true })
  const stop = page.getByRole('button', { name: 'Stop', exact: true })
  const tooltip = page.getByRole('tooltip', { name: 'Delay execution status' })
  const title = delay.getByText('Delay', { exact: true })
  await title.hover()
  await expect(tooltip).toHaveCount(0)
  await milliseconds.fill('60000')
  await run.click()
  await expect(delay).toHaveAttribute('data-node-execution-status', 'running')
  await title.hover()
  await expect(tooltip).toContainText('Executing')
  await stop.click()
  await expect(delay).toHaveAttribute('data-node-execution-status', 'cancelled')
  await expect(delay.getByRole('img', { name: 'Cancelled' })).toBeVisible()
  await expect(delay.locator('.bpgraph-node-execution-halo')).toHaveCSS('opacity', '0.52')
  await title.hover()
  await expect(tooltip).toContainText('Cancelled')
})

test('执行中的任务出现在调试面板的执行记录里，状态为运行中', async ({ page }) => {
  const delay = await addNode(page, 'Delay', 540, 180)
  await connect(page, canvasNode(page, 'Start').locator('[port-group="out"] [data-port-kind="exec"]'),
    delay.locator('[port-group="in"] [data-port-kind="exec"]'))
  await expect(page.locator('.bpgraph-link')).toHaveCount(1)
  await delay.getByRole('textbox', { name: 'Milliseconds' }).fill('60000')

  await page.getByRole('button', { name: 'Run', exact: true }).click()
  await page.getByRole('button', { name: 'Show debug panel' }).click()
  const records = page.getByRole('region', { name: 'Execution records' })
  const record = records.locator('.bpgraph-debug-record')
  await expect(record).toHaveCount(1)
  await expect(record).toHaveClass(/is-running/)
  await expect(record.getByText('Running', { exact: true })).toBeVisible()
  // A live task has no final snapshot, so the record cannot open the replay view.
  await expect(record).toBeDisabled()

  await page.getByRole('button', { name: 'Stop', exact: true }).click()
  await expect(record).toHaveClass(/is-cancelled/)
  await expect(record.getByText('Cancelled', { exact: true })).toBeVisible()
})

test('回溯模式下小地图停在左下角并避开回溯横幅', async ({ page }) => {
  const output = await addNode(page, 'Debug Output', 540, 180)
  await connect(
    page,
    canvasNode(page, 'Start').locator('[port-group="out"] [data-port-kind="exec"]'),
    output.locator('[port-group="in"] [data-port-kind="exec"]'),
  )
  await page.getByRole('button', { name: 'Run', exact: true }).click()
  await expect(output).toHaveAttribute('data-node-execution-status', 'completed')

  await page.getByRole('button', { name: 'Show debug panel' }).click()
  const record = page.getByRole('region', { name: 'Execution records' }).locator('.bpgraph-debug-record')
  await expect(record).toBeEnabled()
  await record.click()

  const banner = page.locator('.bpgraph-replay-banner')
  await expect(banner).toBeVisible()
  const minimapBox = (await page.locator('.bpgraph-minimap').boundingBox())!
  const bannerBox = (await banner.boundingBox())!
  expect(Math.abs(minimapBox.x - bannerBox.x)).toBeLessThanOrEqual(1)
  expect(minimapBox.y + minimapBox.height).toBeLessThanOrEqual(bannerBox.y)

  // Replay closes the node panel; the toolbar recenters left of the remaining debug panel.
  const canvasBox = (await page.locator('.graph-view').boundingBox())!
  const debugBox = (await page.locator('.bpgraph-debug-panel').boundingBox())!
  const toolbarBox = (await page.locator('.bpgraph-toolbar').boundingBox())!
  expect(Math.abs(toolbarBox.x + toolbarBox.width / 2 - (canvasBox.x + debugBox.x) / 2)).toBeLessThanOrEqual(1)
})

test('人工审批可通过、拒绝或停止，并显示对应节点状态', async ({ page }) => {
  await closeNodePanel(page)
  const approval = await addNodeAt(page, 'Manual Approval', 460, 280)
  const output = await addNodeAt(page, 'Debug Output', 895, 145)
  const failure = await addNodeAt(page, 'Throw Error', 895, 450)
  const out = '[port-group="out"] [data-port-kind="exec"]'
  const input = '[port-group="in"] [data-port-kind="exec"]'
  await connect(page, canvasNode(page, 'Start').locator(out), approval.locator(input))
  await connect(page, approval.locator(out).nth(0), output.locator(input))
  await connect(page, approval.locator(out).nth(1), failure.locator(input))
  await expect(page.locator('.bpgraph-link')).toHaveCount(3)
  await approval.getByRole('textbox', { name: 'Prompt' }).fill('Approve order 42?')
  await failure.getByRole('textbox', { name: 'Message' }).fill('Order 42 rejected')

  const run = page.getByRole('button', { name: 'Run', exact: true })
  const stop = page.getByRole('button', { name: 'Stop', exact: true })
  const requests = page.getByRole('complementary', { name: 'Pending approvals' })
  await run.click()
  await expect(approval).toHaveAttribute('data-node-execution-status', 'interrupted')
  const glow = approval.getByRole('img', { name: 'Waiting for external input' })
  await expect(glow.locator('.bpgraph-node-execution-halo')).toHaveCSS('animation-duration', '2.8s')
  await expect(requests.getByText('Approve order 42?', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toBeDisabled()
  await approval.getByText('Manual Approval', { exact: true }).hover()
  await expect(page.getByRole('tooltip', { name: 'Manual Approval execution status' })).toContainText('Waiting for external input')
  await output.getByText('Debug Output', { exact: true }).hover()
  await expect(page.getByRole('tooltip', { name: 'Debug Output execution status' })).toContainText('Pending')
  await requests.getByRole('button', { name: 'Approve', exact: true }).click()
  await expect(requests).toHaveCount(0)
  await expect(approval).toHaveAttribute('data-node-execution-status', 'completed')
  await expect(output).toHaveAttribute('data-node-execution-status', 'completed')
  await expect(failure).toHaveAttribute('data-node-execution-status', 'skipped')
  await approval.getByText('Manual Approval', { exact: true }).hover()
  const preview = page.getByRole('tooltip', { name: 'Manual Approval execution data' })
  await expect(preview).toContainText('Completed')
  await expect(preview.getByRole('heading', { name: 'Outputs' })).toBeVisible()

  await stop.click()
  await run.click()
  await requests.getByRole('button', { name: 'Reject', exact: true }).click()
  await expect(output).toHaveAttribute('data-node-execution-status', 'skipped')
  await expect(failure).toHaveAttribute('data-node-execution-status', 'failed')
  await expect(failure.locator('.bpgraph-node-execution-halo')).toHaveCSS('opacity', '0.7')
  await failure.getByText('Throw Error', { exact: true }).hover()
  await expect(page.getByRole('tooltip', { name: 'Throw Error execution status' })).toContainText('Failed')
  await page.getByRole('button', { name: 'Show debug panel' }).click()
  await expect(page.getByRole('region', { name: 'Logs' }).getByText(/Order 42 rejected/)).toBeVisible()

  await stop.click()
  await run.click()
  await expect(requests).toBeVisible()
  await stop.click()
  await expect(requests).toHaveCount(0)
  await expect(approval).toHaveAttribute('data-node-execution-status', 'cancelled')
})

test('同一数据输入保留多条连线，刷新后读取排在最后的就绪来源', async ({ page }) => {
  await closeNodePanel(page)
  const text = await addNodeAt(page, 'Text Input', 460, 220)
  const number = await addNodeAt(page, 'Number Input', 460, 500)
  const output = await addNodeAt(page, 'Debug Output', 880, 340)
  await text.getByRole('textbox', { name: 'Text' }).fill('First data source')
  await number.getByRole('textbox', { name: 'Value' }).fill('42')

  const dataOutput = '[port-group="out"] [data-port-kind="data"]'
  const dataInput = output.locator('[port-group="in"] [data-port-kind="data"]')
  const savedBefore = await page.getByRole('status').filter({ hasText: /^Saved/ }).textContent().catch(() => null)
  await connect(
    page,
    canvasNode(page, 'Start').locator('[port-group="out"] [data-port-kind="exec"]'),
    output.locator('[port-group="in"] [data-port-kind="exec"]'),
  )
  await expect(page.locator('.bpgraph-link')).toHaveCount(1)
  await connect(page, text.locator(dataOutput), dataInput)
  await expect(page.locator('.bpgraph-link')).toHaveCount(2)
  await connect(page, number.locator(dataOutput), dataInput)
  await expect(page.locator('.bpgraph-link')).toHaveCount(3)
  await waitForSaved(page, savedBefore)
  await page.reload()
  await expect(page.locator('.bpgraph-link')).toHaveCount(3)
  await page.getByRole('button', { name: 'Run', exact: true }).click()
  await page.getByRole('button', { name: 'Show debug panel' }).click()
  const logs = page.getByRole('region', { name: 'Logs' })
  // The panel shows the engine execution log, so node runs appear as activation records.
  await expect(logs.getByText('activation:status', { exact: true }).first()).toBeVisible()
  await expect(logs.getByText('task:status', { exact: true }).first()).toBeVisible()
  await expect(logs.getByText('42', { exact: true })).toBeVisible()
  await expect(logs.getByText('First data source', { exact: true })).toHaveCount(0)
})

test('节点属性显示已声明的重试策略', async ({ page }) => {
  const node = await addNode(page, 'Concatenate Text', 500, 180)
  await openNodePanel(page)
  await node.click({ position: { x: 24, y: 12 } })
  const panel = page.locator('.bpgraph-node-panel')
  const instanceId = await node.getAttribute('model-id')
  expect(instanceId).toBeTruthy()
  await expect(panel.getByText('Definition ID: Concat', { exact: true })).toBeVisible()
  await expect(panel.getByText(`Instance ID: ${instanceId}`, { exact: true })).toBeVisible()
  await expect(panel.getByText(/^Behavior:/)).toHaveCount(0)
  await expect(panel.getByText(/^Definition name:/)).toHaveCount(0)
  await expect(panel.getByText('Retry policy', { exact: true })).toBeVisible()
  await expect(panel.getByText('Maximum retries: 1', { exact: true })).toBeVisible()
})

test('画布可以设置和获取变量，并用指定字符串校验读到的值', async ({ page }) => {
  await closeNodePanel(page)
  const set = await addNodeAt(page, 'Set Variable', 530, 165)
  const get = await addNodeAt(page, 'Get Variable', 620, 440)
  const check = await addNodeAt(page, 'Check String', 945, 230)

  await openNodePanel(page)
  await set.click({ position: { x: 24, y: 12 } })
  const panel = page.locator('.bpgraph-node-panel')
  const value = panel.locator('input[data-field="value"]')
  await value.fill('ready')
  await value.press('Tab')
  await panel.getByRole('button', { name: 'Close' }).click()

  const execOut = '[port-group="out"] [data-port-kind="exec"]'
  const execIn = '[port-group="in"] [data-port-kind="exec"]'
  const dataOut = '[port-group="out"] [data-port-kind="data"]'
  const dataIn = '[port-group="in"] [data-port-kind="data"]'
  await connect(page, canvasNode(page, 'Start').locator(execOut), set.locator(execIn))
  await expect(page.locator('.bpgraph-link')).toHaveCount(1)
  await expect(get.locator('[data-port-kind="exec"]')).toHaveCount(0)
  await connect(page, set.locator(execOut), check.locator(execIn))
  await connect(page, get.locator(dataOut), check.locator(dataIn).first())
  await expect(page.locator('.bpgraph-link')).toHaveCount(3)

  await page.getByRole('button', { name: 'Run', exact: true }).click()
  await expect(check).toHaveAttribute('data-node-execution-status', 'completed')
  await check.getByText('Check String', { exact: true }).hover()
  await expect(page.getByRole('tooltip', { name: 'Check String execution data' })).toContainText('ready')
})

test('并行分支晚写变量时重试，悬浮卡和节点面板显示尝试和执行结果', async ({ page }) => {
  await closeNodePanel(page)
  const delay = await addNodeAt(page, 'Delay', 545, 160)
  const set = await addNodeAt(page, 'Set Variable', 865, 160)
  const text = await addNodeAt(page, 'Text Input', 720, 290)
  const get = await addNodeAt(page, 'Get Variable', 440, 535)
  const check = await addNodeAt(page, 'Check String', 720, 420)
  const print = await addNodeAt(page, 'Debug Output', 1090, 560)
  const panel = page.locator('.bpgraph-node-panel')
  const start = canvasNode(page, 'Start')
  const execOut = '[port-group="out"] [data-port-kind="exec"]'
  const execIn = '[port-group="in"] [data-port-kind="exec"]'
  const dataOut = '[port-group="out"] [data-port-kind="data"]'
  const dataIn = '[port-group="in"] [data-port-kind="data"]'
  await connect(page, start.locator(execOut), delay.locator(execIn))
  await expect(page.locator('.bpgraph-link')).toHaveCount(1)
  await connect(page, delay.locator(execOut), set.locator(execIn))
  await connect(page, text.locator(dataOut), set.locator(dataIn).last())
  await connect(page, start.locator(execOut), check.locator(execIn))
  await connect(page, get.locator(dataOut), check.locator(dataIn).first())
  await connect(page, check.locator(execOut), print.locator(execIn))
  await connect(page, check.locator(dataOut), print.locator(dataIn))
  await expect(page.locator('.bpgraph-link')).toHaveCount(7)
  await delay.getByRole('textbox', { name: 'Milliseconds' }).fill('200')
  await text.getByRole('textbox', { name: 'Text' }).fill('ready')

  await page.getByRole('button', { name: 'Run', exact: true }).click()
  await expect(print).toHaveAttribute('data-node-execution-status', 'completed')
  await check.getByText('Check String', { exact: true }).hover()
  const tooltip = page.getByRole('tooltip', { name: 'Check String execution data' })
  await expect(tooltip.getByText('Retried once', { exact: true })).toHaveCSS('color', 'rgb(252, 211, 77)')
  await expect(tooltip.getByText('Retry reason', { exact: true })).toBeVisible()
  await expect(tooltip.getByText('Completed', { exact: true })).toHaveCSS('color', 'rgb(110, 231, 183)')
  await expect(tooltip.getByText(/Variable "status" is not set/)).toHaveCSS('color', 'rgb(252, 165, 165)')
  await expect(tooltip).toContainText('ready')

  await openNodePanel(page)
  await check.click({ position: { x: 24, y: 12 } })
  const execution = panel.getByRole('region', { name: 'Execution', exact: true })
  await expect(execution.getByText('Retried once', { exact: true })).toHaveCSS('color', 'rgb(252, 211, 77)')
  await expect(execution).toContainText('VARIABLE_NOT_FOUND')
  await expect(execution).toContainText('ready')

  await page.getByRole('button', { name: 'Stop', exact: true }).click()
  await panel.getByRole('button', { name: 'Close' }).click()
  await get.getByRole('textbox', { name: 'Variable name' }).fill('never-written')
  await page.mouse.click(150, 180)
  await openNodePanel(page)
  await check.click({ position: { x: 24, y: 12 } })
  await expect(panel.getByRole('heading', { name: 'Check String', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Run', exact: true }).click()
  await expect(check).toHaveAttribute('data-node-execution-status', 'failed')
  await check.getByText('Check String', { exact: true }).hover()
  await expect(tooltip).toContainText('Retried 2 times')
  await expect(tooltip.getByText('Retry limit reached', { exact: true })).toHaveCSS('color', 'rgb(252, 165, 165)')
  await expect(tooltip.getByText('Failed', { exact: true })).toHaveCSS('color', 'rgb(252, 165, 165)')
  await expect(tooltip.getByText(/Variable "never-written" is not set/)).toHaveCSS('color', 'rgb(252, 165, 165)')
  await expect(execution).toContainText('Retried 2 times')
  await expect(execution).toContainText('VARIABLE_NOT_FOUND')
})

test('添加面板在变量分类单独列出设置与获取节点', async ({ page }) => {
  const palette = await openPalette(page, 500, 180)
  await palette.getByRole('button', { name: /^Variables/ }).click()
  const group = palette.getByRole('region', { name: 'Variables' })
  await expect(group.getByRole('button')).toHaveCount(2)
  await expect(group.getByRole('button', { name: 'Set Variable' })).toBeVisible()
  await expect(group.getByRole('button', { name: 'Get Variable' })).toBeVisible()
})

test('变量校验失败后重试并读取到另一个分支写入的值', async ({ page }) => {
  await closeNodePanel(page)
  const wrong = await addNodeAt(page, 'Set Variable', 300, 240)
  const get = await addNodeAt(page, 'Get Variable', 620, 140)
  const check = await addNodeAt(page, 'Check String', 900, 240)
  const delay = await addNodeAt(page, 'Delay', 620, 360)
  const ready = await addNodeAt(page, 'Set Variable', 300, 460)
  const start = canvasNode(page, 'Start')
  const execOut = '[port-group="out"] [data-port-kind="exec"]'
  const execIn = '[port-group="in"] [data-port-kind="exec"]'
  const dataOut = '[port-group="out"] [data-port-kind="data"]'
  const dataIn = '[port-group="in"] [data-port-kind="data"]'

  // The first branch writes a wrong value; the other branch writes the expected one later.
  // String ports have inline editors; "any" ports are set in the node panel.
  await wrong.getByRole('textbox', { name: 'Variable name' }).fill('status')
  await openNodePanel(page)
  await wrong.click({ position: { x: 24, y: 12 } })
  const panel = page.locator('.bpgraph-node-panel')
  await panel.locator('input[data-field="value"]').fill('wrong')
  // Selecting the other node keeps the panel open and swaps its fields.
  await ready.click({ position: { x: 24, y: 12 } })
  await panel.locator('input[data-field="value"]').fill('ready')
  await panel.getByRole('button', { name: 'Close' }).click()
  await get.getByRole('textbox', { name: 'Variable name' }).fill('status')
  await check.getByRole('textbox', { name: 'Expected string' }).fill('ready')
  await delay.getByRole('textbox', { name: 'Milliseconds' }).fill('200')

  await connect(page, start.locator(execOut), wrong.locator(execIn))
  await expect(page.locator('.bpgraph-link')).toHaveCount(1)
  await connect(page, wrong.locator(execOut), check.locator(execIn))
  await expect(page.locator('.bpgraph-link')).toHaveCount(2)
  await connect(page, get.locator(dataOut), check.locator(dataIn).first())
  await expect(page.locator('.bpgraph-link')).toHaveCount(3)
  await connect(page, wrong.locator(execOut), delay.locator(execIn))
  await expect(page.locator('.bpgraph-link')).toHaveCount(4)
  await connect(page, delay.locator(execOut), ready.locator(execIn))
  await expect(page.locator('.bpgraph-link')).toHaveCount(5)

  await page.getByRole('button', { name: 'Run', exact: true }).click()
  await page.getByRole('button', { name: 'Show debug panel' }).click()
  const logs = page.getByRole('region', { name: 'Logs' })
  await expect(logs.getByText(/STRING_MISMATCH.*input value from .*Get Variable/).first()).toBeVisible()
  await expect(logs.getByText(/Attempt 2 started.*re-reading .*Get Variable/).first()).toBeVisible()
  await expect(logs.getByText(/Attempt 2 succeeded/).first()).toBeVisible()
  await expect(check).toHaveAttribute('data-node-execution-status', 'completed')
})

test('文件分类只保留图片文件节点', async ({ page }) => {
  const palette = await openPalette(page, 500, 180)
  await palette.getByRole('button', { name: /^Files/ }).click()
  const group = palette.getByRole('region', { name: 'Files' })
  await expect(group.getByRole('button')).toHaveCount(1)
  const item = group.getByRole('button', { name: 'Image File' })
  await expect(item).toBeVisible()
  // The palette uses a fitting Remix icon instead of the generic node glyph.
  await expect(item.locator('.bpgraph-palette-icon i')).toHaveClass('ri-image-line')
})

test('Image File reopens from a saved workflow and keeps its stored asset', async ({ page }) => {
  const fixture = {
    title: 'Image File', name: 'preview.png', mediaType: 'image/png',
    buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/v9sAAAAASUVORK5CYII=', 'base64'),
  }
  const file = await addNode(page, fixture.title, 420, 500)
  await openNodePanel(page)
  await file.getByText(fixture.title, { exact: true }).click()
  const fileNodeId = await file.getAttribute('model-id')
  // The panel editor renders the file picker for the asset port.
  await page.locator('.bpgraph-node-panel input[type=file]').setInputFiles({
    name: fixture.name, mimeType: fixture.mediaType, buffer: fixture.buffer,
  })
  // The panel shows the stored asset id once the file is written.
  await expect(page.locator('.bpgraph-asset-panel-name')).toBeVisible()
  // Writing the value refreshes the matching card control instead of clearing it.
  await expect(file.locator('.image-file-button')).toHaveText('Replace image')
  await expect.poll(() => page.evaluate(nodeId => new Promise<boolean>((resolve, reject) => {
    const open = window.indexedDB.open('bpgraph')
    open.onerror = () => reject(open.error)
    open.onsuccess = () => {
      const db = open.result
      const read = db.transaction('views', 'readonly').objectStore('views').getAll()
      read.onerror = () => { db.close(); reject(read.error) }
      read.onsuccess = () => {
        db.close()
        const records = read.result as Array<{ data: { nodes: Array<{ id: string; inputValues: { asset?: unknown } }> } }>
        resolve(records.some(record => record.data.nodes.some(node => node.id === nodeId && !!node.inputValues.asset)))
      }
    }
  }), fileNodeId)).toBe(true)
  await page.reload()
  await expect(file).toBeVisible()
  await expect(file.getByRole('img', { name: 'Image preview' }))
    .toHaveJSProperty('naturalWidth', 1)
  await openNodePanel(page)
  await file.getByText(fixture.title, { exact: true }).click()
  await expect(page.locator('.bpgraph-node-panel').getByRole('img', { name: 'Image preview' }))
    .toHaveJSProperty('naturalWidth', 1)
})

test('an image node picks a file with its centered button and previews it inside the card', async ({ page }) => {
  const file = await addNode(page, 'Image File', 420, 500)

  // The card owns the picker: a centered text button with a hidden file input.
  const button = file.locator('.image-file-button')
  await expect(button).toHaveText('Choose image')
  await expect(file.locator('input[type=file]')).toHaveCount(1)
  await expect(file.locator('.bpgraph-asset-port-button')).toHaveCount(0)
  await expect(page.locator('.bpgraph-node-overlay')).toHaveCount(0)
  // The asset input is not connectable, while the small output port stays on the edge.
  await expect(file.locator('[port-group="in"] [magnet]')).toHaveCount(0)
  await expect(file.locator('[port-group="out"] [data-port-kind="data"]')).toHaveAttribute('r', '4')

  // Clicking the button opens the browser picker directly, without an overlay.
  const chooser = page.waitForEvent('filechooser')
  await button.click()
  await (await chooser).setFiles({
    name: 'preview.png',
    mimeType: 'image/png',
    buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/v9sAAAAASUVORK5CYII=', 'base64'),
  })
  await expect(page.locator('.bpgraph-node-overlay')).toHaveCount(0)

  // The thumbnail renders inside the node card below the centered button.
  const preview = file.getByRole('img', { name: 'Image preview' })
  await expect(preview).toBeVisible()
  await expect(preview).toHaveJSProperty('naturalWidth', 1)
  await expect(button).toHaveText('Replace image')

  // Clicking blank canvas keeps both the card control and the thumbnail. Keep the point
  // away from the file control, which now sits below the toolbar band.
  await page.mouse.click(900, 620)
  await expect(button).toBeVisible()
  await expect(preview).toBeVisible()

  // A custom-rendered node still gets the canvas selection outline.
  await file.getByText('Image File', { exact: true }).click()
  const selection = page.locator('.bpgraph-highlight-mask')
  await expect(selection).toHaveCount(1)
  await expect(selection).toBeVisible()
})

test('自定义节点归入其他节点分类', async ({ page }) => {
  const palette = await openPalette(page, 500, 180)
  await palette.getByRole('button', { name: /^Other nodes/ }).click()
  const group = palette.getByRole('region', { name: 'Other nodes' })
  await expect(group.getByRole('button')).toHaveCount(1)
  await expect(group.getByRole('button', { name: 'Custom Node' })).toBeVisible()
})

test('a node renderer replaces the built-in body while ports keep working', async ({ page }) => {
  const node = await addNode(page, 'Custom Node', 430, 500)

  // The application draws its own card instead of the built-in header and body.
  const card = node.locator('.demo-card')
  await expect(card).toBeVisible()
  await expect(card.locator('.demo-card-caption')).toHaveText('Custom card')
  // The card draws its own content, so the canvas has no inline port controls.
  await expect(card.locator('input')).toHaveCount(0)
  // Ports still exist, so the node can take part in a flow.
  await expect(node.locator('[port-group="in"] [magnet]')).toHaveCount(2)
  await expect(node.locator('[port-group="out"] [magnet]')).toHaveCount(1)

  // The node uses smaller ports than the default, and the data port is
  // colour-coded by its type while the exec port keeps the neutral fill.
  const dataPort = node.locator('[port-group="in"] [data-port-kind="data"]')
  await expect(dataPort).toHaveAttribute('r', '4')
  await expect(dataPort).toHaveAttribute('fill', 'rgba(41, 44, 47, 1)')

  // The renderer owns the node size rather than the built-in port-row layout.
  const cardBox = (await card.boundingBox())!
  expect(Math.round(cardBox.width)).toBe(196)
  expect(Math.round(cardBox.height)).toBe(104)

  // Ports follow `portPosition`: the input sits on the left border and the
  // output on the right border, instead of the built-in row offsets.
  const inPort = (await node.locator('[port-group="in"] [data-port-kind="exec"]').boundingBox())!
  const outPort = (await node.locator('[port-group="out"] [data-port-kind="exec"]').boundingBox())!
  expect(Math.abs(inPort.x + inPort.width / 2 - cardBox.x)).toBeLessThanOrEqual(2)
  expect(Math.abs(outPort.x + outPort.width / 2 - (cardBox.x + cardBox.width))).toBeLessThanOrEqual(2)

  // The node is still draggable from its custom content.
  const before = await node.getAttribute('transform')
  await page.mouse.move(cardBox.x + cardBox.width / 2, cardBox.y + cardBox.height / 2)
  await page.mouse.down()
  await page.mouse.move(cardBox.x + cardBox.width / 2 + 120, cardBox.y + cardBox.height / 2 + 60, { steps: 10 })
  await page.mouse.up()
  await expect.poll(() => node.getAttribute('transform')).not.toBe(before)

  // Links and execution still go through the custom node's ports.
  await connect(page, canvasNode(page, 'Start').locator('[port-group="out"] [data-port-kind="exec"]'),
    node.locator('[port-group="in"] [data-port-kind="exec"]'))
  await page.getByRole('button', { name: 'Run', exact: true }).click()
  await expect(node).toHaveAttribute('data-node-execution-status', 'completed')
})

test('a node renderer updates when the node value changes', async ({ page }) => {
  const node = await addNode(page, 'Custom Node', 430, 500)
  await openNodePanel(page)
  await node.getByText('Custom Node', { exact: true }).click()

  const field = page.locator('.bpgraph-node-panel-field input').first()
  await field.fill('Updated caption')
  await expect(node.locator('.demo-card-caption')).toHaveText('Updated caption')
})

test('ports rest as outlines, fill by type when connected, and are shaped by category', async ({ page }) => {
  const source = await addNode(page, 'Number Input', 460, 180)
  const delay = await addNode(page, 'Delay', 760, 180)

  // At rest a port is only an outline: the fill matches the node background and
  // the outline already carries the type colour.
  const restingPort = delay.locator('[port-group="in"] [data-port-kind="data"]')
  await expect(restingPort).toHaveAttribute('fill', 'rgba(41, 44, 47, 1)')
  await expect(restingPort).toHaveAttribute('stroke', '#009E73')
  await expect(restingPort).toHaveAttribute('stroke-opacity', '0.5')

  // Shape encodes the structural category: a single value is a circle, control
  // flow is an arrow, and a collection draws its own glyph.
  const tagOf = (locator: Locator) => locator.evaluate((element) =>
    element.querySelector('[data-port-kind="data"]')?.tagName)
  expect(await tagOf(delay)).toBe('circle')
  expect(await delay.evaluate((element) => element
    .querySelector('[port-group="in"] [data-port-kind="exec"]')?.tagName)).toBe('path')

  const list = await addNode(page, 'Array Input', 460, 620)
  expect(await tagOf(list)).toBe('path')
  const record = await addNode(page, 'Object Input', 760, 620)
  expect(await tagOf(record)).toBe('rect')

  // Connecting a data link fills the port with the colour of its type.
  await connect(page, source.locator('[port-group="out"] [data-port-kind="data"]'), restingPort)
  await expect(restingPort).toHaveAttribute('fill', '#009E73')
  // The outline keeps the same colour at full strength, so the filled port
  // reads as one shape.
  await expect(restingPort).toHaveAttribute('stroke', '#009E73')
  await expect(restingPort).toHaveAttribute('stroke-opacity', '1')
  // The link takes the same colour as the ports it joins.
  await expect(page.locator('.bpgraph-link [joint-selector="line"]').first()).toHaveAttribute('stroke', '#009E73')
})

test('hovering a port shows its label and type in a tooltip instead of a native title', async ({ page }) => {
  const delay = await addNode(page, 'Delay', 560, 240)
  const dataInput = delay.locator('[port-group="in"] [data-port-kind="data"]')
  // The shape no longer carries a native title element.
  await expect(dataInput.locator('title')).toHaveCount(0)
  await expect(dataInput).toHaveAttribute('aria-label', 'Milliseconds (number)')

  await dataInput.hover()
  const tooltip = page.locator('.bpgraph-port-tooltip')
  await expect(tooltip).toBeVisible()
  await expect(tooltip).toHaveAttribute('role', 'tooltip')
  await expect(tooltip.locator('.bpgraph-port-tooltip-name')).toHaveText('Milliseconds')
  await expect(tooltip.locator('.bpgraph-port-tooltip-type')).toHaveText('number')

  // A port without a label falls back to its name.
  await delay.locator('[port-group="out"] [data-port-kind="exec"]').hover()
  await expect(tooltip.locator('.bpgraph-port-tooltip-name')).toHaveText('exec')
  await expect(tooltip.locator('.bpgraph-port-tooltip-type')).toHaveText('exec')

  // Moving off the port hides the card.
  await page.mouse.move(80, 80)
  await expect(page.locator('.bpgraph-port-tooltip')).toHaveCount(0)
})

test('已连接端口的外半区优先响应 tooltip 和新连线', async ({ page }) => {
  // The node panel covers the right edge; close it so every palette point below
  // lands on blank canvas instead of the panel.
  await closeNodePanel(page)
  const delay = await addNodeAt(page, 'Delay', 520, 220)
  const print = await addNodeAt(page, 'Debug Output', 860, 220)
  const secondTarget = await addNodeAt(page, 'Manual Approval', 860, 430)
  const custom = await addNodeAt(page, 'Custom Node', 430, 520)
  await connect(page, canvasNode(page, 'Start').locator('[port-group="out"] [data-port-kind="exec"]'),
    delay.locator('[port-group="in"] [data-port-kind="exec"]'))
  await connect(page, delay.locator('[port-group="out"] [data-port-kind="exec"]'),
    print.locator('[port-group="in"] [data-port-kind="exec"]'))

  // The invisible link hit path stops where the visible line ends, instead of
  // covering the port with a round end cap.
  await expect(page.locator('.bpgraph-link [joint-selector="wrapper"]').first())
    .toHaveAttribute('stroke-linecap', 'butt')

  const tooltip = page.locator('.bpgraph-port-tooltip')
  const outerPoint = async (locator: Locator, side: 'left' | 'right') => {
    const box = (await locator.boundingBox())!
    return {
      x: box.x + box.width * (side === 'left' ? 0.2 : 0.8),
      y: box.y + box.height / 2,
    }
  }

  // A connected input still shows the tooltip from its outer half.
  const input = delay.locator('[port-group="in"] [data-port-kind="exec"]')
  const inputPoint = await outerPoint(input, 'left')
  await page.mouse.move(inputPoint.x, inputPoint.y)
  await expect(tooltip).toBeVisible()
  await expect(tooltip.locator('.bpgraph-port-tooltip-name')).toHaveText('exec')
  await expect(tooltip.locator('.bpgraph-port-tooltip-type')).toHaveText('exec')
  await page.mouse.move(80, 80)
  await expect(tooltip).toHaveCount(0)

  // A connected output starts a new link from its outer half.
  const outputPoint = await outerPoint(delay.locator('[port-group="out"] [data-port-kind="exec"]'), 'right')
  const target = await center(secondTarget.locator('[port-group="in"] [data-port-kind="exec"]'))
  const before = await page.locator('.bpgraph-link').count()
  await page.mouse.move(outputPoint.x, outputPoint.y)
  await page.mouse.down()
  await page.mouse.move(target.x, target.y, { steps: 10 })
  await page.mouse.up()
  await expect.poll(() => page.locator('.bpgraph-link').count()).toBe(before + 1)

  // A smaller port (radius 4) behaves the same way.
  await connect(page, secondTarget.locator('[port-group="out"] [data-port-kind="exec"]').first(),
    custom.locator('[port-group="in"] [data-port-kind="exec"]'))
  const smallInput = custom.locator('[port-group="in"] [data-port-kind="exec"]')
  await expect(smallInput).toHaveAttribute('r', '4')
  const smallPoint = await outerPoint(smallInput, 'left')
  await page.mouse.move(smallPoint.x, smallPoint.y)
  await expect(tooltip).toBeVisible()
  await expect(tooltip.locator('.bpgraph-port-tooltip-name')).toHaveText('exec')
  await expect(tooltip.locator('.bpgraph-port-tooltip-type')).toHaveText('exec')
})

test('panel sections reshape one node without changing the others', async ({ page }) => {
  const custom = await addNode(page, 'Custom Node', 430, 500)
  await openNodePanel(page)
  await custom.getByText('Custom Node', { exact: true }).click()
  const panel = page.locator('.bpgraph-node-panel')
  // The demo node drops the built-in Outputs block, so only Inputs keeps a title.
  await expect(panel.locator('.bpgraph-node-panel-section-title')).toHaveText(['Inputs'])

  // Sections follow the configured order: application hint, Inputs, then the
  // metadata block that is normally first.
  const blocks = panel.locator('.bpgraph-node-panel-scroll > *')
  await expect(blocks).toHaveCount(3)
  await expect(blocks.nth(0)).toContainText('This node draws its own body')
  await expect(blocks.nth(1)).toContainText('Inputs')
  await expect(blocks.nth(2)).toHaveClass(/bpgraph-node-panel-meta/)

  // Every other node keeps the default order and sections.
  const delay = await addNode(page, 'Delay', 760, 500)
  await delay.getByText('Delay', { exact: true }).click()
  await expect(page.locator('.bpgraph-node-panel-section-title')).toHaveText(['Inputs', 'Outputs'])
  const defaultBlocks = page.locator('.bpgraph-node-panel-scroll > *')
  await expect(defaultBlocks.nth(0)).toHaveClass(/bpgraph-node-panel-meta/)
  await expect(defaultBlocks.nth(1)).toContainText('Inputs')
})

test('已有连线端点拖到合法端口直接重连，不打开面板且不会产生重复连线', async ({ page }) => {
  await closeNodePanel(page)
  const start = canvasNode(page, 'Start')
  const delay = await addNodeAt(page, 'Delay', 560, 300)
  const template = await addNodeAt(page, 'Text Template', 820, 320)
  await connect(
    page,
    start.locator('[port-group="out"] [data-port-kind="exec"]'),
    delay.locator('[port-group="in"] [data-port-kind="exec"]'),
  )
  const link = page.locator('.bpgraph-link').first()
  const linkBox = (await link.boundingBox())!
  await page.mouse.click(linkBox.x + linkBox.width / 2, linkBox.y + linkBox.height / 2)
  const handle = page.locator('.target-arrowhead')
  await expect(handle).toBeVisible()
  const target = await center(template.locator('[port-group="in"] [data-port-kind="exec"]'))
  await dragPortToBlank(page, handle, target.x, target.y)
  await expect(page.locator('.bpgraph-palette')).toHaveCount(0)
  await expect(page.locator('.bpgraph-link')).toHaveCount(1)

  await page.locator('[data-action="undo"]').click()
  await expect(page.locator('.bpgraph-link')).toHaveCount(1)
  await page.locator('[data-action="redo"]').click()
  await expect(page.locator('.bpgraph-link')).toHaveCount(1)

  await waitForSaved(page)
  await page.reload()
  await expect(page.locator('.bpgraph-link')).toHaveCount(1)
})
