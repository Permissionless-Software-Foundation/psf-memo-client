'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')

const { fakeWallet } = require('../helpers/fake-wallet')

// Register the MemoAction tests shared by the Memo post and Set Name slices.
// Both slices broadcast a value through a wallet and reflect the result on an
// injected store, so the maximum-length and over-length behaviors are
// identical; only the slice-specific pieces differ. `cfg` supplies:
//   Action     - the action class (MemoPost or MemoSetName)
//   method     - the broadcast method name ('post' or 'setName')
//   MAX        - the length limit
//   lengthCode - the length error code
//   validationCode - the validation error code
//   label      - a short label for test names
//   storeKey   - the action's store dependency key ('feed' or 'profiles')
//   storeFactory - () => a fresh store
//   assertStoreEmpty - (store, wallet) => asserts the store was not updated
function registerMemoActionTests (cfg) {
  const { Action, method, MAX, lengthCode, validationCode, label, storeKey, storeFactory, assertStoreEmpty } = cfg

  test(`${label} at the maximum length (${MAX}) is accepted`, async () => {
    const wallet = fakeWallet()
    const action = new Action({ wallet })

    const value = 'x'.repeat(MAX)
    const txid = await action[method](value)
    assert.equal(txid, 'fake-txid')
    assert.equal(wallet.broadcasts[0].msg, value)
  })

  test(`${label} over the limit (${MAX + 1}) throws a length error and broadcasts nothing`, async () => {
    const wallet = fakeWallet()
    const store = storeFactory()
    const action = new Action({ wallet, [storeKey]: store })

    await assert.rejects(
      action[method]('y'.repeat(MAX + 1)),
      (err) => err.code === lengthCode
    )
    assert.equal(wallet.broadcasts.length, 0)
    assertStoreEmpty(store, wallet)
  })

  test(`${label} that is whitespace-only or non-string throws a validation error and broadcasts nothing`, async () => {
    for (const invalid of ['   ', 42]) {
      const wallet = fakeWallet()
      const action = new Action({ wallet })

      await assert.rejects(
        action[method](invalid),
        (err) => err.code === validationCode
      )
      assert.equal(wallet.broadcasts.length, 0)
    }
  })
}

module.exports = { registerMemoActionTests }
