// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMaruMoriDomAdapter } from '../../src/adapters/marumori-dom.js';
import { createLifecycleController } from '../../src/core/lifecycle.js';
import { createAnswerTimerOwnershipController } from '../../src/gameplay/answer-timer-ownership.js';
import { createTimeoutFailureController } from '../../src/gameplay/timeout-failure.js';
import {
    fixtureVisibility,
    mountReviewFixture,
    replaceQuestionWrapper,
    setResolution,
} from '../fixtures/review-dom.js';

function setup({ includeWrong = true, includeNext = true, canAdvance = () => true } = {}) {
    const fixture = mountReviewFixture(document, { includeWrong, includeNext });
    const dom = createMaruMoriDomAdapter({
        document,
        isVisible: fixtureVisibility,
    });
    const lifecycle = createLifecycleController();
    lifecycle.mount();
    lifecycle.start();
    lifecycle.beginQuestion(dom.getQuestionIdentity());
    const clock = { now: 1_000 };
    const timerOwnership = createAnswerTimerOwnershipController({
        lifecycle,
        dom,
        clock: () => clock.now,
    });
    const timerOwner = timerOwnership.arm({ durationMs: 1_000 });
    clock.now = timerOwner.deadline;
    const onIncorrectConfirmed = vi.fn();
    const onUnresolvedFailure = vi.fn();
    const onFailure = vi.fn();
    const timeout = createTimeoutFailureController({
        lifecycle,
        dom,
        invalidValue: () => '__invalid__',
        resolutionTimeoutMs: 1000,
        advanceDelayMs: 150,
        canAdvance,
        validateTimerOwnership: (ownership, options) => timerOwnership.validate(ownership, options),
        onIncorrectConfirmed,
        onUnresolvedFailure,
        onFailure,
    });
    return {
        fixture,
        dom,
        lifecycle,
        clock,
        timerOwner,
        timerOwnership,
        timeout,
        onIncorrectConfirmed,
        onUnresolvedFailure,
        onFailure,
    };
}

function startTimeout(context) {
    return context.timeout.start('timeout', context.timerOwner);
}

