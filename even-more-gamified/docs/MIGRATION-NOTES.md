# Modular migration notes

The root-level userscript remains the working behavioral reference. The modular
implementation builds separately into `dist/` and preserves existing storage keys,
defaults, scoring intent, theme identity, and userscript metadata.

Automated tests validate the extracted contracts and generated output. This
migration has **not** by itself demonstrated full parity in authenticated
Tampermonkey or Violentmonkey sessions; the remaining browser work is listed in
[Manual testing](./MANUAL-TESTING.md).

## Intentional defect fixes

These are deliberate behavior changes rather than visual or gameplay redesigns.

### Separate prompt and completed-item ownership

MaruMori expands vocabulary and kanji items into reading/meaning prompts, while
its `0 / N` counter advances only when all remaining layouts for one item are
cleared. Answer scoring is therefore owned by prompt resolution; word streak,
word-clear feedback, and `WORDS DONE` are owned only by a positive completed-item
counter edge. Known layout classes distinguish sibling prompts even when the host
reuses one wrapper. Incorrect same-layout retries start a fresh attempt generation
without resetting the session.

Coverage: [`tests/unit/session-finalization.test.js`](../tests/unit/session-finalization.test.js),
[`tests/integration/lifecycle-dom.test.js`](../tests/integration/lifecycle-dom.test.js),
and the production-bundle contracts under [`tests/browser/`](../tests/browser/).

### Transactional rewind

Previously, local score/combo state could be restored after a click or fixed delay
even when MaruMori had not rewound. Rewind now captures session/question ownership,
enters a pending state, invokes only a verified native capability, and waits for the
same resolved question to become unresolved. It commits once after confirmation,
cancels on timeout/identity change/cleanup, deduplicates programmatic/native intent,
and cancels a pending final summary only on a confirmed commit. Snapshot restoration
does not restart the combo timer; the single post-confirmation owner restarts it
exactly once.

Coverage: [`tests/regression/rewind.test.js`](../tests/regression/rewind.test.js)
and [`tests/integration/lifecycle-dom.test.js`](../tests/integration/lifecycle-dom.test.js).

### Authoritative records, timer migration, and HUD recovery

Reset Records now rewrites the records component of captured, pending, and
late-recovery rewind snapshots. Gameplay state remains rewindable, but deleted
seven-day records cannot return; an unusable snapshot is discarded fail-closed.
Legacy `comboTimeout` milliseconds and current `timerSeconds` values normalize to
5–120 seconds, with absent, null, blank, nonnumeric, and nonfinite legacy values
using the 15-second default.

Disabling the HUD now hides its subtree semantically rather than with opacity. A
small native-button Settings launcher remains outside the hidden HUD, transfers
focus safely, supports persisted `hudEnabled: false`, and has one cleanup/remount
owner.

Coverage: [`tests/integration/record-reset.test.js`](../tests/integration/record-reset.test.js),
[`tests/unit/settings.test.js`](../tests/unit/settings.test.js),
[`tests/integration/first-input-gate.test.js`](../tests/integration/first-input-gate.test.js),
and [`tests/unit/hud-controller.test.js`](../tests/unit/hud-controller.test.js).

### Serialized timeout failure

Timeout failure previously had multiple delayed paths that could submit or advance
twice, outlive the question, or select a global control. One controller now owns
the transaction. It scopes Wrong/Submit/Next capabilities to the active root,
waits for confirmed incorrect resolution, schedules Next exactly once, cancels all
delays on ownership loss, and restores injected input only on the originating
unresolved question. When no trustworthy capability exists, it fails closed.

Coverage:
[`tests/regression/timeout-failure.test.js`](../tests/regression/timeout-failure.test.js).

### Transactional first-input timer gate

Only the first session timer waits for non-empty input. The gate is now consumed
only after an immutable timer owner and compositor start successfully; transient
DOM rejection leaves it armed for another input event. Gate reconciliation also
retargets a newly current input even when MaruMori leaves the previous input
connected but hidden. After the first timer starts or the first prompt resolves,
every subsequent reading/meaning/retry prompt starts its timer immediately on the
prompt transition.

