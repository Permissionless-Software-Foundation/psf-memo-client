# Architectural Review Summary — reduce-test-dry-duplication

## Task and commits reviewed
- Task: `reduce-test-dry-duplication`
- Reviewed the refactorer branch ending at `0159119921bc` (fast-forward merged into
  `swarmforge-architect`), which extracted shared test helpers for the Memo post and
  Set Name behavior slices. No source files changed; the diff is test-only
  (427 insertions / 522 deletions across 13 test files).

## Architectural findings and fixes applied
Reviewed UI/Core separation, dependency rule, information hiding/encapsulation, and
local code quality. The refactorer's work is clean; no structural fixes were needed.

1. **Test helpers separated from tests (good).** Shared fakes and test registrars
   live in `test/helpers/` (`fake-wallet.js`, `fake-profiles.js`) and
   `test/unit/*-helpers.js` / `test/property/behavior-helpers.js`, kept apart from
   the `.test.js` files. The `node --test "test/unit/*.test.js"` and
   `node --test "test/property/*.test.js"` globs match only `.test.js`, so the
   helper modules are never executed as standalone tests. This satisfies the
   "keep tests separate from test helpers" rule.
2. **Dependency direction (good).** Helpers depend inward on `src/services` and on
   each other; no test helper reaches into UI/IO. The fake wallet exposes only the
   small adapter surface the Memo action modules need (`walletInfo`, `getUtxos`,
   `sendOpReturn`) and records broadcasts for assertion, preserving information
   hiding.
3. **Cohesion (good).** Each helper owns one concern: `memo-action-helpers.js`
   registers the shared MemoAction max/over-length/validation tests;
   `page-controller-helpers.js` registers the shared in-flight/missing-handler/
   broadcast-failure page tests; `page-build-helpers.js` wires a page to a working
   action; `behavior-helpers.js` registers the shared property invariants
   (validation, counter conservation, setInput round-trip, broadcast-failure
   never navigates). Slice specifics are supplied through a small `cfg` object,
   so the two behavior slices share one implementation instead of duplicating it.
4. **Local code quality (good).** Helper APIs are documented, names are clear, and
   the `cfg`-driven registrars keep the per-slice test files terse and readable.
   `.gitignore` now excludes `target/` (project-local tool output).

## Verification results
- **Unit (`node --test`):** 56/56 pass.
- **Property (`node --test test/property/*.test.js`):** 13/13 pass.
- **Acceptance (normal):** `memo-new`, `post-memo`, and `set-name` generated suites
  all pass (14 + 5 + 13 scenarios).
- **Mutation (`mutate4javascript`, `--max-workers 8`):** differential run reports
  0/0/0 (manifests current; source unchanged). `--mutate-all` confirms every
  testable core module fully kills: memo-action 5/0/0, memo-post 2/0/0,
  memo-set-name 2/0/0, page-controller 7/0/0, set-name-page 3/0/0, account-page
  7/0/0, profiles 1/0/0, new-post 4/0/0. No survivors, no uncovered.
- **DRY (`dry4javascript src` and `dry4javascript test`):** no duplicate candidates
  in either tree.
- **Gherkin acceptance mutation (soft):**
  - `memo-new.feature` — 14 executed, **4 killed, 10 survived**, 0 errors.
  - `post-memo.feature` — 5 executed, **0 killed, 5 survived**, 0 errors.
  - `set-name.feature` — 13 executed, **6 killed, 7 survived**, 0 errors.
  - Killed: byte/char `count` dithers and the empty-value boundary — values are
    behaviorally connected to the counter and rejection branches.
  - Survived (documented equivalents): message/name/broadcast-error text dithers
    are opaque data — any non-empty value broadcasts and reflects identically, so
    the mutation does not change observable behavior.

## Suite status
- Unit + property + acceptance all pass; source-level mutation fully kills all
  testable core modules. Gherkin acceptance mutation survivors are documented
  equivalents.

## Handoffs sent
- None. The refactorer's work is test-only (no product behavior change) and this
  review produced no source changes, so there is no functional commit for the
  specifier and no follow-up work for the coder/refactorer to review. Per the
  handoff rules, non-functional work is not forwarded.

By architect.
