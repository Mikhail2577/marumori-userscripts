import { DEFAULT_SETTINGS } from '../config/defaults.js';
import {
    MUSIC_STYLES,
    MUSIC_STYLE_LABELS,
    PERFORMANCE_PROFILES,
    PERFORMANCE_PROFILE_LABELS,
    THEME_MUSIC_MODE_LABELS,
    TIMER_SECONDS_PRESETS,
} from '../config/themes.js';
import { clamp } from '../utils/clamp.js';

const TOGGLES = [
    ['sfxEnabled', 'Sound FX'],
    ['visualsEnabled', 'Visuals'],
    ['hudEnabled', 'HUD'],
    ['shakeEnabled', 'Screen Shake'],
    ['floatEnabled', 'Floating Text'],
    ['flashEnabled', 'Screen Flash'],
    ['failureFlashEnabled', 'Failure Flash'],
    ['crtEnabled', 'CRT Effects'],
    ['musicEnabled', 'Music'],
    ['timerEnabled', 'Answer Timer'],
    ['timedXpBonusEnabled', 'Timed XP Bonus'],
    ['timeoutFailureEnabled', 'Timeout Failure'],
    ['fontChallengeEnabled', 'Font Challenge'],
];

function createPanelElement(document, settings, getMusicModeLabel, getThemeLabel) {
    const rows = TOGGLES.map(
        ([key, label]) => `
            <div class="mm-setting-row">
                <label id="mm-label-${key}">${label}</label>
                <button class="mm-toggle ${settings[key] ? 'on' : ''}" data-key="${key}"
                    aria-labelledby="mm-label-${key}" aria-pressed="${settings[key]}"></button>
            </div>`,
    ).join('');

    const panel = document.createElement('div');
    panel.id = 'mm-settings';
    // Interpolated values come from normalized settings and the local theme registry.
    panel.innerHTML = `
        <h3>⚙ SETTINGS</h3>
        ${rows}
        <div class="mm-setting-row">
            <label>Visual Profile</label>
            <button class="mm-cycle-btn" id="mm-performance-profile" type="button">
                ${PERFORMANCE_PROFILE_LABELS[settings.performanceProfile]}
            </button>
        </div>
        <div class="mm-setting-row">
            <label>Timer Duration</label>
            <button class="mm-cycle-btn" id="mm-timer-seconds" type="button">
                ${settings.timerSeconds} SEC
            </button>
        </div>
        <div class="mm-setting-row">
            <label for="mm-vol-slider">SFX Volume</label>
            <input id="mm-vol-slider" type="range" min="0" max="1" step="0.05" value="${settings.volume}">
        </div>
        <div class="mm-setting-row">
            <label>Music Mode</label>
            <button class="mm-cycle-btn" id="mm-music-style" type="button">
                ${getMusicModeLabel()}
            </button>
        </div>
        <div class="mm-setting-row">
            <label for="mm-music-vol-slider">Music Volume</label>
            <input id="mm-music-vol-slider" type="range" min="0" max="0.5" step="0.01"
                value="${settings.musicVolume}">
        </div>
        <div class="mm-setting-row">
            <label>Background</label>
            <button class="mm-cycle-btn" id="mm-bg-theme" type="button">
                ${getThemeLabel(settings.backgroundTheme)}
            </button>
        </div>
        <div class="mm-setting-row">
            <label>Pinned Default</label>
            <button class="mm-cycle-btn" id="mm-pinned-bg-theme" type="button">
                ${getThemeLabel(settings.pinnedBackgroundTheme)}
            </button>
        </div>
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
        <button class="mm-btn-outline" id="mm-pin-bg">PIN CURRENT BACKGROUND</button>
        <button class="mm-btn-outline" id="mm-use-pinned-bg">USE PINNED BACKGROUND</button>
        <button class="mm-btn-outline" id="mm-reset-hud">RESET HUD POSITION</button>
        <button class="mm-btn-outline" id="mm-reset-records">RESET 7D RECORDS</button>
        <button class="mm-btn-outline" id="mm-settings-close">CLOSE</button>
    `;
    return panel;
}

