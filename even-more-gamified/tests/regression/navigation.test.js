// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createNavigationAdapter, isReviewPathname } from '../../src/adapters/navigation.js';

class ManualScheduler {
    constructor({ ignoreClear = false } = {}) {
        this.ignoreClear = ignoreClear;
        this.microtasks = [];
        this.timers = new Map();
        this.nextTimerId = 1;
    }

    queueMicrotask(callback) {
        this.microtasks.push(callback);
    }

    setTimeout(callback, delay) {
        const id = this.nextTimerId;
        this.nextTimerId += 1;
        this.timers.set(id, { callback, delay });
        return id;
    }

    clearTimeout(id) {
        if (!this.ignoreClear) this.timers.delete(id);
    }

    flushMicrotasks() {
        while (this.microtasks.length > 0) this.microtasks.shift()();
    }

    runTimer(id) {
        const timer = this.timers.get(id);
        if (!timer) return false;
        this.timers.delete(id);
        timer.callback();
        return true;
    }

    get timerIds() {
        return [...this.timers.keys()];
    }
}

class FakeMutationObserver {
    static instances = [];

    constructor(callback) {
        this.callback = callback;
        this.disconnect = vi.fn();
        this.observe = vi.fn();
        FakeMutationObserver.instances.push(this);
    }

    emit(records) {
        this.callback(records, this);
    }
}

function createEnvironment(initialPath = '/') {
    const location = {
        href: new URL(initialPath, 'https://marumori.io/').href,
        origin: 'https://marumori.io',
    };
    const updateLocation = (nextUrl) => {
        if (nextUrl !== undefined && nextUrl !== null) {
            location.href = new URL(String(nextUrl), location.href).href;
        }
    };
    const originalPushState = vi.fn((_state, _title, nextUrl) => updateLocation(nextUrl));
    const originalReplaceState = vi.fn((_state, _title, nextUrl) => updateLocation(nextUrl));
    const history = {
        pushState: originalPushState,
        replaceState: originalReplaceState,
    };
    const eventTarget = new EventTarget();
    const window = {
        addEventListener: vi.fn((...args) => eventTarget.addEventListener(...args)),
        removeEventListener: vi.fn((...args) => eventTarget.removeEventListener(...args)),
        dispatchPopstate() {
            eventTarget.dispatchEvent(new Event('popstate'));
        },
    };
    return { history, location, originalPushState, originalReplaceState, window };
}

function hostChildListRecord(target = document.body) {
    const hostNode = document.createElement('section');
    return {
        addedNodes: [hostNode],
        removedNodes: [],
        target,
        type: 'childList',
    };
}

function createAdapter(environment, overrides = {}) {
    return createNavigationAdapter({
        document,
        history: environment.history,
        location: environment.location,
        MutationObserver: FakeMutationObserver,
        URL,
        window: environment.window,
        ...overrides,
    });
}

describe('review route matching', () => {
    it.each([
        ['/study-lists/reviews', true],
        ['/study-lists/reviews/', true],
        ['/study-lists/reviews/session-1', true],
        ['/study-lists/review', false],
        ['/study-lists/reviewss', false],
        ['/study-lists/reviews-old', false],
        ['/other/study-lists/reviews', false],
    ])('matches %s exactly: %s', (pathname, expected) => {
        expect(isReviewPathname(pathname)).toBe(expected);
    });
});

