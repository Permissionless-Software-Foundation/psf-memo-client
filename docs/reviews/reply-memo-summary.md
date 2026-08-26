# Architectural Review Summary — reply-memo

## Task and commits reviewed
- Task: `reply-memo`
- Reviewed the merged branch ending at `b4508e8909` (refactorer), which carried:
  - `8294b4d` — specifier Reply to a Memo Gherkin spec (`specs/reply-memo.feature`)
  - `230618d` — specifier browser fix: replace Node-only `Buffer.byteLength` with a
    TextEncoder-based UTF-8 byte helper (`src/services/utf8.js`) so the Set Name
    byte counter works in the browser
  - `d33fda8` — coder implementation (`MemoReply`, `ReplyThreadPage`, `utf8`,
    acceptance handlers)
  - `b4508e8` — refactorer extraction of reply tests into the shared helpers
- Merged into `swarmforge-architect` (merge commit `c0e4eba`) and processed as a batch.

## Architectural findings and fixes applied
Reviewed UI/Core separation, dependency rule, information hiding/encapsulation, and
local code quality.

1. **UI/Core separation (good).** All reply behavior lives in testable services
   (`memo-reply.js`, `reply-thread-page.js`) free of UI/IO; the wallet and thread
   are injected behind small adapter boundaries. `utf8.js` is a shared, browser-safe
   byte-length helper that fixes a real browser bug (Node `Buffer` is unavailable in
   the browser) and is reused by both the Set Name and Reply slices.
2. **Dependency rule (good).** `memo-reply` depends inward on `memo-action` and
   `utf8`; `reply-thread-page` depends inward on `page-controller`, `memo-reply`, and
   `utf8`. No low-level module reaches toward IO.
3. **Information hiding (good).** `MemoReply` extends `MemoAction` and supplies the
   reply-specific `config`, `isTooLong`, and `reflect`; it overrides `reply()` to
   build the raw wire payload (32-byte parent txid + UTF-8 text) because the reply
   wire format differs from the plain-value broadcast. `ReplyThreadPage` extends
   `PageController` and supplies `successPath`, `validationCodes`, `_setBusy`, and
   `_perform`, plus a `setParent` for nested replies. The `hexToBytes`/`buildReplyPayload`
   helpers are module-private, keeping the wire format hidden.
4. **Test refactoring (good).** The refactorer extended `memo-action-helpers` (extra
   `extraArgs` for the parent txid, `byteBased` multi-byte tests, `assertBroadcastMsg`)
   and added `registerPageSubmitTests` to `page-controller-helpers`, so the reply
   tests reuse the shared registrars instead of duplicating them. Helpers stay
   separate from `.test.js` files.
5. **Fix applied — mutation survivors (2).** The language mutation tool flagged two
   `|| -> &&` survivors that were equivalent only because of test gaps:
   - `memo-reply` `hexToBytes`: the 64-character length check was unobservable because
     the only invalid-txid test used a non-hex string that the hex-parse loop also
     rejected. Added a test that a wrong-length but valid-hex txid is rejected with
     the length error, killing the mutation.
   - `reply-thread-page` constructor `successPath`: the page was never constructed
     with a `successPath`, so the `|| -> &&` wiring was unobservable. Added a test
     that a configured success path is honored (navigates on success), killing the
     mutation.
   Both tests are behavior-preserving and close real coverage gaps.

## Verification results
- **Unit (`node --test`):** 86/86 pass (was 84; +2 survivor-killing tests).
- **Property (`node --test test/property/*.test.js`):** 13/13 pass.
- **Acceptance (normal):** `memo-new`, `post-memo`, `set-name`, and `reply-memo`
  generated suites all pass (4 suites).
- **Mutation (`mutate4javascript`, `--max-workers 8`, `--mutate-all`):**
  - memo-action 5/0/0, memo-post 2/0/0, memo-set-name 2/0/0, memo-reply 8/0/0,
    page-controller 7/0/0, new-post 4/0/0, set-name-page 3/0/0, reply-thread-page
    5/0/0, account-page 7/0/0, profiles 1/0/0, utf8 0/0/0 (no mutation sites).
  - All testable core modules fully kill; no survivors, no uncovered. The two
    `|| -> &&` survivors were killed by the added tests.
- **DRY (`dry4javascript src` and `dry4javascript test`):** no duplicate candidates
  in either tree.
- **Gherkin acceptance mutation (soft):**
  - `reply-memo.feature` — 13 executed, **5 killed, 8 survived**, 0 errors.
  - `memo-new.feature` — 14 executed, **4 killed, 10 survived**, 0 errors.
  - `post-memo.feature` — 5 executed, **0 killed, 5 survived**, 0 errors.
  - `set-name.feature` — 13 executed, **6 killed, 7 survived**, 0 errors.
  - Killed: byte/char `count` dithers and the empty-value boundary — values are
    behaviorally connected to the counter and rejection branches.
  - Survived (documented equivalents): message/name/broadcast-error text dithers are
    opaque data — any non-empty value broadcasts and reflects identically, so the
    mutation does not change observable behavior.

## Suite status
- Unit + property + acceptance all pass; source-level mutation fully kills all
  testable core modules. Gherkin acceptance mutation survivors are documented
  equivalents.

## Handoffs sent
- `git_handoff` → coder, refactorer (priority `00`, task `reply-memo`), to review the
  architect commit (survivor-killing test additions + refreshed tool manifests).
- No handoff to the specifier: the architect produced no functional feature commit
  (the reply-memo feature was implemented by the coder and already spec-approved).

By architect.
