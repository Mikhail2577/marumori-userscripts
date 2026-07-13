# Audit Remediation Progress

## Baseline

- Starting commit: `8cffcd600b9abe7c3d7e45ff0933b581fc3bb970`
- Starting branch: `feature/even-more-gamified-modular-migration`
- Initial git status: clean; no staged, unstaged, or untracked files
- Node version: `v26.4.0` (project policy: Node `>=24`)
- npm version: `11.17.0`
- Initial package version: `3.9.0`
- Initial userscript version: `3.9.0`
- Initial user.js hash: `c8bb1db857d8834327ee73a38987fbf714699903b20a4c145597c912d8446509`
- Initial meta.js hash: `9f522d359a115147e88970f4e2d4f8744bf6d7d48fe7e8cc2813d0dd00cbb2c3`
- Initial test result: 31 Vitest files passed; 198 tests passed
- Initial build result: production `.user.js` and `.meta.js` generated successfully and matched committed `dist` byte-for-byte
- Initial release-check result: `npm run check` passed; the current check rebuilds `dist` in place and its non-mutating/stale-artifact behavior remains scheduled for Phase 9
- Initial browser-contract result: Firefox passed all 5 account-free production-bundle contracts; Safari was attempted but unavailable because Safari Remote Automation is currently disabled
- Initial artifact sizes: `.user.js` 425,879 bytes; `.meta.js` 1,127 bytes
- Initial preserved legacy hash: `9534436ab91060aed4555281d56bdf76a4c865d61df3cf718cb6eb4c99f2d734`

## Phase Status

- [x] Phase 0 — Baseline and safety
- [x] Phase 1 — Final-question completion
- [x] Phase 2 — Timer and timeout ownership
- [x] Phase 3 — Rewind identity and late recovery
- [ ] Manual Checkpoint A — deferred into the consolidated post-Phase 12 validation
- [x] Phase 4 — Storage, records, and HUD recovery
- [x] Phase 5 — Canvas cadence and lifecycle
- [x] Phase 6 — Live reduced motion
- [x] Phase 7 — Accessibility
- [x] Phase 8 — Low-risk rendering and privacy fixes
- [ ] Manual Checkpoint B — deferred into the consolidated post-Phase 12 validation
- [ ] Phase 9 — Release engineering
- [ ] Phase 10 — Additional low-risk hardening
- [ ] Phase 11 — Evidence-gated investigations
- [ ] Phase 12 — Final automated validation
- [ ] Manual Checkpoint C
- [ ] Phase 13 — Public artifact verification
- [ ] Final report

## Decisions

