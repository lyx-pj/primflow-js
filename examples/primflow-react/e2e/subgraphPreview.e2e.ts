import { expect, test, type Page } from '@playwright/test'

function canvasNode(page: Page, title: string) {
  return page.locator('.bpgraph-element').filter({ has: page.getByText(title, { exact: true }) })
}

function subgraphCard(page: Page) {
  return page.locator('.bpgraph-subgraph-card').first()
}

async function addNode(page: Page, title: string, x: number) {
  // Open the palette above the default Start/End row so the double-click lands on blank canvas.
  await page.mouse.dblclick(x, 150)
  const palette = page.getByRole('dialog', { name: 'Add node' })
  await expect(palette).toBeVisible()
  await palette.getByRole('textbox', { name: 'Search nodes' }).fill(title)
  await palette.getByRole('button', { name: title, exact: true }).click()
  const node = canvasNode(page, title).last()
  await expect(node).toBeVisible()
  return node
}

async function waitForSaved(page: Page) {
  const saved = page.getByRole('status').filter({ hasText: /^Saved/ })
  await expect(saved).toBeVisible()
}

/** Wait until a new save completes; the timestamp may repeat within one second. */
async function waitForSaveChange(page: Page, previous: string | null) {
  const saved = page.getByRole('status').filter({ hasText: /^Saved/ })
  await expect.poll(async () => {
    if (await page.getByRole('status').filter({ hasText: /^(Pending|Saving)/ }).count()) return 'writing'
    const changed = (await saved.count()) > 0 && (await saved.textContent()) !== previous
    return changed ? 'saved' : 'waiting'
  }).not.toBe('waiting')
  await expect(saved).toBeVisible()
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'View 1' })).toBeVisible()
  await expect(canvasNode(page, 'Start')).toBeVisible()
})

