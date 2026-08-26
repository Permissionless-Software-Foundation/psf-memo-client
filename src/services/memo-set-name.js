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
  static config = {
    prefix: MEMO_SET_NAME_PREFIX,
    walletRequiredMsg: 'Memo set name requires a wallet.',
    lengthMessage: `Name is too long. Maximum is ${MAX_NAME_BYTES} bytes.`,
    emptyMessage: 'Name must not be empty.',
    lengthCode: 'name_length',
    validationCode: 'name_validation'
  }

  constructor (deps = {}) {
    super(deps)
    this.profiles = deps.profiles
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

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-08-26T03:32:46.747Z","module_hash":"7df00da6f6ac452ed14c70ec73f07ac6e7a9c9e50f105f3fb3fcb969e409b567","functions":[{"id":"func/MemoSetName.constructor","name":"MemoSetName.constructor","line":34,"end_line":37,"hash":"9407b43605444074011b1da595c9d53356352c72b0d847e00365d79ad705663a"},{"id":"func/MemoSetName.isTooLong","name":"MemoSetName.isTooLong","line":40,"end_line":42,"hash":"c19efae68fd1faed8e63e106a9dbad10872853879870fe49df16968f1c8a3641"},{"id":"func/MemoSetName.setName","name":"MemoSetName.setName","line":46,"end_line":48,"hash":"9226b63b60a573a9dfb5c7bbb1449d1a138f30b648642d345c5162d012a2cfc0"},{"id":"func/MemoSetName.reflect","name":"MemoSetName.reflect","line":51,"end_line":55,"hash":"3cfed5e8ec7acf592e07e67659b4d8e075d98bbddf79755b8a31b76fd1ae5696"}]}
// mutate4javascript-manifest-end