- Treat commit `8cffcd6` as the authoritative baseline. It is newer than the commit reviewed previously and restores live MaruMori review mounting; every finding will be reverified against this source.
- Keep `package.json` (`3.9.0`) and the current hard-coded metadata version unchanged until the dedicated Phase 9 version-source work.
- Preserve the root-level legacy userscript as a read-only behavioral reference. Source changes belong under `src/`; generated artifacts are updated only with npm build scripts.
- Do not approve the pending `esbuild@0.28.1` or `fsevents@2.3.3` install scripts merely to remove npm warnings.
- On 2026-07-13 the user explicitly authorized continuing through Phases 4–12 before further manual validation. Checkpoints A and B remain unpassed and are consolidated with Checkpoint C after Phase 12; Phase 13/public distribution remains blocked until that combined live validation succeeds.
- Use targeted controller/integration tests for deterministic lifecycle races and production-bundle Firefox contracts for whole-application finalization behavior. Safari results remain unclaimed while Remote Automation is disabled.
- Phase 1 uses `src/core/session-finalization.js` as the single resolution-gated session-completion owner. The controller requires both MaruMori's authoritative `N / N` completed-item signal and resolved current-prompt ownership; the session-scoped summary token is invalidated by cleanup or confirmed rewind.
- `LifecycleController.complete()` now rejects unresolved or stale question ownership, making the lifecycle transition itself enforce the completion contract.
- Checkpoint A diagnosis used MaruMori's current public review bundle (`/_app/immutable/nodes/81.CkWlGNB9.js`) to correct the fixture model: `.top_middle` starts at `0 / N` and counts completed items, while vocabulary/kanji items expand into reading/meaning sibling prompts. The counter advances only after the last remaining sibling is cleared.
- Prompt resolution and word completion now have separate ownership. Correct/incorrect answer metrics are applied per prompt; word streak, `sessionWords`, and word-clear feedback run exactly once on a positive completed-item counter edge. This preserves the legacy semantic and includes the final `N-1 → N` edge.
- Stable host item identity is combined with the known prompt layout (`reading`, `meaning`, `unscramble`, or `fill-in-the-blank`). Without one unambiguous host ID, wrapper generation plus layout is the strict fallback. It survives progress changes on the same prompt, distinguishes sibling layouts on a reused wrapper, and still fails closed across wrapper replacement.
- A resolved-incorrect → unresolved transition for the same wrapper/layout is a legitimate retry and forcibly starts a new question generation instead of remounting and resetting the session.
- Timeout incorrect confirmation updates finalization before deciding whether to schedule Next. The single advance path consults the active/finalized predicate before scheduling and invocation. An incomplete final item remains below `N / N`, so timeout Wrong/Next may requeue it; only confirmed host completion suppresses advancement.
- The first timer is the only input-gated timer in a session. Its gate now commits only after `resetComboTimer(true)` successfully creates immutable timer ownership; a rejected start retains its input listener. After that gate commits or the first prompt resolves, every reading/meaning/retry prompt starts immediately on its prompt transition, independent of completed-item progress.
- First-input reconciliation compares the bound input with the adapter's current visible input rather than checking only connectivity, so a stale connected input cannot strand the initial timer gate.
- The browser-contract runner accepts `MM_BROWSER_CONTRACT` for focused account-free diagnostics while retaining the complete default suite.
- Phase 2 adds an atomic DOM question-context read containing logical identity, identity kind, root/wrapper generations, combined DOM generation, progress, resolution, and node ownership from one adapter sample.
- Every answer timer now carries immutable `TimerOwnership`: session generation, question generation, logical identity, identity kind, root/wrapper/DOM generations, exact nodes, timer generation, arm time, duration, and monotonic deadline.
- Expiration receives the exact owner armed in the combo compositor. Rejection can only clear that same owner, so a stale callback cannot stop newer timer presentation.
- Same-logical wrapper replacement is explicitly rearmed with a new timer generation. A live deadline is preserved; a replacement first observed after expiry gets one fresh full deadline instead of being failed by the stale timer.
- Timeout failure now requires the originating timer owner and validates it before every host-facing stage. Its `idle → scheduled → invoking → done` advance state is the sole Next owner; final completion, natural answers, cleanup, question/session changes, and DOM-generation changes cancel safely.
- The DOM adapter allows only the two known userscript-applied host decoration classes (`mm-bounce` and `mm-progress-glow`) when reading host context; other `mm-*`, `data-mm-owned`, and `mm-*` IDs remain excluded.
- Phase 3 completes prompt/DOM/progress separation for rewind: stable host prompt identity survives wrapper/progress changes, DOM generation identifies mounted instances, and strict fallback identity remains replacement-sensitive while surviving progress changes on the same wrapper.
- Rewind capture and transactions now record transaction, snapshot, session, question, answer, logical, DOM, root, progress, start-time, and confirmation-deadline ownership. Programmatic native clicks remain deduplicated from the document capture listener, and overlapping HUD/native/keyboard intents serialize to one transaction.
- A normal rewind commits only on the owned same-logical resolved → unresolved transition. Stable host identity permits wrapper replacement and progress decrement; fallback ambiguity cancels.
- The 750 ms request timeout now leaves one explicit recovery candidate for a further 2,000 ms. A slightly late genuine host transition restores once only when session/question/answer/root/logical ownership still matches. The candidate is cleared before restoration and is invalidated by a different question, new session, newer resolution, cleanup, or deadline.
- After the recovery deadline, a late transition cannot restore the stale snapshot. Controller/app reconciliation clears it and safely remounts an otherwise impossible local-resolved/host-unresolved state.
- Successful rewind progress regression lowers the local `lastCompleted` boundary marker before the next reconciliation, preventing a confirmed rewind from being misclassified as a new session.
- Phase 4 treats `package.json`'s supported timer range as a storage invariant: missing/null/blank/invalid/nonfinite legacy values use 15 seconds, while every finite legacy or current value is clamped to 5–120 seconds before timer initialization.
- Reset Records updates the records component of captured, pending, and bounded late-recovery rewind snapshots without discarding valid gameplay rewind ownership. If snapshot updating fails, rewind is discarded so deleted records remain authoritative.
- HUD statistics visibility no longer owns Settings availability. Hidden HUD state uses `hidden`, `inert`, `aria-hidden`, and `display: none`; one accessible native-button recovery launcher lives outside the HUD subtree and is controller-owned across cleanup/remount.
- Phase 5 replaces the Balanced early-tolerance gate with a deadline cadence that advances after every accepted frame and skips missed intervals arithmetically. Canvas activity can pause without destroying renderer resources or the retained last frame; completed-session reconciliation remains paused and confirmed rewind/new-session ownership resumes one loop.
- Phase 6 installs one session-owned modern/legacy media-query subscription. Live reduced-motion changes compose with session and visibility state, cancel transient work, and reconfigure canvas/timer presentation without resetting gameplay or replacing the timer owner/deadline.
- Phase 7 moves summary ownership into a dedicated dialog controller. Opening the summary captures focus and the exact `inert`/`aria-hidden` state of every background body child, focuses Continue, traps forward/backward Tab navigation, and blocks programmatic background focus. Close, confirmed rewind, route cleanup, and remount restore background state and focus without leaking document listeners.
- Settings range inputs now have stable programmatic labels, and every userscript control family has a theme-aware `:focus-visible` outline. The hidden-HUD recovery launcher remains outside the inert HUD and its Phase 4 accessibility state survives a summary cycle exactly.
- Phase 8 gives shooting stars explicit backing-canvas bounds. Spawn, trail, update, and directional culling share that coordinate system, and resize/teardown clears trails expressed in obsolete bounds. Shrine and Night View retain the GM resource primary path; their one-shot direct fallback now assigns anonymous CORS and `no-referrer` before `src` without adding a request.

