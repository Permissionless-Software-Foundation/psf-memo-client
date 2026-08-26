/*
  Unit tests for the Memo reply behavior slice (src/services/memo-reply.js).

  These tests express the observable behavior described by
  specs/reply-memo.feature:
    - a valid reply broadcasts an OP_RETURN transaction carrying the Memo reply
      prefix (0x6d03), the parent txid bytes, and the message text; the thread
      reflects the new reply.
    - an empty reply is rejected with a validation error and nothing is broadcast.
    - an over-long reply is rejected with a length error and nothing is broadcast.
*/

'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')

const MemoReply = require('../../src/services/memo-reply')

const PARENT_TXID = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'

// A fake wallet that records every broadcast attempt.
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

// A fake thread that records replies added to the thread view.
function fakeThread (rootTxid = PARENT_TXID) {
  const replies = []
  return {
    rootTxid,
    replies,
    addReply: (r) => replies.push(r)
  }
}

// Decode the reply text from a raw Uint8Array payload (skipping the 32-byte parent txid).
function decodeReplyText (raw) {
  const decoder = new TextDecoder()
  return decoder.decode(raw.slice(32))
}

// Decode the parent txid from a raw Uint8Array payload.
function decodeParentTxid (raw) {
  return Buffer.from(raw.slice(0, 32)).toString('hex')
}

test('MEMO_REPLY_PREFIX is the Memo reply action 0x6d03', () => {
  assert.equal(MemoReply.MEMO_REPLY_PREFIX, '6d03')
})

test('replying with a valid message broadcasts an OP_RETURN with the Memo reply prefix and payload', async () => {
  const wallet = fakeWallet()
  const thread = fakeThread()
  const memoReply = new MemoReply({ wallet, thread })

  const txid = await memoReply.reply('hello memo', PARENT_TXID)

  assert.equal(txid, 'fake-txid')
  assert.equal(wallet.broadcasts.length, 1)
  const b = wallet.broadcasts[0]
  assert.equal(b.prefix, '6d03')
  assert.ok(b.msg instanceof Uint8Array)
  assert.equal(decodeParentTxid(b.msg), PARENT_TXID)
  assert.equal(decodeReplyText(b.msg), 'hello memo')

  // The thread reflects the new reply from this address with this text.
  assert.equal(thread.replies.length, 1)
  assert.equal(thread.replies[0].text, 'hello memo')
  assert.equal(thread.replies[0].address, wallet.walletInfo.cashAddress)
  assert.equal(thread.replies[0].parentTxid, PARENT_TXID)
})

test('replying at the maximum byte length (184) is accepted', async () => {
  const wallet = fakeWallet()
  const memoReply = new MemoReply({ wallet })

  const msg = 'x'.repeat(184)
  const txid = await memoReply.reply(msg, PARENT_TXID)
  assert.equal(txid, 'fake-txid')
  assert.equal(decodeReplyText(wallet.broadcasts[0].msg), msg)
})

test('replying with a multi-byte character at the byte limit is accepted', async () => {
  const wallet = fakeWallet()
  const memoReply = new MemoReply({ wallet })

  // 92 'é' characters encode to 184 UTF-8 bytes.
  const msg = 'é'.repeat(92)
  assert.equal(Buffer.byteLength(msg, 'utf8'), 184)
  const txid = await memoReply.reply(msg, PARENT_TXID)
  assert.equal(txid, 'fake-txid')
})

test('replying with an empty message throws a validation error and broadcasts nothing', async () => {
  const wallet = fakeWallet()
  const thread = fakeThread()
  const memoReply = new MemoReply({ wallet, thread })

  await assert.rejects(
    memoReply.reply('', PARENT_TXID),
    (err) => err.code === 'reply_validation'
  )
  assert.equal(wallet.broadcasts.length, 0)
  assert.equal(thread.replies.length, 0)
})

test('replying with a whitespace-only or non-string message throws a validation error and broadcasts nothing', async () => {
  for (const invalid of ['   ', 42]) {
    const wallet = fakeWallet()
    const memoReply = new MemoReply({ wallet })

    await assert.rejects(
      memoReply.reply(invalid, PARENT_TXID),
      (err) => err.code === 'reply_validation'
    )
    assert.equal(wallet.broadcasts.length, 0)
  }
})

test('replying with an over-long message (185 bytes) throws a length error and broadcasts nothing', async () => {
  const wallet = fakeWallet()
  const thread = fakeThread()
  const memoReply = new MemoReply({ wallet, thread })

  await assert.rejects(
    memoReply.reply('y'.repeat(185), PARENT_TXID),
    (err) => err.code === 'reply_length'
  )
  assert.equal(wallet.broadcasts.length, 0)
  assert.equal(thread.replies.length, 0)
})

test('replying with a multi-byte character that exceeds the byte limit throws a length error', async () => {
  const wallet = fakeWallet()
  const memoReply = new MemoReply({ wallet })

  // 93 'é' characters encode to 186 UTF-8 bytes, exceeding the 184-byte limit.
  const msg = 'é'.repeat(93)
  assert.ok(Buffer.byteLength(msg, 'utf8') > 184)

  await assert.rejects(
    memoReply.reply(msg, PARENT_TXID),
    (err) => err.code === 'reply_length'
  )
  assert.equal(wallet.broadcasts.length, 0)
})

test('replying without a wallet reports a missing-wallet error', async () => {
  const memoReply = new MemoReply({})
  await assert.rejects(
    memoReply.reply('hello memo', PARENT_TXID),
    (err) => /wallet/i.test(err.message)
  )
})

test('replying with an invalid parent txid reports a clear error', async () => {
  const wallet = fakeWallet()
  const memoReply = new MemoReply({ wallet })

  await assert.rejects(
    memoReply.reply('hello memo', 'not-a-txid'),
    (err) => /txid/i.test(err.message)
  )
  assert.equal(wallet.broadcasts.length, 0)
})
