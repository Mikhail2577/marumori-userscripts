# MaruMori Even More Gamified

An arcade-style userscript for MaruMori review sessions. It adds scoring, combos,
timed XP, rewind, a draggable HUD, procedural audio, Font Challenge, CRT effects,
and themed backgrounds without requiring npm or a module loader after installation.

## Install

1. Install a userscript manager such as Tampermonkey or Violentmonkey.
2. Open the generated
   [`dist/marumori_even_more_gamified.user.js`](./dist/marumori_even_more_gamified.user.js).
3. Install that file in the manager.
4. Start a review at `https://marumori.io/study-lists/reviews`.

## Highlights

- Persistent, draggable arcade HUD with compact mode.
- Score, combo, multiplier, accuracy, word streak, timed XP, and seven-day records.
- Transactional rewind through the HUD, MaruMori's native control, or Backspace.
- Configurable answer timer with five speed tiers and optional timeout auto-failure.
- Procedural sound effects and `LO-FI` or `RETRO` Web Audio music.
- Font Challenge with local and allowlisted optional web fonts.
- `DEFAULT`, `STARFIELD`, `NEBULA`, `GRID`, `GAME CENTER`, `SHRINE`,
  `NIGHT VIEW`, `MATRIX`, and `VOID` backgrounds.
- Independent CRT, flash, shake, floating-text, celebration, and reduced-motion
  controls.
- Existing `mmSettings`, `mmRecords`, and `mmLockedChallengeFont` storage remains
  compatible.

The `SHRINE` and `NIGHT VIEW` images are declared as non-executable userscript
resources and pinned to an immutable Git commit. Font Challenge can optionally
request allowlisted stylesheets from Google Fonts; see
[Migration notes](./docs/MIGRATION-NOTES.md#font-challenge-network-and-privacy).

## Timed XP and performance profiles

The answer timer defaults to 15 seconds. The first prompt waits for the first
typed character; subsequent prompts start immediately. Correct answers move from
`Lightning` through `Barely` bonuses as monotonic time elapses. Incorrect or
expired answers receive no timed bonus. Timer presets are 10, 15, 30, 45, 60,
and 90 seconds.

The timer fill is compositor-driven with `transform: scaleX()`. JavaScript wakes
at speed-tier boundaries and expiration rather than repainting a layout-affecting
width at a profile-specific frame rate. Scoring reads timestamps and does not
depend on animation completion.

- `MAX` uses the full effect budget, the largest canvas backing-pixel budget, and
  every available animation frame.
- `BALANCED` is the default. It uses a reduced transient-effect budget, a roughly
  60 FPS canvas ceiling, and a 3,686,400-pixel backing budget.
- `LITE` uses a reduced effect density, a 1,500,000-pixel canvas budget, 70% render
  scale where possible, and roughly 12 FPS for animated canvas backgrounds. It
  also skips several optional continuous or remote-font effects.

All three profiles use the same timestamp-based timer and score calculations.

## Development

Requires Node.js 24 or newer.

```sh
npm install
npm run build
npm run build:dev
npm run build:debug
npm run test
npm run check
```

- `src/` is authoritative.
- `npm run build` generates the daily userscript under `dist/`.
- `npm run build:debug` generates the local debug userscript at
  `dist/debug/marumori_even_more_gamified.debug.user.js`, with Theme Preview
  controls and a source map.
- `dist/debug/` is intentionally ignored; it is a local testing artifact, not a
  published update channel.
- Generated files must not be edited by hand.

The daily and debug userscripts have separate manager identities and storage. Do
not enable both on the same page: disable the daily script while using the debug
build.

See [Development](./docs/DEVELOPMENT.md),
[Architecture](./docs/ARCHITECTURE.md), and
[Releasing](./docs/RELEASING.md) for the complete workflow.

The generated production bundle can also run through account-free contracts
in installed Firefox and Safari. See
[Local browser testing](./docs/BROWSER-TESTING.md).

## Compatibility status

The build targets ES2020 and current Chrome, Firefox, and Chromium Edge. The
intended manager scope is Tampermonkey and, where practical, Violentmonkey. Safari
and WebKit userscript managers are best-effort.

The migration is covered by automated unit, integration, regression, build, and
syntax checks. It has **not** established full parity in authenticated real-browser
MaruMori sessions. Each release must run the
[manual browser checklist](./docs/MANUAL-TESTING.md), including the manager/browser
matrix, before making a parity claim.

## Documentation

- [Architecture and lifecycle](./docs/ARCHITECTURE.md)
- [Development and generated-file ownership](./docs/DEVELOPMENT.md)
- [Release process](./docs/RELEASING.md)
- [Manual browser checklist](./docs/MANUAL-TESTING.md)
- [Local Firefox and Safari contracts](./docs/BROWSER-TESTING.md)
- [Migration notes and intentional fixes](./docs/MIGRATION-NOTES.md)
- [Changelog](./CHANGELOG.md)

## License

The userscript metadata declares `WTFPL`; the repository includes the full text in
[../LICENSE](../LICENSE).
