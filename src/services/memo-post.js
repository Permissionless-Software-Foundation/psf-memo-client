/*
  Memo post behavior: compose, validate, and broadcast a Memo "post" message.

  A Memo post is an OP_RETURN Bitcoin Cash transaction carrying the Memo post
  protocol prefix (0x6d02) followed by the message text. Broadcasting is done
  through a wallet that exposes the minimal-slp-wallet adapter surface
  (walletInfo, getUtxos(), sendOpReturn()).

  The wallet and feed are injected so this module stays testable and free of
  network/UI concerns; environmentally unsuitable I/O lives behind those small
  adapter boundaries.

  Constants
    MEMO_POST_PREFIX : hex prefix for the Memo "post" action (0x6d02)
    MAX_MEMO_CHARS   : maximum allowed memo length (spec boundary: 217 valid,
                       218 rejected)
*/

const MemoAction = require('./memo-action')

const MEMO_POST_PREFIX = '6d02'
const MAX_MEMO_CHARS = 217

class MemoPost extends MemoAction {
  constructor (deps = {}) {
    super(deps)
    this.feed = deps.feed
    this.prefix = MEMO_POST_PREFIX
    this.walletRequiredMsg = 'Memo post requires a wallet.'
    this.lengthMessage = `Memo is too long. Maximum is ${MAX_MEMO_CHARS} characters.`
    this.emptyMessage = 'Memo must not be empty.'
    this.lengthCode = 'memo_length'
    this.validationCode = 'memo_validation'
  }

  // A memo is over-length when it exceeds the character limit.
  isTooLong (message) {
    return message.length > MAX_MEMO_CHARS
  }

  // Compose and broadcast a Memo post for the given message.
  // Resolves with the transaction id, or rejects with a typed error.
  async post (message) {
    return this.broadcast(message)
  }

  // Record the new post on the injected feed when one is present.
  reflect (txid, message) {
    if (this.feed && typeof this.feed.addPost === 'function') {
      this.feed.addPost({
        txid,
        address: this.wallet.walletInfo.cashAddress,
        text: message
      })
    }
  }
}

MemoPost.MEMO_POST_PREFIX = MEMO_POST_PREFIX
MemoPost.MAX_MEMO_CHARS = MAX_MEMO_CHARS

module.exports = MemoPost

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-08-26T02:54:15.221Z","module_hash":"7060e3997af5f6340180385c1e96e055614280683bffdeb737e49c37ad6ce946","functions":[{"id":"func/MemoPost.constructor","name":"MemoPost.constructor","line":25,"end_line":34,"hash":"f1843343deb758b304364862c2c58af3a8a5b03e3d8a70f3056c8679e869a9ed"},{"id":"func/MemoPost.isTooLong","name":"MemoPost.isTooLong","line":37,"end_line":39,"hash":"833f9f66eae849df0248d0c696c95c767a121b394b1c728bc3ec675668dff5de"},{"id":"func/MemoPost.post","name":"MemoPost.post","line":43,"end_line":45,"hash":"26d8e84b520fae1928f7f72215e6ed95f7219c14266c99b710e2af5373cb6faf"},{"id":"func/MemoPost.reflect","name":"MemoPost.reflect","line":48,"end_line":56,"hash":"87e2168a71309a572c60b63f382dd6f681cb28ed543090dbde399e29556cfcdf"}]}
// mutate4javascript-manifest-end
