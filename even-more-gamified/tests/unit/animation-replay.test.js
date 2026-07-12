// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';

import { createAnimationReplayer } from '../../src/effects/animation-replay.js';

function createScheduler() {
    let nextId = 1;
    const frames = new Map();
    const timers = new Map();
    return {
        frames,
        timers,
        requestAnimationFrame: vi.fn((callback) => {
            const id = nextId++;
            frames.set(id, callback);
            return id;
        }),
        cancelAnimationFrame: vi.fn((id) => frames.delete(id)),
        setTimeout: vi.fn((callback, delay) => {
            const id = nextId++;
            timers.set(id, { callback, delay });
            return id;
        }),
        clearTimeout: vi.fn((id) => timers.delete(id)),
        runFrame() {
            const [[id, callback]] = frames;
            frames.delete(id);
            callback();
        },
    };
}

describe('animation replay', () => {
    it('restarts through the compositor schedule without forcing layout', () => {
        const scheduler = createScheduler();
        const replayer = createAnimationReplayer({ scheduler });
        const element = document.body.appendChild(document.createElement('div'));
        element.classList.add('light');

        replayer.replay(element, ['light', 'hard'], 'hard', { removeAfterMs: 450 });
        expect(element.classList.contains('light')).toBe(false);
        expect(element.classList.contains('hard')).toBe(false);

        scheduler.runFrame();
        expect(element.classList.contains('hard')).toBe(true);
        expect([...scheduler.timers.values()][0].delay).toBe(450);
    });

    it('cancels stale frames when an animation is replayed or cleaned up', () => {
        const scheduler = createScheduler();
        const replayer = createAnimationReplayer({ scheduler });
        const element = document.body.appendChild(document.createElement('div'));

        replayer.replay(element, ['first', 'second'], 'first');
        replayer.replay(element, ['first', 'second'], 'second');
        expect(scheduler.cancelAnimationFrame).toHaveBeenCalledTimes(1);
        scheduler.runFrame();
        expect(element.classList.contains('second')).toBe(true);

        replayer.cancelAll();
        expect(element.classList.contains('second')).toBe(false);
    });
});
