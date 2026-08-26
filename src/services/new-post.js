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

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-08-26T00:07:51.843Z","module_hash":"469dfd90342f6bcacf5b89ed819620663e221e20832f6936c35c46f9681ebfdc","functions":[{"id":"func/NewPostPage.constructor","name":"NewPostPage.constructor","line":22,"end_line":33,"hash":"7c957fbaa2b8d4adb62c1bbf240749243696a68e71e7896aefdbb68437432cd8"},{"id":"func/NewPostPage.addMenuLink","name":"NewPostPage.addMenuLink","line":36,"end_line":39,"hash":"bac97164d2d70bfdb946c4d54e67983c43cad093bac558f1d169e1739ca97137"},{"id":"func/NewPostPage.hasMenuLink","name":"NewPostPage.hasMenuLink","line":42,"end_line":44,"hash":"7e1abf5d0833aaf3b3da3a024de9eb2b80da900b2930e832c7e92d77e0e50344"},{"id":"func/NewPostPage.setInput","name":"NewPostPage.setInput","line":47,"end_line":50,"hash":"595484662b7ca07ef5eef5cebbff06309242552d9b4d15687df02f260ba88244"},{"id":"func/NewPostPage.remainingCount","name":"NewPostPage.remainingCount","line":53,"end_line":55,"hash":"521ce4ed841f62099529b327f2245a9e94c09af2f67ed5d91839e52607bcea37"},{"id":"func/NewPostPage.submit","name":"NewPostPage.submit","line":59,"end_line":77,"hash":"f4ce743f5a4bb139615086165b25173641a9388af16b7527f2db243a1c6b596c"}]}
// mutate4javascript-manifest-end
