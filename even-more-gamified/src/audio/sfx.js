import {
    AUDIO_CONTEXT_RUNNING,
    createAudioErrorReporter,
    createAudioOutcome,
    normalizeAudioVolume,
} from './runtime-helpers.js';

/**
 * Keeps SFX policy separate from synthesis. `scheduleSfx` may reuse the legacy
 * theme-note resolver; it is only invoked with a verified running context.
 */
export function createSfxPlayer({
    audio,
    scheduleSfx,
    isEnabled = () => true,
    getVolume = () => 1,
    onError = () => {},
    stopScheduled = () => {},
} = {}) {
    if (!audio?.unlock || !audio?.isRunning) {
        throw new TypeError('Sound effects require an audio context adapter');
    }
    if (typeof scheduleSfx !== 'function') {
        throw new TypeError('Sound effects require an injected scheduler');
    }

    const blockedListeners = new Set();
    const warn = createAudioErrorReporter(onError);
    let generation = 0;
    let disposed = false;

    function notifyNeedsUnlock() {
        for (const listener of blockedListeners) {
            try {
                listener('context-not-running');
            } catch (error) {
                warn(error, 'blocked-listener');
            }
        }
    }

    function onNeedsUnlock(listener) {
        if (typeof listener !== 'function') {
            throw new TypeError('SFX blocked listener must be a function');
        }
        blockedListeners.add(listener);
        return () => blockedListeners.delete(listener);
    }

    function schedule(context, eventType, eventContext, ownerGeneration) {
        if (disposed || ownerGeneration !== generation) {
            return createAudioOutcome(false, 'cancelled', 'stale-owner');
        }
        if (!isEnabled()) return createAudioOutcome(false, 'skipped', 'disabled');
        const volume = normalizeAudioVolume(getVolume());
        if (volume <= 0) return createAudioOutcome(false, 'skipped', 'zero-volume');
        if (!context || context.state !== AUDIO_CONTEXT_RUNNING || !audio.isRunning(context)) {
            notifyNeedsUnlock();
            return createAudioOutcome(false, 'blocked', 'context-not-running');
        }

        try {
            const scheduled = scheduleSfx({
                context,
                destination: context.destination,
                eventType,
                eventContext,
                volume,
            });
            return createAudioOutcome(true, 'scheduled', 'sfx-scheduled', { scheduled });
        } catch (error) {
            warn(error, 'schedule-sfx');
            return createAudioOutcome(false, 'failed', 'scheduler-error');
        }
    }

    function play(eventType, eventContext = {}) {
        if (disposed) {
            return Promise.resolve(createAudioOutcome(false, 'cancelled', 'disposed'));
        }
        if (!isEnabled()) {
            return Promise.resolve(createAudioOutcome(false, 'skipped', 'disabled'));
        }
        if (normalizeAudioVolume(getVolume()) <= 0) {
            return Promise.resolve(createAudioOutcome(false, 'skipped', 'zero-volume'));
        }

        const ownerGeneration = generation;
        const runningContext = audio.runningContext;
        if (runningContext) {
            return Promise.resolve(
                schedule(runningContext, eventType, eventContext, ownerGeneration),
            );
        }

        // Like the adapter, call unlock before yielding so resume can consume the
        // current user activation when play() originates from a click/key event.
        const ready = audio.unlock();
        return Promise.resolve(ready).then((context) =>
            schedule(context, eventType, eventContext, ownerGeneration),
        );
    }

    function cancel() {
        generation += 1;
        try {
            stopScheduled();
        } catch (error) {
            warn(error, 'stop-scheduled');
        }
    }

    function dispose() {
        if (disposed) return;
        cancel();
        disposed = true;
        blockedListeners.clear();
    }

    return Object.freeze({
        play,
        playThemeSound: play,
        cancel,
        onNeedsUnlock,
        dispose,
    });
}
