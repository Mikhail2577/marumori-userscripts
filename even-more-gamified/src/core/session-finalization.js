import { QUESTION_STATES, SESSION_STATES } from './state.js';

const RESOLVED_QUESTION_STATES = Object.freeze({
    correct: QUESTION_STATES.RESOLVED_CORRECT,
    incorrect: QUESTION_STATES.RESOLVED_INCORRECT,
});

/**
 * @typedef {Readonly<{
 *   sessionGeneration: number,
 *   questionGeneration: number,
 *   questionId: string,
 * }>} QuestionOwnership
 */

/**
 * @typedef {Readonly<{
 *   ownership: QuestionOwnership,
 *   logicalQuestionIdentity: string,
 *   resolution: 'correct' | 'incorrect',
 *   progress: Readonly<{current: number, total: number}>,
 *   token: number,
 * }>} FinalQuestionCompletion
 */

function ownershipKey(ownership) {
    return `${ownership.sessionGeneration}:${ownership.questionGeneration}`;
}

function isValidProgress(progress) {
    return (
        Number.isInteger(progress?.current) &&
        Number.isInteger(progress?.total) &&
        progress.total > 0 &&
        progress.current >= 1 &&
        progress.current <= progress.total
    );
}

function response(accepted, reason, extra = {}) {
    return Object.freeze({ accepted, reason, ...extra });
}

/**
 * Owns the resolution-gated session-completion contract for one mounted session.
 * A final counter position is only progress metadata; completion requires the
 * currently owned logical question to have reached a confirmed resolved state.
 */
export function createSessionFinalizationController({
    lifecycle,
    summaryDelayMs = 800,
    isCompletionCurrent = () => true,
    onQuestionCompleted = () => {},
    onSessionCompleted = () => {},
    onShowSummary = () => {},
} = {}) {
    if (!lifecycle?.captureOwnership || !lifecycle?.owns || !lifecycle?.complete) {
        throw new TypeError('Session finalization requires a lifecycle controller');
    }
    if (!Number.isFinite(summaryDelayMs) || summaryDelayMs < 0) {
        throw new RangeError('Summary delay must be a nonnegative duration');
    }

    const completedOwnerships = new Set();
    let status = 'active';
    let finalCompletion = null;
    let cancelSummaryTimer = null;
    let finalizationToken = 0;
    let summaryShown = false;

    function clearSummaryTimer() {
        cancelSummaryTimer?.();
        cancelSummaryTimer = null;
    }

    function scheduleSummary(completion) {
        clearSummaryTimer();
        cancelSummaryTimer = lifecycle.sessionScope?.setTimeout(() => {
            cancelSummaryTimer = null;
            if (
                status !== 'completed' ||
                summaryShown ||
                finalCompletion !== completion ||
                completion.token !== finalizationToken ||
                lifecycle.sessionState !== SESSION_STATES.COMPLETED ||
                !lifecycle.owns(completion.ownership) ||
                !isCompletionCurrent(completion)
            ) {
                return;
            }
            summaryShown = true;
            onShowSummary(completion);
        }, summaryDelayMs);
    }

    function recordResolvedQuestion({
        ownership = lifecycle.captureOwnership(),
        questionIdentity = ownership?.questionId,
        progress,
        resolution,
    } = {}) {
        if (status === 'disposed') return response(false, 'disposed');
        if (!ownership || !questionIdentity || !lifecycle.owns(ownership)) {
            return response(false, 'stale-owner');
        }
        if (ownership.questionId !== questionIdentity) {
            return response(false, 'identity-mismatch');
        }
        if (!isValidProgress(progress)) return response(false, 'invalid-progress');
        if (RESOLVED_QUESTION_STATES[resolution] !== lifecycle.questionState) {
            return response(false, 'question-not-resolved');
        }

        const key = ownershipKey(ownership);
        const counted = !completedOwnerships.has(key);
        if (counted) {
            completedOwnerships.add(key);
            onQuestionCompleted({ ownership, questionIdentity, progress, resolution });
        }

        if (progress.current !== progress.total) {
            return response(true, counted ? 'question-counted' : 'duplicate-resolution', {
                counted,
                sessionCompleted: false,
            });
        }

        if (status === 'completed') {
            const sameFinalQuestion =
                finalCompletion?.ownership.sessionGeneration === ownership.sessionGeneration &&
                finalCompletion?.ownership.questionGeneration === ownership.questionGeneration &&
                finalCompletion?.logicalQuestionIdentity === questionIdentity;
            return response(
                sameFinalQuestion,
                sameFinalQuestion ? 'already-complete' : 'completed',
                {
                    counted,
                    sessionCompleted: sameFinalQuestion,
                },
            );
        }

        if (!lifecycle.complete(ownership)) {
            return response(false, 'lifecycle-rejected-completion', { counted });
        }

        finalizationToken += 1;
        const completion = Object.freeze({
            ownership,
            logicalQuestionIdentity: questionIdentity,
            resolution,
            progress: Object.freeze({ current: progress.current, total: progress.total }),
            token: finalizationToken,
        });
        finalCompletion = completion;
        status = 'completed';
        summaryShown = false;
        onSessionCompleted(completion);
        scheduleSummary(completion);
        return response(true, 'session-completed', {
            counted,
            sessionCompleted: true,
            completion,
        });
    }

    function reopenQuestion(ownership = lifecycle.captureOwnership()) {
        if (status === 'disposed' || !ownership) return false;
        completedOwnerships.delete(ownershipKey(ownership));
        const ownsFinal =
            finalCompletion?.ownership.sessionGeneration === ownership.sessionGeneration &&
            finalCompletion?.ownership.questionGeneration === ownership.questionGeneration;
        if (ownsFinal) {
            clearSummaryTimer();
            finalizationToken += 1;
            finalCompletion = null;
            summaryShown = false;
            status = 'active';
        }
        return true;
    }

    function cancelPendingSummary() {
        if (!cancelSummaryTimer) return false;
        clearSummaryTimer();
        return true;
    }

    function isFinalizedQuestion({
        ownership = lifecycle.captureOwnership(),
        questionIdentity = ownership?.questionId,
    } = {}) {
        return Boolean(
            status === 'completed' &&
            finalCompletion &&
            ownership &&
            finalCompletion.ownership.sessionGeneration === ownership.sessionGeneration &&
            finalCompletion.ownership.questionGeneration === ownership.questionGeneration &&
            finalCompletion.logicalQuestionIdentity === questionIdentity,
        );
    }

    function cleanup() {
        if (status === 'disposed') return;
        clearSummaryTimer();
        completedOwnerships.clear();
        finalCompletion = null;
        summaryShown = false;
        finalizationToken += 1;
        status = 'disposed';
    }

    return Object.freeze({
        recordResolvedQuestion,
        reopenQuestion,
        cancelPendingSummary,
        isFinalizedQuestion,
        cleanup,
        get isComplete() {
            return status === 'completed';
        },
        get summaryShown() {
            return summaryShown;
        },
        get completedQuestionCount() {
            return completedOwnerships.size;
        },
        get finalCompletion() {
            return finalCompletion;
        },
    });
}
