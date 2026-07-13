// @vitest-environment node

import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { buildUserscript } from '../../build/build-userscript.mjs';
import { OUTPUT_FILES } from '../../build/metadata.mjs';
import { verifyReleaseArtifacts } from '../../build/verify-release.mjs';

const temporaryDirectories = [];

async function temporaryDirectory() {
    const directory = await mkdtemp(path.join(tmpdir(), 'mm-release-verification-test-'));
    temporaryDirectories.push(directory);
    return directory;
}

async function createFixtureRelease() {
    const workspace = await temporaryDirectory();
    const entryPoint = path.join(workspace, 'src', 'index.js');
    const distDirectory = path.join(workspace, 'committed-dist');
    const temporaryRoot = path.join(workspace, 'temporary-builds');
    await mkdir(path.dirname(entryPoint), { recursive: true });
    await mkdir(temporaryRoot, { recursive: true });
    await writeFile(entryPoint, 'globalThis.MM_RELEASE_FIXTURE = true;\n', 'utf8');
    await buildUserscript({ entryPoint, log: false, outdir: distDirectory });
    return { distDirectory, entryPoint, temporaryRoot };
}

async function readReleaseArtifacts(distDirectory) {
    return Promise.all(
        Object.values(OUTPUT_FILES).map((fileName) => readFile(path.join(distDirectory, fileName))),
    );
}

afterEach(async () => {
    await Promise.all(
        temporaryDirectories
            .splice(0)
            .map((directory) => rm(directory, { force: true, recursive: true })),
    );
});

describe('non-mutating release verification', () => {
    it('builds twice, compares both artifacts, and leaves committed dist untouched', async () => {
        const fixture = await createFixtureRelease();
        const before = await readReleaseArtifacts(fixture.distDirectory);
        let buildCount = 0;
        const countedBuild = (options) => {
            buildCount += 1;
            return buildUserscript(options);
        };

        await expect(
            verifyReleaseArtifacts({ ...fixture, buildProject: countedBuild }),
        ).resolves.toEqual({
            metadataPath: path.join(fixture.distDirectory, OUTPUT_FILES.metadata),
            userscriptPath: path.join(fixture.distDirectory, OUTPUT_FILES.userscript),
        });

        const after = await readReleaseArtifacts(fixture.distDirectory);
        expect(buildCount).toBe(2);
        expect(after).toEqual(before);
        expect(await readdir(fixture.temporaryRoot)).toEqual([]);
    });

    it('keeps npm run check non-mutating and delegates stale-dist checks to verification', async () => {
        const packageJson = JSON.parse(
            await readFile(new URL('../../package.json', import.meta.url), 'utf8'),
        );

        expect(packageJson.scripts.check).toContain('npm run verify:release');
        expect(packageJson.scripts.check).not.toMatch(/\bnpm run build\b/u);
    });

    it.each([
        ['userscript', OUTPUT_FILES.userscript],
        ['metadata', OUTPUT_FILES.metadata],
    ])('rejects a stale committed %s artifact', async (_label, fileName) => {
        const fixture = await createFixtureRelease();
        const artifactPath = path.join(fixture.distDirectory, fileName);
        const source = await readFile(artifactPath, 'utf8');
        await writeFile(artifactPath, `${source}\n`, 'utf8');

        await expect(verifyReleaseArtifacts(fixture)).rejects.toThrow(
            new RegExp(`Committed ${fileName.replaceAll('.', '\\.')} is stale`, 'u'),
        );
        expect(await readdir(fixture.temporaryRoot)).toEqual([]);
    });

    it.each([
        ['userscript', OUTPUT_FILES.userscript],
        ['metadata', OUTPUT_FILES.metadata],
    ])('rejects a missing committed %s artifact', async (_label, fileName) => {
        const fixture = await createFixtureRelease();
        await rm(path.join(fixture.distDirectory, fileName));

        await expect(verifyReleaseArtifacts(fixture)).rejects.toThrow(
            new RegExp(`Committed artifact ${fileName.replaceAll('.', '\\.')} is missing`, 'u'),
        );
        expect(await readdir(fixture.temporaryRoot)).toEqual([]);
    });

    it('rejects nondeterministic temporary output and cleans it up', async () => {
        const fixture = await createFixtureRelease();
        let buildCount = 0;
        const nondeterministicBuild = async (options) => {
            const result = await buildUserscript(options);
            buildCount += 1;
            if (buildCount === 2) {
                const source = await readFile(result.userscriptPath, 'utf8');
                await writeFile(result.userscriptPath, `${source}// build ${buildCount}\n`, 'utf8');
            }
            return result;
        };

        await expect(
            verifyReleaseArtifacts({ ...fixture, buildProject: nondeterministicBuild }),
        ).rejects.toThrow(/Temporary production builds differ/u);
        expect(await readdir(fixture.temporaryRoot)).toEqual([]);
    });
});
