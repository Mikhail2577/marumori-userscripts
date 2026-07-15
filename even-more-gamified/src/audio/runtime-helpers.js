export const AUDIO_CONTEXT_RUNNING = 'running';

export function createAudioOutcome(ok, status, reason, extra = {}) {
    return Object.freeze({ ok, status, reason, ...extra });
}

export function normalizeAudioVolume(value) {
    const volume = Number(value);
    return Number.isFinite(volume) ? Math.max(0, volume) : 0;
}

export function reportAudioError(onError, error, operation) {
    try {
        onError(error, operation);
    } catch {
        // Diagnostics must never interfere with audio state or cleanup.
    }
}

export function createAudioErrorReporter(onError) {
    return (error, operation) => reportAudioError(onError, error, operation);
}

export function defaultAudioScheduler() {
    return globalThis;
}
