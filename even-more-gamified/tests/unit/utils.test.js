import { describe, expect, it } from 'vitest';

import { clamp } from '../../src/utils/clamp.js';
import { safeJsonParse } from '../../src/utils/json.js';

describe('clamp', () => {
    it('coerces finite numeric values and clamps both bounds', () => {
        expect(clamp('0.25', 0, 1, 0.5)).toBe(0.25);
        expect(clamp(-2, 0, 1, 0.5)).toBe(0);
        expect(clamp(2, 0, 1, 0.5)).toBe(1);
    });

    it('returns the fallback verbatim for non-finite values', () => {
        expect(clamp(undefined, 5, 120, 2)).toBe(2);
        expect(clamp(Number.POSITIVE_INFINITY, 0, 1, 3)).toBe(3);
    });
});

describe('safeJsonParse', () => {
    it('returns all valid JSON values without reshaping them', () => {
        expect(safeJsonParse('{"enabled":true}')).toEqual({ enabled: true });
        expect(safeJsonParse('null')).toBeNull();
        expect(safeJsonParse('3')).toBe(3);
    });

    it('returns the exact fallback when parsing fails', () => {
        const fallback = { safe: true };
        expect(safeJsonParse('{broken', fallback)).toBe(fallback);
    });
});
