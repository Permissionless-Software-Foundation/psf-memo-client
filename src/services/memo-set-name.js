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

const MEMO_SET_NAME_PREFIX = '6d01'
const MAX_NAME_BYTES = 77

class MemoSetName {
  constructor (deps = {}) {
    this.wallet = deps.wallet
    this.profiles = deps.profiles
  }

  // Validate a candidate name.
  // Returns { ok: true } or { ok: false, type: 'validation' | 'length' }.
  validate (name) {
    if (typeof name !== 'string' || name.trim().length === 0) {
      return { ok: false, type: 'validation' }
    }

    if (Buffer.byteLength(name, 'utf8') > MAX_NAME_BYTES) {
      return { ok: false, type: 'length' }
    }

    return { ok: true }
  }

  // Compose and broadcast a Memo set-name transaction for the given name.
  // Resolves with the transaction id, or rejects with a typed error.
  async setName (name) {
    const check = this.validate(name)
    this._throwIfInvalid(check)

    if (!this.wallet) {
      throw new Error('Memo set name requires a wallet.')
    }

    // Refresh the wallet's spendable UTXO store so the broadcast has inputs.
    await this.wallet.getUtxos()

    const txid = await this.wallet.sendOpReturn(name, MEMO_SET_NAME_PREFIX)

    // Reflect the new name in the injected profile store once broadcast succeeds.
    this._reflectName(name)

    return txid
  }

  // Throw the appropriate typed error when a name fails validation.
  _throwIfInvalid (check) {
    if (check.ok) return

    const err = new Error(
      check.type === 'length'
        ? `Name is too long. Maximum is ${MAX_NAME_BYTES} bytes.`
        : 'Name must not be empty.'
    )
    err.code = check.type === 'length' ? 'name_length' : 'name_validation'
    throw err
  }

  // Record the new name on the injected profile store when one is present.
  _reflectName (name) {
    if (this.profiles && typeof this.profiles.setName === 'function') {
      this.profiles.setName(this.wallet.walletInfo.cashAddress, name)
    }
  }
}

MemoSetName.MEMO_SET_NAME_PREFIX = MEMO_SET_NAME_PREFIX
MemoSetName.MAX_NAME_BYTES = MAX_NAME_BYTES

module.exports = MemoSetName
