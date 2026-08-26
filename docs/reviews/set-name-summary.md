# Architectural Review Summary — set-name

## Task and commits reviewed
- Task: `set-name`
- Reviewed the merged branch ending at `d79b9f04bd` (refactorer), which carried:
  - `bb9d00a` — specifier Set Name Gherkin spec (`specs/set-name.feature`)
  - `bd2eac5` — coder implementation (MemoSetName, SetNamePage, AccountPage,
    Profiles store, React views, acceptance handlers)
  - `d79b9f0` — refactorer extraction of `MemoAction` and `PageController` base
    classes plus set-name property tests
- Merged into `swarmforge-architect` (fast-forward) and processed as a batch.

## Architectural findings and fixes applied
Reviewed UI/Core separation, dependency rule, information hiding/encapsulation,
and local code quality.

1. **Base-class extraction (good).** `MemoAction` (shared by `MemoPost` and
   `MemoSetName`) owns `validate`/`broadcast`/`_throwIfInvalid`; subclasses
   supply only the protocol-specific `isTooLong`/`reflect` and their config.
   `PageController` (shared by `NewPostPage` and `SetNamePage`) owns
   `setInput`/`submit`/`_handleSubmitFailure`; subclasses supply
   `successPath`, `validationCodes`, `_setBusy`, and `_perform`. This removes
   structural duplication between the two memo actions and the two page
   controllers while keeping dependency direction inward.
2. **UI/Core separation (good).** All behavior lives in testable services free
   of UI/IO; the React views (`set-name`, `account`, `app-body`, `nav-menu`)
   are thin shells that inject wallet/profiles/navigate adapters. The shared
   `Profiles` session store keeps the Set Name and Account pages in sync
   without leaking persistence structures across the boundary.
3. **Acceptance handlers (good).** `acceptance/lib/handlers.js` uses regex
   parameter capture as the default style and shares one `world` across the
   memo-post, new-post, set-name, and account features; the fake wallet
   `sendOpReturn` signature was corrected to the public minimal-slp-wallet API.
4. **Fix applied — constructor duplication (DRY).** The language DRY tool
   flagged a score=1.00 duplicate between the `MemoPost` and `MemoSetName`
   constructors (identical config-assignment shape). Moved the per-action
   config into a static `config` object on each subclass and had the base
   `MemoAction` constructor read `this.constructor.config`. This eliminates
   the duplicate constructor pattern while keeping the config values
   subclass-specific and readable. DRY now reports no duplicate candidates.

## Verification results
- **Unit (`node --test`):** 56/56 pass.
- **Property (`npm run test:property`):** 13/13 pass (set-name validation
  classification, byte-counter conservation, setInput round-trip, broadcast
  failure never navigates).
- **Acceptance (normal):** `memo-new`, `post-memo`, and `set-name` generated
  suites all pass (11 + 6 + 11 scenarios).
- **Mutation (`mutate4javascript`, `--max-workers 8`, `--mutate-all`):**
  - `memo-action.js` — killed 5 / survived 0 / uncovered 0
  - `memo-post.js` — killed 2 / survived 0 / uncovered 0
  - `memo-set-name.js` — killed 2 / survived 0 / uncovered 0
  - `page-controller.js` — killed 7 / survived 0 / uncovered 0
  - `set-name-page.js` — killed 3 / survived 0 / uncovered 0
  - `account-page.js` — killed 7 / survived 0 / uncovered 0
  - `profiles.js` — killed 1 / survived 0 / uncovered 0
  - `new-post.js` — killed 0 / survived 0 / uncovered 0 (manifest current)
  - Manifests refreshed for all refactored/new files.
- **DRY (`dry4javascript src`):** no duplicate candidates (constructor
  duplication removed).
- **Gherkin acceptance mutation (soft):** `set-name.feature` — 13 executed,
  **6 killed, 7 survived**, 0 errors (1 scenario/1 mutation reused from the
  clean empty-name scenario).
  - Killed: byte-counter `count` values and the empty-name boundary — values
    are behaviorally connected.
  - Survived (documented equivalents): name-text dithers (m1, m2, m10) are
    opaque data — any non-empty name broadcasts and reflects identically; and
    over-length name dithers (m4, m5, m6, m14) remain over-length, so the
    length-rejection and zero-count branches are unchanged.
- Property tests run separately via `npm run test:property`.

## Suite status
- Unit + property + acceptance all pass; source-level mutation fully kills all
  testable core modules. Gherkin acceptance mutation survivors are documented
  equivalents.

## Handoffs sent
- `git_handoff` → coder, refactorer (priority `00`, task `set-name`), to review
  the architect commit (constructor DRY fix + refreshed tool manifests).

By architect.
