# MaruMori Even More Gamified - Updated

A personal fork/update of the MaruMori review-session userscript that adds extra arcade-style feedback, scoring, difficulty options, draggable HUD controls, and CRT-inspired visuals.

This is intended to be shared back with the original script author as an experimental enhancement branch.

## Install

1. Install a userscript manager such as Tampermonkey or Violentmonkey.
2. Open `marumori_even_more_gamified.user.js`.
3. Copy or install the script into your userscript manager.
4. Visit a MaruMori review session at `https://marumori.io/study-lists/reviews`.

## Highlights

- Draggable, persistent arcade HUD.
- Score, combo, multiplier, accuracy, word streak, XP bonus, and 7-day records.
- Rewind support for typo recovery via HUD button, native redo/undo, or Backspace.
- Per-word timer behavior, including optional Timeout Fail mode.
- Font Challenge difficulty mode with random Japanese fonts.
- Difficulty XP multipliers.
- CRT theme with scanlines, multiple procedural backgrounds, void mode, and shooting stars.
- Optional procedural `LO-FI` and `RETRO` music with independent volume.
- Expanded word-clear celebration variants.
- Reduced-motion support.
- Local/system arcade font fallback.

## Background Themes

The settings panel includes a `Background` cycle button for the current session.
Use `PIN CURRENT BACKGROUND` to make that theme the default for future sessions,
or `USE PINNED BACKGROUND` to return to it immediately.

`DEFAULT` keeps MaruMori's normal background without a generated canvas backdrop.

- `DEFAULT`
- `STARFIELD` - a dense deep-space field with a subtle galactic band and sparse twinkling stars.
- `NEBULA` - layered emission clouds, luminous filaments, dark dust pockets, and embedded clusters.
- `GRID` - a retro synthwave horizon and perspective grid.
- `MATRIX` - falling Japanese glyphs and digital rain.
- `VOID`

## Music

Music is disabled by default. Enable it from the settings panel, choose `LO-FI` or
`RETRO`, and adjust its volume independently from sound effects. The soundtrack is
generated locally with Web Audio and uses no external recordings.

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
