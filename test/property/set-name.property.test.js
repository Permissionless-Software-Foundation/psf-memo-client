/*
  Property tests for the Set Name behavior slice.

  These assert useful invariants that unit tests cover only at a few fixed
  points:
    - Set-name validation classification is stable across a broad input range:
      any non-blank string up to the byte limit is accepted, any longer string
      is rejected with a length error, and blank/non-string input is a
      validation error.
    - The Set Name byte counter conserves its relationship to input byte
      length: Buffer.byteLength(input) + remainingCount() === MAX_NAME_BYTES
      for any string.
    - setInput round-trips the exact draft text.
    - A broadcast failure surfaces the error and never navigates.
*/

'use strict'

const test = require('node:test')

const { seededRandom, forAll, makeStringGen } = require('./harness')

const MemoSetName = require('../../src/services/memo-set-name')
const SetNamePage = require('../../src/services/set-name-page')

const MAX = MemoSetName.MAX_NAME_BYTES // 77

const rng = seededRandom(20260827)
const stringOf = makeStringGen(rng)

function buildPage () {
  return new SetNamePage({
    memoSetName: new MemoSetName({}),
    navigate: () => {}
  })
}

// A fake wallet recording broadcast attempts; fails when failWith is set.
function fakeWallet () {
  const wallet = {
    walletInfo: { cashAddress: 'bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d' },
    utxos: [{ txid: 'utxo-fee' }],
    getUtxos: async function () { return this.utxos },
    sendOpReturn: async function (msg, prefix) {
      if (this.failWith) throw new Error(this.failWith)
      return 'prop-txid'
    }
  }
  return wallet
}

function fakeProfiles () {
  const names = new Map()
  return {
    names,
    setName: (addr, name) => names.set(addr, name),
    getName: (addr) => names.get(addr) || null
  }
}

test('set-name validation: any non-blank string at or below the byte limit is valid', async () => {
  await forAll(
    (i) => {
      const len = 1 + Math.floor(rng() * MAX) // 1..MAX
      return stringOf(len)
    },
    (name) => {
      // A random ASCII string may occasionally be all whitespace; whitespace-only
      // input is a validation error, so only assert for non-blank strings.
      if (name.trim().length === 0) return true
      const result = new MemoSetName({}).validate(name)
      return result.ok === true
    },
    { label: 'valid byte length' }
  )
})

test('set-name validation: any string above the byte limit is a length error', async () => {
  await forAll(
    (i) => stringOf(MAX + 1 + Math.floor(rng() * 100)), // > MAX
    (name) => {
      const result = new MemoSetName({}).validate(name)
      return result.ok === false && result.type === 'length'
    },
    { label: 'over-long rejected as length' }
  )
})

test('set-name validation: blank and non-string input are validation errors', async () => {
  await forAll(
    (i) => (i % 2 === 0 ? '   ' : null),
    (name) => {
      const result = new MemoSetName({}).validate(name)
      return result.ok === false && result.type === 'validation'
    },
    { label: 'blank/non-string rejected as validation' }
  )
})

test('byte counter conserves byte length: remaining === MAX - byteLength(input)', async () => {
  await forAll(
    (i) => stringOf(Math.floor(rng() * (MAX + 8))),
    (name) => {
      const page = buildPage()
      page.setInput(name)
      return page.remainingCount() === MAX - Buffer.byteLength(name, 'utf8')
    },
    { label: 'byte counter conservation' }
  )
})

test('setInput round-trips the draft text exactly', async () => {
  await forAll(
    (i) => stringOf(Math.floor(rng() * 50)),
    (name) => {
      const page = buildPage()
      page.setInput(name)
      return page.input === name
    },
    { label: 'setInput round-trip' }
  )
})

test('a broadcast failure surfaces the error and never navigates', async () => {
  await forAll(
    (i) => ({ name: stringOf(1 + Math.floor(rng() * 40)), failWith: `boom-${i % 97}` }),
    ({ name, failWith }) => {
      const wallet = fakeWallet()
      wallet.failWith = failWith
      const navigations = []
      const page = new SetNamePage({
        memoSetName: new MemoSetName({ wallet, profiles: fakeProfiles() }),
        navigate: (p) => navigations.push(p)
      })
      page.setInput(name)

      return page.submit().then((result) => {
        if (result.ok) return false
        if (page.submitError !== 'broadcast') return false
        if (!page.broadcastError || !page.broadcastError.includes('boom')) return false
        return navigations.length === 0
      })
    },
    { label: 'broadcast failure does not navigate' }
  )
})
