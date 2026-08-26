/*
  Unit tests for the Memo post behavior slice (src/services/memo-post.js).

  These tests express the observable behavior described by
  specs/post-memo.feature:
    - a valid memo broadcasts an OP_RETURN transaction carrying the Memo post
      prefix (0x6d02) and the message text, and the feed reflects the new post.
    - an empty memo is rejected with a validation error and nothing is broadcast.
    - an over-long memo is rejected with a length error and nothing is broadcast.
*/

'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')

const MemoPost = require('../../src/services/memo-post')

// A fake wallet that records every broadcast attempt. It satisfies the small
// adapter surface the MemoPost module needs: walletInfo, getUtxos(),
// sendOpReturn().
function fakeWallet (cashAddress = 'bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d', utxos = [{ txid: 'utxo1' }]) {
  const broadcasts = []
  const wallet = {
    walletInfo: { cashAddress },
    getUtxos: async () => utxos,
    sendOpReturn: async (msg, prefix) => {
      broadcasts.push({ msg, prefix })
      return 'fake-txid'
    }
  }
  wallet.broadcasts = broadcasts
  return wallet
}

// A fake feed that records posts added to the recent posts feed.
function fakeFeed () {
  const posts = []
  return { posts, addPost: (p) => posts.push(p) }
}

test('MEMO_POST_PREFIX is the Memo post action 0x6d02', () => {
  assert.equal(MemoPost.MEMO_POST_PREFIX, '6d02')
})

test('posting a valid memo broadcasts an OP_RETURN with the Memo post prefix and message', async () => {
  const wallet = fakeWallet()
  const feed = fakeFeed()
  const memoPost = new MemoPost({ wallet, feed })

  const txid = await memoPost.post('hello memo')

  assert.equal(txid, 'fake-txid')
  assert.equal(wallet.broadcasts.length, 1)
  const b = wallet.broadcasts[0]
  assert.equal(b.prefix, '6d02')
  assert.equal(b.msg, 'hello memo')

  // The feed reflects the new post from this address with this text.
  assert.equal(feed.posts.length, 1)
  assert.equal(feed.posts[0].text, 'hello memo')
  assert.equal(feed.posts[0].address, wallet.walletInfo.cashAddress)
})

test('posting a memo at the maximum length (217) is accepted', async () => {
  const wallet = fakeWallet()
  const memoPost = new MemoPost({ wallet })

  const msg = 'x'.repeat(217)
  const txid = await memoPost.post(msg)
  assert.equal(txid, 'fake-txid')
  assert.equal(wallet.broadcasts[0].msg, msg)
})

test('posting an empty memo throws a validation error and broadcasts nothing', async () => {
  const wallet = fakeWallet()
  const feed = fakeFeed()
  const memoPost = new MemoPost({ wallet, feed })

  await assert.rejects(
    memoPost.post(''),
    (err) => err.code === 'memo_validation'
  )
  assert.equal(wallet.broadcasts.length, 0)
  assert.equal(feed.posts.length, 0)
})

test('posting a whitespace-only or non-string memo throws a validation error and broadcasts nothing', async () => {
  for (const invalid of ['   ', 42]) {
    const wallet = fakeWallet()
    const memoPost = new MemoPost({ wallet })

    await assert.rejects(
      memoPost.post(invalid),
      (err) => err.code === 'memo_validation'
    )
    assert.equal(wallet.broadcasts.length, 0)
  }
})

test('posting an over-long memo (218) throws a length error and broadcasts nothing', async () => {
  const wallet = fakeWallet()
  const feed = fakeFeed()
  const memoPost = new MemoPost({ wallet, feed })

  await assert.rejects(
    memoPost.post('y'.repeat(218)),
    (err) => err.code === 'memo_length'
  )
  assert.equal(wallet.broadcasts.length, 0)
  assert.equal(feed.posts.length, 0)
})

test('posting without a wallet reports a missing-wallet error', async () => {
  const memoPost = new MemoPost({})
  await assert.rejects(
    memoPost.post('hello memo'),
    (err) => /wallet/i.test(err.message)
  )
})
