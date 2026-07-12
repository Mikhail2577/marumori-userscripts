import { describe, expect, it, vi } from 'vitest';
import { syncAudioPolicy } from '../../src/audio/policy.js';
import { createSfxPlayer } from '../../src/audio/sfx.js';
import { createToneScheduler } from '../../src/audio/tone-scheduler.js';
import { FakeAudioContext } from '../fixtures/fake-audio.js';

function createHarness() {
    const context = new FakeAudioContext({ state: 'running', currentTime: 2 });
    const tones = createToneScheduler();
    const audio = {
        get runningContext() {
            return context;
        },
        isRunning: (candidate) => candidate === context && candidate.state === 'running',
        unlock: () => Promise.resolve(context),
    };
    const sfx = createSfxPlayer({
        audio,
        scheduleSfx({ context: audioContext, destination }) {
            tones.schedule({
                context: audioContext,
                destination,
                frequency: 440,
                delay: 1.15,
            });
            return 1;
        },
        stopScheduled: tones.stopAll,
    });
    const lifecycle = {
        armGestureUnlock: vi.fn(),
        disarmGestureUnlock: vi.fn(),
        resume: vi.fn(() => Promise.resolve()),
    };
    return { context, lifecycle, sfx };
}

describe('settings-driven audio policy', () => {
    it.each([
        { label: 'SFX is disabled', sfxEnabled: false, sfxVolume: 1 },
        { label: 'SFX volume reaches zero', sfxEnabled: true, sfxVolume: 0 },
    ])('stops delayed tones when $label', async ({ sfxEnabled, sfxVolume }) => {
        const { context, lifecycle, sfx } = createHarness();
        await sfx.play('sessionComplete');
        expect(context.oscillators[0].stopCalls).toHaveLength(1);

        expect(
            syncAudioPolicy({
                lifecycle,
                sfx,
                sfxEnabled,
                sfxVolume,
                musicEnabled: false,
                musicVolume: 0,
            }),
        ).toBe('inaudible');

        expect(context.oscillators[0].stopCalls).toHaveLength(2);
        expect(context.oscillators[0].stopCalls.at(-1)).toBe(context.currentTime);
        expect(lifecycle.disarmGestureUnlock).toHaveBeenCalledTimes(1);
    });

    it('uses an enabling user gesture immediately when audible work appears', () => {
        const { lifecycle, sfx } = createHarness();

        expect(
            syncAudioPolicy({
                lifecycle,
                sfx,
                sfxEnabled: true,
                sfxVolume: 0.5,
                musicEnabled: false,
                musicVolume: 0,
                consumeGesture: true,
            }),
        ).toBe('resuming');
        expect(lifecycle.resume).toHaveBeenCalledTimes(1);
        expect(lifecycle.armGestureUnlock).not.toHaveBeenCalled();
    });
});