Coverage:
[`tests/integration/first-input-gate.test.js`](../tests/integration/first-input-gate.test.js)
and the production-bundle timer contract under [`tests/browser/`](../tests/browser/).

### Explicit lifecycle and same-route remount

Session and question states now have monotonic generations and cleanup scopes.
Delayed work checks its owner. Changed review path/query, a new review root, a
changed host session token, or unresolved backwards progress requests a full
remount; an ambiguous counter regression waits for a pending rewind to settle.
Summary cancellation and hidden/cleanup paths cannot carry score, combo, rewind
snapshots, timeout clicks, observers, or inactive music into a new session.

Coverage:
[`tests/integration/lifecycle-dom.test.js`](../tests/integration/lifecycle-dom.test.js),
[`tests/regression/navigation.test.js`](../tests/regression/navigation.test.js),
[`tests/integration/first-input-gate.test.js`](../tests/integration/first-input-gate.test.js),
and [`tests/unit/session-boundary.test.js`](../tests/unit/session-boundary.test.js).

### Fail-closed DOM adaptation and observer scope

MaruMori discovery is centralized. The adapter rejects userscript-owned, hidden,
stale, disabled, unrelated, slider, and ambiguous elements; capabilities revalidate
against the active review root before clicking. Narrow counter/resolution observers
request one shared idempotent reconciliation. The route observer is connected only
while relevant, prefers the review root, coalesces mutation bursts, ignores changes
made entirely of `mm-*` nodes, and retains a bounded route watchdog for resilience.

Coverage:
[`tests/integration/lifecycle-dom.test.js`](../tests/integration/lifecycle-dom.test.js)
and [`tests/regression/navigation.test.js`](../tests/regression/navigation.test.js).

### Web Audio unlock and scheduling

Audio creation/resume remains synchronous with a user activation where required,
but concurrent attempts are deduplicated and `resume()` is awaited. Music starts
only with a running context. Unlock listeners remain until success; suspended,
interrupted, closed, hidden, disabled, cleanup, zero-volume, and frozen-time paths
stop or avoid scheduling. The SFX-on or positive-volume settings gesture can unlock
audio before observer-originated answer feedback, and delayed SFX oscillators are
tracked and stopped on hide, cleanup, SFX disable, or zero SFX volume. A reusable
context is retained where the browser permits.

Coverage:
[`tests/regression/audio-lifecycle.test.js`](../tests/regression/audio-lifecycle.test.js),
[`tests/unit/audio-policy.test.js`](../tests/unit/audio-policy.test.js), and
[`tests/unit/tone-scheduler.test.js`](../tests/unit/tone-scheduler.test.js).

### Exact Font Challenge restoration and bounded cache

Font Challenge now records whether the inline `font-family` property existed, its
exact value, and its priority. Disable, hover reveal, target replacement, and
cleanup restore that exact state rather than writing a computed font back as a new
`!important` rule. Stored font names are allowlisted. Webfont load/error is owned,
failure falls back locally, and only a small current/locked/recent stylesheet cache
is retained.

Coverage:
[`tests/regression/font-challenge.test.js`](../tests/regression/font-challenge.test.js).

### CRT overlay isolation

Continuous CRT flicker moved from `body` to the dedicated `#mm-crt-tint` overlay.
Screen shake and chromatic effects can therefore transform the page independently,
reduced motion disables flicker, and cleanup removes owned overlays.

Coverage: [`tests/unit/crt.test.js`](../tests/unit/crt.test.js).

### Compositor timer bar

The layout-affecting per-frame width loop was replaced by `transform: scaleX()`
through WAAPI or a CSS transition. JavaScript schedules only speed-tier boundaries
and expiration; a one-frame CSS fallback setup is not a paint loop. Hidden HUDs
skip visual interpolation. Scoring still reads monotonic timestamps and does not
trust animation events.

