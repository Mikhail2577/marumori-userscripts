# Releasing

The release artifact is generated from `src/`; the root-level legacy userscript
remains a comparison reference. Do not replace or delete that reference as part of
a routine release.

## 1. Confirm the starting state

```sh
git status --short
git diff --stat
npm ci
```

Identify unrelated local changes before generating artifacts. Do not discard or
overwrite them.

## 2. Update the version

Update `package.json` and `package-lock.json` without creating a tag automatically:

```sh
npm version <new-version> --no-git-tag-version
```

Set the same `@version` in [`build/metadata.mjs`](../build/metadata.mjs), and add
the release notes to [`CHANGELOG.md`](../CHANGELOG.md). The metadata version is
canonical for the installed userscript and is not inferred from `package.json`.

## 3. Update immutable asset pins when needed

Production `@resource` URLs must never point at a mutable branch such as `main`.
The current GitHub URLs contain a full 40-character commit revision.

If either file under [`assets/`](../assets/) changes:

1. Land the asset in the release history so it has an immutable commit SHA.
2. Obtain that exact revision with `git rev-parse HEAD`.
3. Replace the revision in both `@resource` lines in
   [`build/metadata.mjs`](../build/metadata.mjs).
4. Replace the same revision in the direct image fallbacks in
   [`src/config/themes.js`](../src/config/themes.js).
5. Confirm the URLs use the correct repository path and return the intended image.
6. Run `rg -n "raw.githubusercontent.com|@resource" build src` and verify that no
   production asset URL uses a branch, short SHA, or different revision.

If the images did not change, keep the existing pin. A version bump does not
require repinning unchanged assets.

## 4. Run the release gate

```sh
npm run check
```

This command checks the preserved legacy syntax, lint, tests, production build,
metadata/bundle security rules, generated syntax, and formatting. The production
build is readable and removes any development `.map` left in `dist/`.

If documentation or release notes changed after the gate, rerun it. `npm run check`
already performs the final `npm run build`; running `npm run build` again is safe
but should not change the output.

On the macOS release machine, also run the account-free Firefox/Safari contracts:

```sh
npm run test:browser
```

See [Local browser testing](./BROWSER-TESTING.md) for the one-time Safari Remote
Automation setting and Firefox driver setup. These GUI tests remain separate from
`npm run check` by design.

## 5. Inspect metadata and generated output

```sh
sed -n '1,28p' build/metadata.mjs
sed -n '1,28p' dist/marumori_even_more_gamified.meta.js
sed -n '1,34p' dist/marumori_even_more_gamified.user.js
npm run validate:build
node --check dist/marumori_even_more_gamified.user.js
```

Confirm:

- metadata begins at byte zero;
- name, namespace, version, match, grants, resources, icon, license, author,
  download URL, and update URL are intended;
- both image resources use immutable revisions;
- the `.meta.js` file contains only metadata;
- the generated notice follows metadata;
- no development source-map reference remains in the production userscript.

## 6. Review the complete change

```sh
git diff --check
git status --short
git diff --stat
git diff -- build/metadata.mjs src tests package.json package-lock.json README.md docs
git diff -- dist/marumori_even_more_gamified.meta.js
git diff -- dist/marumori_even_more_gamified.user.js
```

The generated userscript diff can be large; review its metadata first, then inspect
the bundled sections corresponding to changed source modules. Verify that the
preserved root-level script did not change unintentionally:

```sh
git diff -- marumori_even_more_gamified.user.js
```

## 7. Validate in browsers

Install only
[`dist/marumori_even_more_gamified.user.js`](../dist/marumori_even_more_gamified.user.js)
and complete the [manual browser checklist](./MANUAL-TESTING.md). Record the browser,
version, manager, manager version, MaruMori route, and date for each run.

Do not claim parity from automated tests alone. Rewind, timeout controls, Web Audio
activation, Font Challenge network/CSP behavior, SPA remounting, and visual
backgrounds require authenticated real-browser validation.

## 8. Publish

Publish the reviewed production `.user.js` and `.meta.js` through the repository's
normal distribution channel. Ensure the hosted download/update URLs serve those
exact files and the published metadata version matches the release. Tag or commit
only according to the maintainer's normal release policy.
