import { describe, expect, it, vi } from 'vitest';

import { createUserscriptStorage } from '../../src/adapters/userscript-storage.js';

describe('synchronous userscript storage adapter', () => {
    it('preserves existing string-backed JSON storage', () => {
        const values = new Map([['settings', '{"hudEnabled":false}']]);
        const storage = createUserscriptStorage({
            getValue: (key, fallback) => values.get(key) ?? fallback,
            setValue: (key, value) => values.set(key, value),
        });

        expect(storage.getJson('settings')).toEqual({ hudEnabled: false });
        expect(storage.setJson('records', { days: {} })).toBe(true);
        expect(values.get('records')).toBe('{"days":{}}');
    });

    it('fails closed around manager errors and malformed JSON', () => {
        const storage = createUserscriptStorage({
            getValue: vi.fn(() => {
                throw new Error('manager unavailable');
            }),
            setValue: vi.fn(() => {
                throw new Error('manager unavailable');
            }),
        });

        expect(storage.get('key', 'fallback')).toBe('fallback');
        expect(storage.set('key', 'value')).toBe(false);
        expect(storage.getJson('key', { safe: true })).toEqual({ safe: true });

        const malformed = createUserscriptStorage({
            getValue: () => '{broken',
            setValue: () => {},
        });
        expect(malformed.getJson('key', { safe: true })).toEqual({ safe: true });
    });
});
