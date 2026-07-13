import { DOM_RESOLUTION } from '../adapters/marumori-dom.js';

const RESOLVED_STATES = new Set([DOM_RESOLUTION.CORRECT, DOM_RESOLUTION.INCORRECT]);

function result(ok, status, reason, source, extra = {}) {
    return Object.freeze({ ok, status, reason, source, ...extra });
}

function defaultClock() {
    return globalThis.performance?.now?.() ?? Date.now();
}

/**
 * @typedef {Readonly<{
 *   transactionGeneration: number,
 *   sessionGeneration: number,
 *   questionGeneration: number,
 *   answerGeneration: number,
 *   sourceLogicalQuestionIdentity: string,
 *   sourceDomGeneration: string,
 *   expectedDestinationLogicalQuestionIdentity: string,
 *   snapshotIdentity: string,
 *   startedAt: number,
 *   confirmationDeadline: number,
 * }>} RewindTransactionOwnership
 */

export function createTransactionalRewind({
    lifecycle,
    dom,
    restoreSnapshot,
    cancelSummary = () => {},
    onCommit = () => {},
    onFailure = () => {},
    timeoutMs = 750,
    recoveryWindowMs = 2_000,
    clock = defaultClock,
} = {}) {
    if (!lifecycle?.captureOwnership || !lifecycle?.owns) {
        throw new TypeError('Transactional rewind requires a lifecycle controller');
    }
    if (!dom?.readQuestionContext) {
        throw new TypeError('Transactional rewind requires atomic MaruMori DOM context');
    }
    if (typeof restoreSnapshot !== 'function') {
        throw new TypeError('Transactional rewind requires snapshot restoration');
    }
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
        throw new RangeError('Rewind confirmation timeout must be positive');
    }
    if (!Number.isFinite(recoveryWindowMs) || recoveryWindowMs <= 0) {
        throw new RangeError('Rewind recovery window must be positive');
    }

    let captured = null;
    let pending = null;
    let recentRecovery = null;
    let programmaticInvocationDepth = 0;
    let nextSnapshotGeneration = 1;
    let nextTransactionGeneration = 1;

    function readOwnedContext(record) {
        if (
            !record ||
            !lifecycle.owns(record.ownership) ||
            lifecycle.answerGeneration !== record.answerGeneration
        ) {
            return { ok: false, reason: 'stale-owner', context: null };
        }
        const context = dom.readQuestionContext();
        if (!context) return { ok: false, reason: 'missing-question-context', context: null };
        if (context.root !== record.reviewRoot) {
            return { ok: false, reason: 'review-root-changed', context };
        }
        if (context.logicalQuestionIdentity !== record.sourceLogicalQuestionIdentity) {
            return { ok: false, reason: 'question-changed', context };
        }
        if (
            record.identityKind === 'fallback' &&
            context.domGeneration !== record.sourceDomGeneration
        ) {
            return { ok: false, reason: 'fallback-dom-changed', context };
        }
        return { ok: true, reason: 'current', context };
    }

    function capture(snapshot) {
        if (pending) return false;
        if (recentRecovery) {
            clearRecoveryCandidate('superseded-by-new-answer', { discard: true, notify: false });
        }
        const context = dom.readQuestionContext();
        const ownership = lifecycle.captureOwnership();
        if (
            !context ||
            !RESOLVED_STATES.has(context.resolution) ||
            !lifecycle.owns(ownership) ||
            ownership.questionId !== context.logicalQuestionIdentity
        ) {
            return false;
        }
        const snapshotIdentity =
            `${ownership.sessionGeneration}:${ownership.questionGeneration}:` +
            `${nextSnapshotGeneration++}`;
        captured = Object.freeze({
            snapshot,
            snapshotIdentity,
            resolution: context.resolution,
            sourceLogicalQuestionIdentity: context.logicalQuestionIdentity,
            sourceDomGeneration: context.domGeneration,
            identityKind: context.identityKind,
            reviewRoot: context.root,
            wrapper: context.wrapper,
            progress: Object.freeze({
                current: context.progress.current,
                total: context.progress.total,
            }),
            ownership,
            answerGeneration: lifecycle.answerGeneration,
        });
        return true;
    }

    /**
     * Replace the gameplay snapshot without invalidating its host/lifecycle
     * ownership. This is used when an explicit user action (such as Reset
     * Records) must remain authoritative if the answer is rewound later.
     */
    function updateSnapshot(update) {
        if (typeof update !== 'function') {
            throw new TypeError('Rewind snapshot update requires a function');
        }

        const records = [captured, pending, recentRecovery].filter(Boolean);
        if (records.length === 0) return false;

        const replacements = new Map();
        for (const record of records) {
            if (replacements.has(record.snapshot)) continue;
            const replacement = update(record.snapshot);
            if (!replacement || typeof replacement !== 'object') {
                throw new TypeError('Rewind snapshot update must return an object');
            }
            replacements.set(record.snapshot, replacement);
        }

        let changed = false;
        if (captured) {
            const replacement = replacements.get(captured.snapshot);
            if (replacement !== captured.snapshot) {
                captured = Object.freeze({ ...captured, snapshot: replacement });
                changed = true;
            }
        }
        for (const record of [pending, recentRecovery]) {
            if (!record) continue;
            const replacement = replacements.get(record.snapshot);
            if (replacement !== record.snapshot) {
                record.snapshot = replacement;
                changed = true;
            }
        }
        return changed;
    }

    function isCaptureCurrent() {
        if (!captured) return false;
        const validation = readOwnedContext(captured);
        return validation.ok && validation.context.resolution === captured.resolution;
    }

    function cleanupPending(transaction) {
        transaction.cancelTimeout?.();
        transaction.stopObserving?.();
        transaction.removeOwnershipCleanup?.();
        transaction.cancelTimeout = null;
        transaction.stopObserving = null;
        transaction.removeOwnershipCleanup = null;
    }

    function settle(transaction, outcome, { discard = false } = {}) {
        if (pending !== transaction || transaction.settled) return;
        transaction.settled = true;
        cleanupPending(transaction);
        pending = null;

        if (!outcome.ok && lifecycle.owns(transaction.ownership)) {
            lifecycle.cancelRewind?.();
        }
        if (discard) captured = null;
        transaction.resolve(outcome);
        if (!outcome.ok) onFailure(outcome);
    }

    function performRestore(record, source, { recovered = false, context } = {}) {
        let outcome;
        try {
            cancelSummary();
            const restored = restoreSnapshot(record.snapshot, {
                source,
                ownership: record.ownership,
                snapshotIdentity: record.snapshotIdentity,
                recovered,
            });
            if (restored === false) throw new Error('Snapshot restoration was rejected');
            if (!lifecycle.confirmRewind?.()) {
                throw new Error('Lifecycle rejected rewind confirmation');
            }
            captured = null;
            outcome = result(
                true,
                recovered ? 'recovered' : 'committed',
                recovered ? 'late-confirmed-unresolved' : 'confirmed-unresolved',
                source,
                {
                    transactionGeneration: record.transactionGeneration,
                    snapshotIdentity: record.snapshotIdentity,
                    recovered,
                    progress: context
                        ? Object.freeze({
                              current: context.progress.current,
                              total: context.progress.total,
                          })
                        : null,
                },
            );
        } catch (error) {
            lifecycle.cancelRewind?.();
            outcome = Object.freeze({
                ...result(false, 'failed', 'snapshot-restore-failed', source, {
                    transactionGeneration: record.transactionGeneration,
                    snapshotIdentity: record.snapshotIdentity,
                    recovered,
                }),
                error,
            });
        }
        if (outcome.ok) onCommit(outcome);
        else onFailure(outcome);
        return outcome;
    }

    function commit(transaction, context) {
        if (pending !== transaction || transaction.settled) return false;
        transaction.settled = true;
        cleanupPending(transaction);
        pending = null;
        const outcome = performRestore(transaction, transaction.source, { context });
        transaction.resolve(outcome);
        return outcome.ok;
    }

    function clearRecoveryCandidate(
        reason,
        { discard = false, notify = true, keepCapture = false } = {},
    ) {
        const candidate = recentRecovery;
        if (!candidate) return false;
        recentRecovery = null;
        candidate.cancelRecoveryTimeout?.();
        candidate.removeOwnershipCleanup?.();
        candidate.cancelRecoveryTimeout = null;
        candidate.removeOwnershipCleanup = null;
        if (discard && !keepCapture) captured = null;
        if (notify) {
            onFailure(
                result(false, 'cancelled', reason, candidate.source, {
                    transactionGeneration: candidate.transactionGeneration,
                    snapshotIdentity: candidate.snapshotIdentity,
                    recoveryExpired: reason === 'late-recovery-expired',
                }),
            );
        }
        return true;
    }

    function expireRecoveryCandidate(candidate) {
        if (recentRecovery !== candidate) return;
        const keepCapture = isCaptureCurrent();
        clearRecoveryCandidate('late-recovery-expired', {
            discard: !keepCapture,
            keepCapture,
        });
    }

    function enterRecovery(transaction) {
        if (pending !== transaction || transaction.settled) return;
        transaction.settled = true;
        cleanupPending(transaction);
        pending = null;
        lifecycle.cancelRewind?.();
        const expiredAt = clock();
        const candidate = {
            ...transaction,
            settled: true,
            expiredAt,
            recoveryDeadline: expiredAt + recoveryWindowMs,
            cancelRecoveryTimeout: null,
            removeOwnershipCleanup: null,
        };
        recentRecovery = candidate;
        candidate.removeOwnershipCleanup =
            lifecycle.questionScope?.defer(() => {
                clearRecoveryCandidate('late-recovery-owner-lost', {
                    discard: true,
                    notify: false,
                });
            }) ?? (() => {});
        candidate.cancelRecoveryTimeout = lifecycle.questionScope?.setTimeout(
            () => expireRecoveryCandidate(candidate),
            recoveryWindowMs,
        );

        const outcome = result(false, 'failed', 'confirmation-timeout', transaction.source, {
            transactionGeneration: transaction.transactionGeneration,
            snapshotIdentity: transaction.snapshotIdentity,
            recoveryPending: true,
            recoveryDeadline: candidate.recoveryDeadline,
        });
        transaction.resolve(outcome);
        onFailure(outcome);
    }

    function reconcileRecovery() {
        const candidate = recentRecovery;
        if (!candidate) return false;
        if (clock() > candidate.recoveryDeadline) {
            expireRecoveryCandidate(candidate);
            return false;
        }
        const validation = readOwnedContext(candidate);
        if (!validation.ok) {
            if (validation.reason !== 'missing-question-context') {
                clearRecoveryCandidate(`late-recovery-${validation.reason}`, { discard: true });
            }
            return false;
        }
        const { context } = validation;
        if (context.resolution === candidate.originResolution) return false;
        if (context.resolution !== DOM_RESOLUTION.UNRESOLVED) {
            clearRecoveryCandidate('late-recovery-superseded', { discard: true });
            return false;
        }

        clearRecoveryCandidate('late-recovery-committing', {
            keepCapture: true,
            notify: false,
        });
        if (!lifecycle.beginRewind?.()) {
            captured = null;
            onFailure(
                result(false, 'failed', 'late-recovery-lifecycle-rejected', candidate.source),
            );
            return false;
        }
        return performRestore(candidate, candidate.source, {
            recovered: true,
            context,
        }).ok;
    }

    function reconcilePending() {
        const transaction = pending;
        if (!transaction || transaction.settled) return false;
        const validation = readOwnedContext(transaction);
        if (!validation.ok) {
            if (validation.reason === 'missing-question-context') return false;
            settle(transaction, result(false, 'cancelled', validation.reason, transaction.source), {
                discard: true,
            });
            return false;
        }

        const { context } = validation;
        if (context.resolution === DOM_RESOLUTION.UNRESOLVED && transaction.sawResolved) {
            return commit(transaction, context);
        }
        if (context.resolution !== transaction.originResolution) {
            settle(
                transaction,
                result(false, 'failed', 'unexpected-resolution', transaction.source),
            );
            return false;
        }
        transaction.sawResolved = true;
        return false;
    }

    function reconcile() {
        if (pending) return reconcilePending();
        if (recentRecovery) return reconcileRecovery();
        if (captured) {
            const validation = readOwnedContext(captured);
            if (
                validation.reason !== 'missing-question-context' &&
                (!validation.ok || validation.context.resolution !== captured.resolution)
            ) {
                const source = 'snapshot';
                const snapshotIdentity = captured.snapshotIdentity;
                captured = null;
                onFailure(
                    result(false, 'cancelled', 'snapshot-no-longer-current', source, {
                        snapshotIdentity,
                    }),
                );
            }
        }
        return false;
    }

    function createTransaction(source) {
        let resolvePromise;
        const promise = new Promise((resolve) => {
            resolvePromise = resolve;
        });
        const startedAt = clock();
        const transaction = {
            transactionGeneration: nextTransactionGeneration++,
            source,
            promise,
            resolve: resolvePromise,
            ownership: captured.ownership,
            sessionGeneration: captured.ownership.sessionGeneration,
            questionGeneration: captured.ownership.questionGeneration,
            answerGeneration: captured.answerGeneration,
            sourceLogicalQuestionIdentity: captured.sourceLogicalQuestionIdentity,
            sourceDomGeneration: captured.sourceDomGeneration,
            expectedDestinationLogicalQuestionIdentity: captured.sourceLogicalQuestionIdentity,
            identityKind: captured.identityKind,
            reviewRoot: captured.reviewRoot,
            wrapper: captured.wrapper,
            originResolution: captured.resolution,
            snapshot: captured.snapshot,
            snapshotIdentity: captured.snapshotIdentity,
            startedAt,
            confirmationDeadline: startedAt + timeoutMs,
            sawResolved: true,
            settled: false,
            cancelTimeout: null,
            stopObserving: null,
            removeOwnershipCleanup: null,
        };
        pending = transaction;
        return transaction;
    }

    function begin({ source, invokeNative }) {
        if (pending) return pending.promise;
        if (recentRecovery) {
            return Promise.resolve(result(false, 'failed', 'late-recovery-pending', source));
        }
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

        const transaction = createTransaction(source);
        transaction.stopObserving = dom.observeResolution?.(reconcile) ?? (() => {});
        transaction.removeOwnershipCleanup =
            lifecycle.questionScope?.defer(() => {
                settle(transaction, result(false, 'cancelled', 'stale-owner', source), {
                    discard: true,
                });
            }) ?? (() => {});
        transaction.cancelTimeout = lifecycle.questionScope?.setTimeout(() => {
            reconcile();
            if (pending === transaction) enterRecovery(transaction);
        }, timeoutMs);

        if (!invokeNative) return transaction.promise;
        programmaticInvocationDepth += 1;
        let invoked = false;
        try {
            invoked = capability.invoke();
        } finally {
            programmaticInvocationDepth -= 1;
        }
        if (!invoked) {
            settle(transaction, result(false, 'failed', 'native-invocation-failed', source));
            return transaction.promise;
        }
        reconcile();
        return transaction.promise;
    }

    return Object.freeze({
        capture,
        updateSnapshot,
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
            }
            clearRecoveryCandidate('discarded', { discard: true, notify: false });
            captured = null;
        },
        get hasSnapshot() {
            return Boolean(captured);
        },
        get isPending() {
            return Boolean(pending || recentRecovery);
        },
        get hasRecoveryCandidate() {
            return Boolean(recentRecovery);
        },
        get isInvokingNative() {
            return programmaticInvocationDepth > 0;
        },
    });
}
