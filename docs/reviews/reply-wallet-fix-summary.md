# Architectural Review Summary — reply-wallet-fix

## Task and commits reviewed
- Task: `reply-wallet-fix`
- Reviewed the refactorer branch ending at `156075bb2d` (fast-forward merged into
  `swarmforge-architect`), which carried:
  - `156075b` — specifier: added `Reply to a Memo - 8`, a regression
    `Scenario Outline` asserting that a reply with the authenticated wallet is
    broadcast from the feed thread modal with no missing-wallet error.
  - The merge `9ce9958` (display-name) carries content already present on the
    architect branch; net diff vs the prior architect HEAD is only the feature
    change above.

## Architectural findings and fixes applied
Reviewed UI/Core separation, dependency rule, information hiding/encapsulation,
and local code quality for the reply-wallet regression scenario.

1. **UI/Core separation (good).** Scenario 8 exercises the existing
   `ReplyThreadPage` controller, which delegates to `MemoReply.reply()`
   (`src/services/memo-reply.js`). Broadcasting runs through the injected
   minimal-slp-wallet adapter (`wallet.getUtxos()` + `wallet.sendOpReturn()`);
   the thread modal stays a thin UI adapter. No new UI/IO leaked into core rules.
2. **Dependency rule (good).** `MemoReply` depends inward on the `MemoAction`
   base and on injected wallet/thread adapters; no low-level module reaches
   toward IO.
3. **Information hiding (good).** The OP_RETURN wire format (parent txid 32
   bytes + UTF-8 message) is built and decoded inside `memo-reply.js`; the
   feature and UI never see the raw payload.
4. **Regression value (good).** Scenario 8 re-verifies the wallet-backed
   broadcast from the feed thread modal with two examples, closing the
   missing-wallet path in a behavior-spec way. It passes against the existing
   implementation, confirming the fix was already present; no source changes
   were needed.

## Verification results
- **Unit (`node --test`):** 89/89 pass.
- **Property (`node --test test/property/*.test.js`):** 13/13 pass.
- **Acceptance (normal):** `memo-new`, `post-memo`, `set-name`, and `reply-memo`
  (8 scenarios) generated suites all pass, including scenario 8 both examples.
- **Mutation (`mutate4javascript`, `--max-workers 8`, differential vs manifest):**
  all 12 testable core modules report 0/0/0 (no survivors, no uncovered) — the
  source is unchanged by this task; manifests were refreshed from the runs.
- **DRY (`dry4javascript src` and `dry4javascript test`):** no duplicate
  candidates in either tree.
- **Gherkin acceptance mutation (soft):** `reply-memo.feature` — 14 executed,
  **4 killed, 10 survived**, 0 errors (1 scenario / 1 mutation skipped, plain
  `Scenario`s carry no example mutations).
  - Killed: byte `count` dithers (184→175, 179→185, 0→3) and the empty-value
    boundary — behaviorally connected assertions.
  - Survived (documented equivalents): all are opaque message-text dithers
    (`hello memo→hellO memo`, over-long strings, nested reply texts, and the
    new scenario-8 texts `hello memo→helLo memo`,
    `a wallet-backed reply→a wallet-backedxreply`). Any non-empty value
    broadcasts and reflects identically, so these are equivalent mutants.

## Suite status
- Unit + property + acceptance all pass; source-level mutation is clean.
  Gherkin acceptance-mutation survivors are documented equivalent mutants.

## Handoffs sent
- `git_handoff` → coder, refactorer (priority `00`, task `reply-wallet-fix`) to
  review the architect commit (manifest refreshes + review doc — no source
  changes).
- No handoff to the specifier: the architect produced no functional feature
  commit.

By architect.