Coverage:
[`tests/unit/combo-timer.test.js`](../tests/unit/combo-timer.test.js).

### Calendar-day record pruning

The seven-day window now constructs local calendar dates rather than subtracting
fixed 24-hour intervals, preserving intended calendar-day semantics across DST
changes. Expired-day removal is also marked dirty and persisted even when today's
best value did not improve.

Coverage: [`tests/unit/records.test.js`](../tests/unit/records.test.js).

### Theme preset composition and duplicate application

Event presets now merge `base`, root event defaults, nested `events.default`, and
the specific event in a defined order. Base motion, font, shadow, and color reach
consumers. Resolved theme definitions and last-applied CSS presentation are
memoized so an answer transition does not rewrite unchanged variables.

Coverage:
[`tests/unit/theme-presets.test.js`](../tests/unit/theme-presets.test.js),
[`tests/unit/theme-config.test.js`](../tests/unit/theme-config.test.js), and
[`tests/unit/theme-manager.test.js`](../tests/unit/theme-manager.test.js).

### Transient animation replay

Replayable transient effects use an owned animation helper where practical,
reducing read/write/read forced-reflow patterns while retaining cleanup and timing.
Measurements that are necessary for placement remain explicit.

Coverage:
[`tests/unit/animation-replay.test.js`](../tests/unit/animation-replay.test.js) and
[`tests/unit/transient-effects.test.js`](../tests/unit/transient-effects.test.js).

### Canvas allocation and pixel budgets

The renderers remain on the main thread, with each theme implemented in a focused
module behind the shared canvas lifecycle controller. Resolved theme state and
static decisions are cached, live arrays are compacted in place, resize is
debounced, hidden tabs suspend loops, and generation tokens invalidate stale
frames. Profile-specific backing-pixel budgets cap 4K memory growth before reducing CSS presentation quality:
1,500,000 (`LITE`), 3,686,400 (`BALANCED`), and 8,294,400 (`MAX`). No worker or
OffscreenCanvas dependency was added.

Balanced mode now advances one monotonic cadence deadline after every accepted
frame and skips missed deadlines without catch-up draws. Synthetic 60, 90, 120,
144, 165, and 240 Hz timelines remain within the documented roughly 60 FPS cap.

Canvas scheduling now has non-destructive activity ownership separate from full
resource cleanup. Session completion retains the last frame while cancelling all
future scheduling; summary close cannot resume it, and confirmed final rewind or a
new active session resumes exactly one generation.

Live `prefers-reduced-motion` changes are owned by one session listener. Canvas and
transient presentation respond immediately, while the combo timer samples one
monotonic instant and rebuilds interpolation/boundary work from the remaining time.
It does not pause, extend, rearm, or replace timer ownership.

Coverage:
[`tests/unit/canvas-runtime.test.js`](../tests/unit/canvas-runtime.test.js),
[`tests/unit/canvas-background-controller.test.js`](../tests/unit/canvas-background-controller.test.js),
[`tests/unit/combo-timer.test.js`](../tests/unit/combo-timer.test.js),
[`tests/unit/media-query.test.js`](../tests/unit/media-query.test.js),
and [`tests/regression/source-invariants.test.js`](../tests/regression/source-invariants.test.js).

### Keyboard and modal accessibility

Both settings ranges now have stable, unique IDs and explicit labels. Userscript
buttons and ranges expose a visible theme-aware keyboard outline through
`:focus-visible` without adding pointer-focus decoration.

The session summary is now a dedicated modal controller. It provides dialog and
heading semantics, focuses Continue, traps Tab in both directions, prevents
background focus, and snapshots/restores the exact background `inert` and
`aria-hidden` state. Repeated open/close, final rewind, route cleanup, hidden HUD,
and remount paths share the same restoration ownership.

Coverage:
[`tests/unit/settings-panel.test.js`](../tests/unit/settings-panel.test.js),
[`tests/unit/summary-dialog.test.js`](../tests/unit/summary-dialog.test.js),
[`tests/regression/rewind.test.js`](../tests/regression/rewind.test.js), and the
account-free browser contracts.

