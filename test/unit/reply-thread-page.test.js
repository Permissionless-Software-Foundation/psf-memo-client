/*
  Unit tests for the Reply Thread Page behavior slice (src/services/reply-thread-page.js).

  Expresses the observable behavior described by specs/reply-memo.feature:
    - replying with a valid message broadcasts an OP_RETURN with the Memo reply
      prefix and reflects the reply in the thread.
    - an empty reply is rejected with a validation error; nothing is broadcast.
    - an over-long reply is rejected with a length error; nothing is broadcast.
    - the byte counter counts down from the reply limit.
*/

'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')

const MemoReply = require('../../src/services/memo-reply')
const ReplyThreadPage = require('../../src/services/reply-thread-page')

const MAX = MemoReply.MAX_REPLY_BYTES // 184
const PARENT_TXID = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'

function fakeWallet (cashAddress = 'bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d') {
  const broadcasts = []
  const wallet = {
    walletInfo: { cashAddress },
    utxos: [{ txid: 'utxo-fee' }],
    getUtxos: async function () { return this.utxos },
    sendOpReturn: async function (msg, prefix) {
      this.broadcasts.push({ msg, prefix })
      if (this.failWith) throw new Error(this.failWith)
      return 'reply-txid'
    }
  }
  wallet.broadcasts = broadcasts
  return wallet
}

function fakeThread (rootTxid = PARENT_TXID) {
  const replies = []
  return { rootTxid, replies, addReply: (r) => replies.push(r) }
}

function build (deps = {}) {
  const wallet = deps.wallet || fakeWallet()
  const thread = deps.thread || fakeThread()
  const memoReply = new MemoReply({ wallet, thread })
  const navigations = []
  const page = new ReplyThreadPage({
    memoReply,
    parentTxid: deps.parentTxid || PARENT_TXID,
    navigate: (path) => navigations.push(path)
  })
  return { wallet, thread, memoReply, page, navigations }
}

test('REPLY_THREAD_PATH constant', () => {
  assert.equal(ReplyThreadPage.REPLY_THREAD_PATH, '/posts/thread')
})

test('the byte counter counts down from the reply limit for an empty reply', () => {
  const { page } = build()
  page.setInput('')
  assert.equal(page.remainingCount(), MAX)
})

test('the byte counter counts down from the reply limit for a short reply', () => {
  const { page } = build()
  page.setInput('hello')
  assert.equal(page.remainingCount(), MAX - 5)
})

test('the byte counter counts multi-byte characters by bytes, not characters', () => {
  const { page } = build()
  page.setInput('é')
  assert.equal(page.remainingCount(), MAX - 2)
})

test('the byte counter reaches zero at the reply byte limit', () => {
  const { page } = build()
  page.setInput('x'.repeat(MAX))
  assert.equal(page.remainingCount(), 0)
})

test('submitting a valid reply broadcasts the Memo reply prefix and reflects it in the thread', async () => {
  const { wallet, thread, page, navigations } = build()
  page.setInput('hello memo')

  const result = await page.submit()

  assert.equal(result.ok, true)
  assert.equal(page.replying, false)
  assert.equal(wallet.broadcasts.length, 1)
  assert.equal(wallet.broadcasts[0].prefix, '6d03')
  assert.deepEqual(navigations, [])
  assert.equal(thread.replies.length, 1)
  assert.equal(thread.replies[0].text, 'hello memo')
  assert.equal(thread.replies[0].parentTxid, PARENT_TXID)
})

test('submitting an empty reply is rejected with a validation error and nothing is broadcast', async () => {
  const { wallet, thread, page, navigations } = build()
  page.setInput('')

  const result = await page.submit()

  assert.equal(result.ok, false)
  assert.equal(result.error, 'reply_validation')
  assert.equal(page.submitError, 'reply_validation')
  assert.equal(page.replying, false)
  assert.equal(wallet.broadcasts.length, 0)
  assert.equal(thread.replies.length, 0)
  assert.deepEqual(navigations, [])
})

test('submitting an over-long reply is rejected with a length error and nothing is broadcast', async () => {
  const { wallet, thread, page, navigations } = build()
  page.setInput('y'.repeat(MAX + 1))

  const result = await page.submit()

  assert.equal(result.ok, false)
  assert.equal(result.error, 'reply_length')
  assert.equal(page.submitError, 'reply_length')
  assert.equal(page.replying, false)
  assert.equal(wallet.broadcasts.length, 0)
  assert.equal(thread.replies.length, 0)
  assert.deepEqual(navigations, [])
})

test('the reply page starts idle (not replying)', () => {
  const { page } = build()
  assert.equal(page.replying, false)
})

test('replying is true while a submit is in flight and false once it settles', async () => {
  const wallet = fakeWallet()
  const thread = fakeThread()

  let resolveSend
  wallet.sendOpReturn = async () => new Promise((resolve) => { resolveSend = resolve })
  const page = new ReplyThreadPage({
    memoReply: new MemoReply({ wallet, thread }),
    parentTxid: PARENT_TXID,
    navigate: () => {}
  })
  page.setInput('hello memo')

  assert.equal(page.replying, false)
  const pending = page.submit()
  assert.equal(page.replying, true)

  await new Promise((resolve) => setImmediate(resolve))
  assert.equal(typeof resolveSend, 'function')
  resolveSend('in-flight-txid')
  await pending
  assert.equal(page.replying, false)
})

test('submitting without a memo reply handler reports an error and does not navigate', async () => {
  const navigations = []
  const page = new ReplyThreadPage({ navigate: (p) => navigations.push(p) })
  page.setInput('hello')

  const result = await page.submit()

  assert.equal(result.ok, false)
  assert.deepEqual(navigations, [])
})

test('a failed broadcast surfaces the real error and does not navigate', async () => {
  const wallet = fakeWallet()
  const thread = fakeThread()
  wallet.failWith = 'BCH UTXO list is empty'
  const navigations = []
  const page = new ReplyThreadPage({
    memoReply: new MemoReply({ wallet, thread }),
    parentTxid: PARENT_TXID,
    navigate: (p) => navigations.push(p)
  })
  page.setInput('hello memo')

  const result = await page.submit()

  assert.equal(result.ok, false)
  assert.equal(page.submitError, 'broadcast')
  assert.match(page.broadcastError, /BCH UTXO list is empty/)
  assert.equal(wallet.broadcasts.length, 1)
  assert.equal(wallet.broadcasts[0].prefix, '6d03')
  assert.deepEqual(navigations, [])
})

test('replying to a nested reply uses the selected parent txid', async () => {
  const nestedTxid = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
  const { thread, page } = build()
  page.setParent(nestedTxid)
  page.setInput('hello nested')

  const result = await page.submit()

  assert.equal(result.ok, true)
  assert.equal(thread.replies[0].parentTxid, nestedTxid)
  assert.equal(thread.replies[0].text, 'hello nested')
})
