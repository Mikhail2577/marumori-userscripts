// @vitest-environment node

import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { buildUserscript } from '../../build/build-userscript.mjs';
import {
    createUserscriptMetadata,
    GENERATED_NOTICE,
    OUTPUT_FILES,
    OUTPUT_FILES_BY_FLAVOR,
    PACKAGE_VERSION,
    USERSCRIPT_FLAVORS,
    USER_SCRIPT_METADATA,
    USER_SCRIPT_METADATA_BY_FLAVOR,
} from '../../build/metadata.mjs';
import {
    BuildValidationError,
    validateBuildArtifacts,
    validateMetadataBlock,
    validateUserscriptSource,
} from '../../build/validate-build.mjs';

const temporaryDirectories = [];
const THEME_PREVIEW_SENTINELS = Object.freeze([
    'THEME PREVIEW',
    'data-preview-event',
    '.mm-preview-btn',
    'Theme preview changed gameplay state',
]);

async function temporaryDirectory() {
    const directory = await mkdtemp(path.join(tmpdir(), 'mm-userscript-build-'));
    temporaryDirectories.push(directory);
    return directory;
}

function fixtureBundle(body = 'globalThis.__MM_BUILD_TEST__ = true;') {
    return `${USER_SCRIPT_METADATA}\n\n${GENERATED_NOTICE}\n"use strict";\n(() => {\n${body}\n})();\n`;
}

afterEach(async () => {
    await Promise.all(
        temporaryDirectories
            .splice(0)
            .map((directory) => rm(directory, { force: true, recursive: true })),
    );
});

