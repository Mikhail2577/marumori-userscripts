import { describe, expect, it } from 'vitest';

import { mergeEventPreset } from '../../src/config/theme-presets.js';

describe('mergeEventPreset', () => {
    it('flattens base values and applies each override layer in order', () => {
        const preset = {
            base: {
                color: 'base-color',
                motion: 'drift',
                shadow: 'base-shadow',
            },
            color: 'root-color',
            fontFamily: 'arcade',
            events: {
                default: {
                    color: 'default-color',
                    shadow: 'default-shadow',
                    fontSize: '14px',
                },
                correct: {
                    color: 'correct-color',
                    label: 'HIT',
                },
            },
        };

        expect(mergeEventPreset(preset, 'correct')).toEqual({
            color: 'correct-color',
            motion: 'drift',
            shadow: 'default-shadow',
            fontFamily: 'arcade',
            fontSize: '14px',
            label: 'HIT',
        });
    });

    it('does not leak the base or events containers into the resolved preset', () => {
        const resolved = mergeEventPreset({
            base: { color: 'gold', motion: 'wave' },
            events: { incorrect: { color: 'red' } },
        });

        expect(resolved).toEqual({ color: 'gold', motion: 'wave' });
        expect(resolved).not.toHaveProperty('base');
        expect(resolved).not.toHaveProperty('events');
    });

    it('uses shared event defaults when resolving the default event', () => {
        expect(
            mergeEventPreset({
                base: { color: 'white' },
                events: { default: { label: 'DEFAULT' } },
            }),
        ).toEqual({ color: 'white', label: 'DEFAULT' });
    });
});
