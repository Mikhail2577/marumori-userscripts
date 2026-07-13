# Development

## Requirements

- Node.js 24 or newer, as declared in [`package.json`](../package.json).
- npm.
- A userscript manager and authenticated MaruMori account only for manual browser
  validation.

Install the exact dependency tree for a clean checkout with `npm ci`. Use
`npm install` when intentionally updating dependencies or following the basic
local setup:

```sh
npm install
```

## Commands

```sh
npm run build
npm run build:dev
npm run test
npm run test:watch
npm run test:browser:firefox
npm run test:browser:safari
npm run test:browser
npm run lint
npm run format
npm run format:check
npm run verify:release
npm run check
```

| Command                  | Purpose                                                                                                                        |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| `npm run build`          | Creates a readable production IIFE and metadata file under `dist/`; removes a stale development map.                           |
| `npm run build:dev`      | Creates the same installable shape with retained function names and an external `.user.js.map`.                                |
| `npm run test`           | Runs the Vitest unit, integration, regression, and build suites once.                                                          |
| `npm run test:watch`     | Runs Vitest in watch mode.                                                                                                     |
| `npm run test:browser`   | Builds and runs the account-free production-bundle contracts in installed Firefox and Safari.                                  |
| `npm run lint`           | Lints source, build scripts, tests, configs, and the preserved legacy script.                                                  |
| `npm run format`         | Formats source CSS/JavaScript, build/test/config files, and project Markdown.                                                  |
| `npm run format:check`   | Checks formatting without changing files.                                                                                      |
| `npm run verify:release` | Builds the real source twice in temporary directories, validates both artifacts, and compares them byte-for-byte with `dist/`. |
| `npm run check`          | Runs legacy syntax, lint, all tests, non-mutating release verification, generated syntax validation, and formatting checks.    |

`npm run build` is the only release command that updates `dist/`. `npm run check`
is deliberately non-mutating: it fails when committed artifacts are absent or
stale instead of repairing them. Run focused tests while developing, then run
`npm run build` followed by the full check before handing off an artifact.

## Source and generated-file ownership

- Edit [`src/`](../src/), [`build/`](../build/), tests, configuration, or
  documentation.
- Never hand-edit files under [`dist/`](../dist/). Rebuild them.
- Never use the root-level
  [`marumori_even_more_gamified.user.js`](../marumori_even_more_gamified.user.js)
  as the modular source. It is the preserved working reference and is checked for
  syntax, but excluded from the bundle.
- Do not run the legacy and generated userscripts together; both target the same
  page and storage keys.
- Keep storage-key compatibility unless a deliberate migration and regression test
  accompany a change.

Production output is intentionally readable rather than minified for debugging and
userscript-host review. Development output adds an external source map. Both modes
place the metadata block at byte zero and the generated-file warning immediately
after it.

## Test layout

- [`tests/unit/`](../tests/unit/) covers pure calculations, normalization,
  presentation controllers, and bounded runtime helpers.
- [`tests/integration/`](../tests/integration/) combines lifecycle state with
  realistic minimal review DOM fixtures.
- [`tests/regression/`](../tests/regression/) protects ownership-sensitive rewind,
  timeout, audio, font, navigation, and remount behavior.
- [`tests/build/`](../tests/build/) checks metadata, single-IIFE output, syntax,
  source maps, CSS bundling, immutable resources, and forbidden executable forms.
- [`tests/fixtures/`](../tests/fixtures/) supplies MaruMori DOM and fake Web Audio
  contracts where jsdom cannot model a browser subsystem faithfully.

Use observable state, DOM, scheduling, and cleanup behavior in new tests. Avoid
pixel snapshots for canvas unless a stable rendering harness is introduced.

The separate browser-contract suite uses Selenium WebDriver and a local fixture;
it never contacts MaruMori. Firefox and Safari setup, scope, and debugging options
are documented in [Local browser testing](./BROWSER-TESTING.md).

## Build outputs

```text
dist/
├── marumori_even_more_gamified.user.js
├── marumori_even_more_gamified.meta.js
└── marumori_even_more_gamified.user.js.map  # development only
```

The installable script contains bundled JavaScript and CSS. `SHRINE` and
`NIGHT VIEW` remain explicitly declared non-executable image resources. There is
no runtime npm dependency, module loader, code splitting, or remote executable
JavaScript.

## Working discipline

Before a change:

```sh
git status --short
npm run check
```

After a change:

```sh
npm run check
git diff --check
git status --short
git diff --stat
```

Use the [manual browser checklist](./MANUAL-TESTING.md) for changes that touch the
host DOM, timing, Web Audio, visual rendering, storage migration, or userscript
manager behavior. Automated jsdom tests do not establish real-browser parity.
