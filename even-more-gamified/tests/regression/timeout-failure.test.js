// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMaruMoriDomAdapter } from '../../src/adapters/marumori-dom.js';
import { createLifecycleController } from '../../src/core/lifecycle.js';
import { createTimeoutFailureController } from '../../src/gameplay/timeout-failure.js';
import {
    fixtureVisibility,
    mountReviewFixture,
    replaceQuestionWrapper,
    setResolution,
} from '../fixtures/review-dom.js';

function setup({ includeWrong = true, includeNext = true } = {}) {
    const fixture = mountReviewFixture(document, { includeWrong, includeNext });
    const dom = createMaruMoriDomAdapter({
        document,
        isVisible: fixtureVisibility,
    });
    const lifecycle = createLifecycleController();
    lifecycle.mount();
    lifecycle.start();
    lifecycle.beginQuestion(dom.getQuestionIdentity());
    const onIncorrectConfirmed = vi.fn();
    const onUnresolvedFailure = vi.fn();
    const onFailure = vi.fn();
    const timeout = createTimeoutFailureController({
        lifecycle,
        dom,
        invalidValue: () => '__invalid__',
        resolutionTimeoutMs: 1000,
        advanceDelayMs: 150,
        onIncorrectConfirmed,
        onUnresolvedFailure,
        onFailure,
    });
    return {
        fixture,
        dom,
        lifecycle,
        timeout,
        onIncorrectConfirmed,
        onUnresolvedFailure,
        onFailure,
    };
}

describe('serialized timeout failure', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    it('advances exactly once and only after confirmed incorrect resolution', async () => {
        const context = setup();
        const nextClick = vi.fn();
        context.fixture.next.addEventListener('click', nextClick);
        context.fixture.wrong.addEventListener('click', () => {
            setResolution(context.fixture.wrapper, 'incorrect');
        });

        const transaction = context.timeout.start();
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

        const first = context.timeout.start();
        const duplicate = context.timeout.start();
        expect(duplicate).toBe(first);
        vi.advanceTimersByTime(150);
        await first;
        expect(nextClick).toHaveBeenCalledTimes(1);
    });

    it('cancels advancement when cleanup happens before the callback', async () => {
        const context = setup();
        context.fixture.wrong.addEventListener('click', () => {
            setResolution(context.fixture.wrapper, 'incorrect');
        });
        const nextClick = vi.fn();
        context.fixture.next.addEventListener('click', nextClick);

        const transaction = context.timeout.start();
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
        const transaction = context.timeout.start();

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
        const transaction = context.timeout.start();

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
        const transaction = context.timeout.start();
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
        const transaction = context.timeout.start();

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
