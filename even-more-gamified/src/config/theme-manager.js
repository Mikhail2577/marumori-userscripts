import { MUSIC_PRESETS, SOUND_PRESETS } from './audio-presets.js';
import { DEFAULT_SETTINGS } from './defaults.js';
import { normalizeBackgroundTheme as normalizeThemeId } from './theme-identifiers.js';
import { mergeEventPreset } from './theme-presets.js';
import {
    BACKGROUND_THEME_LABELS,
    BACKGROUND_THEMES,
    CELEBRATION_CHOREOGRAPHY_PRESETS,
    COMBO_EFFECT_PRESETS,
    CSS_THEME_PRESENTATION_VARIABLES,
    CSS_THEME_VARIABLES,
    FLOATING_TEXT_PRESETS,
    PARTICLE_PRESETS,
    THEME_DEFINITIONS,
    THEME_PRESENTATION_STYLES,
    THEME_PRESET_REGISTRY,
} from './themes.js';
import { clamp } from '../utils/clamp.js';

export { normalizeThemeId };

function isPlainObject(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function mergeThemeObjects(base = {}, override = {}) {
    const next = { ...base };
    for (const [key, value] of Object.entries(override || {})) {
        next[key] =
            isPlainObject(value) && isPlainObject(next[key])
                ? mergeThemeObjects(next[key], value)
                : value;
    }
    return next;
}

function getPreset(collection, presetName, fallbackName) {
    return collection[presetName] || collection[fallbackName];
}

export function validateThemeRegistry({
    themeDefinitions = THEME_DEFINITIONS,
    presetRegistry = THEME_PRESET_REGISTRY,
    cssThemeVariables = CSS_THEME_VARIABLES,
    celebrationPresets = CELEBRATION_CHOREOGRAPHY_PRESETS,
    musicPresets = MUSIC_PRESETS,
    warn = (...args) => console.warn(...args),
} = {}) {
    const issues = [];
    const requiredIntensityKeys = ['particles', 'flash', 'shake', 'sound', 'celebration'];
    const requiredMotionKeys = ['shakeScale', 'effectIntensity', 'allowIdle'];
    const validMusicSchedulers = [
        'style',
        'ambient',
        'pulse',
        'chiptune',
        'bells',
        'minyo',
        'void',
    ];

    for (const [themeId, theme] of Object.entries(themeDefinitions)) {
        for (const [presetKey, collection] of Object.entries(presetRegistry)) {
            const presetName = theme.presets?.[presetKey];
            if (!presetName) {
                issues.push(`${themeId}.presets.${presetKey} is missing`);
            } else if (!collection[presetName]) {
                issues.push(`${themeId}.presets.${presetKey} -> ${presetName} is unknown`);
            }
        }

        for (const colorKey of Object.keys(cssThemeVariables)) {
            if (theme.colors?.[colorKey] === undefined) {
                issues.push(`${themeId}.colors.${colorKey} is missing`);
            }
        }

        for (const key of requiredIntensityKeys) {
            if (!Number.isFinite(Number(theme.intensity?.[key]))) {
                issues.push(`${themeId}.intensity.${key} must be numeric`);
            }
        }

        for (const key of requiredMotionKeys) {
            if (key === 'allowIdle') {
                if (typeof theme.motion?.allowIdle !== 'boolean') {
                    issues.push(`${themeId}.motion.allowIdle must be boolean`);
                }
            } else if (!Number.isFinite(Number(theme.motion?.[key]))) {
                issues.push(`${themeId}.motion.${key} must be numeric`);
            }
        }
    }

    for (const [presetId, preset] of Object.entries(celebrationPresets)) {
        if (!Array.isArray(preset.effects) || preset.effects.length === 0) {
            issues.push(`celebration.${presetId}.effects must contain at least one effect`);
        }
        if (!preset.answerAccent) {
            issues.push(`celebration.${presetId}.answerAccent is missing`);
        }
    }

    for (const [presetId, preset] of Object.entries(musicPresets)) {
        if (!validMusicSchedulers.includes(preset.scheduler)) {
            issues.push(`music.${presetId}.scheduler -> ${preset.scheduler} is unknown`);
        }
    }

    if (issues.length) {
        warn('[MMGamify] Theme registry check found issues:', issues);
    }
    return issues;
}

export function createThemeManager({
    document: documentRef,
    getSettings,
    saveSettings = () => {},
    isLiteMode = () => false,
    isMaxMode = () => false,
} = {}) {
    const resolvedThemeCache = new Map();
    let lastAppliedCssThemeId = null;

    function getBackgroundTheme() {
        return getSettings?.()?.backgroundTheme ?? DEFAULT_SETTINGS.backgroundTheme;
    }

    function resolveThemeDefinition(themeId) {
        const normalized = normalizeThemeId(themeId);
        const cached = resolvedThemeCache.get(normalized);
        if (cached) return cached;
        const theme =
            normalized === DEFAULT_SETTINGS.backgroundTheme
                ? THEME_DEFINITIONS[DEFAULT_SETTINGS.backgroundTheme]
                : mergeThemeObjects(
                      THEME_DEFINITIONS[DEFAULT_SETTINGS.backgroundTheme],
                      THEME_DEFINITIONS[normalized],
                  );
        const resolved = { ...theme, id: normalized };
        resolvedThemeCache.set(normalized, resolved);
        return resolved;
    }

    return {
        getThemeIds() {
            return BACKGROUND_THEMES;
        },
        getThemeId(themeId = getBackgroundTheme()) {
            return normalizeThemeId(themeId);
        },
        getThemeLabel(themeId = getBackgroundTheme()) {
            return (
                BACKGROUND_THEME_LABELS[this.getThemeId(themeId)] ||
                this.getActiveTheme(themeId).label.toUpperCase()
            );
        },
        getActiveTheme(themeId = getBackgroundTheme()) {
            return resolveThemeDefinition(themeId);
        },
        getThemeValue(path, fallback = null) {
            const parts = String(path || '')
                .split('.')
                .filter(Boolean);
            let value = this.getActiveTheme();
            for (const part of parts) {
                value = value?.[part];
                if (value === undefined) return fallback;
            }
            return value;
        },
        getSoundPreset(eventType) {
            const theme = this.getActiveTheme();
            const preset = getPreset(SOUND_PRESETS, theme.presets.sound, 'arcade');
            return preset[eventType] || SOUND_PRESETS.arcade[eventType] || [];
        },
        getFloatingTextPreset(eventType) {
            const theme = this.getActiveTheme();
            return mergeEventPreset(
                getPreset(FLOATING_TEXT_PRESETS, theme.presets.floatingText, 'arcadeClassic'),
                eventType,
            );
        },
        getParticlePreset(eventType) {
            const theme = this.getActiveTheme();
            return mergeEventPreset(
                getPreset(PARTICLE_PRESETS, theme.presets.particles, 'arcadeBurst'),
                eventType,
            );
        },
        getComboPreset(eventType) {
            const theme = this.getActiveTheme();
            const preset = getPreset(COMBO_EFFECT_PRESETS, theme.presets.combo, 'arcadePop');
            return mergeEventPreset(preset, eventType);
        },
        getCelebrationPreset(eventType) {
            const theme = this.getActiveTheme();
            const preset = getPreset(
                CELEBRATION_CHOREOGRAPHY_PRESETS,
                theme.presets.celebration,
                'arcadePop',
            );
            return mergeEventPreset(preset, eventType);
        },
        getMusicPreset(themeId = getBackgroundTheme()) {
            const theme = this.getActiveTheme(themeId);
            const presetName = theme.presets.music || 'arcadeLofi';
            const preset = getPreset(MUSIC_PRESETS, presetName, 'arcadeLofi');
            return { ...preset, id: presetName };
        },
        getEffectBudget(_eventType) {
            const theme = this.getActiveTheme();
            const intensity = theme.intensity || {};
            const profileScale = isMaxMode() ? 1 : isLiteMode() ? 0.25 : 0.72;
            const particles = Number(intensity.particles) || 1;
            const celebration = Number(intensity.celebration) || 1;
            return {
                intensity: theme.motion.effectIntensity * particles * profileScale,
                celebrationScale: theme.motion.effectIntensity * celebration * profileScale,
                flashScale: clamp(intensity.flash, 0.08, 1, 1),
                soundScale: clamp(intensity.sound, 0.08, 1.4, 1),
                spreadScale: clamp(0.68 + particles * 0.32, 0.45, 1.18, 1),
                shakeScale:
                    theme.motion.shakeScale *
                    clamp(intensity.shake, 0.08, 1.3, 1) *
                    (isLiteMode() ? 0.35 : 1),
                allowIdle: theme.motion.allowIdle && !isLiteMode(),
            };
        },
        applyTheme(themeId, { persist = true, save = false } = {}) {
            const normalized = normalizeThemeId(themeId);
            if (persist) getSettings().backgroundTheme = normalized;
            const theme = this.applyCssVariables(normalized);
            if (documentRef.body) {
                documentRef.body.dataset.mmTheme = normalized;
                documentRef.body.dataset.mmBg = normalized;
            }
            if (persist && save) saveSettings();
            return theme;
        },
        applyCssVariables(themeId = getBackgroundTheme()) {
            const theme = this.getActiveTheme(themeId);
            if (lastAppliedCssThemeId === theme.id) return theme;
            const presentation = mergeThemeObjects(
                THEME_PRESENTATION_STYLES.default,
                THEME_PRESENTATION_STYLES[theme.id] || {},
            );
            const root = documentRef.documentElement;
            for (const [key, cssVar] of Object.entries(CSS_THEME_VARIABLES)) {
                root.style.setProperty(cssVar, theme.colors[key]);
            }
            for (const [key, cssVar] of Object.entries(CSS_THEME_PRESENTATION_VARIABLES)) {
                root.style.setProperty(cssVar, presentation[key]);
            }
            lastAppliedCssThemeId = theme.id;
            return theme;
        },
        clearPresentation() {
            const root = documentRef.documentElement;
            [
                ...Object.values(CSS_THEME_VARIABLES),
                ...Object.values(CSS_THEME_PRESENTATION_VARIABLES),
            ].forEach((cssVar) => {
                root.style.removeProperty(cssVar);
            });
            lastAppliedCssThemeId = null;
            delete documentRef.body?.dataset.mmTheme;
            delete documentRef.body?.dataset.mmBg;
        },
    };
}
