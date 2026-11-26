import { expect, test } from '@playwright/test'

// Portrait phone viewport; the example switches to the compact canvas layout below 768px.
test.use({ viewport: { width: 390, height: 844 } })

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'View 1' })).toBeVisible()
  await expect(page.locator('.graph-view')).toHaveAttribute('data-bpgraph-compact', 'true')
})

test('竖屏下顶栏、工具栏和节点面板分层显示且互不遮挡', async ({ page }) => {
  const selector = page.locator('.view-switcher')
  const canvas = page.locator('.graph-view')
  const toolbar = page.locator('.bpgraph-toolbar')
  const panel = page.locator('.bpgraph-node-panel')

  await expect(panel).toBeVisible()
  await expect(panel).toHaveClass(/is-compact/)
  const selectorBox = (await selector.boundingBox())!
  const canvasBox = (await canvas.boundingBox())!
  const toolbarBox = (await toolbar.boundingBox())!
  const panelBox = (await panel.boundingBox())!

  // The app owns a real top bar, so the canvas starts below it instead of under it.
  expect(selectorBox.y).toBeLessThanOrEqual(1)
  expect(Math.abs(selectorBox.height - 48)).toBeLessThanOrEqual(1)
  expect(Math.abs(canvasBox.y - 48)).toBeLessThanOrEqual(1)
  // The toolbar sits above the sheet, and the sheet starts below the toolbar.
  expect(toolbarBox.y).toBeGreaterThanOrEqual(canvasBox.y + 8 - 1)
  expect(panelBox.y).toBeGreaterThanOrEqual(toolbarBox.y + toolbarBox.height)
  // The sheet uses the full canvas width with the shared gap on both sides.
  expect(panelBox.x - canvasBox.x).toBeLessThanOrEqual(9)
  expect(canvasBox.x + canvasBox.width - (panelBox.x + panelBox.width)).toBeLessThanOrEqual(9)
  await expect(page.locator('.bpgraph-minimap')).toBeHidden()
  await expect(panel.getByRole('button', { name: 'Close' })).toBeVisible()
})

test('竖屏下节点面板与调试面板互斥且都能独立关闭', async ({ page }) => {
  const panel = page.locator('.bpgraph-node-panel')
  await panel.getByRole('button', { name: 'Close' }).click()
  await expect(panel).toHaveCount(0)

  await page.locator('[data-action="node-panel"]').click()
  await expect(panel).toBeVisible()
  await expect(panel).toHaveClass(/is-compact/)

  // Opening the debug panel replaces the node sheet instead of stacking two full-width panels.
  await page.locator('[data-action="debug-panel"]').click()
  await expect(panel).toHaveCount(0)
  const debug = page.locator('.bpgraph-debug-panel')
  await expect(debug).toBeVisible()
  await expect(debug).toHaveClass(/is-compact/)
  const toolbarBox = (await page.locator('.bpgraph-toolbar').boundingBox())!
  const debugBox = (await debug.boundingBox())!
  expect(debugBox.y).toBeGreaterThanOrEqual(toolbarBox.y + toolbarBox.height)

  await debug.getByRole('button', { name: 'Close debug panel' }).click()
  await expect(debug).toHaveCount(0)
})
