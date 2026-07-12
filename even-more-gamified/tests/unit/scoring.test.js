import { describe, expect, it } from 'vitest';

import { SPEED_XP_TIERS } from '../../src/config/constants.js';
import {
    calcAnswerPoints,
    calcIncorrectPenalty,
    calcMultiplier,
    evaluateTimedXpAward,
    getCurrentXpBonusMultiplier,
    getDifficultyXpMultiplier,
    getSpeedXpTier,
    getTimedXpMultiplier,
    getTimerDurationXpModifier,
} from '../../src/gameplay/scoring.js';

describe('combo scoring', () => {
    it('raises the multiplier every five answers and caps it at ten', () => {
        expect(calcMultiplier(0)).toBe(1);
        expect(calcMultiplier(4)).toBe(1);
        expect(calcMultiplier(5)).toBe(2);
        expect(calcMultiplier(44)).toBe(9);
        expect(calcMultiplier(45)).toBe(10);
        expect(calcMultiplier(500)).toBe(10);
    });

    it('calculates and caps incorrect-answer streak penalties', () => {
        expect(calcIncorrectPenalty(1_000, 4)).toBe(0);
        expect(calcIncorrectPenalty(1_000, 5)).toBe(50);
        expect(calcIncorrectPenalty(1_000, 26)).toBe(250);
        expect(calcIncorrectPenalty(80, 10)).toBe(80);
    });
});

describe('XP modifiers', () => {
    it('combines enabled difficulty modifiers multiplicatively', () => {
        expect(getDifficultyXpMultiplier({})).toBe(1);
        expect(getDifficultyXpMultiplier({ timeoutFailureEnabled: true })).toBe(1.25);
        expect(getDifficultyXpMultiplier({ fontChallengeEnabled: true })).toBe(1.15);
        expect(
            getDifficultyXpMultiplier({
                timeoutFailureEnabled: true,
                fontChallengeEnabled: true,
            }),
        ).toBeCloseTo(1.4375);
    });

    it.each([
        [10, 1.2],
        [15, 1],
        [30, 0.8],
        [45, 0.65],
        [60, 0.55],
        [90, 0.45],
        [91, 0.35],
    ])('uses the timer-duration modifier at %s seconds', (seconds, expected) => {
        expect(getTimerDurationXpModifier(seconds)).toBe(expected);
    });

    it('uses strict speed-tier boundaries from the legacy timer', () => {
        expect(getSpeedXpTier(1).key).toBe('lightning');
        expect(getSpeedXpTier(0.8).key).toBe('fast');
        expect(getSpeedXpTier(0.6).key).toBe('steady');
        expect(getSpeedXpTier(0.4).key).toBe('close');
        expect(getSpeedXpTier(0.2).key).toBe('barely');
        expect(getSpeedXpTier(Number.NaN).key).toBe('expired');
        expect(getSpeedXpTier(0).key).toBe('expired');
    });

    it('scales speed tiers by configured timer duration', () => {
        const lightning = SPEED_XP_TIERS[0];
        expect(getTimedXpMultiplier(lightning, 10)).toBeCloseTo(1.6);
        expect(getTimedXpMultiplier(lightning, 15)).toBeCloseTo(1.5);
        expect(getTimedXpMultiplier(lightning, 120)).toBeCloseTo(1.175);
        expect(getTimedXpMultiplier(null, 10)).toBe(1);
        expect(getTimedXpMultiplier({ segment: 1, multiplier: 100 }, 10)).toBe(1.75);
    });

    it('rounds answer points to the nearest ten', () => {
        expect(calcAnswerPoints(2)).toBe(200);
        expect(
            calcAnswerPoints(2, 1, {
                timeoutFailureEnabled: true,
                fontChallengeEnabled: true,
            }),
        ).toBe(290);
        expect(
            calcAnswerPoints(2, 1.5, {
                timeoutFailureEnabled: true,
                fontChallengeEnabled: true,
            }),
        ).toBe(430);
    });
});

describe('timed XP award ownership', () => {
    const settings = {
        timerEnabled: true,
        timedXpBonusEnabled: true,
        timerSeconds: 15,
    };

    it('awards an active question only once', () => {
        const timerState = {
            currentQuestionId: 7,
            awardedForQuestionId: null,
            running: true,
            expired: false,
            remainingPct: 0.9,
        };
        const award = evaluateTimedXpAward({
            settings,
            timerState,
            remainingPct: 0.9,
        });
        expect(award).toMatchObject({
            eligible: true,
            multiplier: 1.5,
            awardedForQuestionId: 7,
        });

        expect(
            evaluateTimedXpAward({
                settings,
                timerState: { ...timerState, awardedForQuestionId: 7 },
                remainingPct: 0.9,
            }),
        ).toMatchObject({
            eligible: false,
            multiplier: 1,
            awardedForQuestionId: 7,
        });
    });

    it('consumes a positive question marker even when ineligible', () => {
        const award = evaluateTimedXpAward({
            settings: { ...settings, timedXpBonusEnabled: false },
            timerState: {
                currentQuestionId: 3,
                awardedForQuestionId: null,
                running: true,
                expired: false,
            },
            remainingPct: 0.9,
        });
        expect(award).toMatchObject({
            eligible: false,
            multiplier: 1,
            awardedForQuestionId: 3,
        });
    });

    it('reports the live HUD bonus without consuming an award', () => {
        const multiplier = getCurrentXpBonusMultiplier({
            settings: { ...settings, timeoutFailureEnabled: true },
            timerState: {
                running: true,
                expired: false,
                remainingPct: 0.9,
            },
        });
        expect(multiplier).toBeCloseTo(1.875);
    });
});
