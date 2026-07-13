import { afterEach, describe, expect, it, vi } from 'vitest';

import { NIGHTVIEW_IMAGE_URL, SHRINE_IMAGE_URL } from '../../src/config/themes.js';
import { createNightviewRenderer } from '../../src/backgrounds/renderers/nightview-renderer.js';
import { createShrineRenderer } from '../../src/backgrounds/renderers/shrine-renderer.js';

const originalGetResourceUrl = globalThis.GM_getResourceURL;

function createTrackedImage() {
    const assignments = [];
    const image = {};
    for (const property of ['crossOrigin', 'referrerPolicy', 'src']) {
        let value;
        Object.defineProperty(image, property, {
            configurable: true,
            get: () => value,
            set: (nextValue) => {
                value = nextValue;
                assignments.push([property, nextValue]);
            },
        });
    }
    return { assignments, image };
}

function createRenderer(factory, theme) {
    const { assignments, image } = createTrackedImage();
    const renderer = factory({
        ctx: {},
        theme,
        document: { createElement: vi.fn(() => image) },
        width: 1280,
        height: 720,
        frameScale: 1,
        isLiteMode: () => true,
        prefersReducedMotion: () => false,
        requestRender: vi.fn(),
    });
    return { assignments, image, renderer };
}

const rendererCases = [
    {
        name: 'Shrine',
        factory: createShrineRenderer,
        theme: 'shrine',
        resourceName: 'mmShrineGarden',
        directUrl: SHRINE_IMAGE_URL,
    },
    {
        name: 'Night View',
        factory: createNightviewRenderer,
        theme: 'nightview',
        resourceName: 'mmNightview',
        directUrl: NIGHTVIEW_IMAGE_URL,
    },
];

describe.each(rendererCases)('$name background image loading', (rendererCase) => {
    afterEach(() => {
        if (originalGetResourceUrl === undefined) {
            delete globalThis.GM_getResourceURL;
        } else {
            globalThis.GM_getResourceURL = originalGetResourceUrl;
        }
        vi.restoreAllMocks();
    });

    it('sets anonymous CORS and no-referrer before assigning the direct URL', () => {
        globalThis.GM_getResourceURL = vi.fn(() => {
            throw new Error('resource unavailable');
        });
        const { assignments, renderer } = createRenderer(rendererCase.factory, rendererCase.theme);

        renderer.init();

        expect(globalThis.GM_getResourceURL).toHaveBeenCalledWith(rendererCase.resourceName);
        expect(assignments).toEqual([
            ['crossOrigin', 'anonymous'],
            ['referrerPolicy', 'no-referrer'],
            ['src', rendererCase.directUrl],
        ]);
    });

    it('keeps the GM resource as the primary path', async () => {
        globalThis.GM_getResourceURL = vi.fn(() => 'blob:userscript-resource');
        const { assignments, renderer } = createRenderer(rendererCase.factory, rendererCase.theme);

        renderer.init();
        await Promise.resolve();

        expect(globalThis.GM_getResourceURL).toHaveBeenCalledWith(rendererCase.resourceName);
        expect(assignments).toEqual([['src', 'blob:userscript-resource']]);
    });

    it('performs only one direct request after the primary image errors', async () => {
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        globalThis.GM_getResourceURL = vi.fn(() => 'blob:userscript-resource');
        const { assignments, image, renderer } = createRenderer(
            rendererCase.factory,
            rendererCase.theme,
        );

        renderer.init();
        await Promise.resolve();
        image.onerror();
        image.onerror();

        expect(assignments).toEqual([
            ['src', 'blob:userscript-resource'],
            ['crossOrigin', 'anonymous'],
            ['referrerPolicy', 'no-referrer'],
            ['src', rendererCase.directUrl],
        ]);
        expect(assignments.filter(([property]) => property === 'src')).toHaveLength(2);
        expect(console.warn).toHaveBeenCalledOnce();
    });
});
