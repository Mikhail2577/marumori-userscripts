import { readFileSync } from 'node:fs';

const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

export const PACKAGE_VERSION = packageJson.version;

if (typeof PACKAGE_VERSION !== 'string' || !PACKAGE_VERSION.trim()) {
    throw new TypeError('package.json must contain a non-empty string version.');
}

export const USERSCRIPT_FLAVORS = Object.freeze({
    daily: 'daily',
    debug: 'debug',
});

const FLAVOR_METADATA = Object.freeze({
    [USERSCRIPT_FLAVORS.daily]: Object.freeze({
        name: 'MaruMori Even More Gamified - Updated',
        namespace: 'marumori-gamify',
        downloadUrl:
            'https://update.greasyfork.org/scripts/587129/MaruMori%20Even%20More%20Gamified%20-%20Updated.user.js',
        updateUrl:
            'https://raw.githubusercontent.com/Mikhail2577/marumori-userscripts/main/even-more-gamified/dist/marumori_even_more_gamified.meta.js',
    }),
    [USERSCRIPT_FLAVORS.debug]: Object.freeze({
        name: 'MaruMori Even More Gamified - Debug Preview',
        namespace: 'marumori-gamify-debug-preview',
        downloadUrl: null,
        updateUrl: null,
    }),
});

export const OUTPUT_FILES_BY_FLAVOR = Object.freeze({
    [USERSCRIPT_FLAVORS.daily]: Object.freeze({
        userscript: 'marumori_even_more_gamified.user.js',
        metadata: 'marumori_even_more_gamified.meta.js',
    }),
    [USERSCRIPT_FLAVORS.debug]: Object.freeze({
        userscript: 'marumori_even_more_gamified.debug.user.js',
        metadata: 'marumori_even_more_gamified.debug.meta.js',
    }),
});

export function requireUserscriptFlavor(flavor = USERSCRIPT_FLAVORS.daily) {
    if (!Object.hasOwn(FLAVOR_METADATA, flavor)) {
        throw new TypeError(`Unknown userscript flavor: ${flavor}`);
    }
    return FLAVOR_METADATA[flavor];
}

export function createUserscriptMetadata({
    flavor = USERSCRIPT_FLAVORS.daily,
    version = PACKAGE_VERSION,
} = {}) {
    if (typeof version !== 'string' || !version.trim() || /[\r\n]/u.test(version)) {
        throw new TypeError('Userscript metadata requires a non-empty single-line version.');
    }

    const config = requireUserscriptFlavor(flavor);
    const distributionMetadata = config.downloadUrl
        ? `
// @downloadURL ${config.downloadUrl}
// @updateURL ${config.updateUrl}`
        : '';

    return `// ==UserScript==
// @name         ${config.name}
// @namespace    ${config.namespace}
// @version      ${version}
// @description  Gamifies MaruMori review sessions with arcade combo audio, score multipliers, screen shake, floating damage numbers, and more
// @match        https://marumori.io/*
// @author       matskye & Mikhail2577 & OpenAI Codex
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_getResourceURL
// @resource     mmShrineGarden https://raw.githubusercontent.com/Mikhail2577/marumori-userscripts/f997afc94074989ec324590d7df08960a2633f52/even-more-gamified/assets/shrine-garden.jpg
// @resource     mmNightview https://raw.githubusercontent.com/Mikhail2577/marumori-userscripts/f997afc94074989ec324590d7df08960a2633f52/even-more-gamified/assets/nightview.png
// @icon         https://www.google.com/s2/favicons?sz=64&domain=marumori.io
// @license      WTFPL${distributionMetadata}
// ==/UserScript==`;
}

export const USER_SCRIPT_METADATA_BY_FLAVOR = Object.freeze({
    [USERSCRIPT_FLAVORS.daily]: createUserscriptMetadata({
        flavor: USERSCRIPT_FLAVORS.daily,
    }),
    [USERSCRIPT_FLAVORS.debug]: createUserscriptMetadata({
        flavor: USERSCRIPT_FLAVORS.debug,
    }),
});

// Compatibility aliases: unqualified metadata/output imports always mean the
// installable daily artifact.
export const USER_SCRIPT_METADATA = USER_SCRIPT_METADATA_BY_FLAVOR[USERSCRIPT_FLAVORS.daily];

export const GENERATED_NOTICE_BY_FLAVOR = Object.freeze({
    [USERSCRIPT_FLAVORS.daily]: `// GENERATED FILE — DO NOT EDIT DIRECTLY.
// Edit files under src/ and run npm run build.`,
    [USERSCRIPT_FLAVORS.debug]: `// GENERATED FILE — DO NOT EDIT DIRECTLY.
// Edit files under src/ and run npm run build:debug.`,
});

export const GENERATED_NOTICE = GENERATED_NOTICE_BY_FLAVOR[USERSCRIPT_FLAVORS.daily];

export const OUTPUT_FILES = OUTPUT_FILES_BY_FLAVOR[USERSCRIPT_FLAVORS.daily];
