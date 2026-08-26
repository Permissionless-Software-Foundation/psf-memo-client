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

const PageController = require('./page-controller')
const MemoSetName = require('./memo-set-name')
const { byteLength } = require('./utf8')

const SET_NAME_PATH = '/memo/set-name'
const ACCOUNT_PATH = '/account'

class SetNamePage extends PageController {
  constructor (deps = {}) {
    super(deps)
    this.memoSetName = deps.memoSetName || null
    this.settingName = false
    this.successPath = ACCOUNT_PATH
    this.validationCodes = ['name_validation', 'name_length']
  }

  // Bytes remaining before the name limit is reached.
  remainingCount () {
    return MemoSetName.MAX_NAME_BYTES - byteLength(this.input)
  }

  // Set the in-flight setting-name flag.
  _setBusy (value) {
    this.settingName = value
  }

  // Run the memo set-name action for the current input.
  async _perform (input) {
    if (!this.memoSetName) {
      throw new Error('Set name requires a memo set-name handler.')
    }
    return this.memoSetName.setName(input)
  }
}

SetNamePage.SET_NAME_PATH = SET_NAME_PATH
SetNamePage.ACCOUNT_PATH = ACCOUNT_PATH

module.exports = SetNamePage

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-08-26T02:57:01.182Z","module_hash":"398fed9fb3ec02fb64027d97c4d0110f667014fd86102413e03c92b26cdbb03c","functions":[{"id":"func/SetNamePage.constructor","name":"SetNamePage.constructor","line":23,"end_line":29,"hash":"4ce053830f485ce8a0fba4495cd85fc5e2cac3c9db88b5cbf1e8c66a371a9752"},{"id":"func/SetNamePage.remainingCount","name":"SetNamePage.remainingCount","line":32,"end_line":34,"hash":"a6aac7215cf5bcbbfbab23f8edfa3c665bcf0ddf6db1d83601c9c23b9de56ad6"},{"id":"func/SetNamePage._setBusy","name":"SetNamePage._setBusy","line":37,"end_line":39,"hash":"a0947ed899e0def1f6ae243197d409f5603c4820467f0e0fafdcb4deadb3a92b"},{"id":"func/SetNamePage._perform","name":"SetNamePage._perform","line":42,"end_line":47,"hash":"8614f25b06dcb21b81ab94b4a4611c5e3719ebf4ed7ab13e13976ab0d5938b27"}]}
// mutate4javascript-manifest-end
