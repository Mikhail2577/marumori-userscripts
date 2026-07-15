export const REVIEW_ROUTE_PATTERN = /^\/study-lists\/reviews(?:\/|$)/;

const DEFAULT_WATCHDOG_INTERVAL_MS = 1_000;
const MIN_WATCHDOG_INTERVAL_MS = 50;

function noop() {}

export function isReviewPathname(pathname) {
    return REVIEW_ROUTE_PATTERN.test(String(pathname ?? ''));
}

function bindScheduler(scheduler) {
    const fallback = globalThis;
    const setTimeout = scheduler?.setTimeout ?? fallback.setTimeout;
    const clearTimeout = scheduler?.clearTimeout ?? fallback.clearTimeout;
    const queueMicrotask = scheduler?.queueMicrotask ?? fallback.queueMicrotask;

    if (typeof setTimeout !== 'function' || typeof clearTimeout !== 'function') {
        throw new TypeError('The navigation adapter requires timeout scheduling');
    }

    const scheduleTimeout = setTimeout.bind(scheduler ?? fallback);
    return {
        setTimeout: scheduleTimeout,
        clearTimeout: clearTimeout.bind(scheduler ?? fallback),
        queueMicrotask:
            typeof queueMicrotask === 'function'
                ? queueMicrotask.bind(scheduler ?? fallback)
                : (callback) => scheduleTimeout(callback, 0),
    };
}

function normalizeWatchdogInterval(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return DEFAULT_WATCHDOG_INTERVAL_MS;
    return Math.max(MIN_WATCHDOG_INTERVAL_MS, Math.round(number));
}

function classListContainsOwnedClass(element) {
    if (element?.localName === 'body') return false;
    return [...(element?.classList ?? [])].some((className) => className.startsWith('mm-'));
}

export function isUserscriptOwnedNode(node) {
    let element = node?.nodeType === 1 ? node : node?.parentElement;
    while (element?.nodeType === 1) {
        if (element.hasAttribute?.('data-mm-owned')) return true;
        if (element.id?.startsWith('mm-')) return true;
        if (classListContainsOwnedClass(element)) return true;
        if (element.localName === 'body') break;
        element = element.parentElement;
    }
    return false;
}

export function isUserscriptOnlyMutation(record) {
    if (!record) return true;
    if (isUserscriptOwnedNode(record.target)) return true;
    if (record.type !== 'childList') return false;

    const changedNodes = [...(record.addedNodes ?? []), ...(record.removedNodes ?? [])];
    return changedNodes.length > 0 && changedNodes.every(isUserscriptOwnedNode);
}

function replaceHistoryMethod(history, methodName, onChange) {
    const original = history?.[methodName];
    if (typeof original !== 'function') return null;

    const ownDescriptor = Object.getOwnPropertyDescriptor(history, methodName);
    const wrapped = function navigationHistoryWrapper(...args) {
        const result = Reflect.apply(original, this, args);
        onChange(methodName);
        return result;
    };

    let installed = false;
    try {
        const descriptor =
            ownDescriptor && 'value' in ownDescriptor
                ? { ...ownDescriptor, value: wrapped }
                : {
                      configurable: ownDescriptor?.configurable ?? true,
                      enumerable: ownDescriptor?.enumerable ?? false,
                      value: wrapped,
                      writable: true,
                  };
        Object.defineProperty(history, methodName, descriptor);
        installed = history[methodName] === wrapped;
    } catch {
        try {
            installed =
                Reflect.set(history, methodName, wrapped) && history[methodName] === wrapped;
        } catch {
            installed = false;
        }
    }

    if (!installed) return null;
    return Object.freeze({ methodName, original, ownDescriptor, wrapped });
}

function restoreHistoryMethod(history, record) {
    if (!record || history?.[record.methodName] !== record.wrapped) return;
    try {
        if (record.ownDescriptor) {
            Object.defineProperty(history, record.methodName, record.ownDescriptor);
            return;
        }
        if (Reflect.deleteProperty(history, record.methodName)) return;
    } catch {
        // Fall through to assignment for unusual History implementations.
    }
    try {
        Reflect.set(history, record.methodName, record.original);
    } catch {
        // The wrapper is generation-guarded even if a host object refuses restoration.
    }
}

