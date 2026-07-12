// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createFontChallengeController } from '../../src/font-challenge/controller.js';
import {
    FONT_CHALLENGE_FONTS,
    FONT_CHALLENGE_LOCAL_FONTS,
    FONT_CHALLENGE_WEB_FONTS,
} from '../../src/font-challenge/fonts.js';
import { LOCKED_CHALLENGE_FONT_STORAGE_KEY } from '../../src/storage/keys.js';

function mountTarget() {
    document.body.innerHTML = '<main id="main"><form class="main_form">日本語</form></main>';
    return document.querySelector('.main_form');
}

function createMemoryStorage(initialValue = null) {
    const values = new Map();
    if (initialValue !== undefined) {
        values.set(LOCKED_CHALLENGE_FONT_STORAGE_KEY, initialValue);
    }
    return {
        values,
        get: vi.fn((key, fallback) => (values.has(key) ? values.get(key) : fallback)),
        set: vi.fn((key, value) => values.set(key, value)),
    };
}

function randomFor(fontName, fonts = FONT_CHALLENGE_FONTS) {
    const index = fonts.indexOf(fontName);
    if (index < 0) throw new Error(`Unknown test font: ${fontName}`);
    return (index + 0.25) / fonts.length;
}

function challengeLinks() {
    return [...document.querySelectorAll('link[data-mm-font-challenge]')];
}

