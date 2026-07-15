// @vitest-environment node

import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { parse } from 'acorn';
import { describe, expect, it } from 'vitest';

import { USER_SCRIPT_METADATA } from '../../build/metadata.mjs';

const PROJECT_ROOT = fileURLToPath(new URL('../..', import.meta.url));

const FILES = Object.freeze({
    app: path.join(PROJECT_ROOT, 'src/app.js'),
    arcadeCss: path.join(PROJECT_ROOT, 'src/backgrounds/arcade.css'),
    backgroundController: path.join(
        PROJECT_ROOT,
        'src/backgrounds/canvas-background-controller.js',
    ),
    backgroundRenderers: path.join(PROJECT_ROOT, 'src/backgrounds/renderers'),
    comboTimer: path.join(PROJECT_ROOT, 'src/ui/combo-timer.js'),
    entry: path.join(PROJECT_ROOT, 'src/index.js'),
    hudController: path.join(PROJECT_ROOT, 'src/ui/hud-controller.js'),
    metadata: path.join(PROJECT_ROOT, 'build/metadata.mjs'),
    settingsPanel: path.join(PROJECT_ROOT, 'src/ui/settings-panel.js'),
    uiCss: path.join(PROJECT_ROOT, 'src/ui/styles.css'),
});

const RAW_GITHUB_URL =
    /https:\/\/raw\.githubusercontent\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/[^\s"'`)\\]+/gu;

async function readSource(filePath) {
    return readFile(filePath, 'utf8');
}

function parseModule(source, filePath) {
    try {
        return parse(source, {
            ecmaVersion: 'latest',
            locations: true,
            sourceType: 'module',
        });
    } catch (error) {
        throw new Error(
            `Could not parse ${path.relative(PROJECT_ROOT, filePath)}: ${error.message}`,
            {
                cause: error,
            },
        );
    }
}

function visit(node, visitor) {
    if (!node || typeof node !== 'object') return;
    visitor(node);

    for (const [key, child] of Object.entries(node)) {
        if (key === 'loc' || key === 'start' || key === 'end') continue;
        if (Array.isArray(child)) {
            for (const item of child) visit(item, visitor);
        } else if (child && typeof child.type === 'string') {
            visit(child, visitor);
        }
    }
}

function findNodes(ast, type) {
    const matches = [];
    visit(ast, (node) => {
        if (node.type === type) matches.push(node);
    });
    return matches;
}

function unwrapChain(node) {
    return node?.type === 'ChainExpression' ? node.expression : node;
}

function memberPath(node) {
    const candidate = unwrapChain(node);
    if (candidate?.type === 'Identifier') return [candidate.name];
    if (candidate?.type === 'ThisExpression') return ['this'];
    if (candidate?.type !== 'MemberExpression') return null;

    const objectPath = memberPath(candidate.object);
    if (!objectPath) return null;
    if (!candidate.computed && candidate.property.type === 'Identifier') {
        return [...objectPath, candidate.property.name];
    }
    if (candidate.computed && candidate.property.type === 'Literal') {
        return [...objectPath, String(candidate.property.value)];
    }
    return null;
}

function isTimerCall(node) {
    if (node.type !== 'CallExpression') return false;
    const callee = memberPath(node.callee);
    return callee?.at(-1) === 'setTimeout';
}

function sourceForNode(source, node) {
    return source.slice(node.start, node.end);
}

function findNamedFunction(ast, name) {
    return findNodes(ast, 'FunctionDeclaration').find((node) => node.id?.name === name);
}

function findCssRules(source) {
    return [...source.matchAll(/([^{}]+)\{([^{}]*)\}/gu)].map((match) => ({
        declarations: match[2],
        selector: match[1].trim(),
    }));
}

function cssRuleFor(source, selector) {
    const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
    return source.match(new RegExp(`${escapedSelector}\\s*\\{([^{}]*)\\}`, 'u'))?.[1] ?? null;
}

function evaluateStaticString(node) {
    const candidate = unwrapChain(node);
    if (candidate?.type === 'Literal' && typeof candidate.value === 'string') {
        return candidate.value;
    }
    if (candidate?.type === 'TemplateLiteral' && candidate.expressions.length === 0) {
        return candidate.quasis.map((quasi) => quasi.value.cooked ?? quasi.value.raw).join('');
    }
    if (candidate?.type === 'BinaryExpression' && candidate.operator === '+') {
        const left = evaluateStaticString(candidate.left);
        const right = evaluateStaticString(candidate.right);
        return typeof left === 'string' && typeof right === 'string' ? left + right : null;
    }
    return null;
}

function rawGitHubUrlsFromJavaScript(source, filePath) {
    const urls = new Set(source.match(RAW_GITHUB_URL) ?? []);
    const ast = parseModule(source, filePath);
    visit(ast, (node) => {
        const value = evaluateStaticString(node);
        if (typeof value !== 'string') return;
        for (const url of value.match(RAW_GITHUB_URL) ?? []) urls.add(url);
    });
    return [...urls];
}

async function readSourceTree(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    const files = [];
    for (const entry of entries) {
        const entryPath = path.join(directory, entry.name);
        if (entry.isDirectory()) {
            files.push(...(await readSourceTree(entryPath)));
        } else if (/\.(?:css|js|mjs)$/u.test(entry.name)) {
            files.push({ filePath: entryPath, source: await readSource(entryPath) });
        }
    }
    return files;
}

function rawGitHubRevision(url) {
    const segments = new URL(url).pathname.split('/').filter(Boolean);
    return segments.length >= 3 ? segments[2] : null;
}

describe('source architecture invariants', () => {
    it('keeps HUD ownership and settings wiring outside the app composition root', async () => {
        const [app, hudController, settingsPanel] = await Promise.all([
            readSource(FILES.app),
            readSource(FILES.hudController),
            readSource(FILES.settingsPanel),
        ]);
        const appAst = parseModule(app, FILES.app);

        for (const legacyFunction of [
            'applyHudPosition',
            'buildSettingsPanel',
            'installHudDrag',
            'setHudCollapsed',
            'wireSettingsPanel',
        ]) {
            expect(findNamedFunction(appAst, legacyFunction)).toBeUndefined();
        }
        expect(app).toContain('createHudController({');
        expect(app).toContain('createSettingsPanelController({');
        expect(app).not.toContain('id="mm-hud-stats"');
        expect(hudController).toContain("hud.id = 'mm-hud'");
        expect(settingsPanel).toContain("panel.id = 'mm-settings'");
    });

    it('keeps each canvas theme renderer outside the app and lifecycle controller', async () => {
        const [app, controller, rendererEntries] = await Promise.all([
            readSource(FILES.app),
            readSource(FILES.backgroundController),
            readdir(FILES.backgroundRenderers),
        ]);
        const rendererFunctionNames = [
            'initStarfield',
            'initNebula',
            'initGrid',
            'initGameCenter',
            'initShrine',
            'initNightview',
            'initMatrix',
            'drawStarfield',
            'drawNebula',
            'drawGrid',
            'drawGameCenter',
            'drawShrine',
            'drawNightview',
            'drawMatrix',
        ];

        for (const [source, filePath] of [
            [app, FILES.app],
            [controller, FILES.backgroundController],
        ]) {
            const ast = parseModule(source, filePath);
            const leakedRenderers = rendererFunctionNames.filter((name) =>
                findNamedFunction(ast, name),
            );
            expect(
                leakedRenderers,
                `${path.relative(PROJECT_ROOT, filePath)} must only orchestrate renderer modules`,
            ).toEqual([]);
        }

        expect(rendererEntries).toEqual(
            expect.arrayContaining([
                'gamecenter-renderer.js',
                'grid-renderer.js',
                'matrix-renderer.js',
                'nebula-renderer.js',
                'nightview-renderer.js',
                'shrine-renderer.js',
                'starfield-renderer.js',
            ]),
        );
    });

    it('keeps rewind restoration transactional and timeout failure single-owned', async () => {
        const app = await readSource(FILES.app);
        const ast = parseModule(app, FILES.app);

        const rewindTimers = findNodes(ast, 'CallExpression')
            .filter(isTimerCall)
            .filter((call) =>
                /\b(?:pendingRewindRestore|requestRewind|restoreRewindSnapshot|setRewindSnapshot)\b/u.test(
                    sourceForNode(app, call.arguments[0]),
                ),
            )
            .map((call) => call.loc.start.line);
        expect(
            rewindTimers,
            `src/app.js must not restore rewind state from fixed-delay timers (lines: ${rewindTimers.join(', ')})`,
        ).toEqual([]);

        const directRestores = findNodes(ast, 'CallExpression')
            .filter((call) => memberPath(call.callee)?.join('.') === 'restoreRewindSnapshot')
            .map((call) => call.loc.start.line);
        expect(
            directRestores,
            'Only the transactional rewind controller may invoke the restoration callback',
        ).toEqual([]);

        const restoreFunction = findNamedFunction(ast, 'restoreRewindSnapshot');
        expect(restoreFunction).toBeDefined();
        expect(sourceForNode(app, restoreFunction)).not.toMatch(
            /\b(?:resetComboTimer|refreshAnswerTimerForCurrentQuestion)\s*\(/u,
        );

        const removedLegacyNames = new Set([
            'attemptTimeoutAutoFail',
            'clickNextAfterTimeoutFail',
            'pendingRewindRestore',
            'timeoutAutoFailing',
            'timeoutFallbackTimer',
        ]);
        const survivingLegacyNames = [
            ...new Set(
                findNodes(ast, 'Identifier')
                    .map((node) => node.name)
                    .filter((name) => removedLegacyNames.has(name)),
            ),
        ];
        expect(
            survivingLegacyNames,
            'Legacy rewind/timeout coordination state would create a second transaction owner',
        ).toEqual([]);

        const timeoutHandler = findNamedFunction(ast, 'handleAnswerTimeout');
        expect(timeoutHandler, 'src/app.js must retain one timeout entry point').toBeDefined();
        const timeoutHandlerSource = sourceForNode(app, timeoutHandler);
        const timeoutControllerStarts = findNodes(timeoutHandler, 'CallExpression').filter(
            (call) => memberPath(call.callee)?.join('.') === 'timeoutFailureController.start',
        );
        expect(
            timeoutControllerStarts,
            'handleAnswerTimeout must delegate exactly once to the serialized timeout controller',
        ).toHaveLength(1);
        expect(timeoutHandlerSource).not.toMatch(/\bsetTimeout\s*\(/u);
        expect(timeoutHandlerSource).not.toMatch(/\.click\s*\(/u);
    });

    it('keeps the combo fill on compositor transforms instead of layout width writes', async () => {
        const [app, compositor, uiCss] = await Promise.all([
            readSource(FILES.app),
            readSource(FILES.comboTimer),
            readSource(FILES.uiCss),
        ]);
        const appAst = parseModule(app, FILES.app);
        const compositorAst = parseModule(compositor, FILES.comboTimer);

        const appBarWidthWrites = findNodes(appAst, 'AssignmentExpression')
            .filter((assignment) => {
                const target = memberPath(assignment.left);
                return target?.includes('bar') && target.slice(-2).join('.') === 'style.width';
            })
            .map((assignment) => assignment.loc.start.line);
        expect(
            appBarWidthWrites,
            `The app must not drive #mm-combo-bar through style.width (lines: ${appBarWidthWrites.join(', ')})`,
        ).toEqual([]);
        const appBarWidthSetPropertyCalls = findNodes(appAst, 'CallExpression')
            .filter((call) => {
                const callee = memberPath(call.callee);
                return (
                    callee?.includes('bar') &&
                    callee.slice(-2).join('.') === 'style.setProperty' &&
                    evaluateStaticString(call.arguments[0]) === 'width'
                );
            })
            .map((call) => call.loc.start.line);
        expect(
            appBarWidthSetPropertyCalls,
            `The app must not drive #mm-combo-bar through setProperty('width') (lines: ${appBarWidthSetPropertyCalls.join(', ')})`,
        ).toEqual([]);

        const compositorWidthWrites = findNodes(compositorAst, 'AssignmentExpression')
            .filter(
                (assignment) => memberPath(assignment.left)?.slice(-2).join('.') === 'style.width',
            )
            .map((assignment) => assignment.loc.start.line);
        expect(
            compositorWidthWrites,
            'The combo compositor must not trigger layout with style.width',
        ).toEqual([]);
        const compositorWidthSetPropertyCalls = findNodes(compositorAst, 'CallExpression')
            .filter(
                (call) =>
                    memberPath(call.callee)?.slice(-2).join('.') === 'style.setProperty' &&
                    evaluateStaticString(call.arguments[0]) === 'width',
            )
            .map((call) => call.loc.start.line);
        expect(
            compositorWidthSetPropertyCalls,
            "The combo compositor must not trigger layout with setProperty('width')",
        ).toEqual([]);

        const transformWrites = findNodes(compositorAst, 'AssignmentExpression').filter(
            (assignment) => memberPath(assignment.left)?.slice(-2).join('.') === 'style.transform',
        );
        expect(
            transformWrites.length,
            'The combo compositor must update style.transform',
        ).toBeGreaterThan(0);
        expect(compositor).toMatch(/scaleX\s*\(/u);

        const comboBarRule = cssRuleFor(uiCss, '#mm-combo-bar');
        expect(comboBarRule, 'src/ui/styles.css must define #mm-combo-bar').not.toBeNull();
        expect(comboBarRule).toMatch(/transform\s*:\s*scaleX\(1\)/u);
        expect(comboBarRule).toMatch(/transform-origin\s*:\s*left(?:\s+center)?/u);
        expect(comboBarRule).toMatch(/will-change\s*:\s*transform/u);
    });

    it('keeps CRT flicker on its overlay without displacing body shake', async () => {
        const [arcadeCss, uiCss] = await Promise.all([
            readSource(FILES.arcadeCss),
            readSource(FILES.uiCss),
        ]);
        const flickerRules = findCssRules(arcadeCss).filter((rule) =>
            /animation(?:-name)?\s*:[^;{}]*\bmmCrtFlicker\b/u.test(rule.declarations),
        );

        expect(flickerRules.length, 'mmCrtFlicker must have a CSS animation owner').toBeGreaterThan(
            0,
        );
        expect(
            flickerRules.some((rule) => rule.selector.includes('#mm-crt-tint')),
            'The dedicated CRT tint overlay must own mmCrtFlicker',
        ).toBe(true);
        const bodyFlickerSelectors = flickerRules
            .flatMap((rule) => rule.selector.split(','))
            .map((selector) => selector.trim())
            .filter((selector) => /\bbody\b/u.test(selector));
        expect(
            bodyFlickerSelectors,
            'Applying mmCrtFlicker to body would overwrite the body shake transform animation',
        ).toEqual([]);

        const lightShake = cssRuleFor(uiCss, 'body.mm-shake-light');
        const hardShake = cssRuleFor(uiCss, 'body.mm-shake-hard');
        expect(lightShake, 'The light body shake rule must remain available').toMatch(
            /animation\s*:\s*mmShakeLight\b/u,
        );
        expect(hardShake, 'The hard body shake rule must remain available').toMatch(
            /animation\s*:\s*mmShakeHard\b/u,
        );
        expect(uiCss).toMatch(/@keyframes\s+mmShakeLight\b/u);
        expect(uiCss).toMatch(/@keyframes\s+mmShakeHard\b/u);
    });

    it('keeps generated userscript artifacts outside the modular source graph', async () => {
        const [entry, sourceFiles] = await Promise.all([
            readSource(FILES.entry),
            readSourceTree(path.join(PROJECT_ROOT, 'src')),
        ]);
        const entryAst = parseModule(entry, FILES.entry);
        const entryImports = findNodes(entryAst, 'ImportDeclaration').map(
            (declaration) => declaration.source.value,
        );

        expect(entryImports).toContain('./app.js');
        expect(
            entryImports.filter((specifier) =>
                /(?:^|\/)marumori_even_more_gamified\.user\.js$/u.test(specifier),
            ),
            'src/index.js must bundle source modules, not a generated userscript artifact',
        ).toEqual([]);

        const userscriptImports = [];
        for (const { filePath, source } of sourceFiles.filter(({ filePath }) =>
            filePath.endsWith('.js'),
        )) {
            const ast = parseModule(source, filePath);
            for (const declaration of findNodes(ast, 'ImportDeclaration')) {
                if (/\.user\.js$/u.test(declaration.source.value)) {
                    userscriptImports.push(
                        `${path.relative(PROJECT_ROOT, filePath)} -> ${declaration.source.value}`,
                    );
                }
            }
        }
        expect(
            userscriptImports,
            'No modular source file may import a generated .user.js artifact',
        ).toEqual([]);
    });

    it('keeps distribution endpoints stable and pins source assets to Git revisions', async () => {
        const sourceFiles = await Promise.all([
            readSourceTree(path.join(PROJECT_ROOT, 'src')),
            readSourceTree(path.join(PROJECT_ROOT, 'build')),
        ]).then((groups) => groups.flat());

        const references = [];
        for (const { filePath, source } of sourceFiles) {
            const urls = filePath.endsWith('.css')
                ? (source.match(RAW_GITHUB_URL) ?? [])
                : rawGitHubUrlsFromJavaScript(source, filePath);
            for (const url of urls) {
                references.push({ filePath: path.relative(PROJECT_ROOT, filePath), url });
            }
        }

        const distributionEntries = [
            ...USER_SCRIPT_METADATA.matchAll(/^\/\/ @(downloadURL|updateURL)\s+(\S+)$/gmu),
        ].map((match) => [match[1], match[2]]);
        const distributionUrls = new Set(distributionEntries.map(([, url]) => url));
        const distributionByDirective = Object.fromEntries(distributionEntries);
        expect(distributionUrls.size, 'Expected one download URL and one update URL').toBe(2);
        expect(
            distributionByDirective.downloadURL,
            'Downloads must use the direct Greasy Fork install endpoint',
        ).toBe(
            'https://update.greasyfork.org/scripts/587129/MaruMori%20Even%20More%20Gamified%20-%20Updated.user.js',
        );
        expect(
            rawGitHubRevision(distributionByDirective.updateURL),
            'Update metadata must follow the stable GitHub main branch',
        ).toBe('main');

        const assetReferences = references.filter(({ url }) => !distributionUrls.has(url));
        expect(
            assetReferences.length,
            'Expected at least one generated/source asset reference',
        ).toBeGreaterThan(0);
        const unpinnedReferences = assetReferences
            .map(({ filePath, url }) => ({ filePath, revision: rawGitHubRevision(url), url }))
            .filter(({ revision }) => !/^[0-9a-f]{40}$/iu.test(revision ?? ''));
        expect(
            unpinnedReferences,
            'Raw GitHub assets in generated metadata and src must use a 40-character commit, never main/master',
        ).toEqual([]);

        const resources = [
            ...USER_SCRIPT_METADATA.matchAll(/^\/\/ @resource\s+\S+\s+(\S+)$/gmu),
        ].map((match) => match[1]);
        expect(
            resources.length,
            'Userscript metadata must retain its declared image resources',
        ).toBeGreaterThan(0);
        for (const resource of resources) {
            expect(
                rawGitHubRevision(resource),
                `Metadata resource is not pinned to a full commit: ${resource}`,
            ).toMatch(/^[0-9a-f]{40}$/iu);
        }
    });
});
