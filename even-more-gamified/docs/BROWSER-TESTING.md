# Local Firefox and Safari contracts

The browser-contract suite runs the generated production userscript in installed
Firefox and Safari against a local MaruMori-shaped fixture. It never opens
`marumori.io`, uses no credentials, and cannot modify a real review account.

These contracts supplement Vitest by exercising the bundled IIFE, browser event
ordering, real layout/visibility checks, MutationObserver delivery, history
wrapping, reload persistence, and timer behavior.

## Contracts

The same five scenarios run in both browsers:

1. bundle boot, one HUD, and exact-route cleanup/remount;
2. correct/incorrect processing across question-wrapper replacement;
3. confirmed final-answer rewind and summary cancellation;
4. HUD-setting persistence and same-root host-session remount;
5. real ten-second timeout failure with exactly one Wrong and one Next action.

The fixture disables audio, remote fonts, and nonessential visuals. Actual
userscript-manager APIs, audible output, live MaruMori markup, resource loading,
and subjective visual quality remain part of the short manual smoke pass.

## Run Firefox

Firefox must be installed under `/Applications/Firefox.app`. Selenium Manager
provisions geckodriver on the first run and may need network access for that one-time
setup.

```sh
npm run test:browser:firefox
```

Firefox can run headlessly when desired:

```sh
MM_BROWSER_HEADLESS=1 npm run test:browser:firefox
```

## Run Safari

Safari provides `/usr/bin/safaridriver`, but Remote Automation is disabled by
default. Enable it deliberately in Safari:

1. Open Safari → Settings → Advanced and enable web-developer features if needed.
2. Open Develop → Developer Settings.
3. Enable **Allow remote automation**.

Alternatively, after reviewing the security implication, run:

```sh
safaridriver --enable
```

Then run:

```sh
npm run test:browser:safari
```

Remote Automation permits local WebDriver clients to control Safari. Disable the
setting again after testing if it is not otherwise needed.

## Run both

```sh
npm run test:browser
```

The browsers run sequentially. Safari is always headed. Set
`MM_BROWSER_KEEP_OPEN=1` while debugging to leave a failed browser session open;
otherwise every session is closed automatically.

Failure screenshots are written to the operating system's temporary directory and
their paths are printed with the failure. They are not written into the repository.

## Release use

The browser suite is intentionally separate from `npm run check`: it opens GUI
browsers, Safari requires a local permission, and first-run Firefox driver setup may
need the network. Run it before a release candidate is manually smoke-tested:

```sh
npm ci
npm run check
npm run test:browser
```

Passing these contracts does not establish userscript-manager or authenticated
MaruMori parity. Complete the remaining manager/audio/resource/visual checks in
[Manual testing](./MANUAL-TESTING.md).
