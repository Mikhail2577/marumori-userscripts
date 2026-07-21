import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createMaruMoriDomAdapter, DOM_RESOLUTION } from '../../src/adapters/marumori-dom.js';
import { isResolvedReviewBackspaceIntent } from '../../src/gameplay/rewind-keyboard-intent.js';
import { fixtureVisibility, mountReviewFixture } from '../fixtures/review-dom.js';

function setup(resolution = DOM_RESOLUTION.CORRECT) {
    const fixture = mountReviewFixture(document, { resolution });
    const dom = createMaruMoriDomAdapter({
        document,
        isVisible: fixtureVisibility,
    });
    return { dom, fixture };
}

function backspace(target, overrides = {}) {
    return {
        key: 'Backspace',
        defaultPrevented: false,
        preventDefault: vi.fn(),
        target,
        ...overrides,
    };
}

function matches({ dom, target, expectedResolution = DOM_RESOLUTION.CORRECT, event } = {}) {
    return isResolvedReviewBackspaceIntent({
        event: event ?? backspace(target),
        dom,
        expectedResolution,
    });
}

describe('resolved review Backspace intent', () => {
    beforeEach(() => {
        document.body.replaceChildren();
    });

    it('rejects Backspace in the unresolved answer input', () => {
        const { dom, fixture } = setup(DOM_RESOLUTION.UNRESOLVED);

        expect(matches({ dom, target: fixture.input })).toBe(false);
    });

    it('rejects userscript settings inputs, ranges, and controls', () => {
        const { dom } = setup();
        const settings = document.querySelector('#mm-settings');
        const text = document.createElement('input');
        text.type = 'text';
        settings.prepend(text);

        for (const target of [
            text,
            document.querySelector('#mm-range'),
            settings.querySelector('button'),
        ]) {
            expect(matches({ dom, target })).toBe(false);
        }
    });

    it('rejects a contenteditable review wrapper', () => {
        const { dom, fixture } = setup();
        fixture.wrapper.setAttribute('contenteditable', 'true');

        expect(matches({ dom, target: fixture.wrapper })).toBe(false);
    });

    it('rejects unrelated editable controls even inside the active review root', () => {
        const { dom, fixture } = setup();
        const unrelated = document.createElement('textarea');
        const textInput = document.createElement('input');
        const select = document.createElement('select');
        const textbox = document.createElement('div');
        const textboxChild = document.createElement('span');
        textbox.setAttribute('role', 'textbox');
        textbox.append(textboxChild);
        fixture.root.prepend(unrelated);
        fixture.root.prepend(textInput, select, textbox);

        for (const target of [unrelated, textInput, select, textbox, textboxChild]) {
            expect(matches({ dom, target })).toBe(false);
        }
    });

    it('accepts the active answer context and MaruMori page-level hotkey targets', () => {
        const { dom, fixture } = setup();

        expect(matches({ dom, target: fixture.wrapper })).toBe(true);
        expect(matches({ dom, target: fixture.input })).toBe(true);
        expect(matches({ dom, target: fixture.next })).toBe(true);
        expect(matches({ dom, target: fixture.root })).toBe(true);
        expect(matches({ dom, target: document.body })).toBe(true);
        expect(matches({ dom, target: document.documentElement })).toBe(true);

        const inputButton = document.createElement('input');
        inputButton.type = 'button';
        fixture.root.append(inputButton);
        expect(matches({ dom, target: inputButton })).toBe(true);
    });

    it('requires the processed resolution to match the current host resolution', () => {
        const { dom, fixture } = setup(DOM_RESOLUTION.INCORRECT);

        expect(matches({ dom, target: fixture.input })).toBe(false);
        expect(
            matches({
                dom,
                target: fixture.input,
                expectedResolution: DOM_RESOLUTION.INCORRECT,
            }),
        ).toBe(true);
    });

    it('leaves an accepted native Backspace event untouched', () => {
        const { dom, fixture } = setup();
        const event = backspace(fixture.input);

        expect(matches({ dom, event })).toBe(true);
        expect(event.defaultPrevented).toBe(false);
        expect(event.preventDefault).not.toHaveBeenCalled();
    });

    it('fails closed for prevented, unrelated-key, and incomplete events', () => {
        const { dom, fixture } = setup();

        expect(matches({ dom, event: backspace(fixture.input, { defaultPrevented: true }) })).toBe(
            false,
        );
        expect(matches({ dom, event: backspace(fixture.input, { key: 'Delete' }) })).toBe(false);
        expect(isResolvedReviewBackspaceIntent()).toBe(false);
    });
});
