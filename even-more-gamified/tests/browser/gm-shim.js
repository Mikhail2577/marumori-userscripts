(() => {
    'use strict';

    const STORAGE_PREFIX = '__mm_browser_contract__:';
    const parameters = new URLSearchParams(globalThis.location.search);
    const storageKey = (key) => `${STORAGE_PREFIX}${key}`;
    globalThis.__mmBrowserContractParameters = Object.freeze(
        Object.fromEntries(parameters.entries()),
    );

    if (parameters.get('reset') === '1') {
        for (let index = globalThis.localStorage.length - 1; index >= 0; index -= 1) {
            const key = globalThis.localStorage.key(index);
            if (key?.startsWith(STORAGE_PREFIX)) globalThis.localStorage.removeItem(key);
        }
    }

    function setValue(key, value) {
        globalThis.localStorage.setItem(storageKey(key), JSON.stringify(value));
    }

    if (parameters.get('mode') === 'quiet') {
        setValue(
            'mmSettings',
            JSON.stringify({
                fontChallengeEnabled: false,
                musicEnabled: false,
                sfxEnabled: false,
                timedXpBonusEnabled: false,
                timerEnabled: false,
                timeoutFailureEnabled: false,
                visualsEnabled: false,
            }),
        );
    }

    if (parameters.get('mode') === 'font') {
        setValue(
            'mmSettings',
            JSON.stringify({
                fontChallengeEnabled: true,
                musicEnabled: false,
                sfxEnabled: false,
                timedXpBonusEnabled: false,
                timerEnabled: false,
                timeoutFailureEnabled: false,
                visualsEnabled: false,
            }),
        );
        setValue('mmLockedChallengeFont', 'MS Gothic');
    }

    if (parameters.get('mode') === 'timeout') {
        const timerSeconds = Math.max(5, Number(parameters.get('timerSeconds')) || 5);
        setValue(
            'mmSettings',
            JSON.stringify({
                fontChallengeEnabled: false,
                musicEnabled: false,
                sfxEnabled: false,
                timedXpBonusEnabled: false,
                timerEnabled: true,
                timerSeconds,
                timeoutFailureEnabled: true,
                visualsEnabled: false,
            }),
        );
    }

    const transparentImage =
        'data:image/svg+xml;charset=utf-8,' +
        encodeURIComponent(
            '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect width="32" height="32" fill="#111827"/></svg>',
        );

    globalThis.GM_getValue = (key, fallback) => {
        const stored = globalThis.localStorage.getItem(storageKey(key));
        if (stored === null) return fallback;
        try {
            return JSON.parse(stored);
        } catch {
            return fallback;
        }
    };
    globalThis.GM_setValue = (key, value) => setValue(key, value);
    globalThis.GM_getResourceURL = () => transparentImage;

    globalThis.__mmBrowserContractErrors = [];
    globalThis.addEventListener('error', (event) => {
        globalThis.__mmBrowserContractErrors.push(
            event.error?.stack || event.message || 'Unknown window error',
        );
    });
    globalThis.addEventListener('unhandledrejection', (event) => {
        globalThis.__mmBrowserContractErrors.push(
            event.reason?.stack || String(event.reason || 'Unhandled rejection'),
        );
    });

    // Remove one-shot seeding parameters before the userscript wraps history.
    globalThis.history.replaceState({}, '', globalThis.location.pathname);
})();
