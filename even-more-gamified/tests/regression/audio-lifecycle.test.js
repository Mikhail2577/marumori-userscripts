import { describe, expect, it, vi } from 'vitest';
import { createAudioContextAdapter } from '../../src/adapters/audio-context.js';
import { createAudioLifecycle } from '../../src/audio/lifecycle.js';
import { createMusicController } from '../../src/audio/music.js';
import { createSfxPlayer } from '../../src/audio/sfx.js';
import {
    createDeferred,
    FakeAudioContext,
    createVisibilityTarget,
} from '../fixtures/fake-audio.js';

function createMusic(audio, overrides = {}) {
    return createMusicController({
        audio,
        schedulePattern: vi.fn(() => 1),
        ...overrides,
    });
}

async function settle() {
    for (let turn = 0; turn < 30; turn += 1) await Promise.resolve();
}

describe('Web Audio readiness', () => {
    it('deduplicates awaited unlocks and reuses one context', async () => {
        const resume = createDeferred();
        const context = new FakeAudioContext();
        context.setResumeImplementation((audioContext) =>
            resume.promise.then(() => audioContext.setState('running')),
        );
        const createContext = vi.fn(() => context);
        const audio = createAudioContextAdapter({ createContext });

        const first = audio.unlock();
        const duplicate = audio.unlock();

        expect(duplicate).toBe(first);
        expect(createContext).toHaveBeenCalledTimes(1);
        expect(context.resumeCalls).toBe(1);
        expect(audio.runningContext).toBeNull();

        resume.resolve();
        await expect(first).resolves.toBe(context);
        await expect(duplicate).resolves.toBe(context);
        await expect(audio.unlock()).resolves.toBe(context);
        expect(createContext).toHaveBeenCalledTimes(1);
        expect(context.resumeCalls).toBe(1);
    });

    it('does not create a music bus or schedule notes until resume is running', async () => {
        const resume = createDeferred();
        const context = new FakeAudioContext();
        context.setResumeImplementation((audioContext) =>
            resume.promise.then(() => audioContext.setState('running')),
        );
        const audio = createAudioContextAdapter({ createContext: () => context });
        const schedulePattern = vi.fn(() => 1);
        const music = createMusic(audio, { schedulePattern });

        const start = music.start();
        expect(context.createGainCalls).toBe(0);
        expect(schedulePattern).not.toHaveBeenCalled();

        resume.resolve();
        await expect(start).resolves.toMatchObject({ ok: true, status: 'playing' });
        expect(context.createGainCalls).toBe(1);
        expect(schedulePattern).toHaveBeenCalledTimes(1);
    });

    it('treats an interrupted context as blocked when resume does not make it running', async () => {
        const context = new FakeAudioContext({ state: 'interrupted' });
        context.setResumeImplementation(() => Promise.resolve());
        const audio = createAudioContextAdapter({ createContext: () => context });
        const schedulePattern = vi.fn(() => 1);
        const music = createMusic(audio, { schedulePattern });

        await expect(music.start()).resolves.toMatchObject({
            ok: false,
            status: 'blocked',
            reason: 'context-not-running',
        });
        expect(context.createGainCalls).toBe(0);
        expect(schedulePattern).not.toHaveBeenCalled();
    });

    it('skips zero-volume music and SFX without even creating a context', async () => {
        const context = new FakeAudioContext({ state: 'running' });
        const createContext = vi.fn(() => context);
        const audio = createAudioContextAdapter({ createContext });
        const schedulePattern = vi.fn(() => 1);
        const scheduleSfx = vi.fn();
        const music = createMusic(audio, {
            getVolume: () => 0,
            schedulePattern,
        });
        const sfx = createSfxPlayer({
            audio,
            getVolume: () => 0,
            scheduleSfx,
        });

        await expect(music.start()).resolves.toMatchObject({
            ok: false,
            reason: 'zero-volume',
        });
        await expect(sfx.play('correct')).resolves.toMatchObject({
            ok: false,
            reason: 'zero-volume',
        });
        expect(createContext).not.toHaveBeenCalled();
        expect(context.createGainCalls).toBe(0);
        expect(schedulePattern).not.toHaveBeenCalled();
        expect(scheduleSfx).not.toHaveBeenCalled();
    });

    it('shares the reusable context between SFX and music schedulers', async () => {
        const context = new FakeAudioContext({ state: 'running' });
        const createContext = vi.fn(() => context);
        const audio = createAudioContextAdapter({ createContext });
        const schedulePattern = vi.fn(() => 1);
        const scheduleSfx = vi.fn();
        const music = createMusic(audio, { schedulePattern });
        const sfx = createSfxPlayer({ audio, scheduleSfx });

        await sfx.play('correct', { streak: 2 });
        await music.start();

        expect(createContext).toHaveBeenCalledTimes(1);
        expect(scheduleSfx).toHaveBeenCalledWith(
            expect.objectContaining({
                context,
                eventType: 'correct',
                eventContext: { streak: 2 },
            }),
        );
        expect(schedulePattern).toHaveBeenCalledWith(expect.objectContaining({ context }));
    });

    it('preserves the numeric stopMusic fade argument used by the legacy API', async () => {
        vi.useFakeTimers();
        const context = new FakeAudioContext({ state: 'running', currentTime: 4 });
        const audio = createAudioContextAdapter({ createContext: () => context });
        const music = createMusic(audio);
        await music.startMusic();
        const musicBus = context.gains[0];

        music.stopMusic(0.2);

        expect(music.isPlaying).toBe(false);
        expect(musicBus.gain.calls).toContainEqual({
            method: 'linearRampToValueAtTime',
            value: 0,
            time: 4.2,
        });
        vi.advanceTimersByTime(300);
        expect(musicBus.disconnectCalls).toBe(1);
        vi.useRealTimers();
    });
});

