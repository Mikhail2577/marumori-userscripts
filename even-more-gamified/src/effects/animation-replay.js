function defaultScheduler() {
    return {
        requestAnimationFrame: (callback) => globalThis.requestAnimationFrame(callback),
        cancelAnimationFrame: (id) => globalThis.cancelAnimationFrame(id),
        setTimeout: (callback, delay) => globalThis.setTimeout(callback, delay),
        clearTimeout: (id) => globalThis.clearTimeout(id),
    };
}

export function createAnimationReplayer({ scheduler = defaultScheduler() } = {}) {
    const entries = new Map();

    function cancel(element, { removeClasses = true } = {}) {
        const entry = entries.get(element);
        if (!entry) return false;
        entries.delete(element);
        if (entry.frameId !== null) scheduler.cancelAnimationFrame?.(entry.frameId);
        if (entry.timerId !== null) scheduler.clearTimeout(entry.timerId);
        if (removeClasses) element.classList.remove(...entry.resetClasses);
        return true;
    }

    function replay(element, resetClasses, activeClass, { removeAfterMs = 0 } = {}) {
        if (!element?.classList || typeof activeClass !== 'string') return false;
        const classes = [...new Set(resetClasses ?? [activeClass])];
        cancel(element);
        element.classList.remove(...classes);

        const entry = {
            activeClass,
            resetClasses: classes,
            frameId: null,
            timerId: null,
        };
        entries.set(element, entry);
        entry.frameId = scheduler.requestAnimationFrame(() => {
            entry.frameId = null;
            if (entries.get(element) !== entry || !element.isConnected) {
                entries.delete(element);
                return;
            }
            element.classList.add(activeClass);
            if (!(removeAfterMs > 0)) return;
            entry.timerId = scheduler.setTimeout(() => {
                entry.timerId = null;
                if (entries.get(element) !== entry) return;
                element.classList.remove(activeClass);
                entries.delete(element);
            }, removeAfterMs);
        });
        return true;
    }

    function cancelAll() {
        for (const element of [...entries.keys()]) cancel(element);
    }

    return Object.freeze({ replay, cancel, cancelAll });
}