describe('navigation adapter', () => {
    beforeEach(() => {
        FakeMutationObserver.instances = [];
        document.body.className = '';
        document.body.innerHTML = '';
    });

    it('wraps route changes reversibly and disconnects the observer on leave', () => {
        const environment = createEnvironment('/dashboard');
        const scheduler = new ManualScheduler();
        const onEnter = vi.fn();
        const onLeave = vi.fn();
        const onReconcile = vi.fn();
        const adapter = createAdapter(environment, {
            onEnter,
            onLeave,
            onReconcile,
            scheduler,
        });

        adapter.start();
        expect(adapter.isReviewRoute).toBe(false);
        expect(FakeMutationObserver.instances).toHaveLength(0);
        expect(environment.history.pushState).not.toBe(environment.originalPushState);
        expect(environment.history.replaceState).not.toBe(environment.originalReplaceState);

        environment.history.pushState({}, '', '/study-lists/reviews/session-1');
        expect(adapter.isReviewRoute).toBe(true);
        expect(onEnter).toHaveBeenCalledTimes(1);
        expect(onEnter).toHaveBeenCalledWith(
            expect.objectContaining({
                pathname: '/study-lists/reviews/session-1',
                source: 'pushState',
            }),
        );
        const activeObserver = FakeMutationObserver.instances[0];
        expect(activeObserver.observe).toHaveBeenCalledWith(document.body, {
            attributes: true,
            childList: true,
            subtree: true,
        });

        environment.history.replaceState({}, '', '/study-lists/reviews/session-2');
        scheduler.flushMicrotasks();
        expect(onReconcile).toHaveBeenCalledWith(
            expect.objectContaining({ reasons: ['navigation'], source: 'navigation' }),
        );

        environment.location.href = 'https://marumori.io/dashboard';
        environment.window.dispatchPopstate();
        expect(adapter.isReviewRoute).toBe(false);
        expect(activeObserver.disconnect).toHaveBeenCalledTimes(1);
        expect(onLeave).toHaveBeenCalledWith(
            expect.objectContaining({ pathname: '/dashboard', source: 'popstate' }),
        );

        activeObserver.emit([hostChildListRecord()]);
        scheduler.flushMicrotasks();
        expect(onReconcile).toHaveBeenCalledTimes(1);

        adapter.cleanup();
        expect(environment.history.pushState).toBe(environment.originalPushState);
        expect(environment.history.replaceState).toBe(environment.originalReplaceState);
    });

    it('coalesces host mutations and ignores changes wholly owned by the userscript', () => {
        const environment = createEnvironment('/study-lists/reviews');
        const scheduler = new ManualScheduler();
        const onReconcile = vi.fn();
        const adapter = createAdapter(environment, { onReconcile, scheduler });
        adapter.start();
        const observer = FakeMutationObserver.instances[0];

        const dataOwned = document.createElement('div');
        dataOwned.dataset.mmOwned = '';
        const idOwned = document.createElement('div');
        idOwned.id = 'mm-hud';
        const classOwned = document.createElement('div');
        classOwned.className = 'mm-particle';
        observer.emit([
            {
                addedNodes: [dataOwned],
                removedNodes: [idOwned, classOwned],
                target: document.body,
                type: 'childList',
            },
        ]);
        observer.emit([
            {
                addedNodes: [document.createTextNode('owned text')],
                removedNodes: [],
                target: dataOwned,
                type: 'childList',
            },
        ]);
        scheduler.flushMicrotasks();
        expect(onReconcile).not.toHaveBeenCalled();

        document.body.className = 'mm-arcade';
        observer.emit([hostChildListRecord(), hostChildListRecord()]);
        observer.emit([hostChildListRecord()]);
        expect(scheduler.microtasks).toHaveLength(1);
        scheduler.flushMicrotasks();
        expect(onReconcile).toHaveBeenCalledTimes(1);
        expect(onReconcile).toHaveBeenCalledWith(
            expect.objectContaining({ reasons: ['mutation'], root: document.body }),
        );

        adapter.requestReconcile('manual');
        observer.emit([hostChildListRecord()]);
        scheduler.flushMicrotasks();
        expect(onReconcile).toHaveBeenLastCalledWith(
            expect.objectContaining({ reasons: ['manual', 'mutation'] }),
        );
        adapter.cleanup();
    });

    it('reconnects to a replacement body on the watchdog pass', () => {
        const environment = createEnvironment('/study-lists/reviews');
        const scheduler = new ManualScheduler();
        const onReconcile = vi.fn();
        const adapter = createAdapter(environment, {
            onReconcile,
            scheduler,
            watchdogIntervalMs: 50,
        });
        adapter.start();
        const firstObserver = FakeMutationObserver.instances[0];
        const watchdogId = scheduler.timerIds[0];

        const replacementBody = document.createElement('body');
        document.body.replaceWith(replacementBody);
        scheduler.runTimer(watchdogId);
        scheduler.flushMicrotasks();

        expect(firstObserver.disconnect).toHaveBeenCalledTimes(1);
        expect(FakeMutationObserver.instances).toHaveLength(2);
        expect(FakeMutationObserver.instances[1].observe).toHaveBeenCalledWith(
            replacementBody,
            expect.any(Object),
        );
        expect(onReconcile).toHaveBeenCalledWith(
            expect.objectContaining({ reasons: ['observer-root'] }),
        );
        adapter.cleanup();
    });

    it('makes start, stop, and cleanup idempotent', () => {
        const environment = createEnvironment('/study-lists/reviews');
        const scheduler = new ManualScheduler();
        const onEnter = vi.fn();
        const onLeave = vi.fn();
        const adapter = createAdapter(environment, {
            onEnter,
            onLeave,
            scheduler,
        });

        expect(adapter.start()).toBe(true);
        const wrappedPushState = environment.history.pushState;
        expect(adapter.start()).toBe(false);
        expect(environment.history.pushState).toBe(wrappedPushState);
        expect(environment.window.addEventListener).toHaveBeenCalledTimes(1);
        expect(FakeMutationObserver.instances).toHaveLength(1);
        expect(scheduler.timerIds).toHaveLength(1);

        expect(adapter.stop()).toBe(true);
        expect(adapter.stop()).toBe(false);
        expect(adapter.cleanup()).toBe(false);
        expect(onLeave).toHaveBeenCalledTimes(1);
        expect(environment.window.removeEventListener).toHaveBeenCalledTimes(1);
        expect(environment.history.pushState).toBe(environment.originalPushState);

        expect(adapter.start()).toBe(true);
        expect(onEnter).toHaveBeenCalledTimes(2);
        expect(adapter.cleanup()).toBe(true);
        expect(onLeave).toHaveBeenCalledTimes(2);
    });

    it('ignores a stale watchdog generation and recovers after an unreadable URL', () => {
        const environment = createEnvironment('/dashboard');
        const scheduler = new ManualScheduler({ ignoreClear: true });
        const onEnter = vi.fn();
        environment.location.href = 'http://[';
        const adapter = createAdapter(environment, {
            onEnter,
            scheduler,
            watchdogIntervalMs: 50,
        });

        adapter.start();
        const staleWatchdogId = scheduler.timerIds[0];
        adapter.stop();
        environment.location.href = 'https://marumori.io/dashboard';
        adapter.start();
        const currentWatchdogId = scheduler.timerIds.find((id) => id !== staleWatchdogId);
        environment.location.href = 'https://marumori.io/study-lists/reviews/session-2';

        scheduler.runTimer(staleWatchdogId);
        expect(onEnter).not.toHaveBeenCalled();
        expect(FakeMutationObserver.instances).toHaveLength(0);

        scheduler.runTimer(currentWatchdogId);
        expect(onEnter).toHaveBeenCalledTimes(1);
        expect(onEnter).toHaveBeenCalledWith(expect.objectContaining({ source: 'watchdog' }));
        expect(FakeMutationObserver.instances).toHaveLength(1);
        adapter.cleanup();
    });
});
