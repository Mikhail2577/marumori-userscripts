import { describe, expect, it, vi } from 'vitest';

import { LifecycleScope } from '../../src/core/lifecycle.js';
import { subscribeMediaQuery } from '../../src/utils/media-query.js';

describe('media-query lifecycle subscription', () => {
    it('uses the modern change API and is removed exactly once by its lifecycle scope', () => {
        let subscribedListener;
        const mediaQuery = {
            addEventListener: vi.fn((_type, listener) => {
                subscribedListener = listener;
            }),
            removeEventListener: vi.fn(),
        };
        const listener = vi.fn();
        const scope = new LifecycleScope();
        scope.defer(subscribeMediaQuery(mediaQuery, listener));

        subscribedListener({ matches: true });
        expect(listener).toHaveBeenCalledOnce();
        expect(mediaQuery.addEventListener).toHaveBeenCalledWith('change', subscribedListener);

        scope.dispose();
        scope.dispose();
        subscribedListener({ matches: false });
        expect(listener).toHaveBeenCalledOnce();
        expect(mediaQuery.removeEventListener).toHaveBeenCalledOnce();
        expect(mediaQuery.removeEventListener).toHaveBeenCalledWith('change', subscribedListener);
    });

    it('falls back to the legacy listener API and cleans it idempotently', () => {
        let subscribedListener;
        const mediaQuery = {
            addListener: vi.fn((listener) => {
                subscribedListener = listener;
            }),
            removeListener: vi.fn(),
        };
        const listener = vi.fn();
        const remove = subscribeMediaQuery(mediaQuery, listener);

        subscribedListener({ matches: true });
        remove();
        remove();
        subscribedListener({ matches: false });

        expect(listener).toHaveBeenCalledOnce();
        expect(mediaQuery.removeListener).toHaveBeenCalledOnce();
        expect(mediaQuery.removeListener).toHaveBeenCalledWith(subscribedListener);
    });

    it('returns a safe no-op for an unavailable media query', () => {
        const listener = vi.fn();
        const remove = subscribeMediaQuery(null, listener);
        expect(() => remove()).not.toThrow();
        expect(listener).not.toHaveBeenCalled();
    });
});
