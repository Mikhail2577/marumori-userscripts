import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_SETTINGS } from '../../src/config/defaults.js';
import { createHudController } from '../../src/ui/hud-controller.js';

function pointerEvent(type, properties) {
    const event = new Event(type, { bubbles: true, cancelable: true });
    Object.defineProperties(
        event,
        Object.fromEntries(
            Object.entries(properties).map(([key, value]) => [key, { value, enumerable: true }]),
        ),
    );
    return event;
}

function createController(overrides = {}) {
    const settings = { ...DEFAULT_SETTINGS, ...overrides.settings };
    const saveSettings = vi.fn();
    const onRewind = vi.fn();
    const controller = createHudController({
        document,
        window,
        settings,
        saveSettings,
        onRewind,
        prefersReducedMotion: overrides.prefersReducedMotion || (() => true),
        isLiteMode: () => false,
    });
    const panel = document.createElement('div');
    panel.id = 'mm-settings';
    document.body.append(controller.element, controller.settingsLauncher, panel);
    Object.defineProperty(controller.element, 'getBoundingClientRect', {
        configurable: true,
        value: () => ({
            left: 20,
            top: 100,
            right: 240,
            bottom: 430,
            width: 220,
            height: 330,
        }),
    });
    controller.install(panel);
    return { controller, onRewind, panel, saveSettings, settings };
}

describe('HUD controller', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        document.body.replaceChildren();
        Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1024 });
        Object.defineProperty(window, 'innerHeight', { configurable: true, value: 768 });
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('owns collapse and settings presentation while preserving settings', () => {
        const { controller, panel, saveSettings, settings } = createController();

        controller.refs.settingsButton.click();
        expect(panel.classList.contains('open')).toBe(true);

        controller.refs.collapse.click();
        expect(settings.hudCollapsed).toBe(true);
        expect(controller.element.classList.contains('mm-panel-collapsed')).toBe(true);
        expect(panel.classList.contains('open')).toBe(false);
        expect(controller.refs.title.textContent).toBe('HUD');
        expect(controller.refs.collapse.getAttribute('aria-expanded')).toBe('false');
        expect(saveSettings).toHaveBeenCalledTimes(1);

        vi.runAllTimers();
        controller.cleanup();
    });

    it('keeps an accessible settings recovery path when persisted HUD state is disabled', () => {
        const { controller, panel, settings } = createController({
            settings: { hudEnabled: false },
        });

        expect(controller.element.hidden).toBe(true);
        expect(controller.element.classList.contains('hidden')).toBe(true);
        expect(controller.element.hasAttribute('inert')).toBe(true);
        expect(controller.element.getAttribute('aria-hidden')).toBe('true');
        expect(controller.settingsLauncher.hidden).toBe(false);
        expect(controller.settingsLauncher.parentElement).toBe(document.body);
        expect(controller.element.contains(controller.settingsLauncher)).toBe(false);
        expect(controller.settingsLauncher).toBeInstanceOf(HTMLButtonElement);
        expect(controller.settingsLauncher.type).toBe('button');
        expect(controller.settingsLauncher.getAttribute('aria-label')).toBe(
            'Open gamification settings',
        );

        controller.settingsLauncher.click();
        expect(panel.classList.contains('open')).toBe(true);

        settings.hudEnabled = true;
        controller.setVisible(true);
        expect(controller.element.hidden).toBe(false);
        expect(controller.element.hasAttribute('inert')).toBe(false);
        expect(controller.element.hasAttribute('aria-hidden')).toBe(false);
        expect(controller.settingsLauncher.hidden).toBe(true);
        controller.cleanup();
    });

    it('moves focus out of a HUD that becomes hidden', () => {
        const { controller } = createController();
        controller.refs.settingsButton.focus();
        expect(document.activeElement).toBe(controller.refs.settingsButton);

        controller.setVisible(false);

        expect(document.activeElement).toBe(controller.settingsLauncher);
        expect(controller.element.hidden).toBe(true);
        controller.cleanup();
    });

    it('removes recovery ownership on cleanup and remounts exactly one launcher', () => {
        const first = createController({ settings: { hudEnabled: false } });
        const staleLauncher = first.controller.settingsLauncher;
        first.controller.cleanup();

        expect(staleLauncher.isConnected).toBe(false);
        expect(document.querySelectorAll('#mm-settings-launcher')).toHaveLength(0);

        first.controller.element.remove();
        first.panel.remove();
        const second = createController({ settings: { hudEnabled: false } });
        expect(document.querySelectorAll('#mm-settings-launcher')).toHaveLength(1);
        second.controller.settingsLauncher.click();
        expect(second.panel.classList.contains('open')).toBe(true);
        second.controller.cleanup();
    });

    it('clamps a drag once per animation frame and persists on release', () => {
        const frames = [];
        vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
            frames.push(callback);
            return frames.length;
        });
        vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
        const { controller, saveSettings, settings } = createController();

        controller.element.dispatchEvent(
            pointerEvent('pointerdown', {
                button: 0,
                clientX: 30,
                clientY: 110,
                pointerId: 7,
            }),
        );
        controller.element.dispatchEvent(
            pointerEvent('pointermove', {
                clientX: 10_000,
                clientY: 10_000,
                pointerId: 7,
            }),
        );

        expect(frames).toHaveLength(1);
        frames.shift()(16);
        expect(settings.hudPosition).toEqual({ x: 784, y: 418 });
        expect(controller.element.style.left).toBe('784px');
        expect(controller.element.style.top).toBe('418px');

        controller.element.dispatchEvent(pointerEvent('pointerup', { pointerId: 7 }));
        expect(saveSettings).toHaveBeenCalledTimes(1);
        expect(controller.element.classList.contains('dragging')).toBe(false);
        controller.cleanup();
    });

    it('renders stats and removes transient micro feedback during cleanup', () => {
        const { controller, settings } = createController({
            settings: { hudCollapsed: true },
            prefersReducedMotion: () => false,
        });
        const state = {
            score: 1234,
            answerStreak: 10,
            multiplier: 3,
            wordStreak: 4,
            sessionCorrect: 3,
            sessionIncorrect: 1,
        };

        controller.update({
            state,
            rollingRecords: { score: 9999, combo: 20, multiplier: 5 },
            bonusMultiplier: 1.25,
        });
        expect(controller.refs.score.textContent).toBe('1,234');
        expect(controller.refs.acc.textContent).toBe('75%');
        expect(controller.refs.record.textContent).toContain('9,999');
        expect(controller.element.classList.contains('glow')).toBe(true);

        controller.showMicro('+300', 'score');
        expect(document.querySelector('.mm-hud-micro')?.textContent).toBe('+300');
        controller.cleanup();
        expect(document.querySelector('.mm-hud-micro')).toBeNull();
        expect(settings.hudCollapsed).toBe(true);
    });
});
