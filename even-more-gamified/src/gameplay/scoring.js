import { MAX_TIMED_XP_MULTIPLIER, SPEED_XP_TIERS } from '../config/constants.js';
import { DEFAULT_SETTINGS } from '../config/defaults.js';
import { clamp } from '../utils/clamp.js';

export function calcMultiplier(streak) {
    return Math.min(10, 1 + Math.floor(streak / 5));
}

export function getDifficultyXpMultiplier(settings = DEFAULT_SETTINGS) {
    let multiplier = 1;
    if (settings.timeoutFailureEnabled) multiplier *= 1.25;
    if (settings.fontChallengeEnabled) multiplier *= 1.15;
    return multiplier;
}

export function getTimerDurationXpModifier(timerSeconds) {
    if (timerSeconds <= 10) return 1.2;
    if (timerSeconds <= 15) return 1;
    if (timerSeconds <= 30) return 0.8;
    if (timerSeconds <= 45) return 0.65;
    if (timerSeconds <= 60) return 0.55;
    if (timerSeconds <= 90) return 0.45;
    return 0.35;
}

export function getSpeedXpTier(remainingPct) {
    const percentage = clamp(remainingPct, 0, 1, 0);
    return (
        SPEED_XP_TIERS.find((tier) => percentage > tier.minRemainingPct) ||
        SPEED_XP_TIERS[SPEED_XP_TIERS.length - 1]
    );
}

export function getTimedXpMultiplier(tier, timerSeconds = DEFAULT_SETTINGS.timerSeconds) {
    if (!tier || tier.segment === 0) return 1;
    const durationModifier = getTimerDurationXpModifier(timerSeconds);
    return clamp(1 + (tier.multiplier - 1) * durationModifier, 1, MAX_TIMED_XP_MULTIPLIER, 1);
}

/**
 * Evaluate one timed-XP award without mutating timer state.
 *
 * Callers must persist `awardedForQuestionId` back to their timer state. The
 * marker advances for every positive question id, even for an ineligible
 * answer, matching the reference userscript's one-shot behavior.
 */
export function evaluateTimedXpAward({ settings = DEFAULT_SETTINGS, timerState, remainingPct }) {
    const tier = getSpeedXpTier(remainingPct);
    const questionId = timerState.currentQuestionId;
    const eligible =
        settings.timerEnabled &&
        settings.timedXpBonusEnabled &&
        timerState.running &&
        !timerState.expired &&
        remainingPct > 0 &&
        questionId > 0 &&
        timerState.awardedForQuestionId !== questionId;

    return {
        eligible,
        remainingPct,
        tier,
        multiplier: eligible ? getTimedXpMultiplier(tier, settings.timerSeconds) : 1,
        awardedForQuestionId: questionId > 0 ? questionId : timerState.awardedForQuestionId,
    };
}

export function getCurrentXpBonusMultiplier({
    settings = DEFAULT_SETTINGS,
    timerState,
    remainingPct = null,
}) {
    let timedMultiplier = 1;
    if (
        settings.timerEnabled &&
        settings.timedXpBonusEnabled &&
        timerState.running &&
        !timerState.expired
    ) {
        const percentage = Number.isFinite(remainingPct) ? remainingPct : timerState.remainingPct;
        timedMultiplier = getTimedXpMultiplier(getSpeedXpTier(percentage), settings.timerSeconds);
    }
    return getDifficultyXpMultiplier(settings) * timedMultiplier;
}

export function calcAnswerPoints(multiplier, timedXpMultiplier = 1, settings = DEFAULT_SETTINGS) {
    const points = 100 * multiplier * getDifficultyXpMultiplier(settings) * timedXpMultiplier;
    return Math.round(points / 10) * 10;
}

export function calcIncorrectPenalty(score, lostStreak) {
    return Math.min(score, 50 * Math.floor(lostStreak / 5));
}
