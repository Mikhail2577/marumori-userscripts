export const DOM_RESOLUTION = Object.freeze({
    UNKNOWN: 'unknown',
    UNRESOLVED: 'unresolved',
    CORRECT: 'correct',
    INCORRECT: 'incorrect',
});

const DEFAULT_SELECTORS = Object.freeze({
    reviewRoot: "[data-review-session], [data-review-root], [data-testid='review-session'], #main",
    inputWrapper: '.input-wrapper',
    counter: '.top_middle',
    progress: "progress, [role='progressbar']",
});

const CONTROL_NAMES = Object.freeze({
    rewind: new Set(['undo', 'redo', 'rewind']),
    submit: new Set(['check', 'submit']),
    wrong: new Set(['wrong']),
    next: new Set(['next', 'continue']),
});

const CONTROL_ACTIONS = Object.freeze({
    rewind: new Set(['undo', 'redo', 'rewind']),
    submit: new Set(['check', 'submit', 'answer']),
    wrong: new Set(['wrong', 'incorrect']),
    next: new Set(['next', 'continue']),
});

const QUESTION_ID_ATTRIBUTES = Object.freeze([
    'data-question-id',
    'data-review-id',
    'data-item-id',
    'data-item-key',
]);

const SESSION_ID_ATTRIBUTES = Object.freeze(['data-review-session', 'data-session-id']);

function normalizeText(value) {
    return String(value ?? '')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
}

function isUserscriptOwned(element) {
    let current = element;
    while (current?.nodeType === 1) {
        if (current.hasAttribute('data-mm-owned')) return true;
        if (current.id?.startsWith('mm-')) return true;
        // The legacy presentation intentionally puts mm-* state classes on body.
        // Those classes do not make the host application's descendants ours.
        if (
            current.localName !== 'body' &&
            [...current.classList].some((className) => className.startsWith('mm-'))
        ) {
            return true;
        }
        if (current.localName === 'body') break;
        current = current.parentElement;
    }
    return false;
}

function defaultVisibilityCheck(element) {
    if (!element?.isConnected || element.hidden || element.closest('[hidden]')) {
        return false;
    }
    if (element.getAttribute('aria-hidden') === 'true') return false;
    const view = element.ownerDocument?.defaultView;
    const style = view?.getComputedStyle?.(element);
    if (style?.display === 'none' || style?.visibility === 'hidden') return false;
    return element.getClientRects().length > 0;
}

function queryIncludingRoot(root, selector) {
    const matches = [];
    if (root.matches?.(selector)) matches.push(root);
    matches.push(...root.querySelectorAll(selector));
    return matches;
}

function unique(items) {
    return items.length === 1 ? items[0] : null;
}

function parseCounterText(text) {
    const match = String(text ?? '').match(/^\s*(\d+)\s*\/\s*(\d+)\s*$/);
    if (!match) return null;
    const current = Number.parseInt(match[1], 10);
    const total = Number.parseInt(match[2], 10);
    if (!Number.isFinite(current) || !Number.isFinite(total) || total <= 0) {
        return null;
    }
    if (current < 0 || current > total) return null;
    return { current, total, ratio: current / total };
}

function getControlName(control) {
    return normalizeText(
        control.getAttribute('aria-label') ||
            control.getAttribute('title') ||
            control.value ||
            control.textContent,
    );
}

