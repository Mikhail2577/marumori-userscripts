// @vitest-environment node

import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const UI_CSS_URL = new URL('../../src/ui/styles.css', import.meta.url);

describe('accessibility source invariants', () => {
    it('keeps keyboard focus visible on every userscript control family', async () => {
        const uiCss = await readFile(UI_CSS_URL, 'utf8');
        const focusSelectors = [...uiCss.matchAll(/([^{}]+)\{([^{}]*)\}/gu)]
            .filter(
                ([, selector, declarations]) =>
                    selector.includes(':focus-visible') &&
                    /outline\s*:\s*(?!none\b)[^;{}]+/u.test(declarations),
            )
            .flatMap(([, selector]) => selector.split(',').map((part) => part.trim()));
        const requiredSelectors = [
            '#mm-settings-launcher:focus-visible',
            '#mm-hud button:focus-visible',
            '#mm-settings button:focus-visible',
            "#mm-settings input[type='range']:focus-visible",
            '#mm-summary button:focus-visible',
        ];

        expect(focusSelectors).toEqual(expect.arrayContaining(requiredSelectors));
        expect(uiCss).not.toMatch(/#mm-(?:vol|music-vol)-slider[^{}]*\{[^{}]*outline\s*:\s*none/u);
    });
});
