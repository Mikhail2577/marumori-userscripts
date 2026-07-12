import { describe, expect, it } from 'vitest';

import {
    CANVAS_PIXEL_BUDGETS,
    calculateCanvasSize,
    compactInPlace,
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
});
