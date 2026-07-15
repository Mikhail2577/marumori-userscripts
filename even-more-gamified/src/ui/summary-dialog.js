const FOCUSABLE_SELECTOR = [
    'a[href]',
    'area[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[contenteditable]:not([contenteditable="false"])',
    '[tabindex]:not([tabindex="-1"])',
].join(',');

const STAT_TONES = new Set(['gold', 'green', 'cyan', 'orange', 'pink']);

function createDialogElement(document) {
    const overlay = document.createElement('div');
    overlay.id = 'mm-summary';
    overlay.hidden = true;
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'mm-summary-title');
    overlay.setAttribute('aria-hidden', 'true');
    overlay.innerHTML = `
        <div id="mm-summary-inner">
            <h2 id="mm-summary-title">SESSION COMPLETE</h2>
            <div id="mm-grade"></div>
            <div class="mm-summary-grid"></div>
            <button id="mm-summary-close" type="button">CONTINUE</button>
        </div>
    `;
    return overlay;
}

function isElementUnavailable(element) {
    if (!element?.isConnected || typeof element.focus !== 'function') return true;
    if (element.disabled || element.getAttribute?.('aria-disabled') === 'true') return true;
    if (element.hidden || element.closest?.('[hidden], [inert], [aria-hidden="true"]')) return true;

    const style = element.ownerDocument?.defaultView?.getComputedStyle?.(element);
    return style?.display === 'none' || style?.visibility === 'hidden';
}

function focusWithoutScrolling(element) {
    if (isElementUnavailable(element)) return false;
    try {
        element.focus({ preventScroll: true });
    } catch {
        element.focus();
    }
    return element.ownerDocument?.activeElement === element;
}

function snapshotBackgroundElement(element) {
    return Object.freeze({
        element,
        hadAriaHidden: element.hasAttribute('aria-hidden'),
        ariaHidden: element.getAttribute('aria-hidden'),
        hadInert: element.hasAttribute('inert'),
        inertAttribute: element.getAttribute('inert'),
        hasInertProperty: 'inert' in element,
        inertProperty: 'inert' in element ? Boolean(element.inert) : false,
    });
}

function makeBackgroundInert(snapshot) {
    const { element } = snapshot;
    element.setAttribute('inert', '');
    if (snapshot.hasInertProperty) element.inert = true;
    element.setAttribute('aria-hidden', 'true');
}

function restoreBackgroundElement(snapshot) {
    const { element } = snapshot;
    if (!element?.isConnected) return;

    if (snapshot.hasInertProperty) element.inert = snapshot.inertProperty;
    if (snapshot.hadInert) element.setAttribute('inert', snapshot.inertAttribute ?? '');
    else element.removeAttribute('inert');

    if (snapshot.hadAriaHidden) {
        element.setAttribute('aria-hidden', snapshot.ariaHidden ?? '');
    } else {
        element.removeAttribute('aria-hidden');
    }
}

