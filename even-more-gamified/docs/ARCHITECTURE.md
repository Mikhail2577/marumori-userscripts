# Architecture

MaruMori Even More Gamified is authored as ES modules and built into one readable,
strict-mode IIFE. The installed userscript has no runtime module loader, npm
dependency, code splitting, or remote executable JavaScript.

## Ownership and invariants

- [`src/`](../src/) is the authoritative implementation.
- [`src/index.js`](../src/index.js) is the bundle entry point.
- [`dist/marumori_even_more_gamified.user.js`](../dist/marumori_even_more_gamified.user.js)
  and [`dist/marumori_even_more_gamified.meta.js`](../dist/marumori_even_more_gamified.meta.js)
  are generated artifacts.
- [`marumori_even_more_gamified.user.js`](../marumori_even_more_gamified.user.js)
  is the preserved legacy behavior reference and fallback. It is not a build input.
- Persistent keys remain `mmSettings`, `mmRecords`, and
  `mmLockedChallengeFont`.
- Delayed gameplay work must carry session/question ownership and be cancellable.
- Uncertain host DOM is resolved centrally and fails closed; gameplay code must
  not guess at global controls.

## Module map

| Area                                            | Responsibility                                                                                                                         |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| [`src/index.js`](../src/index.js)               | Minimal build entry point.                                                                                                             |
| [`src/app.js`](../src/app.js)                   | Composition root. It samples review state and wires the focused gameplay, platform, presentation, audio, and background controllers.   |
| [`src/config/`](../src/config/)                 | Defaults, constants, theme/audio registries, aliases, preset composition, and memoized theme presentation.                             |
| [`src/core/`](../src/core/)                     | Explicit session/question state transitions, monotonically increasing generations, owned cleanup scopes, and coalesced reconciliation. |
| [`src/adapters/`](../src/adapters/)             | MaruMori DOM discovery, exact-route SPA navigation, synchronous GM storage, and Web Audio context state.                               |
| [`src/gameplay/`](../src/gameplay/)             | Pure scoring/grades/records and owned first-input, rewind, and timeout transactions.                                                   |
| [`src/audio/`](../src/audio/)                   | SFX, generated music scheduling, unlock, visibility, and cleanup lifecycle.                                                            |
| [`src/ui/`](../src/ui/)                         | Bundled base CSS, HUD lifecycle/drag/presentation, settings-panel wiring, and the compositor-focused combo timer.                      |
| [`src/effects/`](../src/effects/)               | CRT overlays plus owned shake, flash, floating text, banner, particle, celebration, accent, and replayable animation lifecycles.       |
| [`src/backgrounds/`](../src/backgrounds/)       | Canvas lifecycle, bundled arcade CSS, sizing/pixel budgets, shared drawing primitives, and focused modules for each theme renderer.    |
| [`src/font-challenge/`](../src/font-challenge/) | Font allowlist, exact inline-style restoration, optional stylesheet lifecycle, and bounded cache.                                      |
| [`src/storage/`](../src/storage/)               | Stable keys and settings normalization/migration.                                                                                      |
| [`src/utils/`](../src/utils/)                   | Small DOM, scheduling, JSON, and numeric helpers.                                                                                      |
| [`tests/`](../tests/)                           | Unit, fixture-backed integration, regression, and generated-build tests.                                                               |

`src/app.js` is deliberately an explicit integration shell rather than a second
framework. HUD/settings presentation, theme resolution, audio synthesis, transient
effects, and canvas renderers own their internal listeners, timers, and cleanup in
focused modules; the shell supplies current settings and gameplay callbacks.

## Session and question lifecycle

The lifecycle controller owns two related state machines.

```text
session:  inactive -> mounting -> active -> completed -> cleaning-up -> inactive
question: inactive -> awaiting-first-input -> awaiting-answer
                                      |-> resolved-correct --|
                                      |-> resolved-incorrect |-> rewinding -> awaiting-answer
                                      `----------------------|-> inactive
```

Each mount increments `sessionGeneration`; each accepted question identity
increments `questionGeneration`. `LifecycleScope` owns listeners, timeouts, and
cleanup callbacks. A callback runs only while its captured generation is current.

MaruMori's counter is a completed-item counter that starts at `0 / N`. Reading and
meaning are separate answer prompts, but the counter advances only after the last
remaining sibling layout for an item is cleared. A positive counter edge is
therefore the sole word-completion trigger. This keeps answer streak and word
streak ownership separate and counts each completed item, including the last one,
exactly once.

Session completion remains resolution-gated. `N / N` is a trustworthy host
item-completion signal, but the session-finalization controller also requires the
currently owned prompt to be confirmed as resolved before calling the lifecycle's
guarded `complete()` transition. Its delayed summary callback is owned by the
session generation, final prompt ownership, and a finalization token; cleanup or
confirmed rewind invalidates it.

The runtime flow is:

1. The navigation adapter recognizes the exact review path, installs a scoped
   observer/watchdog, and requests a mount.
2. The DOM adapter must identify one visible review root, input wrapper, valid
   text input, progress/counter, and stable question identity.
3. The lifecycle mounts, starts, and begins the first question in
   `awaiting-first-input`.
4. Narrow correctness and counter observers request one shared reconciler. They
   do not mutate score independently.
5. Reconciliation samples root, identity, progress, and resolution together,
   advances lifecycle state, then applies the answer once.
6. A new answer prompt starts a new question generation. Stable host item IDs are
   combined with MaruMori's known layout class. When no unambiguous host ID exists,
   wrapper generation plus layout provides a strict fallback. It survives a
   completed-item counter change on the same prompt but fails closed across wrapper
   replacement. A reading-to-meaning transition on one reused wrapper is therefore
   a new prompt, while an incorrect same-layout retry explicitly starts a new
   attempt generation. A changed review URL, review root, host session token, or
   unresolved backwards progress causes cleanup and a fresh session mount.
   URL/root/token boundaries remain authoritative even while rewind is pending.
7. Route exit, visibility/session teardown, or remount disposes observers,
   transactions, timers, audio scheduling, Font Challenge styling, transient
   effects, and HUD state owned by that session.

## Host boundary

[`src/adapters/marumori-dom.js`](../src/adapters/marumori-dom.js) is the only
place that interprets MaruMori controls. It rejects `mm-*`/`data-mm-owned`
elements, hidden or stale nodes, disabled controls, sliders, and ambiguous
matches. Controls are scoped to the active review root and exposed as capabilities
that revalidate ownership immediately before invocation.

The adapter returns `unknown` or `null` when its contract cannot be proven. This
can temporarily disable timer auto-failure or rewind after a MaruMori DOM change,
but it prevents clicking an unrelated global button.

On the current review page, `#time-me` is the session container. The question
prompt under `#main` and the `.input-wrapper` answer control are sibling branches
inside it; `#main` must not be treated as the review root.

