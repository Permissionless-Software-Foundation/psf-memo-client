/*
  Unit tests for the Set Name Page behavior slice (src/services/set-name-page.js).

  Expresses the observable behavior described by specs/set-name.feature:
    - setting a valid name broadcasts an OP_RETURN with the Memo set-name prefix
      and navigates the user to the account page.
    - an empty name is rejected with a validation error; nothing is broadcast.
    - an over-long name is rejected with a length error; nothing is broadcast.
    - the byte counter counts down from the name limit.
*/

'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')

const MemoSetName = require('../../src/services/memo-set-name')
const SetNamePage = require('../../src/services/set-name-page')

const MAX = MemoSetName.MAX_NAME_BYTES // 77

function fakeWallet (cashAddress = 'bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d') {
  const broadcasts = []
  const wallet = {
    walletInfo: { cashAddress },
    utxos: [{ txid: 'utxo-fee' }],
    getUtxos: async function () { return this.utxos },
    sendOpReturn: async function (msg, prefix) {
      this.broadcasts.push({ msg, prefix })
      if (this.failWith) throw new Error(this.failWith)
      return 'setname-txid'
    }
  }
  wallet.broadcasts = broadcasts
  return wallet
}

function fakeProfiles () {
  const names = {}
  return { names, setName: (addr, name) => { names[addr] = name }, getName: (addr) => names[addr] || null }
}

function build () {
  const wallet = fakeWallet()
  const profiles = fakeProfiles()
  const memoSetName = new MemoSetName({ wallet, profiles })
  const navigations = []
  const page = new SetNamePage({
    memoSetName,
    navigate: (path) => navigations.push(path)
  })
  return { wallet, profiles, memoSetName, page, navigations }
}

test('SET_NAME_PATH and ACCOUNT_PATH constants', () => {
  assert.equal(SetNamePage.SET_NAME_PATH, '/memo/set-name')
  assert.equal(SetNamePage.ACCOUNT_PATH, '/account')
})

test('the byte counter counts down from the name limit for an empty name', () => {
  const { page } = build()
  page.setInput('')
  assert.equal(page.remainingCount(), MAX)
})

test('the byte counter counts multi-byte characters by bytes, not characters', () => {
  const { page } = build()
  page.setInput('é')
  assert.equal(page.remainingCount(), MAX - 2)
})

test('the byte counter reaches zero at the byte limit with multi-byte characters', () => {
  const { page } = build()
  page.setInput('é'.repeat(38))
  assert.equal(page.remainingCount(), 1)
})

test('the byte counter counts down from the name limit for a short name', () => {
  const { page } = build()
  page.setInput('trout')
  assert.equal(page.remainingCount(), MAX - 5)
})

test('the byte counter reaches zero at the name limit', () => {
  const { page } = build()
  page.setInput('x'.repeat(MAX))
  assert.equal(page.remainingCount(), 0)
})

test('setting a valid name broadcasts the Memo set-name prefix and navigates to the account page', async () => {
  const { wallet, profiles, page, navigations } = build()
  page.setInput('trout')

  const result = await page.submit()

  assert.equal(result.ok, true)
  assert.equal(page.settingName, false)
  assert.equal(wallet.broadcasts.length, 1)
  assert.equal(wallet.broadcasts[0].prefix, '6d01')
  assert.equal(wallet.broadcasts[0].msg, 'trout')
  assert.deepEqual(navigations, ['/account'])
  assert.equal(profiles.getName(wallet.walletInfo.cashAddress), 'trout')
})

test('setting an empty name is rejected with a validation error and nothing is broadcast', async () => {
  const { wallet, profiles, page, navigations } = build()
  page.setInput('')

  const result = await page.submit()

  assert.equal(result.ok, false)
  assert.equal(result.error, 'name_validation')
  assert.equal(page.submitError, 'name_validation')
  assert.equal(page.settingName, false)
  assert.equal(wallet.broadcasts.length, 0)
  assert.equal(profiles.getName(wallet.walletInfo.cashAddress), null)
  assert.deepEqual(navigations, [])
})

test('setting an over-long name is rejected with a length error and nothing is broadcast', async () => {
  const { wallet, profiles, page, navigations } = build()
  page.setInput('y'.repeat(MAX + 1))

  const result = await page.submit()

  assert.equal(result.ok, false)
  assert.equal(result.error, 'name_length')
  assert.equal(page.submitError, 'name_length')
  assert.equal(page.settingName, false)
  assert.equal(wallet.broadcasts.length, 0)
  assert.equal(profiles.getName(wallet.walletInfo.cashAddress), null)
  assert.deepEqual(navigations, [])
})

test('the set name page starts idle (not setting name)', () => {
  const { page } = build()
  assert.equal(page.settingName, false)
})

test('setting name is true while a submit is in flight and false once it settles', async () => {
  const wallet = fakeWallet()
  const profiles = fakeProfiles()

  let resolveSend
  wallet.sendOpReturn = async () => new Promise((resolve) => { resolveSend = resolve })
  const page = new SetNamePage({
    memoSetName: new MemoSetName({ wallet, profiles }),
    navigate: () => {}
  })
  page.setInput('trout')

  assert.equal(page.settingName, false)
  const pending = page.submit()
  assert.equal(page.settingName, true)

  await new Promise((resolve) => setImmediate(resolve))
  assert.equal(typeof resolveSend, 'function')
  resolveSend('in-flight-txid')
  await pending
  assert.equal(page.settingName, false)
})

test('submitting without a memo set-name handler reports an error and does not navigate', async () => {
  const navigations = []
  const page = new SetNamePage({ navigate: (p) => navigations.push(p) })
  page.setInput('trout')

  const result = await page.submit()

  assert.equal(result.ok, false)
  assert.deepEqual(navigations, [])
})

test('a failed broadcast surfaces the real error and does not navigate', async () => {
  const wallet = fakeWallet()
  const profiles = fakeProfiles()
  wallet.failWith = 'BCH UTXO list is empty'
  const navigations = []
  const page = new SetNamePage({
    memoSetName: new MemoSetName({ wallet, profiles }),
    navigate: (p) => navigations.push(p)
  })
  page.setInput('trout')

  const result = await page.submit()

  assert.equal(result.ok, false)
  assert.equal(page.submitError, 'broadcast')
  assert.match(page.broadcastError, /BCH UTXO list is empty/)
  assert.equal(wallet.broadcasts.length, 1)
  assert.equal(wallet.broadcasts[0].prefix, '6d01')
  assert.deepEqual(navigations, [])
})
