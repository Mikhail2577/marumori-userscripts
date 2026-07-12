import { describe, expect, it } from 'vitest';

import {
    AUDIO_WARN_THROTTLE_MS,
    LOFI_MELODIES,
    MUSIC_PRESETS,
    MUSIC_PROGRESSIONS,
    NOTE_RATIOS,
    RETRO_MELODIES,
    SOUND_PRESETS,
} from '../../src/config/audio-presets.js';
import {
    BACKGROUND_THEME_LABELS,
    BACKGROUND_THEMES,
    CANVAS_BACKGROUND_THEMES,
    CELEBRATION_CHOREOGRAPHY_PRESETS,
    COMBO_EFFECT_PRESETS,
    CSS_THEME_PRESENTATION_VARIABLES,
    CSS_THEME_VARIABLES,
    FLOATING_TEXT_PRESETS,
    NIGHTVIEW_IMAGE_URL,
    PARTICLE_PRESETS,
    SHOOTING_STAR_THEMES,
    SHRINE_IMAGE_URL,
    THEME_DEFINITIONS,
    THEME_PRESET_REGISTRY,
} from '../../src/config/themes.js';

const EXPECTED_THEME_IDS = [
    'default',
    'starfield',
    'nebula',
    'grid',
    'gamecenter',
    'shrine',
    'nightview',
    'matrix',
    'void',
];

describe('theme configuration', () => {
    it('derives stable theme registries from the definitions', () => {
        expect(BACKGROUND_THEMES).toEqual(EXPECTED_THEME_IDS);
        expect(CANVAS_BACKGROUND_THEMES).toEqual([
            'starfield',
            'nebula',
            'grid',
            'gamecenter',
            'shrine',
            'nightview',
            'matrix',
        ]);
        expect(SHOOTING_STAR_THEMES).toEqual(['starfield']);
        expect(BACKGROUND_THEME_LABELS.gamecenter).toBe('GAME CENTER');
        expect(Object.isFrozen(BACKGROUND_THEMES)).toBe(true);
        expect(Object.isFrozen(CANVAS_BACKGROUND_THEMES)).toBe(true);
        expect(Object.isFrozen(SHOOTING_STAR_THEMES)).toBe(true);
        expect(Object.isFrozen(BACKGROUND_THEME_LABELS)).toBe(true);
    });

    it('keeps every theme preset reference resolvable', () => {
        for (const theme of Object.values(THEME_DEFINITIONS)) {
            for (const [kind, collection] of Object.entries(THEME_PRESET_REGISTRY)) {
                expect(collection, kind).toHaveProperty(theme.presets[kind]);
            }

            for (const colorKey of Object.keys(CSS_THEME_VARIABLES)) {
                expect(theme.colors, `${theme.id}.colors.${colorKey}`).toHaveProperty(colorKey);
            }
        }

        expect(THEME_PRESET_REGISTRY).toMatchObject({
            sound: SOUND_PRESETS,
            floatingText: FLOATING_TEXT_PRESETS,
            particles: PARTICLE_PRESETS,
            combo: COMBO_EFFECT_PRESETS,
            celebration: CELEBRATION_CHOREOGRAPHY_PRESETS,
            music: MUSIC_PRESETS,
        });
        expect(Object.keys(CSS_THEME_PRESENTATION_VARIABLES)).toContain('scanlineOpacity');
    });

    it('uses immutable commit-pinned background asset URLs', () => {
        const pinnedCommit = 'f997afc94074989ec324590d7df08960a2633f52';

        expect(SHRINE_IMAGE_URL).toContain(`/${pinnedCommit}/even-more-gamified/assets/`);
        expect(NIGHTVIEW_IMAGE_URL).toContain(`/${pinnedCommit}/even-more-gamified/assets/`);
        expect(SHRINE_IMAGE_URL.endsWith('/shrine-garden.jpg')).toBe(true);
        expect(NIGHTVIEW_IMAGE_URL.endsWith('/nightview.png')).toBe(true);
    });
});

describe('audio preset configuration', () => {
    it('contains every named theme sound and music preset', () => {
        const soundNames = new Set(Object.keys(SOUND_PRESETS));
        const musicNames = new Set(Object.keys(MUSIC_PRESETS));

        for (const theme of Object.values(THEME_DEFINITIONS)) {
            expect(soundNames.has(theme.presets.sound), theme.id).toBe(true);
            expect(musicNames.has(theme.presets.music), theme.id).toBe(true);
        }
    });

    it('preserves the style music tables and warning throttle', () => {
        expect(MUSIC_PROGRESSIONS).toHaveLength(4);
        expect(LOFI_MELODIES).toHaveLength(4);
        expect(RETRO_MELODIES).toHaveLength(2);
        expect(NOTE_RATIOS).toEqual([1, 9 / 8, 5 / 4, 4 / 3, 3 / 2, 5 / 3, 15 / 8, 2]);
        expect(AUDIO_WARN_THROTTLE_MS).toBe(5000);
    });
});
