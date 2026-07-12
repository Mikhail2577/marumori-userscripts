import { LOCKED_CHALLENGE_FONT_STORAGE_KEY } from '../storage/keys.js';
import {
    getChallengeFontFamily,
    getChallengeFontStylesheetUrl,
    isAllowedChallengeFont,
    isWebChallengeFont,
    pickChallengeFont,
} from './fonts.js';

const DEFAULT_TARGET_SELECTOR = '#main .main_form, #main > span';
const FONT_PROPERTY = 'font-family';

function readStorage(storage, key, fallback) {
    const getter = storage?.get ?? storage?.getValue;
    if (typeof getter !== 'function') return fallback;
    try {
        const value = getter.call(storage, key, fallback);
        return value === undefined ? fallback : value;
    } catch {
        return fallback;
    }
}

function writeStorage(storage, key, value) {
    const setter = storage?.set ?? storage?.setValue;
    if (typeof setter !== 'function') return false;
    try {
        setter.call(storage, key, value);
        return true;
    } catch {
        return false;
    }
}

function hasInlineProperty(style, property) {
    for (let index = 0; index < style.length; index += 1) {
        if (style.item(index) === property) return true;
    }
    return false;
}

function captureInlineFont(target) {
    return Object.freeze({
        present: hasInlineProperty(target.style, FONT_PROPERTY),
        value: target.style.getPropertyValue(FONT_PROPERTY),
        priority: target.style.getPropertyPriority(FONT_PROPERTY),
    });
}

function restoreInlineFont(target, snapshot) {
    if (snapshot.present) {
        target.style.setProperty(FONT_PROPERTY, snapshot.value, snapshot.priority);
    } else {
        target.style.removeProperty(FONT_PROPERTY);
    }
}

function defaultTargetResolver(document) {
    return document.querySelector(DEFAULT_TARGET_SELECTOR);
}

function toLiteMode(isLiteMode) {
    try {
        return typeof isLiteMode === 'function' ? Boolean(isLiteMode()) : Boolean(isLiteMode);
    } catch {
        return false;
    }
}

function createLinkId(document, fontName) {
    const baseId = `mm-font-${fontName.replace(/\s+/g, '-')}`;
    let candidate = baseId;
    let suffix = 0;
    while (document.getElementById(candidate)) {
        suffix += 1;
        candidate = `${baseId}-font-challenge-${suffix}`;
    }
    return candidate;
}

/**
 * Creates one session-safe Font Challenge owner.
 *
 * Storage may expose Map-like `get`/`set` methods or GM-adapter-style
 * `getValue`/`setValue` methods. Feedback receives `(target, message, details)`.
 */
