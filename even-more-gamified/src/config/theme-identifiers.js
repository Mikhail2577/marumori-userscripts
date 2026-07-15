import {
    BACKGROUND_THEME_IDS,
    REMOVED_BACKGROUND_THEME_FALLBACKS,
    THEME_ALIASES,
} from './constants.js';
import { DEFAULT_SETTINGS } from './defaults.js';

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