describe('userscript build', () => {
    it('reproduces the same production artifact deterministically', async () => {
        const workspace = await temporaryDirectory();
        const firstOutdir = path.join(workspace, 'first');
        const secondOutdir = path.join(workspace, 'second');
        const entryPoint = path.join(workspace, 'index.js');
        const cssPath = path.join(workspace, 'styles.css');

        await writeFile(cssPath, '.fixture { color: rebeccapurple; }\n', 'utf8');
        await writeFile(
            entryPoint,
            "import cssText from './styles.css';\nglobalThis.__MM_BUILD_TEST__ = cssText;\n",
            'utf8',
        );

        await buildUserscript({ entryPoint, log: false, outdir: firstOutdir });
        await buildUserscript({ entryPoint, log: false, outdir: secondOutdir });

        const [firstBuild, secondBuild, metadata] = await Promise.all([
            readFile(path.join(firstOutdir, OUTPUT_FILES.userscript), 'utf8'),
            readFile(path.join(secondOutdir, OUTPUT_FILES.userscript), 'utf8'),
            readFile(path.join(firstOutdir, OUTPUT_FILES.metadata), 'utf8'),
        ]);

        expect(firstBuild).toBe(secondBuild);
        expect(firstBuild).toContain('.fixture { color: rebeccapurple; }');
        expect(metadata).toBe(`${USER_SCRIPT_METADATA}\n`);
        expect(validateUserscriptSource(firstBuild)).toBe(true);
    });

    it('rejects a dynamic import before writing an artifact', async () => {
        const workspace = await temporaryDirectory();
        const entryPoint = path.join(workspace, 'index.js');
        await writeFile(entryPoint, "import('./lazy.js');\n", 'utf8');

        await expect(
            buildUserscript({ entryPoint, log: false, outdir: path.join(workspace, 'dist') }),
        ).rejects.toThrow(/Dynamic import/u);
    });

    it('rejects unknown flavor names before building', async () => {
        const workspace = await temporaryDirectory();

        await expect(
            buildUserscript({ flavor: 'toString', log: false, outdir: workspace }),
        ).rejects.toThrow(/Unknown userscript flavor/u);
    });

    it('emits an external source map for development builds', async () => {
        const workspace = await temporaryDirectory();
        const entryPoint = path.join(workspace, 'index.js');
        const outdir = path.join(workspace, 'dist');
        await writeFile(entryPoint, 'globalThis.__MM_BUILD_TEST__ = true;\n', 'utf8');

        const result = await buildUserscript({
            entryPoint,
            log: false,
            mode: 'development',
            outdir,
        });

        const [userscript, sourceMap] = await Promise.all([
            readFile(result.userscriptPath, 'utf8'),
            readFile(result.sourceMapPath, 'utf8'),
        ]);
        expect(userscript).toContain(
            '//# sourceMappingURL=marumori_even_more_gamified.user.js.map',
        );
        expect(JSON.parse(sourceMap).sources).toHaveLength(1);
    });

    it('builds deterministic, flavor-isolated daily and debug artifacts', async () => {
        const workspace = await temporaryDirectory();
        const dailyOutdir = path.join(workspace, 'daily');
        const firstDebugOutdir = path.join(workspace, 'debug-first');
        const secondDebugOutdir = path.join(workspace, 'debug-second');

        const [dailyResult, firstDebugResult, secondDebugResult] = await Promise.all([
            buildUserscript({
                flavor: USERSCRIPT_FLAVORS.daily,
                log: false,
                mode: 'production',
                outdir: dailyOutdir,
            }),
            buildUserscript({
                flavor: USERSCRIPT_FLAVORS.debug,
                log: false,
                mode: 'development',
                outdir: firstDebugOutdir,
            }),
            buildUserscript({
                flavor: USERSCRIPT_FLAVORS.debug,
                log: false,
                mode: 'development',
                outdir: secondDebugOutdir,
            }),
        ]);

        const [dailySource, firstDebugSource, secondDebugSource, firstMap, secondMap] =
            await Promise.all([
                readFile(dailyResult.userscriptPath, 'utf8'),
                readFile(firstDebugResult.userscriptPath, 'utf8'),
                readFile(secondDebugResult.userscriptPath, 'utf8'),
                readFile(firstDebugResult.sourceMapPath, 'utf8'),
                readFile(secondDebugResult.sourceMapPath, 'utf8'),
            ]);

        for (const sentinel of THEME_PREVIEW_SENTINELS) {
            expect(
                dailySource,
                `Daily artifact contains debug sentinel: ${sentinel}`,
            ).not.toContain(sentinel);
            expect(
                firstDebugSource,
                `Debug artifact is missing preview sentinel: ${sentinel}`,
            ).toContain(sentinel);
        }
        expect(firstDebugSource).toBe(secondDebugSource);
        expect(firstMap).toBe(secondMap);
        expect(path.basename(dailyResult.userscriptPath)).toBe(OUTPUT_FILES.userscript);
        expect(path.basename(firstDebugResult.userscriptPath)).toBe(
            OUTPUT_FILES_BY_FLAVOR.debug.userscript,
        );
        expect(path.basename(firstDebugResult.metadataPath)).toBe(
            OUTPUT_FILES_BY_FLAVOR.debug.metadata,
        );
        expect(path.basename(firstDebugResult.sourceMapPath)).toBe(
            `${OUTPUT_FILES_BY_FLAVOR.debug.userscript}.map`,
        );
        expect(firstDebugSource).toContain(
            `//# sourceMappingURL=${OUTPUT_FILES_BY_FLAVOR.debug.userscript}.map`,
        );
        expect(firstDebugSource).toContain('// Edit files under src/ and run npm run build:debug.');
        await expect(
            validateBuildArtifacts({
                distDirectory: firstDebugOutdir,
                flavor: USERSCRIPT_FLAVORS.debug,
                production: false,
            }),
        ).resolves.toMatchObject({ userscriptPath: firstDebugResult.userscriptPath });
    });

    it('keeps ordinary module resolution daily-safe and makes debug builds explicit', async () => {
        const packageJson = JSON.parse(
            await readFile(new URL('../../package.json', import.meta.url), 'utf8'),
        );

        expect(packageJson.imports?.['#theme-preview']).toBe(
            './src/debug/theme-preview-disabled.js',
        );
        expect(packageJson.scripts?.['build:debug']).toBe(
            'node build/build-userscript.mjs --flavor=debug --mode=development',
        );
    });
});

