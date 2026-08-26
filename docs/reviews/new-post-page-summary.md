# Architectural Review Summary — new-post-page

## Task and commits reviewed
- Task: `new-post-page`
- Reviewed the merged branch ending at `d57975c466` (refactorer), which carried:
  - `9385034`/`4fa92d1` — specifier New Post Page Gherkin spec (`specs/memo-new.feature`)
  - `05f393c` — coder implementation (`src/services/new-post.js`, page wiring)
  - `d57975c` — refactorer property tests for memo post / new post invariants
- Merged into `swarmforge-architect` (fast-forward) and processed as a batch.

## Architectural findings and fixes applied
Reviewed UI/Core separation, dependency rule, information hiding/encapsulation, and
local code quality.

1. **Testable controller behind adapters (good).** `src/services/new-post.js` is a
   testable controller wrapping `memo-post.js`; it holds draft input, the remaining-
   character counter, typed validation/length errors, and feed navigation. `memoPost`
   and `navigate` are injected so the module stays free of UI/IO concerns. Dependency
   direction is inward.
2. **Unified acceptance handlers (good).** `acceptance/lib/handlers.js` now drives both
   `post-memo.feature` and `memo-new.feature` through one `world.newPage`, reusing the
   shared Memo post behavior. Wording differences are normalized via shared regex
   alternations; no step logic is duplicated.
3. **Property tests (good).** `test/property/{harness,memo-post.property.test}.js`
   assert seeded invariants (validation classification across the length boundary,
   counter conservation `remaining === MAX - len`, `setInput` round-trip, menu-link
   idempotence). Kept separate from unit tests as the architecture requires.
4. **Fix applied — posting-state coverage.** The language mutation tool surfaced 4
   survivors in `new-post.js`, all around the `posting` state flag (initial value and
   its true/false transitions in `submit`). Added unit coverage asserting the page
   starts idle, is `posting=true` while a submit is in flight (via a deferred wallet),
   and returns to `posting=false` on success and on error. This killed all 4 survivors.

## Verification results
- **Unit (`node --test`):** 18/18 pass (added 2 posting-state tests).
- **Property (`npm run test:property`):** 6/6 pass.
- **Acceptance (normal):** both `memo-new` and `post-memo` generated suites pass.
- **Mutation (`mutate4javascript`, `--max-workers 8`):**
  - `memo-post.js`: differential reuse (module unchanged since its 7/7 kill).
  - `new-post.js`: after coverage fix, **killed 11 / survived 0 / uncovered 0**
    (was 4 survivors before the fix).
- **DRY (`dry4javascript src`):** no duplicate candidates.
- **Gherkin acceptance mutation (soft):**
  - `memo-new.feature`: 11 executed — **5 killed, 6 survived**, 0 errors.
    - Killed: empty-memo boundary; character-counter `count` example values (217/212/0)
      — proving those values are connected to behavior.
    - Survived (documented equivalents): message-content dithers (4) plus case/length-
      neutral dithers in the counter scenario — message text is opaque data; only length
      affects the counter, so these don't change observable behavior.
  - `post-memo.feature`: empty-memo scenario reused as killed; remaining 5 executed are
    the same documented message-content equivalents.
- Property tests: run separately via `npm run test:property`.

## Suite status
- Unit + property + acceptance all pass; source-level mutation fully kills both testable
  core modules. Gherkin acceptance mutation survivors are documented equivalents.

## Handoffs sent
- `git_handoff` → coder, refactorer (priority `00`, task `new-post-page`), to review the
  architect commit (posting-state coverage + tool manifests).

By architect.
