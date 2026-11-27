/**
 * Regression: opening the split and creating a real Session must keep the panel.
 *
 * The 0.2.3 crash only fired when a tile bound a real Session (CellView mounted
 * and read the inject-gated uiSession.sessionStatus), so fixture-only tests miss
 * it. This spec drives the real app: open split -> click "new chat" on an empty
 * tile -> wait for the bound tile's composer and require no page error.
 */
export default async function ({ page, h, expect }) {
  const pageErrors = []
  page.on('pageerror', (error) => pageErrors.push(String(error)))

  try {
    await page.waitForSelector('.dsws-icon-btn', { timeout: 30000 })
    if ((await page.evaluate(() => globalThis.__dswsInSplit === true)) !== true) {
      await page.locator('.dsws-icon-btn').click()
    }
    await page.waitForSelector('[data-dsws-header]', { timeout: 15000 })
    expect(
      (await page.locator('[data-dsws-header]').count()) >= 1,
      'split renders tiles after open',
    )

    const newChat = page.locator('[data-dsws-new-chat]').first()
    expect((await newChat.count()) > 0, 'an empty tile must expose its new-chat button')
    // The isolated DSH_HOME/browser context starts with an empty tile. Save its
    // cell before the click removes the button, and wait inside that same cell so
    // an already-bound tile elsewhere cannot satisfy the assertion.
    const cell = newChat.locator('xpath=ancestor::div[contains(@class, "dsws-cell")][1]')
    await newChat.click()
    // CellView returns a loading row until the retained Session's `ready`
    // resolves and sets `binding`; only then does it render the Composer. Its
    // textarea is therefore a real binding signal, not a fixed-duration sleep.
    await cell.locator('textarea').waitFor({ state: 'visible', timeout: 15000 })

    const headers = await page.locator('[data-dsws-header]').count()
    expect(headers >= 1, 'split stays rendered after creating a real Session')
    expect(pageErrors.length === 0, 'no uncaught page errors: ' + pageErrors.join(' | '))
  } finally {
    // A failed binding wait needs the same visual evidence as a successful run,
    // but a screenshot failure must not replace the assertion that explains it.
    try {
      await h.shot('split-real-session')
    } catch (error) {
      globalThis.console.warn(`split-real-session screenshot failed: ${String(error)}`)
    }
  }
}
