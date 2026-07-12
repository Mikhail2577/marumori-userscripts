import { DOM_RESOLUTION } from '../adapters/marumori-dom.js';
import { SESSION_STATES } from '../core/state.js';

/**
 * @typedef {Readonly<{
 *   kind: 'answer-timer',
 *   timerGeneration: number,
 *   sessionGeneration: number,
 *   questionGeneration: number,
 *   logicalQuestionIdentity: string,
 *   identityKind: 'host' | 'fallback',
 *   domGeneration: string,
 *   rootGeneration: number,
 *   wrapperGeneration: number,
 *   reviewRoot: Element,
 *   wrapper: Element,
 *   lifecycleOwnership: Readonly<object>,
 *   armedAt: number,
 *   deadline: number,
 *   durationMs: number,
 * }>} TimerOwnership
 */

function result(ok, reason, context = null, extra = {}) {
    return Object.freeze({ ok, reason, context, ...extra });
}

function normalizeResolutions(allowedResolutions) {
    if (allowedResolutions === null) return null;
    const resolutions = Array.isArray(allowedResolutions)
        ? allowedResolutions
        : [allowedResolutions ?? DOM_RESOLUTION.UNRESOLVED];
    return new Set(resolutions);
}

/**
 * Creates immutable timer ownership records and validates them against one
 * atomic MaruMori question-context sample before host-facing side effects.
 */
export function createAnswerTimerOwnershipController({ lifecycle, dom, clock } = {}) {
    if (!lifecycle?.captureOwnership || !lifecycle?.owns) {
        throw new TypeError('Answer timer ownership requires a lifecycle controller');
    }
    if (!dom?.readQuestionContext) {
        throw new TypeError('Answer timer ownership requires atomic DOM question context');
    }
    const readClock = typeof clock === 'function' ? clock : () => performance.now();
    let generation = 0;
    let current = null;

    function arm({ durationMs, deadline = null, armedAt = null } = {}) {
        if (!Number.isFinite(durationMs) || durationMs <= 0) {
            throw new RangeError('Answer timer durationMs must be greater than zero');
        }
        const context = dom.readQuestionContext();
        const lifecycleOwnership = lifecycle.captureOwnership();
        if (
            !context ||
            context.resolution !== DOM_RESOLUTION.UNRESOLVED ||
            lifecycle.sessionState !== SESSION_STATES.ACTIVE ||
            !lifecycle.owns(lifecycleOwnership) ||
            lifecycleOwnership.questionId !== context.logicalQuestionIdentity
        ) {
            return null;
        }

        const now = readClock();
        const resolvedDeadline = Number.isFinite(deadline) ? deadline : now + durationMs;
        const resolvedArmedAt = Number.isFinite(armedAt) ? armedAt : resolvedDeadline - durationMs;
        if (resolvedDeadline <= resolvedArmedAt) {
            throw new RangeError('Answer timer deadline must follow its arm time');
        }

        generation += 1;
        current = Object.freeze({
            kind: 'answer-timer',
            timerGeneration: generation,
            sessionGeneration: lifecycleOwnership.sessionGeneration,
            questionGeneration: lifecycleOwnership.questionGeneration,
            logicalQuestionIdentity: context.logicalQuestionIdentity,
            identityKind: context.identityKind,
            domGeneration: context.domGeneration,
            rootGeneration: context.rootGeneration,
            wrapperGeneration: context.wrapperGeneration,
            reviewRoot: context.root,
            wrapper: context.wrapper,
            lifecycleOwnership,
            armedAt: resolvedArmedAt,
            deadline: resolvedDeadline,
            durationMs,
        });
        return current;
    }

    function validate(
        ownership,
        {
            allowedResolutions = DOM_RESOLUTION.UNRESOLVED,
            requireExactDom = true,
            requireExpired = false,
        } = {},
    ) {
        if (!ownership || ownership.kind !== 'answer-timer') {
            return result(false, 'missing-ownership');
        }
        if (current !== ownership || ownership.timerGeneration !== generation) {
            return result(false, 'stale-timer-generation');
        }
        if (
            ownership.sessionGeneration !== lifecycle.sessionGeneration ||
            ownership.questionGeneration !== lifecycle.questionGeneration ||
            ownership.logicalQuestionIdentity !== lifecycle.questionId ||
            !lifecycle.owns(ownership.lifecycleOwnership)
        ) {
            return result(false, 'stale-lifecycle-owner');
        }

        const context = dom.readQuestionContext();
        if (!context) return result(false, 'missing-question-context');
        if (context.root !== ownership.reviewRoot) {
            return result(false, 'review-root-changed', context);
        }
        if (context.logicalQuestionIdentity !== ownership.logicalQuestionIdentity) {
            return result(false, 'logical-question-changed', context);
        }
        if (
            requireExactDom &&
            (context.domGeneration !== ownership.domGeneration ||
                context.wrapper !== ownership.wrapper)
        ) {
            return result(false, 'dom-generation-changed', context);
        }

        const acceptedResolutions = normalizeResolutions(allowedResolutions);
        if (acceptedResolutions && !acceptedResolutions.has(context.resolution)) {
            return result(false, 'unexpected-resolution', context);
        }
        if (requireExpired && readClock() + Number.EPSILON < ownership.deadline) {
            return result(false, 'deadline-not-reached', context);
        }
        return result(true, 'current', context);
    }

    function rearmForCurrentDom(ownership, { restartIfExpired = true } = {}) {
        const validation = validate(ownership, {
            allowedResolutions: DOM_RESOLUTION.UNRESOLVED,
            requireExactDom: false,
        });
        if (!validation.ok) return result(false, validation.reason, validation.context);
        if (validation.context.domGeneration === ownership.domGeneration) {
            return result(true, 'dom-unchanged', validation.context, { ownership });
        }

        const now = readClock();
        const expired = now >= ownership.deadline;
        if (expired && !restartIfExpired) {
            invalidate(ownership);
            return result(false, 'replacement-after-deadline', validation.context);
        }
        const replacement = arm({
            durationMs: ownership.durationMs,
            deadline: expired ? now + ownership.durationMs : ownership.deadline,
            armedAt: expired ? now : ownership.armedAt,
        });
        return replacement
            ? result(
                  true,
                  expired ? 'restarted-after-replacement' : 'rearmed-replacement',
                  validation.context,
                  {
                      ownership: replacement,
                      restartedDeadline: expired,
                  },
              )
            : result(false, 'replacement-rearm-rejected', validation.context);
    }

    function invalidate(ownership = current) {
        if (!ownership || ownership !== current) return false;
        generation += 1;
        current = null;
        return true;
    }

    return Object.freeze({
        arm,
        validate,
        rearmForCurrentDom,
        invalidate,
        get current() {
            return current;
        },
        get generation() {
            return generation;
        },
    });
}
