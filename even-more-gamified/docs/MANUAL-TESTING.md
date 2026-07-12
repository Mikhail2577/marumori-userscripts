# Manual browser test checklist

Automated tests protect calculations, ownership, cleanup, and build shape, but they
cannot prove compatibility with MaruMori's authenticated live DOM, userscript
manager injection, Web Audio activation, or visual output. Complete this checklist
against the generated production artifact before claiming browser parity.

Five production-bundle contracts now automate route cleanup, answer/wrapper
processing, final rewind, persistence/session remount, and serialized timeout in
installed Firefox and Safari without contacting MaruMori. Run
`npm run test:browser` as described in
[Local browser testing](./BROWSER-TESTING.md). The matching checklist entries below
still require a short live-manager smoke check, but no longer need destructive edge
case repetition on a personal account.

## Test record and support matrix

Record this for every run:

- Date:
- Commit/release:
- `@version`:
- Browser and version:
- Userscript manager and version:
- Operating system:
- Display size and device-pixel ratio:
- MaruMori route/session type:
- Reduced-motion setting:
- Existing or fresh storage profile:
- Console/network observations:

The matrix below is the intended scope, not a statement that the migration has
already passed it.

| Browser               | Tampermonkey                    | Violentmonkey            | Status expectation                                                             |
| --------------------- | ------------------------------- | ------------------------ | ------------------------------------------------------------------------------ |
| Current Chrome        | Primary target                  | Practical target         | Run full checklist in at least one manager; smoke-test the other.              |
| Current Chromium Edge | Primary target                  | Practical target         | Run full checklist in at least one manager; smoke-test the other.              |
| Current Firefox       | Target where manager APIs match | Primary practical target | Run full checklist in at least one manager; smoke-test the other if available. |
| Current Safari/WebKit | Manager-dependent               | Manager-dependent        | Best-effort only; record unavailable APIs and Web Audio/CSP differences.       |

The script deliberately uses synchronous `GM_getValue`, `GM_setValue`, and
`GM_getResourceURL`. A manager that supplies only asynchronous `GM.*` APIs is not
covered.

## Preparation and artifact integrity

- [ ] Run `npm ci` and `npm run check` from `even-more-gamified/`.
- [ ] Confirm the production build has no `.user.js.map` and no source-map URL.
- [ ] Install only
      [`dist/marumori_even_more_gamified.user.js`](../dist/marumori_even_more_gamified.user.js).
- [ ] Keep the root legacy reference disabled; never run both scripts together.
- [ ] Confirm the manager recognizes metadata at install/update time.
- [ ] Confirm name, version, match, author, icon, license, grants, update/download
      URLs, and both image resources are correct.
- [ ] Confirm the only grants are `GM_getValue`, `GM_setValue`, and
      `GM_getResourceURL`.
- [ ] Confirm no `@require`, runtime module-loader request, remote JavaScript, worker,
      `eval`, or `new Function` appears in the console/network log.
- [ ] Compare a clean-profile session with the preserved legacy reference in a
      separate profile. Do not enable both at once.
- [ ] Keep DevTools open and record exceptions, rejected promises, warnings, layout
      thrashing, and unexpected network requests.

## Route, mount, and lifecycle

- [ ] Visit an unrelated MaruMori page and confirm no HUD, observers, canvas, CRT
      overlays, audio, or Font Challenge styling mounts.
- [ ] Visit `/study-lists/reviews` and confirm one HUD/session mounts.
- [ ] Visit a valid nested review pathname, if MaruMori uses one, and confirm it
      mounts.
- [ ] Visit a similarly named unrelated pathname and confirm exact boundary matching
      prevents a mount.
- [ ] Start a review and confirm score, combo, multiplier, accuracy, word streak,
      timer, and session counters begin from their expected initial values.
- [ ] Replace/change the live question wrapper through normal app progression and
      confirm observers follow the current wrapper without duplicate answer handling.
