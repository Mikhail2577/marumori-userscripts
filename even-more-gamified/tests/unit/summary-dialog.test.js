import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createSummaryDialogController } from '../../src/ui/summary-dialog.js';

function mountController({ fallback = null } = {}) {
    const controller = createSummaryDialogController({
        document,
        getFallbackFocus: () => fallback,
    });
    document.body.appendChild(controller.element);
    return controller;
}

function content(grade = 'A') {
    return {
        grade,
        gradeColor: '#7cf',
        stats: [
            { label: 'SCORE', value: '1,200', tone: 'gold' },
            { label: 'CORRECT', value: 4, tone: 'cyan' },
        ],
    };
}

function dispatchTab({ shiftKey = false } = {}) {
    const event = new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        key: 'Tab',
        shiftKey,
    });
    document.activeElement.dispatchEvent(event);
    return event;
}

describe('summary dialog controller', () => {
    beforeEach(() => {
        document.body.replaceChildren();
    });

    it('owns stable modal semantics and renders text-only summary values', () => {
        const controller = mountController();

        expect(controller.element.hidden).toBe(true);
        expect(controller.element.getAttribute('role')).toBe('dialog');
        expect(controller.element.getAttribute('aria-modal')).toBe('true');
        expect(controller.element.getAttribute('aria-labelledby')).toBe('mm-summary-title');
        expect(controller.refs.title.id).toBe('mm-summary-title');
        expect(controller.refs.close.type).toBe('button');

        controller.open(content('<A>'));

        expect(controller.element.hidden).toBe(false);
        expect(controller.element.hasAttribute('aria-hidden')).toBe(false);
        expect(controller.refs.grade.textContent).toBe('<A>');
        expect(controller.refs.grade.innerHTML).toBe('&lt;A&gt;');
        expect(controller.refs.grid.querySelectorAll('.mm-summary-cell')).toHaveLength(2);
        expect(controller.refs.grid.textContent).toContain('1,200');
        controller.cleanup();
    });

    it('focuses Continue, traps both tab directions, and blocks programmatic escape', () => {
        const previous = document.createElement('button');
        const outside = document.createElement('button');
        document.body.append(previous, outside);
        const controller = mountController();
        previous.focus();

        controller.open(content());

        expect(document.activeElement).toBe(controller.refs.close);
        const forward = dispatchTab();
        expect(forward.defaultPrevented).toBe(true);
        expect(document.activeElement).toBe(controller.refs.close);
        const backward = dispatchTab({ shiftKey: true });
        expect(backward.defaultPrevented).toBe(true);
        expect(document.activeElement).toBe(controller.refs.close);

        outside.focus();
        expect(document.activeElement).toBe(controller.refs.close);

        controller.close();
        expect(document.activeElement).toBe(previous);
        controller.cleanup();
    });

    it('restores pre-existing inert and aria-hidden state exactly', () => {
        const host = document.createElement('main');
        const hiddenHud = document.createElement('aside');
        const launcher = document.createElement('button');
        hiddenHud.setAttribute('inert', 'phase-4');
        hiddenHud.setAttribute('aria-hidden', 'true');
        launcher.setAttribute('aria-hidden', 'false');
        document.body.append(host, hiddenHud, launcher);
        const controller = mountController();

        controller.open(content());

        for (const background of [host, hiddenHud, launcher]) {
            expect(background.hasAttribute('inert')).toBe(true);
            expect(background.getAttribute('aria-hidden')).toBe('true');
        }

        controller.close();

        expect(host.hasAttribute('inert')).toBe(false);
        expect(host.hasAttribute('aria-hidden')).toBe(false);
        expect(hiddenHud.getAttribute('inert')).toBe('phase-4');
        expect(hiddenHud.getAttribute('aria-hidden')).toBe('true');
        expect(launcher.hasAttribute('inert')).toBe(false);
        expect(launcher.getAttribute('aria-hidden')).toBe('false');
        controller.cleanup();
    });

    it('preserves an inert property state that is not represented by an attribute', () => {
        const host = document.createElement('main');
        Object.defineProperty(host, 'inert', {
            configurable: true,
            value: true,
            writable: true,
        });
        document.body.appendChild(host);
        const controller = mountController();

        controller.open(content());
        controller.close();

        expect(host.inert).toBe(true);
        expect(host.hasAttribute('inert')).toBe(false);
        controller.cleanup();
    });

    it('does not overwrite the original focus or background snapshot on repeated open', () => {
        const previous = document.createElement('button');
        const host = document.createElement('main');
        document.body.append(previous, host);
        const addListener = vi.spyOn(document, 'addEventListener');
        const removeListener = vi.spyOn(document, 'removeEventListener');
        const controller = mountController();
        previous.focus();

        controller.open(content('A'));
        controller.open(content('S'));
        expect(controller.refs.grade.textContent).toBe('S');
        controller.close();

        expect(host.hasAttribute('inert')).toBe(false);
        expect(document.activeElement).toBe(previous);
        expect(
            addListener.mock.calls.filter(([type]) => type === 'keydown' || type === 'focusin'),
        ).toHaveLength(2);
        expect(
            removeListener.mock.calls.filter(([type]) => type === 'keydown' || type === 'focusin'),
        ).toHaveLength(2);
        controller.cleanup();
    });

    it('starts each open/close cycle with a fresh background snapshot', () => {
        const host = document.createElement('main');
        document.body.appendChild(host);
        const controller = mountController();

        expect(controller.open(content('A'))).toBe(true);
        expect(controller.close()).toBe(true);
        expect(controller.close()).toBe(false);
        expect(host.hasAttribute('inert')).toBe(false);
        expect(host.hasAttribute('aria-hidden')).toBe(false);

        host.setAttribute('inert', 'phase-4');
        host.setAttribute('aria-hidden', 'false');
        expect(controller.open(content('S'))).toBe(true);
        expect(controller.close()).toBe(true);
        expect(host.getAttribute('inert')).toBe('phase-4');
        expect(host.getAttribute('aria-hidden')).toBe('false');

        controller.cleanup();
        expect(controller.open(content())).toBe(false);
    });

    it('uses a safe fallback when the prior focus target disconnects', () => {
        const previous = document.createElement('button');
        const fallback = document.createElement('button');
        document.body.append(previous, fallback);
        const controller = mountController({ fallback });
        previous.focus();
        controller.open(content());
        previous.remove();

        controller.close();

        expect(document.activeElement).toBe(fallback);
        controller.cleanup();
    });

    it('restores state and removes document listeners when cleaned up while open', () => {
        const previous = document.createElement('button');
        const host = document.createElement('main');
        document.body.append(previous, host);
        const controller = mountController();
        previous.focus();
        controller.open(content());

        controller.cleanup();

        expect(controller.element.isConnected).toBe(false);
        expect(host.hasAttribute('inert')).toBe(false);
        expect(host.hasAttribute('aria-hidden')).toBe(false);
        expect(document.activeElement).toBe(previous);

        host.setAttribute('tabindex', '-1');
        host.focus();
        expect(document.activeElement).toBe(host);
    });

    it('remounts with exactly one stable dialog and heading ID', () => {
        const first = mountController();
        expect(document.querySelectorAll('#mm-summary')).toHaveLength(1);
        expect(document.querySelectorAll('#mm-summary-title')).toHaveLength(1);
        first.cleanup();

        const second = mountController();
        expect(document.querySelectorAll('#mm-summary')).toHaveLength(1);
        expect(document.querySelectorAll('#mm-summary-title')).toHaveLength(1);
        second.cleanup();
    });
});
