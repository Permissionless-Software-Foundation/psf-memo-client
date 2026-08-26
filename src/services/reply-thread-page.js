/*
  Reply Thread Page behavior: compose and submit a reply inside a thread
  modal, with a live byte counter that counts down from the reply limit.

  This is the testable controller behind the Reply form in the React thread
  modal. It wraps the Memo reply behavior (src/services/memo-reply.js) and
  adds page-level concerns: holding the current input, tracking the parent txid
  being replied to, computing the remaining byte count, and surfacing
  validation/length/broadcast errors.

  The memoReply and navigate concerns are injected so this module stays free of
  UI/network concerns; environmentally unsuitable I/O lives behind those small
  adapter boundaries.
*/

const PageController = require('./page-controller')
const MemoReply = require('./memo-reply')
const { byteLength } = require('./utf8')

const REPLY_THREAD_PATH = '/posts/thread'

class ReplyThreadPage extends PageController {
  constructor (deps = {}) {
    super(deps)
    this.memoReply = deps.memoReply || null
    this.replying = false
    this.successPath = deps.successPath || null
    this.validationCodes = ['reply_validation', 'reply_length']
    this.parentTxid = deps.parentTxid || null
  }

  // Set the parent txid that the next reply will be attached to.
  setParent (txid) {
    this.parentTxid = txid
    return this
  }

  // Bytes remaining before the reply byte limit is reached.
  remainingCount () {
    return MemoReply.MAX_REPLY_BYTES - byteLength(this.input)
  }

  // Set the in-flight replying flag.
  _setBusy (value) {
    this.replying = value
  }

  // Run the memo reply action for the current input against the current parent.
  async _perform (input) {
    if (!this.memoReply) {
      throw new Error('Reply thread requires a memo reply handler.')
    }
    return this.memoReply.reply(input, this.parentTxid)
  }
}

ReplyThreadPage.REPLY_THREAD_PATH = REPLY_THREAD_PATH

module.exports = ReplyThreadPage
