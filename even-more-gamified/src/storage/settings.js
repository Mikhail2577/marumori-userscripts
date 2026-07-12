import {
    BACKGROUND_THEME_IDS,
    MUSIC_STYLES,
    PERFORMANCE_PROFILES,
    REMOVED_BACKGROUND_THEME_FALLBACKS,
    THEME_ALIASES,
} from '../config/constants.js';
import { BOOLEAN_SETTING_KEYS, DEFAULT_SETTINGS } from '../config/defaults.js';
import { clamp } from '../utils/clamp.js';
import { safeJsonParse } from '../utils/json.js';

const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object, key);

export function normalizeBackgroundTheme(theme, fallback = DEFAULT_SETTINGS.backgroundTheme) {
    const raw = typeof theme === 'string' ? theme.trim() : '';
    const alias = THEME_ALIASES[raw] || THEME_ALIASES[raw.toLowerCase()];
    const candidate = alias || raw;

    if (BACKGROUND_THEME_IDS.includes(candidate)) return candidate;
    if (hasOwn(REMOVED_BACKGROUND_THEME_FALLBACKS, candidate)) {
        return REMOVED_BACKGROUND_THEME_FALLBACKS[candidate];
    }
    return BACKGROUND_THEME_IDS.includes(fallback) ? fallback : DEFAULT_SETTINGS.backgroundTheme;
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

    const legacyTimerSeconds = Number(source.comboTimeout) / 1000;
    const timerFallback = Number.isFinite(legacyTimerSeconds)
        ? legacyTimerSeconds
        : DEFAULT_SETTINGS.timerSeconds;
    next.timerSeconds = Math.round(clamp(source.timerSeconds, 5, 120, timerFallback));

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

export function deserializeSettings(value) {
    return normalizeSettings(safeJsonParse(value, {}));
}

export function serializeSettings(settings) {
    return JSON.stringify(settings);
}
