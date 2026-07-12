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

function setup({ includeRewind = true, current = 1, total = 3, onCommit = vi.fn() } = {}) {
    const fixture = mountReviewFixture(document, {
        current,
        total,
        resolution: 'correct',
        includeRewind,
    });
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
        timeoutMs: 500,
    });
    return {
        fixture,
        dom,
        lifecycle,
        rewind,
        restoreSnapshot,
        cancelSummary,
        onCommit,
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
