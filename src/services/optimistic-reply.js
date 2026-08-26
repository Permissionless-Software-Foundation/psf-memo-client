'use strict'

// Build the optimistic reply object used by the reply form for immediate
// thread rendering before the thread is refreshed from the network. This is a
// pure data-shaping function so the reply object shape is unit-testable and
// the React form stays a thin adapter.
function buildOptimisticReply ({ txid, addr, text, seen, blockHeight, displayName }) {
  return {
    txid,
    addr,
    text,
    seen,
    blockHeight,
    replyCount: 0,
    replies: [],
    profile: displayName ? { name: displayName } : undefined
  }
}

module.exports = { buildOptimisticReply }