test('subgraph call cards render a live preview and collapse', async ({ page }) => {
  // Create a standalone subgraph file and add a custom-rendered node inside it.
  await page.getByRole('button', { name: 'View 1' }).click()
  await page.getByRole('option', { name: 'New…' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await dialog.getByRole('radio', { name: 'Subgraph' }).click()
  await dialog.getByRole('textbox').fill('Details')
  await dialog.getByRole('button', { name: 'Create' }).click()
  await expect(page.locator('button[title="Details"]')).toBeVisible()

  await addNode(page, 'Custom Node', 640)
  await waitForSaved(page)

  // Return to the ordinary view and place a call node for the subgraph file.
  await page.locator('button[title="Details"]').click()
  await page.getByRole('option', { name: 'View 1' }).click()
  await expect(page.getByRole('button', { name: 'View 1' })).toBeVisible()

  await addNode(page, 'Details', 700)

  const card = subgraphCard(page)
  await expect(card).toBeVisible()
  await expect(card.locator('.bpgraph-subgraph-title')).toHaveText('Details')
  const toggle = card.locator('.bpgraph-subgraph-toggle')
  await expect(toggle).toHaveCSS('width', '24px')
  await expect(toggle).toHaveCSS('height', '24px')
  await expect(toggle.locator('svg')).toHaveCSS('stroke-width', '2px')
  await expect(card.locator('.bpgraph-subgraph-title')).toHaveCSS('color', 'rgb(240, 247, 255)')
  const preview = card.locator('.bpgraph-subgraph-preview')
  await expect(preview).toHaveAttribute('data-preview-state', 'ready', { timeout: 10_000 })
  await expect(preview.locator('.bpgraph-subgraph-preview-svg')).toBeVisible()
  // The preview keeps its dark inset canvas behind the inner nodes.
  await expect(preview).toHaveCSS('background-color', 'rgba(5, 7, 9, 0.55)')
  // The application's custom node renderer must survive the preview clone.
  await expect(preview.locator('.demo-card')).toBeVisible()

  const element = card.locator('xpath=ancestor::*[contains(@class,"bpgraph-element")]').first()
  // Compact data ports keep the generic slate hexagon.
  await expect(element.locator('[data-port-kind="data"]').first()).toHaveAttribute('stroke', '#B8C4D6')
  await expect(element.locator('[data-port-kind="data"]').first()).toHaveAttribute('stroke-opacity', '0.5')

  const expanded = (await element.boundingBox())!
  const saved = page.getByRole('status').filter({ hasText: /^Saved/ })
  const beforeCollapse = await saved.textContent()
  await card.locator('.bpgraph-subgraph-toggle').click()
  await expect(card).toHaveClass(/is-collapsed/)
  await expect(preview).toHaveCount(0)
  // The collapse control and title stay on the top edge for quick re-expansion.
  await expect(element).toHaveClass(/is-subgraph-collapsed/)
  await expect(element.locator('.bpgraph-node-body').first()).toHaveCSS('fill-opacity', '0.5')
  await expect(card.locator('.bpgraph-subgraph-toggle')).toHaveCSS('top', '0px')
  await expect(card.locator('.bpgraph-subgraph-title')).toHaveCSS('top', '0px')
  // Collapsed ports keep 24px spacing instead of overlapping.
  const collapsedPorts = element.locator('[port-group="in"] [joint-selector="portBody"]')
  await expect(collapsedPorts).toHaveCount(2)
  const portCenters = await collapsedPorts.evaluateAll((nodes) => nodes.map((node) => {
    const rect = node.getBoundingClientRect()
    return rect.top + rect.height / 2
  }))
  expect(Math.abs(portCenters[0] - portCenters[1])).toBeGreaterThanOrEqual(20)

  // The 1px port outline is centred on the card edge: half of each dot stays outside.
  const cardBodyBox = (await card.boundingBox())!
  const inDataPort = element.locator('[port-group="in"] [data-port-kind="data"]').first()
  const outDataPort = element.locator('[port-group="out"] [data-port-kind="data"]').first()
  const inDataBox = (await inDataPort.boundingBox())!
  const outDataBox = (await outDataPort.boundingBox())!
  await expect(inDataPort).toHaveCSS('stroke-width', '1px')
  expect(Math.abs((inDataBox.x + inDataBox.width / 2) - cardBodyBox.x)).toBeLessThan(2)
  expect(Math.abs((outDataBox.x + outDataBox.width / 2) - (cardBodyBox.x + cardBodyBox.width))).toBeLessThan(2)
  await expect.poll(async () => (await element.boundingBox())?.height ?? 0).toBeLessThan(80)
  const collapsed = (await element.boundingBox())!
  expect(collapsed.height).toBeLessThan(expanded.height)
  expect(collapsed.height).toBeLessThan(80)

  // Collapsed state is persisted with the call node.
  await waitForSaveChange(page, beforeCollapse)

  await page.reload()
  await expect(page.getByRole('button', { name: 'View 1' })).toBeVisible()
  const reloaded = subgraphCard(page)
  await expect(reloaded).toHaveClass(/is-collapsed/)
  const reloadedElement = reloaded.locator('xpath=ancestor::*[contains(@class,"bpgraph-element")]').first()
  await expect.poll(async () => (await reloadedElement.boundingBox())?.height ?? 0).toBeLessThan(80)

  await reloaded.locator('.bpgraph-subgraph-toggle').click()
  const reloadedPreview = reloaded.locator('.bpgraph-subgraph-preview')
  await expect(reloadedPreview).toHaveAttribute('data-preview-state', 'ready', { timeout: 10_000 })
  // Persisted previews are hydrated before the view mounts; the live rebuild must not erase the hit marker.
  await expect(reloadedPreview).toHaveAttribute('data-preview-cache', 'hit')
  await expect(reloadedPreview.locator('.bpgraph-subgraph-preview-empty')).toHaveCount(0)

  // Double-clicking the card still enters the subgraph through the node body.
  const box = (await reloaded.boundingBox())!
  await page.mouse.dblclick(box.x + box.width / 2, box.y + box.height / 2)
  await expect(page.locator('button[title="Details"]')).toBeVisible()
})

test('a preview keeps port editor controls and renders nested subgraphs as generic cards', async ({ page }) => {
  // Create the inner subgraph file first so the outer subgraph can call it.
  await page.locator('button[title="View 1"]').click()
  await page.getByRole('option', { name: 'New…' }).click()
  let dialog = page.getByRole('dialog')
  await dialog.getByRole('radio', { name: 'Subgraph' }).click()
  await dialog.getByRole('textbox').fill('Inner')
  await dialog.getByRole('button', { name: 'Create' }).click()
  await expect(page.locator('button[title="Inner"]')).toBeVisible()

  await page.locator('button[title="Inner"]').click()
  await page.getByRole('option', { name: 'View 1' }).click()

  await page.locator('button[title="View 1"]').click()
  await page.getByRole('option', { name: 'New…' }).click()
  dialog = page.getByRole('dialog')
  await dialog.getByRole('radio', { name: 'Subgraph' }).click()
  await dialog.getByRole('textbox').fill('Details')
  await dialog.getByRole('button', { name: 'Create' }).click()
  await expect(page.locator('button[title="Details"]')).toBeVisible()

  // A built-in node with an inline port editor, plus a nested subgraph call.
  await addNode(page, 'Text Input', 620)
  await addNode(page, 'Inner', 900)
  await waitForSaved(page)

  await page.locator('button[title="Details"]').click()
  await page.getByRole('option', { name: 'View 1' }).click()
  await addNode(page, 'Details', 700)

  const card = subgraphCard(page)
  const preview = card.locator('.bpgraph-subgraph-preview')
  await expect(preview).toHaveAttribute('data-preview-state', 'ready', { timeout: 10_000 })

  // Port editor controls are part of the static appearance and must survive the clone.
  await expect(preview.locator('.bpgraph-port-editor').first()).toBeVisible()
  // Nested subgraphs never recurse: one generic card, no second preview.
  const nested = preview.locator('.bpgraph-subgraph-card.is-generic')
  await expect(nested).toHaveCount(1)
  await expect(nested).toContainText('Inner')
  await expect(nested.locator('.bpgraph-subgraph-preview')).toHaveCount(0)
})

test('saving a subgraph file refreshes the call card preview', async ({ page }) => {
  await page.locator('button[title="View 1"]').click()
  await page.getByRole('option', { name: 'New…' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('radio', { name: 'Subgraph' }).click()
  await dialog.getByRole('textbox').fill('Live')
  await dialog.getByRole('button', { name: 'Create' }).click()
  await expect(page.locator('button[title="Live"]')).toBeVisible()

  await page.locator('button[title="Live"]').click()
  await page.getByRole('option', { name: 'View 1' }).click()
  await addNode(page, 'Live', 700)

  const card = subgraphCard(page)
  const preview = card.locator('.bpgraph-subgraph-preview')
  await expect(preview).toHaveAttribute('data-preview-state', 'ready', { timeout: 10_000 })
  await expect(preview.locator('.demo-card')).toHaveCount(0)

  // Edit the subgraph file and return: the pushed source must refresh the card.
  await page.locator('button[title="View 1"]').click()
  await page.getByRole('option', { name: 'Live' }).click()
  await expect(page.getByRole('button', { name: 'Live' })).toBeVisible()
  await addNode(page, 'Custom Node', 620)
  await waitForSaved(page)

  await page.locator('button[title="Live"]').click()
  await page.getByRole('option', { name: 'View 1' }).click()
  await expect(page.getByRole('button', { name: 'View 1' })).toBeVisible()
  const refreshed = subgraphCard(page).locator('.bpgraph-subgraph-preview')
  await expect(refreshed).toHaveAttribute('data-preview-state', 'ready', { timeout: 10_000 })
  await expect(refreshed.locator('.demo-card')).toBeVisible()
})
