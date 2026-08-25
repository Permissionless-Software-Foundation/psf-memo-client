/*
  Project step handlers for the psf-memo-client acceptance pipeline.

  These handlers connect Gherkin step text to the real project behavior in
  src/services/memo-post.js, driving it through small injected adapters (a fake
  wallet and a fake feed) so the acceptance run is deterministic and offline.

  Regex matching with placeholder-name capture is the default style: a single
  handler pattern captures the placeholder name (e.g. <message>) and fetches
  the example value from the scenario example store.
*/

'use strict'

const MemoPost = require('../../src/services/memo-post')

const MEMO_POST_PREFIX = MemoPost.MEMO_POST_PREFIX

// A fake wallet exposing the minimal-slp-wallet adapter surface the app uses.
function makeWallet (address) {
  const wallet = {
    walletInfo: { cashAddress: address },
    utxos: [],
    broadcasts: [],
    getUtxos: async function () {
      return this.utxos
    },
    sendOpReturn: async function (walletInfo, bchUtxos, msg, prefix) {
      this.broadcasts.push({ walletInfo, bchUtxos, msg, prefix })
      return 'aa'.repeat(32)
    }
  }
  return wallet
}

// A fake feed reflecting posts added to the recent posts feed.
function makeFeed () {
  const posts = []
  return {
    posts,
    addPost: (post) => posts.push(post)
  }
}

// Fresh world/state object for a single scenario execution.
function createWorld () {
  const wallet = makeWallet('')
  const feed = makeFeed()
  const memoPost = new MemoPost({ wallet, feed })
  return {
    wallet,
    feed,
    memoPost,
    message: null,
    submitted: null
  }
}

// Handler registry. Each entry: { pattern, run }.
// run receives (match, exampleStore, world).
const handlers = [
  {
    name: 'wallet authenticated for address',
    pattern: /^a wallet authenticated for the address (.+)$/,
    run (m, example, world) {
      world.wallet.walletInfo.cashAddress = m[1].trim()
    }
  },
  {
    name: 'wallet has spendable output',
    pattern: /^the wallet has a spendable output to pay the transaction fee$/,
    run (m, example, world) {
      world.wallet.utxos = [{ txid: 'utxo-for-fee', value: 100000 }]
    }
  },
  {
    name: 'viewing recent posts feed',
    pattern: /^I am viewing the recent posts feed$/,
    run () {}
  },
  {
    name: 'compose memo text',
    pattern: /^I compose a memo with the text "<([A-Za-z0-9_]+)>"$/,
    run (m, example, world) {
      const param = m[1]
      if (!(param in example)) {
        throw new Error(`Missing example value for "${param}"`)
      }
      world.message = example[param]
    }
  },
  {
    name: 'submit memo',
    pattern: /^I submit the memo$/,
    async run (m, example, world) {
      world.submitted = { error: null, txid: null }
      try {
        world.submitted.txid = await world.memoPost.post(world.message)
      } catch (err) {
        world.submitted.error = err
      }
    }
  },
  {
    name: 'broadcasts OP_RETURN with Memo post prefix',
    pattern: /^the wallet broadcasts an OP_RETURN transaction with the Memo post prefix$/,
    run (m, example, world) {
      const broadcasts = world.wallet.broadcasts
      if (!broadcasts.length) {
        throw new Error('No OP_RETURN transaction was broadcast.')
      }
      const last = broadcasts[broadcasts.length - 1]
      if (last.prefix !== MEMO_POST_PREFIX) {
        throw new Error(`Expected Memo post prefix ${MEMO_POST_PREFIX}, got "${last.prefix}".`)
      }
      if (last.msg !== world.message) {
        throw new Error('Broadcast message text did not match the composed memo.')
      }
    }
  },
  {
    name: 'feed shows new post from my address',
    pattern: /^the feed shows a new post from my address with the text "<([A-Za-z0-9_]+)>"$/,
    run (m, example, world) {
      const param = m[1]
      const expectedText = example[param]
      const myAddress = world.wallet.walletInfo.cashAddress
      const found = world.feed.posts.find(
        (p) => p.text === expectedText && p.address === myAddress
      )
      if (!found) {
        throw new Error(`Feed does not show the new post with text "${expectedText}".`)
      }
    }
  },
  {
    name: 'app shows validation/length error',
    pattern: /^the app shows a (validation|length) error$/,
    run (m, example, world) {
      const kind = m[1]
      const expectedCode = kind === 'validation' ? 'memo_validation' : 'memo_length'
      if (!world.submitted || !world.submitted.error) {
        throw new Error(`Expected a ${kind} error but the submit succeeded.`)
      }
      if (world.submitted.error.code !== expectedCode) {
        throw new Error(`Expected ${expectedCode}, got ${world.submitted.error.code}.`)
      }
    }
  },
  {
    name: 'wallet does not broadcast any transaction',
    pattern: /^the wallet does not broadcast any transaction$/,
    run (m, example, world) {
      if (world.wallet.broadcasts.length !== 0) {
        throw new Error('A transaction was broadcast when none was expected.')
      }
    }
  }
]

// Route a single step to its handler. Throws on unsupported step text.
async function handleStep (step, example, world) {
  for (const handler of handlers) {
    const match = handler.pattern.exec(step.text)
    if (match) {
      await handler.run(match, example, world)
      return
    }
  }
  throw new Error(`Unsupported step: ${step.keyword} ${step.text}`)
}

module.exports = { createWorld, handleStep }
