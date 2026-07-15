import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

import {
    GENERATED_NOTICE_BY_FLAVOR,
    OUTPUT_FILES_BY_FLAVOR,
    requireUserscriptFlavor,
    USERSCRIPT_FLAVORS,
    USER_SCRIPT_METADATA_BY_FLAVOR,
} from './metadata.mjs';
import { validateMetadataSource, validateUserscriptSource } from './validate-build.mjs';

const BUILD_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(BUILD_DIRECTORY, '..');
const DEFAULT_ENTRY_POINT = path.join(PROJECT_ROOT, 'src', 'index.js');
const DEFAULT_DIST_DIRECTORY = path.join(PROJECT_ROOT, 'dist');
const THEME_PREVIEW_MODULES = Object.freeze({
    [USERSCRIPT_FLAVORS.daily]: path.join(
        PROJECT_ROOT,
        'src',
        'debug',
        'theme-preview-disabled.js',
    ),
    [USERSCRIPT_FLAVORS.debug]: path.join(PROJECT_ROOT, 'src', 'debug', 'theme-preview-enabled.js'),
});

function themePreviewPlugin(flavor) {
    const modulePath = THEME_PREVIEW_MODULES[flavor];
    return {
        name: 'theme-preview-flavor',
        setup(esbuild) {
            esbuild.onResolve({ filter: /^#theme-preview$/ }, () => ({ path: modulePath }));
        },
    };
}

function inlineCssPlugin() {
    return {
        name: 'inline-userscript-css',
        setup(esbuild) {
            esbuild.onResolve({ filter: /^(?:https?:)?\/\// }, (args) => ({
                errors: [{ text: `Remote imports cannot be bundled: ${args.path}` }],
            }));

            esbuild.onResolve({ filter: /.*/ }, (args) => {
                if (args.kind === 'dynamic-import') {
                    return {
                        errors: [{ text: `Dynamic import() is forbidden: ${args.path}` }],
                    };
                }
                return null;
            });

            esbuild.onResolve({ filter: /\.css$/i }, (args) => {
                const absolutePath = path.resolve(args.resolveDir, args.path);
                const projectRelativePath = path.relative(PROJECT_ROOT, absolutePath);
                const portablePath = projectRelativePath.startsWith('..')
                    ? `external/${path.basename(absolutePath)}`
                    : projectRelativePath.split(path.sep).join('/');

                return {
                    namespace: 'inline-userscript-css',
                    path: portablePath,
                    pluginData: { absolutePath },
                };
            });

            esbuild.onLoad({ filter: /.*/, namespace: 'inline-userscript-css' }, async (args) => {
                const absolutePath = args.pluginData.absolutePath;
                const css = await readFile(absolutePath, 'utf8');
                const contents = `
const cssText = ${JSON.stringify(css)};
export default cssText;
`;

                return {
                    contents,
                    loader: 'js',
                    resolveDir: path.dirname(absolutePath),
                };
            });
        },
    };
}

function assertNoDynamicImports(metafile) {
    for (const [inputPath, input] of Object.entries(metafile.inputs)) {
        const dynamicImport = input.imports.find((entry) => entry.kind === 'dynamic-import');
        if (dynamicImport) {
            throw new Error(`Dynamic import() is forbidden in ${inputPath}: ${dynamicImport.path}`);
        }
    }
}

function outputText(result, outputPath) {
    const output = result.outputFiles.find(
        (file) => path.resolve(file.path) === path.resolve(outputPath),
    );
    if (!output) {
        throw new Error(`esbuild did not produce ${outputPath}`);
    }
    return output.text;
}

async function atomicWrite(filePath, contents) {
    const temporaryPath = `${filePath}.${process.pid}.tmp`;
    await writeFile(temporaryPath, contents, 'utf8');
    await rename(temporaryPath, filePath);
}

export async function buildUserscript({
    entryPoint = DEFAULT_ENTRY_POINT,
    flavor = USERSCRIPT_FLAVORS.daily,
    mode = 'production',
    outdir,
    log = true,
} = {}) {
    if (mode !== 'production' && mode !== 'development') {
        throw new Error(`Unknown build mode: ${mode}`);
    }

    requireUserscriptFlavor(flavor);
    const development = mode === 'development';
    const outputFiles = OUTPUT_FILES_BY_FLAVOR[flavor];
    const metadata = USER_SCRIPT_METADATA_BY_FLAVOR[flavor];
    const generatedNotice = GENERATED_NOTICE_BY_FLAVOR[flavor];
    const defaultOutdir =
        flavor === USERSCRIPT_FLAVORS.debug
            ? path.join(DEFAULT_DIST_DIRECTORY, 'debug')
            : DEFAULT_DIST_DIRECTORY;
    const resolvedOutdir = path.resolve(outdir ?? defaultOutdir);
    const userscriptPath = path.join(resolvedOutdir, outputFiles.userscript);
    const metadataPath = path.join(resolvedOutdir, outputFiles.metadata);
    const sourceMapPath = `${userscriptPath}.map`;
    const banner = `${metadata}\n\n${generatedNotice}\n"use strict";`;

    const result = await build({
        absWorkingDir: PROJECT_ROOT,
        banner: { js: banner },
        bundle: true,
        charset: 'utf8',
        entryPoints: [path.resolve(entryPoint)],
        format: 'iife',
        keepNames: development,
        legalComments: 'none',
        logLevel: 'silent',
        metafile: true,
        minify: false,
        outfile: userscriptPath,
        platform: 'browser',
        plugins: [themePreviewPlugin(flavor), inlineCssPlugin()],
        sourcemap: development ? 'external' : false,
        sourcesContent: development,
        splitting: false,
        target: ['es2020'],
        treeShaking: true,
        write: false,
    });

    assertNoDynamicImports(result.metafile);

    const bundledSource = outputText(result, userscriptPath);
    const userscriptSource = development
        ? `${bundledSource.trimEnd()}\n//# sourceMappingURL=${outputFiles.userscript}.map\n`
        : bundledSource;
    const metadataSource = `${metadata}\n`;
    validateUserscriptSource(userscriptSource, { flavor, production: !development });
    validateMetadataSource(metadataSource, { flavor });

    await mkdir(resolvedOutdir, { recursive: true });
    await Promise.all([
        atomicWrite(userscriptPath, userscriptSource),
        atomicWrite(metadataPath, metadataSource),
    ]);

    if (development) {
        await atomicWrite(sourceMapPath, outputText(result, sourceMapPath));
    } else {
        await rm(sourceMapPath, { force: true });
    }

    if (log) {
        console.log(`Built ${path.relative(PROJECT_ROOT, userscriptPath)} (${mode})`);
        console.log(`Built ${path.relative(PROJECT_ROOT, metadataPath)}`);
    }

    return {
        metadataPath,
        flavor,
        mode,
        sourceMapPath: development ? sourceMapPath : null,
        userscriptPath,
    };
}

function parseCliArguments(argv) {
    const options = {};

    for (const argument of argv) {
        if (argument === '--dev' || argument === '--mode=development') {
            options.mode = 'development';
        } else if (argument === '--prod' || argument === '--mode=production') {
            options.mode = 'production';
        } else if (argument === '--daily' || argument === '--flavor=daily') {
            options.flavor = USERSCRIPT_FLAVORS.daily;
        } else if (argument === '--debug' || argument === '--flavor=debug') {
            options.flavor = USERSCRIPT_FLAVORS.debug;
        } else if (argument.startsWith('--outdir=')) {
            options.outdir = argument.slice('--outdir='.length);
        } else if (argument.startsWith('--entry=')) {
            options.entryPoint = argument.slice('--entry='.length);
        } else {
            throw new Error(`Unknown argument: ${argument}`);
        }
    }

    return options;
}

const isCli =
    process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (isCli) {
    await buildUserscript(parseCliArguments(process.argv.slice(2)));
}
