import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_SETTINGS } from '../../src/config/defaults.js';
import { createSettingsPanelController } from '../../src/ui/settings-panel.js';

function createController(overrides = {}) {
    const settings = { ...DEFAULT_SETTINGS, ...overrides.settings };
    const callbacks = {
        saveSettings: vi.fn(),
        scheduleSettingsSave: vi.fn(),
        onSettingSideEffects: vi.fn(),
        onSfxVolumeChanged: vi.fn(),
        onPerformanceProfileChanged: vi.fn(),
        onTimerDurationChanged: vi.fn(),
        onMusicStyleChanged: vi.fn(),
        onMusicVolumeChanged: vi.fn(),
        onPreviewThemeEvent: vi.fn(),
        applyBackgroundTheme: vi.fn((theme) => {
            settings.backgroundTheme = theme;
        }),
        onBackgroundThemeChanged: vi.fn(),
        onResetHudPosition: vi.fn(),
        onResetRecords: vi.fn(),
    };
    const controller = createSettingsPanelController({
        document,
        settings,
        getMusicPreset: () => overrides.musicPreset || { id: 'arcadeLofi', scheduler: 'style' },
        getThemeIds: () => ['default', 'matrix'],
        getThemeId: (theme) => theme,
        getThemeLabel: (theme) => theme.toUpperCase(),
        normalizeTheme: (theme) => theme,
        ...callbacks,
    });
    document.body.appendChild(controller.element);
    controller.install();
    return { callbacks, controller, settings };
}

describe('settings panel controller', () => {
    beforeEach(() => {
        document.body.replaceChildren();
    });

    it('updates toggle state before persisting and applying its side effects', () => {
        const { callbacks, controller, settings } = createController();
        const toggle = controller.element.querySelector('[data-key="hudEnabled"]');

        toggle.click();

        expect(settings.hudEnabled).toBe(false);
        expect(toggle.classList.contains('on')).toBe(false);
        expect(toggle.getAttribute('aria-pressed')).toBe('false');
        expect(callbacks.saveSettings).toHaveBeenCalledTimes(1);
        expect(callbacks.onSettingSideEffects).toHaveBeenCalledWith('hudEnabled');
    });

    it('clamps slider input and cycles the finite presentation presets', () => {
        const { callbacks, controller, settings } = createController();
        const sfxSlider = controller.element.querySelector('#mm-vol-slider');
        const musicSlider = controller.element.querySelector('#mm-music-vol-slider');

        sfxSlider.value = '1';
        sfxSlider.dispatchEvent(new Event('input', { bubbles: true }));
        musicSlider.value = '0.5';
        musicSlider.dispatchEvent(new Event('input', { bubbles: true }));
        controller.element.querySelector('#mm-performance-profile').click();
        controller.element.querySelector('#mm-timer-seconds').click();
        controller.element.querySelector('#mm-music-style').click();

        expect(settings).toMatchObject({
            volume: 1,
            musicVolume: 0.5,
            performanceProfile: 'lite',
            timerSeconds: 30,
            musicStyle: 'retro',
        });
        expect(callbacks.onSfxVolumeChanged).toHaveBeenCalledWith(1);
        expect(callbacks.onMusicVolumeChanged).toHaveBeenCalledWith(0.5);
        expect(callbacks.onPerformanceProfileChanged).toHaveBeenCalledWith('lite');
        expect(callbacks.onTimerDurationChanged).toHaveBeenCalledWith(30);
        expect(callbacks.onMusicStyleChanged).toHaveBeenCalledWith('retro');
        expect(callbacks.scheduleSettingsSave).toHaveBeenCalledTimes(2);
    });

    it('associates stable unique labels with both range controls', () => {
        const { controller } = createController();
        const associations = [
            ['mm-vol-slider', 'SFX Volume'],
            ['mm-music-vol-slider', 'Music Volume'],
        ];

        for (const [id, labelText] of associations) {
            const input = controller.element.querySelector(`#${id}`);
            const label = controller.element.querySelector(`label[for="${id}"]`);
            expect(input).toBeInstanceOf(HTMLInputElement);
            expect(input.type).toBe('range');
            expect(label?.textContent).toBe(labelText);
            expect(label?.control).toBe(input);
            expect([...input.labels]).toContain(label);
            expect(controller.element.querySelectorAll(`#${id}`)).toHaveLength(1);
        }
    });

    it('remounts the stable range IDs without accumulating duplicates', () => {
        const first = createController();
        first.controller.cleanup();
        first.controller.element.remove();

        const second = createController();
        expect(document.querySelectorAll('#mm-vol-slider')).toHaveLength(1);
        expect(document.querySelectorAll('#mm-music-vol-slider')).toHaveLength(1);
        second.controller.cleanup();
    });

    it('keeps theme controls and preview callbacks explicitly wired', () => {
        const { callbacks, controller, settings } = createController();

        controller.element.querySelector('#mm-bg-theme').click();
        controller.element.querySelector('#mm-pin-bg').click();
        controller.element.querySelector('[data-preview-event="timeout"]').click();

        expect(callbacks.applyBackgroundTheme).toHaveBeenCalledWith('matrix');
        expect(callbacks.onBackgroundThemeChanged).toHaveBeenCalledWith('matrix');
        expect(settings.backgroundTheme).toBe('matrix');
        expect(settings.pinnedBackgroundTheme).toBe('matrix');
        expect(controller.element.querySelector('#mm-bg-theme').textContent).toContain('MATRIX');
        expect(callbacks.onPreviewThemeEvent).toHaveBeenCalledWith('timeout');
    });

    it('disables style cycling for theme-owned music modes', () => {
        const { callbacks, controller, settings } = createController({
            musicPreset: { id: 'matrixPulse', scheduler: 'pulse' },
        });
        const button = controller.element.querySelector('#mm-music-style');

        expect(button.disabled).toBe(true);
        button.click();
        expect(settings.musicStyle).toBe('lofi');
        expect(callbacks.onMusicStyleChanged).not.toHaveBeenCalled();
    });
});
