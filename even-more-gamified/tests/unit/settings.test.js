import { describe, expect, it } from 'vitest';

import { DEFAULT_SETTINGS } from '../../src/config/defaults.js';
import {
    deserializeSettings,
    normalizeBackgroundTheme,
    normalizeSettings,
    serializeSettings,
} from '../../src/storage/settings.js';

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

    it('preserves the legacy timer fallback semantics', () => {
        expect(normalizeSettings({ comboTimeout: 1_000 }).timerSeconds).toBe(1);
        expect(normalizeSettings({ comboTimeout: null }).timerSeconds).toBe(0);
        expect(normalizeSettings({ timerSeconds: 2 }).timerSeconds).toBe(5);
        expect(normalizeSettings({ timerSeconds: 130 }).timerSeconds).toBe(120);
        expect(normalizeSettings({ timerSeconds: 10.6 }).timerSeconds).toBe(11);
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
        expect(deserializeSettings('{broken')).toEqual(DEFAULT_SETTINGS);
        expect(deserializeSettings('null')).toEqual(DEFAULT_SETTINGS);
    });

    it('serializes a normalized, current-version payload', () => {
        const settings = normalizeSettings({
            settingsVersion: 1,
            arcadeEnabled: false,
            unknownSetting: 'discard me',
        });
        const stored = JSON.parse(serializeSettings(settings));
        expect(stored.settingsVersion).toBe(DEFAULT_SETTINGS.settingsVersion);
        expect(stored.crtEnabled).toBe(false);
        expect(stored).not.toHaveProperty('unknownSetting');
    });
});
