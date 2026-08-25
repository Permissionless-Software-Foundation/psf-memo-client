# Architectural Review Summary — reduce-dry-duplication

## Task and commits reviewed
- Task: `reduce-dry-duplication`
- Source commit merged and reviewed: `eed9d70f6f` (`Reduce DRY duplication in services and components`, from refactorer)
- Reviewed as a batch via `ready_for_next.sh`; merged into `swarmforge-architect` as a fast-forward and processed.

## Architectural findings and fixes applied
Reviewed the refactorer's DRY reduction for UI/Core separation, dependency rule,
information hiding/encapsulation, and local code quality.

Findings (mostly sound, two notes):
1. **MemoDb service consolidation** (`src/services/memo-db.js`) — `getRecentProfiles`/
   `getRecentPosts` → `getRecent`, and `getProfile`/`getProfilePic`/`getName` →
   `getLevelResource`. Preserves error semantics (recent → always throws; level → null
   on 404). Good cohesion, HTTP details stay in the service. **No change needed.**
2. **AppUtil `pasteFromClipboard`** (`src/util/index.js`) — centralizes clipboard-paste
   into the shared utility; components no longer duplicate clipboard reading. Good
   information hiding. **No change needed.**
3. **`PlaceholderView` extraction** — shared placeholder used by placeholder2/3.
   Cohesive. **No change needed.**
4. **`wallet-summary` blur toggle generalization** — `toggleBlur(field)` via dynamic
   setter name reduces duplication. Functional and correct; the dynamic
   `set${Capitalized}` construction is a mild readability tradeoff but acceptable to
   preserve the DRY intent. **No change.**
5. **Cross-feature dependency (fixed)** — `recent-profiles` imported the general-purpose
   `truncateAddr`/`truncateTxid` from the feed-specific `post-feed/post-display`.
   For cohesion and dependency direction, these pure string helpers belong in the
   shared utility layer. **Applied fix:** moved `truncateAddr`/`truncateTxid` to
   `src/util/index.js`; `post-display` now imports from util and re-exports them for
   its existing consumers; `recent-profiles` imports directly from `src/util`.
   This removes a sibling-feature → sibling-feature module coupling and keeps generic
   display helpers in the shared utility.

## Verification results
- **Mutation** (`mutate4javascript --scan`): memo-db.js 4 sites, util/index.js 6 sites,
  post-display.js 8 sites. No JS unit test suite exists in this project
  (`npm test` → `echo 'no tests'`); there is no coverage harness, so all sites are
  uncovered and no survivors can be killed by tests. JSX component files cannot be
  parsed by the mutation tool (no `jsx` Babel plugin); they are UI adapters and are
  outside the currently testable boundary.
- **DRY** (`dry4javascript src`): **no duplicate candidates found** — the reduction
  is effective and my fix introduced no duplication.
- **Gherkin acceptance mutation (soft)**: not runnable — this project has no
  `.feature` files, no acceptance pipeline, and no runner adapter.
- Property tests: none present in this project.

## Suite status
- No JavaScript unit/acceptance suite exists (`npm test` echoes "no tests").
- `bb.edn` test task covers the swarmforge helper scripts only (unrelated to this UI work).

## Handoffs sent
- `git_handoff` → coder, refactorer (priority `00`, task `reduce-dry-duplication`),
  to review the architectural commit.

By architect.
