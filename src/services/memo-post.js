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

const MEMO_POST_PREFIX = '6d02'
const MAX_MEMO_CHARS = 217

class MemoPost {
  constructor (deps = {}) {
    this.wallet = deps.wallet
    this.feed = deps.feed
  }

  // Validate a candidate memo message.
  // Returns { ok: true } or { ok: false, type: 'validation' | 'length' }.
  validate (message) {
    if (typeof message !== 'string' || message.trim().length === 0) {
      return { ok: false, type: 'validation' }
    }

    if (message.length > MAX_MEMO_CHARS) {
      return { ok: false, type: 'length' }
    }

    return { ok: true }
  }

  // Compose and broadcast a Memo post for the given message.
  // Resolves with the transaction id, or rejects with a typed error.
  async post (message) {
    const check = this.validate(message)
    this._throwIfInvalid(check)

    if (!this.wallet) {
      throw new Error('Memo post requires a wallet.')
    }

    // Spendable outputs used to pay the transaction fee.
    const bchUtxos = await this.wallet.getUtxos()

    // Broadcast the OP_RETURN transaction with the Memo post prefix.
    const txid = await this.wallet.sendOpReturn(
      this.wallet.walletInfo,
      bchUtxos,
      message,
      MEMO_POST_PREFIX
    )

    // Reflect the new post in the feed once broadcast succeeds.
    this._reflectPost(txid, message)

    return txid
  }

  // Throw the appropriate typed error when a memo fails validation.
  _throwIfInvalid (check) {
    if (check.ok) return

    const err = new Error(
      check.type === 'length'
        ? `Memo is too long. Maximum is ${MAX_MEMO_CHARS} characters.`
        : 'Memo must not be empty.'
    )
    err.code = check.type === 'length' ? 'memo_length' : 'memo_validation'
    throw err
  }

  // Record the new post on the injected feed when one is present.
  _reflectPost (txid, message) {
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
// {"version":1,"tested_at":"2026-08-26T00:06:35.333Z","module_hash":"600c2edb145b16db5e313a2911fe164a2c08731346f2a67f52bca18827d8081e","functions":[{"id":"func/MemoPost.constructor","name":"MemoPost.constructor","line":23,"end_line":26,"hash":"73596685cdf614a4aa3bb3ab2ee2eec1c080e41ef8c56053a521eb07ca5c7d48"},{"id":"func/MemoPost.validate","name":"MemoPost.validate","line":30,"end_line":40,"hash":"2e45fb32d480e36e04ac61c3fb414849d9daa640c5ac366ee1363be4c3903fd0"},{"id":"func/MemoPost.post","name":"MemoPost.post","line":44,"end_line":67,"hash":"6a817a7eceb24e9e4eb9689345ea3ef6456e8b872bff00a0587bddae8060ead2"},{"id":"func/MemoPost._throwIfInvalid","name":"MemoPost._throwIfInvalid","line":70,"end_line":80,"hash":"e01932c7c343519cc8dd52d3e29b695783c6cdb7e84368e193140827c26bb39c"},{"id":"func/MemoPost._reflectPost","name":"MemoPost._reflectPost","line":83,"end_line":91,"hash":"36e9b77ac19b8a0c598e02f438c3d2ac1f6b7495cf6e28d9546d064ce63f861a"}]}
// mutate4javascript-manifest-end