export function createMaruMoriDomAdapter({
    document,
    selectors = {},
    isVisible = defaultVisibilityCheck,
} = {}) {
    if (!document?.querySelectorAll) {
        throw new TypeError('A document is required by the MaruMori DOM adapter');
    }

    const resolvedSelectors = { ...DEFAULT_SELECTORS, ...selectors };
    const wrapperIds = new WeakMap();
    let nextWrapperId = 1;

    function visibleSiteElements(root, selector) {
        return queryIncludingRoot(root, selector).filter(
            (element) => !isUserscriptOwned(element) && isVisible(element),
        );
    }

    function resolveContext() {
        const wrappers = visibleSiteElements(
            document.documentElement,
            resolvedSelectors.inputWrapper,
        );
        const wrapper = unique(wrappers);
        if (!wrapper) return null;
        const root = wrapper.closest(resolvedSelectors.reviewRoot);
        if (!root || isUserscriptOwned(root) || !isVisible(root) || !root.contains(wrapper)) {
            return null;
        }
        const currentWrappers = visibleSiteElements(root, resolvedSelectors.inputWrapper);
        if (unique(currentWrappers) !== wrapper) return null;
        return { root, wrapper };
    }

    function getActiveReviewRoot() {
        return resolveContext()?.root ?? null;
    }

    function getInputWrapper() {
        return resolveContext()?.wrapper ?? null;
    }

    function getSessionIdentity() {
        const root = resolveContext()?.root;
        if (!root) return null;
        for (const attribute of SESSION_ID_ATTRIBUTES) {
            const value = root.getAttribute(attribute)?.trim();
            if (value) return `${attribute}:${value}`;
        }
        return null;
    }

    function isValidAnswerInput(input, wrapper) {
        if (
            !input?.isConnected ||
            !wrapper.contains(input) ||
            isUserscriptOwned(input) ||
            !isVisible(input) ||
            input.disabled ||
            input.readOnly ||
            input.getAttribute('aria-disabled') === 'true'
        ) {
            return false;
        }
        if (input.localName === 'textarea') return true;
        if (input.localName !== 'input') return false;
        return input.type === 'text' || input.type === 'search';
    }

    function getAnswerInput() {
        const context = resolveContext();
        if (!context) return null;
        const inputs = [...context.wrapper.querySelectorAll('input, textarea')].filter((input) =>
            isValidAnswerInput(input, context.wrapper),
        );
        return unique(inputs);
    }

    function getCounterElement() {
        const context = resolveContext();
        if (!context) return null;
        const counters = visibleSiteElements(context.root, resolvedSelectors.counter).filter(
            (counter) => parseCounterText(counter.textContent),
        );
        return unique(counters);
    }

    function getProgress() {
        const context = resolveContext();
        if (!context) return null;
        const counter = getCounterElement();
        const parsedCounter = counter ? parseCounterText(counter.textContent) : null;
        if (parsedCounter) return { ...parsedCounter, element: counter };

        const progress = unique(visibleSiteElements(context.root, resolvedSelectors.progress));
        if (!progress) return null;
        const current = Number(progress.value ?? progress.getAttribute('aria-valuenow'));
        const total = Number(progress.max ?? progress.getAttribute('aria-valuemax'));
        if (!Number.isFinite(current) || !Number.isFinite(total) || total <= 0) {
            return null;
        }
        return { current, total, ratio: current / total, element: progress };
    }

    function getResolvedState() {
        const wrapper = getInputWrapper();
        if (!wrapper) return DOM_RESOLUTION.UNKNOWN;
        const correct = wrapper.classList.contains('correct');
        const incorrect = wrapper.classList.contains('incorrect');
        if (correct && incorrect) return DOM_RESOLUTION.UNKNOWN;
        if (correct) return DOM_RESOLUTION.CORRECT;
        if (incorrect) return DOM_RESOLUTION.INCORRECT;
        return DOM_RESOLUTION.UNRESOLVED;
    }

    function getQuestionIdentity() {
        const context = resolveContext();
        if (!context) return null;
        let wrapperId = wrapperIds.get(context.wrapper);
        if (!wrapperId) {
            wrapperId = nextWrapperId;
            nextWrapperId += 1;
            wrapperIds.set(context.wrapper, wrapperId);
        }

        const attributedElements = [context.wrapper, context.root];
        for (const selector of QUESTION_ID_ATTRIBUTES.map((attribute) => `[${attribute}]`)) {
            attributedElements.push(...context.root.querySelectorAll(selector));
        }
        const siteIds = [];
        for (const element of attributedElements) {
            if (isUserscriptOwned(element) || !isVisible(element)) continue;
            for (const attribute of QUESTION_ID_ATTRIBUTES) {
                const value = element.getAttribute?.(attribute)?.trim();
                if (value) siteIds.push(`${attribute}:${value}`);
            }
        }
        const distinctSiteIds = [...new Set(siteIds)];
        const progress = getProgress();
        if (distinctSiteIds.length === 0 && !progress) return null;

        const sitePart = distinctSiteIds.sort().join('|') || 'no-site-id';
        const progressPart = progress ? `${progress.current}/${progress.total}` : 'no-progress';
        return `${sitePart}|progress:${progressPart}|wrapper:${wrapperId}`;
    }

    function controlCandidates(root) {
        return [
            ...root.querySelectorAll(
                "button, [role='button'], input[type='button'], input[type='submit']",
            ),
        ].filter(
            (control) =>
                !isUserscriptOwned(control) &&
                isVisible(control) &&
                !control.disabled &&
                control.getAttribute('aria-disabled') !== 'true',
        );
    }

    function getControl(kind) {
        const names = CONTROL_NAMES[kind];
        const actions = CONTROL_ACTIONS[kind];
        if (!names || !actions) return null;
        const context = resolveContext();
        if (!context) return null;
        const candidates = controlCandidates(context.root);
        const actionMatches = candidates.filter((control) =>
            actions.has(normalizeText(control.getAttribute('data-action'))),
        );
        if (actionMatches.length === 1) return actionMatches[0];
        if (actionMatches.length > 1) return null;
        return unique(candidates.filter((control) => names.has(getControlName(control))));
    }

    function getCapability(kind) {
        const element = getControl(kind);
        if (!element) return null;
        const root = getActiveReviewRoot();
        return Object.freeze({
            kind,
            element,
            invoke() {
                if (getActiveReviewRoot() !== root || getControl(kind) !== element) {
                    return false;
                }
                try {
                    element.click();
                    return true;
                } catch {
                    return false;
                }
            },
        });
    }

    function setAnswerValue(input, value) {
        if (getAnswerInput() !== input) return false;
        const view = input.ownerDocument.defaultView;
        const prototype =
            input.localName === 'textarea'
                ? view?.HTMLTextAreaElement?.prototype
                : view?.HTMLInputElement?.prototype;
        const setter = Object.getOwnPropertyDescriptor(prototype ?? {}, 'value')?.set;
        try {
            if (setter) setter.call(input, String(value));
            else input.value = String(value);
            input.dispatchEvent(new view.Event('input', { bubbles: true }));
            input.dispatchEvent(new view.Event('change', { bubbles: true }));
            return true;
        } catch {
            return false;
        }
    }

    function observeResolution(callback) {
        const wrapper = getInputWrapper();
        const MutationObserver = document.defaultView?.MutationObserver;
        if (!wrapper || !MutationObserver) return () => {};
        const observer = new MutationObserver(() => callback());
        observer.observe(wrapper, { attributes: true, attributeFilter: ['class'] });
        return () => observer.disconnect();
    }

    function observeCounter(callback) {
        const counter = getCounterElement();
        const MutationObserver = document.defaultView?.MutationObserver;
        if (!counter || !MutationObserver) return () => {};
        const observer = new MutationObserver(() => callback());
        observer.observe(counter, {
            childList: true,
            subtree: true,
            characterData: true,
        });
        return () => observer.disconnect();
    }

    return Object.freeze({
        getActiveReviewRoot,
        getSessionIdentity,
        getInputWrapper,
        getAnswerInput,
        getCounterElement,
        getProgress,
        getResolvedState,
        getQuestionIdentity,
        getControl,
        getCapability,
        getNativeRewindCapability: () => getCapability('rewind'),
        setAnswerValue,
        observeResolution,
        observeCounter,
        isUserscriptOwned,
    });
}
