import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { normalizeBackgroundTheme } from '../../src/config/theme-identifiers.js';
import {
    createThemeManager,
    mergeThemeObjects,
    normalizeThemeId,
    validateThemeRegistry,
} from '../../src/config/theme-manager.js';

function makeThemeManager(settings = { backgroundTheme: 'default' }, overrides = {}) {
    return createThemeManager({
        document,
        getSettings: () => settings,
        isLiteMode: () => false,
        isMaxMode: () => false,
        ...overrides,
    });
}

describe('theme manager', () => {
    beforeEach(() => {
        document.documentElement.removeAttribute('style');
        delete document.body.dataset.mmTheme;
        delete document.body.dataset.mmBg;
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('deeply merges theme preset groups over the base without mutating either input', () => {
        const base = {
            presets: { sound: 'arcade', music: 'arcadeLofi' },
            colors: { accent: '#f90', secondary: '#7cf' },
            background: { renderer: 'default', flags: ['idle'] },
        };
        const override = {
            presets: { music: 'voidDrone' },
            colors: { accent: '#fff' },
            background: { flags: ['silent'] },
        };

        expect(mergeThemeObjects(base, override)).toEqual({
            presets: { sound: 'arcade', music: 'voidDrone' },
            colors: { accent: '#fff', secondary: '#7cf' },
            background: { renderer: 'default', flags: ['silent'] },
        });
        expect(base.presets.music).toBe('arcadeLofi');
        expect(override.colors).toEqual({ accent: '#fff' });
    });

    it('normalizes aliases, removed themes, and invalid fallbacks', () => {
        expect(normalizeThemeId).toBe(normalizeBackgroundTheme);
        expect(normalizeThemeId(' gameCenter ')).toBe('gamecenter');
        expect(normalizeThemeId('GAME_CENTER')).toBe('gamecenter');
        expect(normalizeThemeId('aurora')).toBe('starfield');
        expect(normalizeThemeId('unknown', 'matrix')).toBe('matrix');
        expect(normalizeThemeId('unknown', 'also-unknown')).toBe('default');
    });

    it('does not rewrite CSS variables when the resolved theme is unchanged', () => {
        const manager = makeThemeManager();
        const setProperty = vi.spyOn(document.documentElement.style, 'setProperty');

        manager.applyCssVariables('starfield');
        const initialWriteCount = setProperty.mock.calls.length;
        manager.applyCssVariables('starfield');

        expect(initialWriteCount).toBeGreaterThan(0);
        expect(setProperty).toHaveBeenCalledTimes(initialWriteCount);
    });

    it('persists normalized themes, updates body datasets, and clears its presentation', () => {
        const settings = { backgroundTheme: 'default' };
        const saveSettings = vi.fn();
        const manager = makeThemeManager(settings, { saveSettings });

        manager.applyTheme('aurora', { persist: true, save: true });

        expect(settings.backgroundTheme).toBe('starfield');
        expect(document.body.dataset.mmTheme).toBe('starfield');
        expect(document.body.dataset.mmBg).toBe('starfield');
        expect(saveSettings).toHaveBeenCalledOnce();

        manager.clearPresentation();

        expect(document.body.dataset.mmTheme).toBeUndefined();
        expect(document.body.dataset.mmBg).toBeUndefined();
        expect(document.documentElement.style.getPropertyValue('--mm-theme-accent')).toBe('');
    });
});

describe('theme registry validation', () => {
    it('accepts the production registry without diagnostics', () => {
        const warn = vi.fn();

        expect(validateThemeRegistry({ warn })).toEqual([]);
        expect(warn).not.toHaveBeenCalled();
    });

    it('returns precise issues and emits the existing grouped warning', () => {
        const warn = vi.fn();
        const issues = validateThemeRegistry({
            themeDefinitions: {
                broken: {
                    presets: { sound: 'missing' },
                    colors: {},
                    intensity: {
                        particles: 'not-a-number',
                        flash: 1,
                        shake: 1,
                        sound: 1,
                        celebration: 1,
                    },
                    motion: { shakeScale: 1, effectIntensity: 1, allowIdle: 'yes' },
                },
            },
            presetRegistry: { sound: { known: {} } },
            cssThemeVariables: { accent: '--accent' },
            celebrationPresets: { empty: { effects: [], answerAccent: '' } },
            musicPresets: { strange: { scheduler: 'unknown' } },
            warn,
        });

        expect(issues).toEqual([
            'broken.presets.sound -> missing is unknown',
            'broken.colors.accent is missing',
            'broken.intensity.particles must be numeric',
            'broken.motion.allowIdle must be boolean',
            'celebration.empty.effects must contain at least one effect',
            'celebration.empty.answerAccent is missing',
            'music.strange.scheduler -> unknown is unknown',
        ]);
        expect(warn).toHaveBeenCalledWith('[MMGamify] Theme registry check found issues:', issues);
    });
});
