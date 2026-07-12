import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parse } from 'acorn';

import { GENERATED_NOTICE, OUTPUT_FILES, USER_SCRIPT_METADATA } from './metadata.mjs';

const METADATA_START = '// ==UserScript==';
const METADATA_END = '// ==/UserScript==';
const REQUIRED_SINGLETON_DIRECTIVES = Object.freeze([
    'name',
    'namespace',
    'version',
    'description',
    'match',
    'author',
    'icon',
    'license',
    'downloadURL',
    'updateURL',
]);
const REQUIRED_GRANTS = Object.freeze(['GM_setValue', 'GM_getValue', 'GM_getResourceURL']);
const REQUIRED_RESOURCES = Object.freeze(['mmShrineGarden', 'mmNightview']);
const REMOTE_JAVASCRIPT_URL = /^https?:\/\/\S+\.(?:cjs|mjs|js)(?:[?#]\S*)?$/iu;
const REMOTE_SCRIPT_MARKUP = /<script\b[^>]*\bsrc\s*=\s*["']?\s*https?:\/\//iu;

export class BuildValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'BuildValidationError';
    }
}

function fail(message) {
    throw new BuildValidationError(message);
}

function valuesFor(directives, key) {
    return directives.get(key) ?? [];
}

function requireHttpsUrl(value, directive) {
    let url;

    try {
        url = new URL(value);
    } catch {
        fail(`@${directive} must contain a valid URL.`);
    }

    if (url.protocol !== 'https:') {
        fail(`@${directive} must use HTTPS.`);
    }

    return url;
}

export function extractMetadataBlock(source) {
    if (source.charCodeAt(0) === 0xfeff) {
        fail('The userscript must not begin with a byte-order mark.');
    }

    if (!source.startsWith(`${METADATA_START}\n`)) {
        fail('The userscript metadata block must begin at byte zero and use LF line endings.');
    }

    const endIndex = source.indexOf(METADATA_END);
    if (endIndex < 0) {
        fail('The userscript metadata block is missing its closing marker.');
    }

    const blockEnd = endIndex + METADATA_END.length;
    const block = source.slice(0, blockEnd);

    if (source.indexOf(METADATA_START, METADATA_START.length) >= 0) {
        fail('The build contains more than one userscript metadata block.');
    }

    if (source.indexOf(METADATA_END, blockEnd) >= 0) {
        fail('The build contains more than one userscript metadata closing marker.');
    }

    return block;
}

export function parseMetadataBlock(block) {
    const lines = block.split('\n');
    if (lines[0] !== METADATA_START || lines.at(-1) !== METADATA_END) {
        fail('The metadata markers are malformed.');
    }

    const directives = new Map();
    for (const line of lines.slice(1, -1)) {
        const match = /^\/\/ @([A-Za-z][A-Za-z0-9]*)(?:\s+(.+))?$/.exec(line);
        if (!match) {
            fail(`Invalid metadata line: ${line}`);
        }

        const [, key, rawValue] = match;
        const value = rawValue?.trim();
        if (!value) {
            fail(`@${key} must have a value.`);
        }

        const values = directives.get(key) ?? [];
        values.push(value);
        directives.set(key, values);
    }

    return directives;
}

export function validateMetadataBlock(block, { requireCanonical = true } = {}) {
    if (requireCanonical && block !== USER_SCRIPT_METADATA) {
        fail('The generated userscript metadata does not exactly match build/metadata.mjs.');
    }

    const directives = parseMetadataBlock(block);

    for (const key of REQUIRED_SINGLETON_DIRECTIVES) {
        if (valuesFor(directives, key).length !== 1) {
            fail(`Metadata must contain exactly one @${key} directive.`);
        }
    }

    if (directives.has('require')) {
        fail('Remote executable JavaScript is forbidden: @require is not allowed.');
    }

    const grants = valuesFor(directives, 'grant');
    if (
        grants.length !== REQUIRED_GRANTS.length ||
        REQUIRED_GRANTS.some((grant) => !grants.includes(grant))
    ) {
        fail(`Metadata grants must be exactly: ${REQUIRED_GRANTS.join(', ')}.`);
    }

    const resourceValues = valuesFor(directives, 'resource');
    const resources = new Map();
    for (const resource of resourceValues) {
        const match = /^(\S+)\s+(\S+)$/.exec(resource);
        if (!match) {
            fail(`Invalid @resource directive: ${resource}`);
        }

        const [, name, rawUrl] = match;
        if (resources.has(name)) {
            fail(`Duplicate @resource name: ${name}`);
        }

        const url = requireHttpsUrl(rawUrl, 'resource');
        if (/\.(?:cjs|mjs|js)$/iu.test(url.pathname)) {
            fail(`Executable @resource is forbidden: ${name}`);
        }
        if (url.hostname === 'raw.githubusercontent.com') {
            const revision = url.pathname.split('/').filter(Boolean)[2];
            if (!/^[a-f0-9]{40}$/iu.test(revision || '')) {
                fail(`GitHub @resource must use an immutable commit revision: ${name}`);
            }
        }
        resources.set(name, url);
    }

    if (
        resources.size !== REQUIRED_RESOURCES.length ||
        REQUIRED_RESOURCES.some((name) => !resources.has(name))
    ) {
        fail(`Metadata resources must be exactly: ${REQUIRED_RESOURCES.join(', ')}.`);
    }

    for (const matchPattern of valuesFor(directives, 'match')) {
        if (matchPattern !== 'https://marumori.io/*') {
            fail(`Unexpected @match pattern: ${matchPattern}`);
        }
    }

    const downloadUrl = requireHttpsUrl(valuesFor(directives, 'downloadURL')[0], 'downloadURL');
    if (!downloadUrl.pathname.endsWith('.user.js')) {
        fail('@downloadURL must point to a .user.js file.');
    }

    const updateUrl = requireHttpsUrl(valuesFor(directives, 'updateURL')[0], 'updateURL');
    if (!updateUrl.pathname.endsWith('.meta.js')) {
        fail('@updateURL must point to a .meta.js file.');
    }

    requireHttpsUrl(valuesFor(directives, 'icon')[0], 'icon');

    return directives;
}

function staticStringValue(node) {
    if (node?.type === 'Literal' && typeof node.value === 'string') {
        return node.value;
    }

    if (node?.type === 'TemplateLiteral' && node.expressions.length === 0) {
        return node.quasis[0]?.value.cooked ?? '';
    }

    return null;
}

function identifierName(node) {
    return node?.type === 'Identifier' ? node.name : null;
}

function propertyName(node) {
    if (node?.type !== 'MemberExpression') {
        return null;
    }

    return node.computed ? staticStringValue(node.property) : identifierName(node.property);
}

function walkAst(root, visit) {
    const pending = [root];

    while (pending.length > 0) {
        const node = pending.pop();
        visit(node);

        for (const value of Object.values(node)) {
            if (Array.isArray(value)) {
                for (let index = value.length - 1; index >= 0; index -= 1) {
                    if (value[index]?.type) {
                        pending.push(value[index]);
                    }
                }
            } else if (value?.type) {
                pending.push(value);
            }
        }
    }
}

function validateExecutableAst(ast) {
    walkAst(ast, (node) => {
        if (node.type === 'ImportExpression') {
            fail('Dynamic import() is forbidden in the generated userscript.');
        }

        if (node.type === 'MetaProperty' && node.meta.name === 'import') {
            fail('import.meta is forbidden in the generated userscript.');
        }

        if (node.type === 'CallExpression') {
            const callee = identifierName(node.callee);
            if (callee === 'importScripts' || callee === 'require') {
                fail(`${callee}() is forbidden in the generated userscript.`);
            }
            if (callee === 'eval' || callee === 'Function') {
                fail('Runtime JavaScript evaluation is forbidden in the generated userscript.');
            }

            if (
                propertyName(node.callee) === 'createElement' &&
                staticStringValue(node.arguments[0])?.toLowerCase() === 'script'
            ) {
                fail('Creating script elements at runtime is forbidden.');
            }
        }

        if (node.type === 'NewExpression') {
            const constructor = identifierName(node.callee);
            if (constructor === 'Function') {
                fail('Runtime JavaScript evaluation is forbidden in the generated userscript.');
            }

            if (constructor === 'Worker' || constructor === 'SharedWorker') {
                const workerUrl = staticStringValue(node.arguments[0]);
                if (workerUrl && /^https?:\/\//iu.test(workerUrl)) {
                    fail('Remote worker scripts are forbidden.');
                }
            }
        }

        const stringValue = staticStringValue(node);
        if (stringValue && REMOTE_JAVASCRIPT_URL.test(stringValue)) {
            fail(`Remote executable JavaScript URL is forbidden: ${stringValue}`);
        }
        if (stringValue && REMOTE_SCRIPT_MARKUP.test(stringValue)) {
            fail('Remote script markup is forbidden in the generated userscript.');
        }
    });
}

function validateBundleShape(ast) {
    const statements = ast.body.filter((statement) => statement.type !== 'EmptyStatement');
    const strictDirective = statements.shift();

    if (
        strictDirective?.type !== 'ExpressionStatement' ||
        strictDirective.directive !== 'use strict'
    ) {
        fail('The generated userscript must begin its executable code in strict mode.');
    }

    if (statements.length !== 1 || statements[0].type !== 'ExpressionStatement') {
        fail('The generated userscript must contain exactly one top-level IIFE.');
    }

    const expression = statements[0].expression;
    if (
        expression.type !== 'CallExpression' ||
        (expression.callee.type !== 'ArrowFunctionExpression' &&
            expression.callee.type !== 'FunctionExpression')
    ) {
        fail('The generated userscript executable must be a single IIFE.');
    }
}

export function validateUserscriptSource(source) {
    const metadata = extractMetadataBlock(source);
    validateMetadataBlock(metadata);

    const expectedPrefix = `${USER_SCRIPT_METADATA}\n\n${GENERATED_NOTICE}\n"use strict";\n`;
    if (!source.startsWith(expectedPrefix)) {
        fail(
            'The generated-file notice and strict-mode directive must immediately follow metadata.',
        );
    }

    let ast;
    try {
        ast = parse(source, {
            allowHashBang: false,
            ecmaVersion: 'latest',
            sourceType: 'script',
        });
    } catch (error) {
        fail(`The generated userscript is not valid JavaScript: ${error.message}`);
    }

    validateBundleShape(ast);
    validateExecutableAst(ast);

    return true;
}

export function validateMetadataSource(source) {
    if (source !== `${USER_SCRIPT_METADATA}\n`) {
        fail('The .meta.js file must contain only the canonical metadata block and one newline.');
    }

    validateMetadataBlock(source.slice(0, -1));
    return true;
}

export async function validateBuildArtifacts({ distDirectory } = {}) {
    const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
    const resolvedDistDirectory = path.resolve(distDirectory ?? path.join(projectRoot, 'dist'));
    const userscriptPath = path.join(resolvedDistDirectory, OUTPUT_FILES.userscript);
    const metadataPath = path.join(resolvedDistDirectory, OUTPUT_FILES.metadata);

    const [userscriptSource, metadataSource] = await Promise.all([
        readFile(userscriptPath, 'utf8'),
        readFile(metadataPath, 'utf8'),
    ]);

    validateUserscriptSource(userscriptSource);
    validateMetadataSource(metadataSource);

    return { metadataPath, userscriptPath };
}

function parseCliArguments(argv) {
    let distDirectory;

    for (let index = 0; index < argv.length; index += 1) {
        const argument = argv[index];
        if (argument === '--dist') {
            distDirectory = argv[index + 1];
            if (!distDirectory) {
                fail('--dist requires a directory.');
            }
            index += 1;
        } else if (argument.startsWith('--dist=')) {
            distDirectory = argument.slice('--dist='.length);
        } else {
            fail(`Unknown argument: ${argument}`);
        }
    }

    return { distDirectory };
}

const isCli =
    process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (isCli) {
    const options = parseCliArguments(process.argv.slice(2));
    const result = await validateBuildArtifacts(options);
    console.log(`Validated ${path.relative(process.cwd(), result.userscriptPath)}`);
    console.log(`Validated ${path.relative(process.cwd(), result.metadataPath)}`);
}