export function createNavigationAdapter({
    window = globalThis.window,
    document = window?.document ?? globalThis.document,
    history = window?.history ?? globalThis.history,
    location = window?.location ?? globalThis.location,
    MutationObserver: MutationObserverConstructor = window?.MutationObserver ??
        globalThis.MutationObserver,
    URL: URLConstructor = window?.URL ?? globalThis.URL,
    scheduler = window ?? globalThis,
    watchdogIntervalMs = DEFAULT_WATCHDOG_INTERVAL_MS,
    getObserverRoot = () => document?.body ?? document?.documentElement ?? null,
    onEnter = noop,
    onLeave = noop,
    onReconcile = noop,
} = {}) {
    if (typeof URLConstructor !== 'function') {
        throw new TypeError('The navigation adapter requires a URL constructor');
    }
    if (typeof getObserverRoot !== 'function') {
        throw new TypeError('getObserverRoot must be a function');
    }

    const tasks = bindScheduler(scheduler);
    const watchdogDelay = normalizeWatchdogInterval(watchdogIntervalMs);

    let started = false;
    let generation = 0;
    let routeRelevant = false;
    let currentUrl = null;
    let popstateListener = null;
    let historyRecords = [];
    let watchdogTimer = null;
    let observer = null;
    let observerRoot = null;
    let observerGeneration = 0;
    let reconcileGeneration = 0;
    let reconcilePending = false;
    const reconcileReasons = new Set();

    function readCurrentUrl() {
        try {
            const href = location?.href ?? location?.pathname ?? '/';
            const base = location?.origin ? `${location.origin}/` : 'https://marumori.invalid/';
            const parsed = new URLConstructor(String(href), base);
            return Object.freeze({ href: parsed.href, pathname: parsed.pathname });
        } catch {
            return null;
        }
    }

    function callbackContext(source, url = currentUrl) {
        return Object.freeze({
            generation,
            pathname: url?.pathname ?? null,
            source,
            url: url?.href ?? null,
        });
    }

    function cancelPendingReconcile() {
        reconcileGeneration += 1;
        reconcilePending = false;
        reconcileReasons.clear();
    }

    function requestReconcile(reason = 'mutation') {
        if (!started || !routeRelevant) return false;
        reconcileReasons.add(reason);
        if (reconcilePending) return true;

        reconcilePending = true;
        const scheduledGeneration = generation;
        const scheduledReconcileGeneration = reconcileGeneration;
        tasks.queueMicrotask(() => {
            if (
                !started ||
                !routeRelevant ||
                generation !== scheduledGeneration ||
                reconcileGeneration !== scheduledReconcileGeneration ||
                !reconcilePending
            ) {
                return;
            }
            reconcilePending = false;
            const reasons = [...reconcileReasons];
            reconcileReasons.clear();
            onReconcile(
                Object.freeze({
                    ...callbackContext(reasons[0] ?? 'mutation'),
                    reasons: Object.freeze(reasons),
                    root: observerRoot,
                }),
            );
        });
        return true;
    }

    function disconnectObserver() {
        observerGeneration += 1;
        try {
            observer?.disconnect();
        } finally {
            observer = null;
            observerRoot = null;
        }
    }

    function ensureObserver({ notify = false } = {}) {
        if (!started || !routeRelevant || typeof MutationObserverConstructor !== 'function') {
            disconnectObserver();
            return false;
        }

        let nextRoot = null;
        try {
            nextRoot = getObserverRoot();
        } catch {
            nextRoot = null;
        }
        if (!nextRoot) {
            disconnectObserver();
            return false;
        }
        if (observer && observerRoot === nextRoot && observerRoot.isConnected !== false) {
            return false;
        }

        const previousRoot = observerRoot;
        disconnectObserver();
        const scheduledGeneration = generation;
        const scheduledObserverGeneration = observerGeneration;
        let nextObserver;
        try {
            nextObserver = new MutationObserverConstructor((records = []) => {
                if (
                    !started ||
                    !routeRelevant ||
                    generation !== scheduledGeneration ||
                    observerGeneration !== scheduledObserverGeneration ||
                    observer !== nextObserver
                ) {
                    return;
                }
                if (records.length > 0 && records.every(isUserscriptOnlyMutation)) return;
                requestReconcile('mutation');
            });
            nextObserver.observe(nextRoot, {
                attributes: true,
                childList: true,
                subtree: true,
            });
            observer = nextObserver;
            observerRoot = nextRoot;
        } catch {
            try {
                nextObserver?.disconnect();
            } catch {
                // A later watchdog pass retries the observer connection.
            }
            observer = null;
            observerRoot = null;
            return false;
        }

        const rootChanged = previousRoot !== null && previousRoot !== nextRoot;
        if (notify && rootChanged) requestReconcile('observer-root');
        return rootChanged;
    }

    function checkRoute(source) {
        if (!started) return false;
        const nextUrl = readCurrentUrl();
        if (!nextUrl) {
            if (routeRelevant) ensureObserver({ notify: true });
            return false;
        }

        const previousUrl = currentUrl;
        const urlChanged = previousUrl?.href !== nextUrl.href;
        const nextRelevant = isReviewPathname(nextUrl.pathname);
        currentUrl = nextUrl;

        if (nextRelevant !== routeRelevant) {
            routeRelevant = nextRelevant;
            cancelPendingReconcile();
            if (routeRelevant) {
                ensureObserver();
                onEnter(callbackContext(source, nextUrl));
            } else {
                disconnectObserver();
                onLeave(
                    Object.freeze({
                        ...callbackContext(source, nextUrl),
                        previousUrl: previousUrl?.href ?? null,
                    }),
                );
            }
            return true;
        }

        if (routeRelevant) {
            ensureObserver({ notify: true });
            if (urlChanged && previousUrl) requestReconcile('navigation');
        }
        return urlChanged;
    }

    function scheduleWatchdog(scheduledGeneration) {
        if (!started || generation !== scheduledGeneration) return;
        watchdogTimer = tasks.setTimeout(() => {
            watchdogTimer = null;
            if (!started || generation !== scheduledGeneration) return;
            try {
                checkRoute('watchdog');
            } finally {
                scheduleWatchdog(scheduledGeneration);
            }
        }, watchdogDelay);
    }

    function start() {
        if (started) return false;
        started = true;
        generation += 1;
        const startedGeneration = generation;

        const historyChanged = (methodName) => {
            if (!started || generation !== startedGeneration) return;
            checkRoute(methodName);
        };
        historyRecords = ['pushState', 'replaceState']
            .map((methodName) => replaceHistoryMethod(history, methodName, historyChanged))
            .filter(Boolean);

        popstateListener = () => {
            if (!started || generation !== startedGeneration) return;
            checkRoute('popstate');
        };
        window?.addEventListener?.('popstate', popstateListener);

        checkRoute('start');
        scheduleWatchdog(startedGeneration);
        return true;
    }

    function stop() {
        if (!started) return false;
        const shouldLeave = routeRelevant;
        const leaveUrl = currentUrl;

        started = false;
        generation += 1;
        routeRelevant = false;
        cancelPendingReconcile();
        disconnectObserver();
        if (watchdogTimer !== null) tasks.clearTimeout(watchdogTimer);
        watchdogTimer = null;
        window?.removeEventListener?.('popstate', popstateListener);
        popstateListener = null;
        for (const record of [...historyRecords].reverse()) restoreHistoryMethod(history, record);
        historyRecords = [];
        currentUrl = null;

        if (shouldLeave) onLeave(callbackContext('stop', leaveUrl));
        return true;
    }

    return Object.freeze({
        cleanup: stop,
        requestReconcile,
        start,
        stop,
        get isReviewRoute() {
            return routeRelevant;
        },
    });
}
