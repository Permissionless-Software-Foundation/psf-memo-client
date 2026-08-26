/*
  Unit tests for the New Post Page behavior slice (src/services/new-post.js).

  Expresses the observable behavior described by specs/memo-new.feature:
    - posting a valid memo broadcasts an OP_RETURN with the Memo post prefix and
      navigates the user to the recent feed.
    - an empty memo is rejected with a validation error; nothing is broadcast.
    - an over-long memo is rejected with a length error; nothing is broadcast.
    - the character counter counts down from the memo limit.
    - the navigation menu links to /posts/new.
*/

'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')

const MemoPost = require('../../src/services/memo-post')
const NewPostPage = require('../../src/services/new-post')

const MAX = MemoPost.MAX_MEMO_CHARS // 217

// A fake wallet recording broadcast attempts.
function fakeWallet (cashAddress = 'bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d') {
  const broadcasts = []
  const wallet = {
    walletInfo: { cashAddress },
    utxos: [{ txid: 'utxo-fee' }],
    getUtxos: async function () { return this.utxos },
    sendOpReturn: async function (walletInfo, bchUtxos, msg, prefix) {
      this.broadcasts.push({ walletInfo, bchUtxos, msg, prefix })
      if (this.failWith) throw new Error(this.failWith)
      return 'newpost-txid'
    }
  }
  wallet.broadcasts = broadcasts
  return wallet
}

function fakeFeed () {
  const posts = []
  return { posts, addPost: (p) => posts.push(p) }
}

function build () {
  const wallet = fakeWallet()
  const feed = fakeFeed()
  const memoPost = new MemoPost({ wallet, feed })
  const navigations = []
  const page = new NewPostPage({
    memoPost,
    navigate: (path) => navigations.push(path)
  })
  return { wallet, feed, memoPost, page, navigations }
}

test('NEW_POST_PATH and RECENT_FEED_PATH constants', () => {
  assert.equal(NewPostPage.NEW_POST_PATH, '/posts/new')
  assert.equal(NewPostPage.RECENT_FEED_PATH, '/posts/recent')
})

test('the new post page is linked from the navigation menu', () => {
  const { page } = build()
  assert.equal(page.hasMenuLink('/posts/new'), true)
})

test('the character counter counts down from the memo limit for an empty memo', () => {
  const { page } = build()
  page.setInput('')
  assert.equal(page.remainingCount(), MAX)
})

test('the character counter counts down from the memo limit for a short memo', () => {
  const { page } = build()
  page.setInput('hello')
  assert.equal(page.remainingCount(), MAX - 5)
})

test('the character counter reaches zero at the memo limit', () => {
  const { page } = build()
  page.setInput('x'.repeat(MAX))
  assert.equal(page.remainingCount(), 0)
})

test('posting a valid memo broadcasts the Memo post prefix and navigates to the feed', async () => {
  const { wallet, feed, page, navigations } = build()
  page.setInput('hello memo')

  const result = await page.submit()

  assert.equal(result.ok, true)
  // The page returns to an idle (not posting) state after success.
  assert.equal(page.posting, false)
  // Broadcast happened with the Memo post prefix and the exact message.
  assert.equal(wallet.broadcasts.length, 1)
  assert.equal(wallet.broadcasts[0].prefix, '6d02')
  assert.equal(wallet.broadcasts[0].msg, 'hello memo')
  // Navigated to the recent feed after posting.
  assert.deepEqual(navigations, ['/posts/recent'])
  // The feed reflects the new post from this address.
  assert.equal(feed.posts.length, 1)
  assert.equal(feed.posts[0].text, 'hello memo')
})

test('posting an empty memo is rejected with a validation error and nothing is broadcast', async () => {
  const { wallet, feed, page, navigations } = build()
  page.setInput('')

  const result = await page.submit()

  assert.equal(result.ok, false)
  assert.equal(result.error, 'memo_validation')
  assert.equal(page.submitError, 'memo_validation')
  assert.equal(page.posting, false)
  assert.equal(wallet.broadcasts.length, 0)
  assert.equal(feed.posts.length, 0)
  assert.deepEqual(navigations, [])
})

