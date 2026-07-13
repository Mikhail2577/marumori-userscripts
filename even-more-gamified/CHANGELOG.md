# Changelog

All notable changes to `MaruMori Even More Gamified - Updated` are documented here.

## Unreleased

### Fixed

- Pointed generated download/update metadata at this repository's canonical
  `main`-branch artifacts and added OpenAI Codex to the author attribution.
- Restored mounting on the live review page by recognizing `#time-me` as the
  review-session container instead of incorrectly requiring the sibling answer
  wrapper to be inside the `#main` question prompt.
- Kept Font Challenge prompt discovery scoped to the active review while
  supporting both current `#main > span` and `#main .main_form` prompt variants.
- Updated the DOM and real-browser fixtures to preserve the live sibling layout
  and prevent the incorrect nesting from passing regression tests again.

## 2026-07-10 - v3.9.0

### Added

- Added the `NIGHT VIEW` image-backed theme using
  [`assets/nightview.png`](./assets/nightview.png), with moonlit valley
  colors, silver-blue HUD surfaces, lantern-gold accents, firefly particles,
  moon/lantern glow overlays, drifting mist, and shooting stars.
- Added Night View-specific sound, floating text, particle, combo,
  celebration, and ambient music presets.

### Changed

- Bumped the userscript version to `3.9.0`.
- Extended the image-backed background path so both `SHRINE` and `NIGHT VIEW`
  can still render as static artwork when reduced motion or Lite profile
  disables animation.

## 2026-07-09 - v3.8.0

### Added

- Added per-theme celebration choreography presets for arcade pop, starfield
  orbit, nebula bloom, grid scan bursts, Game Center jackpot, shrine drift,
  Matrix glitch, and Void pulse motions.
- Added compact Theme Preview buttons in Settings for testing correct, wrong,
  combo, milestone, timeout, word-clear, and session-complete presentation
  effects without changing review state.
- Added a `Preview All` theme preview sequence and console-only preview state
  invariant warnings for catching accidental score/combo/timer mutations.
- Added a startup theme registry self-check that warns if a theme references
  a missing sound, particle, combo, celebration, music, or color preset key.
- Added a lightweight theme-aware music foundation that routes the existing
  Music toggle through ambient, pulse, chiptune, bell, and near-silent presets.
- Added temporary theme-specific answer-box accent overlays that never modify
  MaruMori's native input or focus.

### Changed

- Theme intensity now independently scales particles, particle spread, flash
  strength, SFX gain, shake, and celebration density while still respecting
  `MAX`, `BALANCED`, `LITE`, visual, SFX, music, and reduced-motion settings.
- Renamed the Settings music row to `Music Mode`; Default still cycles
  `LO-FI`/`RETRO`, while theme-specific music displays its active mode.
- Bumped the Shrine backdrop resource cache key to `v3.8.0`.
- Tightened in-place audit quality paths: stored settings/records now share
  safe JSON parsing, preview checks use compact record signatures, rewind
  snapshots avoid stringify/parse cloning, temporary visual effect cleanup is
  centralized, queued music restarts are cleared on stop, and repeated audio
  errors are console-throttled.

## 2026-07-09 - v3.7.0

### Added

- Added a data-driven Theme Personality System foundation with theme
  definitions, preset registries, and a central `ThemeManager`.
- Added theme-aware CSS variables for HUD, settings, timer, banners, flashes,
  floating text, progress accents, and summary UI.
- Added bounded DOM particles for current gameplay presentation events:
  correct, incorrect, word complete, multiplier up, milestone, combo break,
  timeout, and session complete.
- Added procedural theme-aware sound presets while keeping the existing shared
  Web Audio tone path.
- Added per-theme UI surface materials, floating feedback labels, banner
  motion styles, and synth note slides/detune so each theme has a clearer
  personality beyond its background art.

### Changed

- Background selection and pinned theme restoration now route through
  `ThemeManager` while preserving the existing `backgroundTheme` persistence
  model.
- Theme identity now influences feedback colors, sounds, small particles,
  combo banners, celebration symbols, and shake intensity without changing
  scoring, XP, timer, rewind, or MaruMori answer flow.
- Theme styling now reaches the HUD, settings panel, summary panel, scanlines,
  native answer input glow, review card brackets, and top counter treatment.

## 2026-07-09 - v3.6.2

### Changed

- Restored first-item timer grace: the first review prompt waits for the first
  typed character, then every later prompt starts immediately whether the first
  attempt succeeded or failed.
- Kept timed XP inactive during that initial grace period so waiting before the
  first keystroke cannot consume or award timer time.
- Made `Screen Flash` control success feedback and `Failure Flash` control
  failure feedback independently.
- Enabled `Failure Flash` during the v3.6.2 settings migration and delayed its
  success-strength red overlay slightly so it remains visible as a secondary
  response after MaruMori marks an answer incorrect. It can still be disabled
  afterward.

## 2026-07-09 - v3.6.1

### Changed

- Made the optional failure flash match the success flash's opacity and
  duration while retaining its red failure color.

## 2026-07-09 - v3.6.0

### Added

