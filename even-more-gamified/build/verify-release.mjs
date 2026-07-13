import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { buildUserscript } from './build-userscript.mjs';
import { OUTPUT_FILES } from './metadata.mjs';
import { validateBuildArtifacts } from './validate-build.mjs';

const BUILD_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(BUILD_DIRECTORY, '..');
const DEFAULT_DIST_DIRECTORY = path.join(PROJECT_ROOT, 'dist');

export class ReleaseVerificationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ReleaseVerificationError';
    }
}

async function readArtifact(directory, fileName, label) {
    const filePath = path.join(directory, fileName);
    try {
        return await readFile(filePath);
    } catch (error) {
        if (error?.code === 'ENOENT') {
            throw new ReleaseVerificationError(
                `${label} ${fileName} is missing. Run npm run build to regenerate dist.`,
            );
        }
        throw error;
    }
}

function requireEqual(actual, expected, message) {
    if (!actual.equals(expected)) {
        throw new ReleaseVerificationError(message);
    }
}

export async function verifyReleaseArtifacts({
    buildProject = buildUserscript,
    distDirectory = DEFAULT_DIST_DIRECTORY,
    entryPoint,
    temporaryRoot = tmpdir(),
} = {}) {
    const resolvedDistDirectory = path.resolve(distDirectory);
    const resolvedTemporaryRoot = path.resolve(temporaryRoot);
    await mkdir(resolvedTemporaryRoot, { recursive: true });
    const workspace = await mkdtemp(path.join(resolvedTemporaryRoot, 'mm-userscript-release-'));
    const firstOutdir = path.join(workspace, 'first');
    const secondOutdir = path.join(workspace, 'second');

    try {
        await buildProject({
            entryPoint,
            log: false,
            mode: 'production',
            outdir: firstOutdir,
        });
        await buildProject({
            entryPoint,
            log: false,
            mode: 'production',
            outdir: secondOutdir,
        });

        await Promise.all([
            validateBuildArtifacts({ distDirectory: firstOutdir }),
            validateBuildArtifacts({ distDirectory: secondOutdir }),
        ]);

        for (const fileName of Object.values(OUTPUT_FILES)) {
            const [firstArtifact, secondArtifact] = await Promise.all([
                readArtifact(firstOutdir, fileName, 'First temporary build'),
                readArtifact(secondOutdir, fileName, 'Second temporary build'),
            ]);
            requireEqual(
                firstArtifact,
                secondArtifact,
                `Temporary production builds differ for ${fileName}.`,
            );

            const committedArtifact = await readArtifact(
                resolvedDistDirectory,
                fileName,
                'Committed artifact',
            );
            requireEqual(
                firstArtifact,
                committedArtifact,
                `Committed ${fileName} is stale. Run npm run build to regenerate dist.`,
            );
        }

        await validateBuildArtifacts({ distDirectory: resolvedDistDirectory });

        return Object.freeze({
            metadataPath: path.join(resolvedDistDirectory, OUTPUT_FILES.metadata),
            userscriptPath: path.join(resolvedDistDirectory, OUTPUT_FILES.userscript),
        });
    } finally {
        await rm(workspace, { force: true, recursive: true });
    }
}

function parseCliArguments(argv) {
    let distDirectory;

    for (let index = 0; index < argv.length; index += 1) {
        const argument = argv[index];
        if (argument === '--dist') {
            distDirectory = argv[index + 1];
            if (!distDirectory) {
                throw new ReleaseVerificationError('--dist requires a directory.');
            }
            index += 1;
        } else if (argument.startsWith('--dist=')) {
            distDirectory = argument.slice('--dist='.length);
        } else {
            throw new ReleaseVerificationError(`Unknown argument: ${argument}`);
        }
    }

    return { distDirectory };
}

const isCli =
    process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (isCli) {
    const result = await verifyReleaseArtifacts(parseCliArguments(process.argv.slice(2)));
    console.log(`Verified ${path.relative(process.cwd(), result.userscriptPath)}`);
    console.log(`Verified ${path.relative(process.cwd(), result.metadataPath)}`);
}
