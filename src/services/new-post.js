/*
  New Post Page behavior: compose and post a Memo, with a character counter
  that counts down from the memo limit.

  This is the testable controller behind the React "New Post" page. It wraps
  the Memo post behavior (src/services/memo-post.js) and adds page-level
  concerns: holding the current input, computing the remaining character count,
  surfacing validation/length errors, and navigating to the recent feed after a
  successful post.

  The memoPost and navigate concerns are injected so this module stays free of
  UI/network concerns; environmentally unsuitable I/O lives behind those small
  adapter boundaries.
*/

const MemoPost = require('./memo-post')

const NEW_POST_PATH = '/posts/new'
const RECENT_FEED_PATH = '/posts/recent'

class NewPostPage {
  constructor (deps = {}) {
    this.memoPost = deps.memoPost || null
    this.navigate = deps.navigate || (() => {})
    this.menuLinks = deps.menuLinks || []

    this.input = ''
    this.submitError = null
    this.posting = false

    // The navigation menu links to the new post page.
    this.addMenuLink(NEW_POST_PATH)
  }

  // Record a navigation menu link offered by the app.
  addMenuLink (path) {
    if (!this.menuLinks.includes(path)) this.menuLinks.push(path)
    return this
  }

  // Whether the navigation menu exposes a link to the given path.
  hasMenuLink (path) {
    return this.menuLinks.includes(path)
  }

  // Set the draft memo text and update the counter.
  setInput (text) {
    this.input = typeof text === 'string' ? text : ''
    return this
  }

  // Characters remaining before the memo limit is reached.
  remainingCount () {
    return MemoPost.MAX_MEMO_CHARS - this.input.length
  }

  // Validate and post the current draft. On success, navigate to the recent
  // feed. On failure, record the typed error. Resolves with a result object.
  async submit () {
    this.posting = true
    this.submitError = null

    try {
      if (!this.memoPost) {
        throw new Error('New post requires a memo post handler.')
      }

      const txid = await this.memoPost.post(this.input)
      this.navigate(RECENT_FEED_PATH)
      this.posting = false
      return { ok: true, txid }
    } catch (err) {
      this.submitError = err.code || 'memo_validation'
      this.posting = false
      return { ok: false, error: this.submitError }
    }
  }
}

NewPostPage.NEW_POST_PATH = NEW_POST_PATH
NewPostPage.RECENT_FEED_PATH = RECENT_FEED_PATH

module.exports = NewPostPage