- Added persistent `Answer Timer`, `Timed XP Bonus`, and `Timeout Failure`
  settings.
- Added timer duration presets for 10, 15, 30, 45, 60, and 90 seconds, with
  loaded values safely clamped from 5 to 120 seconds.
- Divided the HUD timer into five exact 20% segments with distinct
  Lightning, Fast, Steady, Close, and Barely states.
- Added speed-based XP multipliers that scale down as configured timer
  duration increases.
- Added compact timed-XP feedback to the existing answer popup and collapsed
  HUD notice.

### Changed

- The answer timer now starts when every prompt appears, including the first
  prompt, so waiting before typing cannot inflate speed rewards.
- Renamed the old `Timeout Fail` setting to `Timeout Failure` and retained its
  conservative native submit/failure path.
- Migrates persisted `comboTimeout` and `autoFailTimeout` values to the new
  timer settings.
- Timer XP uses the monotonic deadline at answer detection rather than the
  latest painted bar width, preventing late rewards at low frame rates or
  after a hidden tab.
- Rewind restores the original score and starts a fresh timer attempt without
  allowing duplicate awards.
- `MAX`, `BALANCED`, and `LITE` continue to change only timer paint frequency;
  timed XP calculations are identical in every profile.

## 2026-07-09

### Changed

- Bumped the userscript version to `3.5.2`.
- Disabled full-screen failure flashes by default with a separate persisted
  `Failure Flash` setting.
- Kept incorrect-answer shake, sound, floating text, input tint, and HUD danger
  feedback while removing the body-wide chromatic and dim pulses.
- Reworked the former `CRT Theme` setting into independent `CRT Effects`.
- CRT now controls only scanlines, vignette, flicker, and phosphor glow; turning
  it off leaves the HUD, selected background, particles, themes, and base arcade
  styling active.
- Keeps CRT overlays stable while answers resolve instead of briefly removing
  them and brightening the page during feedback.
- Migrated the previous `arcadeEnabled` value to `crtEnabled`.
- Automatically suppresses CRT effects in `LITE` while preserving the saved CRT
  preference for `BALANCED` and `MAX`.
- Added persistent `MAX`, `BALANCED`, and `LITE` visual profiles:
  - `MAX` synchronizes canvas and timer animation with the display refresh rate.
  - `BALANCED`, the default, preserves the original effect density while capping
    canvas rendering at 60 FPS and the timer at 30 FPS.
  - `LITE` uses 70% canvas resolution, 12 FPS backgrounds, and a 5 FPS timer
    while reducing particles, popup frequency, full-page effects, procedural
    music, blur, shadows, and challenge webfonts.
- Migrated the previous Performance Mode setting to `LITE`.
- Paused canvas rendering completely while the tab is hidden.
- Narrowed correctness and counter observers to their review elements and
  batched the remaining SPA-wide mutation reconciliation.
- Debounced canvas/HUD resize work, throttled record persistence, debounced
  volume persistence, and removed layout thrashing while dragging the HUD.
- Stops already-scheduled music oscillators when music is paused or torn down.
- Suspends the shared Web Audio context after idle feedback and while review
  audio is inactive.
- Added a persistent collapse control to the draggable HUD.
- Added a compact glass HUD showing score, combo, multiplier, word streak, and
  XP bonus, with a two-row narrow-screen layout.
- Added brief score, multiplier, streak, and combo-reset notices beside the
  collapsed HUD.
- Kept the answer timer visible above the compact HUD stats.
- Replaced the shrine artwork with a golden-hour mountain scene featuring a
  torii, rope bridge, Mount Fuji, waterfalls, and a sea of clouds.
- Retuned the shrine's lantern glow positions and falling particles for the new
  composition.

## 2026-07-08

### Added

- Bumped the userscript version to `3.4.1` so managers detect this update.
- Renamed the userscript to `MaruMori Even More Gamified - Updated`.
- Added a first-answer timer grace period:
  - The initial review item starts with the timer paused.
  - The timer begins when the user enters the first character in the answer field.
  - All later review items in the session are timed immediately.
- Added optional procedural background music, disabled by default:
  - Subtle `LO-FI` and `RETRO` soundtrack styles.
  - Independent music volume control.
  - Self-contained Web Audio synthesis with no external audio files.
  - Starts after a browser-approved user interaction.
  - Fades out on session completion and pauses while the tab is hidden.
  - Expanded Lo-fi progression and melody variation to reduce repetition.
- Added a draggable HUD with saved position.
- Added a `RESET HUD POSITION` settings action.
- Added local/system fallback fonts for the arcade HUD.
- Added reduced-motion support for animations, flashes, shakes, banners, and floating effects.
- Added a Rewind system:
  - HUD `REWIND` button.
  - State snapshots before correct/incorrect answers.
  - Restore support for score, combo, multiplier, word streak, session stats, and rolling records.
  - Native redo/undo click detection.
  - Backspace undo detection.
- Added rolling 7-day records:
  - Best score.
  - Best combo.
  - Best multiplier.
  - HUD `7D BEST` display.
  - `RESET 7D RECORDS` settings action.
