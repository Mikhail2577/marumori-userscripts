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
- [ ] Phase 3 — Rewind identity and late recovery
- [ ] Manual Checkpoint A
- [ ] Phase 4 — Storage, records, and HUD recovery
- [ ] Phase 5 — Canvas cadence and lifecycle
- [ ] Phase 6 — Live reduced motion
- [ ] Phase 7 — Accessibility
- [ ] Phase 8 — Low-risk rendering and privacy fixes
- [ ] Manual Checkpoint B
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
- Use targeted controller/integration tests for deterministic lifecycle races and production-bundle Firefox contracts for whole-application finalization behavior. Safari results remain unclaimed while Remote Automation is disabled.
- Phase 1 uses `src/core/session-finalization.js` as the single resolution-gated completion owner. Confirmed question ownership is counted once; `current === total` alone cannot complete; the final resolved question is counted before completion; and the session-scoped summary token is invalidated by cleanup or confirmed rewind.
- `LifecycleController.complete()` now rejects unresolved or stale question ownership, making the lifecycle transition itself enforce the completion contract.
- Word completion moved from raw counter increments to confirmed logical answer resolution. Counter changes now maintain progress/timer/font reconciliation only.
- Stable host question identity no longer includes mutable progress or wrapper instance. When the adapter lacks one unambiguous host ID, it uses a strict wrapper/progress fallback that intentionally fails closed. Explicit DOM-generation ownership is completed in Phases 2–3.
- Timeout incorrect confirmation now updates finalization before deciding whether to schedule Next. The single advance path consults the active/finalized predicate both before scheduling and before invocation; confirmed final timeouts settle without Next.
- The browser-contract runner accepts `MM_BROWSER_CONTRACT` for focused account-free diagnostics while retaining the complete default suite.
- Phase 2 adds an atomic DOM question-context read containing logical identity, identity kind, root/wrapper generations, combined DOM generation, progress, resolution, and node ownership from one adapter sample.
- Every answer timer now carries immutable `TimerOwnership`: session generation, question generation, logical identity, identity kind, root/wrapper/DOM generations, exact nodes, timer generation, arm time, duration, and monotonic deadline.
- Expiration receives the exact owner armed in the combo compositor. Rejection can only clear that same owner, so a stale callback cannot stop newer timer presentation.
- Same-logical wrapper replacement is explicitly rearmed with a new timer generation. A live deadline is preserved; a replacement first observed after expiry gets one fresh full deadline instead of being failed by the stale timer.
- Timeout failure now requires the originating timer owner and validates it before every host-facing stage. Its `idle → scheduled → invoking → done` advance state is the sole Next owner; final completion, natural answers, cleanup, question/session changes, and DOM-generation changes cancel safely.
- The DOM adapter allows only the two known userscript-applied host decoration classes (`mm-bounce` and `mm-progress-glow`) when reading host context; other `mm-*`, `data-mm-owned`, and `mm-*` IDs remain excluded.

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
- `tests/unit/session-finalization.test.js`: unresolved final position, multi-question deduplication, final correct/incorrect, one-question completion, summary ownership, cleanup, rewind/re-answer, stale ownership, and same-route second-session isolation.
- `tests/integration/lifecycle-dom.test.js`: unresolved lifecycle completion is rejected.
- `tests/regression/timeout-failure.test.js`: finalization suppresses automatic Next after confirmed incorrect resolution.
- `tests/browser/run-browser-contract.js` and browser fixtures: production-bundle coverage for unresolved `1/2`, unresolved `2/2`, final correct, one-question finalization, final incorrect, final timeout without Next, cleanup cancellation, final rewind/re-answer, duplicate observer signals, and a clean same-route second session. The suite now has 11 Firefox/Safari-compatible contracts.
- `tests/regression/answer-timer-ownership.test.js`: immutable owner contents, DOM-before-lifecycle rejection, question/session generation changes, cleanup immediately before expiry, early/natural resolution, same-logical replacement rearm, post-deadline replacement policy, and stale-owner isolation.
- `tests/regression/timeout-failure.test.js`: original-owner requirement, no host effects on question-two or replacement DOM, natural-answer race, duplicate transaction serialization, exactly-once Next, final suppression, cleanup/question/session cancellation, and exact-input restoration.
- `tests/unit/combo-timer.test.js`: exact owner delivery at expiration and preservation of a newer timer across a superseded deadline.
- `tests/integration/lifecycle-dom.test.js`: atomic context, logical/DOM-generation separation, conflicting-ID failure, strict fallback identity, and host-context readability during owned transient decoration.

## Manual Validation

- Manual Checkpoint A: not yet presented.
- Manual Checkpoint B: not yet presented.
- Manual Checkpoint C: not yet presented.

## Deferred Items

- Safari account-free browser contracts: attempted on 2026-07-12, but Safari reported that “Allow remote automation” is disabled. No persistent browser setting was changed.
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
