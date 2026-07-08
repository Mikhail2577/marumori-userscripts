// ==UserScript==
// @name         MaruMori Even More Gamified - Updated
// @namespace    marumori-gamify
// @version      3.1.2
// @description  Gamifies MaruMori review sessions with arcade combo audio, score multipliers, screen shake, floating damage numbers, and more
// @match        https://marumori.io/*
// @author       matskye
// @grant        GM_setValue
// @grant        GM_getValue
// @icon         https://www.google.com/s2/favicons?sz=64&domain=marumori.io
// @license      WTFPL
// @downloadURL https://update.greasyfork.org/scripts/566950/MaruMori%20Even%20More%20Gamified.user.js
// @updateURL https://update.greasyfork.org/scripts/566950/MaruMori%20Even%20More%20Gamified.meta.js
// ==/UserScript==

(function () {
    'use strict';

    const DEFAULTS = {
        sfxEnabled:     true,
        visualsEnabled: true,
        hudEnabled:     true,
        shakeEnabled:   true,
        floatEnabled:   true,
        flashEnabled:   true,
        arcadeEnabled:  true,
        autoFailTimeout: false,
        fontChallengeEnabled: false,
        musicEnabled:   false,
        musicStyle:     'lofi',
        musicVolume:    0.16,
        backgroundTheme: 'default',
        pinnedBackgroundTheme: 'default',
        volume:         0.5,    // 0–1
        comboTimeout:   15000,  // ms before idle combo reset
        hudPosition:    null,
    };

    const BACKGROUND_THEMES = ['default', 'starfield', 'nebula', 'grid', 'matrix', 'void'];
    const CANVAS_BACKGROUND_THEMES = ['starfield', 'nebula', 'grid', 'matrix'];
    const SHOOTING_STAR_THEMES = ['starfield'];
    const MUSIC_STYLES = ['lofi', 'retro'];
    const MUSIC_STYLE_LABELS = { lofi: 'LO-FI', retro: 'RETRO' };
    const BACKGROUND_THEME_LABELS = {
        default: 'DEFAULT',
        starfield: 'STARFIELD',
        nebula: 'NEBULA',
        grid: 'GRID',
        matrix: 'MATRIX',
        void: 'VOID',
    };
    const REMOVED_BACKGROUND_THEME_FALLBACKS = {
        aurora: 'starfield',
        rain: 'default',
        constellation: 'starfield',
        snow: 'default',
    };
    const RESOLVED_BACKDROP_OPACITY = 0.5;

    const BOOL_SETTINGS = [
        'sfxEnabled', 'visualsEnabled', 'hudEnabled', 'shakeEnabled',
        'floatEnabled', 'flashEnabled', 'arcadeEnabled', 'autoFailTimeout',
        'fontChallengeEnabled', 'musicEnabled',
    ];

    function clamp(num, min, max, fallback) {
        const parsed = Number(num);
        return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
    }

    function normalizeBackgroundTheme(theme, fallback = DEFAULTS.backgroundTheme) {
        if (BACKGROUND_THEMES.includes(theme)) return theme;
        if (Object.prototype.hasOwnProperty.call(REMOVED_BACKGROUND_THEME_FALLBACKS, theme)) {
            return REMOVED_BACKGROUND_THEME_FALLBACKS[theme];
        }
        return fallback;
    }

    function normalizeSettings(raw = {}) {
        const next = { ...DEFAULTS };
        for (const key of BOOL_SETTINGS) {
            if (typeof raw[key] === 'boolean') next[key] = raw[key];
        }
        next.volume = clamp(raw.volume, 0, 1, DEFAULTS.volume);
        next.musicVolume = clamp(raw.musicVolume, 0, 0.5, DEFAULTS.musicVolume);
        next.comboTimeout = clamp(raw.comboTimeout, 3000, 60000, DEFAULTS.comboTimeout);
        if (MUSIC_STYLES.includes(raw.musicStyle)) next.musicStyle = raw.musicStyle;
        const hasPinnedBackgroundTheme = typeof raw.pinnedBackgroundTheme === 'string';
        next.backgroundTheme = normalizeBackgroundTheme(raw.backgroundTheme);
        next.pinnedBackgroundTheme = normalizeBackgroundTheme(
            raw.pinnedBackgroundTheme,
            next.backgroundTheme
        );
        if (hasPinnedBackgroundTheme) next.backgroundTheme = next.pinnedBackgroundTheme;
        if (raw.hudPosition && typeof raw.hudPosition === 'object') {
            const x = Number(raw.hudPosition.x);
            const y = Number(raw.hudPosition.y);
            if (Number.isFinite(x) && Number.isFinite(y)) {
                next.hudPosition = { x, y };
            }
        }
        return next;
    }

    function loadSettings() {
        try { return normalizeSettings(JSON.parse(GM_getValue('mmSettings', '{}'))); }
        catch { return { ...DEFAULTS }; }
    }
    function saveSettings() {
        try { GM_setValue('mmSettings', JSON.stringify(settings)); } catch { /* no-op */ }
    }

    let settings = loadSettings();

    const RECORD_WINDOW_DAYS = 7;

    function emptyRecordDay() {
        return { score: 0, combo: 0, multiplier: 1 };
    }

    function getRecordKey(time = Date.now()) {
        const date = new Date(time);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    function normalizeRecords(raw = {}) {
        const days = raw.days && typeof raw.days === 'object' ? raw.days : {};
        const next = { days: {} };
        for (const [key, val] of Object.entries(days)) {
            if (!/^\d{4}-\d{2}-\d{2}$/.test(key) || !val || typeof val !== 'object') continue;
            next.days[key] = {
                score: Math.max(0, Math.floor(Number(val.score) || 0)),
                combo: Math.max(0, Math.floor(Number(val.combo) || 0)),
                multiplier: Math.max(1, Math.floor(Number(val.multiplier) || 1)),
            };
        }
        return next;
    }

    function loadRecords() {
        try { return normalizeRecords(JSON.parse(GM_getValue('mmRecords', '{}'))); }
        catch { return { days: {} }; }
    }

    function saveRecords() {
        try { GM_setValue('mmRecords', JSON.stringify(records)); } catch { /* no-op */ }
    }

    let records = loadRecords();

    const STATE_INIT = {
        answerStreak: 0, wordStreak: 0, multiplier: 1, score: 0,
        lastCompleted: 0, comboTimer: null,
        sessionCorrect: 0, sessionIncorrect: 0, sessionWords: 0,
        sessionStart: 0, bestStreak: 0, bestMultiplier: 1, sessionActive: false,
    };

    const state = { ...STATE_INIT };

    function resetState() {
        if (state.comboTimer) { clearTimeout(state.comboTimer); }
        Object.assign(state, STATE_INIT, { sessionActive: true, sessionStart: Date.now() });
        firstAnswerTimerStarted = false;
    }

    function recordKeyToTime(key) {
        const [year, month, day] = key.split('-').map(Number);
        return new Date(year, month - 1, day).getTime();
    }

    function pruneRecords() {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const cutoff = todayStart - (RECORD_WINDOW_DAYS - 1) * 24 * 60 * 60 * 1000;
        for (const key of Object.keys(records.days)) {
            if (recordKeyToTime(key) < cutoff) delete records.days[key];
        }
    }

    function getRollingRecords() {
        pruneRecords();
        const best = emptyRecordDay();
        for (const day of Object.values(records.days)) {
            best.score = Math.max(best.score, day.score);
            best.combo = Math.max(best.combo, day.combo);
            best.multiplier = Math.max(best.multiplier, day.multiplier);
        }
        return best;
    }

    function updateRollingRecords() {
        pruneRecords();
        const key = getRecordKey();
        const day = records.days[key] || emptyRecordDay();
        const next = {
            score: Math.max(day.score, state.score),
            combo: Math.max(day.combo, state.answerStreak),
            multiplier: Math.max(day.multiplier, state.multiplier),
        };
        const changed = next.score !== day.score
            || next.combo !== day.combo
            || next.multiplier !== day.multiplier;
        if (changed) {
            records.days[key] = next;
            saveRecords();
        }
    }

    let initialized         = false;
    let gamifyActive        = false;
    let lastUrl             = location.href;
    let lastAnswerState     = null;
    let correctnessObserver = null;
    let counterObserver     = null;
    let comboBarRaf         = null;
    let comboBarStart       = null;
    let hudResizeHandler    = null;
    let hudDrag             = null;
    let rewindSnapshot      = null;
    let pendingRewindRestore = false;
    let timeoutAutoFailing  = false;
    let timeoutInjectedInput = null;
    let firstAnswerTimerStarted = false;
    let firstAnswerInputEl = null;
    let firstAnswerInputHandler = null;
    let previousFontChallengeText = null;
    let documentClickHandler = null;
    let documentKeyHandler   = null;
    let els = {};

    let audioCtx = null;
    let musicGain = null;
    let musicTimer = null;
    let musicPatternIndex = 0;
    let musicGestureHandler = null;
    let musicVisibilityHandler = null;
    const reduceMotionMedia = window.matchMedia?.('(prefers-reduced-motion: reduce)');

    function prefersReducedMotion() {
        return reduceMotionMedia?.matches === true;
    }

    function getAudioCtx() {
        try {
            if (!audioCtx || audioCtx.state === 'closed') {
                audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            }
            if (audioCtx.state === 'suspended') audioCtx.resume();
            return audioCtx;
        } catch { return null; }
    }

    function playTone(freq, duration = 0.12, volume = 0.2, type = 'square', delay = 0) {
        if (!settings.sfxEnabled) return;
        const ctx = getAudioCtx();
        if (!ctx) return;
        try {
            const osc  = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = type;
            osc.frequency.value = freq;
            osc.connect(gain);
            gain.connect(ctx.destination);
            const v = volume * settings.volume, now = ctx.currentTime + delay;
            gain.gain.setValueAtTime(0.0001, now);
            gain.gain.linearRampToValueAtTime(v, now + 0.005);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
            osc.start(now);
            osc.stop(now + duration + 0.01);
        } catch (e) { console.warn('[MMGamify] Audio error:', e); }
    }

    const MUSIC_PROGRESSIONS = [
        [[220.00, 261.63, 329.63], [174.61, 220.00, 261.63],
         [196.00, 246.94, 293.66], [164.81, 207.65, 246.94]],
        [[196.00, 246.94, 293.66], [146.83, 196.00, 246.94],
         [164.81, 207.65, 261.63], [174.61, 220.00, 261.63]],
        [[164.81, 207.65, 246.94], [196.00, 246.94, 293.66],
         [146.83, 185.00, 220.00], [174.61, 220.00, 261.63]],
        [[174.61, 220.00, 261.63], [164.81, 207.65, 246.94],
         [130.81, 164.81, 196.00], [146.83, 185.00, 220.00]],
    ];

    const LOFI_MELODIES = [
        [null, 4, null, 2, null, null, 5, null, 4, null, null, 1, null, 2, null, null],
        [2, null, null, 4, null, 5, null, null, null, 4, null, 2, null, null, 1, null],
        [null, null, 5, null, 4, null, null, 2, null, 1, null, null, 2, null, null, 4],
        [4, null, 2, null, null, 1, null, null, 5, null, null, 4, null, 2, null, null],
    ];

    const RETRO_MELODIES = [
        [0, 2, 4, null, 7, 4, 2, null, 0, 2, 5, null, 4, 2, 0, null],
        [4, null, 2, 0, 2, null, 5, 4, 7, null, 5, 4, 2, null, 0, null],
    ];

    const NOTE_RATIOS = [1, 9 / 8, 5 / 4, 4 / 3, 3 / 2, 5 / 3, 15 / 8, 2];

    function scheduleMusicNote(ctx, destination, frequency, start, duration, options = {}) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();
        osc.type = options.type || 'triangle';
        osc.frequency.setValueAtTime(frequency, start);
        if (options.detune) osc.detune.setValueAtTime(options.detune, start);
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(options.cutoff || 1800, start);
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.linearRampToValueAtTime(options.volume || 0.08, start + 0.025);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(destination);
        osc.start(start);
        osc.stop(start + duration + 0.03);
    }

    function scheduleLofiBar(ctx, destination, start, progression) {
        const beat = 60 / 74;
        progression.forEach((chord, chordIndex) => {
            const chordStart = start + chordIndex * beat * 2;
            chord.forEach((frequency, voice) => {
                scheduleMusicNote(ctx, destination, frequency, chordStart, beat * 1.85, {
                    type: 'triangle',
                    volume: voice === 0 ? 0.045 : 0.032,
                    cutoff: 950,
                    detune: (voice - 1) * 4,
                });
            });
            const bassDelay = chordIndex % 2 === musicPatternIndex % 2 ? 0 : beat / 2;
            scheduleMusicNote(ctx, destination, chord[0] / 2, chordStart + bassDelay, beat * 0.72, {
                type: 'sine', volume: 0.055, cutoff: 520,
            });
        });

        const melody = LOFI_MELODIES[musicPatternIndex % LOFI_MELODIES.length];
        melody.forEach((degree, step) => {
            if (degree === null) return;
            const chordIndex = Math.min(3, Math.floor(step / 4));
            const root = progression[chordIndex][0] * 2;
            const octave = (musicPatternIndex + step) % 11 === 0 ? 2 : 1;
            scheduleMusicNote(ctx, destination, root * NOTE_RATIOS[degree] * octave,
                start + step * beat / 2, beat * (step % 4 === 3 ? 0.62 : 0.38), {
                    type: 'sine',
                    volume: octave === 2 ? 0.014 : 0.022,
                    cutoff: octave === 2 ? 1550 : 1150,
                });
        });
        return beat * 8;
    }

    function scheduleRetroBar(ctx, destination, start, progression) {
        const beat = 60 / 104;
        const melody = RETRO_MELODIES[musicPatternIndex % RETRO_MELODIES.length];
        const root = progression[musicPatternIndex % progression.length][0];
        melody.forEach((degree, step) => {
            if (degree === null) return;
            scheduleMusicNote(ctx, destination, root * 2 * NOTE_RATIOS[degree],
                start + step * beat / 2, beat * 0.38, {
                    type: step % 4 === 0 ? 'square' : 'triangle',
                    volume: 0.035,
                    cutoff: 2100,
                });
        });
        progression.forEach((chord, index) => {
            const chordStart = start + index * beat * 2;
            scheduleMusicNote(ctx, destination, chord[0] / 2, chordStart, beat * 0.7, {
                type: 'square', volume: 0.035, cutoff: 700,
            });
            chord.slice(1).forEach(frequency => {
                scheduleMusicNote(ctx, destination, frequency, chordStart, beat * 1.75, {
                    type: 'triangle', volume: 0.018, cutoff: 1300,
                });
            });
        });
        return beat * 8;
    }

    function scheduleNextMusicPattern() {
        if (!musicGain || !settings.musicEnabled || !state.sessionActive || document.hidden) return;
        const ctx = getAudioCtx();
        if (!ctx) return;
        const start = ctx.currentTime + 0.08;
        const progression = MUSIC_PROGRESSIONS[musicPatternIndex % MUSIC_PROGRESSIONS.length];
        const duration = settings.musicStyle === 'retro'
            ? scheduleRetroBar(ctx, musicGain, start, progression)
            : scheduleLofiBar(ctx, musicGain, start, progression);
        musicPatternIndex++;
        musicTimer = setTimeout(scheduleNextMusicPattern, Math.max(100, (duration - 0.12) * 1000));
    }

    function stopMusic(fadeSeconds = 0.35) {
        if (musicTimer) {
            clearTimeout(musicTimer);
            musicTimer = null;
        }
        if (!musicGain || !audioCtx || audioCtx.state === 'closed') {
            musicGain = null;
            return;
        }
        const gain = musicGain;
        musicGain = null;
        const now = audioCtx.currentTime;
        gain.gain.cancelScheduledValues(now);
        gain.gain.setValueAtTime(gain.gain.value, now);
        gain.gain.linearRampToValueAtTime(0, now + fadeSeconds);
        setTimeout(() => gain.disconnect(), (fadeSeconds + 0.1) * 1000);
    }

    function startMusic() {
        if (!settings.musicEnabled || !state.sessionActive || document.hidden || musicGain) return;
        const ctx = getAudioCtx();
        if (!ctx) return;
        musicGain = ctx.createGain();
        musicGain.gain.setValueAtTime(0, ctx.currentTime);
        musicGain.gain.linearRampToValueAtTime(settings.musicVolume, ctx.currentTime + 0.7);
        musicGain.connect(ctx.destination);
        scheduleNextMusicPattern();
    }

    function restartMusic() {
        stopMusic(0.15);
        musicPatternIndex = 0;
        setTimeout(startMusic, 180);
    }

    function installMusicLifecycle() {
        if (!musicGestureHandler) {
            musicGestureHandler = () => {
                if (settings.musicEnabled) startMusic();
                if (musicGain || !settings.musicEnabled) {
                    document.removeEventListener('pointerdown', musicGestureHandler, true);
                    document.removeEventListener('keydown', musicGestureHandler, true);
                    musicGestureHandler = null;
                }
            };
            document.addEventListener('pointerdown', musicGestureHandler, true);
            document.addEventListener('keydown', musicGestureHandler, true);
        }
        if (!musicVisibilityHandler) {
            musicVisibilityHandler = () => {
                if (document.hidden) stopMusic(0.2);
                else startMusic();
            };
            document.addEventListener('visibilitychange', musicVisibilityHandler);
        }
    }

    function uninstallMusicLifecycle() {
        stopMusic();
        if (musicGestureHandler) {
            document.removeEventListener('pointerdown', musicGestureHandler, true);
            document.removeEventListener('keydown', musicGestureHandler, true);
            musicGestureHandler = null;
        }
        if (musicVisibilityHandler) {
            document.removeEventListener('visibilitychange', musicVisibilityHandler);
            musicVisibilityHandler = null;
        }
    }

    function playCorrectSound() {
        const freq = Math.min(440 + state.answerStreak * 20, 1200);
        const vol  = Math.min(0.22, 0.12 + state.answerStreak * 0.003);
        playTone(freq, 0.09, vol);
        if (state.answerStreak % 5  === 0) playTone(freq * 1.5, 0.12, 0.15, 'square',   0.04);
        if (state.answerStreak % 10 === 0) playTone(freq * 2,   0.15, 0.12, 'triangle', 0.08);
        if (state.answerStreak % 20 === 0) {
            [1, 1.25, 1.5, 2].forEach((r, i) => playTone(freq * r, 0.2, 0.18, 'triangle', i * 0.06));
        }
        if (Math.random() < 0.07) playTone(freq * 2.5, 0.2, 0.28, 'sine', 0.03);
    }

    function playFailSound() {
        playTone(300,   0.15, 0.25, 'sawtooth');
        playTone(180,   0.20, 0.20, 'sawtooth', 0.12);
    }

    function playWordCompleteSound() {
        const extra = Math.min(state.wordStreak * 6, 120);
        [523, 659, 784].forEach((n, i) => playTone(n + extra, 0.18, 0.22, 'triangle', i * 0.12));
    }

    function playMultiplierUpSound(mult) {
        const f = [330, 440, 550, 660, 880][Math.min(mult - 1, 4)];
        playTone(f,       0.10, 0.20, 'square');
        playTone(f * 1.5, 0.14, 0.18, 'square',   0.06);
        playTone(f * 2,   0.18, 0.14, 'triangle', 0.12);
    }

    function playComboBreakSound() {
        [400, 300, 200].forEach((f, i) => playTone(f, 0.18, 0.22, 'sawtooth', i * 0.08));
    }

    function playSessionEndSound() {
        [523, 659, 784, 1047].forEach((f, i) => playTone(f, 0.22, 0.20, 'triangle', i * 0.14));
        setTimeout(() => playTone(1047, 0.4, 0.25, 'sine'), 650);
    }

    function getDifficultyXpMultiplier() {
        let mult = 1;
        if (settings.autoFailTimeout) mult *= 1.25;
        if (settings.fontChallengeEnabled) mult *= 1.15;
        return mult;
    }

    function calcAnswerPoints(multiplier) {
        return Math.round((100 * multiplier * getDifficultyXpMultiplier()) / 10) * 10;
    }

    function injectStyles() {
        if (document.getElementById('mm-gamify-styles')) return;
        const s = document.createElement('style');
        s.id = 'mm-gamify-styles';
        s.textContent = `
        @font-face {
            font-family: 'MM Arcade Local';
            src: local('Press Start 2P'), local('PressStart2P-Regular'),
                 local('Pixel Emulator'), local('Pixeled'), local('Silkscreen');
            font-display: swap;
        }

        :root {
            --mm-arcade-font: 'MM Arcade Local', 'Silkscreen', 'Monaco',
                'Consolas', 'Courier New', monospace;
        }

        /* ── SHARED ── */
        #mm-hud, #mm-settings, #mm-summary {
            font-family: var(--mm-arcade-font);
        }

        /* ── HUD ── */
        #mm-hud {
            position: fixed; top: 20px; left: 20px;
            background: rgba(0,0,0,0.85);
            border: 2px solid rgba(255,255,255,0.12);
            color: #fff; padding: 10px 16px 12px; border-radius: 8px;
            font-size: 11px; z-index: 9999; min-width: 180px;
            line-height: 1.8; image-rendering: pixelated;
            cursor: grab; touch-action: none;
            transition: box-shadow 0.2s ease, opacity 0.3s; user-select: none;
        }
        #mm-hud.dragging { cursor: grabbing; opacity: 0.92; }
        #mm-hud.hidden  { opacity: 0; pointer-events: none; }
        #mm-hud.glow    { box-shadow: 0 0 18px 4px #f90; }
        #mm-hud.danger  { box-shadow: 0 0 18px 4px #f33; }

        /* label rows — shared style */
        #mm-hud-score-label, #mm-hud-combo-label, #mm-hud-mult-label,
        #mm-hud-streak-label, #mm-hud-acc-label, #mm-hud-record-label,
        #mm-hud-bonus-label { color: #aaa; font-size: 8px; }
        #mm-hud-combo-label, #mm-hud-mult-label,
        #mm-hud-streak-label, #mm-hud-acc-label, #mm-hud-record-label,
        #mm-hud-bonus-label { margin-top: 4px; }

        #mm-hud-score  { color: #ffe066; font-size: 13px; }
        #mm-hud-combo  { color: #7cf;    font-size: 13px; }
        #mm-hud-mult   { color: #f90;    font-size: 13px; }
        #mm-hud-streak { color: #7f7;    font-size: 13px; }
        #mm-hud-acc    { color: #c9f;    font-size: 11px; }
        #mm-hud-bonus  { color: #f90;    font-size: 11px; }
        #mm-hud-record { color: #ffe066; font-size: 8px; line-height: 1.7; }
        #mm-hud-record span { color: #7cf; }

        #mm-hud-settings-btn {
            display: block; margin-top: 10px;
            background: none; border: 1px solid rgba(255,255,255,0.2);
            color: #aaa; font-family: inherit; font-size: 7px;
            padding: 4px 6px; border-radius: 4px; cursor: pointer;
            width: 100%; text-align: center;
        }
        #mm-hud-rewind-btn {
            display: block; margin-top: 8px;
            background: rgba(255,153,0,0.08);
            border: 1px solid rgba(255,153,0,0.35);
            color: #f90; font-family: inherit; font-size: 7px;
            padding: 4px 6px; border-radius: 4px; cursor: pointer;
            width: 100%; text-align: center;
        }
        #mm-hud-settings-btn:hover, #mm-hud-rewind-btn:hover { border-color: #f90; color: #f90; }
        #mm-hud-rewind-btn:disabled {
            opacity: 0.35; cursor: not-allowed; border-color: rgba(255,255,255,0.15);
            color: #aaa; background: none;
        }

        /* combo bar */
        #mm-combo-bar-wrap {
            margin-top: 8px; height: 4px;
            background: rgba(255,255,255,0.1); border-radius: 2px; overflow: hidden;
        }
        #mm-combo-bar {
            height: 100%; width: 100%; border-radius: 2px;
            background: linear-gradient(90deg, #f90, #ffe066);
            transition: background 0.3s;
        }
        #mm-combo-bar.low { background: linear-gradient(90deg, #f33, #f93); }

        /* ── FLOATING TEXT ── */
        .mm-float {
            position: fixed; pointer-events: none;
            font-family: var(--mm-arcade-font); font-size: 14px; font-weight: bold;
            z-index: 10000; animation: mmFloat 0.9s ease-out forwards;
            text-shadow: 0 2px 6px rgba(0,0,0,0.8); white-space: nowrap;
        }
        .mm-float.correct   { color: #ffe066; }
        .mm-float.incorrect { color: #f55; }
        .mm-float.wordwin   { color: #7f7;  font-size: 16px; }
        .mm-float.milestone { color: #f0f;  font-size: 20px; }
        .mm-float.rewind    { color: #7cf;  font-size: 14px; }
        @keyframes mmFloat {
            0%   { opacity: 1; transform: translateY(0)     scale(1);   }
            60%  { opacity: 1; transform: translateY(-38px)  scale(1.1); }
            100% { opacity: 0; transform: translateY(-64px)  scale(0.9); }
        }

        /* ── BANNERS ── */
        #mm-mult-banner, #mm-milestone-banner {
            position: fixed; left: 50%;
            transform: translateX(-50%) scale(0);
            font-family: var(--mm-arcade-font);
            z-index: 10001; pointer-events: none;
            opacity: 0; white-space: nowrap;
        }
        #mm-mult-banner {
            top: 20%; font-size: 28px; color: #fff;
            text-shadow: 0 0 20px #f90, 0 0 40px #f90;
        }
        #mm-milestone-banner {
            top: 35%; font-size: 18px; color: #f0f;
            text-shadow: 0 0 16px #f0f, 0 0 32px #80f;
        }
        #mm-mult-banner.show     { animation: mmBannerPop 0.8s cubic-bezier(0.34,1.56,0.64,1) forwards; }
        #mm-milestone-banner.show{ animation: mmBannerPop 1.0s cubic-bezier(0.34,1.56,0.64,1) forwards; }
        @keyframes mmBannerPop {
            0%   { opacity:0; transform: translateX(-50%) scale(0.2);  }
            50%  { opacity:1; transform: translateX(-50%) scale(1.15); }
            75%  {            transform: translateX(-50%) scale(0.95); }
            85%  { opacity:1; transform: translateX(-50%) scale(1.0);  }
            100% { opacity:0; transform: translateX(-50%) scale(1.0);  }
        }

        /* ── CELEBRATE ── */
        .mm-celebrate {
            --mm-celebrate-x: 0px;
            --mm-celebrate-rot: 0deg;
            position: fixed; pointer-events: none; font-size: 52px; z-index: 9998;
            transform: translate(-50%, -50%);
            filter: drop-shadow(0 0 10px rgba(255,255,255,0.35));
        }
        .mm-celebrate.pop   { animation: mmCelebratePop   0.75s ease forwards; }
        .mm-celebrate.rise  { animation: mmCelebrateRise  0.95s ease-out forwards; }
        .mm-celebrate.spin  { animation: mmCelebrateSpin  0.85s cubic-bezier(0.34,1.56,0.64,1) forwards; }
        .mm-celebrate.burst { animation: mmCelebrateBurst 0.90s ease-out forwards; }
        @keyframes mmCelebratePop {
            0%  { opacity:0; transform: translate(-50%, -50%) scale(0.4);  }
            35% { opacity:1; transform: translate(-50%, -50%) scale(1.25); }
            100%{ opacity:0; transform: translate(-50%, -50%) scale(1.7);  }
        }
        @keyframes mmCelebrateRise {
            0%  { opacity:0; transform: translate(-50%, -30%) scale(0.65); }
            30% { opacity:1; transform: translate(-50%, -70%) scale(1.15); }
            100%{ opacity:0; transform: translate(calc(-50% + var(--mm-celebrate-x)), -170%) scale(0.85); }
        }
        @keyframes mmCelebrateSpin {
            0%  { opacity:0; transform: translate(-50%, -50%) rotate(-24deg) scale(0.35); }
            45% { opacity:1; transform: translate(-50%, -50%) rotate(var(--mm-celebrate-rot)) scale(1.3); }
            100%{ opacity:0; transform: translate(-50%, -50%) rotate(calc(var(--mm-celebrate-rot) * 2)) scale(0.75); }
        }
        @keyframes mmCelebrateBurst {
            0%  { opacity:0; transform: translate(-50%, -50%) scale(0.2);  }
            25% { opacity:1; transform: translate(-50%, -50%) scale(1.45); }
            60% { opacity:1; transform: translate(calc(-50% + var(--mm-celebrate-x)), -95%) scale(1); }
            100%{ opacity:0; transform: translate(calc(-50% + var(--mm-celebrate-x)), -135%) scale(0.45); }
        }

        /* ── SCREEN FLASH ── */
        #mm-flash { position: fixed; inset: 0; pointer-events: none; z-index: 10002; opacity: 0; }
        #mm-flash.correct-flash { background: rgba(100,255,150,0.18); animation: mmFlash 0.3s ease forwards; }
        #mm-flash.wrong-flash   { background: rgba(255,60,60,0.28);   animation: mmFlash 0.4s ease forwards; }
        @keyframes mmFlash { 0%{ opacity:1; } 100%{ opacity:0; } }

        /* ── SHAKE ── */
        @keyframes mmShakeLight {
            0%,100%{ transform:translate(0,0); }
            20%    { transform:translate(-3px, 2px); } 40%{ transform:translate(3px,-2px); }
            60%    { transform:translate(-2px, 3px); } 80%{ transform:translate(2px,-1px); }
        }
        @keyframes mmShakeHard {
            0%,100%{ transform:translate(0,0) rotate(0deg); }
            15%{ transform:translate(-6px, 4px) rotate(-0.4deg); }
            30%{ transform:translate(6px,-4px) rotate( 0.4deg); }
            45%{ transform:translate(-4px, 6px) rotate(-0.3deg); }
            60%{ transform:translate(4px,-3px) rotate( 0.3deg); }
            75%{ transform:translate(-3px, 3px) rotate(-0.2deg); }
        }
        body.mm-shake-light { animation: mmShakeLight 0.35s ease; }
        body.mm-shake-hard  { animation: mmShakeHard  0.45s ease; }

        /* ── UTILITY ANIMATIONS ── */
        .mm-pulse          { animation: mmPulse  0.35s ease; }
        .mm-bounce         { animation: mmBounce 0.60s ease; }
        .mm-progress-glow  { animation: mmGlow   0.60s ease; }
        @keyframes mmPulse  { 0%,100%{transform:scale(1);}   50%{transform:scale(1.15);} }
        @keyframes mmBounce { 0%,100%{transform:scale(1);}   30%{transform:scale(1.3);} 60%{transform:scale(0.9);} }
        @keyframes mmGlow   { 0%,100%{box-shadow:none;}      50%{box-shadow:0 0 18px gold;} }

        /* ── SETTINGS PANEL ── */
        #mm-settings {
            display: none; position: fixed; bottom: 20px; left: 210px;
            background: rgba(0,0,0,0.92); border: 2px solid rgba(255,255,255,0.15);
            border-radius: 8px; padding: 14px 18px; font-size: 9px;
            color: #fff; z-index: 10003; min-width: 220px; line-height: 2;
        }
        #mm-settings.open { display: block; }
        #mm-settings h3 {
            font-size: 10px; color: #f90; margin: 0 0 10px;
            border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 6px;
        }
        .mm-setting-row {
            display: flex; justify-content: space-between;
            align-items: center; margin-bottom: 6px;
        }
        .mm-setting-row label { color: #ccc; }
        .mm-toggle {
            width: 28px; height: 14px; background: #444;
            border-radius: 7px; position: relative;
            cursor: pointer; border: none; flex-shrink: 0; transition: background 0.2s;
        }
        .mm-toggle.on { background: #f90; }
        .mm-toggle::after {
            content: ''; position: absolute;
            width: 10px; height: 10px; background: #fff;
            border-radius: 50%; top: 2px; left: 2px; transition: left 0.2s;
        }
        .mm-toggle.on::after { left: 16px; }
        .mm-cycle-btn {
            background: rgba(0,180,255,0.08);
            border: 1px solid rgba(0,180,255,0.28);
            color: #7cf; font-family: inherit; font-size: 7px;
            padding: 4px 6px; border-radius: 4px; cursor: pointer;
            min-width: 86px; text-align: center;
        }
        .mm-cycle-btn:hover { border-color: #7cf; color: #fff; }
        #mm-vol-slider, #mm-music-vol-slider {
            -webkit-appearance: none; width: 80px; height: 4px;
            background: #555; border-radius: 2px; outline: none; cursor: pointer;
        }
        #mm-vol-slider::-webkit-slider-thumb, #mm-music-vol-slider::-webkit-slider-thumb {
            -webkit-appearance: none; width: 12px; height: 12px;
            background: #f90; border-radius: 50%;
        }

        /* shared close/action button style */
        .mm-btn-outline {
            display: block; width: 100%; margin-top: 10px; background: none;
            border: 1px solid rgba(255,255,255,0.2); color: #aaa;
            font-family: var(--mm-arcade-font); font-size: 7px;
            padding: 4px; border-radius: 4px; cursor: pointer; text-align: center;
        }
        .mm-btn-outline:hover { border-color: #f90; color: #f90; }

        /* ── SESSION SUMMARY ── */
        #mm-summary {
            display: none; position: fixed; inset: 0;
            background: rgba(0,0,0,0.88); z-index: 10010;
            align-items: center; justify-content: center; flex-direction: column;
        }
        #mm-summary.open { display: flex; }
        #mm-summary-inner {
            background: #111; border: 2px solid #f90; border-radius: 12px;
            padding: 32px 40px; text-align: center; max-width: 480px; width: 90%;
            animation: mmSummaryIn 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards;
        }
        @keyframes mmSummaryIn { from{transform:scale(0.5);opacity:0;} to{transform:scale(1);opacity:1;} }
        #mm-summary h2 { color: #f90; font-size: 18px; margin: 0 0 24px; letter-spacing: 2px; }
        #mm-grade      { font-size: 42px; margin: 0 0 18px; line-height: 1; }
        .mm-summary-grid {
            display: grid; grid-template-columns: 1fr 1fr;
            gap: 14px 24px; text-align: left; margin-bottom: 24px;
        }
        .mm-summary-cell { color: #aaa; font-size: 8px; line-height: 2; }
        .mm-summary-val  { color: #fff; font-size: 13px; display: block; }
        .mm-summary-val.gold   { color: #ffe066; }
        .mm-summary-val.green  { color: #7f7; }
        .mm-summary-val.cyan   { color: #7cf; }
        .mm-summary-val.orange { color: #f90; }
        .mm-summary-val.pink   { color: #f0f; }
        #mm-summary-close {
            background: #f90; border: none; color: #000;
            font-family: var(--mm-arcade-font); font-size: 10px;
            padding: 10px 24px; border-radius: 6px; cursor: pointer;
        }
        #mm-summary-close:hover { background: #ffb300; }

        body.mm-wrong-dim { filter: grayscale(0.7) brightness(0.85); }

        @media (prefers-reduced-motion: reduce) {
            #mm-hud, #mm-combo-bar, .mm-toggle::after,
            .mm-float, #mm-mult-banner, #mm-milestone-banner,
            .mm-celebrate, #mm-flash, body.mm-shake-light,
            body.mm-shake-hard, .mm-pulse, .mm-bounce,
            .mm-progress-glow, #mm-summary-inner {
                animation: none !important;
                transition: none !important;
            }

            .mm-float, #mm-mult-banner, #mm-milestone-banner,
            .mm-celebrate, #mm-flash {
                opacity: 0 !important;
            }
        }
        `;
        document.head.appendChild(s);
    }

    function injectUI() {
        if (document.getElementById('mm-hud')) return;

        const frag = document.createDocumentFragment();

        const hud = el('div', 'mm-hud', `
            <div id="mm-hud-score-label">SCORE</div>
            <div id="mm-hud-score">0</div>
            <div id="mm-hud-combo-label">COMBO</div>
            <div id="mm-hud-combo">x0</div>
            <div id="mm-hud-mult-label">MULTIPLIER</div>
            <div id="mm-hud-mult">x1</div>
            <div id="mm-hud-streak-label">WORD STREAK</div>
            <div id="mm-hud-streak">0</div>
            <div id="mm-hud-acc-label">ACCURACY</div>
            <div id="mm-hud-acc">—</div>
            <div id="mm-hud-bonus-label">XP BONUS</div>
            <div id="mm-hud-bonus">x1.00</div>
            <div id="mm-hud-record-label">7D BEST</div>
            <div id="mm-hud-record">S <span>0</span> / C <span>x0</span> / M <span>x1</span></div>
            <div id="mm-combo-bar-wrap"><div id="mm-combo-bar"></div></div>
            <button id="mm-hud-rewind-btn" disabled>⟲ REWIND</button>
            <button id="mm-hud-settings-btn">⚙ SETTINGS</button>
        `);
        if (!settings.hudEnabled) hud.classList.add('hidden');
        frag.appendChild(hud);
        frag.appendChild(el('div', 'mm-flash'));
        frag.appendChild(el('div', 'mm-mult-banner'));
        frag.appendChild(el('div', 'mm-milestone-banner'));
        frag.appendChild(buildSettingsPanel());
        document.body.appendChild(frag);

        els = {
            hud,
            score:   document.getElementById('mm-hud-score'),
            combo:   document.getElementById('mm-hud-combo'),
            mult:    document.getElementById('mm-hud-mult'),
            streak:  document.getElementById('mm-hud-streak'),
            acc:     document.getElementById('mm-hud-acc'),
            bonus:   document.getElementById('mm-hud-bonus'),
            record:  document.getElementById('mm-hud-record'),
            flash:   document.getElementById('mm-flash'),
            bar:     document.getElementById('mm-combo-bar'),
            rewind:  document.getElementById('mm-hud-rewind-btn'),
            settings: document.getElementById('mm-settings'),
        };

        applyHudPosition(settings.hudPosition);
        installHudDrag();

        hud.querySelector('#mm-hud-settings-btn')
           .addEventListener('click', () => {
               els.settings.classList.toggle('open');
               if (els.settings.classList.contains('open')) positionSettingsPanel();
           });
        hud.querySelector('#mm-hud-rewind-btn')
           .addEventListener('click', () => requestRewind('hud'));

        wireSettingsPanel();
    }

    function el(tag, id, html = '') {
        const node = document.createElement(tag);
        node.id = id;
        if (html) node.innerHTML = html;
        return node;
    }

    function clampHudPosition(pos, hud = els.hud) {
        const margin = 20;
        const width = hud?.offsetWidth || 220;
        const height = hud?.offsetHeight || 330;
        const maxX = Math.max(margin, window.innerWidth - width - margin);
        const maxY = Math.max(margin, window.innerHeight - height - margin);
        return {
            x: clamp(pos?.x, margin, maxX, margin),
            y: clamp(pos?.y, margin, maxY, margin),
        };
    }

    function getDefaultHudPosition() {
        const margin = 20;
        const raisedBottom = 170;
        const hudHeight = els.hud?.offsetHeight || 330;
        return {
            x: margin,
            y: Math.max(margin, window.innerHeight - hudHeight - raisedBottom),
        };
    }

    function applyHudPosition(pos) {
        if (!els.hud) return null;
        const next = clampHudPosition(pos || getDefaultHudPosition());
        els.hud.style.left = `${next.x}px`;
        els.hud.style.top = `${next.y}px`;
        els.hud.style.right = 'auto';
        els.hud.style.bottom = 'auto';
        positionSettingsPanel();
        return next;
    }

    function positionSettingsPanel() {
        if (!els.hud || !els.settings) return;
        const margin = 12;
        const hudRect = els.hud.getBoundingClientRect();
        const panelWidth = els.settings.offsetWidth || 260;
        const panelHeight = els.settings.offsetHeight || 300;
        const rightSideX = hudRect.right + margin;
        const leftSideX = hudRect.left - panelWidth - margin;
        const x = rightSideX + panelWidth <= window.innerWidth - margin
            ? rightSideX
            : Math.max(margin, leftSideX);
        const y = clamp(hudRect.top, margin, window.innerHeight - panelHeight - margin, margin);
        els.settings.style.left = `${x}px`;
        els.settings.style.top = `${y}px`;
        els.settings.style.right = 'auto';
        els.settings.style.bottom = 'auto';
    }

    function installHudDrag() {
        if (!els.hud) return;

        hudResizeHandler = () => {
            const next = applyHudPosition(settings.hudPosition);
            if (settings.hudPosition && next) {
                settings.hudPosition = next;
                saveSettings();
            }
        };
        window.addEventListener('resize', hudResizeHandler);

        els.hud.addEventListener('pointerdown', event => {
            if (event.button !== 0 || event.target.closest?.('button, input, label, a')) return;
            const rect = els.hud.getBoundingClientRect();
            hudDrag = {
                pointerId: event.pointerId,
                offsetX: event.clientX - rect.left,
                offsetY: event.clientY - rect.top,
            };
            els.hud.classList.add('dragging');
            els.hud.setPointerCapture?.(event.pointerId);
            event.preventDefault();
        });

        els.hud.addEventListener('pointermove', event => {
            if (!hudDrag || hudDrag.pointerId !== event.pointerId) return;
            const next = applyHudPosition({
                x: event.clientX - hudDrag.offsetX,
                y: event.clientY - hudDrag.offsetY,
            });
            if (next) settings.hudPosition = next;
        });

        const stopDrag = event => {
            if (!hudDrag || hudDrag.pointerId !== event.pointerId) return;
            els.hud.releasePointerCapture?.(event.pointerId);
            els.hud.classList.remove('dragging');
            hudDrag = null;
            saveSettings();
        };

        els.hud.addEventListener('pointerup', stopDrag);
        els.hud.addEventListener('pointercancel', stopDrag);
    }

    const REWIND_KEYS = [
        'answerStreak', 'wordStreak', 'multiplier', 'score', 'lastCompleted',
        'sessionCorrect', 'sessionIncorrect', 'sessionWords', 'sessionStart',
        'bestStreak', 'bestMultiplier', 'sessionActive',
    ];

    function makeRewindSnapshot(kind) {
        const snapshot = {
            kind,
            records: normalizeRecords(JSON.parse(JSON.stringify(records))),
        };
        for (const key of REWIND_KEYS) {
            snapshot[key] = state[key];
        }
        return snapshot;
    }

    function setRewindSnapshot(snapshot) {
        rewindSnapshot = snapshot;
        updateRewindButton();
    }

    function updateRewindButton() {
        if (els.rewind) {
            els.rewind.disabled = !rewindSnapshot;
        }
    }

    function restoreRewindSnapshot(source = 'unknown') {
        if (!rewindSnapshot) return false;
        if (state.comboTimer) {
            clearTimeout(state.comboTimer);
            state.comboTimer = null;
        }

        for (const key of REWIND_KEYS) {
            state[key] = rewindSnapshot[key];
        }
        records = normalizeRecords(rewindSnapshot.records);
        saveRecords();

        rewindSnapshot = null;
        pendingRewindRestore = false;
        lastAnswerState = null;
        updateHUD();
        updateRewindButton();
        resetComboTimer();
        spawnFloat('REWIND', 'rewind', els.hud);
        console.warn(`[MMGamify] Rewound last ${source} answer.`);
        return true;
    }

    function findNativeRewindControl() {
        const controls = document.querySelectorAll('button, [role="button"]');
        return Array.from(controls).find(control => {
            if (control.id?.startsWith('mm-')) return false;
            if (control.getClientRects().length === 0) return false;
            const text = control.textContent?.trim().toLowerCase();
            return text === 'redo' || text === 'undo';
        }) || null;
    }

    function requestRewind(source) {
        if (!rewindSnapshot) return false;
        pendingRewindRestore = true;
        const nativeControl = findNativeRewindControl();
        if (nativeControl) {
            nativeControl.click();
            setTimeout(() => restoreRewindSnapshot(source), 80);
        } else {
            restoreRewindSnapshot(source);
        }
        return true;
    }

    function installNativeRewindDetection() {
        if (documentClickHandler || documentKeyHandler) return;

        documentClickHandler = event => {
            const control = event.target.closest?.('button, [role="button"]');
            if (!control || control.id?.startsWith('mm-') || !rewindSnapshot) return;
            const text = control.textContent?.trim().toLowerCase();
            if (text === 'redo' || text === 'undo') {
                pendingRewindRestore = true;
                setTimeout(() => restoreRewindSnapshot('native'), 80);
            }
        };

        documentKeyHandler = event => {
            if (!rewindSnapshot || !lastAnswerState || event.key !== 'Backspace') return;
            pendingRewindRestore = true;
            setTimeout(() => {
                const wrapper = getInputWrapper();
                const resolved = wrapper?.classList.contains('correct')
                    || wrapper?.classList.contains('incorrect');
                if (pendingRewindRestore && !resolved) restoreRewindSnapshot('keyboard');
                if (pendingRewindRestore && resolved) pendingRewindRestore = false;
            }, 120);
        };

        document.addEventListener('click', documentClickHandler, true);
        document.addEventListener('keydown', documentKeyHandler, true);
    }

    function uninstallNativeRewindDetection() {
        if (documentClickHandler) {
            document.removeEventListener('click', documentClickHandler, true);
            documentClickHandler = null;
        }
        if (documentKeyHandler) {
            document.removeEventListener('keydown', documentKeyHandler, true);
            documentKeyHandler = null;
        }
    }

    function updateHUD() {
        if (!els.score) return;
        updateRollingRecords();
        const rollingRecords = getRollingRecords();
        const total = state.sessionCorrect + state.sessionIncorrect;
        els.score.textContent  = state.score.toLocaleString();
        els.combo.textContent  = `x${state.answerStreak}`;
        els.mult.textContent   = `x${state.multiplier}`;
        els.streak.textContent = state.wordStreak;
        els.acc.textContent    = total > 0
            ? `${Math.round(state.sessionCorrect / total * 100)}%` : '—';
        els.bonus.textContent = `x${getDifficultyXpMultiplier().toFixed(2)}`;
        els.record.innerHTML = `S <span>${rollingRecords.score.toLocaleString()}</span> / `
            + `C <span>x${rollingRecords.combo}</span> / M <span>x${rollingRecords.multiplier}</span>`;

        els.hud.classList.toggle('glow',   state.answerStreak >= 10);
        els.hud.classList.toggle('danger', state.answerStreak === 0 && state.sessionIncorrect > 0);
        updateRewindButton();
    }

    const TOGGLES = [
        ['sfxEnabled',     'Sound FX'],
        ['visualsEnabled', 'Visuals'],
        ['hudEnabled',     'HUD'],
        ['shakeEnabled',   'Screen Shake'],
        ['floatEnabled',   'Floating Text'],
        ['flashEnabled',   'Screen Flash'],
        ['arcadeEnabled',  'CRT Theme'],
        ['musicEnabled',   'Music'],
        ['autoFailTimeout', 'Timeout Fail'],
        ['fontChallengeEnabled', 'Font Challenge'],
    ];

    function buildSettingsPanel() {
        const rows = TOGGLES.map(([key, label]) => `
            <div class="mm-setting-row">
                <label id="mm-label-${key}">${label}</label>
                <button class="mm-toggle ${settings[key] ? 'on' : ''}" data-key="${key}"
                    aria-labelledby="mm-label-${key}" aria-pressed="${settings[key]}"></button>
            </div>`).join('');

        return el('div', 'mm-settings', `
            <h3>⚙ SETTINGS</h3>
            ${rows}
            <div class="mm-setting-row">
                <label>SFX Volume</label>
                <input id="mm-vol-slider" type="range" min="0" max="1" step="0.05" value="${settings.volume}">
            </div>
            <div class="mm-setting-row">
                <label>Music Style</label>
                <button class="mm-cycle-btn" id="mm-music-style" type="button">
                    ${MUSIC_STYLE_LABELS[settings.musicStyle]}
                </button>
            </div>
            <div class="mm-setting-row">
                <label>Music Volume</label>
                <input id="mm-music-vol-slider" type="range" min="0" max="0.5" step="0.01"
                    value="${settings.musicVolume}">
            </div>
            <div class="mm-setting-row">
                <label>Background</label>
                <button class="mm-cycle-btn" id="mm-bg-theme" type="button">
                    ${BACKGROUND_THEME_LABELS[settings.backgroundTheme]}
                </button>
            </div>
            <div class="mm-setting-row">
                <label>Pinned Default</label>
                <button class="mm-cycle-btn" id="mm-pinned-bg-theme" type="button">
                    ${BACKGROUND_THEME_LABELS[settings.pinnedBackgroundTheme]}
                </button>
            </div>
            <button class="mm-btn-outline" id="mm-pin-bg">PIN CURRENT BACKGROUND</button>
            <button class="mm-btn-outline" id="mm-use-pinned-bg">USE PINNED BACKGROUND</button>
            <button class="mm-btn-outline" id="mm-reset-hud">RESET HUD POSITION</button>
            <button class="mm-btn-outline" id="mm-reset-records">RESET 7D RECORDS</button>
            <button class="mm-btn-outline" id="mm-settings-close">CLOSE</button>
        `);
    }

    function wireSettingsPanel() {
        const panel = els.settings;

        panel.querySelectorAll('.mm-toggle').forEach(btn => {
            btn.addEventListener('click', () => {
                const key = btn.dataset.key;
                settings[key] = !settings[key];
                btn.classList.toggle('on', settings[key]);
                btn.setAttribute('aria-pressed', String(settings[key]));
                saveSettings();
                applySettingSideEffects(key);
            });
        });

        panel.querySelector('#mm-vol-slider').addEventListener('input', e => {
            settings.volume = clamp(e.target.value, 0, 1, DEFAULTS.volume);
            saveSettings();
        });

        panel.querySelector('#mm-music-style').addEventListener('click', e => {
            const current = MUSIC_STYLES.indexOf(settings.musicStyle);
            settings.musicStyle = MUSIC_STYLES[(current + 1) % MUSIC_STYLES.length];
            e.currentTarget.textContent = MUSIC_STYLE_LABELS[settings.musicStyle];
            saveSettings();
            if (settings.musicEnabled) restartMusic();
        });

        panel.querySelector('#mm-music-vol-slider').addEventListener('input', e => {
            settings.musicVolume = clamp(e.target.value, 0, 0.5, DEFAULTS.musicVolume);
            if (musicGain && audioCtx) {
                musicGain.gain.setTargetAtTime(
                    settings.musicVolume, audioCtx.currentTime, 0.05
                );
            }
            saveSettings();
        });

        const updateBackgroundButtons = () => {
            panel.querySelector('#mm-bg-theme').textContent =
                BACKGROUND_THEME_LABELS[settings.backgroundTheme];
            panel.querySelector('#mm-pinned-bg-theme').textContent =
                BACKGROUND_THEME_LABELS[settings.pinnedBackgroundTheme];
        };

        const setBackgroundTheme = theme => {
            settings.backgroundTheme = normalizeBackgroundTheme(theme);
            updateBackgroundButtons();
            saveSettings();
            restartArcadeBackdrop();
        };

        const setPinnedBackgroundTheme = theme => {
            settings.pinnedBackgroundTheme = normalizeBackgroundTheme(theme);
            updateBackgroundButtons();
            saveSettings();
        };

        panel.querySelector('#mm-bg-theme').addEventListener('click', () => {
            const current = BACKGROUND_THEMES.indexOf(settings.backgroundTheme);
            setBackgroundTheme(BACKGROUND_THEMES[(current + 1) % BACKGROUND_THEMES.length]);
        });

        panel.querySelector('#mm-pinned-bg-theme').addEventListener('click', () => {
            const current = BACKGROUND_THEMES.indexOf(settings.pinnedBackgroundTheme);
            setPinnedBackgroundTheme(BACKGROUND_THEMES[(current + 1) % BACKGROUND_THEMES.length]);
        });

        panel.querySelector('#mm-pin-bg').addEventListener('click', () => {
            setPinnedBackgroundTheme(settings.backgroundTheme);
        });

        panel.querySelector('#mm-use-pinned-bg').addEventListener('click', () => {
            setBackgroundTheme(settings.pinnedBackgroundTheme);
        });

        panel.querySelector('#mm-reset-hud').addEventListener('click', () => {
            settings.hudPosition = null;
            applyHudPosition(null);
            saveSettings();
        });

        panel.querySelector('#mm-reset-records').addEventListener('click', () => {
            records = { days: {} };
            saveRecords();
            updateHUD();
        });

        panel.querySelector('#mm-settings-close').addEventListener('click',
            () => panel.classList.remove('open'));
    }

    function applySettingSideEffects(key) {
        if (key === 'hudEnabled') {
            els.hud?.classList.toggle('hidden', !settings.hudEnabled);
        }

        if (key === 'visualsEnabled') {
            if (!settings.visualsEnabled) {
                arcadeOff();
                document.body.classList.remove(
                    'mm-shake-light', 'mm-shake-hard', 'mm-chromatic', 'mm-wrong-dim'
                );
            } else if (settings.arcadeEnabled) {
                syncArcadePresentation();
            }
        }

        if (key === 'arcadeEnabled') {
            settings.arcadeEnabled ? syncArcadePresentation() : arcadeOff();
        }

        if (key === 'musicEnabled') {
            settings.musicEnabled ? startMusic() : stopMusic();
        }

        if (key === 'autoFailTimeout' || key === 'fontChallengeEnabled') {
            updateHUD();
        }

        if (key === 'fontChallengeEnabled') {
            settings.fontChallengeEnabled ? applyFontChallenge() : clearFontChallenge();
        }
    }

    function isAnswerResolved() {
        const wrapper = getInputWrapper();
        return wrapper?.classList.contains('correct') || wrapper?.classList.contains('incorrect');
    }

    const ANSWER_INPUT_SELECTOR = [
        'input:not([type="hidden"]):not([type="button"]):not([type="submit"])',
        'textarea',
    ].join(', ');

    function getAnswerInput() {
        const wrapper = getInputWrapper();
        return wrapper?.querySelector(ANSWER_INPUT_SELECTOR)
            || document.querySelector(ANSWER_INPUT_SELECTOR);
    }

    function startComboBar() {
        stopComboBar();
        comboBarStart = performance.now();
        const bar = els.bar;
        if (!bar) return;
        bar.style.width = '100%';
        bar.classList.remove('low');
        const tick = now => {
            const pct = Math.max(0, 1 - (now - comboBarStart) / settings.comboTimeout);
            bar.style.width = (pct * 100) + '%';
            bar.classList.toggle('low', pct < 0.25);
            if (pct > 0) comboBarRaf = requestAnimationFrame(tick);
        };
        comboBarRaf = requestAnimationFrame(tick);
    }

    function stopComboBar() {
        if (comboBarRaf) { cancelAnimationFrame(comboBarRaf); comboBarRaf = null; }
        if (els.bar) { els.bar.style.width = '0%'; els.bar.classList.remove('low'); }
    }

    function stopAnswerTimer() {
        if (state.comboTimer) {
            clearTimeout(state.comboTimer);
            state.comboTimer = null;
        }
        stopComboBar();
    }

    function removeFirstAnswerInputGate() {
        if (firstAnswerInputEl && firstAnswerInputHandler) {
            firstAnswerInputEl.removeEventListener('input', firstAnswerInputHandler, true);
        }
        firstAnswerInputEl = null;
        firstAnswerInputHandler = null;
    }

    function pauseFirstAnswerTimer() {
        if (state.comboTimer) clearTimeout(state.comboTimer);
        state.comboTimer = null;
        stopComboBar();
        if (els.bar) {
            els.bar.style.width = '100%';
            els.bar.classList.remove('low');
        }
    }

    function armFirstAnswerTimer() {
        if (firstAnswerTimerStarted || isAnswerResolved()) {
            resetComboTimer();
            return;
        }

        const input = getAnswerInput();
        if (!input) return;

        pauseFirstAnswerTimer();
        removeFirstAnswerInputGate();
        firstAnswerInputHandler = event => {
            const value = event.target?.value ?? '';
            if (!value.length || firstAnswerTimerStarted || isAnswerResolved()) return;
            firstAnswerTimerStarted = true;
            removeFirstAnswerInputGate();
            resetComboTimer();
        };
        firstAnswerInputEl = input;
        input.addEventListener('input', firstAnswerInputHandler, true);
    }

    function refreshAnswerTimerForCurrentQuestion() {
        if (firstAnswerTimerStarted) {
            resetComboTimer();
        } else {
            armFirstAnswerTimer();
        }
    }

    function resetComboTimer() {
        if (state.comboTimer) clearTimeout(state.comboTimer);
        state.comboTimer = null;
        if (state.sessionActive && getInputWrapper() && !isAnswerResolved()) {
            startComboBar();
            state.comboTimer = setTimeout(() => {
                state.comboTimer = null;
                handleAnswerTimeout();
            }, settings.comboTimeout);
        } else {
            stopComboBar();
        }
    }

    function applyTimeoutPenalty() {
        if (state.answerStreak > 4) playComboBreakSound();
        state.answerStreak = 0;
        state.multiplier = 1;
        updateHUD();
        stopComboBar();
    }

    function handleAnswerTimeout() {
        if (isAnswerResolved()) return;
        stopComboBar();
        spawnFloat('TIME UP', 'incorrect', getInputWrapper());

        if (settings.autoFailTimeout) {
            timeoutAutoFailing = attemptTimeoutAutoFail();
            if (timeoutAutoFailing) {
                setTimeout(() => {
                    if (timeoutAutoFailing && !isAnswerResolved()) {
                        timeoutAutoFailing = false;
                        restoreTimeoutInjectedInput();
                        applyTimeoutPenalty();
                    }
                }, 1200);
                return;
            }
        }

        applyTimeoutPenalty();
    }

    function findVisibleControlByText(labels) {
        const wanted = labels.map(label => label.toLowerCase());
        const controls = document.querySelectorAll('button, [role="button"]');
        return Array.from(controls).find(control => {
            if (control.id?.startsWith('mm-')) return false;
            if (control.getClientRects().length === 0) return false;
            const text = control.textContent?.trim().toLowerCase();
            return wanted.includes(text);
        }) || null;
    }

    function setNativeInputValue(input, value) {
        const proto = input instanceof HTMLTextAreaElement
            ? HTMLTextAreaElement.prototype
            : HTMLInputElement.prototype;
        const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
        if (setter) {
            setter.call(input, value);
        } else {
            input.value = value;
        }
    }

    function dispatchInputValue(input, value) {
        input.focus();
        setNativeInputValue(input, value);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
    }

    function restoreTimeoutInjectedInput() {
        if (!timeoutInjectedInput?.input || isAnswerResolved()) {
            timeoutInjectedInput = null;
            return;
        }
        dispatchInputValue(timeoutInjectedInput.input, timeoutInjectedInput.value);
        timeoutInjectedInput = null;
    }

    function clickElementAtPoint(x, y) {
        const target = document.elementFromPoint(x, y);
        if (!target) return false;
        ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'].forEach(type => {
            target.dispatchEvent(new MouseEvent(type, {
                bubbles: true,
                cancelable: true,
                clientX: x,
                clientY: y,
                view: window,
            }));
        });
        return true;
    }

    function clickInputWrapperSubmitHotspot() {
        const wrapper = getInputWrapper();
        const rect = wrapper?.getBoundingClientRect();
        if (!rect) return false;
        return clickElementAtPoint(rect.right - 32, rect.top + rect.height / 2);
    }

    function submitCurrentAnswer() {
        const wrapper = getInputWrapper();
        const submit = wrapper?.querySelector('button, [role="button"]')
            || findVisibleControlByText(['submit', 'check']);
        if (submit) {
            submit.click();
            return true;
        }

        if (clickInputWrapperSubmitHotspot()) return true;

        const input = getAnswerInput();
        if (!input) return false;
        input.dispatchEvent(new KeyboardEvent('keydown', {
            key: 'Enter',
            code: 'Enter',
            bubbles: true,
            cancelable: true,
        }));
        input.dispatchEvent(new KeyboardEvent('keyup', {
            key: 'Enter',
            code: 'Enter',
            bubbles: true,
            cancelable: true,
        }));
        input.closest('form')?.requestSubmit?.();
        return true;
    }

    function attemptTimeoutAutoFail() {
        const wrong = findVisibleControlByText(['wrong']);
        if (wrong) {
            wrong.click();
            setTimeout(clickNextAfterTimeoutFail, 150);
            return true;
        }

        const input = getAnswerInput();
        if (!input) return false;

        timeoutInjectedInput = { input, value: input.value };
        dispatchInputValue(input, `__mm_timeout_${Date.now()}__`);
        return submitCurrentAnswer();
    }

    function clickNextAfterTimeoutFail() {
        const next = findVisibleControlByText(['next']);
        if (next) {
            next.click();
            timeoutAutoFailing = false;
        }
    }

    function shakeScreen(hard = false) {
        if (!settings.shakeEnabled || !settings.visualsEnabled || prefersReducedMotion()) return;
        const cls = hard ? 'mm-shake-hard' : 'mm-shake-light';
        document.body.classList.remove('mm-shake-light', 'mm-shake-hard');
        void document.body.offsetWidth;
        document.body.classList.add(cls);
        setTimeout(() => document.body.classList.remove(cls), hard ? 450 : 350);
    }

    function flashScreen(correct) {
        if (!settings.flashEnabled || !settings.visualsEnabled || prefersReducedMotion()) return;
        const f = els.flash;
        if (!f) return;
        f.className = '';
        void f.offsetWidth;
        f.classList.add(correct ? 'correct-flash' : 'wrong-flash');
    }

    function spawnFloat(text, cssClass, anchorEl) {
        if (!settings.floatEnabled || !settings.visualsEnabled || prefersReducedMotion()) return;
        const node = document.createElement('div');
        node.className   = `mm-float ${cssClass}`;
        node.textContent = text;
        const r = anchorEl?.getBoundingClientRect();
        node.style.left = `${(r ? r.left + r.width / 2 : window.innerWidth / 2) - 60 + (Math.random() - 0.5) * 80}px`;
        node.style.top  = `${r ? r.top + r.height / 2 : window.innerHeight / 2}px`;
        document.body.appendChild(node);
        setTimeout(() => node.remove(), 950);
    }

    function showBanner(id, text) {
        if (!settings.visualsEnabled || prefersReducedMotion()) return;
        const b = document.getElementById(id);
        if (!b) return;
        b.textContent = text;
        b.className   = '';
        void b.offsetWidth;
        b.classList.add('show');
    }

    function spawnCelebrate(celebration, x, y) {
        if (!settings.visualsEnabled || prefersReducedMotion()) return;
        const node = document.createElement('div');
        node.className   = `mm-celebrate ${celebration.effect}`;
        node.textContent = celebration.icon;
        node.style.left = `${x}px`;
        node.style.top  = `${y}px`;
        node.style.setProperty('--mm-celebrate-x', `${Math.round((Math.random() - 0.5) * 100)}px`);
        node.style.setProperty('--mm-celebrate-rot', `${Math.round((Math.random() - 0.5) * 90)}deg`);
        document.body.appendChild(node);
        setTimeout(() => node.remove(), 1000);
    }

    function pulseElement(el) {
        if (!el || !settings.visualsEnabled || prefersReducedMotion()) return;
        el.classList.add('mm-pulse');
        setTimeout(() => el.classList.remove('mm-pulse'), 350);
    }

    function animateClass(el, cls, duration) {
        if (!el || prefersReducedMotion()) return;
        el.classList.add(cls);
        setTimeout(() => el.classList.remove(cls), duration);
    }

    let starRaf = null;
    let starResizeHandler = null;
    let shootingStars = [];

    const ARCADE_CSS = `
        /* ── PHOSPHOR PALETTE SHIFT ── */
        body.mm-arcade:not([data-mm-bg="default"]) {
            background-color: #02040a !important;
        }

        body.mm-arcade:not([data-mm-bg="default"]) #__nuxt,
        body.mm-arcade:not([data-mm-bg="default"]) #app,
        body.mm-arcade:not([data-mm-bg="default"]) [data-v-app],
        body.mm-arcade:not([data-mm-bg="default"]) main,
        body.mm-arcade:not([data-mm-bg="default"]) #main {
            background-color: transparent !important;
        }

        body.mm-arcade #__nuxt,
        body.mm-arcade #app,
        body.mm-arcade [data-v-app] {
            position: relative;
            z-index: 1;
        }

        body.mm-arcade.mm-arcade-resolved:not([data-mm-bg="default"]) {
            color: rgba(245,248,255,0.9);
        }

        body.mm-arcade.mm-arcade-resolved:not([data-mm-bg="default"]) #__nuxt,
        body.mm-arcade.mm-arcade-resolved:not([data-mm-bg="default"]) #app,
        body.mm-arcade.mm-arcade-resolved:not([data-mm-bg="default"]) [data-v-app],
        body.mm-arcade.mm-arcade-resolved:not([data-mm-bg="default"]) main,
        body.mm-arcade.mm-arcade-resolved:not([data-mm-bg="default"]) #main,
        body.mm-arcade.mm-arcade-resolved:not([data-mm-bg="default"]) [class*="page"],
        body.mm-arcade.mm-arcade-resolved:not([data-mm-bg="default"]) [class*="layout"],
        body.mm-arcade.mm-arcade-resolved:not([data-mm-bg="default"]) [class*="content"],
        body.mm-arcade.mm-arcade-resolved:not([data-mm-bg="default"]) [class*="review"] {
            background-color: transparent !important;
            color: rgba(245,248,255,0.9) !important;
        }

        body.mm-arcade.mm-arcade-resolved:not([data-mm-bg="default"]) h1,
        body.mm-arcade.mm-arcade-resolved:not([data-mm-bg="default"]) h2,
        body.mm-arcade.mm-arcade-resolved:not([data-mm-bg="default"]) h3,
        body.mm-arcade.mm-arcade-resolved:not([data-mm-bg="default"]) h4 {
            color: rgba(245,248,255,0.94) !important;
        }

        body.mm-arcade.mm-arcade-resolved #mm-starfield {
            opacity: ${RESOLVED_BACKDROP_OPACITY};
        }

        body.mm-arcade.mm-arcade-resolved[data-mm-bg="default"] #mm-starfield,
        body.mm-arcade.mm-arcade-resolved[data-mm-bg="void"] #mm-starfield,
        body.mm-arcade.mm-arcade-resolved #mm-crt-tint,
        body.mm-arcade.mm-arcade-resolved #mm-scanlines {
            display: none !important;
        }

        /* Phosphor tint + subtle bloom on the whole viewport */
        #mm-crt-tint {
            position: fixed; inset: 0; pointer-events: none; z-index: 9990;
            background: radial-gradient(ellipse at 50% 50%,
                transparent 55%,
                rgba(0, 10, 30, 0.55) 100%
            );
            mix-blend-mode: multiply;
        }

        /* Scanlines */
        #mm-scanlines {
            position: fixed; inset: 0; pointer-events: none; z-index: 9991;
            background: repeating-linear-gradient(
                to bottom,
                transparent 0px,
                transparent 2px,
                rgba(0,0,0,0.18) 2px,
                rgba(0,0,0,0.18) 4px
            );
        }

        /* Arcade backdrop sits behind page content */
        #mm-starfield {
            position: fixed; inset: 0; pointer-events: none; z-index: -1;
        }

        /* CRT curvature flicker — very subtle brightness pulse */
        @keyframes mmCrtFlicker {
            0%,100% { opacity: 1; }
            92%     { opacity: 1; }
            93%     { opacity: 0.96; }
            94%     { opacity: 1; }
            97%     { opacity: 0.98; }
            98%     { opacity: 1; }
        }
        body.mm-arcade {
            isolation: isolate;
            animation: mmCrtFlicker 8s infinite;
        }

        /* ── PHOSPHOR GLOW on the main card area ── */
        body.mm-arcade .input-wrapper,
        body.mm-arcade [class*="question"],
        body.mm-arcade [class*="card"],
        body.mm-arcade [class*="review"] {
            box-shadow: 0 0 24px rgba(0,220,255,0.12), 0 0 2px rgba(0,220,255,0.08) !important;
        }

        /* Glow on text inputs */
        body.mm-arcade input[type="text"],
        body.mm-arcade input:not([type]) {
            color: #00ffcc !important;
            caret-color: #00ffcc !important;
            text-shadow: 0 0 8px rgba(0,255,200,0.6) !important;
            background: rgba(0,0,0,0.6) !important;
            border-color: rgba(0,200,255,0.4) !important;
        }
        body.mm-arcade input[type="text"]::placeholder,
        body.mm-arcade input:not([type])::placeholder {
            color: rgba(0,200,255,0.35) !important;
        }

        /* ── CORNER BRACKETS on the main card ── */
        body.mm-arcade .input-wrapper::before,
        body.mm-arcade .input-wrapper::after {
            content: '';
            position: absolute;
            width: 18px; height: 18px;
            border-color: rgba(0,220,255,0.55);
            border-style: solid;
            pointer-events: none;
            z-index: 2;
        }
        body.mm-arcade .input-wrapper { position: relative; }
        body.mm-arcade .input-wrapper::before {
            top: -4px; left: -4px;
            border-width: 2px 0 0 2px;
        }
        body.mm-arcade .input-wrapper::after {
            bottom: -4px; right: -4px;
            border-width: 0 2px 2px 0;
        }

        /* ── CHROMATIC ABERRATION on wrong answer ── */
        @keyframes mmChromatic {
            0%  { filter: none; }
            15% { filter: drop-shadow(-2px 0 0 rgba(255,0,80,0.7))
                          drop-shadow(2px 0 0 rgba(0,255,220,0.7)); }
            30% { filter: none; }
            45% { filter: drop-shadow(-1px 0 0 rgba(255,0,80,0.5))
                          drop-shadow(1px 0 0 rgba(0,255,220,0.5)); }
            60% { filter: none; }
            100%{ filter: none; }
        }
        body.mm-arcade.mm-chromatic { animation: mmChromatic 0.5s ease forwards; }

        /* ── PROGRESS BAR — phosphor green ── */
        body.mm-arcade [role="progressbar"] > *,
        body.mm-arcade .progress-bar,
        body.mm-arcade .progress > * {
            background: linear-gradient(90deg, #00cc88, #00ffcc) !important;
            box-shadow: 0 0 8px rgba(0,255,180,0.5) !important;
        }

        /* ── TOP COUNTER — arcade colour ── */
        body.mm-arcade .top_middle {
            font-family: var(--mm-arcade-font) !important;
            color: #ffe066 !important;
            text-shadow: 0 0 8px rgba(255,220,0,0.6) !important;
            letter-spacing: 2px !important;
        }

        /* ── CORRECT / INCORRECT state tints ── */
        body.mm-arcade .input-wrapper.correct {
            box-shadow: 0 0 32px rgba(0,255,150,0.35), 0 0 4px rgba(0,255,150,0.2) !important;
        }
        body.mm-arcade .input-wrapper.incorrect {
            box-shadow: 0 0 32px rgba(255,40,80,0.4), 0 0 4px rgba(255,40,80,0.2) !important;
        }
    `;

    function injectArcadeStyles() {
        if (document.getElementById('mm-arcade-styles')) return;
        const s = document.createElement('style');
        s.id = 'mm-arcade-styles';
        s.textContent = ARCADE_CSS;
        document.head.appendChild(s);
    }

    function stopArcadeBackdrop() {
        if (starRaf) { cancelAnimationFrame(starRaf); starRaf = null; }
        if (starResizeHandler) {
            window.removeEventListener('resize', starResizeHandler);
            starResizeHandler = null;
        }
        shootingStars = [];
        document.getElementById('mm-starfield')?.remove();
    }

    function restartArcadeBackdrop() {
        if (!settings.arcadeEnabled || !settings.visualsEnabled) return;
        document.body.dataset.mmBg = settings.backgroundTheme;
        stopArcadeBackdrop();
        syncArcadePresentation();
    }

    function hasCanvasBackdrop(theme = settings.backgroundTheme) {
        return CANVAS_BACKGROUND_THEMES.includes(theme);
    }

    function hasShootingStars(theme = settings.backgroundTheme) {
        return SHOOTING_STAR_THEMES.includes(theme);
    }

    function triggerShootingStar() {
        if (!settings.arcadeEnabled || !settings.visualsEnabled
            || prefersReducedMotion() || isAnswerResolved()) return;
        if (!hasShootingStars()) return;
        shootingStars.push({
            x: window.innerWidth * (0.65 + Math.random() * 0.45),
            y: window.innerHeight * (0.06 + Math.random() * 0.38),
            vx: -9 - Math.random() * 7,
            vy: 4 + Math.random() * 4,
            life: 1,
            hue: Math.random() < 0.55 ? 190 : 310,
            length: 90 + Math.random() * 100,
        });
    }

    function buildStarfield() {
        if (prefersReducedMotion() || !hasCanvasBackdrop()) return;
        document.getElementById('mm-starfield')?.remove();
        const canvas = document.createElement('canvas');
        canvas.id = 'mm-starfield';
        document.body.appendChild(canvas);

        const ctx = canvas.getContext('2d');
        if (!ctx) {
            canvas.remove();
            return;
        }

        let W, H;
        let starfieldTexture, starfieldStars, nebulaTexture, nebulaStars, matrixDrops;

        const theme = settings.backgroundTheme;
        const MATRIX_FONT_SIZE = 18;
        const MATRIX_GLYPHS = '日月火水木金土山川人大小日本語学習01';

        function resize() {
            W = canvas.width  = window.innerWidth;
            H = canvas.height = window.innerHeight;
        }

        function createBackdropTexture() {
            const texture = document.createElement('canvas');
            texture.width = W;
            texture.height = H;
            return texture;
        }

        function randomBell() {
            const u = Math.max(Number.EPSILON, Math.random());
            const v = Math.max(Number.EPSILON, Math.random());
            return Math.sqrt(-2 * Math.log(u)) * Math.cos(Math.PI * 2 * v);
        }

        function paintEllipticalGlow(target, x, y, radiusX, radiusY, rotation, stops) {
            target.save();
            target.translate(x, y);
            target.rotate(rotation);
            target.scale(radiusX, radiusY);
            const gradient = target.createRadialGradient(0, 0, 0, 0, 0, 1);
            stops.forEach(([offset, color]) => gradient.addColorStop(offset, color));
            target.fillStyle = gradient;
            target.fillRect(-1, -1, 2, 2);
            target.restore();
        }

        function drawStarPoint(target, star, alpha = star.alpha) {
            target.fillStyle = `hsla(${star.hue},80%,88%,${alpha})`;
            target.beginPath();
            target.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
            target.fill();
        }

        function drawBrightStar(target, star, alpha) {
            const glowRadius = star.radius * 8;
            const glow = target.createRadialGradient(
                star.x, star.y, 0, star.x, star.y, glowRadius
            );
            glow.addColorStop(0, `hsla(${star.hue},90%,96%,${alpha})`);
            glow.addColorStop(0.18, `hsla(${star.hue},90%,82%,${alpha * 0.42})`);
            glow.addColorStop(1, `hsla(${star.hue},90%,68%,0)`);
            target.fillStyle = glow;
            target.beginPath();
            target.arc(star.x, star.y, glowRadius, 0, Math.PI * 2);
            target.fill();

            target.strokeStyle = `hsla(${star.hue},90%,92%,${alpha * 0.32})`;
            target.lineWidth = 0.7;
            target.beginPath();
            target.moveTo(star.x - star.radius * 6, star.y);
            target.lineTo(star.x + star.radius * 6, star.y);
            target.moveTo(star.x, star.y - star.radius * 4);
            target.lineTo(star.x, star.y + star.radius * 4);
            target.stroke();
        }

        function getGalaxyBandY(x) {
            return H * (0.84 - 0.58 * x / W)
                + Math.sin(x / Math.max(160, W * 0.16)) * H * 0.035;
        }

        function initStarfield() {
            starfieldTexture = createBackdropTexture();
            const textureCtx = starfieldTexture.getContext('2d');
            if (!textureCtx) return;

            const sky = textureCtx.createRadialGradient(
                W * 0.55, H * 0.48, 0, W * 0.55, H * 0.48, Math.max(W, H) * 0.78
            );
            sky.addColorStop(0, '#081226');
            sky.addColorStop(0.48, '#030817');
            sky.addColorStop(1, '#010207');
            textureCtx.fillStyle = sky;
            textureCtx.fillRect(0, 0, W, H);

            textureCtx.globalCompositeOperation = 'lighter';
            for (let i = 0; i < 42; i++) {
                const x = (i / 41) * W + randomBell() * W * 0.018;
                const y = getGalaxyBandY(x) + randomBell() * H * 0.035;
                const width = W * (0.10 + Math.random() * 0.09);
                const height = H * (0.055 + Math.random() * 0.055);
                const hue = Math.random() < 0.72 ? 215 : 278;
                paintEllipticalGlow(textureCtx, x, y, width, height, -0.55, [
                    [0, `hsla(${hue},75%,66%,${0.018 + Math.random() * 0.024})`],
                    [0.48, `hsla(${hue + 24},70%,45%,0.012)`],
                    [1, `hsla(${hue},70%,28%,0)`],
                ]);
            }

            const area = W * H;
            const starCount = Math.max(850, Math.min(2100, Math.floor(area / 720)));
            for (let i = 0; i < starCount; i++) {
                const inBand = Math.random() < 0.58;
                const x = Math.random() * W;
                const y = inBand
                    ? getGalaxyBandY(x) + randomBell() * H * 0.105
                    : Math.random() * H;
                if (y < 0 || y > H) continue;
                const radiusRoll = Math.random();
                const star = {
                    x,
                    y,
                    radius: radiusRoll > 0.985 ? 1.35 : 0.22 + Math.random() * 0.62,
                    alpha: 0.20 + Math.random() * (inBand ? 0.66 : 0.48),
                    hue: Math.random() < 0.82 ? 210 : (Math.random() < 0.55 ? 42 : 4),
                };
                drawStarPoint(textureCtx, star);
            }

            textureCtx.globalCompositeOperation = 'source-over';
            for (let i = 0; i < 170; i++) {
                const x = Math.random() * W;
                const y = getGalaxyBandY(x) + randomBell() * H * 0.06;
                if (y < 0 || y > H) continue;
                textureCtx.fillStyle = `rgba(0,0,8,${0.035 + Math.random() * 0.08})`;
                textureCtx.beginPath();
                textureCtx.ellipse(
                    x, y, 8 + Math.random() * 34, 2 + Math.random() * 9,
                    -0.55 + randomBell() * 0.18, 0, Math.PI * 2
                );
                textureCtx.fill();
            }

            starfieldStars = Array.from({ length: 22 }, () => {
                const x = Math.random() * W;
                const nearBand = Math.random() < 0.66;
                return {
                    x,
                    y: nearBand
                        ? Math.max(12, Math.min(H - 12, getGalaxyBandY(x) + randomBell() * H * 0.13))
                        : 12 + Math.random() * Math.max(1, H - 24),
                    radius: 0.8 + Math.random() * 0.75,
                    alpha: 0.44 + Math.random() * 0.34,
                    hue: Math.random() < 0.78 ? 210 : 42,
                    phase: Math.random() * Math.PI * 2,
                    speed: 0.45 + Math.random() * 0.85,
                };
            });
        }

        function getNebulaSpine(p) {
            return {
                x: W * (-0.08 + p * 1.16),
                y: H * (0.74 - p * 0.48)
                    + Math.sin(p * Math.PI * 3.2) * H * 0.065,
            };
        }

        function getNebulaHue(p) {
            if (p < 0.28) return 18 + p * 80;
            if (p < 0.58) return 326 - (p - 0.28) * 110;
            return 214 - (p - 0.58) * 52;
        }

        function initNebula() {
            nebulaTexture = createBackdropTexture();
            const textureCtx = nebulaTexture.getContext('2d');
            if (!textureCtx) return;

            const sky = textureCtx.createRadialGradient(
                W * 0.56, H * 0.42, 0, W * 0.56, H * 0.42, Math.max(W, H) * 0.88
            );
            sky.addColorStop(0, '#100b1f');
            sky.addColorStop(0.48, '#050612');
            sky.addColorStop(1, '#010206');
            textureCtx.fillStyle = sky;
            textureCtx.fillRect(0, 0, W, H);

            textureCtx.globalCompositeOperation = 'lighter';
            for (let i = 0; i < 260; i++) {
                const p = Math.random();
                const spine = getNebulaSpine(p);
                const spread = H * (0.035 + 0.16 * Math.sin(p * Math.PI));
                const x = spine.x + randomBell() * spread * 0.72;
                const y = spine.y + randomBell() * spread;
                const radius = Math.min(W, H) * (0.018 + Math.random() * 0.075);
                const hue = getNebulaHue(p) + randomBell() * 14;
                const alpha = 0.016 + Math.random() * 0.046;
                paintEllipticalGlow(
                    textureCtx, x, y, radius * (1.2 + Math.random() * 1.8),
                    radius * (0.42 + Math.random() * 0.72), -0.46 + randomBell() * 0.48,
                    [
                        [0, `hsla(${hue},96%,68%,${alpha})`],
                        [0.34, `hsla(${hue + 18},94%,52%,${alpha * 0.72})`],
                        [0.72, `hsla(${hue - 24},90%,32%,${alpha * 0.22})`],
                        [1, `hsla(${hue},88%,20%,0)`],
                    ]
                );
            }

            textureCtx.filter = 'blur(1.4px)';
            textureCtx.lineCap = 'round';
            for (let filament = 0; filament < 34; filament++) {
                const offset = randomBell() * H * 0.08;
                const hue = getNebulaHue(Math.random());
                textureCtx.strokeStyle = `hsla(${hue},96%,72%,${0.025 + Math.random() * 0.05})`;
                textureCtx.lineWidth = 0.7 + Math.random() * 2.4;
                textureCtx.beginPath();
                for (let step = 0; step <= 28; step++) {
                    const p = step / 28;
                    const spine = getNebulaSpine(p);
                    const taper = Math.sin(p * Math.PI);
                    const ripple = Math.sin(p * (10 + filament % 6) + filament) * H * 0.018;
                    const x = spine.x + ripple * 0.75 + offset * taper * 0.35;
                    const y = spine.y + ripple + offset * taper;
                    if (step === 0) textureCtx.moveTo(x, y);
                    else textureCtx.lineTo(x, y);
                }
                textureCtx.stroke();
            }
            textureCtx.filter = 'none';

            textureCtx.globalCompositeOperation = 'source-over';
            textureCtx.filter = 'blur(5px)';
            for (let i = 0; i < 105; i++) {
                const p = Math.random();
                const spine = getNebulaSpine(p);
                const spread = H * (0.025 + Math.sin(p * Math.PI) * 0.09);
                const x = spine.x + randomBell() * spread;
                const y = spine.y + randomBell() * spread * 0.65;
                const radius = Math.min(W, H) * (0.008 + Math.random() * 0.045);
                textureCtx.fillStyle = `rgba(0,1,8,${0.07 + Math.random() * 0.18})`;
                textureCtx.beginPath();
                textureCtx.ellipse(
                    x, y, radius * (1.4 + Math.random() * 2.4), radius,
                    -0.48 + randomBell() * 0.38, 0, Math.PI * 2
                );
                textureCtx.fill();
            }
            textureCtx.filter = 'none';

            textureCtx.globalCompositeOperation = 'lighter';
            const clusterCenters = [
                { x: 0.24, y: 0.62, hue: 24 },
                { x: 0.51, y: 0.45, hue: 318 },
                { x: 0.74, y: 0.32, hue: 202 },
            ];
            for (const cluster of clusterCenters) {
                paintEllipticalGlow(
                    textureCtx, cluster.x * W, cluster.y * H,
                    Math.min(W, H) * 0.09, Math.min(W, H) * 0.065, -0.35,
                    [
                        [0, `hsla(${cluster.hue},100%,90%,0.16)`],
                        [0.18, `hsla(${cluster.hue},100%,68%,0.10)`],
                        [1, `hsla(${cluster.hue},95%,45%,0)`],
                    ]
                );
            }

            const baseStarCount = Math.max(420, Math.min(1100, Math.floor(W * H / 1300)));
            for (let i = 0; i < baseStarCount; i++) {
                const star = {
                    x: Math.random() * W,
                    y: Math.random() * H,
                    radius: 0.18 + Math.random() * 0.62,
                    alpha: 0.12 + Math.random() * 0.46,
                    hue: Math.random() < 0.86 ? 210 : 40,
                };
                drawStarPoint(textureCtx, star);
            }

            nebulaStars = Array.from({ length: 30 }, (_, index) => {
                const cluster = clusterCenters[index % clusterCenters.length];
                return {
                    x: cluster.x * W + randomBell() * Math.min(W, H) * 0.10,
                    y: cluster.y * H + randomBell() * Math.min(W, H) * 0.08,
                    radius: 0.65 + Math.random() * 0.95,
                    alpha: 0.42 + Math.random() * 0.38,
                    hue: index % 5 === 0 ? cluster.hue : 210,
                    phase: Math.random() * Math.PI * 2,
                    speed: 0.35 + Math.random() * 0.8,
                };
            });
        }

        function initMatrix() {
            const columns = Math.ceil(W / MATRIX_FONT_SIZE);
            matrixDrops = Array.from({ length: columns }, () => -Math.random() * 18);
        }

        function drawStarfield(t) {
            if (theme !== 'starfield') return;
            ctx.save();
            const driftX = Math.sin(t * 0.012) * 1.5;
            const driftY = Math.cos(t * 0.010) * 1.5;
            ctx.drawImage(starfieldTexture, driftX - 2, driftY - 2, W + 4, H + 4);
            ctx.globalCompositeOperation = 'lighter';
            for (const star of starfieldStars) {
                const pulse = 0.72 + Math.sin(t * star.speed + star.phase) * 0.28;
                drawBrightStar(ctx, star, star.alpha * pulse);
            }
            ctx.restore();
        }

        function drawNebula(t) {
            if (theme !== 'nebula') return;
            ctx.save();
            const driftX = Math.sin(t * 0.009) * 1.8;
            const driftY = Math.cos(t * 0.008) * 1.4;
            ctx.drawImage(nebulaTexture, driftX - 2, driftY - 2, W + 4, H + 4);
            ctx.globalCompositeOperation = 'lighter';
            for (const star of nebulaStars) {
                const pulse = 0.68 + Math.sin(t * star.speed + star.phase) * 0.32;
                drawBrightStar(ctx, star, star.alpha * pulse);
            }
            ctx.restore();
        }

        function drawGrid(t) {
            if (theme !== 'grid') return;
            const horizon = H * 0.56;
            ctx.save();
            const sky = ctx.createLinearGradient(0, 0, 0, horizon + 80);
            sky.addColorStop(0, 'rgba(12,10,42,0.72)');
            sky.addColorStop(0.55, 'rgba(82,24,88,0.44)');
            sky.addColorStop(1, 'rgba(255,112,72,0.18)');
            ctx.fillStyle = sky;
            ctx.fillRect(0, 0, W, horizon + 90);

            const sunX = W / 2 + Math.sin(t * 0.08) * 18;
            const sunY = horizon + 8;
            const sunR = Math.min(W, H) * 0.17;
            const sun = ctx.createRadialGradient(sunX, sunY - sunR * 0.3, 0, sunX, sunY, sunR);
            sun.addColorStop(0, 'rgba(255,245,130,0.78)');
            sun.addColorStop(0.55, 'rgba(255,105,96,0.46)');
            sun.addColorStop(1, 'rgba(255,0,170,0)');
            ctx.fillStyle = sun;
            ctx.beginPath();
            ctx.arc(sunX, sunY, sunR, Math.PI, 0);
            ctx.lineTo(sunX + sunR, sunY);
            ctx.arc(sunX, sunY, sunR, 0, Math.PI, true);
            ctx.fill();

            ctx.save();
            ctx.beginPath();
            ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
            ctx.clip();
            ctx.fillStyle = 'rgba(2,4,16,0.52)';
            for (let stripe = 0; stripe < 9; stripe++) {
                const y = sunY - sunR * 0.72 + stripe * sunR * 0.19;
                ctx.fillRect(sunX - sunR, y, sunR * 2, 4 + stripe * 1.2);
            }
            ctx.restore();

            ctx.fillStyle = 'rgba(6,8,23,0.72)';
            ctx.beginPath();
            ctx.moveTo(0, horizon + 22);
            for (let x = 0; x <= W; x += 56) {
                const y = horizon + 12 - Math.abs(Math.sin(x * 0.018 + 0.4)) * 54;
                ctx.lineTo(x, y);
            }
            ctx.lineTo(W, H);
            ctx.lineTo(0, H);
            ctx.closePath();
            ctx.fill();

            ctx.strokeStyle = 'rgba(0,255,204,0.30)';
            ctx.lineWidth = 1;
            for (let i = 0; i < 22; i++) {
                const p = i / 21;
                const y = horizon + Math.pow(p, 2.35) * (H - horizon);
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(W, y);
                ctx.stroke();
            }

            const vanishingX = W / 2;
            for (let i = -14; i <= 14; i++) {
                const x = W / 2 + i * W * 0.085;
                ctx.beginPath();
                ctx.moveTo(vanishingX, horizon);
                ctx.lineTo(x, H);
                ctx.stroke();
            }

            const floorGlow = ctx.createLinearGradient(0, horizon, 0, H);
            floorGlow.addColorStop(0, 'rgba(255,0,160,0.10)');
            floorGlow.addColorStop(1, 'rgba(0,255,204,0.08)');
            ctx.fillStyle = floorGlow;
            ctx.fillRect(0, horizon, W, H - horizon);
            ctx.restore();
        }

        function drawMatrix(t) {
            if (theme !== 'matrix') return;
            ctx.save();
            ctx.font = `${MATRIX_FONT_SIZE}px monospace`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';

            matrixDrops.forEach((drop, column) => {
                const x = column * MATRIX_FONT_SIZE + MATRIX_FONT_SIZE / 2;
                const headY = drop * MATRIX_FONT_SIZE;
                for (let trail = 0; trail < 12; trail++) {
                    const y = headY - trail * MATRIX_FONT_SIZE;
                    if (y < -MATRIX_FONT_SIZE || y > H + MATRIX_FONT_SIZE) continue;
                    const alpha = Math.max(0, 0.28 - trail * 0.022);
                    const charIndex = Math.floor(t * 8 + column * 7 + trail * 3) % MATRIX_GLYPHS.length;
                    ctx.fillStyle = trail === 0
                        ? 'rgba(210,255,240,0.38)'
                        : `rgba(0,255,180,${alpha})`;
                    ctx.fillText(MATRIX_GLYPHS[charIndex], x, y);
                }

                matrixDrops[column] += 0.32 + (column % 5) * 0.045;
                if (headY > H + MATRIX_FONT_SIZE * 12 && Math.random() < 0.04) {
                    matrixDrops[column] = -Math.random() * 16;
                }
            });
            ctx.restore();
        }

        function drawShootingStars() {
            shootingStars = shootingStars.filter(star => star.life > 0);
            for (const star of shootingStars) {
                const tailX = star.x - star.vx * star.length / 12;
                const tailY = star.y - star.vy * star.length / 12;
                const gradient = ctx.createLinearGradient(star.x, star.y, tailX, tailY);
                gradient.addColorStop(0, `hsla(${star.hue},100%,82%,${star.life})`);
                gradient.addColorStop(0.16, `hsla(${star.hue},100%,66%,${star.life * 0.62})`);
                gradient.addColorStop(1, `hsla(${star.hue},100%,60%,0)`);
                ctx.save();
                ctx.strokeStyle = gradient;
                ctx.lineWidth = 2.4;
                ctx.beginPath();
                ctx.moveTo(star.x, star.y);
                ctx.lineTo(tailX, tailY);
                ctx.stroke();
                ctx.fillStyle = `hsla(${star.hue},100%,88%,${star.life})`;
                ctx.beginPath();
                ctx.arc(star.x, star.y, 2.2, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
                star.x += star.vx;
                star.y += star.vy;
                star.life -= 0.018;
            }
        }

        function tick() {
            ctx.clearRect(0, 0, W, H);
            const t = performance.now() / 1000;
            drawStarfield(t);
            drawNebula(t);
            drawGrid(t);
            drawMatrix(t);
            if (hasShootingStars(theme) && Math.random() < 0.0025) triggerShootingStar();
            drawShootingStars();
            starRaf = requestAnimationFrame(tick);
        }

        starResizeHandler = () => {
            resize();
            if (theme === 'starfield') initStarfield();
            if (theme === 'nebula') initNebula();
            if (theme === 'matrix') initMatrix();
        };
        window.addEventListener('resize', starResizeHandler);
        resize();
        if (theme === 'starfield') initStarfield();
        if (theme === 'nebula') initNebula();
        if (theme === 'matrix') initMatrix();
        tick();
    }

    function arcadeOn() {
        if (!settings.visualsEnabled) return;
        const resolved = isAnswerResolved();
        injectArcadeStyles();
        document.body.classList.add('mm-arcade');
        document.body.classList.toggle('mm-arcade-resolved', resolved);
        document.body.dataset.mmBg = settings.backgroundTheme;

        if (resolved) {
            document.getElementById('mm-crt-tint')?.remove();
            document.getElementById('mm-scanlines')?.remove();
            if (!hasCanvasBackdrop()) {
                stopArcadeBackdrop();
            } else if (!document.getElementById('mm-starfield')) {
                buildStarfield();
            }
            return;
        }

        if (hasCanvasBackdrop() && !document.getElementById('mm-starfield')) buildStarfield();

        const frag = document.createDocumentFragment();
        if (!document.getElementById('mm-crt-tint'))   frag.appendChild(el('div', 'mm-crt-tint'));
        if (!document.getElementById('mm-scanlines'))  frag.appendChild(el('div', 'mm-scanlines'));
        document.body.appendChild(frag);
    }

    function arcadeOff() {
        document.body.classList.remove('mm-arcade', 'mm-arcade-resolved');
        delete document.body.dataset.mmBg;
        stopArcadeBackdrop();
        ['mm-starfield', 'mm-crt-tint', 'mm-scanlines', 'mm-arcade-styles'].forEach(id =>
            document.getElementById(id)?.remove()
        );
    }

    function syncArcadePresentation() {
        if (settings.arcadeEnabled && settings.visualsEnabled) {
            arcadeOn();
        } else {
            arcadeOff();
        }
    }

    function arcadeChromatic() {
        if (!settings.arcadeEnabled || !settings.visualsEnabled) return;
        document.body.classList.remove('mm-chromatic');
        void document.body.offsetWidth;
        document.body.classList.add('mm-chromatic');
        setTimeout(() => document.body.classList.remove('mm-chromatic'), 500);
    }

    function calcMultiplier(streak) { return Math.min(10, 1 + Math.floor(streak / 5)); }

    const MILESTONES = { 10: 'ON FIRE!', 25: 'UNSTOPPABLE!', 50: 'LEGENDARY!', 100: 'GODLIKE!' };

    const CELEBRATIONS = [
        { icon: '🎉', effect: 'burst' },
        { icon: '✨', effect: 'rise' },
        { icon: '🌸', effect: 'pop' },
        { icon: '⚡', effect: 'spin' },
        { icon: '🔥', effect: 'burst' },
        { icon: '💫', effect: 'spin' },
        { icon: '🎊', effect: 'burst' },
        { icon: '🌟', effect: 'pop' },
        { icon: '💥', effect: 'burst' },
        { icon: '⭐', effect: 'spin' },
        { icon: '💎', effect: 'pop' },
        { icon: '🏆', effect: 'rise' },
        { icon: '👑', effect: 'rise' },
        { icon: '🌺', effect: 'pop' },
        { icon: '🌼', effect: 'rise' },
        { icon: '🌻', effect: 'spin' },
        { icon: '🌙', effect: 'rise' },
        { icon: '☄️', effect: 'burst' },
        { icon: '🚀', effect: 'rise' },
        { icon: '🎯', effect: 'spin' },
        { icon: '💯', effect: 'burst' },
        { icon: '✅', effect: 'pop' },
        { icon: '🌀', effect: 'spin' },
        { icon: '🔆', effect: 'burst' },
        { icon: '✴️', effect: 'spin' },
        { icon: '❇️', effect: 'pop' },
        { icon: '🪷', effect: 'rise' },
    ];

    function getRandomCelebration() {
        return CELEBRATIONS[Math.floor(Math.random() * CELEBRATIONS.length)];
    }

    const FONT_CHALLENGE_LOCAL_FONTS = [
        'MS Gothic', 'MS Mincho', 'Meiryo', 'Yu Gothic', 'Yu Mincho',
        'Hiragino Kaku Gothic Pro', 'Hiragino Mincho Pro', 'Osaka',
        'TakaoGothic', 'TakaoMincho', 'Kochi Gothic', 'Kochi Mincho',
    ];

    const FONT_CHALLENGE_WEB_FONTS = [
        'Noto Sans JP', 'Noto Serif JP', 'Sawarabi Gothic', 'Sawarabi Mincho',
        'M PLUS Rounded 1c', 'M PLUS 1p', 'Kosugi', 'Kosugi Maru',
        'Shippori Mincho', 'Yuji Syuku', 'Yuji Mai', 'Yuji Boku',
        'Reggae One', 'RocknRoll One', 'Zen Kurenaido', 'Zen Antique',
        'Zen Antique Soft', 'Zen Maru Gothic', 'Zen Kaku Gothic New', 'Zen Old Mincho',
    ];

    const FONT_CHALLENGE_FONTS = [...FONT_CHALLENGE_LOCAL_FONTS, ...FONT_CHALLENGE_WEB_FONTS];

    function getInputWrapper() { return document.querySelector('.input-wrapper'); }

    function getFontChallengeTarget() {
        return document.querySelector('#main .main_form, #main > span');
    }

    function getLockedFont() {
        try { return GM_getValue('mmLockedChallengeFont', null); }
        catch { return null; }
    }

    function setLockedFont(font) {
        try { GM_setValue('mmLockedChallengeFont', font); } catch { /* no-op */ }
    }

    function getRandomChallengeFont() {
        return FONT_CHALLENGE_FONTS[Math.floor(Math.random() * FONT_CHALLENGE_FONTS.length)];
    }

    function addChallengeWebFont(fontName) {
        if (!FONT_CHALLENGE_WEB_FONTS.includes(fontName)) return;
        const linkId = `mm-font-${fontName.replace(/\s+/g, '-')}`;
        if (document.getElementById(linkId)) return;
        const link = document.createElement('link');
        link.id = linkId;
        link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontName)}&display=swap`;
        link.rel = 'stylesheet';
        document.head.appendChild(link);
    }

    function showFontChallengeMessage(target, message) {
        spawnFloat(message, 'rewind', target);
    }

    function setChallengeFont(target, font) {
        target._mmChallengeFont = font;
        addChallengeWebFont(font);
        target.style.setProperty('font-family', `'${font}', sans-serif`, 'important');
    }

    function clearFontChallengeTarget(target) {
        if (!target?._mmFontChallengeActive) return;
        target.removeEventListener('mouseenter', target._mmFontEnter);
        target.removeEventListener('mouseleave', target._mmFontLeave);
        target.removeEventListener('click', target._mmFontClick);
        if (target._mmOriginalFont) {
            target.style.setProperty('font-family', target._mmOriginalFont, 'important');
        } else {
            target.style.removeProperty('font-family');
        }
        delete target._mmFontChallengeActive;
        delete target._mmOriginalFont;
        delete target._mmChallengeFont;
        delete target._mmFontEnter;
        delete target._mmFontLeave;
        delete target._mmFontClick;
    }

    function applyFontChallenge() {
        const target = getFontChallengeTarget();
        if (!target) return;

        if (!settings.fontChallengeEnabled) {
            clearFontChallengeTarget(target);
            previousFontChallengeText = null;
            return;
        }

        const currentText = target.textContent.trim();
        if (target._mmFontChallengeActive && previousFontChallengeText === currentText) return;
        previousFontChallengeText = currentText;

        clearFontChallengeTarget(target);
        target._mmFontChallengeActive = true;
        target._mmOriginalFont = window.getComputedStyle(target).fontFamily;
        setChallengeFont(target, getLockedFont() || getRandomChallengeFont());

        target._mmFontEnter = () => {
            target.style.setProperty('font-family', target._mmOriginalFont, 'important');
        };
        target._mmFontLeave = () => setChallengeFont(target, target._mmChallengeFont);
        target._mmFontClick = event => {
            if (!settings.fontChallengeEnabled) return;
            if (event.shiftKey) {
                const locked = getLockedFont();
                setLockedFont(locked ? null : target._mmChallengeFont);
                showFontChallengeMessage(target, locked ? 'FONT UNLOCKED' : 'FONT LOCKED');
                return;
            }

            const font = getRandomChallengeFont();
            setChallengeFont(target, font);
            if (getLockedFont()) setLockedFont(font);
        };

        target.addEventListener('mouseenter', target._mmFontEnter);
        target.addEventListener('mouseleave', target._mmFontLeave);
        target.addEventListener('click', target._mmFontClick);
    }

    function clearFontChallenge() {
        clearFontChallengeTarget(getFontChallengeTarget());
        previousFontChallengeText = null;
    }

    function handleCorrect() {
        timeoutInjectedInput = null;
        setRewindSnapshot(makeRewindSnapshot('correct'));
        state.sessionCorrect++;
        state.answerStreak++;
        if (state.answerStreak > state.bestStreak) state.bestStreak = state.answerStreak;

        const prevMult = state.multiplier;
        const newMult  = calcMultiplier(state.answerStreak);
        state.multiplier = newMult;
        if (newMult > state.bestMultiplier) state.bestMultiplier = newMult;

        const pts = calcAnswerPoints(newMult);
        state.score += pts;

        if (newMult > prevMult) {
            showBanner('mm-mult-banner', `${newMult}x COMBO!`);
            playMultiplierUpSound(newMult);
        }

        const milestone = MILESTONES[state.answerStreak];
        if (milestone) {
            showBanner('mm-milestone-banner', milestone);
            spawnFloat(milestone, 'milestone', getInputWrapper());
        }

        updateHUD();
        playCorrectSound();
        stopAnswerTimer();
        flashScreen(true);
        spawnFloat(`+${pts}`, 'correct', getInputWrapper());
        pulseElement(els.hud);
        if (state.answerStreak % 10 === 0) shakeScreen(true);
    }

    function handleIncorrect() {
        timeoutInjectedInput = null;
        setRewindSnapshot(makeRewindSnapshot('incorrect'));
        state.sessionIncorrect++;
        const lostStreak = state.answerStreak;
        state.answerStreak = 0;
        state.multiplier   = 1;

        const penalty = Math.min(state.score, 50 * Math.floor(lostStreak / 5));
        state.score = Math.max(0, state.score - penalty);

        updateHUD();
        playFailSound();
        stopAnswerTimer();
        flashScreen(false);
        shakeScreen(lostStreak > 4);
        arcadeChromatic();

        const anchor = getInputWrapper();
        spawnFloat('WRONG', 'incorrect', anchor);
        if (lostStreak >= 5) spawnFloat(`-${lostStreak} COMBO LOST`, 'incorrect', anchor);
        if (penalty > 0)     spawnFloat(`-${penalty}`, 'incorrect', anchor);

        if (settings.visualsEnabled && !prefersReducedMotion()) {
            document.body.classList.add('mm-wrong-dim');
            setTimeout(() => { document.body.classList.remove('mm-wrong-dim'); }, 600);
        }
    }

    function handleWordComplete() {
        state.wordStreak++;
        state.sessionWords++;
        playWordCompleteSound();

        const counter  = document.querySelector('.top_middle');
        const progress = document.querySelector('[role="progressbar"], .progress, .progress-bar');
        if (counter)  animateClass(counter,  'mm-bounce',        600);
        if (progress) animateClass(progress, 'mm-progress-glow', 600);

        spawnFloat('WORD CLEAR!', 'wordwin', counter);

        const r     = counter?.getBoundingClientRect();
        spawnCelebrate(getRandomCelebration(),
            r ? r.left + r.width  / 2 : window.innerWidth  / 2,
            r ? r.top  + r.height / 2 : window.innerHeight / 2,
        );
        if (Math.random() < 0.55 || state.wordStreak % 5 === 0) triggerShootingStar();
    }

    const GRADES = [
        [acc => acc >= 95, score => score >= 10000, 'S', '#ffe066'],
        [acc => acc >= 90, () => true,              'A', '#7f7'],
        [acc => acc >= 75, () => true,              'B', '#7cf'],
        [acc => acc >= 60, () => true,              'C', '#f90'],
        [() => true,       () => true,              'D', '#f55'],
    ];

    function getGrade(acc, score) {
        return GRADES.find(([a, s]) => a(acc) && s(score));
    }

    function showSummary() {
        stopMusic(0.6);
        playSessionEndSound();
        const total   = state.sessionCorrect + state.sessionIncorrect;
        const acc     = total > 0 ? Math.round(state.sessionCorrect / total * 100) : 0;
        const elapsed = Math.round((Date.now() - state.sessionStart) / 1000);
        const [,, g, c] = getGrade(acc, state.score);

        const stat = (label, val, cls) =>
            `<div class="mm-summary-cell">${label}<span class="mm-summary-val ${cls}">${val}</span></div>`;

        const overlay = document.getElementById('mm-summary');
        overlay.innerHTML = `
            <div id="mm-summary-inner">
                <h2>SESSION COMPLETE</h2>
                <div id="mm-grade" style="color:${c}">${g}</div>
                <div class="mm-summary-grid">
                    ${stat('SCORE',      state.score.toLocaleString(), 'gold')}
                    ${stat('ACCURACY',   `${acc}%`,                    'green')}
                    ${stat('CORRECT',    state.sessionCorrect,          'cyan')}
                    ${stat('INCORRECT',  state.sessionIncorrect,        '')}
                    ${stat('WORDS DONE', state.sessionWords,            'orange')}
                    ${stat('BEST COMBO', `x${state.bestStreak}`,        'pink')}
                    ${stat('BEST MULT',  `x${state.bestMultiplier}`,    'orange')}
                    ${stat('TIME',       `${Math.floor(elapsed/60)}m ${elapsed%60}s`, 'cyan')}
                </div>
                <button id="mm-summary-close">CONTINUE</button>
            </div>`;
        overlay.classList.add('open');
        overlay.querySelector('#mm-summary-close')
               .addEventListener('click', () => overlay.classList.remove('open'));
    }

    function observeCorrectness() {
        correctnessObserver?.disconnect();
        correctnessObserver = new MutationObserver(mutations => {
            for (const { type, attributeName, target: el } of mutations) {
                if (type !== 'attributes' || attributeName !== 'class') continue;
                if (!el.classList?.contains('input-wrapper')) continue;
                const correct   = el.classList.contains('correct');
                const incorrect = el.classList.contains('incorrect');
                if (!correct && !incorrect) {
                    if (pendingRewindRestore) {
                        restoreRewindSnapshot('native');
                    } else if (lastAnswerState) {
                        setRewindSnapshot(null);
                        timeoutAutoFailing = false;
                        applyFontChallenge();
                        refreshAnswerTimerForCurrentQuestion();
                    }
                    lastAnswerState = null;
                    syncArcadePresentation();
                    continue;
                }
                if (correct   && lastAnswerState !== 'correct')   { lastAnswerState = 'correct';   handleCorrect();   }
                if (incorrect && lastAnswerState !== 'incorrect')  {
                    lastAnswerState = 'incorrect';
                    handleIncorrect();
                    if (timeoutAutoFailing) setTimeout(clickNextAfterTimeoutFail, 150);
                }
                syncArcadePresentation();
            }
        });
        correctnessObserver.observe(document.body,
            { subtree: true, attributes: true, attributeFilter: ['class'] });
    }

    function observeCounter() {
        counterObserver?.disconnect();
        counterObserver = new MutationObserver(() => {
            const counter = document.querySelector('.top_middle');
            if (!counter) return;
            const [rawCur, rawMax] = counter.textContent.split('/');
            const current = parseInt(rawCur, 10), max = parseInt(rawMax, 10);
            if (isNaN(current) || isNaN(max)) return;
            if (current > state.lastCompleted) {
                state.lastCompleted = current;
                handleWordComplete();
                applyFontChallenge();
                refreshAnswerTimerForCurrentQuestion();
            }
            if (current === max && max > 0 && state.sessionActive
                && !document.getElementById('mm-summary').classList.contains('open')) {
                state.sessionActive = false;
                setTimeout(showSummary, 800);
            }
        });
        counterObserver.observe(document.body,
            { childList: true, subtree: true, characterData: true });
    }

    function init() {
        if (initialized || !document.querySelector('.input-wrapper')) return;
        settings.backgroundTheme = settings.pinnedBackgroundTheme;
        resetState();
        injectStyles();
        injectUI();

        const counter = document.querySelector('.top_middle');
        if (counter?.textContent.includes('/')) {
            state.lastCompleted = parseInt(counter.textContent, 10) || 0;
        }

        if (!document.getElementById('mm-summary')) {
            document.body.appendChild(el('div', 'mm-summary'));
        }

        observeCorrectness();
        observeCounter();
        installNativeRewindDetection();
        installMusicLifecycle();
        updateHUD();
        applyFontChallenge();
        armFirstAnswerTimer();
        syncArcadePresentation();
        initialized = true;
    }

    function cleanup() {
        correctnessObserver?.disconnect();  correctnessObserver = null;
        counterObserver?.disconnect();      counterObserver = null;
        uninstallNativeRewindDetection();
        uninstallMusicLifecycle();
        if (hudResizeHandler) {
            window.removeEventListener('resize', hudResizeHandler);
            hudResizeHandler = null;
        }
        stopAnswerTimer();
        removeFirstAnswerInputGate();
        clearFontChallenge();
        hudDrag = null;
        rewindSnapshot = null;
        pendingRewindRestore = false;
        timeoutAutoFailing = false;
        timeoutInjectedInput = null;
        firstAnswerTimerStarted = false;
        els = {};
        initialized     = false;
        lastAnswerState = null;

        ['mm-hud','mm-flash','mm-mult-banner','mm-milestone-banner',
         'mm-settings','mm-summary','mm-gamify-styles'].forEach(id =>
            document.getElementById(id)?.remove()
        );
        arcadeOff();
        document.body.classList.remove('mm-shake-light', 'mm-shake-hard', 'mm-wrong-dim');
    }

    function isReviewPage() { return location.href.includes('/study-lists/reviews'); }

    function tryInitGamify() {
        const onReview = isReviewPage();
        if (onReview && !gamifyActive)  { gamifyActive = true;  init(); }
        if (!onReview && gamifyActive)  { gamifyActive = false; cleanup(); }
    }

    new MutationObserver(() => {
        if (!gamifyActive) return;
        const has = !!document.querySelector('.input-wrapper');
        if (has && !initialized)  init();
        if (has && initialized) applyFontChallenge();
        if (!has && initialized && !isReviewPage()) { cleanup(); gamifyActive = false; }
    }).observe(document.body, { childList: true, subtree: true });

    ['pushState', 'replaceState'].forEach(method => {
        const orig = history[method];
        history[method] = function (...args) {
            const r = orig.apply(this, args);
            tryInitGamify();
            return r;
        };
    });
    window.addEventListener('popstate', tryInitGamify);

    setInterval(() => {
        if (location.href !== lastUrl) { lastUrl = location.href; tryInitGamify(); }
    }, 300);

    tryInitGamify();

})();
