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
    return MemoSetName.MAX_NAME_BYTES - Buffer.byteLength(this.input, 'utf8')
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
