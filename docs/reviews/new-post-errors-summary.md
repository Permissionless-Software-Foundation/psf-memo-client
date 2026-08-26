# Architectural Review Summary — new-post-errors

## Task and commits reviewed
- Task: `new-post-errors`
- Reviewed the merged branch ending at `66a684923c` (refactorer), which carried:
  - `a125751`/`4e0f40c` — specifier broadcast-error surfacing spec (`specs/memo-new.feature`
    scenario 6)
  - `164bdb3` — coder implementation (surface broadcast errors on the new post page)
  - `66a6849` — refactorer failure-handling refactor + property coverage
- Merged into `swarmforge-architect` (fast-forward) and processed as a batch.

## Architectural findings and fixes applied
Reviewed UI/Core separation, dependency rule, information hiding/encapsulation, and
local code quality.

1. **Failure classification (good).** `src/services/new-post.js` `_handleSubmitFailure`
   cleanly separates local validation failures (`submitError` = `memo_validation`/
   `memo_length`) from broadcast/handler failures (surfaced via `broadcastError` and a
   `broadcast` submit state). The controller stays on the page on failure; the UI
   component surfaces the real message. Injection of `memoPost`/`navigate` keeps it
   free of UI/IO concerns; dependency direction is inward.
2. **Unified handlers extended (good).** `acceptance/lib/handlers.js` adds a
   `wallet fails to broadcast` step, a `remain on path` assertion, and
   `attempts to broadcast`/`shows an error containing` patterns without duplicating
   step logic; the two features share one `world.newPage`.
3. **Property coverage (good).** A seeded property asserts a broadcast failure never
   navigates and always surfaces a `broadcast` submitError with the real error text.
4. **Fix applied — error-message fallback coverage.** The language mutation tool
   surfaced one survivor on `new-post.js:87` (`err.message || String(err)` → `&&`),
   which only matters when `err.message` is falsy. No test exercised that path. Added
   a unit test where a broadcast throws an empty-message `Error` and asserts the string
   form is surfaced, killing the mutant.

## Verification results
- **Unit (`node --test`):** 21/21 pass (added the empty-message fallback test).
- **Property (`npm run test:property`):** 7/7 pass.
- **Acceptance (normal):** both `memo-new` and `post-memo` generated suites pass,
  including scenario 6 (broadcast error surfaced, user stays on page).
- **Mutation (`mutate4javascript`, `--max-workers 8`, `--mutate-all`):**
  `new-post.js` — **killed 12 / survived 0 / uncovered 0** (was 1 survivor before the
  fix).
- **DRY (`dry4javascript src`):** no duplicate candidates.
- **Gherkin acceptance mutation (soft):** `memo-new.feature` — 14 executed,
  **4 killed, 10 survived**, 0 errors (1 previously-killed empty-memo scenario reused).
  - Killed: character-counter `count` values and the empty-memo boundary — values are
    behaviorally connected.
  - Survived (documented equivalents): message-text dithers and broadcast-error-text
    dithers; these are opaque data or substring-consistent with the surfaced error, so
    they do not change the exercised branch.
- Property tests run separately via `npm run test:property`.

## Suite status
- Unit + property + acceptance all pass; source-level mutation fully kills both testable
  core modules. Gherkin acceptance mutation survivors are documented equivalents.

## Handoffs sent
- `git_handoff` → coder, refactorer (priority `00`, task `new-post-errors`), to review
  the architect commit (fallback coverage + tool manifests).

By architect.
