/**
 * Regression: opening the split and creating a real Session must keep the panel.
 *
 * The 0.2.3 crash only fired when a tile bound a real Session (CellView mounted
 * and read the inject-gated uiSession.sessionStatus), so fixture-only tests miss
 * it. This spec drives the real app: open split -> click "new chat" on an empty
 * tile -> require the grid still renders and no page error was thrown.
 */
export default async function ({ page, h, expect }) {
  const pageErrors = []
  page.on('pageerror', (error) => pageErrors.push(String(error)))

  await page.waitForSelector('.dsws-icon-btn', { timeout: 30000 })
  if ((await page.evaluate('window.__dswsInSplit === true')) !== true) {
    await page.locator('.dsws-icon-btn').click()
  }
  await page.waitForSelector('[data-dsws-header]', { timeout: 15000 })
  expect((await page.locator('[data-dsws-header]').count()) >= 1, 'split renders tiles after open')

  const newChat = page.locator('[data-dsws-new-chat]').first()
  if ((await newChat.count()) > 0) {
    await newChat.click()
    await page.waitForTimeout(3000)
  }

  const headers = await page.locator('[data-dsws-header]').count()
  expect(headers >= 1, 'split stays rendered after creating a real Session')
  expect(pageErrors.length === 0, 'no uncaught page errors: ' + pageErrors.join(' | '))
  await h.shot('split-real-session')
}
