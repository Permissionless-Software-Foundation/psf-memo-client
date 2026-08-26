/*
  Set Name Page behavior: compose and broadcast a Memo display name, with a
  byte counter that counts down from the name limit.

  This is the testable controller behind the React "Set Name" page. It wraps
  the Memo set-name behavior (src/services/memo-set-name.js) and adds page-level
  concerns: holding the current input, computing the remaining byte count,
  surfacing validation/length errors, and navigating to the account page after
  a successful broadcast.

  The memoSetName and navigate concerns are injected so this module stays free
  of UI/network concerns; environmentally unsuitable I/O lives behind those small
  adapter boundaries.
*/

const MemoSetName = require('./memo-set-name')

const SET_NAME_PATH = '/memo/set-name'
const ACCOUNT_PATH = '/account'

class SetNamePage {
  constructor (deps = {}) {
    this.memoSetName = deps.memoSetName || null
    this.navigate = deps.navigate || (() => {})

    this.input = ''
    this.submitError = null
    this.broadcastError = null
    this.settingName = false
  }

  // Set the draft name and update the counter.
  setInput (text) {
    this.input = typeof text === 'string' ? text : ''
    return this
  }

  // Bytes remaining before the name limit is reached.
  remainingCount () {
    return MemoSetName.MAX_NAME_BYTES - Buffer.byteLength(this.input, 'utf8')
  }

  // Validate and broadcast the current draft name. On success, navigate to the
  // account page. On failure, record the typed error and stay on the page.
  // Resolves with a result object.
  async submit () {
    this.settingName = true
    this.submitError = null
    this.broadcastError = null

    try {
      if (!this.memoSetName) {
        throw new Error('Set name requires a memo set-name handler.')
      }

      const txid = await this.memoSetName.setName(this.input)
      this.navigate(ACCOUNT_PATH)
      this.settingName = false
      return { ok: true, txid }
    } catch (err) {
      return this._handleSubmitFailure(err)
    }
  }

  // Classify a submit failure, record the typed state, and return the failure
  // result. Local validation failures set submitError; broadcast or handler
  // failures surface the real error message via broadcastError.
  _handleSubmitFailure (err) {
    if (err.code === 'name_validation' || err.code === 'name_length') {
      this.submitError = err.code
    } else {
      this.broadcastError = err.message || String(err)
      this.submitError = 'broadcast'
    }
    this.settingName = false
    return { ok: false, error: this.submitError, message: this.broadcastError }
  }
}

SetNamePage.SET_NAME_PATH = SET_NAME_PATH
SetNamePage.ACCOUNT_PATH = ACCOUNT_PATH

module.exports = SetNamePage
