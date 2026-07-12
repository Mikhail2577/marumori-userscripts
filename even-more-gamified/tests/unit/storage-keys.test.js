import { describe, expect, it } from 'vitest';

import {
    LOCKED_CHALLENGE_FONT_STORAGE_KEY,
    RECORDS_STORAGE_KEY,
    SETTINGS_STORAGE_KEY,
    STORAGE_KEYS,
} from '../../src/storage/keys.js';

describe('persistent storage key compatibility', () => {
    it('keeps all keys used by installed legacy versions', () => {
        expect(SETTINGS_STORAGE_KEY).toBe('mmSettings');
        expect(RECORDS_STORAGE_KEY).toBe('mmRecords');
        expect(LOCKED_CHALLENGE_FONT_STORAGE_KEY).toBe('mmLockedChallengeFont');
        expect(STORAGE_KEYS).toEqual({
            settings: 'mmSettings',
            records: 'mmRecords',
            lockedChallengeFont: 'mmLockedChallengeFont',
        });
    });
});
