/*
  Unit tests for the Memo set-name behavior slice (src/services/memo-set-name.js).

  These tests express the observable behavior described by specs/set-name.feature:
    - a valid name broadcasts an OP_RETURN transaction carrying the Memo set-name
      prefix (0x6d01) and the name text, and the profile store reflects the new
      name.
    - an empty name is rejected with a validation error and nothing is broadcast.
    - an over-long name is rejected with a length error and nothing is broadcast.
*/

'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')

const MemoSetName = require('../../src/services/memo-set-name')
const { fakeWallet } = require('../helpers/fake-wallet')
const { fakeProfiles } = require('../helpers/fake-profiles')
const { registerMemoActionTests } = require('./memo-action-helpers')

registerMemoActionTests({
  Action: MemoSetName,
  method: 'setName',
  MAX: 77,
  lengthCode: 'name_length',
  validationCode: 'name_validation',
  label: 'setting a name',
  storeKey: 'profiles',
  storeFactory: fakeProfiles,
  assertStoreEmpty: (profiles, wallet) => assert.equal(profiles.getName(wallet.walletInfo.cashAddress), null)
})
test('MEMO_SET_NAME_PREFIX is the Memo set-name action 0x6d01', () => {
  assert.equal(MemoSetName.MEMO_SET_NAME_PREFIX, '6d01')
})

test('setting a valid name broadcasts an OP_RETURN with the Memo set-name prefix and name', async () => {
  const wallet = fakeWallet()
  const profiles = fakeProfiles()
  const memoSetName = new MemoSetName({ wallet, profiles })

  const txid = await memoSetName.setName('trout')

  assert.equal(txid, 'fake-txid')
  assert.equal(wallet.broadcasts.length, 1)
  const b = wallet.broadcasts[0]
  assert.equal(b.prefix, '6d01')
  assert.equal(b.msg, 'trout')

  // The profile store reflects the new name for this address.
  assert.equal(profiles.getName(wallet.walletInfo.cashAddress), 'trout')
})

test('setting a name at the maximum byte length with multi-byte characters is accepted', async () => {
  const wallet = fakeWallet()
  const memoSetName = new MemoSetName({ wallet })

  // 38 'é' characters are 76 bytes in UTF-8.
  const name = 'é'.repeat(38)
  assert.equal(Buffer.byteLength(name, 'utf8'), 76)
  const txid = await memoSetName.setName(name)
  assert.equal(txid, 'fake-txid')
})

test('setting an over-long name in bytes (78) throws a length error even when char count is lower', async () => {
  const wallet = fakeWallet()
  const memoSetName = new MemoSetName({ wallet })

  // 40 'é' characters are 80 bytes, exceeding the 77-byte limit.
  const name = 'é'.repeat(40)
  assert.ok(Buffer.byteLength(name, 'utf8') > 77)
  await assert.rejects(
    memoSetName.setName(name),
    (err) => err.code === 'name_length'
  )
  assert.equal(wallet.broadcasts.length, 0)
})

test('setting an empty name throws a validation error and broadcasts nothing', async () => {
  const wallet = fakeWallet()
  const profiles = fakeProfiles()
  const memoSetName = new MemoSetName({ wallet, profiles })

  await assert.rejects(
    memoSetName.setName(''),
    (err) => err.code === 'name_validation'
  )
  assert.equal(wallet.broadcasts.length, 0)
  assert.equal(profiles.getName(wallet.walletInfo.cashAddress), null)
})

test('setting a name without a wallet reports a missing-wallet error', async () => {
  const memoSetName = new MemoSetName({})
  await assert.rejects(
    memoSetName.setName('trout'),
    (err) => /wallet/i.test(err.message)
  )
})

test('a failed broadcast does not update the profile store', async () => {
  const wallet = fakeWallet()
  wallet.sendOpReturn = async () => { throw new Error('broadcast failure') }
  const profiles = fakeProfiles()
  const memoSetName = new MemoSetName({ wallet, profiles })

  await assert.rejects(
    memoSetName.setName('trout'),
    (err) => /broadcast failure/i.test(err.message)
  )
  assert.equal(wallet.broadcasts.length, 0)
  assert.equal(profiles.getName(wallet.walletInfo.cashAddress), null)
})
