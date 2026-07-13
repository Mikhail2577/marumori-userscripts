import { normalizeRecords } from './records.js';

/**
 * Reset persisted records and the record component of any owned rewind
 * snapshot as one user action. Gameplay values in that snapshot remain
 * rewindable, but explicitly deleted records cannot be resurrected.
 */
export function resetRecordsAuthoritatively({ rewind, setRecords, saveRecords, updateHud } = {}) {
    if (typeof setRecords !== 'function') {
        throw new TypeError('Authoritative record reset requires a state setter');
    }
    if (typeof saveRecords !== 'function') {
        throw new TypeError('Authoritative record reset requires persistence');
    }
    if (typeof updateHud !== 'function') {
        throw new TypeError('Authoritative record reset requires a HUD update');
    }

    const emptyRecords = normalizeRecords({ days: {} });
    if (rewind?.hasSnapshot) {
        if (typeof rewind.updateSnapshot === 'function') {
            try {
                rewind.updateSnapshot((snapshot) => ({
                    ...snapshot,
                    records: normalizeRecords(emptyRecords),
                }));
            } catch {
                // Invalid snapshots fail closed; Reset Records remains authoritative.
                rewind.discard?.();
            }
        } else {
            rewind.discard?.();
        }
    }

    setRecords(emptyRecords);
    saveRecords();
    updateHud();
    return emptyRecords;
}
