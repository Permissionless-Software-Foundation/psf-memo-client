/*
  Memo set-name behavior: compose, validate, and broadcast a Memo "set name"
  message.

  A Memo set-name transaction is an OP_RETURN Bitcoin Cash transaction carrying
  the Memo set-name protocol prefix (0x6d01) followed by the name text.
  Broadcasting is done through a wallet that exposes the minimal-slp-wallet
  adapter surface (walletInfo, getUtxos(), sendOpReturn()).

  The wallet and profiles store are injected so this module stays testable and
  free of network/UI concerns; environmentally unsuitable I/O lives behind those
  small adapter boundaries.

  Constants
    MEMO_SET_NAME_PREFIX : hex prefix for the Memo "set name" action (0x6d01)
    MAX_NAME_BYTES       : maximum allowed name length (77 bytes per memo.sv)
*/

const MemoAction = require('./memo-action')

const MEMO_SET_NAME_PREFIX = '6d01'
const MAX_NAME_BYTES = 77

class MemoSetName extends MemoAction {
  constructor (deps = {}) {
    super(deps)
    this.profiles = deps.profiles
    this.prefix = MEMO_SET_NAME_PREFIX
    this.walletRequiredMsg = 'Memo set name requires a wallet.'
    this.lengthMessage = `Name is too long. Maximum is ${MAX_NAME_BYTES} bytes.`
    this.emptyMessage = 'Name must not be empty.'
    this.lengthCode = 'name_length'
    this.validationCode = 'name_validation'
  }

  // A name is over-length when it exceeds the byte limit.
  isTooLong (name) {
    return Buffer.byteLength(name, 'utf8') > MAX_NAME_BYTES
  }

  // Compose and broadcast a Memo set-name transaction for the given name.
  // Resolves with the transaction id, or rejects with a typed error.
  async setName (name) {
    return this.broadcast(name)
  }

  // Record the new name on the injected profile store when one is present.
  reflect (txid, name) {
    if (this.profiles && typeof this.profiles.setName === 'function') {
      this.profiles.setName(this.wallet.walletInfo.cashAddress, name)
    }
  }
}

MemoSetName.MEMO_SET_NAME_PREFIX = MEMO_SET_NAME_PREFIX
MemoSetName.MAX_NAME_BYTES = MAX_NAME_BYTES

module.exports = MemoSetName
