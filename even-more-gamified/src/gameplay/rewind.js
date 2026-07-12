import { DOM_RESOLUTION } from '../adapters/marumori-dom.js';

const RESOLVED_STATES = new Set([DOM_RESOLUTION.CORRECT, DOM_RESOLUTION.INCORRECT]);

function result(ok, status, reason, source) {
    return Object.freeze({ ok, status, reason, source });
}

export function createTransactionalRewind({
    lifecycle,
    dom,
    restoreSnapshot,
    cancelSummary = () => {},
    onCommit = () => {},
    onFailure = () => {},
    timeoutMs = 750,
} = {}) {
    if (!lifecycle?.captureOwnership || !lifecycle?.owns) {
        throw new TypeError('Transactional rewind requires a lifecycle controller');
    }
    if (!dom?.getResolvedState || !dom?.getQuestionIdentity) {
        throw new TypeError('Transactional rewind requires a MaruMori DOM adapter');
    }
    if (typeof restoreSnapshot !== 'function') {
        throw new TypeError('Transactional rewind requires snapshot restoration');
    }

    let captured = null;
    let pending = null;
    let programmaticInvocationDepth = 0;

    function capture(snapshot) {
        if (pending) return false;
        const resolution = dom.getResolvedState();
        const questionIdentity = dom.getQuestionIdentity();
        const ownership = lifecycle.captureOwnership();
        if (!RESOLVED_STATES.has(resolution) || !questionIdentity || !lifecycle.owns(ownership)) {
            return false;
        }
        captured = Object.freeze({
            snapshot,
            resolution,
            questionIdentity,
            ownership,
        });
        return true;
    }

    function isCaptureCurrent() {
        return (
            captured &&
            lifecycle.owns(captured.ownership) &&
            dom.getQuestionIdentity() === captured.questionIdentity &&
            dom.getResolvedState() === captured.resolution
        );
    }

    function settle(transaction, outcome, { discard = false } = {}) {
        if (pending !== transaction || transaction.settled) return;
        transaction.settled = true;
        transaction.cancelTimeout?.();
        transaction.stopObserving?.();
        transaction.removeOwnershipCleanup?.();
        pending = null;

        if (!outcome.ok && lifecycle.owns(transaction.ownership)) {
            lifecycle.cancelRewind?.();
        }
        if (discard) captured = null;
        transaction.resolve(outcome);
        if (!outcome.ok) onFailure(outcome);
    }

    function commit(transaction) {
        if (pending !== transaction || transaction.settled) return false;
        let outcome;
        try {
            cancelSummary();
            restoreSnapshot(transaction.snapshot, {
                source: transaction.source,
                ownership: transaction.ownership,
            });
            lifecycle.confirmRewind?.();
            captured = null;
            outcome = result(true, 'committed', 'confirmed-unresolved', transaction.source);
        } catch (error) {
            outcome = Object.freeze({
                ...result(false, 'failed', 'snapshot-restore-failed', transaction.source),
                error,
            });
        }
        settle(transaction, outcome, { discard: outcome.ok });
        if (outcome.ok) onCommit(outcome);
        return outcome.ok;
    }

    function reconcile() {
        const transaction = pending;
        if (!transaction || transaction.settled) return false;
        if (!lifecycle.owns(transaction.ownership)) {
            settle(transaction, result(false, 'cancelled', 'stale-owner', transaction.source), {
                discard: true,
            });
            return false;
        }
        if (dom.getQuestionIdentity() !== transaction.questionIdentity) {
            settle(
                transaction,
                result(false, 'cancelled', 'question-changed', transaction.source),
                { discard: true },
            );
            return false;
        }

        const resolution = dom.getResolvedState();
        if (resolution === DOM_RESOLUTION.UNRESOLVED && transaction.sawResolved) {
            return commit(transaction);
        }
        if (resolution !== transaction.originResolution) {
            if (resolution === DOM_RESOLUTION.UNKNOWN) return false;
            settle(
                transaction,
                result(false, 'failed', 'unexpected-resolution', transaction.source),
            );
            return false;
        }
        transaction.sawResolved = true;
        return false;
    }

    function begin({ source, invokeNative }) {
        if (pending) return pending.promise;
        if (!isCaptureCurrent()) {
            return Promise.resolve(result(false, 'failed', 'snapshot-not-current', source));
        }

        const capability = invokeNative ? dom.getNativeRewindCapability?.() : null;
        if (invokeNative && !capability) {
            const outcome = result(false, 'failed', 'native-rewind-unavailable', source);
            onFailure(outcome);
            return Promise.resolve(outcome);
        }
        if (!lifecycle.beginRewind?.()) {
            const outcome = result(false, 'failed', 'lifecycle-not-resolved', source);
            onFailure(outcome);
            return Promise.resolve(outcome);
        }

        let resolvePromise;
        const promise = new Promise((resolve) => {
            resolvePromise = resolve;
        });
        const transaction = {
            source,
            promise,
            resolve: resolvePromise,
            ownership: captured.ownership,
            questionIdentity: captured.questionIdentity,
            originResolution: captured.resolution,
            snapshot: captured.snapshot,
            sawResolved: true,
            settled: false,
            cancelTimeout: null,
            stopObserving: null,
            removeOwnershipCleanup: null,
        };
        pending = transaction;

        transaction.stopObserving = dom.observeResolution?.(reconcile) ?? (() => {});
        transaction.removeOwnershipCleanup =
            lifecycle.questionScope?.defer(() => {
                settle(transaction, result(false, 'cancelled', 'stale-owner', source), {
                    discard: true,
                });
            }) ?? (() => {});
        transaction.cancelTimeout = lifecycle.questionScope?.setTimeout(() => {
            reconcile();
            if (pending === transaction) {
                settle(transaction, result(false, 'failed', 'confirmation-timeout', source));
            }
        }, timeoutMs);

        if (!invokeNative) return promise;
        programmaticInvocationDepth += 1;
        let invoked = false;
        try {
            invoked = capability.invoke();
        } finally {
            programmaticInvocationDepth -= 1;
        }
        if (!invoked) {
            settle(transaction, result(false, 'failed', 'native-invocation-failed', source));
            return promise;
        }
        reconcile();
        return promise;
    }

    return Object.freeze({
        capture,
        request(source = 'hud') {
            return begin({ source, invokeNative: true });
        },
        trackNativeIntent(source = 'native') {
            if (programmaticInvocationDepth > 0 && pending) return pending.promise;
            return begin({ source, invokeNative: false });
        },
        reconcile,
        discard() {
            if (pending) {
                settle(pending, result(false, 'cancelled', 'discarded', pending.source), {
                    discard: true,
                });
            } else {
                captured = null;
            }
        },
        get hasSnapshot() {
            return Boolean(captured);
        },
        get isPending() {
            return Boolean(pending);
        },
        get isInvokingNative() {
            return programmaticInvocationDepth > 0;
        },
    });
}