export function createSummaryDialogController({ document, getFallbackFocus = () => null } = {}) {
    if (!document?.body) throw new TypeError('Summary dialog requires a document body');
    if (typeof getFallbackFocus !== 'function') {
        throw new TypeError('Summary dialog fallback focus must be a function');
    }

    const element = createDialogElement(document);
    const refs = Object.freeze({
        inner: element.querySelector('#mm-summary-inner'),
        title: element.querySelector('#mm-summary-title'),
        grade: element.querySelector('#mm-grade'),
        grid: element.querySelector('.mm-summary-grid'),
        close: element.querySelector('#mm-summary-close'),
    });

    let backgroundSnapshot = [];
    let previousFocus = null;
    let open = false;
    let documentListenersInstalled = false;
    let cleanedUp = false;

    function getFocusableElements() {
        return [...element.querySelectorAll(FOCUSABLE_SELECTOR)].filter(
            (candidate) => !isElementUnavailable(candidate),
        );
    }

    function focusInitialControl() {
        const focusable = getFocusableElements();
        return focusWithoutScrolling(refs.close) || focusWithoutScrolling(focusable[0]);
    }

    function handleDocumentKeydown(event) {
        if (!open || event.key !== 'Tab') return;

        const focusable = getFocusableElements();
        if (focusable.length === 0) {
            event.preventDefault();
            refs.inner.setAttribute('tabindex', '-1');
            focusWithoutScrolling(refs.inner);
            return;
        }

        const first = focusable[0];
        const last = focusable.at(-1);
        const active = document.activeElement;
        if (focusable.length === 1 || !element.contains(active)) {
            event.preventDefault();
            focusWithoutScrolling(event.shiftKey ? last : first);
        } else if (event.shiftKey && active === first) {
            event.preventDefault();
            focusWithoutScrolling(last);
        } else if (!event.shiftKey && active === last) {
            event.preventDefault();
            focusWithoutScrolling(first);
        }
    }

    function handleDocumentFocusin(event) {
        if (!open || element.contains(event.target)) return;
        focusInitialControl();
    }

    function installDocumentListeners() {
        if (documentListenersInstalled) return;
        documentListenersInstalled = true;
        document.addEventListener('keydown', handleDocumentKeydown, true);
        document.addEventListener('focusin', handleDocumentFocusin, true);
    }

    function removeDocumentListeners() {
        if (!documentListenersInstalled) return;
        documentListenersInstalled = false;
        document.removeEventListener('keydown', handleDocumentKeydown, true);
        document.removeEventListener('focusin', handleDocumentFocusin, true);
    }

    function render({ grade = '', gradeColor = '', stats = [] } = {}) {
        refs.grade.textContent = String(grade);
        refs.grade.style.color = String(gradeColor);
        const cells = stats.map(({ label = '', value = '', tone = '' } = {}) => {
            const cell = document.createElement('div');
            cell.className = 'mm-summary-cell';
            cell.append(document.createTextNode(String(label)));

            const valueElement = document.createElement('span');
            valueElement.className = 'mm-summary-val';
            if (STAT_TONES.has(tone)) valueElement.classList.add(tone);
            valueElement.textContent = String(value);
            cell.appendChild(valueElement);
            return cell;
        });
        refs.grid.replaceChildren(...cells);
    }

    function captureAndDisableBackground() {
        backgroundSnapshot = [...document.body.children]
            .filter((candidate) => candidate !== element)
            .map(snapshotBackgroundElement);
        backgroundSnapshot.forEach(makeBackgroundInert);
    }

    function restoreBackground() {
        backgroundSnapshot.forEach(restoreBackgroundElement);
        backgroundSnapshot = [];
    }

    function restoreFocus() {
        const target = previousFocus;
        previousFocus = null;
        if (target && target !== document.body && focusWithoutScrolling(target)) return;
        focusWithoutScrolling(getFallbackFocus());
    }

    function close({ restoreFocus: shouldRestoreFocus = true } = {}) {
        if (!open) return false;
        open = false;
        removeDocumentListeners();
        element.classList.remove('open');
        element.hidden = true;
        element.setAttribute('aria-hidden', 'true');
        restoreBackground();
        if (shouldRestoreFocus) restoreFocus();
        else previousFocus = null;
        return true;
    }

    function show(content) {
        if (cleanedUp) return false;
        render(content);
        if (!open) {
            previousFocus = document.activeElement;
            open = true;
            installDocumentListeners();
        }
        element.hidden = false;
        element.removeAttribute('aria-hidden');
        element.classList.add('open');
        focusInitialControl();
        if (backgroundSnapshot.length === 0) captureAndDisableBackground();
        return true;
    }

    function cleanup() {
        if (cleanedUp) return;
        close();
        removeDocumentListeners();
        refs.close.removeEventListener('click', handleCloseClick);
        element.remove();
        cleanedUp = true;
    }

    function handleCloseClick() {
        close();
    }

    refs.close.addEventListener('click', handleCloseClick);

    return Object.freeze({
        element,
        refs,
        open: show,
        close,
        cleanup,
    });
}
