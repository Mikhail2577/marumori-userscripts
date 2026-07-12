export function createReconciler(reconcile, { schedule } = {}) {
    if (typeof reconcile !== 'function') {
        throw new TypeError('Reconciler callback must be a function');
    }

    const enqueue = schedule ?? ((callback) => queueMicrotask(callback));
    let active = true;
    let pending = false;
    let generation = 0;
    const reasons = new Set();

    const run = () => {
        if (!active || !pending) return;
        pending = false;
        const currentReasons = [...reasons];
        reasons.clear();
        reconcile(currentReasons);
    };

    return Object.freeze({
        request(reason = 'dom-change') {
            if (!active) return false;
            reasons.add(reason);
            if (pending) return true;
            pending = true;
            const scheduledGeneration = generation;
            enqueue(() => {
                if (scheduledGeneration === generation) run();
            });
            return true;
        },
        flush: run,
        dispose() {
            active = false;
            pending = false;
            reasons.clear();
            generation += 1;
        },
        get pending() {
            return pending;
        },
    });
}
