import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createCanvasBackgroundController } from '../../src/backgrounds/canvas-background-controller.js';

function createMatrixContext() {
    return {
        clearRect: vi.fn(),
        fillText: vi.fn(),
        restore: vi.fn(),
        save: vi.fn(),
    };
}

function createNoopCanvasContext() {
    const methods = new Map();
    const gradient = { addColorStop: vi.fn() };
    return new Proxy(
        {},
        {
            get(target, property) {
                if (property in target) return target[property];
                if (property === 'createLinearGradient' || property === 'createRadialGradient') {
                    return () => gradient;
                }
                if (!methods.has(property)) methods.set(property, vi.fn());
                return methods.get(property);
            },
            set(target, property, value) {
                target[property] = value;
                return true;
            },
        },
    );
}

describe('canvas background controller lifecycle', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
        document.head.innerHTML = '';
        Object.defineProperty(document, 'hidden', {
            configurable: true,
            value: false,
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('owns one renderer frame and releases its listeners and canvas idempotently', () => {
        const context = createMatrixContext();
        vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
        const addWindowListener = vi.spyOn(window, 'addEventListener');
        const removeWindowListener = vi.spyOn(window, 'removeEventListener');
        const addDocumentListener = vi.spyOn(document, 'addEventListener');
        const removeDocumentListener = vi.spyOn(document, 'removeEventListener');
        const requestFrame = vi.fn(() => 41);
        const cancelFrame = vi.fn();
        const theme = {
            id: 'matrix',
            background: {
                allowCanvasEffects: true,
                renderer: 'matrix',
                shootingStars: false,
            },
        };
        const themeManager = {
            applyTheme: vi.fn(() => theme),
            getActiveTheme: vi.fn(() => theme),
        };

        const controller = createCanvasBackgroundController({
            document,
            window,
            settings: {
                backgroundTheme: 'matrix',
                crtEnabled: false,
                performanceProfile: 'max',
                visualsEnabled: true,
            },
            themeManager,
            crtController: { cleanup: vi.fn(), sync: vi.fn() },
            isLiteMode: () => false,
            isMaxMode: () => true,
            prefersReducedMotion: () => false,
            isAnswerResolved: () => false,
            requestFrame,
            cancelFrame,
            performanceNow: () => 100,
        });

        controller.build();

        expect(document.getElementById('mm-starfield')).toBeInstanceOf(HTMLCanvasElement);
        expect(context.clearRect).toHaveBeenCalledOnce();
        expect(requestFrame).toHaveBeenCalledOnce();
        expect(addWindowListener).toHaveBeenCalledWith('resize', expect.any(Function));
        expect(addDocumentListener).toHaveBeenCalledWith('visibilitychange', expect.any(Function));

        controller.stop();
        controller.stop();

        expect(cancelFrame).toHaveBeenCalledTimes(1);
        expect(cancelFrame).toHaveBeenCalledWith(41);
        expect(removeWindowListener).toHaveBeenCalledWith('resize', expect.any(Function));
        expect(removeDocumentListener).toHaveBeenCalledWith(
            'visibilitychange',
            expect.any(Function),
        );
        expect(document.getElementById('mm-starfield')).toBeNull();
    });

    it.each(['starfield', 'nebula', 'grid', 'gamecenter', 'shrine', 'nightview', 'matrix'])(
        'initializes and draws the %s renderer through the shared lifecycle',
        (renderer) => {
            const context = createNoopCanvasContext();
            vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
            const theme = {
                id: renderer,
                background: {
                    allowCanvasEffects: true,
                    renderer,
                    shootingStars: false,
                },
            };
            const controller = createCanvasBackgroundController({
                document,
                window,
                settings: {
                    backgroundTheme: renderer,
                    crtEnabled: false,
                    performanceProfile: 'max',
                    visualsEnabled: true,
                },
                themeManager: {
                    applyTheme: vi.fn(() => theme),
                    getActiveTheme: vi.fn(() => theme),
                },
                crtController: { cleanup: vi.fn(), sync: vi.fn() },
                isLiteMode: () => false,
                isMaxMode: () => true,
                prefersReducedMotion: () => false,
                isAnswerResolved: () => false,
                requestFrame: vi.fn(() => 9),
                cancelFrame: vi.fn(),
                performanceNow: () => 100,
            });

            expect(() => controller.build()).not.toThrow();
            expect(document.getElementById('mm-starfield')).toBeInstanceOf(HTMLCanvasElement);

            controller.stop();
        },
    );
});
