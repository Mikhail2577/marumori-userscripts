import THEME_PREVIEW_STYLES from './theme-preview.css';

export { THEME_PREVIEW_STYLES };

const THEME_PREVIEW_EVENTS = Object.freeze([
    'correct',
    'combo',
    'wordComplete',
    'milestone',
    'timeout',
    'incorrect',
    'sessionComplete',
]);
const THEME_PREVIEW_DELAY_MS = 360;
const PREVIEW_STATE_KEYS = Object.freeze([
    'answerStreak',
    'wordStreak',
    'multiplier',
    'score',
    'lastCompleted',
    'sessionCorrect',
    'sessionIncorrect',
    'sessionWords',
    'sessionStart',
    'bestStreak',
    'bestMultiplier',
    'sessionActive',
]);

const PANEL_MARKUP = `
    <div class="mm-preview-title">THEME PREVIEW</div>
    <div class="mm-preview-grid">
        <button class="mm-preview-btn" type="button" data-preview-event="correct">CORRECT</button>
        <button class="mm-preview-btn" type="button" data-preview-event="incorrect">WRONG</button>
        <button class="mm-preview-btn" type="button" data-preview-event="combo">COMBO</button>
        <button class="mm-preview-btn" type="button" data-preview-event="milestone">MILESTONE</button>
        <button class="mm-preview-btn" type="button" data-preview-event="timeout">TIMEOUT</button>
        <button class="mm-preview-btn" type="button" data-preview-event="wordComplete">WORD CLEAR</button>
        <button class="mm-preview-btn" type="button" data-preview-event="sessionComplete">SESSION</button>
        <button class="mm-preview-btn" type="button" data-preview-event="all">PREVIEW ALL</button>
    </div>
`;

function defaultScheduler() {
    return {
        setTimeout: (callback, delay) => globalThis.setTimeout(callback, delay),
        clearTimeout: (timer) => globalThis.clearTimeout(timer),
    };
}

