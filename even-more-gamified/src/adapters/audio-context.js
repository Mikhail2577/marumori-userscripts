import { AUDIO_CONTEXT_RUNNING, reportAudioError } from '../audio/runtime-helpers.js';

const CLOSED = 'closed';

function defaultCreateContext() {
    const AudioContextConstructor = globalThis.AudioContext ?? globalThis.webkitAudioContext;
    return AudioContextConstructor ? new AudioContextConstructor() : null;
}

/**
 * Owns the single live AudioContext used by music and sound effects.
 *
 * Calling `unlock()` invokes `resume()` synchronously. That detail matters for
 * browsers which require resume to begin in the user-activation call stack.
 * Callers still have to await the returned promise and may only create nodes
 * when the returned context is non-null.
 */
export class AudioContextAdapter {
    constructor({ createContext = defaultCreateContext, onError = () => {} } = {}) {
        if (typeof createContext !== 'function') {
            throw new TypeError('Audio context creation must be a function');
        }

        this.createContext = createContext;
        this.onError = onError;
        this.context = null;
        this.unlockAttempt = null;
        this.intentGeneration = 0;
        this.stateListeners = new Set();
        this.removeStateListener = null;
    }

    get state() {
        return this.context?.state ?? 'unavailable';
    }

    get currentContext() {
        return this.context;
    }

    get runningContext() {
        return this.context?.state === AUDIO_CONTEXT_RUNNING ? this.context : null;
    }

    isRunning(context = this.context) {
        return Boolean(
            context && context === this.context && context.state === AUDIO_CONTEXT_RUNNING,
        );
    }

    subscribe(listener) {
        if (typeof listener !== 'function') {
            throw new TypeError('Audio state listener must be a function');
        }
        this.stateListeners.add(listener);
        return () => this.stateListeners.delete(listener);
    }

    emitState(context) {
        if (context !== this.context) return;
        for (const listener of this.stateListeners) {
            try {
                listener(context.state, context);
            } catch (error) {
                reportAudioError(this.onError, error, 'state-listener');
            }
        }
    }

    attachContext(context) {
        this.removeStateListener?.();
        this.removeStateListener = null;
        this.context = context;

        if (context?.addEventListener && context?.removeEventListener) {
            const handleStateChange = () => this.emitState(context);
            context.addEventListener('statechange', handleStateChange);
            this.removeStateListener = () =>
                context.removeEventListener('statechange', handleStateChange);
        }
    }

    getOrCreateContext() {
        if (this.context?.state === CLOSED) {
            this.attachContext(null);
            this.unlockAttempt = null;
        }
        if (this.context) return this.context;

        try {
            const context = this.createContext();
            if (!context) return null;
            this.attachContext(context);
            return context;
        } catch (error) {
            reportAudioError(this.onError, error, 'create');
            return null;
        }
    }

    unlock() {
        this.intentGeneration += 1;
        const context = this.getOrCreateContext();
        if (!context) return Promise.resolve(null);
        if (context.state === AUDIO_CONTEXT_RUNNING) return Promise.resolve(context);
        if (this.unlockAttempt?.context === context) {
            return this.unlockAttempt.promise;
        }
        if (typeof context.resume !== 'function') return Promise.resolve(null);

        let resumeResult;
        try {
            // Do not defer this call into a microtask: it may consume user activation.
            resumeResult = context.resume();
        } catch (error) {
            reportAudioError(this.onError, error, 'resume');
            return Promise.resolve(null);
        }

        const attempt = { context, promise: null };
        attempt.promise = Promise.resolve(resumeResult)
            .then(() => (this.isRunning(context) ? context : null))
            .catch((error) => {
                reportAudioError(this.onError, error, 'resume');
                return null;
            })
            .finally(() => {
                if (this.unlockAttempt === attempt) this.unlockAttempt = null;
            });
        this.unlockAttempt = attempt;
        return attempt.promise;
    }

    suspend() {
        const intent = ++this.intentGeneration;
        const pendingUnlock = this.unlockAttempt?.promise ?? Promise.resolve();

        return pendingUnlock.then(async () => {
            if (intent !== this.intentGeneration) return false;
            const context = this.context;
            if (!context || context.state !== AUDIO_CONTEXT_RUNNING) return false;
            if (typeof context.suspend !== 'function') return false;

            try {
                await context.suspend();
                return context.state !== AUDIO_CONTEXT_RUNNING;
            } catch (error) {
                reportAudioError(this.onError, error, 'suspend');
                return false;
            }
        });
    }
}

export function createAudioContextAdapter(options) {
    return new AudioContextAdapter(options);
}