describe('serialized timeout failure', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    it('rejects question two DOM before lifecycle reconciliation without any host side effect', async () => {
        const context = setup();
        const oldInputValue = context.fixture.input.value;
        const wrongClick = vi.fn();
        const nextClick = vi.fn();

        replaceQuestionWrapper(context.fixture, { questionId: 'question-2' });
        context.fixture.counter.textContent = '2 / 3';
        context.fixture.wrong.addEventListener('click', wrongClick);
        context.fixture.next.addEventListener('click', nextClick);
        const questionTwoInput = context.fixture.input;

        const result = await startTimeout(context);

        expect(result).toMatchObject({
            ok: false,
            reason: 'timer-owner-rejected:logical-question-changed',
        });
        expect(wrongClick).not.toHaveBeenCalled();
        expect(nextClick).not.toHaveBeenCalled();
        expect(questionTwoInput.value).toBe('new question');
        expect(questionTwoInput.value).not.toBe(oldInputValue);
    });

    it('rejects same-logical wrapper replacement before Wrong or input injection', async () => {
        const context = setup();
        replaceQuestionWrapper(context.fixture, { questionId: 'question-1' });
        const wrongClick = vi.fn();
        context.fixture.wrong.addEventListener('click', wrongClick);

        await expect(startTimeout(context)).resolves.toMatchObject({
            ok: false,
            reason: 'timer-owner-rejected:dom-generation-changed',
        });
        expect(wrongClick).not.toHaveBeenCalled();
        expect(context.fixture.input.value).toBe('new question');
    });

    it('fails closed when a natural answer resolves before timeout failure starts', async () => {
        const context = setup();
        const wrongClick = vi.fn();
        context.fixture.wrong.addEventListener('click', wrongClick);
        setResolution(context.fixture.wrapper, 'correct');

        await expect(startTimeout(context)).resolves.toMatchObject({
            ok: false,
            reason: 'timer-owner-rejected:unexpected-resolution',
        });
        expect(wrongClick).not.toHaveBeenCalled();
    });

    it('advances exactly once and only after confirmed incorrect resolution', async () => {
        const context = setup();
        const nextClick = vi.fn();
        context.fixture.next.addEventListener('click', nextClick);
        context.fixture.wrong.addEventListener('click', () => {
            setResolution(context.fixture.wrapper, 'incorrect');
        });

        const transaction = startTimeout(context);
        context.timeout.reconcile();
        context.timeout.reconcile();
        expect(nextClick).not.toHaveBeenCalled();
        expect(context.onIncorrectConfirmed).toHaveBeenCalledTimes(1);

        vi.advanceTimersByTime(150);
        context.timeout.reconcile();
        vi.advanceTimersByTime(1000);
        await expect(transaction).resolves.toMatchObject({
            ok: true,
            status: 'advanced',
            strategy: 'wrong-control',
        });
        expect(nextClick).toHaveBeenCalledTimes(1);
    });

    it('returns one owned transaction for duplicate timeout signals', async () => {
        const context = setup();
        context.fixture.wrong.addEventListener('click', () => {
            setResolution(context.fixture.wrapper, 'incorrect');
        });
        const nextClick = vi.fn();
        context.fixture.next.addEventListener('click', nextClick);

        const first = startTimeout(context);
        const duplicate = startTimeout(context);
        expect(duplicate).toBe(first);
        vi.advanceTimersByTime(150);
        await first;
        expect(nextClick).toHaveBeenCalledTimes(1);
    });

    it('suppresses automatic Next when confirmed finalization makes advancement invalid', async () => {
        const canAdvance = vi.fn(() => false);
        const context = setup({ canAdvance });
        context.fixture.wrong.addEventListener('click', () => {
            setResolution(context.fixture.wrapper, 'incorrect');
        });
        const nextClick = vi.fn();
        context.fixture.next.addEventListener('click', nextClick);

        const transaction = startTimeout(context);
        vi.advanceTimersByTime(1_000);

        await expect(transaction).resolves.toMatchObject({
            ok: true,
            status: 'completed',
            reason: 'automatic-advance-suppressed',
        });
        expect(context.onIncorrectConfirmed).toHaveBeenCalledTimes(1);
        expect(canAdvance).toHaveBeenCalledTimes(1);
        expect(nextClick).not.toHaveBeenCalled();
    });

    it('cancels advancement when cleanup happens before the callback', async () => {
        const context = setup();
        context.fixture.wrong.addEventListener('click', () => {
            setResolution(context.fixture.wrapper, 'incorrect');
        });
        const nextClick = vi.fn();
        context.fixture.next.addEventListener('click', nextClick);

        const transaction = startTimeout(context);
        context.lifecycle.cleanup();
        vi.advanceTimersByTime(1000);

        await expect(transaction).resolves.toMatchObject({
            ok: false,
            reason: 'stale-owner',
        });
        expect(nextClick).not.toHaveBeenCalled();
    });

    it('cancels a delayed click owned by a previous question', async () => {
        const context = setup();
        context.fixture.wrong.addEventListener('click', () => {
            setResolution(context.fixture.wrapper, 'incorrect');
        });
        const oldNextClick = vi.fn();
        context.fixture.next.addEventListener('click', oldNextClick);
        const transaction = startTimeout(context);

        replaceQuestionWrapper(context.fixture, { questionId: 'question-2' });
        context.fixture.counter.textContent = '2 / 3';
        context.lifecycle.beginQuestion(context.dom.getQuestionIdentity());
        vi.advanceTimersByTime(1000);

        await expect(transaction).resolves.toMatchObject({ ok: false });
        expect(oldNextClick).not.toHaveBeenCalled();
    });

    it('cancels a delayed click owned by a previous session', async () => {
        const context = setup();
        context.fixture.wrong.addEventListener('click', () => {
            setResolution(context.fixture.wrapper, 'incorrect');
        });
        const nextClick = vi.fn();
        context.fixture.next.addEventListener('click', nextClick);
        const transaction = startTimeout(context);

        context.lifecycle.mount();
        context.lifecycle.start();
        context.lifecycle.beginQuestion(context.dom.getQuestionIdentity());
        vi.advanceTimersByTime(1000);

        await expect(transaction).resolves.toMatchObject({ ok: false });
        expect(nextClick).not.toHaveBeenCalled();
    });

    it('restores an injected answer only on the same unresolved question', async () => {
        const context = setup({ includeWrong: false });
        context.fixture.input.value = 'learner answer';
        const transaction = startTimeout(context);
        expect(context.fixture.input.value).toBe('__invalid__');

        vi.advanceTimersByTime(1000);
        await expect(transaction).resolves.toMatchObject({
            ok: false,
            reason: 'resolution-timeout',
            restoredInput: true,
        });
        expect(context.fixture.input.value).toBe('learner answer');
        expect(context.onUnresolvedFailure).toHaveBeenCalledTimes(1);
    });

    it('never restores an injected answer into a replacement question', async () => {
        const context = setup({ includeWrong: false });
        context.fixture.input.value = 'old learner answer';
        const transaction = startTimeout(context);

        replaceQuestionWrapper(context.fixture, { questionId: 'question-2' });
        context.fixture.counter.textContent = '2 / 3';
        const newInput = context.fixture.input;
        context.lifecycle.beginQuestion(context.dom.getQuestionIdentity());
        vi.advanceTimersByTime(1000);

        await expect(transaction).resolves.toMatchObject({ ok: false });
        expect(newInput.value).toBe('new question');
        expect(context.onUnresolvedFailure).not.toHaveBeenCalled();
    });
});
