# Changelog

All notable changes to `MaruMori Even More Gamified - Updated` are documented here.

## 2026-07-08

### Added

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
  - `STARFIELD`.
  - `NEBULA`.
  - `GRID`.
  - `VOID`.
- Added nebula cloud rendering.
- Added retro perspective grid rendering.
- Added shooting stars.
- Added word-clear shooting star triggers.
- Expanded word-clear celebrations from 8 emoji variants to 27 celebration variants.
- Added four celebration animation styles:
  - `pop`.
  - `rise`.
  - `spin`.
  - `burst`.

### Changed

- Correct-answer scoring now uses combo multiplier plus active difficulty multipliers.
- Correct-answer XP is rounded to the nearest 10.
- The combo/timer bar now represents the active answer timer, even when combo is zero.
- The old starfield-only canvas was generalized into a multi-theme arcade backdrop renderer.
- Settings are now normalized on load to avoid bad persisted values.
- Volume and combo timeout values are clamped to safe ranges.
- Settings side effects now immediately update visuals, HUD state, and difficulty bonus display.
- The settings panel follows the draggable HUD position.
- The HUD default position is raised so it blocks less of the MaruMori review content.

### Fixed / Hardened

- CRT overlays and animated backgrounds now switch to a quiet dark result mode on
  MaruMori answer/result screens, then return when the next unresolved question appears.
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
