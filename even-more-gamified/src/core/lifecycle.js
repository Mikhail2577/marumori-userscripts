import {
    QUESTION_STATES,
    SESSION_STATES,
    assertQuestionTransition,
    assertSessionTransition,
} from './state.js';

function defaultScheduler() {
    return globalThis;
}

export class LifecycleScope {
    constructor({ generation = 0, isCurrent = () => true, scheduler } = {}) {
        this.generation = generation;
        this.scheduler = scheduler ?? defaultScheduler();
        this.isCurrentGeneration = isCurrent;
        this.active = true;
        this.cleanups = new Set();
    }

    get isActive() {
        return this.active && this.isCurrentGeneration(this.generation);
    }

    guard(callback) {
        return (...args) => {
            if (!this.isActive) return undefined;
            return callback(...args);
        };
    }

    defer(cleanup) {
        if (typeof cleanup !== 'function') {
            throw new TypeError('Lifecycle cleanup must be a function');
        }
        if (!this.isActive) {
            cleanup();
            return () => {};
        }
        this.cleanups.add(cleanup);
        return () => this.cleanups.delete(cleanup);
    }

    setTimeout(callback, delay = 0) {
        let timerId;
        let pending = true;

        const cancel = () => {
            if (!pending) return;
            pending = false;
            this.scheduler.clearTimeout(timerId);
            this.cleanups.delete(cancel);
        };

        timerId = this.scheduler.setTimeout(() => {
            if (!pending) return;
            pending = false;
            this.cleanups.delete(cancel);
            if (this.isActive) callback();
        }, delay);
        this.cleanups.add(cancel);
        return cancel;
    }

    listen(target, type, listener, options) {
        if (!target?.addEventListener || !target?.removeEventListener) {
            throw new TypeError('Lifecycle listener target must be an EventTarget');
        }
        const guarded = this.guard(listener);
        target.addEventListener(type, guarded, options);
        return this.defer(() => target.removeEventListener(type, guarded, options));
    }

    dispose() {
        if (!this.active) return;
        this.active = false;
        const cleanups = [...this.cleanups].reverse();
        this.cleanups.clear();
        for (const cleanup of cleanups) cleanup();
    }
}

export class LifecycleController {
    constructor({ scheduler } = {}) {
        this.scheduler = scheduler ?? defaultScheduler();
        this.sessionGeneration = 0;
        this.questionGeneration = 0;
        this.answerGeneration = 0;
        this.sessionState = SESSION_STATES.INACTIVE;
        this.questionState = QUESTION_STATES.INACTIVE;
        this.questionId = null;
        this.sessionScope = null;
        this.questionScope = null;
        this.previousResolvedState = null;
        this.transitionListeners = new Set();
    }

    onTransition(listener) {
        this.transitionListeners.add(listener);
        return () => this.transitionListeners.delete(listener);
    }

    emitTransition(kind, from, to) {
        const transition = Object.freeze({
            kind,
            from,
            to,
            ownership: this.captureOwnership(),
        });
        for (const listener of this.transitionListeners) listener(transition);
    }

    transitionSession(to) {
        const from = this.sessionState;
        assertSessionTransition(from, to);
        this.sessionState = to;
        this.emitTransition('session', from, to);
    }

    transitionQuestion(to) {
        const from = this.questionState;
        assertQuestionTransition(from, to);
        this.questionState = to;
        this.emitTransition('question', from, to);
    }

    mount() {
        if (this.sessionState !== SESSION_STATES.INACTIVE) this.cleanup();
        this.sessionGeneration += 1;
        this.questionGeneration = 0;
        this.answerGeneration = 0;
        this.questionId = null;
        this.previousResolvedState = null;
        this.sessionScope = new LifecycleScope({
            generation: this.sessionGeneration,
            scheduler: this.scheduler,
            isCurrent: (generation) =>
                generation === this.sessionGeneration &&
                this.sessionState !== SESSION_STATES.INACTIVE &&
                this.sessionState !== SESSION_STATES.CLEANING_UP,
        });
        this.transitionSession(SESSION_STATES.MOUNTING);
        return this.captureOwnership();
    }

    start() {
        if (this.sessionState !== SESSION_STATES.MOUNTING) return false;
        this.transitionSession(SESSION_STATES.ACTIVE);
        return true;
    }

