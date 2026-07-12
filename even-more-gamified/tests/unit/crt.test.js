// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest';

import { createCrtController } from '../../src/effects/crt.js';

describe('CRT overlay controller', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
        document.body.className = '';
    });

    it('owns idempotent overlays without animating the body itself', () => {
        const controller = createCrtController({ document });
        controller.sync({ enabled: true });
        controller.sync({ enabled: true });

        expect(document.body.classList.contains('mm-crt-enabled')).toBe(true);
        expect(document.querySelectorAll('#mm-crt-tint')).toHaveLength(1);
        expect(document.querySelectorAll('#mm-scanlines')).toHaveLength(1);
        expect(document.querySelector('#mm-crt-tint').dataset.mmOwned).toBe('');
        expect(document.body.style.animation).toBe('');
    });

    it('removes every owned overlay on disable and cleanup', () => {
        const controller = createCrtController({ document });
        controller.sync({ enabled: true });
        controller.sync({ enabled: false });
        expect(document.querySelector('#mm-crt-tint')).toBeNull();

        controller.sync({ enabled: true });
        controller.cleanup();
        expect(document.querySelector('#mm-scanlines')).toBeNull();
        expect(document.body.classList.contains('mm-crt-enabled')).toBe(false);
    });
});
