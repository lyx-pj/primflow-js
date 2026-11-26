import { expect, test, type Page } from '@playwright/test'

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

function loopCard(page: Page) {
  return page.locator('[data-container-card="loop"]').first()
}

function loopElement(page: Page) {
  return loopCard(page).locator('xpath=ancestor::*[contains(@class,"bpgraph-element")]').first()
}

async function addNode(page: Page, title: string, x: number, y = 150) {
  // Open the palette above the default Start/End row so the double-click lands on blank canvas.
  await page.mouse.dblclick(x, y)
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

/** Select a node through its body; card titles ignore pointer events. */
async function clickNodeCenter(page: Page, node: ReturnType<typeof canvasNode>) {
  const box = (await node.boundingBox())!
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
}

async function openNodePanel(page: Page) {
  const panel = page.locator('.bpgraph-node-panel')
  if (await panel.isVisible()) return
  await page.locator('[data-action="node-panel"]').click()
  await expect(panel).toBeVisible()
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'View 1' })).toBeVisible()
  await expect(canvasNode(page, 'Start')).toBeVisible()
})

test('loop cards render a live body preview, collapse, and keep their limits', async ({ page }) => {
  const node = await addNode(page, 'Loop', 500, 180)
  await waitForSaved(page)

  const card = loopCard(page)
  await expect(card).toBeVisible()
  await expect(card.locator('.bpgraph-subgraph-title-text')).toHaveText('Loop')
  await expect(card.locator('.bpgraph-loop-glyph')).toBeVisible()
  await expect(card.locator('.bpgraph-subgraph-toggle')).toHaveCSS('width', '24px')
  await expect(card.locator('.bpgraph-subgraph-toggle')).toHaveCSS('height', '24px')

  const element = loopElement(page)
  const expanded = (await element.boundingBox())!
  expect(expanded.height).toBeGreaterThan(150)
  expect(expanded.width).toBeGreaterThan(260)
  // Port labels stay in the node panel; the card is a thumbnail first.
  await expect(element.locator(':scope > .bpgraph-port [joint-selector="portLabel"]').first()).toBeHidden()

  const preview = card.locator('.bpgraph-subgraph-preview')
  await expect(preview).toHaveAttribute('data-preview-state', 'ready', { timeout: 10_000 })
  await expect(preview.locator('.bpgraph-subgraph-preview-svg')).toBeVisible()
  // Inner node labels stay readable inside the thumbnail; only the card's own labels are hidden.
  await expect(preview.getByText('Initial value', { exact: true }).first()).toBeVisible()

  // Add a node to the loop body; the live preview must pick it up.
  const box = (await card.boundingBox())!
  await page.mouse.dblclick(box.x + box.width / 2, box.y + box.height / 2)
  await expect(loopEntryNode(page)).toBeVisible()
  const saved = page.getByRole('status').filter({ hasText: /^Saved/ })
  const beforeBody = await saved.textContent()
  await addNode(page, 'Custom Node', 640)
  await waitForSaveChange(page, beforeBody)
  await page.getByRole('button', { name: 'Back', exact: true }).click()
  await expect(page.getByRole('button', { name: 'View 1' })).toBeVisible()

  const refreshed = loopCard(page).locator('.bpgraph-subgraph-preview')
  await expect(refreshed).toHaveAttribute('data-preview-state', 'ready', { timeout: 10_000 })
  await expect(refreshed.locator('.demo-card')).toBeVisible()

  // The compact header chip reflects configured limits and persists with the node.
  await openNodePanel(page)
  await clickNodeCenter(page, node)
  const iterations = page.getByRole('spinbutton', { name: 'Maximum iterations' })
  const timeout = page.getByRole('spinbutton', { name: 'Timeout (ms)' })
  const beforeLimits = await saved.textContent()
  await iterations.fill('3')
  await timeout.fill('1500')
  await timeout.press('Tab')
  await waitForSaveChange(page, beforeLimits)
  const chip = loopCard(page).locator('.bpgraph-loop-limit')
  await expect(chip).toHaveText('×3 · 1.5s')
  await expect(chip).toHaveAttribute('title', /Maximum iterations: 3/)
  await expect(chip).toHaveAttribute('title', /Timeout: 1.5s/)

  const beforeCollapse = await saved.textContent()
  await loopCard(page).locator('.bpgraph-subgraph-toggle').click()
  await expect(loopCard(page)).toHaveClass(/is-collapsed/)
  await expect(loopElement(page)).toHaveClass(/is-container-collapsed/)
  await expect.poll(async () => (await loopElement(page).boundingBox())?.height ?? 0).toBeLessThan(80)
  await expect(loopCard(page).locator('.bpgraph-subgraph-preview')).toHaveCount(0)
  await expect(loopCard(page).locator('.bpgraph-loop-limit')).toHaveText('×3 · 1.5s')
  await waitForSaveChange(page, beforeCollapse)

  await page.reload()
  await expect(page.getByRole('button', { name: 'View 1' })).toBeVisible()
  const reloaded = loopCard(page)
  await expect(reloaded).toHaveClass(/is-collapsed/)
  await expect(reloaded.locator('.bpgraph-loop-limit')).toHaveText('×3 · 1.5s')
  await expect.poll(async () => (await loopElement(page).boundingBox())?.height ?? 0).toBeLessThan(80)

  await reloaded.locator('.bpgraph-subgraph-toggle').click()
  const reloadedPreview = reloaded.locator('.bpgraph-subgraph-preview')
  await expect(reloadedPreview).toHaveAttribute('data-preview-state', 'ready', { timeout: 10_000 })
  // Loop previews are embedded and never persisted by the application cache.
  await expect(reloadedPreview).toHaveAttribute('data-preview-cache', 'miss')
  await expect(reloadedPreview.locator('.demo-card')).toBeVisible()

  // Double-clicking the card still enters the loop body.
  const reloadedBox = (await reloaded.boundingBox())!
  await page.mouse.dblclick(reloadedBox.x + reloadedBox.width / 2, reloadedBox.y + reloadedBox.height / 2)
  await expect(loopEntryNode(page)).toBeVisible()
})
