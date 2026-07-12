// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    QUESTION_STATES,
    SESSION_STATES,
    createLifecycleController,
} from '../../src/core/lifecycle.js';
import { createReconciler } from '../../src/core/reconciliation.js';
import { DOM_RESOLUTION, createMaruMoriDomAdapter } from '../../src/adapters/marumori-dom.js';
import {
    fixtureVisibility,
    mountReviewFixture,
    replaceQuestionWrapper,
    setResolution,
} from '../fixtures/review-dom.js';

describe('session and question lifecycle', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    it('uses explicit transitions and permits a final-answer rewind', () => {
        const lifecycle = createLifecycleController();
        lifecycle.mount();
        expect(lifecycle.sessionState).toBe(SESSION_STATES.MOUNTING);
        expect(lifecycle.start()).toBe(true);
        lifecycle.beginQuestion('q1', { awaitingFirstInput: true });
        expect(lifecycle.questionState).toBe(QUESTION_STATES.AWAITING_FIRST_INPUT);
        expect(lifecycle.markFirstInput()).toBe(true);
        expect(lifecycle.resolve('correct')).toBe(true);
        expect(lifecycle.answerGeneration).toBe(1);
        expect(lifecycle.complete()).toBe(true);
        expect(lifecycle.sessionState).toBe(SESSION_STATES.COMPLETED);

        expect(lifecycle.beginRewind()).toBe(true);
        expect(lifecycle.questionState).toBe(QUESTION_STATES.REWINDING);
        expect(lifecycle.confirmRewind()).toBe(true);
        expect(lifecycle.questionState).toBe(QUESTION_STATES.AWAITING_ANSWER);
        expect(lifecycle.sessionState).toBe(SESSION_STATES.ACTIVE);
        expect(lifecycle.resolve('correct')).toBe(true);
        expect(lifecycle.answerGeneration).toBe(2);
    });

    it('rejects session completion while the current question is unresolved', () => {
        const lifecycle = createLifecycleController();
        lifecycle.mount();
        lifecycle.start();
        lifecycle.beginQuestion('q1');

        expect(lifecycle.complete()).toBe(false);
        expect(lifecycle.sessionState).toBe(SESSION_STATES.ACTIVE);
        expect(lifecycle.questionState).toBe(QUESTION_STATES.AWAITING_ANSWER);
    });

    it('cancels question-owned callbacks after a question change', () => {
        const lifecycle = createLifecycleController();
        lifecycle.mount();
        lifecycle.start();
        lifecycle.beginQuestion('q1');
        const firstOwnership = lifecycle.captureOwnership();
        const callback = vi.fn();
        lifecycle.questionScope.setTimeout(callback, 100);

        lifecycle.beginQuestion('q2');
        vi.advanceTimersByTime(100);

        expect(callback).not.toHaveBeenCalled();
        expect(lifecycle.owns(firstOwnership)).toBe(false);
        expect(lifecycle.questionGeneration).toBe(2);
    });

    it('gives a same-route remount a fresh session generation and scope', () => {
        const lifecycle = createLifecycleController();
        lifecycle.mount();
        lifecycle.start();
        lifecycle.beginQuestion('q1');
        const oldOwnership = lifecycle.captureOwnership();
        const oldCallback = vi.fn();
        lifecycle.sessionScope.setTimeout(oldCallback, 100);

        lifecycle.mount();
        lifecycle.start();
        lifecycle.beginQuestion('q1');
        vi.advanceTimersByTime(100);

        expect(oldCallback).not.toHaveBeenCalled();
        expect(lifecycle.owns(oldOwnership)).toBe(false);
        expect(lifecycle.sessionGeneration).toBe(2);
    });
});