export function createSettingsPanelController({
    document,
    settings,
    saveSettings,
    scheduleSettingsSave,
    getMusicPreset,
    getThemeIds,
    getThemeId,
    getThemeLabel,
    normalizeTheme,
    onSettingSideEffects,
    onSfxVolumeChanged,
    onPerformanceProfileChanged,
    onTimerDurationChanged,
    onMusicStyleChanged,
    onMusicVolumeChanged,
    onPreviewThemeEvent,
    applyBackgroundTheme,
    onBackgroundThemeChanged,
    onResetHudPosition,
    onResetRecords,
}) {
    function canCycleMusicStyle() {
        return getMusicPreset().scheduler === 'style';
    }

    function getMusicModeLabel() {
        const preset = getMusicPreset();
        if (preset.scheduler === 'style') return MUSIC_STYLE_LABELS[settings.musicStyle];
        return (
            THEME_MUSIC_MODE_LABELS[preset.id] || String(preset.scheduler || 'theme').toUpperCase()
        );
    }

    const panel = createPanelElement(document, settings, getMusicModeLabel, getThemeLabel);
    const listeners = [];
    let installed = false;

    const listen = (target, type, handler) => {
        target.addEventListener(type, handler);
        listeners.push(() => target.removeEventListener(type, handler));
    };

    function syncMusicModeButton(button = panel.querySelector('#mm-music-style')) {
        if (!button) return;
        const canCycle = canCycleMusicStyle();
        button.textContent = getMusicModeLabel();
        button.disabled = !canCycle;
        button.title = canCycle
            ? 'Cycle Default theme music style'
            : 'Theme music follows the selected background';
    }

    function updateBackgroundButtons() {
        panel.querySelector('#mm-bg-theme').textContent = getThemeLabel(settings.backgroundTheme);
        panel.querySelector('#mm-pinned-bg-theme').textContent = getThemeLabel(
            settings.pinnedBackgroundTheme,
        );
        syncMusicModeButton();
    }

    function setBackgroundTheme(theme) {
        applyBackgroundTheme(theme);
        updateBackgroundButtons();
        saveSettings();
        onBackgroundThemeChanged(theme);
    }

    function setPinnedBackgroundTheme(theme) {
        settings.pinnedBackgroundTheme = normalizeTheme(theme);
        updateBackgroundButtons();
        saveSettings();
    }

    function install() {
        if (installed) return;
        installed = true;
        syncMusicModeButton();

        panel.querySelectorAll('.mm-toggle').forEach((button) => {
            listen(button, 'click', () => {
                const key = button.dataset.key;
                settings[key] = !settings[key];
                button.classList.toggle('on', settings[key]);
                button.setAttribute('aria-pressed', String(settings[key]));
                saveSettings();
                onSettingSideEffects(key);
            });
        });

        listen(panel.querySelector('#mm-vol-slider'), 'input', (event) => {
            settings.volume = clamp(event.target.value, 0, 1, DEFAULT_SETTINGS.volume);
            onSfxVolumeChanged(settings.volume);
            scheduleSettingsSave();
        });

        listen(panel.querySelector('#mm-performance-profile'), 'click', (event) => {
            const current = PERFORMANCE_PROFILES.indexOf(settings.performanceProfile);
            settings.performanceProfile =
                PERFORMANCE_PROFILES[(current + 1) % PERFORMANCE_PROFILES.length];
            event.currentTarget.textContent =
                PERFORMANCE_PROFILE_LABELS[settings.performanceProfile];
            saveSettings();
            onPerformanceProfileChanged(settings.performanceProfile);
        });

        listen(panel.querySelector('#mm-timer-seconds'), 'click', (event) => {
            const current = TIMER_SECONDS_PRESETS.indexOf(settings.timerSeconds);
            settings.timerSeconds =
                TIMER_SECONDS_PRESETS[(current + 1) % TIMER_SECONDS_PRESETS.length];
            event.currentTarget.textContent = `${settings.timerSeconds} SEC`;
            saveSettings();
            onTimerDurationChanged(settings.timerSeconds);
        });

        listen(panel.querySelector('#mm-music-style'), 'click', (event) => {
            if (!canCycleMusicStyle()) {
                syncMusicModeButton(event.currentTarget);
                return;
            }
            const current = MUSIC_STYLES.indexOf(settings.musicStyle);
            settings.musicStyle = MUSIC_STYLES[(current + 1) % MUSIC_STYLES.length];
            syncMusicModeButton(event.currentTarget);
            saveSettings();
            onMusicStyleChanged(settings.musicStyle);
        });

        listen(panel.querySelector('#mm-music-vol-slider'), 'input', (event) => {
            settings.musicVolume = clamp(event.target.value, 0, 0.5, DEFAULT_SETTINGS.musicVolume);
            onMusicVolumeChanged(settings.musicVolume);
            scheduleSettingsSave();
        });

        panel.querySelectorAll('[data-preview-event]').forEach((button) => {
            listen(button, 'click', (event) => {
                onPreviewThemeEvent(event.currentTarget.dataset.previewEvent);
            });
        });

        listen(panel.querySelector('#mm-bg-theme'), 'click', () => {
            const themeIds = getThemeIds();
            const current = themeIds.indexOf(getThemeId(settings.backgroundTheme));
            setBackgroundTheme(themeIds[(current + 1) % themeIds.length]);
        });

        listen(panel.querySelector('#mm-pinned-bg-theme'), 'click', () => {
            const themeIds = getThemeIds();
            const current = themeIds.indexOf(getThemeId(settings.pinnedBackgroundTheme));
            setPinnedBackgroundTheme(themeIds[(current + 1) % themeIds.length]);
        });

        listen(panel.querySelector('#mm-pin-bg'), 'click', () => {
            setPinnedBackgroundTheme(settings.backgroundTheme);
        });

        listen(panel.querySelector('#mm-use-pinned-bg'), 'click', () => {
            setBackgroundTheme(settings.pinnedBackgroundTheme);
        });

        listen(panel.querySelector('#mm-reset-hud'), 'click', onResetHudPosition);
        listen(panel.querySelector('#mm-reset-records'), 'click', onResetRecords);
        listen(panel.querySelector('#mm-settings-close'), 'click', () => {
            panel.classList.remove('open');
        });
    }

    function cleanup() {
        listeners.splice(0).forEach((removeListener) => removeListener());
        installed = false;
    }

    return {
        element: panel,
        install,
        cleanup,
        syncMusicModeButton,
        updateBackgroundButtons,
    };
}
