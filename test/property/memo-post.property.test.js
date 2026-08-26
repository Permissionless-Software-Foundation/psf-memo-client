/*
  Property tests for the Memo post / New Post behavior slices.

  These assert useful invariants that unit tests cover only at a few fixed
  points:
    - Validation classification is stable across a broad input range: any
      non-blank string up to the length limit is accepted, any longer string is
      rejected with a length error, and blank/non-string input is a validation
      error.
    - The New Post character counter conserves its relationship to input
      length: input.length + remainingCount() === MAX_MEMO_CHARS for any string.
    - setInput round-trips the exact draft text.
*/

'use strict'

const test = require('node:test')

const { seededRandom, forAll, makeStringGen } = require('./harness')

const MemoPost = require('../../src/services/memo-post')
const NewPostPage = require('../../src/services/new-post')

const MAX = MemoPost.MAX_MEMO_CHARS // 217

const rng = seededRandom(20260826)
const stringOf = makeStringGen(rng)

function buildPage () {
  return new NewPostPage({
    memoPost: new MemoPost({}),
    navigate: () => {},
    menuLinks: []
  })
}

// A fake wallet recording broadcast attempts; fails when failWith is set.
function fakeWallet () {
  const wallet = {
    walletInfo: { cashAddress: 'bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d' },
    utxos: [{ txid: 'utxo-fee' }],
    getUtxos: async function () { return this.utxos },
    sendOpReturn: async function (walletInfo, bchUtxos, msg, prefix) {
      if (this.failWith) throw new Error(this.failWith)
      return 'prop-txid'
    }
  }
  return wallet
}

function fakeFeed () {
  const posts = []
  return { posts, addPost: (p) => posts.push(p) }
}

test('memo validation: any non-blank string at or below the limit is valid', async () => {
  await forAll(
    (i) => {
      const len = 1 + Math.floor(rng() * MAX) // 1..MAX
      return stringOf(len)
    },
    (msg) => {
      // A random ASCII string may occasionally be all whitespace; whitespace-only
      // input is a validation error, so only assert for non-blank strings.
      if (msg.trim().length === 0) return true
      const result = new MemoPost({}).validate(msg)
      return result.ok === true
    },
    { label: 'valid length' }
  )
})

test('memo validation: any string above the limit is a length error', async () => {
  await forAll(
    (i) => stringOf(MAX + 1 + Math.floor(rng() * 100)), // > MAX
    (msg) => {
      const result = new MemoPost({}).validate(msg)
      return result.ok === false && result.type === 'length'
    },
    { label: 'over-long rejected as length' }
  )
})

test('memo validation: blank and non-string input are validation errors', async () => {
  await forAll(
    (i) => (i % 2 === 0 ? '   ' : null),
    (msg) => {
      const result = new MemoPost({}).validate(msg)
      return result.ok === false && result.type === 'validation'
    },
    { label: 'blank/non-string rejected as validation' }
  )
})

test('character counter conserves length: remaining === MAX - input.length', async () => {
  await forAll(
    (i) => stringOf(Math.floor(rng() * (MAX + 8))),
    (msg) => {
      const page = buildPage()
      page.setInput(msg)
      return page.remainingCount() === MAX - msg.length
    },
    { label: 'counter conservation' }
  )
})

test('setInput round-trips the draft text exactly', async () => {
  await forAll(
    (i) => stringOf(Math.floor(rng() * 50)),
    (msg) => {
      const page = buildPage()
      page.setInput(msg)
      return page.input === msg
    },
    { label: 'setInput round-trip' }
  )
})

test('menu link registration is idempotent', async () => {
  await forAll(
    (i) => `/posts/${i}`,
    (path) => {
      const page = buildPage()
      page.addMenuLink(path)
      page.addMenuLink(path)
      page.addMenuLink(path)
      return page.menuLinks.filter((p) => p === path).length === 1
    },
    { label: 'menu link idempotence' }
  )
})

test('a broadcast failure surfaces the error and never navigates', async () => {
  await forAll(
    (i) => ({ message: stringOf(1 + Math.floor(rng() * 40)), failWith: `boom-${i % 97}` }),
    ({ message, failWith }) => {
      const wallet = fakeWallet()
      wallet.failWith = failWith
      const navigations = []
      const page = new NewPostPage({
        memoPost: new MemoPost({ wallet, feed: fakeFeed() }),
        navigate: (p) => navigations.push(p)
      })
      page.setInput(message)

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
