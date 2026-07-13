import { describe, expect, it, vi } from 'vitest';

import { resetRecordsAuthoritatively } from '../../src/gameplay/record-reset.js';

function createHarness({ withSnapshot = true } = {}) {
    let records = {
        days: {
            '2026-07-13': { score: 4000, combo: 12, multiplier: 3 },
        },
    };
    let storedRecords = structuredClone(records);
    let snapshot = withSnapshot ? { score: 4000, records: structuredClone(records) } : null;
    const saveRecords = vi.fn(() => {
        storedRecords = structuredClone(records);
    });
    const updateHud = vi.fn(() => structuredClone(records));
    const rewind = {
        get hasSnapshot() {
            return snapshot !== null;
        },
        updateSnapshot: vi.fn((update) => {
            if (!snapshot) return false;
            snapshot = update(snapshot);
            return true;
        }),
        discard: vi.fn(() => {
            snapshot = null;
        }),
    };

    function reset() {
        return resetRecordsAuthoritatively({
            rewind,
            setRecords(nextRecords) {
                records = nextRecords;
            },
            saveRecords,
            updateHud,
        });
    }

    return {
        reset,
        rewind,
        saveRecords,
        updateHud,
        get records() {
            return records;
        },
        get storedRecords() {
            return storedRecords;
        },
        get snapshot() {
            return snapshot;
        },
    };
}

describe('authoritative record reset', () => {
    it('keeps reset records empty if the preserved gameplay snapshot is later rewound', () => {
        const harness = createHarness();

        expect(harness.reset()).toEqual({ days: {} });
        expect(harness.records).toEqual({ days: {} });
        expect(harness.storedRecords).toEqual({ days: {} });
        expect(harness.snapshot).toEqual({ score: 4000, records: { days: {} } });
        expect(harness.rewind.hasSnapshot).toBe(true);
        expect(harness.saveRecords).toHaveBeenCalledTimes(1);
        expect(harness.updateHud).toHaveBeenCalledTimes(1);
        expect(harness.updateHud.mock.results[0].value).toEqual({ days: {} });

        // Simulate the record component restored by a later confirmed rewind.
        expect(structuredClone(harness.snapshot.records)).toEqual({ days: {} });
    });

    it('is idempotent and persists once per explicit reset', () => {
        const harness = createHarness();

        harness.reset();
        harness.reset();

        expect(harness.records).toEqual({ days: {} });
        expect(harness.storedRecords).toEqual({ days: {} });
        expect(harness.snapshot.records).toEqual({ days: {} });
        expect(harness.saveRecords).toHaveBeenCalledTimes(2);
        expect(harness.updateHud).toHaveBeenCalledTimes(2);
        expect(harness.rewind.discard).not.toHaveBeenCalled();
    });

    it('resets storage and HUD normally when no rewind snapshot exists', () => {
        const harness = createHarness({ withSnapshot: false });

        harness.reset();

        expect(harness.records).toEqual({ days: {} });
        expect(harness.storedRecords).toEqual({ days: {} });
        expect(harness.rewind.updateSnapshot).not.toHaveBeenCalled();
        expect(harness.saveRecords).toHaveBeenCalledTimes(1);
        expect(harness.updateHud).toHaveBeenCalledTimes(1);
    });

    it('fails closed by discarding an unusable snapshot without blocking the reset', () => {
        const harness = createHarness();
        harness.rewind.updateSnapshot.mockImplementation(() => {
            throw new Error('corrupt snapshot');
        });

        expect(() => harness.reset()).not.toThrow();
        expect(harness.records).toEqual({ days: {} });
        expect(harness.storedRecords).toEqual({ days: {} });
        expect(harness.rewind.discard).toHaveBeenCalledTimes(1);
    });
});