    beginQuestion(questionId, { awaitingFirstInput = false, force = false } = {}) {
        if (this.sessionState !== SESSION_STATES.ACTIVE) return null;
        if (questionId === null || questionId === undefined || questionId === '') {
            return null;
        }
        if (
            !force &&
            this.questionId === questionId &&
            this.questionState !== QUESTION_STATES.INACTIVE
        ) {
            return this.captureOwnership();
        }

        this.questionScope?.dispose();
        if (this.questionState !== QUESTION_STATES.INACTIVE) {
            this.transitionQuestion(QUESTION_STATES.INACTIVE);
        }
        this.questionGeneration += 1;
        this.questionId = questionId;
        this.previousResolvedState = null;
        const ownership = this.captureOwnership();
        this.questionScope = new LifecycleScope({
            generation: this.questionGeneration,
            scheduler: this.scheduler,
            isCurrent: (generation) =>
                generation === this.questionGeneration && this.owns(ownership),
        });
        this.transitionQuestion(
            awaitingFirstInput
                ? QUESTION_STATES.AWAITING_FIRST_INPUT
                : QUESTION_STATES.AWAITING_ANSWER,
        );
        return this.captureOwnership();
    }

    markFirstInput() {
        if (this.questionState !== QUESTION_STATES.AWAITING_FIRST_INPUT) {
            return false;
        }
        this.transitionQuestion(QUESTION_STATES.AWAITING_ANSWER);
        return true;
    }

    resolve(result) {
        if (
            this.questionState !== QUESTION_STATES.AWAITING_FIRST_INPUT &&
            this.questionState !== QUESTION_STATES.AWAITING_ANSWER
        ) {
            return false;
        }
        if (result !== 'correct' && result !== 'incorrect') return false;
        this.answerGeneration += 1;
        this.transitionQuestion(
            result === 'correct'
                ? QUESTION_STATES.RESOLVED_CORRECT
                : QUESTION_STATES.RESOLVED_INCORRECT,
        );
        return true;
    }

    beginRewind() {
        if (
            this.questionState !== QUESTION_STATES.RESOLVED_CORRECT &&
            this.questionState !== QUESTION_STATES.RESOLVED_INCORRECT
        ) {
            return false;
        }
        this.previousResolvedState = this.questionState;
        this.transitionQuestion(QUESTION_STATES.REWINDING);
        return true;
    }

    confirmRewind() {
        if (this.questionState !== QUESTION_STATES.REWINDING) return false;
        this.transitionQuestion(QUESTION_STATES.AWAITING_ANSWER);
        if (this.sessionState === SESSION_STATES.COMPLETED) {
            this.transitionSession(SESSION_STATES.ACTIVE);
        }
        this.previousResolvedState = null;
        return true;
    }

    cancelRewind() {
        if (this.questionState !== QUESTION_STATES.REWINDING || !this.previousResolvedState) {
            return false;
        }
        this.transitionQuestion(this.previousResolvedState);
        this.previousResolvedState = null;
        return true;
    }

    complete(ownership = this.captureOwnership()) {
        if (
            this.sessionState !== SESSION_STATES.ACTIVE ||
            !this.owns(ownership) ||
            (this.questionState !== QUESTION_STATES.RESOLVED_CORRECT &&
                this.questionState !== QUESTION_STATES.RESOLVED_INCORRECT)
        ) {
            return false;
        }
        this.transitionSession(SESSION_STATES.COMPLETED);
        return true;
    }

    captureOwnership() {
        return Object.freeze({
            sessionGeneration: this.sessionGeneration,
            questionGeneration: this.questionGeneration,
            answerGeneration: this.answerGeneration,
            questionId: this.questionId,
        });
    }

    owns(ownership, { requireQuestion = true } = {}) {
        if (
            !ownership ||
            this.sessionState === SESSION_STATES.INACTIVE ||
            this.sessionState === SESSION_STATES.CLEANING_UP
        ) {
            return false;
        }
        if (ownership.sessionGeneration !== this.sessionGeneration) return false;
        if (!requireQuestion) return true;
        return (
            ownership.questionGeneration === this.questionGeneration &&
            ownership.questionId === this.questionId &&
            this.questionState !== QUESTION_STATES.INACTIVE
        );
    }

    cleanup() {
        if (this.sessionState === SESSION_STATES.INACTIVE) return false;
        if (this.sessionState !== SESSION_STATES.CLEANING_UP) {
            this.transitionSession(SESSION_STATES.CLEANING_UP);
        }
        this.questionScope?.dispose();
        this.questionScope = null;
        if (this.questionState !== QUESTION_STATES.INACTIVE) {
            this.transitionQuestion(QUESTION_STATES.INACTIVE);
        }
        this.questionId = null;
        this.sessionScope?.dispose();
        this.sessionScope = null;
        this.previousResolvedState = null;
        this.transitionSession(SESSION_STATES.INACTIVE);
        return true;
    }
}

export function createLifecycleController(options) {
    return new LifecycleController(options);
}

export { QUESTION_STATES, SESSION_STATES } from './state.js';
