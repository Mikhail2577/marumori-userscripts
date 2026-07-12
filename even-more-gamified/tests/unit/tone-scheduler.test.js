import { describe, expect, it, vi } from 'vitest';
import { createToneScheduler } from '../../src/audio/tone-scheduler.js';
import { FakeAudioContext } from '../fixtures/fake-audio.js';

describe('tracked SFX tone scheduling', () => {
    it('stops delayed oscillators during lifecycle cancellation', () => {
        const context = new FakeAudioContext({ state: 'running', currentTime: 4 });
        const scheduler = createToneScheduler();

        expect(
            scheduler.schedule({
                context,
                destination: context.destination,
                frequency: 440,
                delay: 1.15,
                duration: 0.2,
            }),
        ).toBe(true);
        expect(scheduler.activeCount).toBe(1);
        expect(context.oscillators[0].startCalls).toEqual([5.15]);

        scheduler.stopAll();

        expect(context.oscillators[0].stopCalls).toEqual([5.36, 4]);
        expect(scheduler.activeCount).toBe(0);
    });

    it('releases naturally ended oscillators from its ownership set', () => {
        const context = new FakeAudioContext({ state: 'running' });
        const scheduler = createToneScheduler({ onError: vi.fn() });
        scheduler.schedule({
            context,
            destination: context.destination,
            frequency: 660,
        });

        context.oscillators[0].dispatchEvent(new Event('ended'));

        expect(scheduler.activeCount).toBe(0);
    });
});
