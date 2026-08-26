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
    this.broadcastError = null
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
  // feed. On failure, record the typed error and stay on the page. Resolves
  // with a result object.
  async submit () {
    this.posting = true
    this.submitError = null
    this.broadcastError = null

    try {
      if (!this.memoPost) {
        throw new Error('New post requires a memo post handler.')
      }

      const txid = await this.memoPost.post(this.input)
      this.navigate(RECENT_FEED_PATH)
      this.posting = false
      return { ok: true, txid }
    } catch (err) {
      return this._handleSubmitFailure(err)
    }
  }

  // Classify a submit failure, record the typed state, and return the failure
  // result. Local validation failures set submitError; broadcast or handler
  // failures surface the real error message via broadcastError.
  _handleSubmitFailure (err) {
    if (err.code === 'memo_validation' || err.code === 'memo_length') {
      this.submitError = err.code
    } else {
      this.broadcastError = err.message || String(err)
      this.submitError = 'broadcast'
    }
    this.posting = false
    return { ok: false, error: this.submitError, message: this.broadcastError }
  }
}

NewPostPage.NEW_POST_PATH = NEW_POST_PATH
NewPostPage.RECENT_FEED_PATH = RECENT_FEED_PATH

module.exports = NewPostPage

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-08-26T00:39:54.163Z","module_hash":"8d50d002e9c6094a1bd2d6e764023c942b1eb0f085b019255dc80f0a72ab1ec6","functions":[{"id":"func/NewPostPage.constructor","name":"NewPostPage.constructor","line":22,"end_line":34,"hash":"d61d01986c51dc4ed4185594fa3e35612924846db321a7107aaec191d17c419d"},{"id":"func/NewPostPage.addMenuLink","name":"NewPostPage.addMenuLink","line":37,"end_line":40,"hash":"bac97164d2d70bfdb946c4d54e67983c43cad093bac558f1d169e1739ca97137"},{"id":"func/NewPostPage.hasMenuLink","name":"NewPostPage.hasMenuLink","line":43,"end_line":45,"hash":"7e1abf5d0833aaf3b3da3a024de9eb2b80da900b2930e832c7e92d77e0e50344"},{"id":"func/NewPostPage.setInput","name":"NewPostPage.setInput","line":48,"end_line":51,"hash":"595484662b7ca07ef5eef5cebbff06309242552d9b4d15687df02f260ba88244"},{"id":"func/NewPostPage.remainingCount","name":"NewPostPage.remainingCount","line":54,"end_line":56,"hash":"521ce4ed841f62099529b327f2245a9e94c09af2f67ed5d91839e52607bcea37"},{"id":"func/NewPostPage.submit","name":"NewPostPage.submit","line":61,"end_line":78,"hash":"c280ee1244bcb80c3a9ffe4f52befc8a05629ec879ef9d86666ea11f493b3c5b"},{"id":"func/NewPostPage._handleSubmitFailure","name":"NewPostPage._handleSubmitFailure","line":83,"end_line":92,"hash":"b13d8cd6b48b1f42d72e0031cabcaa00bb78b813f42250517d711f0d6fb23126"}]}
// mutate4javascript-manifest-end