### Phase 0 subsystem map

- Completion/counter/summary: `src/app.js` (`processResolvedAnswer`, `processCounterChange`, `showSummary`, `cancelPendingSummary`, `reconcileReviewDom`)
- Session and question generations: `src/core/lifecycle.js`
- Session-boundary detection: `src/core/session-boundary.js`
- Logical and DOM question discovery: `src/adapters/marumori-dom.js`
- Timer creation/expiration/presentation: `src/app.js` (`timerState`, `startComboBar`, `handleAnswerTimeout`) and `src/ui/combo-timer.js`
- Timeout failure and delayed Next: `src/gameplay/timeout-failure.js`
- Rewind capture/transaction/settlement: `src/gameplay/rewind.js`; state snapshots/restoration and native intent wiring in `src/app.js`
- Record reset and rewind record snapshot: `src/app.js`; normalization in `src/gameplay/records.js`
- Settings normalization: `src/storage/settings.js`
- HUD visibility/settings launcher: `src/ui/hud-controller.js`, `src/ui/settings-panel.js`, and `src/ui/styles.css`
- Canvas frame gating/activity: `src/backgrounds/canvas-background-controller.js`
- Reduced-motion reads: `src/app.js`, canvas controller, transient effects, HUD, and combo timer
- Range inputs/summary modal: `src/ui/settings-panel.js`, `src/app.js`, and `src/ui/styles.css`
- Shooting stars: `src/backgrounds/renderers/shooting-stars.js`
- Shrine/Night View fallbacks: their renderers under `src/backgrounds/renderers/`
- Metadata/version/build/release checks: `package.json`, `build/metadata.mjs`, `build/build-userscript.mjs`, and `build/validate-build.mjs`
- Account-free generated-bundle contracts: `tests/browser/`; deterministic source tests: `tests/unit/`, `tests/integration/`, and `tests/regression/`
- CI: no `.github` workflow exists at baseline

## Tests Added

