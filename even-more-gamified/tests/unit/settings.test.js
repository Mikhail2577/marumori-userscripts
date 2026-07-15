import { describe, expect, it } from 'vitest';

import { createUserscriptStorage } from '../../src/adapters/userscript-storage.js';
import { DEFAULT_SETTINGS } from '../../src/config/defaults.js';
import { normalizeBackgroundTheme, normalizeSettings } from '../../src/storage/settings.js';

function createMemoryStorage(entries = []) {
    const values = new Map(entries);
    const storage = createUserscriptStorage({
        getValue: (key, fallback) => values.get(key) ?? fallback,
        setValue: (key, value) => values.set(key, value),
    });
    return { storage, values };
}

describe('normalizeSettings', () => {
    it('preserves the complete version-two default contract', () => {
        expect(DEFAULT_SETTINGS).toEqual({
            settingsVersion: 2,
            sfxEnabled: true,
            visualsEnabled: true,
            hudEnabled: true,
            shakeEnabled: true,
            floatEnabled: true,
            flashEnabled: true,
            failureFlashEnabled: true,
            crtEnabled: true,
            timerEnabled: true,
            timerSeconds: 15,
            timedXpBonusEnabled: true,
            timeoutFailureEnabled: false,
            fontChallengeEnabled: false,
            performanceProfile: 'balanced',
            musicEnabled: false,
            musicStyle: 'lofi',
            musicVolume: 0.16,
            backgroundTheme: 'default',
            pinnedBackgroundTheme: 'default',
            volume: 0.5,
            hudPosition: null,
            hudCollapsed: false,
        });
    });

    it('returns a fresh copy of every current default', () => {
        const settings = normalizeSettings();
        expect(settings).toEqual(DEFAULT_SETTINGS);
        expect(settings).not.toBe(DEFAULT_SETTINGS);
    });

    it('accepts only boolean values for boolean settings', () => {
        const settings = normalizeSettings({
            settingsVersion: 2,
            sfxEnabled: false,
            visualsEnabled: 0,
            hudEnabled: 'false',
            hudCollapsed: true,
        });
        expect(settings.sfxEnabled).toBe(false);
        expect(settings.visualsEnabled).toBe(true);
        expect(settings.hudEnabled).toBe(true);
        expect(settings.hudCollapsed).toBe(true);
    });

    it('applies the version-two failure flash migration', () => {
        expect(
            normalizeSettings({ settingsVersion: 1, failureFlashEnabled: false })
                .failureFlashEnabled,
        ).toBe(true);
        expect(
            normalizeSettings({ settingsVersion: 2, failureFlashEnabled: false })
                .failureFlashEnabled,
        ).toBe(false);
    });

    it('migrates legacy CRT, timeout, timer, and performance settings', () => {
        const settings = normalizeSettings({
            arcadeEnabled: false,
            autoFailTimeout: true,
            comboTimeout: 30_000,
            performanceMode: true,
        });
        expect(settings).toMatchObject({
            crtEnabled: false,
            timeoutFailureEnabled: true,
            timerSeconds: 30,
            performanceProfile: 'lite',
        });
    });

    it('prefers current settings over their legacy aliases', () => {
        const settings = normalizeSettings({
            settingsVersion: 2,
            crtEnabled: true,
            arcadeEnabled: false,
            timeoutFailureEnabled: false,
            autoFailTimeout: true,
            timerSeconds: 45,
            comboTimeout: 10_000,
            performanceProfile: 'max',
            performanceMode: true,
        });
        expect(settings).toMatchObject({
            crtEnabled: true,
            timeoutFailureEnabled: false,
            timerSeconds: 45,
            performanceProfile: 'max',
        });
    });

    it('normalizes malformed and bounded legacy timer values into 5–120 seconds', () => {
        expect(normalizeSettings({ comboTimeout: null }).timerSeconds).toBe(15);
        expect(normalizeSettings({}).timerSeconds).toBe(15);
        expect(normalizeSettings({ comboTimeout: '' }).timerSeconds).toBe(15);
        expect(normalizeSettings({ comboTimeout: 'not-a-number' }).timerSeconds).toBe(15);
        expect(normalizeSettings({ comboTimeout: Number.POSITIVE_INFINITY }).timerSeconds).toBe(15);
        expect(normalizeSettings({ comboTimeout: 0 }).timerSeconds).toBe(5);
        expect(normalizeSettings({ comboTimeout: -10_000 }).timerSeconds).toBe(5);
        expect(normalizeSettings({ comboTimeout: 1_000 }).timerSeconds).toBe(5);
        expect(normalizeSettings({ comboTimeout: 5_000 }).timerSeconds).toBe(5);
        expect(normalizeSettings({ comboTimeout: 15_000 }).timerSeconds).toBe(15);
        expect(normalizeSettings({ comboTimeout: 1_000_000 }).timerSeconds).toBe(120);
    });

    it('preserves and clamps valid current timer settings independently of legacy data', () => {
        expect(normalizeSettings({ timerSeconds: 2 }).timerSeconds).toBe(5);
        expect(normalizeSettings({ timerSeconds: 130 }).timerSeconds).toBe(120);
        expect(normalizeSettings({ timerSeconds: 10.6 }).timerSeconds).toBe(11);
        expect(normalizeSettings({ timerSeconds: '45', comboTimeout: null }).timerSeconds).toBe(45);
        expect(normalizeSettings({ timerSeconds: null, comboTimeout: 30_000 }).timerSeconds).toBe(
            30,
        );
    });

    it('clamps volume values and validates music choices', () => {
        expect(
            normalizeSettings({
                volume: 2,
                musicVolume: -1,
                musicStyle: 'retro',
            }),
        ).toMatchObject({ volume: 1, musicVolume: 0, musicStyle: 'retro' });
        expect(
            normalizeSettings({
                volume: 'not-a-number',
                musicVolume: Number.POSITIVE_INFINITY,
                musicStyle: 'unknown',
            }),
        ).toMatchObject({
            volume: DEFAULT_SETTINGS.volume,
            musicVolume: DEFAULT_SETTINGS.musicVolume,
            musicStyle: DEFAULT_SETTINGS.musicStyle,
        });
    });

    it('normalizes aliases and removed background themes', () => {
        expect(normalizeBackgroundTheme(' game_center ')).toBe('gamecenter');
        expect(normalizeBackgroundTheme('gameCenter')).toBe('gamecenter');
        expect(normalizeBackgroundTheme('aurora')).toBe('starfield');
        expect(normalizeBackgroundTheme('rain')).toBe('default');
        expect(normalizeBackgroundTheme('STARFIELD')).toBe('default');
    });

    it('makes an existing pinned theme authoritative', () => {
        expect(
            normalizeSettings({
                backgroundTheme: 'matrix',
                pinnedBackgroundTheme: 'shrine',
            }),
        ).toMatchObject({
            backgroundTheme: 'shrine',
            pinnedBackgroundTheme: 'shrine',
        });

        expect(normalizeSettings({ backgroundTheme: 'matrix' })).toMatchObject({
            backgroundTheme: 'matrix',
            pinnedBackgroundTheme: 'matrix',
        });
    });

    it('retains only finite HUD coordinates', () => {
        expect(normalizeSettings({ hudPosition: { x: '12', y: 34 } }).hudPosition).toEqual({
            x: 12,
            y: 34,
        });
        expect(normalizeSettings({ hudPosition: { x: 12, y: 'nope' } }).hudPosition).toBeNull();
    });

    it('falls back safely for malformed or non-object stored JSON', () => {
        const { storage, values } = createMemoryStorage([['settings', '{broken']]);
        expect(normalizeSettings(storage.getJson('settings', {}))).toEqual(DEFAULT_SETTINGS);

        values.set('settings', 'null');
        expect(normalizeSettings(storage.getJson('settings', {}))).toEqual(DEFAULT_SETTINGS);
    });

    it('stores a normalized, current-version payload through the userscript adapter', () => {
        const { storage, values } = createMemoryStorage();
        const settings = normalizeSettings({
            settingsVersion: 1,
            arcadeEnabled: false,
            unknownSetting: 'discard me',
        });
        expect(storage.setJson('settings', settings)).toBe(true);
        const stored = JSON.parse(values.get('settings'));
        expect(stored.settingsVersion).toBe(DEFAULT_SETTINGS.settingsVersion);
        expect(stored.crtEnabled).toBe(false);
        expect(stored).not.toHaveProperty('unknownSetting');
    });
});
