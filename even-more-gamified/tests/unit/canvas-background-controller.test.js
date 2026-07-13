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

class ManualFrameScheduler {
    constructor() {
        this.time = 0;
        this.nextId = 1;
        this.frames = new Map();
        this.timers = new Map();
    }

    requestFrame = (callback) => {
        const id = this.nextId++;
        this.frames.set(id, callback);
        return id;
    };

    cancelFrame = (id) => {
        this.frames.delete(id);
    };

    setTimer = (callback, delay) => {
        const id = this.nextId++;
        this.timers.set(id, { callback, due: this.time + delay });
        return id;
    };

    clearTimer = (id) => {
        this.timers.delete(id);
    };

    takeFrame() {
        const next = this.frames.entries().next().value;
        if (!next) return null;
        const [id, callback] = next;
        this.frames.delete(id);
        return { callback, id };
    }

    runFrame(now) {
        const frame = this.takeFrame();
        if (!frame) return false;
        this.time = now;
        frame.callback(now);
        return true;
    }
}

function createControllerHarness({ profile = 'balanced', renderer = 'matrix' } = {}) {
    const context = createNoopCanvasContext();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
    const scheduler = new ManualFrameScheduler();
    const activity = { reducedMotion: false, sessionActive: true };
    const theme = {
        id: renderer,
        background: {
            allowCanvasEffects: true,
            renderer,
            shootingStars: false,
        },
    };
    const settings = {
        backgroundTheme: renderer,
        crtEnabled: false,
        performanceProfile: profile,
        visualsEnabled: true,
    };
    const themeManager = {
        applyTheme: vi.fn(() => theme),
        getActiveTheme: vi.fn(() => theme),
    };
    const controller = createCanvasBackgroundController({
        document,
        window,
        settings,
        themeManager,
        crtController: { cleanup: vi.fn(), sync: vi.fn() },
        isLiteMode: () => profile === 'lite',
        isMaxMode: () => profile === 'max',
        prefersReducedMotion: () => activity.reducedMotion,
        isAnswerResolved: () => false,
        isSessionActive: () => activity.sessionActive,
        requestFrame: scheduler.requestFrame,
        cancelFrame: scheduler.cancelFrame,
        setTimer: scheduler.setTimer,
        clearTimer: scheduler.clearTimer,
        performanceNow: () => scheduler.time,
    });
    return { activity, context, controller, scheduler, settings, theme, themeManager };
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

    it('keeps balanced rendering capped through a high-refresh frame stream', () => {
        const { context, controller, scheduler } = createControllerHarness();
        controller.build();

        for (let now = 1000 / 120; now < 1000 - 1e-6; now += 1000 / 120) {
            expect(scheduler.runFrame(now)).toBe(true);
        }

        expect(context.clearRect.mock.calls.length).toBeGreaterThanOrEqual(59);
        expect(context.clearRect.mock.calls.length).toBeLessThanOrEqual(61);
        expect(scheduler.frames.size).toBe(1);
        controller.stop();
    });

    it('pauses a completed session without removing its last frame and resumes once', () => {
        const { activity, context, controller, scheduler } = createControllerHarness();
        controller.build();
        expect(context.clearRect).toHaveBeenCalledOnce();
        expect(scheduler.frames.size).toBe(1);

        activity.sessionActive = false;
        expect(controller.pause()).toBe(true);
        expect(scheduler.frames.size).toBe(0);
        expect(document.getElementById('mm-starfield')).toBeInstanceOf(HTMLCanvasElement);

        controller.sync();
        expect(context.clearRect).toHaveBeenCalledOnce();
        expect(scheduler.frames.size).toBe(0);

        activity.sessionActive = true;
        expect(controller.resume()).toBe(true);
        expect(context.clearRect).toHaveBeenCalledTimes(2);
        expect(scheduler.frames.size).toBe(1);
        expect(controller.resume()).toBe(false);
        expect(context.clearRect).toHaveBeenCalledTimes(2);
        expect(scheduler.frames.size).toBe(1);
        controller.stop();
    });

    it('keeps completion and hidden-tab ownership composed across visibility changes', () => {
        const { activity, context, controller, scheduler } = createControllerHarness();
        controller.build();

        Object.defineProperty(document, 'hidden', { configurable: true, value: true });
        document.dispatchEvent(new Event('visibilitychange'));
        expect(scheduler.frames.size).toBe(0);

        activity.sessionActive = false;
        Object.defineProperty(document, 'hidden', { configurable: true, value: false });
        document.dispatchEvent(new Event('visibilitychange'));
        expect(context.clearRect).toHaveBeenCalledOnce();
        expect(scheduler.frames.size).toBe(0);

        activity.sessionActive = true;
        controller.resume();
        controller.resume();
        expect(scheduler.frames.size).toBe(1);
        controller.stop();
    });

    it('reconfigures live reduced motion without duplicate loops or completed-session resume', () => {
        const { activity, context, controller, scheduler } = createControllerHarness();
        controller.build();

        activity.reducedMotion = true;
        expect(controller.syncReducedMotion()).toBe(false);
        expect(context.clearRect).toHaveBeenCalledTimes(2);
        expect(scheduler.frames.size).toBe(0);

        activity.reducedMotion = false;
        expect(controller.syncReducedMotion()).toBe(true);
        expect(context.clearRect).toHaveBeenCalledTimes(3);
        expect(scheduler.frames.size).toBe(1);

        activity.sessionActive = false;
        controller.pause();
        activity.reducedMotion = true;
        controller.syncReducedMotion();
        activity.reducedMotion = false;
        expect(controller.syncReducedMotion()).toBe(false);
        expect(scheduler.frames.size).toBe(0);
        controller.stop();
    });

    it('builds an initially suppressed animated canvas when reduced motion turns off', () => {
        const { activity, controller, scheduler } = createControllerHarness();
        activity.reducedMotion = true;
        controller.build();
        expect(document.getElementById('mm-starfield')).toBeNull();

        activity.reducedMotion = false;
        expect(controller.syncReducedMotion()).toBe(true);
        expect(document.getElementById('mm-starfield')).toBeInstanceOf(HTMLCanvasElement);
        expect(scheduler.frames.size).toBe(1);
        controller.stop();
    });

    it('redraws a resized completed canvas once without reopening its loop', () => {
        vi.useFakeTimers();
        try {
            const { activity, context, controller, scheduler } = createControllerHarness();
            controller.build();
            activity.sessionActive = false;
            controller.pause();
            const drawsBeforeResize = context.clearRect.mock.calls.length;

            window.dispatchEvent(new Event('resize'));
            vi.advanceTimersByTime(180);

            expect(context.clearRect).toHaveBeenCalledTimes(drawsBeforeResize + 1);
            expect(scheduler.frames.size).toBe(0);
            controller.stop();
        } finally {
            vi.useRealTimers();
        }
    });

    it('rejects a dispatched stale frame after pause and resume', () => {
        const { activity, context, controller, scheduler } = createControllerHarness();
        controller.build();
        const staleFrame = scheduler.takeFrame();
        expect(staleFrame).not.toBeNull();

        activity.sessionActive = false;
        controller.pause();
        activity.sessionActive = true;
        controller.resume();
        expect(scheduler.frames.size).toBe(1);
        const drawsBeforeStaleFrame = context.clearRect.mock.calls.length;

        staleFrame.callback(16);
        expect(context.clearRect).toHaveBeenCalledTimes(drawsBeforeStaleFrame);
        expect(scheduler.frames.size).toBe(1);
        controller.stop();
    });

    it('restarts a theme while paused without reopening continuous work', () => {
        const { activity, controller, scheduler } = createControllerHarness();
        controller.build();
        const originalCanvas = document.getElementById('mm-starfield');
        activity.sessionActive = false;
        controller.pause();

        controller.restart();

        expect(document.getElementById('mm-starfield')).toBeInstanceOf(HTMLCanvasElement);
        expect(document.getElementById('mm-starfield')).not.toBe(originalCanvas);
        expect(scheduler.frames.size).toBe(0);
        controller.stop();
    });
});
