import { describe, expect, it, vi } from 'vitest';
import { createThemeMusicScheduler } from '../../src/audio/theme-music-scheduler.js';
import { MUSIC_PRESETS } from '../../src/config/audio-presets.js';
import { FakeAudioContext } from '../fixtures/fake-audio.js';

describe('theme music scheduling', () => {
    it('schedules a theme bar through tracked Web Audio nodes', () => {
        const context = new FakeAudioContext({ state: 'running', currentTime: 2 });
        const destination = context.createGain();
        const scheduler = createThemeMusicScheduler();

        const duration = scheduler.scheduleBar(
            context,
            destination,
            2.5,
            MUSIC_PRESETS.voidSilence,
            0,
        );

        expect(duration).toBe(5.2);
        expect(scheduler.activeCount).toBe(1);
        expect(context.createOscillatorCalls).toBe(1);
        expect(context.createBiquadFilterCalls).toBe(1);
        expect(context.oscillators[0].startCalls).toEqual([2.5]);
        expect(context.oscillators[0].connections).toEqual([context.filters[0]]);
        expect(context.filters[0].connections).toEqual([context.gains[1]]);
        expect(context.gains[1].connections).toEqual([destination]);
        expect(context.filters[0].frequency.calls).toContainEqual({
            method: 'setValueAtTime',
            value: 360,
            time: 2.5,
        });
    });

    it('reads the current style for each default-theme bar', () => {
        const getMusicStyle = vi.fn(() => 'retro');
        const context = new FakeAudioContext({ state: 'running' });
        const scheduler = createThemeMusicScheduler({ getMusicStyle });

        const duration = scheduler.scheduleBar(
            context,
            context.destination,
            0.25,
            MUSIC_PRESETS.arcadeLofi,
            1,
        );

        expect(getMusicStyle).toHaveBeenCalledOnce();
        expect(duration).toBeCloseTo((60 / 104) * 8);
        expect(context.oscillators.length).toBeGreaterThan(0);
        expect(context.oscillators.some((oscillator) => oscillator.type === 'square')).toBe(true);
    });

    it('cancels every owned oscillator at the requested fade boundary', () => {
        const context = new FakeAudioContext({ state: 'running', currentTime: 7 });
        const scheduler = createThemeMusicScheduler();
        scheduler.scheduleBar(context, context.destination, 7.1, MUSIC_PRESETS.voidSilence, 0);
        const oscillator = context.oscillators[0];

        scheduler.stopScheduled({ context, fadeSeconds: 0.4 });

        expect(oscillator.stopCalls.at(-1)).toBe(7.4);
        expect(scheduler.activeCount).toBe(0);
    });

    it('releases naturally ended oscillators from ownership', () => {
        const context = new FakeAudioContext({ state: 'running' });
        const scheduler = createThemeMusicScheduler();
        scheduler.scheduleBar(context, context.destination, 0.1, MUSIC_PRESETS.voidSilence, 0);

        context.oscillators[0].dispatchEvent(new Event('ended'));

        expect(scheduler.activeCount).toBe(0);
    });
});
