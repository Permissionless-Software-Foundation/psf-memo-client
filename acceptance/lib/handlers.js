/*
  Project step handlers for the psf-memo-client acceptance pipeline.

  These handlers connect Gherkin step text to real project behavior
  (src/services/memo-post.js and src/services/new-post.js), driving them
  through small injected adapters (a fake wallet, a fake feed, and a fake
  navigator) so the acceptance run is deterministic and offline.

  Regex matching with placeholder-name capture is the default style: a single
  handler pattern captures the placeholder name (e.g. <message>) and fetches
  the example value from the scenario example store.

  The handlers serve both specs/post-memo.feature and specs/memo-new.feature,
  whose wording differs but which share the same underlying Memo post behavior.
*/

'use strict'

const MemoPost = require('../../src/services/memo-post')
const NewPostPage = require('../../src/services/new-post')

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
      // Record the broadcast attempt, then fail if configured to do so.
      this.broadcasts.push({ walletInfo, bchUtxos, msg, prefix })
      if (this.failWith) throw new Error(this.failWith)
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
  const world = {
    wallet,
    feed,
    memoPost,
    currentPath: null,
    menuOpen: false
  }

  // The New Post Page controller wraps the memo post behavior. Its navigate
  // adapter updates the world's current path so navigation can be asserted.
  world.newPage = new NewPostPage({
    memoPost,
    navigate: (path) => { world.currentPath = path },
    menuLinks: []
  })

  return world
}

// Handler registry. Each entry: { pattern, run }.
// run receives (match, exampleStore, world, step).
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
    pattern: /^the wallet has (?:a )?spendable output to pay the transaction fee$/,
    run (m, example, world) {
      world.wallet.utxos = [{ txid: 'utxo-for-fee', value: 100000 }]
    }
  },
  {
    name: 'viewing recent posts feed',
    pattern: /^I am viewing the recent posts feed$/,
    run (m, example, world) {
      world.currentPath = NewPostPage.RECENT_FEED_PATH
    }
  },
  {
    name: 'wallet fails to broadcast with error',
    pattern: /^the wallet fails to broadcast with the error "<([A-Za-z0-9_]+)>"$/,
    run (m, example, world) {
      const param = m[1]
      if (!(param in example)) {
        throw new Error(`Missing example value for "${param}"`)
      }
      world.wallet.failWith = example[param]
    }
  },
  {
    name: 'navigate to path',
    pattern: /^I navigate to the path (.+)$/,
    run (m, example, world, step) {
      const target = m[1].trim()
      if (step.keyword === 'Then') {
        if (world.currentPath !== target) {
          throw new Error(`Expected to be on path ${target}, but current path is ${world.currentPath}.`)
        }
      } else {
        world.currentPath = target
      }
    }
  },
  {
    name: 'remain on path',
    pattern: /^I remain on the path (.+)$/,
    run (m, example, world) {
      const target = m[1].trim()
      if (world.currentPath !== target) {
        throw new Error(`Expected to remain on path ${target}, but current path is ${world.currentPath}.`)
      }
    }
  },
  {
    name: 'open navigation menu',
    pattern: /^I open the navigation menu$/,
    run (m, example, world) {
      world.menuOpen = true
    }
  },
  {
    name: 'menu shows link to path',
    pattern: /^the menu shows a link to the path (.+)$/,
    run (m, example, world) {
      const target = m[1].trim()
      if (!world.newPage.hasMenuLink(target)) {
        throw new Error(`Navigation menu does not link to ${target}.`)
      }
    }
  },
  {
    name: 'compose/type memo text',
    pattern: /^I (?:compose|type) a memo with the text "<([A-Za-z0-9_]+)>"$/,
    run (m, example, world) {
      const param = m[1]
      if (!(param in example)) {
        throw new Error(`Missing example value for "${param}"`)
      }
      world.newPage.setInput(example[param])
    }
  },
  {
    name: 'submit/click post',
    pattern: /^I (?:submit the memo|click the post button)$/,
    async run (m, example, world) {
      await world.newPage.submit()
    }
  },
  {
    name: 'broadcasts/attempts OP_RETURN with Memo post prefix',
    pattern: /^(?:the wallet|the app) (?:broadcasts|attempts to broadcast) an OP_RETURN transaction with the Memo post prefix$/,
    run (m, example, world) {
      const broadcasts = world.wallet.broadcasts
      if (!broadcasts.length) {
        throw new Error('No OP_RETURN transaction was broadcast.')
      }
      const last = broadcasts[broadcasts.length - 1]
      if (last.prefix !== MEMO_POST_PREFIX) {
        throw new Error(`Expected Memo post prefix ${MEMO_POST_PREFIX}, got "${last.prefix}".`)
      }
      if (last.msg !== world.newPage.input) {
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
    name: 'page shows error containing text',
    pattern: /^the new post page shows an error containing "<([A-Za-z0-9_]+)>"$/,
    run (m, example, world) {
      const param = m[1]
      const expected = example[param]
      const actual = world.newPage.broadcastError || ''
      if (!actual.includes(expected)) {
        throw new Error(`Expected an error containing "${expected}", got "${actual}".`)
      }
    }
  },
  {
    name: 'page shows validation/length error',
    pattern: /^the (?:app|new post page) shows a (validation|length) error$/,
    run (m, example, world) {
      const kind = m[1]
      const expectedCode = kind === 'validation' ? 'memo_validation' : 'memo_length'
      if (world.newPage.submitError !== expectedCode) {
        throw new Error(`Expected ${expectedCode}, got ${world.newPage.submitError}.`)
      }
    }
  },
  {
    name: 'remaining character count',
    pattern: /^the new post page shows a remaining character count of <([A-Za-z0-9_]+)>$/,
    run (m, example, world) {
      const param = m[1]
      const expected = parseInt(example[param], 10)
      if (Number.isNaN(expected)) {
        throw new Error(`Invalid expected count for "${param}".`)
      }
      const actual = world.newPage.remainingCount()
      if (actual !== expected) {
        throw new Error(`Expected ${expected} remaining characters, got ${actual}.`)
      }
    }
  },
  {
    name: 'app does not broadcast any transaction',
    pattern: /^(?:the wallet|the app) does not broadcast any transaction$/,
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
      await handler.run(match, example, world, step)
      return
    }
  }
  throw new Error(`Unsupported step: ${step.keyword} ${step.text}`)
}

module.exports = { createWorld, handleStep }
