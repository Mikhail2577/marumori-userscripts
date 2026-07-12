import { DOM_RESOLUTION } from '../adapters/marumori-dom.js';

function outcome(ok, status, reason, source, extra = {}) {
    return Object.freeze({ ok, status, reason, source, ...extra });
}

/**
 * @typedef {object} TimeoutTransaction
 * @property {number} generation
 * @property {Readonly<object>} timerOwnership
 * @property {Readonly<object>} ownership
 * @property {string} questionIdentity
 * @property {string} domGeneration
 * @property {Element} reviewRoot
 * @property {Element} wrapper
 */

export function createTimeoutFailureController({
    lifecycle,
    dom,
    validateTimerOwnership,
    invalidValue = () => `__mm_timeout_${Date.now()}__`,
    resolutionTimeoutMs = 1200,
    advanceDelayMs = 150,
    canAdvance = () => true,
    onIncorrectConfirmed = () => {},
    onUnresolvedFailure = () => {},
    onFailure = () => {},
    onSettled = () => {},
} = {}) {
    if (!lifecycle?.owns) {
        throw new TypeError('Timeout failure requires a lifecycle controller');
    }
    if (!dom?.readQuestionContext) {
        throw new TypeError('Timeout failure requires atomic MaruMori DOM context');
    }
    if (typeof validateTimerOwnership !== 'function') {
        throw new TypeError('Timeout failure requires timer ownership validation');
    }

    let pending = null;
    let nextTransactionGeneration = 1;

    function getAdvanceContext(transaction) {
        return Object.freeze({
            transactionGeneration: transaction.generation,
            timerOwnership: transaction.timerOwnership,
            ownership: transaction.ownership,
            questionIdentity: transaction.questionIdentity,
            domGeneration: transaction.domGeneration,
            reviewRoot: transaction.reviewRoot,
            wrapper: transaction.wrapper,
            source: transaction.source,
            strategy: transaction.strategy,
        });
    }

    function validateTransaction(transaction, allowedResolutions) {
        const validation = validateTimerOwnership(transaction.timerOwnership, {
            allowedResolutions,
            requireExactDom: true,
        });
        if (!validation?.ok) return validation ?? { ok: false, reason: 'timer-owner-rejected' };
        const { context } = validation;
        if (
            !context ||
            !lifecycle.owns(transaction.ownership) ||
            transaction.timerOwnership.lifecycleOwnership !== transaction.ownership ||
            context.logicalQuestionIdentity !== transaction.questionIdentity ||
            context.domGeneration !== transaction.domGeneration ||
            context.root !== transaction.reviewRoot ||
            context.wrapper !== transaction.wrapper
        ) {
            return Object.freeze({ ok: false, reason: 'transaction-owner-mismatch', context });
        }
        return validation;
    }

    function restoreInjectedInput(transaction) {
        const injected = transaction.injectedInput;
        if (!injected) return false;
        transaction.injectedInput = null;
        const validation = validateTransaction(transaction, DOM_RESOLUTION.UNRESOLVED);
        if (!validation.ok || dom.getAnswerInput?.() !== injected.input) return false;
        return dom.setAnswerValue?.(injected.input, injected.originalValue) ?? false;
    }

    function settle(transaction, result, { restore = false } = {}) {
        if (pending !== transaction || transaction.settled) return;
        transaction.settled = true;
        transaction.cancelResolutionTimeout?.();
        transaction.cancelAdvance?.();
        transaction.stopObserving?.();
        transaction.removeOwnershipCleanup?.();
        const restoredInput = restore ? restoreInjectedInput(transaction) : false;
        pending = null;
        const unresolvedValidation = !result.ok
            ? validateTransaction(transaction, DOM_RESOLUTION.UNRESOLVED)
            : null;
        const originStillUnresolved = unresolvedValidation?.ok === true;
        const finalResult = Object.freeze({
            ...result,
            transactionGeneration: transaction.generation,
            timerGeneration: transaction.timerOwnership.timerGeneration,
            ...(restoredInput ? { restoredInput: true } : {}),
            ...(originStillUnresolved ? { originStillUnresolved: true } : {}),
        });
        transaction.resolve(finalResult);
        if (originStillUnresolved) onUnresolvedFailure(finalResult);
        if (!finalResult.ok) onFailure(finalResult);
        onSettled(finalResult, getAdvanceContext(transaction));
    }

    function suppressAdvance(transaction) {
        settle(
            transaction,
            outcome(true, 'completed', 'automatic-advance-suppressed', transaction.source, {
                strategy: transaction.strategy,
            }),
        );
    }

    function advance(transaction) {
        if (
            pending !== transaction ||
            transaction.settled ||
            transaction.advanceState !== 'scheduled'
        ) {
            return;
        }
        const validation = validateTransaction(transaction, DOM_RESOLUTION.INCORRECT);
        if (!validation.ok) {
            settle(
                transaction,
                outcome(
                    false,
                    'cancelled',
                    `stale-before-advance:${validation.reason}`,
                    transaction.source,
                ),
            );
            return;
        }
        if (!canAdvance(getAdvanceContext(transaction))) {
            suppressAdvance(transaction);
            return;
        }
        const next = dom.getCapability?.('next');
        if (!next) {
            settle(transaction, outcome(false, 'failed', 'next-unavailable', transaction.source));
            return;
        }

        transaction.advanceState = 'invoking';
        transaction.committingAdvance = true;
        const invoked = next.invoke();
        transaction.committingAdvance = false;
        if (!invoked) {
            settle(
                transaction,
                outcome(false, 'failed', 'next-invocation-failed', transaction.source),
            );
            return;
        }
        transaction.advanceState = 'done';
        settle(
            transaction,
            outcome(true, 'advanced', 'incorrect-confirmed', transaction.source, {
                strategy: transaction.strategy,
            }),
        );
    }

    function confirmIncorrect(transaction) {
        if (transaction.incorrectConfirmed) return;
        const validation = validateTransaction(transaction, DOM_RESOLUTION.INCORRECT);
        if (!validation.ok) {
            settle(
                transaction,
                outcome(
                    false,
                    'cancelled',
                    `stale-before-confirm:${validation.reason}`,
                    transaction.source,
                ),
            );
            return;
        }

        transaction.incorrectConfirmed = true;
        transaction.injectedInput = null;
        transaction.cancelResolutionTimeout?.();
        transaction.cancelResolutionTimeout = null;
        lifecycle.resolve?.('incorrect');
        onIncorrectConfirmed(getAdvanceContext(transaction));

        const afterCallback = validateTransaction(transaction, DOM_RESOLUTION.INCORRECT);
        if (!afterCallback.ok) {
            settle(
                transaction,
                outcome(
                    false,
                    'cancelled',
                    `stale-after-confirm:${afterCallback.reason}`,
                    transaction.source,
                ),
            );
            return;
        }
        if (!canAdvance(getAdvanceContext(transaction))) {
            suppressAdvance(transaction);
            return;
        }
        transaction.advanceState = 'scheduled';
        transaction.cancelAdvance = lifecycle.questionScope?.setTimeout(
            () => advance(transaction),
            advanceDelayMs,
        );
    }

    function reconcile() {
        const transaction = pending;
        if (!transaction || transaction.settled) return false;
        const validation = validateTransaction(transaction, [
            DOM_RESOLUTION.UNRESOLVED,
            DOM_RESOLUTION.INCORRECT,
            DOM_RESOLUTION.CORRECT,
        ]);
        if (!validation.ok) {
            settle(
                transaction,
                outcome(
                    false,
                    'cancelled',
                    `ownership-rejected:${validation.reason}`,
                    transaction.source,
                ),
            );
            return false;
        }

        const resolution = validation.context.resolution;
        if (resolution === DOM_RESOLUTION.INCORRECT) {
            confirmIncorrect(transaction);
            return true;
        }
        if (resolution === DOM_RESOLUTION.CORRECT) {
            settle(
                transaction,
                outcome(false, 'cancelled', 'natural-answer-won-race', transaction.source),
            );
        }
        return false;
    }

    function createTransaction(source, timerOwnership) {
        let resolvePromise;
        const promise = new Promise((resolve) => {
            resolvePromise = resolve;
        });
        const transaction = {
            generation: nextTransactionGeneration++,
            source,
            promise,
            resolve: resolvePromise,
            timerOwnership,
            ownership: timerOwnership.lifecycleOwnership,
            questionIdentity: timerOwnership.logicalQuestionIdentity,
            domGeneration: timerOwnership.domGeneration,
            reviewRoot: timerOwnership.reviewRoot,
            wrapper: timerOwnership.wrapper,
            strategy: null,
            injectedInput: null,
            incorrectConfirmed: false,
            advanceState: 'idle',
            committingAdvance: false,
            settled: false,
            cancelResolutionTimeout: null,
            cancelAdvance: null,
            stopObserving: null,
            removeOwnershipCleanup: null,
        };
        pending = transaction;
        return transaction;
    }

    function immediateFailure(source, reason, timerOwnership = null) {
        const failure = outcome(false, 'failed', reason, source, {
            ...(timerOwnership ? { timerGeneration: timerOwnership.timerGeneration } : {}),
        });
        onFailure(failure);
        onSettled(failure, null);
        return Promise.resolve(failure);
    }

    function start(source = 'timeout', timerOwnership = null) {
        if (pending) {
            if (pending.timerOwnership === timerOwnership) return pending.promise;
            settle(
                pending,
                outcome(false, 'cancelled', 'superseded-by-new-timer', pending.source),
                { restore: true },
            );
        }
        if (!timerOwnership) return immediateFailure(source, 'missing-timer-ownership');

        const initialValidation = validateTimerOwnership(timerOwnership, {
            allowedResolutions: DOM_RESOLUTION.UNRESOLVED,
            requireExactDom: true,
            requireExpired: true,
        });
        if (!initialValidation?.ok) {
            return immediateFailure(
                source,
                `timer-owner-rejected:${initialValidation?.reason ?? 'unknown'}`,
                timerOwnership,
            );
        }

        const transaction = createTransaction(source, timerOwnership);
        if (!validateTransaction(transaction, DOM_RESOLUTION.UNRESOLVED).ok) {
            settle(transaction, outcome(false, 'cancelled', 'stale-owner', source));
            return transaction.promise;
        }
        transaction.stopObserving = dom.observeResolution?.(reconcile) ?? (() => {});
        transaction.removeOwnershipCleanup =
            lifecycle.questionScope?.defer(() => {
                if (transaction.committingAdvance) return;
                settle(transaction, outcome(false, 'cancelled', 'stale-owner', source), {
                    restore: true,
                });
            }) ?? (() => {});
        transaction.cancelResolutionTimeout = lifecycle.questionScope?.setTimeout(() => {
            reconcile();
            if (pending === transaction && !transaction.incorrectConfirmed) {
                settle(transaction, outcome(false, 'failed', 'resolution-timeout', source), {
                    restore: true,
                });
            }
        }, resolutionTimeoutMs);

        let validation = validateTransaction(transaction, DOM_RESOLUTION.UNRESOLVED);
        if (!validation.ok) {
            settle(
                transaction,
                outcome(false, 'cancelled', `stale-before-failure:${validation.reason}`, source),
            );
            return transaction.promise;
        }
        const wrong = dom.getCapability?.('wrong');
        if (wrong) {
            transaction.strategy = 'wrong-control';
            validation = validateTransaction(transaction, DOM_RESOLUTION.UNRESOLVED);
            if (!validation.ok) {
                settle(
                    transaction,
                    outcome(false, 'cancelled', `stale-before-wrong:${validation.reason}`, source),
                );
            } else if (!wrong.invoke()) {
                settle(transaction, outcome(false, 'failed', 'wrong-invocation-failed', source));
            } else {
                reconcile();
            }
            return transaction.promise;
        }

        const input = dom.getAnswerInput?.();
        const submit = dom.getCapability?.('submit');
        if (!input || !submit) {
            settle(transaction, outcome(false, 'failed', 'auto-fail-unavailable', source));
            return transaction.promise;
        }

        transaction.strategy = 'invalid-answer';
        transaction.injectedInput = { input, originalValue: input.value };
        validation = validateTransaction(transaction, DOM_RESOLUTION.UNRESOLVED);
        if (!validation.ok || dom.getAnswerInput?.() !== input) {
            settle(transaction, outcome(false, 'cancelled', 'stale-before-input', source));
            return transaction.promise;
        }
        if (!dom.setAnswerValue(input, invalidValue())) {
            settle(transaction, outcome(false, 'failed', 'input-injection-failed', source), {
                restore: true,
            });
            return transaction.promise;
        }

        validation = validateTransaction(transaction, DOM_RESOLUTION.UNRESOLVED);
        if (!validation.ok || dom.getAnswerInput?.() !== input) {
            settle(transaction, outcome(false, 'cancelled', 'stale-before-submit', source), {
                restore: true,
            });
            return transaction.promise;
        }
        if (!submit.invoke()) {
            settle(transaction, outcome(false, 'failed', 'submit-invocation-failed', source), {
                restore: true,
            });
            return transaction.promise;
        }
        reconcile();
        return transaction.promise;
    }

    return Object.freeze({
        start,
        reconcile,
        cancel(reason = 'cancelled') {
            if (!pending) return false;
            settle(pending, outcome(false, 'cancelled', reason, pending.source), { restore: true });
            return true;
        },
        get isPending() {
            return Boolean(pending);
        },
    });
}
