'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')

// Register the page-controller tests shared by the New Post and Set Name pages.
// Both pages extend PageController, so the in-flight flag, missing-handler, and
// broadcast-failure behaviors are identical; only the page-specific pieces
// differ. `cfg` supplies:
//   buildPage  - () => ({ wallet, page, navigations }) with a working handler
//   buildBarePage - (navigations) => a page with no action handler
//   busyFlag   - the page's in-flight flag name ('posting' or 'settingName')
//   prefix     - the broadcast prefix ('6d02' or '6d01')
function registerPageControllerTests (cfg) {
  const { buildPage, buildBarePage, busyFlag, prefix } = cfg

  test(`${busyFlag} is true while a submit is in flight and false once it settles`, async () => {
    const { wallet, page } = buildPage()

    // Defer the broadcast so we can observe the in-flight state.
    let resolveSend
    wallet.sendOpReturn = async () => new Promise((resolve) => { resolveSend = resolve })
    page.setInput('hello')

    assert.equal(page[busyFlag], false)
    const pending = page.submit()
    assert.equal(page[busyFlag], true)

    // Yield until the async chain reaches the deferred sendOpReturn call.
    await new Promise((resolve) => setImmediate(resolve))
    assert.equal(typeof resolveSend, 'function')
    resolveSend('in-flight-txid')
    await pending
    assert.equal(page[busyFlag], false)
  })

  test('submitting without a handler reports an error and does not navigate', async () => {
    const navigations = []
    const page = buildBarePage(navigations)
    page.setInput('hello')

    const result = await page.submit()

    assert.equal(result.ok, false)
    assert.deepEqual(navigations, [])
  })

  test('a failed broadcast surfaces the real error and does not navigate', async () => {
    const { wallet, page, navigations } = buildPage()
    wallet.failWith = 'BCH UTXO list is empty'
    page.setInput('hello')

    const result = await page.submit()

    assert.equal(result.ok, false)
    assert.equal(page.submitError, 'broadcast')
    assert.match(page.broadcastError, /BCH UTXO list is empty/)
    // The broadcast was attempted (recorded) before it failed.
    assert.equal(wallet.broadcasts.length, 1)
    assert.equal(wallet.broadcasts[0].prefix, prefix)
    // The user stays on the page.
    assert.deepEqual(navigations, [])
  })
}

module.exports = { registerPageControllerTests }
