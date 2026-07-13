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
    PACKAGE_VERSION,
    USER_SCRIPT_METADATA,
} from '../../build/metadata.mjs';
import {
    BuildValidationError,
    validateBuildArtifacts,
    validateMetadataBlock,
    validateUserscriptSource,
} from '../../build/validate-build.mjs';

const temporaryDirectories = [];

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