test('posting an over-long memo is rejected with a length error and nothing is broadcast', async () => {
  const { wallet, feed, page, navigations } = build()
  page.setInput('y'.repeat(MAX + 1))

  const result = await page.submit()

  assert.equal(result.ok, false)
  assert.equal(result.error, 'memo_length')
  assert.equal(page.submitError, 'memo_length')
  assert.equal(page.posting, false)
  assert.equal(wallet.broadcasts.length, 0)
  assert.equal(feed.posts.length, 0)
  assert.deepEqual(navigations, [])
})

test('the new post page starts idle (not posting)', () => {
  const { page } = build()
  assert.equal(page.posting, false)
})

test('posting is true while a submit is in flight and false once it settles', async () => {
  const wallet = fakeWallet()
  const feed = fakeFeed()

  // Defer the broadcast so we can observe the in-flight posting state.
  let resolveSend
  wallet.sendOpReturn = async () => new Promise((resolve) => { resolveSend = resolve })
  const page = new NewPostPage({
    memoPost: new MemoPost({ wallet, feed }),
    navigate: () => {}
  })
  page.setInput('hello memo')

  assert.equal(page.posting, false)
  const pending = page.submit()
  assert.equal(page.posting, true)

  // Yield until the async chain reaches the deferred sendOpReturn call.
  await new Promise((resolve) => setImmediate(resolve))
  assert.equal(typeof resolveSend, 'function')
  resolveSend('in-flight-txid')
  await pending
  assert.equal(page.posting, false)
})

test('submitting without a memo post handler reports an error and does not navigate', async () => {
  const navigations = []
  const page = new NewPostPage({ navigate: (p) => navigations.push(p) })
  page.setInput('hello')

  const result = await page.submit()

  assert.equal(result.ok, false)
  assert.deepEqual(navigations, [])
})

test('a failed broadcast surfaces the real error and does not navigate', async () => {
  const wallet = fakeWallet()
  const feed = fakeFeed()
  wallet.failWith = 'BCH UTXO list is empty'
  const navigations = []
  const page = new NewPostPage({
    memoPost: new MemoPost({ wallet, feed }),
    navigate: (p) => navigations.push(p)
  })
  page.setInput('hello memo')

  const result = await page.submit()

  assert.equal(result.ok, false)
  assert.equal(page.submitError, 'broadcast')
  assert.match(page.broadcastError, /BCH UTXO list is empty/)
  // The broadcast was attempted (recorded) before it failed.
  assert.equal(wallet.broadcasts.length, 1)
  assert.equal(wallet.broadcasts[0].prefix, '6d02')
  // The user stays on the page.
  assert.deepEqual(navigations, [])
})

test('a failed broadcast surfaces a different real error message', async () => {
  const wallet = fakeWallet()
  wallet.failWith = 'Insufficient balance'
  const page = new NewPostPage({
    memoPost: new MemoPost({ wallet }),
    navigate: () => {}
  })
  page.setInput('hello memo')

  const result = await page.submit()

  assert.equal(result.ok, false)
  assert.match(page.broadcastError, /Insufficient balance/)
})

test('a broadcast failure with an empty message falls back to a string form', async () => {
  const wallet = fakeWallet()
  // Throw an Error with an empty message so the message fallback path is exercised.
  wallet.sendOpReturn = async () => { throw new Error('') }
  const page = new NewPostPage({ memoPost: new MemoPost({ wallet }), navigate: () => {} })
  page.setInput('hello memo')

  const result = await page.submit()

  assert.equal(result.ok, false)
  assert.equal(page.submitError, 'broadcast')
  // The real (string) error is surfaced even though the message was empty.
  assert.equal(typeof page.broadcastError, 'string')
  assert.ok(page.broadcastError.length > 0)
})
