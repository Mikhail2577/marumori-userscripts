# Changelog

All notable changes to `MaruMori Even More Gamified - Updated` are documented here.

## 2026-07-09

### Changed

- Bumped the userscript version to `3.5.1`.
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