export function createFontChallengeController({
    document,
    storage,
    feedback = () => {},
    random = Math.random,
    isLiteMode = () => false,
    getTarget = defaultTargetResolver,
    storageKey = LOCKED_CHALLENGE_FONT_STORAGE_KEY,
    maxWebFontLinks = 3,
} = {}) {
    if (!document?.createElement || !document?.querySelector) {
        throw new TypeError('A document is required by the Font Challenge controller');
    }
    if (typeof getTarget !== 'function') {
        throw new TypeError('Font Challenge getTarget must be a function');
    }

    const requestedLinkLimit = Number(maxWebFontLinks);
    const linkLimit = Number.isFinite(requestedLinkLimit)
        ? Math.min(4, Math.max(2, Math.floor(requestedLinkLimit)))
        : 3;
    const webFontLinks = new Map();
    let accessCounter = 0;
    let enabled = false;
    let active = null;

    function notify(target, message, details = {}) {
        try {
            feedback(target, message, Object.freeze({ ...details }));
        } catch {
            // Feedback is decorative; it must not break gameplay or restoration.
        }
    }

    function setLockedFont(fontName) {
        const normalized = isAllowedChallengeFont(fontName) ? fontName : null;
        writeStorage(storage, storageKey, normalized);
        return normalized;
    }

    function getLockedFont() {
        const stored = readStorage(storage, storageKey, null);
        if (stored === null || stored === undefined || stored === '') return null;
        if (isAllowedChallengeFont(stored)) return stored;
        setLockedFont(null);
        return null;
    }

    function selectRandomFont({ localOnly = toLiteMode(isLiteMode) } = {}) {
        return pickChallengeFont({ lite: localOnly, random });
    }

    function removeWebFontEntry(entry) {
        if (!entry || webFontLinks.get(entry.fontName) !== entry) return;
        entry.link.removeEventListener('load', entry.handleLoad);
        entry.link.removeEventListener('error', entry.handleError);
        entry.link.remove();
        webFontLinks.delete(entry.fontName);
    }

    function getProtectedWebFonts() {
        const protectedFonts = new Set();
        if (isWebChallengeFont(active?.fontName)) protectedFonts.add(active.fontName);
        const lockedFont = getLockedFont();
        if (isWebChallengeFont(lockedFont)) protectedFonts.add(lockedFont);
        return protectedFonts;
    }

    function pruneWebFontLinks() {
        if (webFontLinks.size <= linkLimit) return;
        const protectedFonts = getProtectedWebFonts();
        const removable = [...webFontLinks.values()]
            .filter((entry) => !protectedFonts.has(entry.fontName))
            .sort((left, right) => left.lastUsed - right.lastUsed);
        while (webFontLinks.size > linkLimit && removable.length > 0) {
            removeWebFontEntry(removable.shift());
        }
    }

    function clearWebFontLinks() {
        for (const entry of [...webFontLinks.values()]) removeWebFontEntry(entry);
    }

    function applyFontToActiveTarget() {
        if (!active || active.revealingOriginal) return false;
        const family = getChallengeFontFamily(active.fontName);
        if (!family) return false;
        active.target.style.setProperty(FONT_PROPERTY, family, 'important');
        return true;
    }

    function handleWebFontFailure(entry) {
        if (webFontLinks.get(entry.fontName) !== entry) return;
        removeWebFontEntry(entry);
        if (!enabled || !active || active.fontName !== entry.fontName) return;

        const failedFont = entry.fontName;
        const fallback = selectRandomFont({ localOnly: true });
        active.fontName = fallback;
        if (getLockedFont() === failedFont) setLockedFont(fallback);
        applyFontToActiveTarget();
        notify(active.target, 'FONT FALLBACK', { failedFont, fallback });
        pruneWebFontLinks();
    }

    function ensureWebFont(fontName) {
        if (!isWebChallengeFont(fontName)) return null;

        const cached = webFontLinks.get(fontName);
        if (cached) {
            cached.lastUsed = ++accessCounter;
            return cached;
        }

        const href = getChallengeFontStylesheetUrl(fontName);
        const link = document.createElement('link');
        const entry = {
            fontName,
            link,
            lastUsed: ++accessCounter,
            handleLoad: null,
            handleError: null,
        };
        entry.handleLoad = () => {
            if (webFontLinks.get(fontName) !== entry) return;
            link.dataset.mmFontState = 'loaded';
            entry.lastUsed = ++accessCounter;
            if (active?.fontName === fontName) applyFontToActiveTarget();
            pruneWebFontLinks();
        };
        entry.handleError = () => handleWebFontFailure(entry);

        link.id = createLinkId(document, fontName);
        link.rel = 'stylesheet';
        link.href = href;
        link.referrerPolicy = 'no-referrer';
        link.dataset.mmOwned = '';
        link.dataset.mmFontChallenge = fontName;
        link.dataset.mmFontState = 'loading';
        link.addEventListener('load', entry.handleLoad);
        link.addEventListener('error', entry.handleError);
        webFontLinks.set(fontName, entry);

        const mount = document.head ?? document.documentElement;
        if (!mount) {
            handleWebFontFailure(entry);
            return null;
        }
        try {
            mount.append(link);
        } catch {
            handleWebFontFailure(entry);
            return null;
        }
        pruneWebFontLinks();
        return entry;
    }

    function setActiveFont(fontName) {
        if (!active || !isAllowedChallengeFont(fontName)) return false;
        active.fontName = fontName;
        applyFontToActiveTarget();
        ensureWebFont(fontName);
        pruneWebFontLinks();
        return true;
    }

    function clearActiveTarget() {
        if (!active) return;
        const current = active;
        active = null;
        current.target.removeEventListener('mouseenter', current.handleEnter);
        current.target.removeEventListener('mouseleave', current.handleLeave);
        current.target.removeEventListener('click', current.handleClick);
        restoreInlineFont(current.target, current.inlineFont);
    }

    function activateTarget(target) {
        const lockedFont = getLockedFont();
        const initialFont =
            toLiteMode(isLiteMode) && isWebChallengeFont(lockedFont)
                ? selectRandomFont({ localOnly: true })
                : (lockedFont ?? selectRandomFont());

        const state = {
            target,
            text: target.textContent.trim(),
            inlineFont: captureInlineFont(target),
            fontName: initialFont,
            revealingOriginal: false,
            handleEnter: null,
            handleLeave: null,
            handleClick: null,
        };
        state.handleEnter = () => {
            if (active !== state) return;
            state.revealingOriginal = true;
            restoreInlineFont(target, state.inlineFont);
        };
        state.handleLeave = () => {
            if (active !== state) return;
            state.revealingOriginal = false;
            setActiveFont(state.fontName);
        };
        state.handleClick = (event) => {
            if (!enabled || active !== state) return;
            if (event.shiftKey) {
                const locked = getLockedFont();
                if (locked) {
                    setLockedFont(null);
                    notify(target, 'FONT UNLOCKED', { font: state.fontName });
                } else {
                    setLockedFont(state.fontName);
                    notify(target, 'FONT LOCKED', { font: state.fontName });
                }
                pruneWebFontLinks();
                return;
            }

            const fontName = selectRandomFont();
            setActiveFont(fontName);
            if (getLockedFont()) setLockedFont(fontName);
        };

        active = state;
        target.addEventListener('mouseenter', state.handleEnter);
        target.addEventListener('mouseleave', state.handleLeave);
        target.addEventListener('click', state.handleClick);
        setActiveFont(initialFont);
        return true;
    }

    function resolveTarget(explicitTarget) {
        let target = explicitTarget;
        if (target === undefined) {
            try {
                target = getTarget(document);
            } catch {
                target = null;
            }
        }
        return target?.style?.setProperty && target.isConnected ? target : null;
    }

    function reconcile(explicitTarget) {
        if (!enabled) return false;
        const target = resolveTarget(explicitTarget);
        if (!target) {
            clearActiveTarget();
            return false;
        }

        const text = target.textContent.trim();
        if (active?.target === target && active.text === text) return true;
        clearActiveTarget();
        return activateTarget(target);
    }

    function setEnabled(nextEnabled) {
        enabled = Boolean(nextEnabled);
        if (!enabled) {
            clearActiveTarget();
            clearWebFontLinks();
            return false;
        }
        return reconcile();
    }

    function cleanup() {
        enabled = false;
        clearActiveTarget();
        clearWebFontLinks();
    }

    return Object.freeze({
        setEnabled,
        enable: () => setEnabled(true),
        disable: () => setEnabled(false),
        reconcile,
        apply: reconcile,
        cleanup,
        getLockedFont,
        setLockedFont,
        get isEnabled() {
            return enabled;
        },
        get activeFont() {
            return active?.fontName ?? null;
        },
        get activeTarget() {
            return active?.target ?? null;
        },
        get webFontLinkCount() {
            return webFontLinks.size;
        },
    });
}
