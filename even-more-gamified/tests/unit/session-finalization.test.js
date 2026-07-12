// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SESSION_STATES, createLifecycleController } from '../../src/core/lifecycle.js';
import { createSessionFinalizationController } from '../../src/core/session-finalization.js';

function mountQuestion(lifecycle, questionId = 'q1') {
    lifecycle.beginQuestion(questionId);
    return lifecycle.captureOwnership();
}

function createHarness({ isCompletionCurrent = () => true } = {}) {
    const lifecycle = createLifecycleController();
    lifecycle.mount();
    lifecycle.start();
    const ownership = mountQuestion(lifecycle);
    const onQuestionCompleted = vi.fn();
    const onSessionCompleted = vi.fn();
    const onShowSummary = vi.fn();
    const controller = createSessionFinalizationController({
        lifecycle,
        isCompletionCurrent,
        onQuestionCompleted,
        onSessionCompleted,
        onShowSummary,
    });
    return {
        lifecycle,
        ownership,
        controller,
        onQuestionCompleted,
        onSessionCompleted,
        onShowSummary,
    };
}

function record(controller, ownership, current, total, resolution = 'correct') {
    return controller.recordResolvedQuestion({
        ownership,
        questionIdentity: ownership.questionId,
        progress: { current, total },
        resolution,
    });
}

describe('resolution-gated session finalization', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('does not complete an unresolved final counter position', () => {
        const { controller, lifecycle, ownership, onQuestionCompleted, onShowSummary } =
            createHarness();

        const result = record(controller, ownership, 1, 1);
        vi.advanceTimersByTime(1_000);

        expect(result).toMatchObject({ accepted: false, reason: 'question-not-resolved' });
        expect(lifecycle.sessionState).toBe(SESSION_STATES.ACTIVE);
        expect(onQuestionCompleted).not.toHaveBeenCalled();
        expect(onShowSummary).not.toHaveBeenCalled();
    });

    it('counts each owned question once and completes only the resolved final question', () => {
        const {
            controller,
            lifecycle,
            ownership: q1,
            onQuestionCompleted,
            onSessionCompleted,
            onShowSummary,
        } = createHarness();
        lifecycle.resolve('correct');

        expect(record(controller, q1, 1, 2)).toMatchObject({
            counted: true,
            sessionCompleted: false,
        });
        expect(record(controller, q1, 1, 2)).toMatchObject({
            counted: false,
            sessionCompleted: false,
        });
        expect(lifecycle.sessionState).toBe(SESSION_STATES.ACTIVE);

        const q2 = mountQuestion(lifecycle, 'q2');
        lifecycle.resolve('correct');
        expect(record(controller, q2, 2, 2)).toMatchObject({
            reason: 'session-completed',
            counted: true,
            sessionCompleted: true,
        });
        expect(record(controller, q2, 2, 2)).toMatchObject({
            reason: 'already-complete',
            counted: false,
            sessionCompleted: true,
        });

        vi.advanceTimersByTime(800);
        vi.advanceTimersByTime(800);
        expect(onQuestionCompleted).toHaveBeenCalledTimes(2);
        expect(onSessionCompleted).toHaveBeenCalledTimes(1);
        expect(onShowSummary).toHaveBeenCalledTimes(1);
        expect(controller.completedQuestionCount).toBe(2);
    });

    it.each(['correct', 'incorrect'])(
        'counts a one-question %s result before summary',
        (result) => {
            const {
                controller,
                lifecycle,
                ownership,
                onQuestionCompleted,
                onSessionCompleted,
                onShowSummary,
            } = createHarness();
            lifecycle.resolve(result);

            record(controller, ownership, 1, 1, result);
            expect(onQuestionCompleted).toHaveBeenCalledTimes(1);
            expect(onSessionCompleted).toHaveBeenCalledTimes(1);
            expect(onShowSummary).not.toHaveBeenCalled();
            vi.advanceTimersByTime(800);
            expect(onShowSummary).toHaveBeenCalledTimes(1);
        },
    );

    it('cancels the owned summary callback during cleanup', () => {
        const { controller, lifecycle, ownership, onShowSummary } = createHarness();
        lifecycle.resolve('correct');
        record(controller, ownership, 1, 1);

        vi.advanceTimersByTime(799);
        controller.cleanup();
        lifecycle.cleanup();
        vi.advanceTimersByTime(1);

        expect(onShowSummary).not.toHaveBeenCalled();
    });

    it('cancels finalization on confirmed rewind and permits one clean re-answer', () => {
        const { controller, lifecycle, ownership, onQuestionCompleted, onShowSummary } =
            createHarness();
        lifecycle.resolve('correct');
        record(controller, ownership, 1, 1);

        lifecycle.beginRewind();
        lifecycle.confirmRewind();
        controller.reopenQuestion(ownership);
        vi.advanceTimersByTime(800);
        expect(onShowSummary).not.toHaveBeenCalled();
        expect(controller.isComplete).toBe(false);

        lifecycle.resolve('correct');
        record(controller, ownership, 1, 1);
        record(controller, ownership, 1, 1);
        vi.advanceTimersByTime(800);

        expect(onQuestionCompleted).toHaveBeenCalledTimes(2);
        expect(onShowSummary).toHaveBeenCalledTimes(1);
    });

    it('fails closed when the final DOM ownership is no longer current', () => {
        const isCompletionCurrent = vi.fn(() => false);
        const { controller, lifecycle, ownership, onShowSummary } = createHarness({
            isCompletionCurrent,
        });
        lifecycle.resolve('correct');
        record(controller, ownership, 1, 1);

        vi.advanceTimersByTime(800);

        expect(isCompletionCurrent).toHaveBeenCalledTimes(1);
        expect(onShowSummary).not.toHaveBeenCalled();
    });

    it('rejects stale ownership from a previous question generation', () => {
        const { controller, lifecycle, ownership: q1, onQuestionCompleted } = createHarness();
        lifecycle.resolve('correct');
        mountQuestion(lifecycle, 'q2');

        expect(record(controller, q1, 1, 2)).toMatchObject({
            accepted: false,
            reason: 'stale-owner',
        });
        expect(onQuestionCompleted).not.toHaveBeenCalled();
    });

    it('cannot leak a summary callback into a same-route second session', () => {
        const first = createHarness();
        first.lifecycle.resolve('correct');
        record(first.controller, first.ownership, 1, 1);
        first.controller.cleanup();
        first.lifecycle.cleanup();

        const second = createHarness();
        second.lifecycle.resolve('correct');
        record(second.controller, second.ownership, 1, 1);
        vi.advanceTimersByTime(800);

        expect(first.onShowSummary).not.toHaveBeenCalled();
        expect(second.onShowSummary).toHaveBeenCalledTimes(1);
    });
});
