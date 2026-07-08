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
- CRT theme with scanlines, starfield, nebula, grid, void mode, and shooting stars.
- Expanded word-clear celebration variants.
- Reduced-motion support.
- Local/system arcade font fallback.

## Background Themes

The settings panel includes a `Background` cycle button:

- `STARFIELD`
- `NEBULA`
- `GRID`
- `VOID`

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

The userscript metadata declares `WTFPL`, matching the existing script header.
