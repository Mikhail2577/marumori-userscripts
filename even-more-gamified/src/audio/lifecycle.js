import {
    AUDIO_CONTEXT_RUNNING,
    createAudioErrorReporter,
    createAudioOutcome,
    defaultAudioScheduler,
} from './runtime-helpers.js';

/**
 * Binds audio readiness to gestures, visibility and session cleanup.
 * Gesture listeners remain installed until an awaited unlock succeeds. They
 * are re-armed if Safari/WebKit later reports an interrupted context.
 */
export function createAudioLifecycle({
    audio,
    music,
    sfx = null,
    target = globalThis.document,
    scheduler,
    isHidden = () => Boolean(target?.hidden),
    gestureEvents = ['pointerdown', 'keydown'],
    suspendDelayMs = 260,
    hiddenFadeSeconds = 0.2,
    cleanupFadeSeconds = 0,
    shouldArmUnlock = () => true,
    onError = () => {},
} = {}) {
    if (!audio?.unlock || !audio?.suspend || !audio?.subscribe) {
        throw new TypeError('Audio lifecycle requires an audio context adapter');
    }
    if (!music?.start || !music?.stop) {
        throw new TypeError('Audio lifecycle requires a music controller');
    }
    if (!target?.addEventListener || !target?.removeEventListener) {
        throw new TypeError('Audio lifecycle target must be an EventTarget');
    }

    const clock = scheduler ?? defaultAudioScheduler();
    const warn = createAudioErrorReporter(onError);
    let installed = false;
    let gestureArmed = false;
    let gestureHandler = null;
    let unlocking = false;
    let generation = 0;
    let startAttempt = null;
    let suspendTimer = null;
    let removeAudioStateListener = null;
    let removeMusicBlockedListener = null;
    let removeSfxBlockedListener = null;

    function hidden() {
        try {
            return Boolean(isHidden());
        } catch (error) {
            warn(error, 'visibility');
            return true;
        }
    }

    function unlockIsRelevant() {
        try {
            return Boolean(shouldArmUnlock());
        } catch (error) {
            warn(error, 'unlock-eligibility');
            return false;
        }
    }

    function clearSuspendTimer() {
        if (suspendTimer === null) return;
        clock.clearTimeout(suspendTimer);
        suspendTimer = null;
    }

    function armGestureUnlock() {
        if (!installed || hidden() || gestureArmed || audio.runningContext || !unlockIsRelevant()) {
            return false;
        }
        gestureHandler = () => {
            void resume();
        };
        for (const eventType of gestureEvents) {
            target.addEventListener(eventType, gestureHandler, true);
        }
        gestureArmed = true;
        return true;
    }

    function disarmGestureUnlock() {
        if (!gestureArmed) return false;
        for (const eventType of gestureEvents) {
            target.removeEventListener(eventType, gestureHandler, true);
        }
        gestureArmed = false;
        gestureHandler = null;
        return true;
    }

    function handleAudioState(state) {
        if (!installed || hidden()) return;
        if (state === AUDIO_CONTEXT_RUNNING) {
            // During resume, wait for its promise to settle before considering the
            // unlock successful.
            if (!unlocking) {
                disarmGestureUnlock();
                void music.start({ context: audio.runningContext });
            }
        } else {
            armGestureUnlock();
        }
    }

    function scheduleSuspend(delay = suspendDelayMs) {
        clearSuspendTimer();
        const ownerGeneration = generation;
        suspendTimer = clock.setTimeout(
            () => {
                suspendTimer = null;
                if (ownerGeneration !== generation) return;
                void audio.suspend();
            },
            Math.max(0, delay),
        );
    }

    function resume() {
        if (!installed) {
            return Promise.resolve(createAudioOutcome(false, 'cancelled', 'not-installed'));
        }
        if (hidden()) {
            return Promise.resolve(createAudioOutcome(false, 'skipped', 'hidden'));
        }
        clearSuspendTimer();
        if (startAttempt) return startAttempt;

        const ownerGeneration = generation;
        const wasRunning = Boolean(audio.runningContext);
        unlocking = !wasRunning;
        let ready;
        try {
            // Must remain synchronous with the gesture handler.
            ready = audio.unlock();
        } catch (error) {
            unlocking = false;
            warn(error, 'unlock');
            armGestureUnlock();
            return Promise.resolve(createAudioOutcome(false, 'blocked', 'unlock-error'));
        }

        const attempt = Promise.resolve(ready)
            .then(async (context) => {
                if (!installed || ownerGeneration !== generation || hidden()) {
                    return createAudioOutcome(false, 'cancelled', 'stale-owner');
                }
                unlocking = false;
                if (
                    !context ||
                    context.state !== AUDIO_CONTEXT_RUNNING ||
                    !audio.isRunning(context)
                ) {
                    armGestureUnlock();
                    return createAudioOutcome(false, 'blocked', 'context-not-running');
                }

                disarmGestureUnlock();
                await music.start({ context });
                if (!installed || ownerGeneration !== generation || hidden()) {
                    return createAudioOutcome(false, 'cancelled', 'stale-owner');
                }
                if (!audio.isRunning(context)) {
                    armGestureUnlock();
                    return createAudioOutcome(false, 'blocked', 'context-not-running');
                }
                return createAudioOutcome(true, 'ready', 'audio-running');
            })
            .catch((error) => {
                warn(error, 'resume');
                if (installed && ownerGeneration === generation) {
                    unlocking = false;
                    armGestureUnlock();
                }
                return createAudioOutcome(false, 'blocked', 'unlock-error');
            })
            .finally(() => {
                if (startAttempt === attempt) {
                    unlocking = false;
                    startAttempt = null;
                }
            });
        startAttempt = attempt;
        return attempt;
    }

    function handleVisibilityChange() {
        if (!installed) return;
        if (hidden()) {
            generation += 1;
            startAttempt = null;
            unlocking = false;
            clearSuspendTimer();
            music.stop({ fadeSeconds: hiddenFadeSeconds });
            sfx?.cancel?.();
            scheduleSuspend();
            return;
        }

        clearSuspendTimer();
        if (audio.runningContext) void resume();
        else armGestureUnlock();
    }

    function install({ start = false } = {}) {
        if (installed) {
            if (start && audio.runningContext) void resume();
            else if (start) armGestureUnlock();
            return false;
        }
        installed = true;
        generation += 1;
        target.addEventListener('visibilitychange', handleVisibilityChange);
        removeAudioStateListener = audio.subscribe(handleAudioState);
        removeMusicBlockedListener = music.onNeedsUnlock?.(armGestureUnlock) ?? null;
        removeSfxBlockedListener = sfx?.onNeedsUnlock?.(armGestureUnlock) ?? null;

        if (!hidden()) {
            if (audio.runningContext) disarmGestureUnlock();
            else armGestureUnlock();
            if (start && audio.runningContext) void resume();
        }
        return true;
    }

    function cleanup({ suspend = true } = {}) {
        if (!installed) return false;
        installed = false;
        generation += 1;
        startAttempt = null;
        unlocking = false;
        clearSuspendTimer();
        disarmGestureUnlock();
        target.removeEventListener('visibilitychange', handleVisibilityChange);
        removeAudioStateListener?.();
        removeAudioStateListener = null;
        removeMusicBlockedListener?.();
        removeMusicBlockedListener = null;
        removeSfxBlockedListener?.();
        removeSfxBlockedListener = null;
        music.stop({ fadeSeconds: cleanupFadeSeconds, resetPattern: true });
        sfx?.cancel?.();
        if (suspend) void audio.suspend();
        return true;
    }

    function dispose() {
        cleanup();
        music.dispose?.();
        sfx?.dispose?.();
    }

    return Object.freeze({
        install,
        cleanup,
        resume,
        armGestureUnlock,
        disarmGestureUnlock,
        scheduleSuspend,
        dispose,
        get isGestureArmed() {
            return gestureArmed;
        },
    });
}
