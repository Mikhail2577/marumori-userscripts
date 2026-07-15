import { MUSIC_STYLES, PERFORMANCE_PROFILES } from '../config/constants.js';
import { BOOLEAN_SETTING_KEYS, DEFAULT_SETTINGS } from '../config/defaults.js';
import { normalizeBackgroundTheme } from '../config/theme-identifiers.js';
import { clamp } from '../utils/clamp.js';

export { normalizeBackgroundTheme };

function readFiniteSettingNumber(value) {
    if (value === null || value === undefined) return null;
    if (typeof value === 'string' && value.trim() === '') return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Legacy comboTimeout values are milliseconds. Invalid or absent legacy values
 * use the current default; finite legacy values are clamped to the supported
 * five-to-120-second range so old low/zero values can never disable startup.
 */
function normalizeLegacyTimerSeconds(value) {
    const milliseconds = readFiniteSettingNumber(value);
    if (milliseconds === null) return DEFAULT_SETTINGS.timerSeconds;
    return clamp(milliseconds / 1000, 5, 120, DEFAULT_SETTINGS.timerSeconds);
}

export function normalizeSettings(raw = {}) {
    const source = raw && typeof raw === 'object' ? raw : {};
    const next = { ...DEFAULT_SETTINGS };
    const settingsVersion = Math.max(0, Math.floor(Number(source.settingsVersion) || 0));

    for (const key of BOOLEAN_SETTING_KEYS) {
        if (typeof source[key] === 'boolean') next[key] = source[key];
    }

    if (settingsVersion < 2) next.failureFlashEnabled = true;
    next.settingsVersion = DEFAULT_SETTINGS.settingsVersion;

    if (typeof source.crtEnabled !== 'boolean' && typeof source.arcadeEnabled === 'boolean') {
        next.crtEnabled = source.arcadeEnabled;
    }
    if (
        typeof source.timeoutFailureEnabled !== 'boolean' &&
        typeof source.autoFailTimeout === 'boolean'
    ) {
        next.timeoutFailureEnabled = source.autoFailTimeout;
    }

    next.volume = clamp(source.volume, 0, 1, DEFAULT_SETTINGS.volume);
    next.musicVolume = clamp(source.musicVolume, 0, 0.5, DEFAULT_SETTINGS.musicVolume);

    const timerFallback = normalizeLegacyTimerSeconds(source.comboTimeout);
    const currentTimerSeconds = readFiniteSettingNumber(source.timerSeconds);
    next.timerSeconds = Math.round(
        currentTimerSeconds === null
            ? timerFallback
            : clamp(currentTimerSeconds, 5, 120, timerFallback),
    );

    if (MUSIC_STYLES.includes(source.musicStyle)) {
        next.musicStyle = source.musicStyle;
    }
    if (PERFORMANCE_PROFILES.includes(source.performanceProfile)) {
        next.performanceProfile = source.performanceProfile;
    } else if (source.performanceMode === true) {
        next.performanceProfile = 'lite';
    }

    const hasPinnedBackgroundTheme = typeof source.pinnedBackgroundTheme === 'string';
    next.backgroundTheme = normalizeBackgroundTheme(source.backgroundTheme);
    next.pinnedBackgroundTheme = normalizeBackgroundTheme(
        source.pinnedBackgroundTheme,
        next.backgroundTheme,
    );
    if (hasPinnedBackgroundTheme) {
        next.backgroundTheme = next.pinnedBackgroundTheme;
    }

    if (source.hudPosition && typeof source.hudPosition === 'object') {
        const x = Number(source.hudPosition.x);
        const y = Number(source.hudPosition.y);
        if (Number.isFinite(x) && Number.isFinite(y)) {
            next.hudPosition = { x, y };
        }
    }

    return next;
}