- [ ] Navigate away with a timer, timeout, rewind, summary, effects, and music pending;
      confirm all stale callbacks, observers, clicks, audio, canvas, overlays, and
      Font Challenge styles are cancelled/removed.
- [ ] Navigate back and start a new review; confirm a clean mount with no old local
      gameplay state.
- [ ] Finish a session and start a second session at the same SPA URL; confirm fresh
      score/combo/timer/music/summary/rewind/timeout/observer state.
- [ ] Abandon an in-progress session and start another while MaruMori reuses the URL
      or review root; confirm a changed host token or reset counter triggers the same
      clean remount.
- [ ] Rapidly navigate away/back and use browser Back/Forward; confirm one active
      route observer and one mounted session.
- [ ] Hide and restore the tab during mount/remount; confirm reconciliation resumes
      without duplicate loops.
- [ ] Confirm userscript-owned HUD/effect mutations do not create a reconciliation
      storm in Performance/DevTools recordings.

## Stored settings and records

- [ ] Start with no stored values and confirm all documented defaults, including
      `BALANCED`, 15 seconds, timer/timed XP on, timeout failure off, music off,
      Font Challenge off, and `DEFAULT` background.
- [ ] Load an existing legacy `mmSettings` value and confirm boolean, volume, music,
      timer, HUD, background, and performance settings survive normalization.
- [ ] Verify legacy `arcadeEnabled`, `autoFailTimeout`, `comboTimeout`, and
      `performanceMode` values migrate to their current equivalents.
- [ ] Verify removed/aliased background IDs normalize to the documented fallback.
- [ ] Change every setting, reload, and confirm persistence without resetting
      unrelated fields.
- [ ] Drag and collapse the HUD, reload, and confirm `hudPosition` and
      `hudCollapsed` persist.
- [ ] Resize the viewport and confirm a saved HUD position is clamped into view.
- [ ] Load malformed/unknown storage data and confirm safe defaults rather than a
      startup failure.
- [ ] Confirm `mmSettings`, `mmRecords`, and `mmLockedChallengeFont` names are
      unchanged in manager storage.
- [ ] Complete answers across reloads and confirm seven-day score/combo/multiplier
      records persist.
- [ ] Test around a local DST boundary or with a controlled clock and confirm records
      retain seven local calendar days rather than seven fixed 24-hour intervals.
- [ ] Confirm storage writes are flushed on page hide/session cleanup and are not
      emitted continuously on every animation frame.

## Core gameplay and HUD

- [ ] Submit a correct answer and compare score, answer streak, multiplier, accuracy,
      timed XP, sounds, float, flash, shake, and HUD text with the reference.
- [ ] Submit an incorrect answer and compare penalty, combo reset, accuracy, no timed
      bonus, warning sound/tint/float/shake, and optional failure flash.
- [ ] Complete both parts of a multi-part word and verify word streak, word-complete
      sound, celebrations, and counters.
- [ ] Cross every multiplier milestone and verify multiplier calculation, banner,
      particles, and sound are emitted once.
- [ ] Cross word/answer milestones and verify the intended celebration variant and
      no duplicate theme application.
- [ ] Verify current and best score, streak, and multiplier records update only when
      improved.
- [ ] Toggle HUD visibility and compact mode; confirm gameplay/scoring continues and
      hidden HUD timer visuals stop doing visual work.
- [ ] Open/close settings repeatedly and click outside; confirm one panel, correct
      labels, no leaked listeners, and no accidental answer submission.
- [ ] Drag the HUD with mouse and available pointer/touch input; confirm smooth
      movement, persistence, bounds, and no text/input interference.
- [ ] Trigger summary after a mixed session and verify correct/incorrect counts,
      accuracy, score, best combo/multiplier, timed XP effects, and grade.
- [ ] Confirm a stale summary callback cannot appear in a new or rewound session.

## Answer timer and timed XP

- [ ] On the first prompt, wait without typing and confirm the timer remains gated.
- [ ] Type the first character and confirm the timer starts once.
- [ ] On every later prompt, confirm the timer starts immediately whether the prior
      first attempt was correct or incorrect.
