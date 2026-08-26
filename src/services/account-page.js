/*
  Account Page behavior: show the authenticated user's display name and offer
  a way to navigate to the Set Name page.

  This is the testable controller behind the React "Account" page. It reads
  the current name from an injected profile store and exposes a Set Name
  button that navigates to the set-name path.

  The wallet, profile store, and navigate concerns are injected so this module
  stays free of UI/network concerns; environmentally unsuitable I/O lives behind
  those small adapter boundaries.
*/

const SET_NAME_PATH = '/memo/set-name'
const ACCOUNT_PATH = '/account'

class AccountPage {
  constructor (deps = {}) {
    this.wallet = deps.wallet || null
    this.profiles = deps.profiles || null
    this.navigate = deps.navigate || (() => {})
  }

  // The address of the authenticated wallet, or null when no wallet is present.
  getAddress () {
    return this.wallet?.walletInfo?.cashAddress || null
  }

  // The current display name for the authenticated address. Falls back to null
  // when no wallet, profile store, or stored name exists.
  getName () {
    const address = this.getAddress()
    if (!address || !this.profiles || typeof this.profiles.getName !== 'function') {
      return null
    }
    return this.profiles.getName(address)
  }

  // Whether the account page exposes a Set Name button.
  hasSetNameButton () {
    return true
  }

  // Click the Set Name button: navigate to the set-name page.
  clickSetName () {
    this.navigate(SET_NAME_PATH)
  }
}

AccountPage.SET_NAME_PATH = SET_NAME_PATH
AccountPage.ACCOUNT_PATH = ACCOUNT_PATH

module.exports = AccountPage
