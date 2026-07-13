import { readFileSync } from 'node:fs';

const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

export const PACKAGE_VERSION = packageJson.version;

if (typeof PACKAGE_VERSION !== 'string' || !PACKAGE_VERSION.trim()) {
    throw new TypeError('package.json must contain a non-empty string version.');
}

export function createUserscriptMetadata({ version = PACKAGE_VERSION } = {}) {
    if (typeof version !== 'string' || !version.trim() || /[\r\n]/u.test(version)) {
        throw new TypeError('Userscript metadata requires a non-empty single-line version.');
    }

    return `// ==UserScript==
// @name         MaruMori Even More Gamified - Updated
// @namespace    marumori-gamify
// @version      ${version}
// @description  Gamifies MaruMori review sessions with arcade combo audio, score multipliers, screen shake, floating damage numbers, and more
// @match        https://marumori.io/*
// @author       matskye & Mikhail2577
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_getResourceURL
// @resource     mmShrineGarden https://raw.githubusercontent.com/Mikhail2577/marumori-userscripts/f997afc94074989ec324590d7df08960a2633f52/even-more-gamified/assets/shrine-garden.jpg
// @resource     mmNightview https://raw.githubusercontent.com/Mikhail2577/marumori-userscripts/f997afc94074989ec324590d7df08960a2633f52/even-more-gamified/assets/nightview.png
// @icon         https://www.google.com/s2/favicons?sz=64&domain=marumori.io
// @license      WTFPL
// @downloadURL https://update.greasyfork.org/scripts/566950/MaruMori%20Even%20More%20Gamified.user.js
// @updateURL https://update.greasyfork.org/scripts/566950/MaruMori%20Even%20More%20Gamified.meta.js
// ==/UserScript==`;
}

export const USER_SCRIPT_METADATA = createUserscriptMetadata();

export const GENERATED_NOTICE = `// GENERATED FILE — DO NOT EDIT DIRECTLY.
// Edit files under src/ and run npm run build.`;

export const OUTPUT_FILES = Object.freeze({
    userscript: 'marumori_even_more_gamified.user.js',
    metadata: 'marumori_even_more_gamified.meta.js',
});
