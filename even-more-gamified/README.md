# MaruMori Even More Gamified - Updated

A personal fork/update of the MaruMori review-session userscript that adds extra arcade-style feedback, scoring, difficulty options, draggable HUD controls, and CRT-inspired visuals.

This is intended to be shared back with the original script author as an experimental enhancement branch.

## Install

1. Install a userscript manager such as Tampermonkey or Violentmonkey.
2. Open `marumori_even_more_gamified.user.js`.
3. Copy or install the script into your userscript manager.
4. Visit a MaruMori review session at `https://marumori.io/study-lists/reviews`.

## Highlights

- Draggable, persistent arcade HUD with a saved compact mode.
- Score, combo, multiplier, accuracy, word streak, XP bonus, and 7-day records.
- Rewind support for typo recovery via HUD button, native redo/undo, or Backspace.
- Configurable per-prompt timer with five speed tiers, timed XP, and optional
  Timeout Failure mode.
- Font Challenge difficulty mode with random Japanese fonts.
- Difficulty XP multipliers.
- Multiple procedural backgrounds, void mode, and shooting stars.
- Independent CRT effects that can be disabled without disabling themes or backgrounds.
- Optional procedural `LO-FI` and `RETRO` music with independent volume.
- Persistent `MAX`, `BALANCED`, and `LITE` visual profiles.
- Expanded word-clear celebration variants.
- Reduced-motion support.
- Local/system arcade font fallback.

## Background Themes

The settings panel includes a `Background` cycle button for the current session.
Use `PIN CURRENT BACKGROUND` to make that theme the default for future sessions,
or `USE PINNED BACKGROUND` to return to it immediately.

`DEFAULT` keeps MaruMori's normal background without a generated canvas backdrop.

- `DEFAULT`
- `STARFIELD` - a dense deep-space field with a subtle galactic band,
  twinkling stars, and occasional sparkle flares.
- `NEBULA` - layered emission clouds, luminous filaments, drifting wisps,
  dark dust pockets, and embedded clusters.
- `GRID` - an animated 80s synthwave scene with a striped sunset, neon
  wireframe mountains, palm silhouettes, stars, and a perspective runway.
- `GAME CENTER` - a subdued Japanese arcade interior with side-framed animated
  cabinets, restrained neon signs, hanging lights, and a perspective floor.
- `SHRINE` - a golden-hour mountain shrine framed by a torii, rope bridge,
  Mount Fuji, waterfalls, and a sea of clouds.
- `MATRIX` - falling Japanese glyphs and digital rain.
- `VOID`

## Music

Music is disabled by default. Enable it from the settings panel, choose `LO-FI` or
`RETRO`, and adjust its volume independently from sound effects. The soundtrack is
generated locally with Web Audio and uses no external recordings.

The `SHRINE` artwork is packaged as a userscript resource from
[`assets/shrine-garden.jpg`](./assets/shrine-garden.jpg). It adds subtle camera
drift, shrine-lantern breathing, and sparse falling golden leaves, and remains
static when reduced motion is enabled.

## Visual Profiles

The settings panel includes three persistent profiles. They never change
scoring, timers, rewind, difficulty bonuses, or core HUD feedback.

- `MAX` uses the display's native refresh rate and the original effect density.
- `BALANCED` is the default. It keeps the original effect density while capping
  canvas rendering at 60 FPS and the timer bar at 30 FPS.
- `LITE` uses 70% canvas resolution, 12 FPS backgrounds, and a 5 FPS timer while
  reducing particles, full-page effects, popup frequency, procedural music,
  blur, shadows, challenge webfont loading, and CRT overlays.

Incorrect answers keep their shake, sound, input tint, floating feedback, and
HUD warning. The optional `Failure Flash` is disabled by default and matches
the success flash's opacity and duration when enabled.

## Timed XP

The answer timer defaults to 15 seconds and starts as soon as each prompt
appears. Its five visible segments represent equal 20% portions of the selected
duration. Correct answers progress from `Lightning` through `Barely` bonuses as
the bar drains; incorrect or expired answers receive no timed bonus.

Timer presets are 10, 15, 30, 45, 60, and 90 seconds. Short timers preserve
more of each speed-tier reward, while longer timers reduce it. Timed XP stacks
with combo and difficulty multipliers, remains capped, and is rounded with the
existing score calculation. Disabling `Answer Timer` also disables timed XP and
timeout failure without changing other gameplay.

`Timeout Failure` uses the existing conservative native answer path and remains
disabled by default. `LITE` lowers only the bar's paint rate; it uses the same
timestamp-based XP calculation as `BALANCED` and `MAX`.

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for the release notes for this userscript.

## Development

Install dependencies:

```sh
npm install
```

Run checks:

```sh
npm test
```

This runs:

- `node --check marumori_even_more_gamified.user.js`
- `eslint marumori_even_more_gamified.user.js`

## License

The userscript metadata declares `WTFPL`, matching the existing script header. The repository includes the full license text in [../LICENSE](../LICENSE).
