import { expect, test } from '@playwright/test'

test.use({ viewport: { width: 900, height: 760 } })

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'View 1' })).toBeVisible()
})

test('右侧面板打开时底部缩放栏自动避让且小地图展示当前视口指示框', async ({ page }) => {
  const panel = page.locator('.bpgraph-node-panel')
  const zoom = page.locator('.bpgraph-zoom-controls')
  const camera = page.locator('.bpgraph-minimap .pf-minimap-camera')

  await expect(panel).toBeVisible()
  await expect(zoom).toBeVisible()
  await expect(camera).toBeVisible()

  const panelBox = (await panel.boundingBox())!
  const zoomBox = (await zoom.boundingBox())!

  // Zoom controls stay cleanly to the left of the open right-hand node panel.
  expect(zoomBox.x + zoomBox.width).toBeLessThanOrEqual(panelBox.x)
})

test('悬浮与选中节点出现快捷操作条、侧边快速加节点及 ComfyUI 风格周边输入控件', async ({ page }) => {
  // Close right-hand panel for generous canvas space.
  await page.locator('.bpgraph-node-panel').getByRole('button', { name: 'Close' }).click()

  // Hover the initial Start node to reveal its floating action bar and right `+` quick-add handle.
  const startNode = page.locator('.bpgraph-element').first()
  await expect(startNode).toBeVisible()
  await startNode.hover()

  const floatingBar = page.locator('.pf-node-floating-bar')
  const quickAddOut = page.locator('[data-quick-add="out"]')
  await expect(floatingBar).toBeVisible()
  await expect(quickAddOut).toBeVisible()

  // Click the right `+` handle to open the filtered add-and-connect palette and add a Delay node.
  await quickAddOut.click()
  const palette = page.locator('.bpgraph-palette')
  await expect(palette).toBeVisible()
  await expect(palette).toHaveAttribute('data-mode', 'connect')
  await palette.locator('.bpgraph-palette-item[data-type="Delay"]').click()
  await expect(palette).toHaveCount(0)

  // A link should now exist between Start and the newly added Delay node.
  await expect(page.locator('.bpgraph-link')).toHaveCount(1)

  // Select the newly created Delay node and click the floating Quick inputs button
  // to open its ComfyUI-style surrounding widget tray.
  const delayNode = page.locator('.bpgraph-element').nth(1)
  await delayNode.click()
  await page.locator('[data-floating-action="widgets"]').click()

  const widgetTray = page.locator('.pf-node-widget-bar')
  await expect(widgetTray).toBeVisible()

  // Click the custom "1s" preset button mounted around Delay and verify the input updates to 1000.
  await widgetTray.getByRole('button', { name: '1s' }).click()
  const durationInput = widgetTray.locator('[data-widget-field="duration"] input')
  await expect(durationInput).toHaveValue('1000')
})

test('添加面板搜索图标保持合理内边距，悬浮节点右侧加号在近距范围内保持显示并磁吸跟随光标', async ({ page }) => {
  await page.locator('.bpgraph-node-panel').getByRole('button', { name: 'Close' }).click()

  // Open the node palette and verify the search prefix icon is properly inset from the field border.
  await page.mouse.dblclick(420, 220)
  const palette = page.locator('.bpgraph-palette')
  await expect(palette).toBeVisible()
  const searchWrap = palette.locator('.bpgraph-palette-search-wrap')
  const searchIcon = searchWrap.locator('svg[slot="prefix"]')
  const searchInput = searchWrap.locator('.bpgraph-palette-search')
  const wrapBox = (await searchWrap.boundingBox())!
  const iconBox = (await searchIcon.boundingBox())!
  const inputBox = (await searchInput.boundingBox())!
  expect(iconBox.x - wrapBox.x).toBeGreaterThanOrEqual(8)
  expect(inputBox.x - (iconBox.x + iconBox.width)).toBeGreaterThanOrEqual(4)
  await page.keyboard.press('Escape')
  await expect(palette).toHaveCount(0)

  // Hover Start node, then move outside into the right proximity zone (not directly on the button).
  const startNode = page.locator('.bpgraph-element').first()
  await startNode.hover()
  const outWrap = page.locator('.pf-node-quick-add.is-out')
  await expect(outWrap).toBeVisible()

  const startBox = (await startNode.boundingBox())!
  const restBox = (await outWrap.boundingBox())!
  // Move cursor 28px right of node and 16px below vertical center — outside the button but inside magnetic range.
  const targetX = startBox.x + startBox.width + 28
  const targetY = startBox.y + startBox.height / 2 + 16
  await page.mouse.move(targetX, targetY)
  await page.waitForTimeout(350)

  // Handle stays visible in proximity corridor and magnetically shifts toward the pointer.
  await expect(outWrap).toBeVisible()
  await expect(outWrap).toHaveClass(/is-magnetic/)
  const movedBox = (await outWrap.boundingBox())!
  expect(movedBox.y).toBeGreaterThan(restBox.y + 4)
})