### Backing-coordinate effects and image fallback privacy

Shooting stars use the actual capped backing canvas for spawn, trails, updates,
and culling. A resize clears transient stars whose coordinates belong to the old
surface. This keeps Balanced rendering visible when a 4K CSS viewport is backed by
a smaller pixel-budget surface.

Shrine and Night View preserve `GM_getResourceURL` as their primary image path.
Their one-shot direct fallback assigns anonymous CORS and `no-referrer` before
`src`, preventing the MaruMori page URL from becoming the fallback request
referrer without introducing another request.

Coverage:
[`tests/unit/shooting-stars.test.js`](../tests/unit/shooting-stars.test.js) and
[`tests/unit/background-image-loading.test.js`](../tests/unit/background-image-loading.test.js).

### Immutable resources and exact routing

Production image resource and direct fallback URLs use a full immutable commit
revision instead of a mutable branch. Build validation rejects mutable GitHub
resource pins and executable resources. Review matching uses a pathname boundary
rather than a loose substring, preventing similarly named unrelated routes from
mounting the script. Confirmed dead timer/observer state was removed as ownership
moved into controllers.

Coverage:
[`tests/build/build-userscript.test.js`](../tests/build/build-userscript.test.js)
and [`tests/regression/navigation.test.js`](../tests/regression/navigation.test.js).

### Reproducible, non-mutating release verification

`package.json` is now the single version source for both generated artifacts.
Production checks reject package/user/meta version drift and source-map leakage.
The release verifier builds the complete source twice under a temporary directory,
validates both results, compares them with each other and committed `dist/`, then
cleans up on success or failure. `npm run check` no longer rebuilds stale artifacts;
`npm run build` is the explicit writer.

Coverage:
[`tests/build/build-userscript.test.js`](../tests/build/build-userscript.test.js)
and [`tests/build/verify-release.test.js`](../tests/build/verify-release.test.js).

## Font Challenge network and privacy

The userscript has no remote executable dependency. `SHRINE` and `NIGHT VIEW` are
non-executable image resources. Font Challenge is disabled by default, but enabling
it outside `LITE` may request an allowlisted CSS font stylesheet from Google Fonts,
subject to the manager, browser CSP, network policy, and Google's handling of the
request. Link elements use `referrerPolicy="no-referrer"`, failures fall back to a
local allowlisted font, and cleanup removes the session-owned cache.

Users who do not want font-network requests can leave Font Challenge disabled or
use `LITE`, which selects local fonts.

## Deliberately unchanged behavior

- Existing storage keys and normalization/migration paths remain readable.
- Score, multiplier, grade, timer tiers, timed-XP caps, and timer presets retain
  their intended calculations.
- The HUD/settings interaction, audio character, visual theme identity, background
  list, default settings, and reduced-motion intent were not redesigned.
- Synchronous `GM_*` storage APIs remain the supported contract; asynchronous
  `GM.*` APIs were not added implicitly.
- Production remains readable and non-minified.

## Remaining browser verification

Real MaruMori markup can change independently of fixtures. The following cannot be
closed by jsdom/build tests alone:

- current native Wrong/Submit/Next/rewind labels and resolved-class transitions;
- the final-answer/summary timing used by the live application;
- user-activation and interrupted AudioContext behavior in each browser/manager;
- CSP and privacy behavior for optional Google Fonts and userscript image resources;
- visual parity, animation timing, canvas load, and memory at 1080p/4K;
- drag geometry and overlay stacking in the live MaruMori layout;
- repeated authenticated sessions and history transitions on the deployed SPA.
- an identical-URL/root/counter restart when MaruMori exposes no changed host
  session token; fixtures cannot distinguish that from an ordinary wrapper rerender.

Until the [manual checklist](./MANUAL-TESTING.md) is recorded for the supported
matrix, describe the result as automated-contract validated, not full browser
parity.