export function createThemePreviewFeature({
    getAnchor = () => null,
    getGameplayState = () => ({}),
    getRecordsSignature = () => '',
    isRewindAvailable = () => false,
    getTimerState = () => ({}),
    actions = {},
    scheduler = defaultScheduler(),
    warn = (...args) => console.warn(...args),
} = {}) {
    const {
        flashScreen = () => {},
        playThemeSound = () => {},
        showBanner = () => {},
        spawnCelebrationBurst = () => {},
        spawnFloat = () => {},
        spawnThemeParticles = () => {},
        triggerAnswerBoxAccent = () => {},
    } = actions;
    let previewAllTimer = null;

    function getPreviewStateInvariant() {
        const state = getGameplayState();
        const timerState = getTimerState();
        return {
            state: Object.fromEntries(PREVIEW_STATE_KEYS.map((key) => [key, state[key]])),
            records: getRecordsSignature(),
            rewindAvailable: Boolean(isRewindAvailable()),
            timer: {
                running: timerState.running,
                expired: timerState.expired,
                currentQuestionId: timerState.currentQuestionId,
                awardedForQuestionId: timerState.awardedForQuestionId,
            },
        };
    }

    function warnIfPreviewChangedState(before, eventType) {
        const after = getPreviewStateInvariant();
        if (JSON.stringify(before) !== JSON.stringify(after)) {
            warn('[MMGamify] Theme preview changed gameplay state:', {
                eventType,
                before,
                after,
            });
        }
    }

    function runThemePreviewEvent(eventType) {
        const anchor = getAnchor();
        const state = getGameplayState();
        const soundContext = {
            answerStreak: Math.max(5, state.answerStreak || 5),
            wordStreak: Math.max(2, state.wordStreak || 2),
            multiplier: Math.max(3, state.multiplier || 3),
        };

        if (eventType === 'correct') {
            playThemeSound('correct', soundContext);
            flashScreen(true);
            triggerAnswerBoxAccent('correct', anchor);
            spawnFloat('+100', 'correct', anchor);
            spawnThemeParticles('correct', anchor);
            return true;
        }

        if (eventType === 'incorrect') {
            playThemeSound('incorrect');
            flashScreen(false);
            triggerAnswerBoxAccent('incorrect', anchor);
            spawnFloat('WRONG', 'incorrect', anchor);
            spawnThemeParticles('incorrect', anchor);
            return true;
        }

        if (eventType === 'combo') {
            playThemeSound('multiplierUp', soundContext);
            showBanner('mm-mult-banner', '3x COMBO!');
            triggerAnswerBoxAccent('multiplierUp', anchor);
            spawnFloat('MULT x3', 'correct', anchor);
            spawnThemeParticles('multiplierUp', anchor);
            spawnCelebrationBurst('multiplierUp', anchor);
            return true;
        }

        if (eventType === 'milestone') {
            playThemeSound('multiplierUp', soundContext);
            showBanner('mm-milestone-banner', 'UNSTOPPABLE!');
            triggerAnswerBoxAccent('milestone', anchor);
            spawnFloat('UNSTOPPABLE!', 'milestone', anchor);
            spawnThemeParticles('milestone', anchor);
            spawnCelebrationBurst('milestone', anchor);
            return true;
        }

        if (eventType === 'timeout') {
            playThemeSound('timeout');
            flashScreen(false);
            triggerAnswerBoxAccent('timeout', anchor);
            spawnFloat('TIME UP', 'incorrect', anchor);
            spawnThemeParticles('timeout', anchor);
            return true;
        }

        if (eventType === 'wordComplete') {
            playThemeSound('wordComplete', soundContext);
            triggerAnswerBoxAccent('wordComplete', anchor);
            spawnFloat('WORD CLEAR!', 'wordwin', anchor);
            spawnThemeParticles('wordComplete', anchor);
            spawnCelebrationBurst('wordComplete', anchor);
            return true;
        }

        if (eventType === 'sessionComplete') {
            playThemeSound('sessionComplete');
            showBanner('mm-milestone-banner', 'SESSION COMPLETE');
            spawnThemeParticles('sessionComplete', anchor);
            spawnCelebrationBurst('sessionComplete', anchor);
            return true;
        }

        return false;
    }

    function previewOneThemeEvent(eventType) {
        const before = getPreviewStateInvariant();
        const didPreview = runThemePreviewEvent(eventType);
        if (didPreview) warnIfPreviewChangedState(before, eventType);
        return didPreview;
    }

    function previewAllThemeEvents() {
        if (previewAllTimer) {
            scheduler.clearTimeout(previewAllTimer);
            previewAllTimer = null;
        }

        let index = 0;
        const runNext = () => {
            const eventType = THEME_PREVIEW_EVENTS[index];
            if (!eventType) {
                previewAllTimer = null;
                return;
            }
            previewOneThemeEvent(eventType);
            index++;
            if (index >= THEME_PREVIEW_EVENTS.length) {
                previewAllTimer = null;
                return;
            }
            previewAllTimer = scheduler.setTimeout(runNext, THEME_PREVIEW_DELAY_MS);
        };
        runNext();
    }

    function previewThemeEvent(eventType) {
        if (eventType === 'all') {
            previewAllThemeEvents();
            return;
        }
        previewOneThemeEvent(eventType);
    }

    function cleanup() {
        if (!previewAllTimer) return;
        scheduler.clearTimeout(previewAllTimer);
        previewAllTimer = null;
    }

    return Object.freeze({
        panelExtension: Object.freeze({
            markup: PANEL_MARKUP,
            install({ panel, listen }) {
                panel.querySelectorAll('[data-preview-event]').forEach((button) => {
                    listen(button, 'click', (event) => {
                        previewThemeEvent(event.currentTarget.dataset.previewEvent);
                    });
                });
            },
        }),
        cleanup,
    });
}
