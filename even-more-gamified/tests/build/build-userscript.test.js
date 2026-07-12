// @vitest-environment node

import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { buildUserscript } from '../../build/build-userscript.mjs';
import { GENERATED_NOTICE, OUTPUT_FILES, USER_SCRIPT_METADATA } from '../../build/metadata.mjs';
import {
    BuildValidationError,
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
    it('accepts the canonical metadata and generated bundle shape', () => {
        expect(validateMetadataBlock(USER_SCRIPT_METADATA)).toBeInstanceOf(Map);
        expect(validateUserscriptSource(fixtureBundle())).toBe(true);
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
        ["import('https://example.com/plugin.js');", /Dynamic import/u],
        ["eval('globalThis.compromised = true');", /evaluation/u],
        ["document.createElement('script');", /script elements/u],
        ["const remote = 'https://example.com/plugin.js';", /Remote executable/u],
    ])('rejects forbidden runtime code: %s', (body, expectedError) => {
        expect(() => validateUserscriptSource(fixtureBundle(body))).toThrow(expectedError);
    });
});