- [ ] Exercise 10, 15, 30, 45, 60, and 90-second presets.
- [ ] Submit correct answers in `Lightning`, `Fast`, `Steady`, `Close`, and `Barely`
      tiers; verify label/color and timestamp-based multiplier.
- [ ] Confirm the bar drains through `transform: scaleX()` without per-frame width
      writes or tier callback spam.
- [ ] Confirm expiration fires once even if an animation event is missing, delayed,
      cancelled, or reduced-motion is enabled.
- [ ] Hide the HUD while timing and confirm scoring/expiration remain correct without
      visual interpolation work.
- [ ] Disable Answer Timer and confirm visual timing, timed XP, and timeout failure
      stop while other gameplay remains active.
- [ ] Disable only Timed XP and confirm timer/timeout display behavior remains while
      correct answers receive no timed bonus.
- [ ] Expire with Timeout Failure off; confirm no MaruMori control is clicked and the
      question remains available to answer.

## Timeout Failure transaction

- [ ] Enable Timeout Failure and expire a question with a visible native Wrong
      control; confirm incorrect resolution and one Next action.
- [ ] Exercise the scoped invalid-answer/Submit fallback when no Wrong control is
      present; confirm the original input is restored if resolution fails.
- [ ] Confirm penalty/incorrect state is applied exactly once and no timed XP is
      awarded.
- [ ] Click or resolve manually near expiration and confirm auto-failure does not
      double-submit or double-advance.
- [ ] Navigate, clean up, hide/replace the wrapper, or start a new question before
      confirmation/Next; confirm no stale click fires.
- [ ] Remove, hide, disable, duplicate, or ambiguously label Wrong/Submit/Next
      controls and confirm the adapter fails closed without selecting a global or
      userscript control.
- [ ] Confirm delayed Next is scheduled in one place and cannot fire twice after
      repeated DOM mutations.
- [ ] Disable Timeout Failure or Answer Timer while a transaction is pending and
      confirm cancellation.

## Rewind transaction

- [ ] After a correct answer, use the HUD rewind and confirm local score/combo/record
      display restores only after MaruMori returns that same question to unresolved.
- [ ] Repeat after an incorrect answer.
- [ ] Use MaruMori's native redo/undo/rewind control and confirm exactly one local
      restoration.
- [ ] Press Backspace and confirm it tracks native intent without duplicate
      programmatic processing.
- [ ] Trigger rapid HUD/native/Backspace intents and confirm one pending transaction
      and one commit.
- [ ] Remove, hide, disable, duplicate, or ambiguously label the native capability;
      confirm no local restoration and no success claim.
- [ ] Force native invocation to leave the answer resolved past the bounded timeout;
      confirm local state remains unchanged and the UI reports no committed rewind.
- [ ] Change question/root/session while rewind is pending; confirm cancellation and
      no snapshot leak into the new owner.
- [ ] Rewind the final answer while summary is pending; confirm a successful rewind
      cancels summary and resumes the session.
- [ ] Attempt a failed final-answer rewind; confirm the summary/local state is not
      falsely restored.

## Audio and visibility

- [ ] With sound enabled, make the first user gesture and confirm AudioContext unlock
      succeeds without requiring repeated accidental clicks.
- [ ] Block or delay `resume()` and confirm concurrent gestures deduplicate while
      unlock listeners remain armed until the context is actually running.
- [ ] Exercise a suspended/interrupted context if the browser exposes it; confirm
      music is not scheduled against frozen `currentTime` and can recover on a later
      gesture.
- [ ] Confirm correct, incorrect, word-complete, multiplier, rewind, and summary
      sounds retain their intended character and relative volume.
- [ ] Toggle SFX and its volume, including effective zero; confirm no audible work is
      scheduled when disabled/zero.
- [ ] Start a sound with delayed notes (for example, session-complete preview), then
      immediately disable SFX or move SFX volume to zero; confirm queued notes stop.