describe('build validation', () => {
    it('derives canonical metadata from the authoritative package version', async () => {
        const packageJson = JSON.parse(
            await readFile(new URL('../../package.json', import.meta.url), 'utf8'),
        );
        const directives = validateMetadataBlock(USER_SCRIPT_METADATA);

        expect(PACKAGE_VERSION).toBe(packageJson.version);
        expect(directives.get('version')).toEqual([packageJson.version]);
        expect(directives.get('author')).toEqual(['matskye & Mikhail2577 & OpenAI Codex']);
        expect(directives.get('downloadURL')).toEqual([
            'https://raw.githubusercontent.com/Mikhail2577/marumori-userscripts/main/even-more-gamified/dist/marumori_even_more_gamified.user.js',
        ]);
        expect(directives.get('updateURL')).toEqual([
            'https://raw.githubusercontent.com/Mikhail2577/marumori-userscripts/main/even-more-gamified/dist/marumori_even_more_gamified.meta.js',
        ]);
        expect(validateUserscriptSource(fixtureBundle())).toBe(true);
    });

    it('uses an isolated, local-only identity for debug metadata', () => {
        const metadata = USER_SCRIPT_METADATA_BY_FLAVOR.debug;
        const directives = validateMetadataBlock(metadata, {
            flavor: USERSCRIPT_FLAVORS.debug,
        });

        expect(directives.get('name')).toEqual(['MaruMori Even More Gamified - Debug Preview']);
        expect(directives.get('namespace')).toEqual(['marumori-gamify-debug-preview']);
        expect(directives.get('version')).toEqual([PACKAGE_VERSION]);
        expect(directives.has('downloadURL')).toBe(false);
        expect(directives.has('updateURL')).toBe(false);
    });

    it('rejects metadata under the wrong flavor policy', () => {
        expect(() =>
            validateMetadataBlock(USER_SCRIPT_METADATA_BY_FLAVOR.debug, {
                flavor: USERSCRIPT_FLAVORS.daily,
            }),
        ).toThrow(/Daily metadata must contain exactly one @downloadURL/u);
        expect(() =>
            validateMetadataBlock(USER_SCRIPT_METADATA, {
                flavor: USERSCRIPT_FLAVORS.debug,
            }),
        ).toThrow(/Debug metadata must not contain an @downloadURL/u);
    });

    it('rejects metadata whose version differs from package.json', () => {
        const metadata = createUserscriptMetadata({ version: `${PACKAGE_VERSION}-mismatch` });

        expect(() => validateMetadataBlock(metadata, { requireCanonical: false })).toThrow(
            /does not match package\.json version/u,
        );
    });

    it('rejects metadata that does not begin at byte zero', () => {
        expect(() => validateUserscriptSource(`\n${fixtureBundle()}`)).toThrow(/byte zero/u);
    });

    it('rejects source-map references in production userscripts', () => {
        const source = `${fixtureBundle()}//# sourceMappingURL=bundle.user.js.map\n`;

        expect(() => validateUserscriptSource(source)).toThrow(/source-map reference/u);
        expect(validateUserscriptSource(source, { production: false })).toBe(true);
    });

    it('rejects production directories that contain source maps', async () => {
        const outdir = await temporaryDirectory();
        await Promise.all([
            writeFile(path.join(outdir, OUTPUT_FILES.userscript), fixtureBundle(), 'utf8'),
            writeFile(
                path.join(outdir, OUTPUT_FILES.metadata),
                `${USER_SCRIPT_METADATA}\n`,
                'utf8',
            ),
            writeFile(path.join(outdir, `${OUTPUT_FILES.userscript}.map`), '{}\n', 'utf8'),
        ]);

        await expect(validateBuildArtifacts({ distDirectory: outdir })).rejects.toThrow(
            /must not contain source maps/u,
        );
    });

    it('rejects differing userscript and metadata versions', async () => {
        const outdir = await temporaryDirectory();
        const mismatchedMetadata = createUserscriptMetadata({
            version: `${PACKAGE_VERSION}-mismatch`,
        });
        await Promise.all([
            writeFile(path.join(outdir, OUTPUT_FILES.userscript), fixtureBundle(), 'utf8'),
            writeFile(path.join(outdir, OUTPUT_FILES.metadata), `${mismatchedMetadata}\n`, 'utf8'),
        ]);

        await expect(validateBuildArtifacts({ distDirectory: outdir })).rejects.toThrow(
            /does not match package\.json version/u,
        );
    });

    it('rejects metadata that enables remote executable code', () => {
        const metadata = USER_SCRIPT_METADATA.replace(
            '// ==/UserScript==',
            '// @require      https://example.com/plugin.js\n// ==/UserScript==',
        );

        expect(() => validateMetadataBlock(metadata, { requireCanonical: false })).toThrow(
            BuildValidationError,
        );
    });

    it('rejects mutable GitHub resource revisions', () => {
        const metadata = USER_SCRIPT_METADATA.replace(
            /f997afc94074989ec324590d7df08960a2633f52/gu,
            'main',
        );

        expect(() => validateMetadataBlock(metadata, { requireCanonical: false })).toThrow(
            /immutable commit revision/u,
        );
    });

    it.each([
        ['dynamic import', "import('https://example.com/plugin.js');", /Dynamic import/u],
        ['direct eval', "eval('globalThis.compromised = true');", /evaluation/u],
        ['direct Function call', "Function('return true');", /evaluation/u],
        ['direct Function construction', "new Function('return true');", /evaluation/u],
        ['unsafeWindow reference', 'unsafeWindow.document;', /unsafeWindow/u],
        [
            'globalThis unsafeWindow property',
            'const page = globalThis.unsafeWindow;',
            /unsafeWindow/u,
        ],
        [
            'computed window unsafeWindow property',
            "const page = window['unsafe' + 'Window'];",
            /unsafeWindow/u,
        ],
        ['self unsafeWindow property', 'const page = self.unsafeWindow;', /unsafeWindow/u],
        ['globalThis.eval reference', 'const evaluate = globalThis.eval;', /known global/u],
        ['window.eval reference', 'const evaluate = window.eval;', /known global/u],
        [
            'computed window eval call',
            "window['ev' + 'al']('globalThis.compromised = true');",
            /known global/u,
        ],
        ['computed self Function call', "self[`Fun${'ction'}`]('return true');", /known global/u],
        ['static script element', "document.createElement('script');", /script elements/u],
        [
            'concatenated script element method and name',
            "document['create' + 'Element']('scr' + 'ipt');",
            /script elements/u,
        ],
        [
            'templated script element name',
            "document.createElement(`scr${'ipt'}`);",
            /script elements/u,
        ],
        [
            'static remote executable URL',
            "const remote = 'https://example.com/plugin.js';",
            /Remote executable/u,
        ],
        [
            'concatenated remote executable URL',
            "const remote = 'https://example.com/' + 'plugin.' + 'js';",
            /Remote executable/u,
        ],
        [
            'concatenated remote script markup',
            "const markup = '<scr' + 'ipt src=https://example.com/plugin.js></script>';",
            /Remote script markup/u,
        ],
        [
            'concatenated remote worker URL',
            "new Worker('https://example.com/' + 'worker.js');",
            /Remote worker scripts/u,
        ],
    ])('rejects forbidden runtime code: %s', (_label, body, expectedError) => {
        expect(() => validateUserscriptSource(fixtureBundle(body))).toThrow(expectedError);
    });

    it.each([
        [
            'unsafe names used only as data or non-computed property names',
            "const label = 'unsafeWindow'; const record = { unsafeWindow: true }; record.unsafeWindow;",
        ],
        [
            'similar but non-evaluating known-global properties',
            'window.evaluate; self.functional; globalThis.functionName;',
        ],
        [
            'evaluation-named properties on an unknown object',
            "sandbox.eval('source'); sandbox['Function'];",
        ],
        [
            'unsafeWindow properties on ordinary data objects',
            "sandbox.unsafeWindow; sandbox['unsafe' + 'Window'];",
        ],
        ['a dynamically computed known-global property', "window[propertyName]('source');"],
        [
            'safe and dynamic element names',
            "document.createElement('div'); document.createElement(tagName);",
        ],
        [
            'non-executable and dynamically completed URLs',
            "const css = 'https://example.com/plugin.css'; const dynamic = 'https://example.com/' + fileName;",
        ],
        ['a dynamic worker URL', 'new Worker(workerUrl);'],
    ])('does not overreach beyond explicit syntactic cases: %s', (_label, body) => {
        expect(validateUserscriptSource(fixtureBundle(body))).toBe(true);
    });
});
