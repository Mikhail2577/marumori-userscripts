// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMaruMoriDomAdapter } from '../../src/adapters/marumori-dom.js';
import { createLifecycleController } from '../../src/core/lifecycle.js';
import { createTransactionalRewind } from '../../src/gameplay/rewind.js';
import {
    fixtureVisibility,
    mountReviewFixture,
    replaceQuestionWrapper,
    setResolution,
} from '../fixtures/review-dom.js';

function setup({
    includeRewind = true,
    current = 1,
    total = 3,
    onCommit = vi.fn(),
    onFailure = vi.fn(),
    useFallbackIdentity = false,
} = {}) {
    const fixture = mountReviewFixture(document, {
        current,
        total,
        resolution: 'correct',
        includeRewind,
    });
    if (useFallbackIdentity) delete fixture.wrapper.dataset.questionId;
    const dom = createMaruMoriDomAdapter({
        document,
        isVisible: fixtureVisibility,
    });
    const lifecycle = createLifecycleController();
    lifecycle.mount();
    lifecycle.start();
    lifecycle.beginQuestion(dom.getQuestionIdentity());
    lifecycle.resolve('correct');
    const restoreSnapshot = vi.fn();
    const cancelSummary = vi.fn();
    const rewind = createTransactionalRewind({
        lifecycle,
        dom,
        restoreSnapshot,
        cancelSummary,
        onCommit,
        onFailure,
        timeoutMs: 500,
        recoveryWindowMs: 1_000,
    });
    return {
        fixture,
        dom,
        lifecycle,
        rewind,
        restoreSnapshot,
        cancelSummary,
        onCommit,
        onFailure,
    };
}

