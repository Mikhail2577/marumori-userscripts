# Architecture

MaruMori Even More Gamified is authored as ES modules and built into readable,
strict-mode IIFEs. The published daily userscript and local debug userscript share
one source tree and differ only through a build-selected Theme Preview feature.
Neither installed artifact has a runtime module loader, npm dependency, code
splitting, or remote executable JavaScript.

## Ownership and invariants

- [`src/`](../src/) is the authoritative implementation.
- [`src/index.js`](../src/index.js) is the bundle entry point.
- [`dist/marumori_even_more_gamified.user.js`](../dist/marumori_even_more_gamified.user.js)
  and [`dist/marumori_even_more_gamified.meta.js`](../dist/marumori_even_more_gamified.meta.js)
  are generated artifacts.
- Persistent keys remain `mmSettings`, `mmRecords`, and
  `mmLockedChallengeFont`.
- Delayed gameplay work must carry session/question ownership and be cancellable.
- Uncertain host DOM is resolved centrally and fails closed; gameplay code must
  not guess at global controls.

## Module map

| Area                                            | Responsibility                                                                                                                             |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| [`src/index.js`](../src/index.js)               | Minimal build entry point.                                                                                                                 |
| [`src/app.js`](../src/app.js)                   | Composition root. It samples review state and wires the focused gameplay, platform, presentation, audio, and background controllers.       |
| [`src/config/`](../src/config/)                 | Defaults, constants, theme/audio registries, aliases, preset composition, and memoized theme presentation.                                 |
| [`src/core/`](../src/core/)                     | Explicit session/question state transitions, monotonically increasing generations, owned cleanup scopes, and coalesced reconciliation.     |
| [`src/adapters/`](../src/adapters/)             | MaruMori DOM discovery, exact-route SPA navigation, synchronous GM storage, and Web Audio context state.                                   |
| [`src/gameplay/`](../src/gameplay/)             | Pure scoring/grades/records and owned first-input, rewind, and timeout transactions.                                                       |
| [`src/audio/`](../src/audio/)                   | SFX, generated music scheduling, unlock, visibility, and cleanup lifecycle.                                                                |
| [`src/ui/`](../src/ui/)                         | Bundled base CSS, HUD lifecycle/drag/presentation, settings-panel wiring, modal summary ownership, and the compositor-focused combo timer. |
| [`src/effects/`](../src/effects/)               | CRT overlays plus owned shake, flash, floating text, banner, particle, celebration, accent, and replayable animation lifecycles.           |
| [`src/backgrounds/`](../src/backgrounds/)       | Canvas lifecycle, bundled arcade CSS, sizing/pixel budgets, shared drawing primitives, and focused modules for each theme renderer.        |
| [`src/font-challenge/`](../src/font-challenge/) | Font allowlist, exact inline-style restoration, optional stylesheet lifecycle, and bounded cache.                                          |
| [`src/storage/`](../src/storage/)               | Stable keys and settings normalization/migration.                                                                                          |
| [`src/debug/`](../src/debug/)                   | Build-selected enabled/disabled Theme Preview feature, local test controls, and preview-only CSS.                                          |
| [`src/utils/`](../src/utils/)                   | Small DOM, scheduling, JSON, and numeric helpers.                                                                                          |
| [`tests/`](../tests/)                           | Unit, fixture-backed integration, regression, and generated-build tests.                                                                   |

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

Reset Records is authoritative over every rewind state. It replaces only the
records component of a captured, pending, or late-recovery snapshot, preserving
the owned gameplay rewind while preventing explicitly deleted records from being
restored. If a snapshot cannot be updated safely, it is discarded fail-closed.
Record keys are accepted only when `YYYY-MM-DD` round-trips through the local
calendar and is not later than the explicit current local day. Rolling-window
cutoffs continue to use calendar construction rather than fixed 24-hour arithmetic,
and normalization repairs are persisted even when no best value improves.

