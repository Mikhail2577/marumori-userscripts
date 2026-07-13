import { describe, expect, it } from 'vitest';

import {
    CANVAS_PIXEL_BUDGETS,
    calculateCanvasSize,
    compactInPlace,
    createFrameCadenceGate,
} from '../../src/backgrounds/canvas-runtime.js';

describe('canvas runtime helpers', () => {
    it('preserves 1080p at balanced quality and caps a 4K backing store', () => {
        expect(calculateCanvasSize(1920, 1080)).toMatchObject({
            width: 1920,
            height: 1080,
            scale: 1,
        });

        const fourK = calculateCanvasSize(3840, 2160);
        expect(fourK.width * fourK.height).toBeLessThanOrEqual(CANVAS_PIXEL_BUDGETS.balanced);
        expect(fourK.width / fourK.height).toBeCloseTo(16 / 9, 2);
    });

    it('combines profile scaling with the pixel budget', () => {
        expect(calculateCanvasSize(1920, 1080, { scale: 0.7 })).toMatchObject({
            width: 1344,
            height: 756,
            scale: 0.7,
        });
    });

    it('compacts retained objects without replacing the source array', () => {
        const values = [{ life: 1 }, { life: 0 }, { life: 0.4 }];
        const result = compactInPlace(values, (value) => value.life > 0);

        expect(result).toBe(values);
        expect(values).toEqual([{ life: 1 }, { life: 0.4 }]);
    });

    it.each([60, 90, 120, 144, 165, 240])(
        'caps balanced cadence near 60 FPS on a %s Hz display',
        (refreshRate) => {
            const gate = createFrameCadenceGate();
            const displayInterval = 1000 / refreshRate;
            let draws = 0;

            for (let now = 0; now < 1000 - 1e-6; now += displayInterval) {
                if (gate.shouldRender(now)) draws++;
            }

            expect(draws).toBeGreaterThanOrEqual(59);
            expect(draws).toBeLessThanOrEqual(61);
        },
    );

    it('advances past long frames without an immediate catch-up burst', () => {
        const gate = createFrameCadenceGate();

        expect(gate.shouldRender(0)).toBe(true);
        expect(gate.shouldRender(500)).toBe(true);
        expect(gate.nextDeadline).toBeGreaterThan(500.5);
        expect(gate.shouldRender(500.1)).toBe(false);
        expect(gate.shouldRender(500.2)).toBe(false);
    });

    it('resets cadence from either a clean or explicit monotonic anchor', () => {
        const gate = createFrameCadenceGate();
        gate.shouldRender(0);
        gate.reset(100);

        expect(gate.shouldRender(100)).toBe(false);
        expect(gate.shouldRender(100 + 1000 / 60)).toBe(true);

        gate.reset();
        expect(gate.shouldRender(101)).toBe(true);
    });

    it('rejects invalid cadence configuration and timestamps', () => {
        expect(() => createFrameCadenceGate({ intervalMs: 0 })).toThrow(/interval/u);
        expect(() => createFrameCadenceGate({ earlyToleranceMs: -1 })).toThrow(/tolerance/u);
        expect(createFrameCadenceGate().shouldRender(Number.NaN)).toBe(false);
    });
});