- [ ] Enable `LO-FI` and `RETRO`, switch between them, and verify generated music,
      independent volume, restart, and no external recording request.
- [ ] Toggle music off/on repeatedly and confirm one scheduler/gain path, no frozen
      active indicator, and no node accumulation.
- [ ] Hide the tab while SFX/music is active; confirm scheduling stops/fades and the
      context suspends according to the lifecycle.
- [ ] Restore the tab and confirm gesture/resume behavior is correct for that browser.
- [ ] End/navigate away from the session and confirm oscillators, gains, timers, and
      visibility/unlock listeners are cleaned up.

## Font Challenge

- [ ] Enable Font Challenge on a target with no inline `font-family`; disable it and
      confirm the property is absent again.
- [ ] Repeat with an inline value and with an inline `!important` value; confirm exact
      value and priority restoration.
- [ ] Hover to reveal the original, leave to restore the challenge font, click to
      rotate, and Shift-click to lock/unlock.
- [ ] Reload with a valid locked font and confirm it persists.
- [ ] Inject an invalid stored font and confirm it is cleared/normalized to the
      allowlist.
- [ ] Replace the target during a question/session and confirm the old target is
      restored before the new target is styled.
- [ ] Allow a webfont load and confirm the current target is updated without retaining
      an unbounded list of stylesheet links.
- [ ] Force stylesheet load failure/CSP blocking and confirm local-font fallback,
      usable text, and no repeated failing requests.
- [ ] Rotate through more fonts than the cache bound and confirm only the
      current/locked/recent small cache remains.
- [ ] Use `LITE` and confirm selection remains local with no Google Fonts request.
- [ ] Disable, navigate away, and finish the session; confirm listeners, links, and
      exact original inline styling are restored/removed.
- [ ] Record the optional Google Fonts request and privacy/CSP result for the tested
      manager/browser.

## CRT, transient effects, and reduced motion

- [ ] Enable CRT and inspect computed animation: flicker belongs to
      `#mm-crt-tint`, not `body`.
- [ ] Trigger light/hard shake in CRT mode and confirm body transforms/animations are
      visible and do not fight flicker.
- [ ] Toggle scanlines/CRT repeatedly and confirm one pair of owned overlays with
      correct stacking, pointer-event behavior, and cleanup.
- [ ] Enable operating-system reduced motion and confirm CRT flicker, continuous
      background motion, shooting stars, and optional transient movement are
      disabled or reduced as intended.
- [ ] Confirm correct/incorrect information remains understandable with motion
      reduced.
- [ ] Exercise success flash, failure flash, screen shake, floating feedback,
      particles, combo/multiplier banners, milestone banners, and all word-clear
      celebration variants.
- [ ] Rapidly replay transient effects and confirm animation restarts without a
      forced-reflow storm or retained effect nodes after their lifetime.
- [ ] Toggle each independent visual setting and confirm it does not disable unrelated
      gameplay or presentation.

## Backgrounds, themes, and resources

- [ ] Test `DEFAULT` and confirm no generated canvas backdrop obscures MaruMori.
- [ ] Test `STARFIELD`: density, galactic band, twinkle, flares, and shooting stars.
- [ ] Test `NEBULA`: clouds, filaments, wisps, dust pockets, and clusters.
- [ ] Test `GRID`: sunset, mountains, palms, stars, perspective grid, and motion.
- [ ] Test `GAME CENTER`: cabinets, signs, lights, framing, floor, and animation.
- [ ] Test `SHRINE`: image load through `GM_getResourceURL`, crop/resize, drift,
      lantern light, leaves, and static reduced-motion result.
- [ ] Test `NIGHT VIEW`: image load through `GM_getResourceURL`, crop/resize, moon and
      lantern bloom, mist, fireflies, shooting stars, and static reduced-motion result.