describe('fail-closed MaruMori DOM adapter', () => {
    let fixture;
    let adapter;

    beforeEach(() => {
        fixture = mountReviewFixture(document);
        adapter = createMaruMoriDomAdapter({
            document,
            isVisible: fixtureVisibility,
        });
    });

    it('identifies only controls and answer input owned by the active review', () => {
        document.body.classList.add('mm-arcade', 'mm-crt-enabled');
        expect(fixture.root.id).toBe('time-me');
        expect(fixture.main.parentElement).toBe(fixture.topWrap);
        expect(fixture.wrapper.parentElement).toBe(fixture.topWrap);
        expect(fixture.main.contains(fixture.wrapper)).toBe(false);
        expect(fixture.wrapper.closest('#main')).toBeNull();
        expect(adapter.getActiveReviewRoot()).toBe(fixture.root);
        expect(adapter.getInputWrapper()).toBe(fixture.wrapper);
        expect(adapter.getQuestionPrompt()).toBe(fixture.prompt);
        expect(adapter.getAnswerInput()).toBe(fixture.input);
        expect(adapter.getControl('next')).toBe(fixture.next);
        expect(adapter.getControl('next')).not.toBe(document.querySelector('#outside-next'));
        expect(adapter.getAnswerInput()).not.toBe(document.querySelector('#mm-range'));
        expect(adapter.getProgress()).toMatchObject({ current: 1, total: 3 });
    });

    it('exposes a host session token only when the review root provides one', () => {
        expect(adapter.getSessionIdentity()).toBeNull();
        fixture.root.dataset.reviewSession = 'session-42';
        expect(adapter.getSessionIdentity()).toBe('data-review-session:session-42');
    });

    it('resolves either live question-prompt variant only when it is unambiguous', () => {
        fixture.main.innerHTML = '<div class="main_form">質問</div>';
        const formPrompt = fixture.main.querySelector('.main_form');
        expect(adapter.getQuestionPrompt()).toBe(formPrompt);

        fixture.main.append(formPrompt.cloneNode(true));
        expect(adapter.getQuestionPrompt()).toBeNull();
    });

    it('rejects range sliders, unrelated input types, and ambiguous answers', () => {
        fixture.input.type = 'range';
        const email = document.createElement('input');
        email.type = 'email';
        fixture.wrapper.append(email);
        expect(adapter.getAnswerInput()).toBeNull();

        fixture.input.type = 'text';
        const duplicate = document.createElement('input');
        duplicate.type = 'text';
        fixture.wrapper.append(duplicate);
        expect(adapter.getAnswerInput()).toBeNull();
    });

    it('does not trust an old connected wrapper after replacement', () => {
        const oldWrapper = fixture.wrapper;
        replaceQuestionWrapper(fixture, {
            questionId: 'question-2',
            keepOldConnected: true,
        });
        fixture.counter.textContent = '2 / 3';

        expect(oldWrapper.isConnected).toBe(true);
        expect(adapter.getInputWrapper()).toBe(fixture.wrapper);
        expect(adapter.getQuestionIdentity()).toContain('question-2');
    });

    it('separates stable logical identity from wrapper and progress generations', () => {
        const before = adapter.readQuestionContext();
        replaceQuestionWrapper(fixture, { questionId: 'question-1' });
        fixture.counter.textContent = '1 / 3';
        const after = adapter.readQuestionContext();

        expect(before).toMatchObject({
            identityKind: 'host',
            resolution: DOM_RESOLUTION.UNRESOLVED,
        });
        expect(after.logicalQuestionIdentity).toBe(before.logicalQuestionIdentity);
        expect(after.domGeneration).not.toBe(before.domGeneration);
        expect(after.wrapperGeneration).not.toBe(before.wrapperGeneration);
        expect(after.rootGeneration).toBe(before.rootGeneration);
        expect(after.progress).toMatchObject({ current: 1, total: 3 });
    });

    it('fails closed on conflicting host IDs and uses a strict fallback without one', () => {
        fixture.wrapper.dataset.itemId = 'conflict';
        expect(adapter.getQuestionIdentity()).toBeNull();
        expect(adapter.readQuestionContext()).toBeNull();

        delete fixture.wrapper.dataset.itemId;
        delete fixture.wrapper.dataset.questionId;
        const fallback = adapter.readQuestionContext();
        expect(fallback).toMatchObject({ identityKind: 'fallback' });

        fixture.counter.textContent = '2 / 3';
        expect(adapter.getQuestionIdentity()).not.toBe(fallback.logicalQuestionIdentity);
    });

    it('fails closed when two review wrappers are simultaneously visible', () => {
        fixture.root.append(fixture.wrapper.cloneNode(true));
        expect(adapter.getActiveReviewRoot()).toBeNull();
        expect(adapter.getAnswerInput()).toBeNull();
        expect(adapter.getResolvedState()).toBe(DOM_RESOLUTION.UNKNOWN);
    });

    it('reports only unambiguous resolution states', () => {
        setResolution(fixture.wrapper, 'correct');
        expect(adapter.getResolvedState()).toBe(DOM_RESOLUTION.CORRECT);
        fixture.wrapper.classList.add('incorrect');
        expect(adapter.getResolvedState()).toBe(DOM_RESOLUTION.UNKNOWN);
    });

    it('keeps host context readable while owned transient decoration classes are active', () => {
        fixture.counter.classList.add('mm-bounce');
        fixture.root.querySelector('.quiz_progress').classList.add('mm-progress-glow');

        expect(adapter.readQuestionContext()).toMatchObject({
            logicalQuestionIdentity: expect.stringContaining('question-1'),
            progress: { current: 1, total: 3 },
            resolution: DOM_RESOLUTION.UNRESOLVED,
        });
    });
});

describe('shared reconciliation', () => {
    it('coalesces narrow observer signals into one idempotent pass', async () => {
        const reconcile = vi.fn();
        const coordinator = createReconciler(reconcile);
        coordinator.request('resolution');
        coordinator.request('counter');
        coordinator.request('resolution');
        await Promise.resolve();

        expect(reconcile).toHaveBeenCalledTimes(1);
        expect(reconcile).toHaveBeenCalledWith(['resolution', 'counter']);
    });
});