## Owned transactions

Transactional rewind stores the pre-answer local snapshot and its session,
question, answer generation, prompt identity, DOM generation, root, progress,
and resolution. It invokes a verified native capability and commits the snapshot
only after the same logical question changes from resolved to unresolved. A
stable host ID permits wrapper replacement and progress regression; strict
fallback identity permits progress regression on the same wrapper but not wrapper
replacement.

The normal confirmation window is 750 ms. On timeout, local state stays answered
and the lifecycle returns to resolved, but one guarded recovery candidate remains
for a further bounded 2 seconds. It can restore exactly once only for the same
session, question, answer generation, root, and logical identity. Different
questions/sessions, newer resolution, cleanup, fallback ambiguity, or the recovery
deadline discard it. A transition after that deadline never restores the stale
snapshot; reconciliation instead fails closed and may remount the live review to
avoid a permanent resolved/unresolved mismatch.

Timeout auto-failure is one serialized controller. It chooses a scoped Wrong
control or a scoped invalid-answer/Submit fallback, waits for confirmed incorrect
resolution, and owns the only delayed Next action. Injected text is restored only
while the original unresolved question still owns the input.

Each armed answer timer carries one immutable `TimerOwnership` record containing
the session/question generations, logical identity, review root, DOM generation,
timer generation, arm time, and monotonic deadline. Expiration receives that exact
record from the compositor and atomically revalidates it before any presentation or
host side effect. A same-logical wrapper replacement gets a new timer generation;
the original deadline is preserved while still live, while a replacement first
seen after expiry receives a fresh deadline rather than allowing the stale owner
to fail it.

Only the first timer in a mounted session is input-gated. Its listener is consumed
only after immutable timer ownership is successfully armed; a transient DOM or
ownership rejection leaves the gate available for retry. Once that first timer has
started—or the first prompt has resolved—every later reading, meaning, retry, or
next-item prompt receives a fresh timer immediately on its prompt transition,
without waiting for another keystroke or completed-item counter edge. A connected
but no-longer-current input is replaced as the gate target.

The timeout-failure transaction must be created from that original timer owner; it
does not recapture whichever question happens to be current. Ownership is checked
before Wrong, input injection, Submit, incorrect confirmation, Next scheduling,
Next invocation, and input restoration. One transaction state owns advancement,
and confirmed final completion suppresses it.

## Timer, audio, effects, and backgrounds

The combo timer stores monotonic timestamps for scoring. Its visual fill uses
`transform: scaleX()` through WAAPI or a CSS transition and schedules JavaScript
only for tier boundaries and expiration. When the HUD is hidden, it schedules
expiration without visual animation.

The audio context adapter deduplicates unlock attempts and reports a context only
after `resume()` produces a running state. Music and SFX use that adapter; enabling
SFX consumes the settings gesture when necessary, while lifecycle listeners remain
until unlock succeeds. Owned music and SFX oscillators are cancelled on visibility
changes, cleanup, disable, or zero effective volume.

CRT flicker belongs to `#mm-crt-tint`; it does not animate `body`, so body-level
shake/chromatic effects remain independent. Reduced motion disables continuous
flicker. The transient-effects controller owns generated feedback nodes and
their removal timers; session cleanup cancels delayed failure flashes and class
animations before removing those nodes.

Canvas work remains on the main thread. A small lifecycle controller selects a
focused renderer module for each theme. The shared runtime uses profile-specific
backing pixel budgets, cached/memoized theme state and static work where available,
in-place array compaction, debounced resize, hidden-tab suspension, and generation
tokens. OffscreenCanvas and workers are deliberately not required.

## Build and security boundary

[`build/build-userscript.mjs`](../build/build-userscript.mjs) uses esbuild with an
ES2020 browser target, no splitting, and a CSS-inlining plugin. It prepends the
canonical metadata, generated-file warning, and strict directive before emitting
one IIFE.

[`build/validate-build.mjs`](../build/validate-build.mjs) parses metadata and the
executable AST. It rejects malformed metadata, unexpected grants/resources,
mutable GitHub resource revisions, `@require`, dynamic imports, runtime evaluators,
remote script elements/workers, and a non-IIFE bundle shape. The two external
image resources are non-executable and commit-pinned. Optional Google Fonts
stylesheets are allowlisted by Font Challenge and are not JavaScript.