describe('transactional rewind', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    it('commits the local snapshot only after resolved becomes unresolved', async () => {
        const context = setup();
        const snapshot = { score: 1200, combo: 8 };
        expect(context.rewind.capture(snapshot)).toBe(true);

        const request = context.rewind.request('hud');
        expect(context.restoreSnapshot).not.toHaveBeenCalled();
        expect(context.rewind.isPending).toBe(true);

        setResolution(context.fixture.wrapper, 'unresolved');
        context.rewind.reconcile();
        await expect(request).resolves.toMatchObject({
            ok: true,
            status: 'committed',
        });
        expect(context.restoreSnapshot).toHaveBeenCalledTimes(1);
        expect(context.restoreSnapshot).toHaveBeenCalledWith(
            snapshot,
            expect.objectContaining({ source: 'hud' }),
        );
        expect(context.cancelSummary).toHaveBeenCalledTimes(1);
        expect(context.onCommit).toHaveBeenCalledTimes(1);
        expect(context.rewind.hasSnapshot).toBe(false);
    });

    it('commits across same-logical wrapper replacement with a stable host ID', async () => {
        const context = setup();
        const before = context.dom.readQuestionContext();
        context.rewind.capture({ score: 1 });
        const request = context.rewind.request('hud');

        replaceQuestionWrapper(context.fixture, { questionId: 'question-1' });
        const after = context.dom.readQuestionContext();
        expect(after.logicalQuestionIdentity).toBe(before.logicalQuestionIdentity);
        expect(after.domGeneration).not.toBe(before.domGeneration);
        context.rewind.reconcile();

        await expect(request).resolves.toMatchObject({ ok: true, status: 'committed' });
        expect(context.restoreSnapshot).toHaveBeenCalledTimes(1);
    });

    it('commits when the same logical question rewinds progress', async () => {
        const context = setup({ current: 2, total: 3 });
        context.rewind.capture({ score: 1 });
        const request = context.rewind.request('hud');

        context.fixture.counter.textContent = '1 / 3';
        setResolution(context.fixture.wrapper, 'unresolved');
        context.rewind.reconcile();

        await expect(request).resolves.toMatchObject({
            ok: true,
            progress: { current: 1, total: 3 },
        });
        expect(context.restoreSnapshot).toHaveBeenCalledTimes(1);
    });

    it('commits with both wrapper replacement and progress decrement', async () => {
        const context = setup({ current: 2, total: 3 });
        context.rewind.capture({ score: 1 });
        const request = context.rewind.request('hud');

        replaceQuestionWrapper(context.fixture, { questionId: 'question-1' });
        context.fixture.counter.textContent = '1 / 3';
        context.rewind.reconcile();

        await expect(request).resolves.toMatchObject({ ok: true, status: 'committed' });
        expect(context.restoreSnapshot).toHaveBeenCalledTimes(1);
    });

    it('keeps strict fallback identity fail-closed across wrapper replacement', async () => {
        const context = setup({ useFallbackIdentity: true });
        context.rewind.capture({ score: 1 });
        const request = context.rewind.request('hud');

        replaceQuestionWrapper(context.fixture, { questionId: 'temporary' });
        delete context.fixture.wrapper.dataset.questionId;
        context.rewind.reconcile();

        await expect(request).resolves.toMatchObject({
            ok: false,
            status: 'cancelled',
        });
        expect(context.restoreSnapshot).not.toHaveBeenCalled();
    });

    it('runs the post-confirmation timer restart owner exactly once', async () => {
        const restartTimer = vi.fn();
        const context = setup({ onCommit: restartTimer });
        context.rewind.capture({ score: 1200, combo: 8 });

        const request = context.rewind.request('hud');
        setResolution(context.fixture.wrapper, 'unresolved');
        context.rewind.reconcile();
        context.rewind.reconcile();
        await request;

        expect(context.restoreSnapshot).toHaveBeenCalledTimes(1);
        expect(restartTimer).toHaveBeenCalledTimes(1);
    });

    it('fails closed when MaruMori exposes no native rewind capability', async () => {
        const context = setup({ includeRewind: false });
        expect(context.rewind.capture({ score: 1 })).toBe(true);

        await expect(context.rewind.request()).resolves.toMatchObject({
            ok: false,
            reason: 'native-rewind-unavailable',
        });
        expect(context.restoreSnapshot).not.toHaveBeenCalled();
        expect(context.rewind.hasSnapshot).toBe(true);
    });

    it('does not restore after a click that never produces the DOM transition', async () => {
        const context = setup();
        context.rewind.capture({ score: 1 });
        const request = context.rewind.request();

        vi.advanceTimersByTime(500);
        await expect(request).resolves.toMatchObject({
            ok: false,
            reason: 'confirmation-timeout',
        });
        expect(context.restoreSnapshot).not.toHaveBeenCalled();
        expect(context.rewind.hasSnapshot).toBe(true);
        expect(context.rewind.hasRecoveryCandidate).toBe(true);
        expect(context.rewind.isPending).toBe(true);
    });

    it('recovers one genuine host confirmation just after the original timeout', async () => {
        const context = setup();
        const snapshot = { score: 900, combo: 7 };
        context.rewind.capture(snapshot);
        const request = context.rewind.request('hud');

        vi.advanceTimersByTime(500);
        await expect(request).resolves.toMatchObject({
            ok: false,
            reason: 'confirmation-timeout',
            recoveryPending: true,
        });
        vi.advanceTimersByTime(100);
        setResolution(context.fixture.wrapper, 'unresolved');
        expect(context.rewind.reconcile()).toBe(true);

        expect(context.restoreSnapshot).toHaveBeenCalledTimes(1);
        expect(context.restoreSnapshot).toHaveBeenCalledWith(
            snapshot,
            expect.objectContaining({ recovered: true }),
        );
        expect(context.onCommit).toHaveBeenCalledWith(
            expect.objectContaining({ status: 'recovered', recovered: true }),
        );
        expect(context.rewind.hasRecoveryCandidate).toBe(false);
        expect(context.rewind.hasSnapshot).toBe(false);
    });

    it('does not restore a host transition after the bounded recovery deadline', async () => {
        const context = setup();
        context.rewind.capture({ score: 1 });
        const request = context.rewind.request('hud');

        vi.advanceTimersByTime(500);
        await request;
        vi.advanceTimersByTime(1_000);
        setResolution(context.fixture.wrapper, 'unresolved');
        context.rewind.reconcile();

        expect(context.restoreSnapshot).not.toHaveBeenCalled();
        expect(context.rewind.hasRecoveryCandidate).toBe(false);
        expect(context.rewind.hasSnapshot).toBe(false);
    });

    it('discards late recovery when a different logical question appears', async () => {
        const context = setup();
        context.rewind.capture({ score: 1 });
        const request = context.rewind.request('hud');
        vi.advanceTimersByTime(500);
        await request;

        replaceQuestionWrapper(context.fixture, { questionId: 'question-2' });
        context.fixture.counter.textContent = '2 / 3';
        context.rewind.reconcile();

        expect(context.restoreSnapshot).not.toHaveBeenCalled();
        expect(context.rewind.hasRecoveryCandidate).toBe(false);
        expect(context.rewind.hasSnapshot).toBe(false);
    });

    it('discards late recovery when a new session generation starts', async () => {
        const context = setup();
        context.rewind.capture({ score: 1 });
        const request = context.rewind.request('hud');
        vi.advanceTimersByTime(500);
        await request;

        context.lifecycle.mount();
        context.lifecycle.start();
        context.lifecycle.beginQuestion(context.dom.getQuestionIdentity());
        setResolution(context.fixture.wrapper, 'unresolved');
        context.rewind.reconcile();

        expect(context.restoreSnapshot).not.toHaveBeenCalled();
        expect(context.rewind.hasRecoveryCandidate).toBe(false);
        expect(context.rewind.hasSnapshot).toBe(false);
    });

    it('deduplicates capture listeners during a programmatic native click', async () => {
        const context = setup();
        context.rewind.capture({ score: 1 });
        let capturePromise;
        const captureListener = (event) => {
            if (event.target === context.fixture.rewind) {
                capturePromise = context.rewind.trackNativeIntent('native-capture');
            }
        };
        document.addEventListener('click', captureListener, true);

        const request = context.rewind.request('hud');
        expect(capturePromise).toBe(request);
        setResolution(context.fixture.wrapper, 'unresolved');
        context.rewind.reconcile();
        await request;

        expect(context.restoreSnapshot).toHaveBeenCalledTimes(1);
        document.removeEventListener('click', captureListener, true);
    });

    it('serializes overlapping HUD and Backspace/native intent transactions', async () => {
        const context = setup();
        context.rewind.capture({ score: 1 });

        const hudRequest = context.rewind.request('hud');
        const keyboardRequest = context.rewind.trackNativeIntent('keyboard');
        expect(keyboardRequest).toBe(hudRequest);

        setResolution(context.fixture.wrapper, 'unresolved');
        context.rewind.reconcile();
        await hudRequest;
        expect(context.restoreSnapshot).toHaveBeenCalledTimes(1);
    });

    it('cancels a final-answer summary only after rewind confirmation', async () => {
        const context = setup({ current: 3, total: 3 });
        context.lifecycle.complete();
        context.rewind.capture({ score: 1 });
        const request = context.rewind.request();
        expect(context.cancelSummary).not.toHaveBeenCalled();

        setResolution(context.fixture.wrapper, 'unresolved');
        context.rewind.reconcile();
        await request;

        expect(context.cancelSummary).toHaveBeenCalledTimes(1);
        expect(context.lifecycle.sessionState).toBe('active');
    });

    it('commits repeated unresolved reconciliation exactly once', async () => {
        const context = setup();
        context.rewind.capture({ score: 1 });
        const request = context.rewind.request('hud');
        setResolution(context.fixture.wrapper, 'unresolved');

        context.rewind.reconcile();
        context.rewind.reconcile();
        context.rewind.reconcile();
        await request;

        expect(context.restoreSnapshot).toHaveBeenCalledTimes(1);
        expect(context.cancelSummary).toHaveBeenCalledTimes(1);
        expect(context.onCommit).toHaveBeenCalledTimes(1);
    });

    it('cancels without restoring when the question wrapper is replaced', async () => {
        const context = setup();
        context.rewind.capture({ score: 1 });
        const request = context.rewind.request();
        replaceQuestionWrapper(context.fixture, {
            questionId: 'question-2',
            keepOldConnected: true,
        });
        context.fixture.counter.textContent = '2 / 3';
        context.lifecycle.beginQuestion(context.dom.getQuestionIdentity());
        context.rewind.reconcile();

        await expect(request).resolves.toMatchObject({
            ok: false,
            status: 'cancelled',
        });
        expect(context.restoreSnapshot).not.toHaveBeenCalled();
        expect(context.rewind.hasSnapshot).toBe(false);
    });
});
