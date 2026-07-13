import { afterEach, describe, expect, it, vi } from 'vitest';

import { createCanvasBackgroundController } from '../../src/backgrounds/canvas-background-controller.js';
import { createShootingStarSystem } from '../../src/backgrounds/renderers/shooting-stars.js';

const originalInnerWidth = Object.getOwnPropertyDescriptor(window, 'innerWidth');
const originalInnerHeight = Object.getOwnPropertyDescriptor(window, 'innerHeight');

function createContext() {
    const gradient = { addColorStop: vi.fn() };
    return {
        arc: vi.fn(),
        beginPath: vi.fn(),
        clearRect: vi.fn(),
        createLinearGradient: vi.fn(() => gradient),
        createRadialGradient: vi.fn(() => gradient),
        drawImage: vi.fn(),
        ellipse: vi.fn(),
        fill: vi.fn(),
        fillRect: vi.fn(),
        lineTo: vi.fn(),
        moveTo: vi.fn(),
        restore: vi.fn(),
        rotate: vi.fn(),
        save: vi.fn(),
        scale: vi.fn(),
        stroke: vi.fn(),
        translate: vi.fn(),
    };
}

function createSystem() {
    return createShootingStarSystem({
        settings: { visualsEnabled: true },
        isLiteMode: () => false,
        prefersReducedMotion: () => false,
        isAnswerResolved: () => false,
        hasShootingStars: () => true,
    });
}

describe('shooting-star backing coordinates', () => {
    afterEach(() => {
        Object.defineProperty(window, 'innerWidth', originalInnerWidth);
        Object.defineProperty(window, 'innerHeight', originalInnerHeight);
        document.getElementById('mm-starfield')?.remove();
        vi.restoreAllMocks();
    });

    it('seeds and draws from backing dimensions when the CSS viewport is larger', () => {
        Object.defineProperty(window, 'innerWidth', { configurable: true, value: 3840 });
        Object.defineProperty(window, 'innerHeight', { configurable: true, value: 2160 });
        vi.spyOn(Math, 'random').mockReturnValue(0.5);
        const ctx = createContext();
        const shootingStars = createSystem();

        expect(shootingStars.resize(2560, 1440)).toBe(true);
        expect(shootingStars.trigger()).toBe(true);
        shootingStars.draw(ctx, 1);

        const headX = 2560 * 0.875;
        const headY = 1440 * 0.25;
        const tailX = headX - (-12.5 * 140) / 12;
        const tailY = headY - (6 * 140) / 12;
        expect(ctx.createLinearGradient).toHaveBeenCalledWith(headX, headY, tailX, tailY);
        expect(ctx.moveTo).toHaveBeenCalledWith(headX, headY);
        expect(headX).toBeLessThan(window.innerWidth * 0.875);
        expect(headY).toBeLessThan(window.innerHeight * 0.25);
    });

    it('clears transient stars when backing dimensions change', () => {
        vi.spyOn(Math, 'random').mockReturnValue(0.5);
        const ctx = createContext();
        const shootingStars = createSystem();

        expect(shootingStars.trigger()).toBe(false);
        shootingStars.resize(2560, 1440);
        shootingStars.trigger();
        shootingStars.resize(1280, 720);
        shootingStars.draw(ctx, 1);

        expect(ctx.moveTo).not.toHaveBeenCalled();
    });

    it('culls a complete trail once it leaves the backing surface', () => {
        vi.spyOn(Math, 'random').mockReturnValue(0);
        const ctx = createContext();
        const shootingStars = createSystem();
        shootingStars.resize(100, 100);
        shootingStars.trigger();

        shootingStars.draw(ctx, 10);
        shootingStars.draw(ctx, 10);
        shootingStars.draw(ctx, 10);

        expect(ctx.moveTo).toHaveBeenCalledTimes(2);
    });

    it('receives capped canvas dimensions from the background controller', () => {
        Object.defineProperty(window, 'innerWidth', { configurable: true, value: 3840 });
        Object.defineProperty(window, 'innerHeight', { configurable: true, value: 2160 });
        vi.spyOn(Math, 'random').mockReturnValue(0.5);
        const ctx = createContext();
        vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx);
        const theme = {
            id: 'starfield',
            background: {
                allowCanvasEffects: true,
                renderer: 'starfield',
                shootingStars: true,
            },
        };
        let nextFrame;
        const controller = createCanvasBackgroundController({
            document,
            window,
            settings: {
                backgroundTheme: 'starfield',
                crtEnabled: false,
                performanceProfile: 'balanced',
                visualsEnabled: true,
            },
            themeManager: {
                applyTheme: vi.fn(() => theme),
                getActiveTheme: vi.fn(() => theme),
            },
            crtController: { cleanup: vi.fn(), sync: vi.fn() },
            isLiteMode: () => false,
            isMaxMode: () => false,
            prefersReducedMotion: () => false,
            isAnswerResolved: () => false,
            requestFrame: vi.fn((callback) => {
                nextFrame = callback;
                return 1;
            }),
            cancelFrame: vi.fn(),
            performanceNow: () => 100,
        });

        controller.build();
        const canvas = document.getElementById('mm-starfield');
        expect(canvas.width).toBe(2560);
        expect(canvas.height).toBe(1440);
        expect(controller.triggerShootingStar()).toBe(true);
        ctx.createLinearGradient.mockClear();

        nextFrame(117);

        expect(ctx.createLinearGradient).toHaveBeenCalledWith(
            canvas.width * 0.875,
            canvas.height * 0.25,
            expect.any(Number),
            expect.any(Number),
        );
        controller.stop();
    });
});