- [ ] Test `MATRIX`: glyph rendering, digital rain, sizing, and cleanup.
- [ ] Test `VOID`: expected absence/reduction of background and audio work.
- [ ] Cycle backgrounds during unresolved and resolved prompts; confirm one active
      renderer, correct CSS variables, no duplicate canvas, and no answer-state loss.
- [ ] Pin every background, reload/start a new session, and confirm the pin persists;
      use `USE PINNED BACKGROUND` to return to it.
- [ ] Confirm aliased/removed stored themes normalize without breaking startup.
- [ ] Inspect answer transitions and confirm unchanged theme CSS variables are not
      rewritten in bulk.
- [ ] Verify base floating-text motion/font/shadow/color reaches each event override.
- [ ] Block each image resource and confirm graceful fallback/no executable request.
- [ ] Confirm both production resource URLs contain the same full immutable commit
      revision as the direct fallback URLs.

## Performance and cleanup

- [ ] Profile idle CPU on `DEFAULT` and each animated background with no answers.
- [ ] Record observer callback/reconciliation rate during idle, typing, answer
      resolution, settings interaction, and userscript-only effects.
- [ ] Count active animation-frame loops and confirm no duplicates after background
      switches, route transitions, wrapper replacement, or same-route second session.
- [ ] Measure canvas frame time in `MAX`, `BALANCED`, and `LITE` at 1080p and 4K.
- [ ] Confirm backing canvas dimensions respect profile pixel budgets and remain
      visually acceptable when capped.
- [ ] Confirm `BALANCED` canvas work does not exceed its roughly 60 FPS ceiling and
      `LITE` stays near 12 FPS; do not apply these rates to timer scoring.
- [ ] Resize repeatedly and confirm resize work is debounced, static caches rebuild
      once, and stale generations stop drawing.
- [ ] Hide the tab and confirm canvas frames, visual timer interpolation, audio
      scheduling, and nonessential effects suspend.
- [ ] Trigger many petals, fireflies, shooting stars, and particles; confirm live
      arrays/nodes shrink after expiry and retained memory stabilizes.
- [ ] Record approximate retained heap after at least ten start/cleanup cycles and
      compare it with the initial post-cleanup heap.
- [ ] Inspect Web Audio node scheduling over several music bars and after disable,
      visibility change, and cleanup.
- [ ] Confirm production emits no continuous diagnostic logging or profiling output.

## Security and failure behavior

- [ ] Inspect all network requests: only expected MaruMori traffic, two pinned image
      resources, favicon/update endpoints, and optional allowlisted Google Fonts
      styles/font data should be attributable to the userscript.
- [ ] Confirm settings, theme IDs, font names, resource identifiers, and stored JSON
      are normalized or allowlisted before use.
- [ ] Enter special characters/markup in answer fields and confirm userscript feedback
      renders text rather than executable HTML.
- [ ] Confirm userscript controls are marked/recognized as owned and are never chosen
      as MaruMori Submit/Wrong/Next/rewind capabilities.
- [ ] Test ambiguous/missing host DOM and confirm the script warns concisely in
      development, avoids arbitrary clicks, and leaves MaruMori usable.
- [ ] Test restrictive CSP/network failure where practical and confirm optional
      fonts/images fail gracefully without weakening script policy.
- [ ] Confirm there is no telemetry, analytics, secret, token, broad `unsafeWindow`,
      unbounded cross-origin request, or insecure `postMessage` behavior.

## Release sign-off

- [ ] `npm run check` passes from a clean install.
- [ ] All required primary browser/manager rows have a recorded full or smoke run.
- [ ] No critical console errors, stale actions, double advancement, false rewind,
      unbounded loop/allocation, or security regression remains.
- [ ] Any visual or DOM differences from the legacy reference are explained as an
      intentional fix or recorded as a release blocker/risk.
- [ ] The exact tested artifact hash is recorded.
- [ ] Remaining browser-specific limitations are documented in release notes.

If any required row or scenario was not executed, report it as unverified. Do not
convert an automated test result into a real-browser parity claim.
