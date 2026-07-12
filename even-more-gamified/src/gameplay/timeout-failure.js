import { DOM_RESOLUTION } from '../adapters/marumori-dom.js';

function outcome(ok, status, reason, source, extra = {}) {
    return Object.freeze({ ok, status, reason, source, ...extra });
}

export function createTimeoutFailureController({
    lifecycle,
    dom,
    invalidValue = () => `__mm_timeout_${Date.now()}__`,
    resolutionTimeoutMs = 1200,
    advanceDelayMs = 150,
    onIncorrectConfirmed = () => {},
    onUnresolvedFailure = () => {},
    onFailure = () => {},
} = {}) {
    if (!lifecycle?.captureOwnership || !lifecycle?.owns) {
        throw new TypeError('Timeout failure requires a lifecycle controller');
    }
    if (!dom?.getResolvedState || !dom?.getQuestionIdentity) {
        throw new TypeError('Timeout failure requires a MaruMori DOM adapter');
    }

    let pending = null;

    function restoreInjectedInput(transaction) {
        const injected = transaction.injectedInput;
        if (!injected) return false;
        transaction.injectedInput = null;
        if (
            !lifecycle.owns(transaction.ownership) ||
            dom.getQuestionIdentity() !== transaction.questionIdentity ||
            dom.getResolvedState() !== DOM_RESOLUTION.UNRESOLVED ||
            dom.getAnswerInput?.() !== injected.input
        ) {
            return false;
        }
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
        const originStillUnresolved = Boolean(
            !result.ok &&
            lifecycle.owns(transaction.ownership) &&
            dom.getQuestionIdentity() === transaction.questionIdentity &&
            dom.getResolvedState() === DOM_RESOLUTION.UNRESOLVED,
        );
        const finalResult = Object.freeze({
            ...result,
            ...(restoredInput ? { restoredInput: true } : {}),
            ...(originStillUnresolved ? { originStillUnresolved: true } : {}),
        });
        transaction.resolve(finalResult);
        if (originStillUnresolved) onUnresolvedFailure(finalResult);
        if (!finalResult.ok) onFailure(finalResult);
    }

    function advance(transaction) {
        if (pending !== transaction || transaction.settled || transaction.advanced) {
            return;
        }
        if (
            !lifecycle.owns(transaction.ownership) ||
            dom.getQuestionIdentity() !== transaction.questionIdentity ||
            dom.getResolvedState() !== DOM_RESOLUTION.INCORRECT
        ) {
            settle(
                transaction,
                outcome(false, 'cancelled', 'stale-before-advance', transaction.source),
            );
            return;
        }
        const next = dom.getCapability?.('next');
        if (!next) {
            settle(transaction, outcome(false, 'failed', 'next-unavailable', transaction.source));
            return;
        }

        transaction.advanced = true;
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
        settle(
            transaction,
            outcome(true, 'advanced', 'incorrect-confirmed', transaction.source, {
                strategy: transaction.strategy,
            }),
        );
    }

    function confirmIncorrect(transaction) {
        if (transaction.incorrectConfirmed) return;
        transaction.incorrectConfirmed = true;
        transaction.injectedInput = null;
        transaction.cancelResolutionTimeout?.();
        transaction.cancelResolutionTimeout = null;
        lifecycle.resolve?.('incorrect');
        transaction.cancelAdvance = lifecycle.questionScope?.setTimeout(
            () => advance(transaction),
            advanceDelayMs,
        );
        onIncorrectConfirmed({
            source: transaction.source,
            ownership: transaction.ownership,
            strategy: transaction.strategy,
        });
    }

    function reconcile() {
        const transaction = pending;
        if (!transaction || transaction.settled) return false;
        if (!lifecycle.owns(transaction.ownership)) {
            settle(transaction, outcome(false, 'cancelled', 'stale-owner', transaction.source));
            return false;
        }
        if (dom.getQuestionIdentity() !== transaction.questionIdentity) {
            settle(
                transaction,
                outcome(false, 'cancelled', 'question-changed', transaction.source),
            );
            return false;
        }

        const resolution = dom.getResolvedState();
        if (resolution === DOM_RESOLUTION.INCORRECT) {
            confirmIncorrect(transaction);
            return true;
        }
        if (resolution === DOM_RESOLUTION.CORRECT) {
            settle(
                transaction,
                outcome(false, 'failed', 'unexpected-correct-resolution', transaction.source),
            );
        }
        return false;
    }

    function createTransaction(source) {
        let resolvePromise;
        const promise = new Promise((resolve) => {
            resolvePromise = resolve;
        });
        const transaction = {
            source,
            promise,
            resolve: resolvePromise,
            ownership: lifecycle.captureOwnership(),
            questionIdentity: dom.getQuestionIdentity(),
            strategy: null,
            injectedInput: null,
            incorrectConfirmed: false,
            advanced: false,
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

    function start(source = 'timeout') {
        if (pending) return pending.promise;
        if (dom.getResolvedState() !== DOM_RESOLUTION.UNRESOLVED || !dom.getQuestionIdentity()) {
            const result = outcome(false, 'failed', 'question-not-unresolved', source);
            onFailure(result);
            return Promise.resolve(result);
        }

        const transaction = createTransaction(source);
        if (!lifecycle.owns(transaction.ownership)) {
            settle(transaction, outcome(false, 'cancelled', 'stale-owner', source));
            return transaction.promise;
        }
        transaction.stopObserving = dom.observeResolution?.(reconcile) ?? (() => {});
        transaction.removeOwnershipCleanup =
            lifecycle.questionScope?.defer(() => {
                if (transaction.committingAdvance) return;
                settle(transaction, outcome(false, 'cancelled', 'stale-owner', source));
            }) ?? (() => {});
        transaction.cancelResolutionTimeout = lifecycle.questionScope?.setTimeout(() => {
            reconcile();
            if (pending === transaction && !transaction.incorrectConfirmed) {
                settle(transaction, outcome(false, 'failed', 'resolution-timeout', source), {
                    restore: true,
                });
            }
        }, resolutionTimeoutMs);

        const wrong = dom.getCapability?.('wrong');
        if (wrong) {
            transaction.strategy = 'wrong-control';
            if (!wrong.invoke()) {
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
        transaction.injectedInput = {
            input,
            originalValue: input.value,
        };
        if (!dom.setAnswerValue(input, invalidValue())) {
            settle(transaction, outcome(false, 'failed', 'input-injection-failed', source), {
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
