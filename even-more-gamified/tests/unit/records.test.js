import { afterEach, describe, expect, it } from 'vitest';

import {
    deserializeRecords,
    emptyRecordDay,
    getRecordKey,
    getRecordsSignature,
    getRecordWindowCutoff,
    getRollingRecords,
    normalizeRecords,
    pruneRecords,
    serializeRecords,
    updateRollingRecords,
} from '../../src/gameplay/records.js';

describe('record normalization', () => {
    it('creates the legacy empty-day shape', () => {
        expect(emptyRecordDay()).toEqual({ score: 0, combo: 0, multiplier: 1 });
    });

    it('filters invalid entries and normalizes numeric values', () => {
        expect(
            normalizeRecords({
                days: {
                    '2026-07-10': { score: '123.9', combo: 4.9, multiplier: '3.8' },
                    '2026-07-11': { score: -50, combo: -2, multiplier: 0 },
                    'not-a-day': { score: 100, combo: 2, multiplier: 2 },
                    '2026-07-12': null,
                },
            }),
        ).toEqual({
            days: {
                '2026-07-10': { score: 123, combo: 4, multiplier: 3 },
                '2026-07-11': { score: 0, combo: 0, multiplier: 1 },
            },
        });
    });

    it('produces a stable sorted signature', () => {
        expect(
            getRecordsSignature({
                days: {
                    '2026-07-12': { score: 20, combo: 2, multiplier: 1 },
                    '2026-07-10': { score: 10, combo: 1, multiplier: 2 },
                },
            }),
        ).toBe('2026-07-10:10/1/2|2026-07-12:20/2/1');
    });

    it('normalizes stored JSON and serializes the current record shape', () => {
        const records = deserializeRecords(
            '{"days":{"2026-07-12":{"score":"20","combo":2,"multiplier":1}}}',
        );
        expect(JSON.parse(serializeRecords(records))).toEqual({
            days: {
                '2026-07-12': { score: 20, combo: 2, multiplier: 1 },
            },
        });
        expect(deserializeRecords('{broken')).toEqual({ days: {} });
    });
});

describe('rolling record window', () => {
    const originalTimezone = process.env.TZ;

    afterEach(() => {
        process.env.TZ = originalTimezone;
    });

    it('uses local calendar days across a fall-back DST transition', () => {
        process.env.TZ = 'Europe/Brussels';
        const now = new Date(2026, 9, 27, 12);
        const source = {
            days: Object.fromEntries(
                Array.from({ length: 8 }, (_, index) => {
                    const day = 20 + index;
                    return [`2026-10-${day}`, { score: day, combo: day, multiplier: 1 }];
                }),
            ),
        };

        const cutoff = new Date(getRecordWindowCutoff(now));
        expect(cutoff.getHours()).toBe(0);
        expect(getRecordKey(cutoff)).toBe('2026-10-21');

        const pruned = pruneRecords(source, now);
        expect(pruned.days).not.toHaveProperty('2026-10-20');
        expect(pruned.days).toHaveProperty('2026-10-21');
        expect(pruned.days).toHaveProperty('2026-10-27');
        expect(Object.keys(pruned.days)).toHaveLength(7);
    });

    it('does not mutate the supplied record object', () => {
        const source = {
            days: {
                '2026-07-01': { score: 10, combo: 1, multiplier: 1 },
                '2026-07-12': { score: 20, combo: 2, multiplier: 2 },
            },
        };
        pruneRecords(source, new Date(2026, 6, 12, 12));
        expect(source.days).toHaveProperty('2026-07-01');
    });

    it('finds independent best values in the retained window', () => {
        expect(
            getRollingRecords(
                {
                    days: {
                        '2026-07-11': { score: 500, combo: 3, multiplier: 2 },
                        '2026-07-12': { score: 200, combo: 20, multiplier: 4 },
                    },
                },
                new Date(2026, 6, 12, 12),
            ),
        ).toEqual({ score: 500, combo: 20, multiplier: 4 });
    });

    it('merges only improved values into the current day', () => {
        const source = {
            days: {
                '2026-07-12': { score: 500, combo: 10, multiplier: 3 },
            },
        };
        const improved = updateRollingRecords(
            source,
            { score: 400, answerStreak: 12, multiplier: 2 },
            new Date(2026, 6, 12, 12),
        );
        expect(improved.changed).toBe(true);
        expect(improved.records.days['2026-07-12']).toEqual({
            score: 500,
            combo: 12,
            multiplier: 3,
        });

        const unchanged = updateRollingRecords(
            improved.records,
            { score: 100, answerStreak: 1, multiplier: 1 },
            new Date(2026, 6, 12, 12),
        );
        expect(unchanged.changed).toBe(false);
    });

    it('marks calendar pruning as a persistent record change', () => {
        const result = updateRollingRecords(
            {
                days: {
                    '2026-07-01': { score: 500, combo: 10, multiplier: 3 },
                    '2026-07-12': { score: 100, combo: 2, multiplier: 1 },
                },
            },
            { score: 10, answerStreak: 1, multiplier: 1 },
            new Date(2026, 6, 12, 12),
        );

        expect(result.changed).toBe(true);
        expect(result.records.days).not.toHaveProperty('2026-07-01');
        expect(result.records.days['2026-07-12']).toEqual({
            score: 100,
            combo: 2,
            multiplier: 1,
        });
    });
});