describe('audio gesture and page lifecycle', () => {
    it('arms only when music or SFX has audible work', async () => {
        const context = new FakeAudioContext();
        const createContext = vi.fn(() => context);
        const audio = createAudioContextAdapter({ createContext });
        const music = createMusic(audio);
        const visibility = createVisibilityTarget();
        let audibleWork = false;
        const lifecycle = createAudioLifecycle({
            audio,
            music,
            target: visibility.target,
            isHidden: visibility.isHidden,
            shouldArmUnlock: () => audibleWork,
        });

        lifecycle.install();
        expect(lifecycle.isGestureArmed).toBe(false);
        visibility.gesture();
        await settle();
        expect(createContext).not.toHaveBeenCalled();

        audibleWork = true;
        expect(lifecycle.armGestureUnlock()).toBe(true);
        visibility.gesture();
        await settle();
        expect(createContext).toHaveBeenCalledTimes(1);
    });

    it('never starts a non-running context outside a gesture during install', async () => {
        const resume = createDeferred();
        const context = new FakeAudioContext();
        context.setResumeImplementation((audioContext) =>
            resume.promise.then(() => audioContext.setState('running')),
        );
        const createContext = vi.fn(() => context);
        const audio = createAudioContextAdapter({ createContext });
        const music = createMusic(audio);
        const visibility = createVisibilityTarget();
        const lifecycle = createAudioLifecycle({
            audio,
            music,
            target: visibility.target,
            isHidden: visibility.isHidden,
            shouldArmUnlock: () => true,
        });

        lifecycle.install({ start: true });
        await settle();
        expect(createContext).not.toHaveBeenCalled();
        expect(lifecycle.isGestureArmed).toBe(true);

        visibility.gesture();
        expect(createContext).toHaveBeenCalledTimes(1);
        expect(context.resumeCalls).toBe(1);
        resume.resolve();
        await settle();
        expect(context.state).toBe('running');
    });

    it('keeps gesture handlers through a failed unlock and removes them after success', async () => {
        const context = new FakeAudioContext({ state: 'interrupted' });
        context.setResumeImplementation((audioContext) => {
            if (audioContext.resumeCalls === 2) audioContext.setState('running');
            return Promise.resolve();
        });
        const audio = createAudioContextAdapter({ createContext: () => context });
        const music = createMusic(audio);
        const visibility = createVisibilityTarget();
        const lifecycle = createAudioLifecycle({
            audio,
            music,
            target: visibility.target,
            isHidden: visibility.isHidden,
        });
        lifecycle.install();

        expect(lifecycle.isGestureArmed).toBe(true);
        visibility.gesture();
        await settle();
        expect(context.resumeCalls).toBe(1);
        expect(lifecycle.isGestureArmed).toBe(true);

        visibility.gesture('keydown');
        await settle();
        expect(context.resumeCalls).toBe(2);
        expect(lifecycle.isGestureArmed).toBe(false);

        visibility.gesture();
        await settle();
        expect(context.resumeCalls).toBe(2);
    });

    it('re-arms gesture recovery when a running context becomes interrupted', async () => {
        const context = new FakeAudioContext();
        const audio = createAudioContextAdapter({ createContext: () => context });
        const music = createMusic(audio);
        const visibility = createVisibilityTarget();
        const lifecycle = createAudioLifecycle({
            audio,
            music,
            target: visibility.target,
            isHidden: visibility.isHidden,
        });
        lifecycle.install();

        visibility.gesture();
        await settle();
        expect(context.state).toBe('running');
        expect(lifecycle.isGestureArmed).toBe(false);

        context.setState('interrupted');
        expect(lifecycle.isGestureArmed).toBe(true);
        visibility.gesture();
        await settle();
        expect(context.resumeCalls).toBe(2);
        expect(context.state).toBe('running');
        expect(lifecycle.isGestureArmed).toBe(false);
    });

    it('cancels a pending visibility suspend when the page becomes visible', async () => {
        vi.useFakeTimers();
        const context = new FakeAudioContext({ state: 'running' });
        const audio = createAudioContextAdapter({ createContext: () => context });
        await audio.unlock();
        const schedulePattern = vi.fn(() => 1);
        const music = createMusic(audio, { schedulePattern });
        const visibility = createVisibilityTarget();
        const lifecycle = createAudioLifecycle({
            audio,
            music,
            target: visibility.target,
            isHidden: visibility.isHidden,
            suspendDelayMs: 260,
        });
        lifecycle.install({ start: true });
        await settle();

        visibility.setHidden(true);
        vi.advanceTimersByTime(200);
        visibility.setHidden(false);
        await settle();
        vi.advanceTimersByTime(100);

        expect(context.suspendCalls).toBe(0);
        expect(context.state).toBe('running');
        expect(schedulePattern).toHaveBeenCalledTimes(2);
        lifecycle.cleanup();
        vi.useRealTimers();
    });

    it('uses the SFX-enabling gesture before observer-originated playback', async () => {
        const context = new FakeAudioContext();
        const createContext = vi.fn(() => context);
        const audio = createAudioContextAdapter({ createContext });
        const music = createMusic(audio, { isEnabled: () => false });
        const scheduleSfx = vi.fn(() => 1);
        let sfxEnabled = false;
        const sfx = createSfxPlayer({
            audio,
            isEnabled: () => sfxEnabled,
            scheduleSfx,
        });
        const visibility = createVisibilityTarget();
        const lifecycle = createAudioLifecycle({
            audio,
            music,
            sfx,
            target: visibility.target,
            isHidden: visibility.isHidden,
            shouldArmUnlock: () => sfxEnabled,
        });
        lifecycle.install();

        expect(lifecycle.isGestureArmed).toBe(false);
        expect(createContext).not.toHaveBeenCalled();

        // Mirrors the settings click handler: policy changes, then resume starts
        // synchronously while that enabling gesture is still active.
        sfxEnabled = true;
        await lifecycle.resume();
        await sfx.play('correct');

        expect(context.state).toBe('running');
        expect(createContext).toHaveBeenCalledTimes(1);
        expect(scheduleSfx).toHaveBeenCalledTimes(1);
        lifecycle.cleanup();
    });

    it('restarts from the current visibility owner when show follows an in-flight unlock', async () => {
        const resume = createDeferred();
        const context = new FakeAudioContext();
        context.setResumeImplementation((audioContext) =>
            resume.promise.then(() => audioContext.setState('running')),
        );
        const audio = createAudioContextAdapter({ createContext: () => context });
        const schedulePattern = vi.fn(() => 1);
        const music = createMusic(audio, { schedulePattern });
        const visibility = createVisibilityTarget();
        const lifecycle = createAudioLifecycle({
            audio,
            music,
            target: visibility.target,
            isHidden: visibility.isHidden,
        });
        lifecycle.install();

        visibility.gesture();
        visibility.setHidden(true);
        visibility.setHidden(false);
        resume.resolve();
        await settle();

        expect(context.resumeCalls).toBe(1);
        expect(context.suspendCalls).toBe(0);
        expect(schedulePattern).toHaveBeenCalledTimes(1);
        expect(music.isPlaying).toBe(true);
        lifecycle.cleanup();
    });

    it('invalidates pending unlock work and suspends after cleanup', async () => {
        const resume = createDeferred();
        const context = new FakeAudioContext();
        context.setResumeImplementation((audioContext) =>
            resume.promise.then(() => audioContext.setState('running')),
        );
        const audio = createAudioContextAdapter({ createContext: () => context });
        const schedulePattern = vi.fn(() => 1);
        const music = createMusic(audio, { schedulePattern });
        const visibility = createVisibilityTarget();
        const lifecycle = createAudioLifecycle({
            audio,
            music,
            target: visibility.target,
            isHidden: visibility.isHidden,
        });
        lifecycle.install();

        visibility.gesture();
        expect(context.resumeCalls).toBe(1);
        lifecycle.cleanup();
        resume.resolve();
        await settle();
        await settle();

        expect(schedulePattern).not.toHaveBeenCalled();
        expect(context.suspendCalls).toBe(1);
        expect(context.state).toBe('suspended');
        visibility.gesture();
        await settle();
        expect(context.resumeCalls).toBe(1);
    });

    it('cancels SFX whose unlock completes after disposal', async () => {
        const resume = createDeferred();
        const context = new FakeAudioContext();
        context.setResumeImplementation((audioContext) =>
            resume.promise.then(() => audioContext.setState('running')),
        );
        const audio = createAudioContextAdapter({ createContext: () => context });
        const scheduleSfx = vi.fn();
        const sfx = createSfxPlayer({ audio, scheduleSfx });

        const play = sfx.play('correct');
        sfx.dispose();
        resume.resolve();

        await expect(play).resolves.toMatchObject({
            ok: false,
            reason: 'stale-owner',
        });
        expect(scheduleSfx).not.toHaveBeenCalled();
    });

    it('stops already scheduled SFX when the player is cancelled', async () => {
        const context = new FakeAudioContext({ state: 'running' });
        const audio = createAudioContextAdapter({ createContext: () => context });
        const stopScheduled = vi.fn();
        const sfx = createSfxPlayer({
            audio,
            scheduleSfx: vi.fn(() => 1),
            stopScheduled,
        });

        await sfx.play('sessionComplete');
        sfx.cancel();

        expect(stopScheduled).toHaveBeenCalledTimes(1);
    });
});