describe('Font Challenge', () => {
    beforeEach(() => {
        document.head
            .querySelectorAll('link[data-mm-font-challenge]')
            .forEach((link) => link.remove());
        document.body.innerHTML = '';
    });

    it('restores the exact previous inline value and priority', () => {
        const target = mountTarget();
        target.style.setProperty('font-family', '"Site Serif", serif', 'important');
        const controller = createFontChallengeController({
            document,
            storage: createMemoryStorage(),
            random: () => 0,
        });

        controller.enable();
        expect(target.style.getPropertyValue('font-family')).toBe('"MS Gothic", sans-serif');
        expect(target.style.getPropertyPriority('font-family')).toBe('important');

        target.dispatchEvent(new MouseEvent('mouseenter'));
        expect(target.style.getPropertyValue('font-family')).toBe('"Site Serif", serif');
        expect(target.style.getPropertyPriority('font-family')).toBe('important');

        target.dispatchEvent(new MouseEvent('mouseleave'));
        controller.disable();
        expect(target.style.getPropertyValue('font-family')).toBe('"Site Serif", serif');
        expect(target.style.getPropertyPriority('font-family')).toBe('important');
    });

    it('restores an absent inline font-family as absent', () => {
        const target = mountTarget();
        target.style.color = 'red';
        const controller = createFontChallengeController({
            document,
            storage: createMemoryStorage(),
            random: () => 0,
        });

        controller.enable();
        controller.cleanup();

        expect(target.style.getPropertyValue('font-family')).toBe('');
        expect([...target.style].includes('font-family')).toBe(false);
        expect(target.style.color).toBe('red');
    });

    it('rejects and clears a stored font outside the allowlist', () => {
        const target = mountTarget();
        const storage = createMemoryStorage('Comic Sans MS');
        const controller = createFontChallengeController({
            document,
            storage,
            random: () => 0,
        });

        controller.enable();

        expect(controller.activeFont).toBe('MS Gothic');
        expect(target.style.fontFamily).toBe('"MS Gothic", sans-serif');
        expect(storage.values.get(LOCKED_CHALLENGE_FONT_STORAGE_KEY)).toBeNull();
        expect(storage.set).toHaveBeenCalledWith(LOCKED_CHALLENGE_FONT_STORAGE_KEY, null);
    });

    it('uses local fonts in lite mode without discarding a valid stored web-font lock', () => {
        mountTarget();
        const lockedFont = FONT_CHALLENGE_WEB_FONTS[0];
        const storage = createMemoryStorage(lockedFont);
        const controller = createFontChallengeController({
            document,
            storage,
            random: () => 0.999,
            isLiteMode: () => true,
        });

        controller.enable();

        expect(FONT_CHALLENGE_LOCAL_FONTS).toContain(controller.activeFont);
        expect(storage.values.get(LOCKED_CHALLENGE_FONT_STORAGE_KEY)).toBe(lockedFont);
        expect(challengeLinks()).toHaveLength(0);
    });

    it('preserves click randomization and Shift-click lock behavior', () => {
        const target = mountTarget();
        const storage = createMemoryStorage();
        const feedback = vi.fn();
        const random = vi
            .fn()
            .mockReturnValueOnce(randomFor('MS Gothic'))
            .mockReturnValueOnce(randomFor('Meiryo'));
        const controller = createFontChallengeController({
            document,
            storage,
            feedback,
            random,
        });
        controller.enable();

        target.dispatchEvent(new MouseEvent('click', { bubbles: true, shiftKey: true }));
        expect(storage.values.get(LOCKED_CHALLENGE_FONT_STORAGE_KEY)).toBe('MS Gothic');
        expect(feedback).toHaveBeenLastCalledWith(
            target,
            'FONT LOCKED',
            expect.objectContaining({ font: 'MS Gothic' }),
        );

        target.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        expect(controller.activeFont).toBe('Meiryo');
        expect(storage.values.get(LOCKED_CHALLENGE_FONT_STORAGE_KEY)).toBe('Meiryo');

        target.dispatchEvent(new MouseEvent('click', { bubbles: true, shiftKey: true }));
        expect(storage.values.get(LOCKED_CHALLENGE_FONT_STORAGE_KEY)).toBeNull();
        expect(feedback).toHaveBeenLastCalledWith(
            target,
            'FONT UNLOCKED',
            expect.objectContaining({ font: 'Meiryo' }),
        );
    });

    it('marks remote links private, handles load, and falls back after an error', () => {
        const target = mountTarget();
        const remoteFont = FONT_CHALLENGE_WEB_FONTS[0];
        const storage = createMemoryStorage(remoteFont);
        const feedback = vi.fn();
        const controller = createFontChallengeController({
            document,
            storage,
            feedback,
            random: () => 0,
        });
        controller.enable();

        const link = challengeLinks()[0];
        expect(link).toBeTruthy();
        expect(link.referrerPolicy).toBe('no-referrer');
        expect(link.dataset.mmOwned).toBe('');
        expect(link.dataset.mmFontState).toBe('loading');
        expect(link.href).toContain('fonts.googleapis.com/css2?family=Noto%20Sans%20JP');

        link.dispatchEvent(new Event('load'));
        expect(controller.activeFont).toBe(remoteFont);
        expect(link.dataset.mmFontState).toBe('loaded');

        link.dispatchEvent(new Event('error'));
        expect(controller.activeFont).toBe('MS Gothic');
        expect(target.style.fontFamily).toBe('"MS Gothic", sans-serif');
        expect(storage.values.get(LOCKED_CHALLENGE_FONT_STORAGE_KEY)).toBe('MS Gothic');
        expect(challengeLinks()).toHaveLength(0);
        expect(feedback).toHaveBeenCalledWith(
            target,
            'FONT FALLBACK',
            expect.objectContaining({ failedFont: remoteFont, fallback: 'MS Gothic' }),
        );
    });

    it('does not let a stale web-font error replace the current challenge font', () => {
        const target = mountTarget();
        const firstFont = FONT_CHALLENGE_WEB_FONTS[0];
        const secondFont = FONT_CHALLENGE_WEB_FONTS[1];
        const random = vi
            .fn()
            .mockReturnValueOnce(randomFor(firstFont))
            .mockReturnValueOnce(randomFor(secondFont));
        const controller = createFontChallengeController({
            document,
            storage: createMemoryStorage(),
            random,
        });
        controller.enable();
        const staleLink = challengeLinks().find(
            (link) => link.dataset.mmFontChallenge === firstFont,
        );

        target.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        expect(controller.activeFont).toBe(secondFont);
        staleLink.dispatchEvent(new Event('error'));

        expect(controller.activeFont).toBe(secondFont);
        expect(target.style.fontFamily).toBe(`"${secondFont}", sans-serif`);
    });

    it('bounds its web-font cache and removes every owned link on disable', () => {
        const target = mountTarget();
        const remoteFonts = FONT_CHALLENGE_WEB_FONTS.slice(0, 6);
        const random = vi.fn();
        for (const fontName of remoteFonts) random.mockReturnValueOnce(randomFor(fontName));
        const controller = createFontChallengeController({
            document,
            storage: createMemoryStorage(),
            random,
            maxWebFontLinks: 3,
        });
        controller.enable();

        for (let index = 1; index < remoteFonts.length; index += 1) {
            target.dispatchEvent(new MouseEvent('click', { bubbles: true }));
            expect(challengeLinks().length).toBeLessThanOrEqual(3);
            expect(controller.webFontLinkCount).toBeLessThanOrEqual(3);
        }
        expect(controller.activeFont).toBe(remoteFonts.at(-1));
        expect(
            challengeLinks().some((link) => link.dataset.mmFontChallenge === remoteFonts.at(-1)),
        ).toBe(true);

        controller.disable();
        expect(challengeLinks()).toHaveLength(0);
        expect(controller.webFontLinkCount).toBe(0);
        expect(target.style.getPropertyValue('font-family')).toBe('');
    });

    it('restores a disconnected target and drops stale listeners during cleanup', () => {
        const target = mountTarget();
        target.style.setProperty('font-family', 'monospace');
        const random = vi.fn(() => 0);
        const controller = createFontChallengeController({
            document,
            storage: createMemoryStorage(),
            random,
        });
        controller.enable();
        target.remove();

        controller.cleanup();
        target.dispatchEvent(new MouseEvent('click'));

        expect(target.style.getPropertyValue('font-family')).toBe('monospace');
        expect(target.style.getPropertyPriority('font-family')).toBe('');
        expect(random).toHaveBeenCalledTimes(1);
    });

    it('restores an old target before activating a replacement', () => {
        const oldTarget = mountTarget();
        oldTarget.style.setProperty('font-family', 'serif');
        const controller = createFontChallengeController({
            document,
            storage: createMemoryStorage(),
            random: () => 0,
        });
        controller.enable();

        const replacement = document.createElement('form');
        replacement.className = 'main_form';
        replacement.textContent = '次の問題';
        oldTarget.replaceWith(replacement);
        controller.reconcile();

        expect(oldTarget.style.getPropertyValue('font-family')).toBe('serif');
        expect(controller.activeTarget).toBe(replacement);
        expect(replacement.style.fontFamily).toBe('"MS Gothic", sans-serif');

        controller.cleanup();
        expect(replacement.style.getPropertyValue('font-family')).toBe('');
    });
});
