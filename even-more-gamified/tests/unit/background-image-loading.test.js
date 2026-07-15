import { afterEach, describe, expect, it, vi } from 'vitest';

import { NIGHTVIEW_IMAGE_URL, SHRINE_IMAGE_URL } from '../../src/config/themes.js';
import { drawDriftingCoverImage } from '../../src/backgrounds/renderers/image-background-helpers.js';
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
    const requestRender = vi.fn();
    const renderer = factory({
        ctx: {},
        theme,
        document: { createElement: vi.fn(() => image) },
        width: 1280,
        height: 720,
        frameScale: 1,
        isLiteMode: () => true,
        prefersReducedMotion: () => false,
        requestRender,
    });
    return { assignments, image, renderer, requestRender };
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

    it('requests a retained-frame render after the image becomes ready in Lite mode', async () => {
        globalThis.GM_getResourceURL = vi.fn(() => 'blob:userscript-resource');
        const { image, renderer, requestRender } = createRenderer(
            rendererCase.factory,
            rendererCase.theme,
        );

        renderer.init();
        await Promise.resolve();
        image.onload();

        expect(requestRender).toHaveBeenCalledOnce();
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

describe('cover image drawing', () => {
    it('preserves aspect-fill sizing and configured drift', () => {
        const ctx = { drawImage: vi.fn() };
        const image = { naturalWidth: 1600, naturalHeight: 900 };

        drawDriftingCoverImage({
            ctx,
            image,
            width: 1000,
            height: 1000,
            time: 0,
            animated: true,
            baseScale: 1.01,
            scalePulseRate: 0.06,
            driftXRate: 0.03,
            driftXDistance: 2.1,
            driftYRate: 0.026,
            driftYDistance: 1.2,
        });

        const drawWidth = 1000 * 1.01 * (1600 / 900);
        expect(ctx.drawImage).toHaveBeenCalledWith(
            image,
            (1000 - drawWidth) / 2,
            -3.8,
            drawWidth,
            1010,
        );
    });
});
