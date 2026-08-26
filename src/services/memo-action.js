/*
  Shared base for Memo protocol actions that broadcast an OP_RETURN
  transaction through a wallet and reflect the result on an injected store.

  Subclasses supply the protocol-specific pieces:
    prefix            - hex protocol prefix (e.g. 0x6d02 for a post)
    walletRequiredMsg - error message when no wallet is present
    lengthMessage     - error text for an over-length value
    emptyMessage      - error text for an empty value
    lengthCode        - error code for an over-length value
    validationCode    - error code for an empty value
    isTooLong(value)  - true when the value exceeds the action's limit
    reflect(txid, value) - record the broadcast result on the injected store
*/

class MemoAction {
  constructor (deps = {}) {
    this.wallet = deps.wallet
  }

  // Validate a candidate value.
  // Returns { ok: true } or { ok: false, type: 'validation' | 'length' }.
  validate (value) {
    if (typeof value !== 'string' || value.trim().length === 0) {
      return { ok: false, type: 'validation' }
    }

    if (this.isTooLong(value)) {
      return { ok: false, type: 'length' }
    }

    return { ok: true }
  }

  // Compose and broadcast the action for the given value.
  // Resolves with the transaction id, or rejects with a typed error.
  async broadcast (value) {
    const check = this.validate(value)
    this._throwIfInvalid(check)

    if (!this.wallet) {
      throw new Error(this.walletRequiredMsg)
    }

    // Refresh the wallet's spendable UTXO store so the broadcast has inputs.
    await this.wallet.getUtxos()

    // The wallet's public sendOpReturn(msg, prefix) resolves walletInfo and its
    // own spendable UTXOs internally, so only the value and prefix are passed.
    const txid = await this.wallet.sendOpReturn(value, this.prefix)

    // Reflect the result on the injected store once broadcast succeeds.
    this.reflect(txid, value)

    return txid
  }

  // Throw the appropriate typed error when a value fails validation.
  _throwIfInvalid (check) {
    if (check.ok) return

    const err = new Error(
      check.type === 'length' ? this.lengthMessage : this.emptyMessage
    )
    err.code = check.type === 'length' ? this.lengthCode : this.validationCode
    throw err
  }
}

module.exports = MemoAction
