/*
  Simple in-memory profile store for the current session.

  Holds display names and other profile data indexed by BCH cash address. This
  keeps the Set Name and Account pages in sync immediately after a name is
  broadcast, without waiting for the memo-db indexer to crawl the transaction.

  In a production app this would be backed by memo-db or persistent storage;
  for the current SPA it is a small shared adapter boundary.
*/

class Profiles {
  constructor () {
    this.names = new Map()
  }

  setName (addr, name) {
    if (!addr) return
    this.names.set(addr, name)
  }

  getName (addr) {
    if (!addr) return null
    return this.names.get(addr) || null
  }
}

module.exports = Profiles