- Added per-word timer behavior so every unresolved word starts with an active timer.
- Added `Timeout Fail` difficulty option.
- Added `Font Challenge` difficulty option:
  - Randomizes the reviewed item font.
  - Hover temporarily reveals the original font.
  - Click rerolls the font.
  - Shift-click locks/unlocks the current challenge font.
  - Supports local Japanese fonts and selected Google webfonts.
- Added difficulty XP bonus display in the HUD.
- Added XP scaling for difficulty options:
  - `Timeout Fail`: `x1.25`.
  - `Font Challenge`: `x1.15`.
  - Combined: approximately `x1.44`.
- Added a background theme selector:
  - `DEFAULT`.
  - `STARFIELD`.
  - `NEBULA`.
  - `GRID`.
  - `GAME CENTER`.
  - `SHRINE`.
  - `MATRIX`.
  - `VOID`.
- Added pinned background defaults:
  - `PIN CURRENT BACKGROUND` makes the active background the default for future sessions.
  - `USE PINNED BACKGROUND` restores that pinned background immediately.
- Added nebula cloud rendering.
- Added retro perspective grid rendering.
- Added matrix backdrop rendering.
- Reworked starfield, nebula, and grid scenes so each has distinct
  scene-specific rendering.
- Added shooting stars.
- Added word-clear shooting star triggers.
- Expanded word-clear celebrations from 8 emoji variants to 27 celebration variants.
- Added four celebration animation styles:
  - `pop`.
  - `rise`.
  - `spin`.
  - `burst`.
- Added a painterly `SHRINE` background resource with a Shinto shrine, Zen
  garden, subtle lantern breathing, camera drift, and sparse maple petals.
- Added a static `SHRINE` rendering path for reduced-motion users.

### Changed

- Correct-answer scoring now uses combo multiplier plus active difficulty multipliers.
- Correct-answer XP is rounded to the nearest 10.
- The combo/timer bar now represents the active answer timer, even when combo is zero.
- The old starfield-only canvas was generalized into a multi-theme arcade backdrop renderer.
- Rebuilt `STARFIELD` as a dense galactic star field and removed the foreground planets.
- Rebuilt `NEBULA` with localized emission clouds, fine filaments, embedded star
  clusters, and irregular dust pockets.
- Added subtle breathing motion and independently drifting light wisps to `NEBULA`.
- Added sparse, short-lived sparkle flares to random bright stars in `STARFIELD`.
- Added a procedural Japanese `GAME CENTER` theme with perspective arcade
  cabinets, animated screens, Japanese neon signs, ceiling lights, floor
  reflections, and moving aisle lights.
- Reduced `GAME CENTER` visual intensity by removing the central marquee,
  shrinking and reducing the cabinet rows, quieting the room geometry and
  reflections, and darkening the focus area behind review content.
- Rebuilt `GRID` as a fuller 80s synthwave scene with a striped sunset,
  twinkling stars, layered neon wireframe mountains, palm silhouettes, an
  animated perspective floor, and glowing runway rails.
- Increased `NEBULA` motion amplitude and wisp visibility so its animation
  remains perceptible behind the review interface.
- Cached detailed space textures so each animation frame only composites the scene
  and updates a small number of twinkling stars.
- Settings are now normalized on load to avoid bad persisted values.
- Volume and combo timeout values are clamped to safe ranges.
- Settings side effects now immediately update visuals, HUD state, and difficulty bonus display.
- The settings panel follows the draggable HUD position.
- The HUD default position is raised so it blocks less of the MaruMori review content.

### Fixed / Hardened

- Added promise-aware shrine resource loading with a verified direct-CORS fallback
  for userscript managers that return an unusable `GM_getResourceURL` value.
- Fixed opaque `STARFIELD` and `NEBULA` canvases covering MaruMori's review
  content by isolating the body stack and placing the backdrop in a true negative layer.
- CRT overlays now pause on MaruMori answer/result screens; `VOID` keeps a quiet
  dark result mode, while animated canvas backgrounds keep a half-strength backdrop.
- Added safer userscript settings parsing with fallback defaults.
- Added safer rolling-record parsing and pruning.
- Added native input value setting for timeout auto-fail compatibility with framework-controlled inputs.
- Added fallback submit behavior for timeout auto-fail:
  - Visible button lookup.
  - Input-wrapper click hotspot.
  - Enter key dispatch.
  - Form `requestSubmit`.
- Restores the previous input value if timeout auto-fail cannot resolve the answer.
- Cleans up observers, timers, animation frames, drag state, font challenge state, and arcade overlays when leaving review pages.
- Avoids re-injecting duplicate styles and UI elements.

### Dev / Repo

- Moved the userscript into its own project directory:
  - `even-more-gamified/`.
- Added npm project metadata.
- Added ESLint configuration for userscript globals.
- Added `npm test` checks:
  - `node --check marumori_even_more_gamified.user.js`.
  - `eslint marumori_even_more_gamified.user.js`.
- Added project README.
- Added root repository README for a multi-userscript MaruMori repo.
- Added root `LICENSE` file using WTFPL, matching the original userscript license.
