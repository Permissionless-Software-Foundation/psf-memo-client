/*
  Memo reply behavior: compose, validate, and broadcast a Memo "reply" message.

  A Memo reply is an OP_RETURN Bitcoin Cash transaction carrying the Memo reply
  protocol prefix (0x6d03) followed by the parent transaction hash (32 bytes)
  and the reply message text. Broadcasting is done through a wallet that
  exposes the minimal-slp-wallet adapter surface (walletInfo, getUtxos(),
  sendOpReturn()).

  The wallet and thread are injected so this module stays testable and free of
  network/UI concerns; environmentally unsuitable I/O lives behind those small
  adapter boundaries.

  Constants
    MEMO_REPLY_PREFIX : hex prefix for the Memo "reply" action (0x6d03)
    MAX_REPLY_BYTES   : maximum allowed reply text length (184 bytes)
*/

const MemoAction = require('./memo-action')
const { byteLength } = require('./utf8')

const MEMO_REPLY_PREFIX = '6d03'
const MAX_REPLY_BYTES = 184
const PARENT_TXID_BYTES = 32

class MemoReply extends MemoAction {
  static config = {
    prefix: MEMO_REPLY_PREFIX,
    walletRequiredMsg: 'Memo reply requires a wallet.',
    lengthMessage: `Reply is too long. Maximum is ${MAX_REPLY_BYTES} bytes.`,
    emptyMessage: 'Reply must not be empty.',
    lengthCode: 'reply_length',
    validationCode: 'reply_validation'
  }

  constructor (deps = {}) {
    super(deps)
    this.thread = deps.thread
  }

  // A reply is over-length when its UTF-8 byte count exceeds the limit.
  isTooLong (message) {
    return byteLength(message) > MAX_REPLY_BYTES
  }

  // Compose and broadcast a Memo reply for the given message and parent txid.
  // Resolves with the transaction id, or rejects with a typed error.
  async reply (message, parentTxid) {
    const check = this.validate(message)
    this._throwIfInvalid(check)

    if (!this.wallet) {
      throw new Error(this.walletRequiredMsg)
    }

    // Refresh the wallet's spendable UTXO store so the broadcast has inputs.
    await this.wallet.getUtxos()

    // Build the raw payload: parent txid bytes followed by UTF-8 message bytes.
    const raw = buildReplyPayload(parentTxid, message)
    const txid = await this.wallet.sendOpReturn(raw, this.prefix)

    // Reflect the result on the injected thread once broadcast succeeds.
    this.reflect(txid, message, parentTxid)

    return txid
  }

  // Record the new reply on the injected thread store when one is present.
  reflect (txid, message, parentTxid) {
    if (this.thread && typeof this.thread.addReply === 'function') {
      this.thread.addReply({
        txid,
        address: this.wallet.walletInfo.cashAddress,
        text: message,
        parentTxid
      })
    }
  }
}

// Build the raw OP_RETURN message payload for a reply.
// The protocol wire format is: <parent txid 32 bytes><reply text UTF-8 bytes>.
function buildReplyPayload (parentTxid, message) {
  const parentBytes = hexToBytes(parentTxid)
  const textBytes = new TextEncoder().encode(message)
  const raw = new Uint8Array(parentBytes.length + textBytes.length)
  raw.set(parentBytes, 0)
  raw.set(textBytes, parentBytes.length)
  return raw
}

// Decode a 64-character hex transaction id into 32 raw bytes.
function hexToBytes (hex) {
  if (typeof hex !== 'string' || hex.length !== PARENT_TXID_BYTES * 2) {
    throw new Error('Parent txid must be a 64-character hex string.')
  }
  const bytes = new Uint8Array(PARENT_TXID_BYTES)
  for (let i = 0; i < hex.length; i += 2) {
    const byte = parseInt(hex.substr(i, 2), 16)
    if (Number.isNaN(byte)) {
      throw new Error('Parent txid must be a valid hex string.')
    }
    bytes[i / 2] = byte
  }
  return bytes
}

MemoReply.MEMO_REPLY_PREFIX = MEMO_REPLY_PREFIX
MemoReply.MAX_REPLY_BYTES = MAX_REPLY_BYTES

module.exports = MemoReply