- None in Phase 0; this phase established the pre-change evidence baseline.
- `tests/unit/session-finalization.test.js`: valid zero-completed-item progress, prompt deduplication, same-owner promotion only after host `N / N`, final correct/incorrect host signals, summary ownership, cleanup, rewind/re-answer, stale ownership, and same-route second-session isolation.
- `tests/integration/lifecycle-dom.test.js`: unresolved lifecycle completion is rejected.
- `tests/regression/timeout-failure.test.js`: finalization suppresses automatic Next after confirmed incorrect resolution.
- `tests/browser/run-browser-contract.js` and browser fixtures: production-bundle coverage now models MaruMori's `0 / N` completed-item counter, two sibling layouts on the same wrapper, one word edge after both prompts, final completion only after host Next reaches `N / N`, incorrect/timeout requeue without word completion, cleanup, rewind/re-answer, duplicate observer signals, and clean same-route sessions.
- `tests/regression/answer-timer-ownership.test.js`: immutable owner contents, DOM-before-lifecycle rejection, question/session generation changes, cleanup immediately before expiry, early/natural resolution, same-logical replacement rearm, post-deadline replacement policy, and stale-owner isolation.
- `tests/regression/timeout-failure.test.js`: original-owner requirement, no host effects on question-two or replacement DOM, natural-answer race, duplicate transaction serialization, exactly-once Next, final suppression, cleanup/question/session cancellation, and exact-input restoration.
- `tests/unit/combo-timer.test.js`: exact owner delivery at expiration and preservation of a newer timer across a superseded deadline.
- `tests/integration/lifecycle-dom.test.js`: atomic context, prompt-layout/DOM-generation separation, conflicting-ID failure, wrapper/layout fallback identity, same-prompt forced retry, and host-context readability during owned transient decoration.
- `tests/regression/rewind.test.js`: original-wrapper confirmation, stable-ID wrapper replacement, progress decrement, combined replacement/regression, fallback failure, normal timeout, bounded late recovery, post-window rejection, different question/session rejection, native-click deduplication, HUD/keyboard serialization, final-summary cancellation, failed native capability, and exactly-once commit.
- `tests/browser/run-browser-contract.js` and `tests/browser/fixture-host.js`: production-bundle wrapper-plus-progress rewind and 900 ms delayed-host recovery contracts. The Firefox/Safari-compatible suite now contains 13 contracts.
- `tests/integration/lifecycle-dom.test.js`: monotonic answer-generation assertions across resolve, rewind, and re-answer.
- `tests/integration/first-input-gate.test.js`: a rejected first timer start leaves both gate and lifecycle awaiting first input, a later event can commit it exactly once, and an event from a stale connected input is ignored.
- `tests/browser/run-browser-contract.js` and `tests/browser/fixture-host.js`: the production bundle keeps the initial timer dormant before input, survives replacement by a new active input while the stale one stays connected, starts from first input, and restarts a sibling meaning timer before any input or completed-item edge. The Firefox/Safari-compatible suite now contains 14 contracts.
- `tests/unit/settings.test.js` and `tests/integration/first-input-gate.test.js`: malformed/legacy timer values normalize into the supported range and a null legacy value can initialize and start the real compositor safely.
- `tests/integration/record-reset.test.js` and `tests/regression/rewind.test.js`: reset persists/HUD-syncs once per action and remains authoritative across captured, pending, and late-recovery rewind state while gameplay fields remain rewindable.
- `tests/unit/hud-controller.test.js`: persisted HUD-off state, semantic hiding, focus transfer, external launcher activation, re-enable, cleanup, and one-launcher remount ownership.
- `tests/unit/canvas-runtime.test.js`: Balanced cadence across synthetic 60/90/120/144/165/240 Hz displays, bounded long-frame recovery, reset, and invalid inputs.
- `tests/unit/canvas-background-controller.test.js`: completion pause with retained canvas, reconciliation while paused, exactly-one rewind/new-session resume, hidden/completed composition, resize/theme changes, stale activity generations, and reduced-motion toggles.
- `tests/unit/combo-timer.test.js`: live motion toggles preserve the exact owner/effective deadline and expire once in animated, stepped, and hidden-visual modes.
- `tests/unit/media-query.test.js`: modern and legacy subscription APIs, lifecycle cleanup, idempotence, and unavailable-query fallback.
- `tests/unit/settings-panel.test.js`, `tests/unit/summary-dialog.test.js`, and `tests/regression/source-invariants.test.js`: stable slider label association, unique remount IDs, visible-focus contracts, dialog semantics, focus trapping/restoration, exact inert/ARIA restoration, repeated cycles, and cleanup while open.
- `tests/browser/run-browser-contract.js`: production-bundle summary semantics, hidden-HUD preservation, focus ownership, and route-cleanup restoration. The Firefox/Safari-compatible suite now contains 15 contracts.
- `tests/unit/shooting-stars.test.js` and `tests/unit/background-image-loading.test.js`: capped backing coordinates, trail cleanup/culling, GM-primary image loading, and direct-fallback assignment order.

