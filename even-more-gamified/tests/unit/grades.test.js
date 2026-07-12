import { describe, expect, it } from 'vitest';

import { calculateAccuracy, getGrade } from '../../src/gameplay/grades.js';

describe('session grades', () => {
    it.each([
        [95, 10_000, 'S', '#ffe066'],
        [95, 9_999, 'A', '#7f7'],
        [90, 0, 'A', '#7f7'],
        [75, 0, 'B', '#7cf'],
        [60, 0, 'C', '#f90'],
        [59, 1_000_000, 'D', '#f55'],
    ])('maps %s%% accuracy and %s points to %s', (accuracy, score, label, color) => {
        expect(getGrade(accuracy, score)).toMatchObject({ label, color });
    });

    it('keeps the unconditional D-grade fallback', () => {
        expect(getGrade(Number.NaN, Number.NaN).label).toBe('D');
    });
});

describe('accuracy', () => {
    it('matches the rounded summary percentage', () => {
        expect(calculateAccuracy(0, 0)).toBe(0);
        expect(calculateAccuracy(2, 1)).toBe(67);
        expect(calculateAccuracy(19, 1)).toBe(95);
    });
});