test('连线层级恢复在端口可见且中间存在障碍节点时自动绕行避让', async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 760 })
  await page.locator('.bpgraph-node-panel').getByRole('button', { name: 'Close' }).click()

  // Place a target Delay node well to the right of Start and connect Start -> Delay.
  await page.mouse.dblclick(760, 140)
  const palette = page.locator('.bpgraph-palette')
  await palette.getByRole('textbox', { name: 'Search nodes' }).fill('Delay')
  await palette.getByRole('button', { name: 'Delay', exact: true }).click()
  const delay = page.locator('.bpgraph-element').filter({ has: page.getByText('Delay', { exact: true }) }).last()
  const start = page.locator('.bpgraph-element').filter({ has: page.getByText('Start', { exact: true }) }).first()
  const startBox = (await start.boundingBox())!

  // Move Delay horizontally aligned with Start, leaving clear room for an obstacle node in between.
  const delayTitle = (await delay.getByText('Delay', { exact: true }).boundingBox())!
  await page.mouse.move(delayTitle.x + delayTitle.width / 2, delayTitle.y + delayTitle.height / 2)
  await page.mouse.down()
  await page.mouse.move(startBox.x + startBox.width + 440, startBox.y + 20, { steps: 10 })
  await page.mouse.up()

  // Connect Start exec-out to Delay exec-in.
  const fromPort = (await start.locator('[port-group="out"] [data-port-kind="exec"]').boundingBox())!
  const toPort = (await delay.locator('[port-group="in"] [data-port-kind="exec"]').boundingBox())!
  await page.mouse.move(fromPort.x + fromPort.width / 2, fromPort.y + fromPort.height / 2)
  await page.mouse.down()
  await page.mouse.move(toPort.x + toPort.width / 2, toPort.y + toPort.height / 2, { steps: 10 })
  await page.mouse.up()
  await expect(page.locator('.bpgraph-link')).toHaveCount(1)

  // Clear direct link renders above nodes and uses a single cubic curve.
  const line = page.locator('.bpgraph-link [joint-selector="line"]').first()
  const directPath = (await line.getAttribute('d'))!
  expect(directPath).toContain('C')

  // Now add a third node (Text Input) directly in the middle between Start and Delay.
  await page.mouse.dblclick(520, 120)
  await palette.getByRole('textbox', { name: 'Search nodes' }).fill('Text Input')
  await palette.getByRole('button', { name: 'Text Input', exact: true }).click()
  const blocker = page.locator('.bpgraph-element').filter({ has: page.getByText('Text Input', { exact: true }) }).last()
  const blockerTitle = (await blocker.getByText('Text Input', { exact: true }).boundingBox())!
  await page.mouse.move(blockerTitle.x + blockerTitle.width / 2, blockerTitle.y + blockerTitle.height / 2)
  await page.mouse.down()
  await page.mouse.move(startBox.x + startBox.width + 180, startBox.y + 12, { steps: 10 })
  await page.mouse.up()

  // The link dynamically re-routes around the obstacle node so its vertical span detours around it.
  await expect
    .poll(async () => {
      const box = (await line.boundingBox())!
      const blockerBox = (await blocker.boundingBox())!
      return box.y < blockerBox.y || box.y + box.height > blockerBox.y + blockerBox.height
    })
    .toBe(true)
})

