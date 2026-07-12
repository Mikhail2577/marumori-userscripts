const RUNNING = 'running';

function outcome(ok, status, reason, extra = {}) {
    return Object.freeze({ ok, status, reason, ...extra });
}

function defaultScheduler() {
    return globalThis;
}

function normalizeVolume(value) {
    const volume = Number(value);
    return Number.isFinite(volume) ? Math.max(0, volume) : 0;
}

function defaultCreateDestination({ context, volume, fadeInSeconds }) {
    const destination = context.createGain();
    destination.gain.setValueAtTime(0, context.currentTime);
    if (fadeInSeconds > 0) {
        destination.gain.linearRampToValueAtTime(volume, context.currentTime + fadeInSeconds);
    } else {
        destination.gain.setValueAtTime(volume, context.currentTime);
    }
    destination.connect(context.destination);
    return destination;
}

/**
 * Controls the music bus and look-ahead loop. Actual note synthesis stays in
 * the injected `schedulePattern` function, preserving the legacy theme
 * schedulers without coupling them to lifecycle policy.
 */
export function createMusicController({
    audio,
    scheduler,
    schedulePattern,
    createDestination = defaultCreateDestination,
    stopScheduled = () => {},
    isEnabled = () => true,
    isSessionActive = () => true,
    isLiteMode = () => false,
    isVisible = () => true,
    getVolume = () => 1,
    fadeInSeconds = 0.7,
    startLeadSeconds = 0.08,
    scheduleOverlapSeconds = 0.12,
    minimumScheduleDelayMs = 100,
    restartDelayMs = 180,
    onError = () => {},
} = {}) {
    if (!audio?.unlock || !audio?.isRunning) {
        throw new TypeError('Music requires an audio context adapter');
    }
    if (typeof schedulePattern !== 'function') {
        throw new TypeError('Music requires a pattern scheduler');
    }

    const clock = scheduler ?? defaultScheduler();
    const blockedListeners = new Set();
    const retiredDestinations = new Map();
    let generation = 0;
    let patternIndex = 0;
    let destination = null;
    let activeContext = null;
    let scheduleTimer = null;
    let restartTimer = null;
    let startAttempt = null;
    let disposed = false;

    function warn(error, operation) {
        try {
            onError(error, operation);
        } catch {
            // Diagnostics must not alter playback state.
        }
    }

    function notifyNeedsUnlock(reason) {
        for (const listener of blockedListeners) {
            try {
                listener(reason);
            } catch (error) {
                warn(error, 'blocked-listener');
            }
        }
    }

    function onNeedsUnlock(listener) {
        if (typeof listener !== 'function') {
            throw new TypeError('Music blocked listener must be a function');
        }
        blockedListeners.add(listener);
        return () => blockedListeners.delete(listener);
    }

    function eligibility() {
        if (disposed) return 'disposed';
        if (!isEnabled()) return 'disabled';
        if (isLiteMode()) return 'lite-mode';
        if (!isSessionActive()) return 'inactive-session';
        if (!isVisible()) return 'hidden';
        if (normalizeVolume(getVolume()) <= 0) return 'zero-volume';
        return null;
    }

    function clearTimer(name) {
        const timer = name === 'schedule' ? scheduleTimer : restartTimer;
        if (timer === null) return;
        clock.clearTimeout(timer);
        if (name === 'schedule') scheduleTimer = null;
        else restartTimer = null;
    }

    function disconnectNow(node) {
        const timer = retiredDestinations.get(node);
        if (timer !== undefined) {
            clock.clearTimeout(timer);
            retiredDestinations.delete(node);
        }
        try {
            node?.disconnect?.();
        } catch (error) {
            warn(error, 'disconnect');
        }
    }

    function retireDestination(node, context, fadeSeconds) {
        if (!node) return;
        if (fadeSeconds <= 0 || !audio.isRunning(context) || !node.gain) {
            disconnectNow(node);
            return;
        }

        const now = context.currentTime;
        try {
            node.gain.cancelScheduledValues(now);
            node.gain.setValueAtTime(node.gain.value, now);
            node.gain.linearRampToValueAtTime(0, now + fadeSeconds);
        } catch (error) {
            warn(error, 'fade-out');
            disconnectNow(node);
            return;
        }

        const timer = clock.setTimeout(
            () => {
                retiredDestinations.delete(node);
                disconnectNow(node);
            },
            (fadeSeconds + 0.1) * 1000,
        );
        retiredDestinations.set(node, timer);
    }

    function stop(options = {}) {
        const { fadeSeconds = 0.35, resetPattern = false } =
            typeof options === 'number' ? { fadeSeconds: options } : options;
        generation += 1;
        startAttempt = null;
        clearTimer('schedule');
        clearTimer('restart');
        const oldDestination = destination;
        const oldContext = activeContext;
        destination = null;
        activeContext = null;
        if (resetPattern) patternIndex = 0;

        if (fadeSeconds <= 0) {
            for (const node of [...retiredDestinations.keys()]) disconnectNow(node);
        }

        if (oldDestination) {
            try {
                stopScheduled({
                    context: oldContext,
                    destination: oldDestination,
                    fadeSeconds,
                });
            } catch (error) {
                warn(error, 'stop-scheduled');
            }
            retireDestination(oldDestination, oldContext, fadeSeconds);
        }
        return Boolean(oldDestination);
    }

    function blockForReadiness(reason) {
        stop({ fadeSeconds: 0 });
        notifyNeedsUnlock(reason);
        return outcome(false, 'blocked', reason);
    }

    function scheduleNext(ownerGeneration) {
        if (ownerGeneration !== generation || !destination || !activeContext) {
            return outcome(false, 'cancelled', 'stale-owner');
        }

        const ineligible = eligibility();
        if (ineligible) {
            stop({ fadeSeconds: ineligible === 'hidden' ? 0 : 0.15 });
            return outcome(false, 'skipped', ineligible);
        }
        if (activeContext.state !== RUNNING || !audio.isRunning(activeContext)) {
            return blockForReadiness('context-not-running');
        }

        const volume = normalizeVolume(getVolume());
        let scheduled;
        try {
            // This is the only call site for theme note creation. It is guarded by
            // running-state checks immediately before invocation.
            scheduled = schedulePattern({
                context: activeContext,
                destination,
                start: activeContext.currentTime + startLeadSeconds,
                patternIndex,
                volume,
            });
        } catch (error) {
            warn(error, 'schedule-pattern');
            stop({ fadeSeconds: 0 });
            return outcome(false, 'failed', 'scheduler-error');
        }

        const duration = Number(typeof scheduled === 'number' ? scheduled : scheduled?.duration);
        if (!Number.isFinite(duration) || duration <= 0) {
            stop({ fadeSeconds: 0 });
            return outcome(false, 'failed', 'invalid-pattern-duration');
        }

        patternIndex += 1;
        const delay = Math.max(minimumScheduleDelayMs, (duration - scheduleOverlapSeconds) * 1000);
        scheduleTimer = clock.setTimeout(() => {
            scheduleTimer = null;
            scheduleNext(ownerGeneration);
        }, delay);
        return outcome(true, 'scheduled', 'pattern-scheduled', { duration });
    }

    function start({ context: suppliedContext } = {}) {
        const ineligible = eligibility();
        if (ineligible) {
            if (destination) stop({ fadeSeconds: 0.15 });
            return Promise.resolve(outcome(false, 'skipped', ineligible));
        }
        if (
            destination &&
            activeContext &&
            activeContext.state === RUNNING &&
            audio.isRunning(activeContext)
        ) {
            return Promise.resolve(outcome(true, 'playing', 'already-started'));
        }
        if (startAttempt) return startAttempt;

        const ownerGeneration = ++generation;
        const readyContext =
            suppliedContext && audio.isRunning(suppliedContext)
                ? Promise.resolve(suppliedContext)
                : audio.unlock();

        const attempt = Promise.resolve(readyContext)
            .then((context) => {
                if (disposed || ownerGeneration !== generation) {
                    return outcome(false, 'cancelled', 'stale-owner');
                }
                const currentIneligible = eligibility();
                if (currentIneligible) {
                    return outcome(false, 'skipped', currentIneligible);
                }
                if (!context || context.state !== RUNNING || !audio.isRunning(context)) {
                    notifyNeedsUnlock('context-not-running');
                    return outcome(false, 'blocked', 'context-not-running');
                }

                const volume = normalizeVolume(getVolume());
                try {
                    destination = createDestination({
                        context,
                        volume,
                        fadeInSeconds,
                    });
                } catch (error) {
                    warn(error, 'create-destination');
                    destination = null;
                    return outcome(false, 'failed', 'destination-error');
                }

                if (!destination || !audio.isRunning(context)) {
                    disconnectNow(destination);
                    destination = null;
                    notifyNeedsUnlock('context-not-running');
                    return outcome(false, 'blocked', 'context-not-running');
                }
                activeContext = context;
                const scheduled = scheduleNext(ownerGeneration);
                if (!scheduled.ok) return scheduled;
                return outcome(true, 'playing', 'started');
            })
            .finally(() => {
                if (startAttempt === attempt) startAttempt = null;
            });
        startAttempt = attempt;
        return attempt;
    }

    function restart({ fadeSeconds = 0.15 } = {}) {
        stop({ fadeSeconds, resetPattern: true });
        if (eligibility()) return false;
        const ownerGeneration = generation;
        restartTimer = clock.setTimeout(() => {
            restartTimer = null;
            if (ownerGeneration === generation) void start();
        }, restartDelayMs);
        return true;
    }

    function sync() {
        const ineligible = eligibility();
        if (ineligible) {
            stop({ fadeSeconds: 0.15 });
            return Promise.resolve(outcome(false, 'skipped', ineligible));
        }
        return start();
    }

    function setVolume(value = getVolume()) {
        const volume = normalizeVolume(value);
        if (volume <= 0) {
            stop({ fadeSeconds: 0.1 });
            return false;
        }
        if (!destination || !activeContext || !audio.isRunning(activeContext)) {
            return false;
        }
        try {
            destination.gain.setTargetAtTime(volume, activeContext.currentTime, 0.03);
            return true;
        } catch (error) {
            warn(error, 'set-volume');
            return false;
        }
    }

    function dispose() {
        if (disposed) return;
        stop({ fadeSeconds: 0, resetPattern: true });
        disposed = true;
        for (const node of [...retiredDestinations.keys()]) disconnectNow(node);
        blockedListeners.clear();
    }

    return Object.freeze({
        start,
        startMusic: start,
        stop,
        stopMusic: stop,
        restart,
        restartMusic: restart,
        sync,
        setVolume,
        onNeedsUnlock,
        dispose,
        get isPlaying() {
            return Boolean(destination);
        },
        get currentPatternIndex() {
            return patternIndex;
        },
    });
}
