const RUNNING = 'running';

function outcome(ok, status, reason, extra = {}) {
    return Object.freeze({ ok, status, reason, ...extra });
}

function normalizeVolume(value) {
    const volume = Number(value);
    return Number.isFinite(volume) ? Math.max(0, volume) : 0;
}

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
    let generation = 0;
    let disposed = false;

    function warn(error, operation) {
        try {
            onError(error, operation);
        } catch {
            // Diagnostics must not alter sound playback.
        }
    }

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
            return outcome(false, 'cancelled', 'stale-owner');
        }
        if (!isEnabled()) return outcome(false, 'skipped', 'disabled');
        const volume = normalizeVolume(getVolume());
        if (volume <= 0) return outcome(false, 'skipped', 'zero-volume');
        if (!context || context.state !== RUNNING || !audio.isRunning(context)) {
            notifyNeedsUnlock();
            return outcome(false, 'blocked', 'context-not-running');
        }

        try {
            const scheduled = scheduleSfx({
                context,
                destination: context.destination,
                eventType,
                eventContext,
                volume,
            });
            return outcome(true, 'scheduled', 'sfx-scheduled', { scheduled });
        } catch (error) {
            warn(error, 'schedule-sfx');
            return outcome(false, 'failed', 'scheduler-error');
        }
    }

    function play(eventType, eventContext = {}) {
        if (disposed) {
            return Promise.resolve(outcome(false, 'cancelled', 'disposed'));
        }
        if (!isEnabled()) {
            return Promise.resolve(outcome(false, 'skipped', 'disabled'));
        }
        if (normalizeVolume(getVolume()) <= 0) {
            return Promise.resolve(outcome(false, 'skipped', 'zero-volume'));
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