test('反向拖拽连线松手前后颜色与绕行路径一致，选中端点渲染为圆形手柄', async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 760 })
  await page.locator('.bpgraph-node-panel').getByRole('button', { name: 'Close' }).click()

  const start = page.locator('.bpgraph-element').filter({ has: page.getByText('Start', { exact: true }) }).first()
  const startBox = (await start.boundingBox())!

  // Add a Delay node to the right of Start and a Text Input blocker directly between them.
  const palette = page.locator('.bpgraph-palette')
  await page.mouse.dblclick(760, 140)
  await palette.getByRole('textbox', { name: 'Search nodes' }).fill('Delay')
  await palette.getByRole('button', { name: 'Delay', exact: true }).click()
  const delay = page.locator('.bpgraph-element').filter({ has: page.getByText('Delay', { exact: true }) }).last()
  const delayTitle = (await delay.getByText('Delay', { exact: true }).boundingBox())!
  await page.mouse.move(delayTitle.x + delayTitle.width / 2, delayTitle.y + delayTitle.height / 2)
  await page.mouse.down()
  await page.mouse.move(startBox.x + startBox.width + 440, startBox.y + 20, { steps: 10 })
  await page.mouse.up()

  await page.mouse.dblclick(520, 120)
  await palette.getByRole('textbox', { name: 'Search nodes' }).fill('Text Input')
  await palette.getByRole('button', { name: 'Text Input', exact: true }).click()
  const blocker = page.locator('.bpgraph-element').filter({ has: page.getByText('Text Input', { exact: true }) }).last()
  const blockerTitle = (await blocker.getByText('Text Input', { exact: true }).boundingBox())!
  await page.mouse.move(blockerTitle.x + blockerTitle.width / 2, blockerTitle.y + blockerTitle.height / 2)
  await page.mouse.down()
  await page.mouse.move(startBox.x + startBox.width + 180, startBox.y + 12, { steps: 10 })
  await page.mouse.up()

  // Drag in reverse (Delay exec-in -> Start exec-out) and inspect before mouse release.
  const fromPort = (await delay.locator('[port-group="in"] [data-port-kind="exec"]').boundingBox())!
  const toPort = (await start.locator('[port-group="out"] [data-port-kind="exec"]').boundingBox())!
  await page.mouse.move(fromPort.x + fromPort.width / 2, fromPort.y + fromPort.height / 2)
  await page.mouse.down()
  await page.mouse.move(toPort.x + toPort.width / 2, toPort.y + toPort.height / 2, { steps: 12 })

  const line = page.locator('.bpgraph-link [joint-selector="line"]').first()
  await expect(line).toBeVisible()
  const dragStroke = await line.getAttribute('stroke')
  const dragBox = (await line.boundingBox())!

  // Release the mouse to commit the normalized (Start -> Delay) link.
  await page.mouse.up()
  await expect(page.locator('.bpgraph-link')).toHaveCount(1)

  const commitStroke = await line.getAttribute('stroke')
  const commitBox = (await line.boundingBox())!
  expect(commitStroke).toBe(dragStroke)
  expect(Math.abs(commitBox.x - dragBox.x)).toBeLessThanOrEqual(2)
  expect(Math.abs(commitBox.y - dragBox.y)).toBeLessThanOrEqual(2)
  expect(Math.abs(commitBox.width - dragBox.width)).toBeLessThanOrEqual(2)
  expect(Math.abs(commitBox.height - dragBox.height)).toBeLessThanOrEqual(2)

  // Select the link at its actual SVG stroke midpoint (bbox center lies on the blocker node).
  const midPoint = await line.evaluate((el) => {
    const path = el as SVGPathElement
    const pt = path.getPointAtLength(path.getTotalLength() / 2)
    const ctm = path.getScreenCTM()!
    return { x: pt.x * ctm.a + pt.y * ctm.c + ctm.e, y: pt.x * ctm.b + pt.y * ctm.d + ctm.f }
  })
  await page.mouse.click(midPoint.x, midPoint.y)
  const sourceHandle = page.locator('.source-arrowhead.bpgraph-link-handle')
  const targetHandle = page.locator('.target-arrowhead.bpgraph-link-handle')
  await expect(sourceHandle).toBeVisible()
  await expect(targetHandle).toBeVisible()
  await expect(sourceHandle.locator('circle.bpgraph-link-handle-knob')).toHaveCount(1)
  await expect(targetHandle.locator('circle.bpgraph-link-handle-knob')).toHaveCount(1)
  await expect(targetHandle.locator('circle.bpgraph-link-handle-halo')).toHaveCount(1)
  await expect(targetHandle.locator('circle.bpgraph-link-handle-core')).toHaveCount(1)
})
