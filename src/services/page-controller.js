/*
  Shared base for page controllers that compose and submit a single action,
  surface validation/broadcast errors, and navigate on success.

  Subclasses supply the page-specific pieces:
    successPath      - path to navigate to on success
    validationCodes  - error codes that represent local validation failures
    _setBusy(value)  - set the page's in-flight flag
    _perform(input)  - run the action for the current input, resolving with txid
*/

class PageController {
  constructor (deps = {}) {
    this.navigate = deps.navigate || (() => {})
    this.input = ''
    this.submitError = null
    this.broadcastError = null
  }

  // Set the draft input.
  setInput (text) {
    this.input = typeof text === 'string' ? text : ''
    return this
  }

  // Validate and submit the current input. On success, navigate to the success
  // path. On failure, record the typed error and stay on the page. Resolves
  // with a result object.
  async submit () {
    this._setBusy(true)
    this.submitError = null
    this.broadcastError = null

    try {
      const txid = await this._perform(this.input)
      this.navigate(this.successPath)
      this._setBusy(false)
      return { ok: true, txid }
    } catch (err) {
      return this._handleSubmitFailure(err)
    }
  }

  // Classify a submit failure, record the typed state, and return the failure
  // result. Local validation failures set submitError; broadcast or handler
  // failures surface the real error message via broadcastError.
  _handleSubmitFailure (err) {
    if (this.validationCodes.includes(err.code)) {
      this.submitError = err.code
    } else {
      this.broadcastError = err.message || String(err)
      this.submitError = 'broadcast'
    }
    this._setBusy(false)
    return { ok: false, error: this.submitError, message: this.broadcastError }
  }
}

module.exports = PageController
