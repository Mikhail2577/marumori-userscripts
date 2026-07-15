export const BACKGROUND_THEME_IDS = Object.freeze([
    'default',
    'starfield',
    'nebula',
    'grid',
    'gamecenter',
    'shrine',
    'nightview',
    'matrix',
    'void',
]);

export const THEME_ALIASES = Object.freeze({
    game_center: 'gamecenter',
    gameCenter: 'gamecenter',
    game_center_theme: 'gamecenter',
});

export const REMOVED_BACKGROUND_THEME_FALLBACKS = Object.freeze({
    aurora: 'starfield',
    rain: 'default',
    constellation: 'starfield',
    snow: 'default',
});

export const MUSIC_STYLES = Object.freeze(['lofi', 'retro']);
export const MUSIC_STYLE_LABELS = Object.freeze({ lofi: 'LO-FI', retro: 'RETRO' });
export const PERFORMANCE_PROFILES = Object.freeze(['max', 'balanced', 'lite']);
export const PERFORMANCE_PROFILE_LABELS = Object.freeze({
    max: 'MAX',
    balanced: 'BALANCED',
    lite: 'LITE',
});
export const TIMER_SECONDS_PRESETS = Object.freeze([10, 15, 30, 45, 60, 90]);

export const RECORD_WINDOW_DAYS = 7;
export const MAX_TIMED_XP_MULTIPLIER = 1.75;

export const SPEED_XP_TIERS = Object.freeze(
    [
        {
            minRemainingPct: 0.8,
            segment: 5,
            key: 'lightning',
            label: 'Lightning',
            multiplier: 1.5,
        },
        {
            minRemainingPct: 0.6,
            segment: 4,
            key: 'fast',
            label: 'Fast',
            multiplier: 1.35,
        },
        {
            minRemainingPct: 0.4,
            segment: 3,
            key: 'steady',
            label: 'Steady',
            multiplier: 1.2,
        },
        {
            minRemainingPct: 0.2,
            segment: 2,
            key: 'close',
            label: 'Close',
            multiplier: 1.1,
        },
        {
            minRemainingPct: 0,
            segment: 1,
            key: 'barely',
            label: 'Barely',
            multiplier: 1.03,
        },
        {
            minRemainingPct: -1,
            segment: 0,
            key: 'expired',
            label: 'Timeout',
            multiplier: 1,
        },
    ].map(Object.freeze),
);

export const MILESTONES = Object.freeze({
    10: 'ON FIRE!',
    25: 'UNSTOPPABLE!',
    50: 'LEGENDARY!',
    100: 'GODLIKE!',
});
