import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/debug/theme-preview.css', () => ({
    default: '.mm-preview-btn { display: block; }',
}));

import {
    createThemePreviewFeature,
    THEME_PREVIEW_STYLES,
} from '../../src/debug/theme-preview-enabled.js';
import {
    createThemePreviewFeature as createDisabledThemePreviewFeature,
    THEME_PREVIEW_STYLES as DISABLED_THEME_PREVIEW_STYLES,
} from '../../src/debug/theme-preview-disabled.js';

const ACTION_NAMES = [
    'flashScreen',
    'playThemeSound',
    'showBanner',
    'spawnCelebrationBurst',
    'spawnFloat',
    'spawnThemeParticles',
    'triggerAnswerBoxAccent',
];

function createHarness({ actionOverrides = {}, stateOverrides = {}, warn = vi.fn() } = {}) {
    const anchor = document.createElement('div');
    const state = {
        answerStreak: 8,
        wordStreak: 3,
        multiplier: 4,
        score: 0,
        lastCompleted: 0,
        sessionCorrect: 0,
        sessionIncorrect: 0,
        sessionWords: 0,
        sessionStart: 100,
        bestStreak: 8,
        bestMultiplier: 4,
        sessionActive: true,
        ...stateOverrides,
    };
    const calls = [];
    const actions = Object.fromEntries(
        ACTION_NAMES.map((name) => [
            name,
            (...args) => {
                calls.push([name, ...args]);
                actionOverrides[name]?.(...args);
            },
        ]),
    );
    const feature = createThemePreviewFeature({
        getAnchor: () => anchor,
        getGameplayState: () => state,
        getRecordsSignature: () => 'records-signature',
        isRewindAvailable: () => true,
        getTimerState: () => ({
            running: true,
            expired: false,
            currentQuestionId: 7,
            awardedForQuestionId: null,
        }),
        actions,
        warn,
    });
    const panel = document.createElement('div');
    panel.innerHTML = feature.panelExtension.markup;
    const removers = [];
    feature.panelExtension.install({
        panel,
        listen(target, type, handler) {
            target.addEventListener(type, handler);
            removers.push(() => target.removeEventListener(type, handler));
        },
    });

    return {
        anchor,
        calls,
        click(eventType) {
            panel.querySelector(`[data-preview-event="${eventType}"]`).click();
        },
        cleanup() {
            removers.forEach((remove) => remove());
            feature.cleanup();
        },
        feature,
        panel,
        state,
        warn,
    };
}