## Manual Validation

- Manual Checkpoint A: the first candidate was withdrawn on 2026-07-12 after the user questioned word-streak tracking. Diagnosis confirmed that its one-prompt/one-word, one-based fixture was incompatible with live MaruMori multi-layout semantics. The word-streak-only candidate (`74b8c363…`) was then superseded after the timer feedback below. Current corrected candidate version `3.9.0`; `.user.js` 460,329 bytes / SHA-256 `632b8853d077bc5de976de0af77e5f31c688851abf9497c0e8312f5b12086d7b`; `.meta.js` 1,127 bytes / SHA-256 `9f522d359a115147e88970f4e2d4f8744bf6d7d48fe7e8cc2813d0dd00cbb2c3`.
- Revised Checkpoint A semantics: live progress begins at `0 / N`; sibling prompts do not advance word streak; the last sibling plus host advancement produces one word edge; final summary follows the resolved `N / N` host transition; incorrect/timeout attempts below `N / N` requeue without a word or summary; rewind after final completion restores the prior completed-item count.
- Manual Checkpoint A received a second correction on 2026-07-12: only the session's first timer waits for a keystroke; all later reading/meaning prompt timers must start immediately on Next. The first candidate could consume that gate even when ownership failed to arm, and input retargeting considered disconnection but not a still-connected stale node.
- The user confirmed the corrected live timer behavior on 2026-07-12. The remaining Checkpoint A scenarios were not claimed as passed and, by explicit user direction on 2026-07-13, are deferred into the combined post-Phase 12 manual validation.
- Manual Checkpoint B: deferred into the combined post-Phase 12 manual validation by explicit user direction; not passed.
- Manual Checkpoint C: not yet presented.

## Deferred Items

- Release-check redesign, version unification, and public distribution verification remain in their ordered later phases.
- Matrix rendering, reconciliation duplication, broad arcade selectors, and CRT GPU behavior remain evidence-gated for Phase 11.

## Commands and Results