Document-wide Backspace observation is filtered before it can arm a rewind
transaction. The current host context must still match the processed resolved
answer, and the event target must be the exact active answer input or active host
wrapper. Userscript controls, unrelated editables, contenteditable content,
unresolved prompts, and ambiguous context fail closed. The userscript never
prevents native deletion; accepted intent still commits only after host DOM
confirmation through the normal rewind controller.

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

HUD visibility is separate from Settings availability. A disabled HUD is removed
from layout, focus order, pointer interaction, and the accessibility tree with
`hidden`, `inert`, and `aria-hidden`; one controller-owned settings launcher remains
outside that subtree and is removed on cleanup. Legacy timer values are normalized
to the supported 5–120 second interval before a compositor can be started.

The summary is a controller-owned modal dialog with a stable labelled heading and
Continue action. It snapshots every background body child's prior `inert` and
`aria-hidden` state, owns focus while open, and restores both background state and
the previous viable focus target on close. Confirmed rewind and route cleanup use
the same close path, so a removed review cannot leave MaruMori inert. Range inputs
have stable label associations, and keyboard focus indication is scoped through
`:focus-visible` to the userscript's control families.

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

Shooting stars receive the selected backing canvas width and height explicitly;
their spawn points, trails, motion, and offscreen culling never infer backing
coordinates from the CSS viewport. Shrine and Night View first use their manager
resource URL, then make at most one direct image fallback with anonymous CORS and a
`no-referrer` policy assigned before `src`.

Balanced cadence is deadline-driven: every accepted frame advances the deadline
at least once and missed intervals are skipped arithmetically, preventing
high-refresh catch-up bursts. Canvas resource ownership is distinct from activity
ownership. Completion cancels scheduling but retains the canvas, renderer state,
and last frame; only a confirmed rewind or active new session can resume one loop.

One session-owned media-query subscription coordinates live reduced-motion
changes. Canvas activity is paused/resumed through the same session/visibility
gate, transient work is cancelled when reduction becomes active, and the combo
timer reconfigures only its compositor work. Its immutable timer owner and
monotonic deadline remain unchanged.

## Build and security boundary

[`build/build-userscript.mjs`](../build/build-userscript.mjs) uses esbuild with an
ES2020 browser target, no splitting, and a CSS-inlining plugin. It prepends the
canonical metadata, generated-file warning, and strict directive before emitting
one IIFE. `package.json` is the authoritative version source; both generated
artifacts receive that exact version through [`build/metadata.mjs`](../build/metadata.mjs).

The build resolves `#theme-preview` by flavor. Daily selects an inert module with
no controls or preview CSS. Debug selects the full simulator and writes a separate,
local-only identity under ignored `dist/debug/`. Flavor is independent from
production/development mode, so the release check remains daily-only while local
debug output can retain names and a source map.

[`build/validate-build.mjs`](../build/validate-build.mjs) parses metadata and the
executable AST. It rejects malformed metadata, unexpected grants/resources,
mutable GitHub resource revisions, `@require`, dynamic imports, runtime evaluators,
remote script elements/workers, and a non-IIFE bundle shape. The two external
image resources are non-executable and commit-pinned. Optional Google Fonts
stylesheets are allowlisted by Font Challenge and are not JavaScript.

Validator folding is deliberately syntax-local: string literals, fully static
templates, and static string `+` trees cover computed known-global evaluator/
`unsafeWindow` properties, script element names, and executable URLs. It does not
claim alias, scope, identifier-value, coercion, arbitrary runtime property, or
general dataflow analysis.

[`build/verify-release.mjs`](../build/verify-release.mjs) is the non-mutating
release boundary. It builds the complete real source twice in an OS temporary
workspace, validates both outputs, proves them deterministic, and byte-compares
both artifacts with `dist/` before cleaning the workspace in `finally`. Therefore
`npm run check` detects stale or absent committed output; only the explicit
`npm run build` command repairs it. Production validation also rejects source-map
directives and `.map` files, while development builds may retain their external map.

The repository CI runs `npm ci` and that same non-mutating check on Node.js 24 for
pushes and pull requests with read-only repository contents. Account/authenticated
GUI browser tests remain local and are not part of CI.