describe('enabled theme preview feature', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('owns its preview-only styles and panel controls', () => {
        const harness = createHarness();

        expect(THEME_PREVIEW_STYLES).toContain('.mm-preview-btn');
        expect(harness.panel.textContent).toContain('THEME PREVIEW');
        expect(harness.panel.querySelectorAll('[data-preview-event]')).toHaveLength(8);

        harness.cleanup();
    });

    it.each([
        [
            'correct',
            (anchor, context) => [
                ['playThemeSound', 'correct', context],
                ['flashScreen', true],
                ['triggerAnswerBoxAccent', 'correct', anchor],
                ['spawnFloat', '+100', 'correct', anchor],
                ['spawnThemeParticles', 'correct', anchor],
            ],
        ],
        [
            'incorrect',
            (anchor) => [
                ['playThemeSound', 'incorrect'],
                ['flashScreen', false],
                ['triggerAnswerBoxAccent', 'incorrect', anchor],
                ['spawnFloat', 'WRONG', 'incorrect', anchor],
                ['spawnThemeParticles', 'incorrect', anchor],
            ],
        ],
        [
            'combo',
            (anchor, context) => [
                ['playThemeSound', 'multiplierUp', context],
                ['showBanner', 'mm-mult-banner', '3x COMBO!'],
                ['triggerAnswerBoxAccent', 'multiplierUp', anchor],
                ['spawnFloat', 'MULT x3', 'correct', anchor],
                ['spawnThemeParticles', 'multiplierUp', anchor],
                ['spawnCelebrationBurst', 'multiplierUp', anchor],
            ],
        ],
        [
            'milestone',
            (anchor, context) => [
                ['playThemeSound', 'multiplierUp', context],
                ['showBanner', 'mm-milestone-banner', 'UNSTOPPABLE!'],
                ['triggerAnswerBoxAccent', 'milestone', anchor],
                ['spawnFloat', 'UNSTOPPABLE!', 'milestone', anchor],
                ['spawnThemeParticles', 'milestone', anchor],
                ['spawnCelebrationBurst', 'milestone', anchor],
            ],
        ],
        [
            'timeout',
            (anchor) => [
                ['playThemeSound', 'timeout'],
                ['flashScreen', false],
                ['triggerAnswerBoxAccent', 'timeout', anchor],
                ['spawnFloat', 'TIME UP', 'incorrect', anchor],
                ['spawnThemeParticles', 'timeout', anchor],
            ],
        ],
        [
            'wordComplete',
            (anchor, context) => [
                ['playThemeSound', 'wordComplete', context],
                ['triggerAnswerBoxAccent', 'wordComplete', anchor],
                ['spawnFloat', 'WORD CLEAR!', 'wordwin', anchor],
                ['spawnThemeParticles', 'wordComplete', anchor],
                ['spawnCelebrationBurst', 'wordComplete', anchor],
            ],
        ],
        [
            'sessionComplete',
            (anchor) => [
                ['playThemeSound', 'sessionComplete'],
                ['showBanner', 'mm-milestone-banner', 'SESSION COMPLETE'],
                ['spawnThemeParticles', 'sessionComplete', anchor],
                ['spawnCelebrationBurst', 'sessionComplete', anchor],
            ],
        ],
    ])('preserves the %s presentation recipe', (eventType, expectedCalls) => {
        const harness = createHarness();
        const context = { answerStreak: 8, wordStreak: 3, multiplier: 4 };

        harness.click(eventType);

        expect(harness.calls).toEqual(expectedCalls(harness.anchor, context));
        expect(harness.warn).not.toHaveBeenCalled();
        harness.cleanup();
    });

    it('previews every event in the established order and cancels delayed work on cleanup', () => {
        const harness = createHarness();

        harness.click('all');
        vi.advanceTimersByTime(360 * 6);

        expect(
            harness.calls
                .filter(([name]) => name === 'playThemeSound')
                .map(([, eventType]) => eventType),
        ).toEqual([
            'correct',
            'multiplierUp',
            'wordComplete',
            'multiplierUp',
            'timeout',
            'incorrect',
            'sessionComplete',
        ]);

        harness.calls.length = 0;
        harness.click('all');
        harness.feature.cleanup();
        vi.runAllTimers();
        expect(
            harness.calls
                .filter(([name]) => name === 'playThemeSound')
                .map(([, eventType]) => eventType),
        ).toEqual(['correct']);

        harness.cleanup();
    });

    it('warns when a preview action changes gameplay state', () => {
        let harness;
        harness = createHarness({
            actionOverrides: {
                flashScreen() {
                    harness.state.score = 100;
                },
            },
        });

        harness.click('correct');

        expect(harness.warn).toHaveBeenCalledWith(
            '[MMGamify] Theme preview changed gameplay state:',
            expect.objectContaining({
                eventType: 'correct',
                before: expect.objectContaining({
                    state: expect.objectContaining({ score: 0 }),
                }),
                after: expect.objectContaining({
                    state: expect.objectContaining({ score: 100 }),
                }),
            }),
        );
        harness.cleanup();
    });
});

describe('disabled theme preview feature', () => {
    it('adds no runtime feature or styles', () => {
        expect(createDisabledThemePreviewFeature()).toBeNull();
        expect(DISABLED_THEME_PREVIEW_STYLES).toBe('');
    });
});