- `git status --short`: clean before behavioral work.
- `git diff --stat`: empty before behavioral work.
- `npm ci`: passed; 171 packages installed; npm warned that install scripts for `esbuild@0.28.1` and `fsevents@2.3.3` are not approved.
- `npm run lint`: passed.
- `npm run test`: passed, 31 files / 198 tests.
- `npm run build`: passed; pre-build and post-build SHA-256 hashes were identical and git remained clean.
- `npm run check`: passed in full.
- `git diff --check`: passed.
- `npm run test:browser:firefox`: passed all 5 contracts.
- `npm run test:browser:safari`: attempted; unavailable because Remote Automation is disabled.
- Phase 1 focused Vitest suites: passed, 4 files / 36 tests.
- Phase 1 `npm run lint`: passed.
- Phase 1 `npm run test`: passed, 32 files / 209 tests.
- Phase 1 `npm run test:browser:firefox`: passed all 11 expanded production-bundle contracts.
- Phase 2 focused Vitest suites: passed, 4 files / 43 tests.
- Phase 2 `npm run lint`: passed.
- Phase 2 `npm run test`: passed, 33 files / 225 tests.
- Phase 2 `npm run test:browser:firefox`: passed all 11 production-bundle contracts.
- Phase 3 focused Vitest suites: passed, 4 files / 48 tests before the complete run.
- Phase 3 `npm run lint`: passed.
- Phase 3 `npm run test`: passed, 33 files / 235 tests.
- Phase 3 focused Firefox production-bundle contracts: wrapper/progress replacement passed; bounded delayed recovery passed.
- Phase 3 `npm run build`: passed and generated the Checkpoint A artifacts.
- Phase 3 `npm run check`: passed in full, including lint, 33 files / 235 tests, build validation, syntax, and formatting.
- Phase 3 complete `npm run test:browser:firefox`: passed all 13 production-bundle contracts.
- Checkpoint A `git diff --check`: passed.
- Checkpoint A word-streak correction focused Vitest suites: passed, 5 files / 63 tests.
- Checkpoint A word-streak correction `npm run test`: passed, 33 files / 238 tests.
- Corrected `MM_BROWSER_CONTRACT=multi-question npm run test:browser:firefox`: passed the realistic multi-layout production-bundle contract.
- Corrected `npm run test:browser:firefox`: passed all 13 production-bundle contracts.
- Corrected `npm run test:browser:safari`: attempted; unavailable because Safari Remote Automation is still disabled.
- Corrected `npm run check`: passed in full, including 33 Vitest files / 238 tests, build validation, syntax, lint, and formatting.
- Final corrected `npm run test:browser:firefox`: passed all 13 production-bundle contracts after the reconciliation-order check.
- Corrected candidate hashes: `.user.js` `74b8c36369774acdd28fb452b6ad5e79d5e46cae8720d3f0d18ca5d46084f6fa`; `.meta.js` `9f522d359a115147e88970f4e2d4f8744bf6d7d48fe7e8cc2813d0dd00cbb2c3`.
- Checkpoint A timer correction focused Vitest suites: passed, 4 files / 40 tests after the final fail-closed gate assertions.
- `MM_BROWSER_CONTRACT=first-input npm run test:browser:firefox`: passed the transactional first-input and immediate sibling-prompt timer contract.
- Checkpoint A timer correction `npm run check`: passed in full, including 33 Vitest files / 240 tests, build validation, syntax, lint, and formatting.
- Final timer-corrected `npm run test:browser:firefox`: passed all 14 production-bundle contracts.
- Final timer-corrected `npm run test:browser:safari`: passed all 14 production-bundle contracts after Safari Remote Automation was enabled.
- Current Checkpoint A candidate hashes: `.user.js` `632b8853d077bc5de976de0af77e5f31c688851abf9497c0e8312f5b12086d7b`; `.meta.js` `9f522d359a115147e88970f4e2d4f8744bf6d7d48fe7e8cc2813d0dd00cbb2c3`.
- Phase 4 resumed core baseline: 5 files / 50 tests passed before changes.
- Phase 4 focused suites: 6 files / 51 tests passed.
- Phase 4 `npm run lint`: passed.
- Phase 4 `npm run test`: passed, 34 files / 250 tests.
- Phase 4 `npm run build`, artifact validation, and generated userscript syntax check: passed.
- Phase 4 focused formatting and `git diff --check`: passed.
- Phase 5 evidence replay before changes: the old Balanced gate rendered 82/82/61/69/93 frames over synthetic 90/120/144/165/240 Hz one-second timelines, with gaps as short as one display frame; 60 Hz rendered 60.
- Phases 5–6 focused suites: 4 files / 43 tests passed before the final two controller cases; the complete suite below includes both additions.
- Phases 5–6 `npm run lint`: passed.
- Phases 5–6 `npm run test`: passed, 35 files / 273 tests.
- Phases 5–6 production build, artifact validation, syntax, formatting, and `git diff --check`: passed.
- Phases 5–6 Firefox production-bundle run: passed all 14 contracts.
- Phases 5–6 Safari production-bundle run: the first two contracts passed, then WebDriver stalled and left Safari paired to the abandoned session; the run was terminated and no complete Safari result is claimed. A fresh attach was rejected as already paired, so retry is deferred to Phase 12 without forcibly closing the user's Safari session.
- Phases 7–8 focused suites: 5 files / 32 tests passed before the final repeated-dialog-cycle assertion; the summary controller suite then passed 9/9.
- Phases 7–8 lint, formatting, and `git diff --check`: passed on the completed source/test diff.
- Phases 7–8 production build and the combined pre-commit gate: passed, including 40 Vitest files / 307 tests, generated syntax/metadata validation, formatting, and the real-source deterministic verifier.
- Phases 7–8 Firefox production-bundle run: passed all 15 contracts, including modal focus/background ownership and cleanup restoration.
- Phases 7–8 artifact hashes: `.user.js` `e1d120f5bc92bf01a142cb6de2ff0331375657cc7774bfeb3736459c96faf33f`; `.meta.js` `9f522d359a115147e88970f4e2d4f8744bf6d7d48fe7e8cc2813d0dd00cbb2c3`.
