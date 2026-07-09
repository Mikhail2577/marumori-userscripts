// ==UserScript==
// @name         MaruMori Even More Gamified - Updated
// @namespace    marumori-gamify
// @version      3.5.1
// @description  Gamifies MaruMori review sessions with arcade combo audio, score multipliers, screen shake, floating damage numbers, and more
// @match        https://marumori.io/*
// @author       matskye
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_getResourceURL
// @resource     mmShrineGarden https://raw.githubusercontent.com/Mikhail2577/marumori-userscripts/main/even-more-gamified/assets/shrine-garden.jpg?v=3.5.1
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
        performanceProfile: 'balanced',
        musicEnabled:   false,
        musicStyle:     'lofi',
        musicVolume:    0.16,
        backgroundTheme: 'default',
        pinnedBackgroundTheme: 'default',
        volume:         0.5,    // 0–1
        comboTimeout:   15000,  // ms before idle combo reset
        hudPosition:    null,
        hudCollapsed:   false,
    };

    const BACKGROUND_THEMES = [
        'default', 'starfield', 'nebula', 'grid', 'gamecenter', 'shrine', 'matrix', 'void',
    ];
    const CANVAS_BACKGROUND_THEMES = [
        'starfield', 'nebula', 'grid', 'gamecenter', 'shrine', 'matrix',
    ];
    const SHOOTING_STAR_THEMES = ['starfield'];
    const MUSIC_STYLES = ['lofi', 'retro'];
    const MUSIC_STYLE_LABELS = { lofi: 'LO-FI', retro: 'RETRO' };
    const PERFORMANCE_PROFILES = ['max', 'balanced', 'lite'];
    const PERFORMANCE_PROFILE_LABELS = {
        max: 'MAX',
        balanced: 'BALANCED',
        lite: 'LITE',
    };
    const BACKGROUND_THEME_LABELS = {
        default: 'DEFAULT',
        starfield: 'STARFIELD',
        nebula: 'NEBULA',
        grid: 'GRID',
        gamecenter: 'GAME CENTER',
        shrine: 'SHRINE',
        matrix: 'MATRIX',
        void: 'VOID',
    };
    const REMOVED_BACKGROUND_THEME_FALLBACKS = {
        aurora: 'starfield',
        rain: 'default',
        constellation: 'starfield',
        snow: 'default',
    };
    const SHRINE_IMAGE_URL =
        'https://raw.githubusercontent.com/Mikhail2577/marumori-userscripts/'
        + 'main/even-more-gamified/assets/shrine-garden.jpg?v=3.5.1';
    const RESOLVED_BACKDROP_OPACITY = 0.5;

    const BOOL_SETTINGS = [
        'sfxEnabled', 'visualsEnabled', 'hudEnabled', 'shakeEnabled',
        'floatEnabled', 'flashEnabled', 'arcadeEnabled', 'autoFailTimeout',
        'fontChallengeEnabled', 'musicEnabled', 'hudCollapsed',
    ];

    function clamp(num, min, max, fallback) {
        const parsed = Number(num);
        return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
    }

    function debounce(fn, wait = 120) {
        let timer = null;
        const debounced = function (...args) {
            if (timer) clearTimeout(timer);
            timer = setTimeout(() => {
                timer = null;
                fn.apply(this, args);
            }, wait);
        };
        debounced.cancel = () => {
            if (timer) clearTimeout(timer);
            timer = null;
        };
        return debounced;
    }

    function setTextIfChanged(node, value) {
        if (!node) return;
        const text = String(value);
        if (node.textContent !== text) node.textContent = text;
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
        if (PERFORMANCE_PROFILES.includes(raw.performanceProfile)) {
            next.performanceProfile = raw.performanceProfile;
        } else if (raw.performanceMode === true) {
            next.performanceProfile = 'lite';
        }
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
    let settingsSaveTimer = null;

    function saveSettings() {
        if (settingsSaveTimer) {
            clearTimeout(settingsSaveTimer);
            settingsSaveTimer = null;
        }
        try { GM_setValue('mmSettings', JSON.stringify(settings)); } catch { /* no-op */ }
    }

    let settings = loadSettings();

    function isLiteMode() {
        return settings.performanceProfile === 'lite';
    }

    function isMaxMode() {
        return settings.performanceProfile === 'max';
    }

    function scheduleSettingsSave() {
        if (settingsSaveTimer) clearTimeout(settingsSaveTimer);
        settingsSaveTimer = setTimeout(saveSettings, 180);
    }

    function flushSettingsSave() {
        if (settingsSaveTimer) saveSettings();
    }

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

    let recordsSaveTimer = null;
    let lastRecordsSaveAt = 0;

    function saveRecords() {
        if (recordsSaveTimer) {
            clearTimeout(recordsSaveTimer);
            recordsSaveTimer = null;
        }
        try { GM_setValue('mmRecords', JSON.stringify(records)); } catch { /* no-op */ }
        lastRecordsSaveAt = Date.now();
    }

    function scheduleRecordsSave() {
        if (recordsSaveTimer) return;
        // Score records can change on every answer; cap extension writes at one per second.
        const delay = Math.max(0, 1000 - (Date.now() - lastRecordsSaveAt));
        recordsSaveTimer = setTimeout(saveRecords, delay);
    }

    function flushRecordsSave() {
        if (recordsSaveTimer) saveRecords();
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
            scheduleRecordsSave();
        }
    }

    let initialized         = false;
    let gamifyActive        = false;
    let lastUrl             = location.href;
    let lastAnswerState     = null;
    let correctnessObserver = null;
    let correctnessTarget   = null;
    let counterObserver     = null;
    let counterTarget       = null;
    let comboBarTimer       = null;
    let comboBarRaf         = null;
    let comboBarStart       = null;
    let hudResizeHandler    = null;
    let hudDrag             = null;
    let hudDragRaf          = null;
    let hudCollapseTimer    = null;
    let hudMicroTimer       = null;
    let hudMicroEl          = null;
    let rewindSnapshot      = null;
    let pendingRewindRestore = false;
    let timeoutAutoFailing  = false;
    let timeoutFallbackTimer = null;
    let timeoutInjectedInput = null;
    let firstAnswerTimerStarted = false;
    let firstAnswerInputEl = null;
    let firstAnswerInputHandler = null;
    let previousFontChallengeText = null;
    let documentClickHandler = null;
    let documentKeyHandler   = null;
    let domSyncRaf            = null;
    let inputWrapperCache     = null;
    let counterCache          = null;
    let fontTargetCache       = null;
    let lastLiteFloatAt       = 0;
    let summaryTimer          = null;
    let sessionEndSoundTimer  = null;
    let els = {};

    let audioCtx = null;
    let audioSuspendTimer = null;
    let musicGain = null;
    let musicTimer = null;
    let musicRestartTimer = null;
    let musicPatternIndex = 0;
    let musicGestureHandler = null;
    let musicVisibilityHandler = null;
    const musicOscillators = new Set();
    const reduceMotionMedia = window.matchMedia?.('(prefers-reduced-motion: reduce)');

    function prefersReducedMotion() {
        return reduceMotionMedia?.matches === true;
    }

    function getAudioCtx() {
        try {
            if (audioSuspendTimer) {
                clearTimeout(audioSuspendTimer);
                audioSuspendTimer = null;
            }
            if (!audioCtx || audioCtx.state === 'closed') {
                audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            }
            if (audioCtx.state === 'suspended') audioCtx.resume();
            return audioCtx;
        } catch { return null; }
    }

    function scheduleAudioSuspend(delay = 450) {
        if (audioSuspendTimer) clearTimeout(audioSuspendTimer);
        audioSuspendTimer = setTimeout(() => {
            audioSuspendTimer = null;
            if (audioCtx?.state === 'running') {
                try { audioCtx.suspend().catch(() => {}); } catch { /* no-op */ }
            }
        }, delay);
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
            if (!musicGain) {
                scheduleAudioSuspend(Math.max(2000, (delay + duration + 0.2) * 1000));
            }
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
        musicOscillators.add(osc);
        osc.addEventListener('ended', () => musicOscillators.delete(osc), { once: true });
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
        if (!musicGain || !settings.musicEnabled || isLiteMode()
            || !state.sessionActive || document.hidden) return;
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
            musicOscillators.clear();
            return;
        }
        const gain = musicGain;
        musicGain = null;
        const now = audioCtx.currentTime;
        for (const osc of musicOscillators) {
            try { osc.stop(now + Math.max(0.02, fadeSeconds)); } catch { /* already stopped */ }
        }
        musicOscillators.clear();
        gain.gain.cancelScheduledValues(now);
        gain.gain.setValueAtTime(gain.gain.value, now);
        gain.gain.linearRampToValueAtTime(0, now + fadeSeconds);
        setTimeout(() => gain.disconnect(), (fadeSeconds + 0.1) * 1000);
        scheduleAudioSuspend((fadeSeconds + 0.15) * 1000);
    }

    function startMusic() {
        if (!settings.musicEnabled || isLiteMode()
            || !state.sessionActive || document.hidden || musicGain) return;
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
        if (musicRestartTimer) clearTimeout(musicRestartTimer);
        musicRestartTimer = setTimeout(() => {
            musicRestartTimer = null;
            startMusic();
        }, 180);
    }

    function installMusicLifecycle() {
        if (!musicGestureHandler) {
            musicGestureHandler = () => {
                if (settings.musicEnabled) startMusic();
                if (musicGain || !settings.musicEnabled || isLiteMode()) {
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
                if (document.hidden) {
                    stopMusic(0.2);
                    scheduleAudioSuspend(260);
                } else {
                    startMusic();
                }
            };
            document.addEventListener('visibilitychange', musicVisibilityHandler);
        }
    }

    function uninstallMusicLifecycle() {
        stopMusic();
        scheduleAudioSuspend();
        if (musicRestartTimer) {
            clearTimeout(musicRestartTimer);
            musicRestartTimer = null;
        }
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
        if (isLiteMode()) return;
        if (state.answerStreak % 5  === 0) playTone(freq * 1.5, 0.12, 0.15, 'square',   0.04);
        if (state.answerStreak % 10 === 0) playTone(freq * 2,   0.15, 0.12, 'triangle', 0.08);
        if (state.answerStreak % 20 === 0) {
            [1, 1.25, 1.5, 2].forEach((r, i) => playTone(freq * r, 0.2, 0.18, 'triangle', i * 0.06));
        }
        if (Math.random() < 0.07) playTone(freq * 2.5, 0.2, 0.28, 'sine', 0.03);
    }

    function playFailSound() {
        playTone(300,   0.15, 0.25, 'sawtooth');
        if (isLiteMode()) return;
        playTone(180,   0.20, 0.20, 'sawtooth', 0.12);
    }

    function playWordCompleteSound() {
        const extra = Math.min(state.wordStreak * 6, 120);
        if (isLiteMode()) {
            playTone(659 + extra, 0.14, 0.16, 'triangle');
            return;
        }
        [523, 659, 784].forEach((n, i) => playTone(n + extra, 0.18, 0.22, 'triangle', i * 0.12));
    }

    function playMultiplierUpSound(mult) {
        const f = [330, 440, 550, 660, 880][Math.min(mult - 1, 4)];
        playTone(f,       0.10, 0.20, 'square');
        if (isLiteMode()) return;
        playTone(f * 1.5, 0.14, 0.18, 'square',   0.06);
        playTone(f * 2,   0.18, 0.14, 'triangle', 0.12);
    }

    function playComboBreakSound() {
        if (isLiteMode()) {
            playTone(240, 0.16, 0.18, 'sawtooth');
            return;
        }
        [400, 300, 200].forEach((f, i) => playTone(f, 0.18, 0.22, 'sawtooth', i * 0.08));
    }

    function playSessionEndSound() {
        if (sessionEndSoundTimer) clearTimeout(sessionEndSoundTimer);
        if (isLiteMode()) {
            playTone(659, 0.18, 0.16, 'triangle');
            playTone(784, 0.22, 0.16, 'triangle', 0.1);
            return;
        }
        [523, 659, 784, 1047].forEach((f, i) => playTone(f, 0.22, 0.20, 'triangle', i * 0.14));
        sessionEndSoundTimer = setTimeout(() => {
            sessionEndSoundTimer = null;
            playTone(1047, 0.4, 0.25, 'sine');
        }, 650);
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
            box-sizing: content-box; width: 180px; min-width: 180px;
            font-size: 11px; z-index: 9999;
            line-height: 1.8; image-rendering: pixelated;
            display: flex; flex-direction: column;
            cursor: grab; touch-action: none;
            overflow: hidden; user-select: none;
            transition: width 0.24s ease, min-width 0.24s ease,
                padding 0.24s ease, background 0.24s ease,
                border-color 0.24s ease, box-shadow 0.2s ease, opacity 0.3s;
        }
        #mm-hud.dragging { cursor: grabbing; opacity: 0.92; }
        #mm-hud.hidden  { opacity: 0; pointer-events: none; }
        #mm-hud.glow    { box-shadow: 0 0 18px 4px #f90; }
        #mm-hud.danger  { box-shadow: 0 0 18px 4px #f33; }

        #mm-hud-header {
            display: flex; align-items: center; justify-content: space-between;
            min-height: 18px; margin-bottom: 4px; order: 0;
        }
        #mm-hud-title {
            color: rgba(255,255,255,0.42); font-size: 7px;
            line-height: 1; white-space: nowrap;
        }
        #mm-hud-collapse-btn {
            display: grid; place-items: center; width: 20px; height: 20px;
            padding: 0; border: 1px solid rgba(255,255,255,0.16);
            border-radius: 4px; background: rgba(255,255,255,0.04);
            color: #aaa; font-family: inherit; font-size: 11px;
            line-height: 1; cursor: pointer; flex: 0 0 auto;
        }
        #mm-hud-collapse-btn:hover {
            color: #fff; border-color: rgba(255,153,0,0.7);
            background: rgba(255,153,0,0.1);
        }
        #mm-hud-collapse-btn:focus-visible {
            outline: 2px solid #7cf; outline-offset: 2px;
        }
        #mm-hud-stats { display: block; order: 1; }
        .mm-hud-stat {
            min-width: 0; margin-top: 4px;
            transition: opacity 0.18s ease, transform 0.24s ease,
                max-height 0.24s ease, margin 0.24s ease;
        }
        .mm-hud-stat:first-child { margin-top: 0; }
        .mm-hud-label { color: #aaa; font-size: 8px; }
        .mm-hud-label-short { display: none; }
        .mm-hud-value { font-variant-numeric: tabular-nums; }
        .mm-hud-secondary { max-height: 44px; opacity: 1; overflow: hidden; }

        #mm-hud-score  { color: #ffe066; font-size: 13px; }
        #mm-hud-combo  { color: #7cf;    font-size: 13px; }
        #mm-hud-mult   { color: #f90;    font-size: 13px; }
        #mm-hud-streak { color: #7f7;    font-size: 13px; }
        #mm-hud-acc    { color: #c9f;    font-size: 11px; }
        #mm-hud-bonus  { color: #f90;    font-size: 11px; }
        #mm-hud-record { color: #ffe066; font-size: 8px; line-height: 1.7; }
        #mm-hud-record span { color: #7cf; }

        #mm-hud-controls {
            max-height: 82px; opacity: 1; overflow: hidden;
            order: 3;
            transition: max-height 0.24s ease, opacity 0.16s ease,
                transform 0.24s ease;
        }
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
            order: 2;
            background: rgba(255,255,255,0.1); border-radius: 2px; overflow: hidden;
        }
        #mm-combo-bar {
            height: 100%; width: 100%; border-radius: 2px;
            background: linear-gradient(90deg, #f90, #ffe066);
            transition: background 0.3s;
        }
        #mm-combo-bar.low { background: linear-gradient(90deg, #f33, #f93); }

        /* compact draggable HUD */
        #mm-hud.mm-panel-collapsed {
            width: min(340px, calc(100vw - 72px)); min-width: 0;
            padding: 6px 9px 8px;
            background: rgba(3,7,18,0.72);
            border-color: rgba(160,205,255,0.2);
            backdrop-filter: blur(10px) saturate(1.1);
            -webkit-backdrop-filter: blur(10px) saturate(1.1);
            line-height: 1.2;
        }
        #mm-hud.mm-panel-collapsed #mm-hud-header {
            min-height: 16px; margin-bottom: 4px;
        }
        #mm-hud.mm-panel-collapsed #mm-hud-title {
            color: rgba(190,220,255,0.52); font-size: 6px;
        }
        #mm-hud.mm-panel-collapsed #mm-hud-collapse-btn {
            width: 18px; height: 18px; font-size: 10px;
        }
        #mm-hud.mm-panel-collapsed #mm-hud-stats {
            display: grid;
            grid-template-columns: 1.25fr repeat(4, 1fr);
            align-items: center; order: 2;
        }
        #mm-hud.mm-panel-collapsed #mm-combo-bar-wrap {
            height: 3px; margin: 1px 0 6px; order: 1;
        }
        #mm-hud.mm-panel-collapsed .mm-hud-stat {
            margin: 0; padding: 0 7px;
            border-left: 1px solid rgba(255,255,255,0.1);
            transform: translateY(0);
        }
        #mm-hud.mm-panel-collapsed .mm-hud-stat:first-child {
            padding-left: 0; border-left: 0;
        }
        #mm-hud.mm-panel-collapsed .mm-hud-label {
            display: block; overflow: hidden; color: rgba(215,225,240,0.52);
            font-size: 6px; line-height: 1.1; white-space: nowrap;
            text-overflow: ellipsis;
        }
        #mm-hud.mm-panel-collapsed .mm-hud-label-full { display: none; }
        #mm-hud.mm-panel-collapsed .mm-hud-label-short { display: inline; }
        #mm-hud.mm-panel-collapsed .mm-hud-value {
            display: block; overflow: hidden; margin-top: 2px;
            font-size: 10px; line-height: 1.15; white-space: nowrap;
            text-overflow: ellipsis;
        }
        #mm-hud.mm-panel-collapsed .mm-hud-secondary {
            display: none;
        }
        #mm-hud.mm-panel-collapsed #mm-hud-controls {
            max-height: 0; opacity: 0; transform: translateY(-5px);
            pointer-events: none;
        }

        body.mm-performance-mode #mm-hud.mm-panel-collapsed {
            background: rgba(3,7,18,0.9);
            backdrop-filter: none;
            -webkit-backdrop-filter: none;
        }
        body.mm-performance-mode #mm-hud,
        body.mm-performance-mode #mm-combo-bar {
            transition: none;
        }

        .mm-hud-micro {
            position: fixed; z-index: 10000; pointer-events: none;
            padding: 5px 8px; border: 1px solid rgba(255,255,255,0.16);
            border-radius: 4px; background: rgba(2,5,14,0.86);
            color: #ffe066; font-family: var(--mm-arcade-font);
            font-size: 8px; line-height: 1; white-space: nowrap;
            box-shadow: 0 5px 18px rgba(0,0,0,0.32);
            animation: mmHudMicro 0.85s ease-out forwards;
        }
        .mm-hud-micro.mult { color: #f90; }
        .mm-hud-micro.streak { color: #7f7; }
        .mm-hud-micro.fail { color: #f66; }
        @keyframes mmHudMicro {
            0%   { opacity: 0; transform: translateY(3px) scale(0.96); }
            18%  { opacity: 1; transform: translateY(0) scale(1); }
            72%  { opacity: 1; transform: translateY(-3px) scale(1); }
            100% { opacity: 0; transform: translateY(-10px) scale(0.98); }
        }

        @media (max-width: 480px) {
            #mm-hud.mm-panel-collapsed {
                width: min(270px, calc(100vw - 56px));
            }
            #mm-hud.mm-panel-collapsed #mm-hud-stats {
                grid-template-columns: repeat(3, 1fr);
                row-gap: 5px;
            }
            #mm-hud.mm-panel-collapsed .mm-hud-stat:nth-child(4) {
                padding-left: 0; border-left: 0;
            }
        }

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
            .mm-float, .mm-hud-micro, #mm-mult-banner, #mm-milestone-banner,
            .mm-celebrate, #mm-flash, body.mm-shake-light,
            body.mm-shake-hard, .mm-pulse, .mm-bounce,
            .mm-progress-glow, #mm-summary-inner {
                animation: none !important;
                transition: none !important;
            }

            .mm-float, .mm-hud-micro, #mm-mult-banner, #mm-milestone-banner,
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
            <div id="mm-hud-header">
                <span id="mm-hud-title">LIVE STATS</span>
                <button id="mm-hud-collapse-btn" type="button"
                    aria-label="Collapse HUD" aria-expanded="true" title="Collapse HUD">−</button>
            </div>
            <div id="mm-hud-stats">
                <div class="mm-hud-stat">
                    <div class="mm-hud-label" id="mm-hud-score-label">SCORE</div>
                    <div class="mm-hud-value" id="mm-hud-score">0</div>
                </div>
                <div class="mm-hud-stat">
                    <div class="mm-hud-label" id="mm-hud-combo-label">COMBO</div>
                    <div class="mm-hud-value" id="mm-hud-combo">x0</div>
                </div>
                <div class="mm-hud-stat">
                    <div class="mm-hud-label" id="mm-hud-mult-label">
                        <span class="mm-hud-label-full">MULTIPLIER</span>
                        <span class="mm-hud-label-short">MULT</span>
                    </div>
                    <div class="mm-hud-value" id="mm-hud-mult">x1</div>
                </div>
                <div class="mm-hud-stat">
                    <div class="mm-hud-label" id="mm-hud-streak-label">
                        <span class="mm-hud-label-full">WORD STREAK</span>
                        <span class="mm-hud-label-short">STREAK</span>
                    </div>
                    <div class="mm-hud-value" id="mm-hud-streak">0</div>
                </div>
                <div class="mm-hud-stat mm-hud-secondary">
                    <div class="mm-hud-label" id="mm-hud-acc-label">ACCURACY</div>
                    <div class="mm-hud-value" id="mm-hud-acc">—</div>
                </div>
                <div class="mm-hud-stat">
                    <div class="mm-hud-label" id="mm-hud-bonus-label">XP BONUS</div>
                    <div class="mm-hud-value" id="mm-hud-bonus">x1.00</div>
                </div>
                <div class="mm-hud-stat mm-hud-secondary">
                    <div class="mm-hud-label" id="mm-hud-record-label">7D BEST</div>
                    <div class="mm-hud-value" id="mm-hud-record">
                        S <span>0</span> / C <span>x0</span> / M <span>x1</span>
                    </div>
                </div>
            </div>
            <div id="mm-combo-bar-wrap"><div id="mm-combo-bar"></div></div>
            <div id="mm-hud-controls">
                <button id="mm-hud-rewind-btn" disabled>⟲ REWIND</button>
                <button id="mm-hud-settings-btn">⚙ SETTINGS</button>
            </div>
        `);
        if (!settings.hudEnabled) hud.classList.add('hidden');
        if (settings.hudCollapsed) hud.classList.add('mm-panel-collapsed');
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
            collapse: document.getElementById('mm-hud-collapse-btn'),
            hudTitle: document.getElementById('mm-hud-title'),
            settings: document.getElementById('mm-settings'),
        };

        syncHudCollapseControl();
        applyHudPosition(settings.hudPosition);
        installHudDrag();

        els.collapse.addEventListener('click', () => {
            setHudCollapsed(!settings.hudCollapsed);
        });
        hud.querySelector('#mm-hud-settings-btn')
           .addEventListener('click', () => {
               els.settings.classList.toggle('open');
               if (els.settings.classList.contains('open')) positionSettingsPanel();
           });
        hud.querySelector('#mm-hud-rewind-btn')
           .addEventListener('click', () => requestRewind('hud'));

        wireSettingsPanel();
    }

    function syncHudCollapseControl() {
        if (!els.collapse || !els.hudTitle) return;
        const collapsed = settings.hudCollapsed;
        els.hudTitle.textContent = collapsed ? 'HUD' : 'LIVE STATS';
        els.collapse.textContent = collapsed ? '+' : '−';
        els.collapse.setAttribute('aria-expanded', String(!collapsed));
        els.collapse.setAttribute('aria-label', collapsed ? 'Expand HUD' : 'Collapse HUD');
        els.collapse.title = collapsed ? 'Expand HUD' : 'Collapse HUD';
    }

    function setHudCollapsed(collapsed) {
        if (!els.hud) return;
        settings.hudCollapsed = Boolean(collapsed);
        els.hud.classList.toggle('mm-panel-collapsed', settings.hudCollapsed);
        if (settings.hudCollapsed) els.settings?.classList.remove('open');
        syncHudCollapseControl();
        saveSettings();

        if (hudCollapseTimer) clearTimeout(hudCollapseTimer);
        hudCollapseTimer = setTimeout(() => {
            hudCollapseTimer = null;
            const next = applyHudPosition(settings.hudPosition);
            if (settings.hudPosition && next) {
                settings.hudPosition = next;
                saveSettings();
            }
        }, prefersReducedMotion() ? 0 : 260);
    }

    function el(tag, id, html = '') {
        const node = document.createElement(tag);
        node.id = id;
        if (html) node.innerHTML = html;
        return node;
    }

    function clampHudPosition(pos, hud = els.hud, dimensions = null) {
        const margin = 20;
        const width = dimensions?.width || hud?.offsetWidth || 220;
        const height = dimensions?.height || hud?.offsetHeight || 330;
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

    function applyHudPosition(pos, dimensions = null) {
        if (!els.hud) return null;
        const next = clampHudPosition(pos || getDefaultHudPosition(), els.hud, dimensions);
        els.hud.style.left = `${next.x}px`;
        els.hud.style.top = `${next.y}px`;
        els.hud.style.right = 'auto';
        els.hud.style.bottom = 'auto';
        if (els.settings?.classList.contains('open')) positionSettingsPanel();
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

        hudResizeHandler = debounce(() => {
            const next = applyHudPosition(settings.hudPosition);
            if (settings.hudPosition && next) {
                settings.hudPosition = next;
                saveSettings();
            }
        }, 140);
        window.addEventListener('resize', hudResizeHandler);

        els.hud.addEventListener('pointerdown', event => {
            if (event.button !== 0 || event.target.closest?.('button, input, label, a')) return;
            const rect = els.hud.getBoundingClientRect();
            hudDrag = {
                pointerId: event.pointerId,
                offsetX: event.clientX - rect.left,
                offsetY: event.clientY - rect.top,
                width: rect.width,
                height: rect.height,
                pendingPosition: null,
            };
            els.hud.classList.add('dragging');
            els.hud.setPointerCapture?.(event.pointerId);
            event.preventDefault();
        });

        els.hud.addEventListener('pointermove', event => {
            if (!hudDrag || hudDrag.pointerId !== event.pointerId) return;
            hudDrag.pendingPosition = {
                x: event.clientX - hudDrag.offsetX,
                y: event.clientY - hudDrag.offsetY,
            };
            if (hudDragRaf) return;
            hudDragRaf = requestAnimationFrame(() => {
                hudDragRaf = null;
                if (!hudDrag?.pendingPosition) return;
                const next = applyHudPosition(hudDrag.pendingPosition, hudDrag);
                hudDrag.pendingPosition = null;
                if (next) settings.hudPosition = next;
            });
        });

        const stopDrag = event => {
            if (!hudDrag || hudDrag.pointerId !== event.pointerId) return;
            if (hudDragRaf) {
                cancelAnimationFrame(hudDragRaf);
                hudDragRaf = null;
            }
            if (hudDrag.pendingPosition) {
                const next = applyHudPosition(hudDrag.pendingPosition, hudDrag);
                if (next) settings.hudPosition = next;
            }
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
        setTextIfChanged(els.score, state.score.toLocaleString());
        setTextIfChanged(els.combo, `x${state.answerStreak}`);
        setTextIfChanged(els.mult, `x${state.multiplier}`);
        setTextIfChanged(els.streak, state.wordStreak);
        setTextIfChanged(els.acc, total > 0
            ? `${Math.round(state.sessionCorrect / total * 100)}%` : '—');
        setTextIfChanged(els.bonus, `x${getDifficultyXpMultiplier().toFixed(2)}`);
        const recordMarkup = `S <span>${rollingRecords.score.toLocaleString()}</span> / `
            + `C <span>x${rollingRecords.combo}</span> / M <span>x${rollingRecords.multiplier}</span>`;
        if (els.record._mmMarkup !== recordMarkup) {
            els.record.innerHTML = recordMarkup;
            els.record._mmMarkup = recordMarkup;
        }

        els.hud.classList.toggle('glow',   state.answerStreak >= 10);
        els.hud.classList.toggle('danger', state.answerStreak === 0 && state.sessionIncorrect > 0);
        updateRewindButton();
    }

    function showHudMicro(text, tone = 'score') {
        if (isLiteMode() || !settings.hudCollapsed || !settings.visualsEnabled
            || prefersReducedMotion() || !els.hud) return;

        if (hudMicroTimer) clearTimeout(hudMicroTimer);
        hudMicroEl?.remove();

        const node = document.createElement('div');
        node.className = `mm-hud-micro ${tone}`;
        node.textContent = text;
        document.body.appendChild(node);
        hudMicroEl = node;

        const hudRect = els.hud.getBoundingClientRect();
        const gap = 7;
        const maxLeft = Math.max(8, window.innerWidth - node.offsetWidth - 8);
        const left = clamp(
            hudRect.left + (hudRect.width - node.offsetWidth) / 2,
            8,
            maxLeft,
            8
        );
        const fitsBelow = hudRect.bottom + gap + node.offsetHeight <= window.innerHeight - 8;
        node.style.left = `${left}px`;
        node.style.top = `${fitsBelow
            ? hudRect.bottom + gap
            : Math.max(8, hudRect.top - node.offsetHeight - gap)}px`;

        hudMicroTimer = setTimeout(() => {
            node.remove();
            if (hudMicroEl === node) hudMicroEl = null;
            hudMicroTimer = null;
        }, 900);
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
                <label>Visual Profile</label>
                <button class="mm-cycle-btn" id="mm-performance-profile" type="button">
                    ${PERFORMANCE_PROFILE_LABELS[settings.performanceProfile]}
                </button>
            </div>
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
            scheduleSettingsSave();
        });

        panel.querySelector('#mm-performance-profile').addEventListener('click', e => {
            const current = PERFORMANCE_PROFILES.indexOf(settings.performanceProfile);
            settings.performanceProfile =
                PERFORMANCE_PROFILES[(current + 1) % PERFORMANCE_PROFILES.length];
            e.currentTarget.textContent =
                PERFORMANCE_PROFILE_LABELS[settings.performanceProfile];
            saveSettings();
            applyPerformanceProfileSideEffects();
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
            scheduleSettingsSave();
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

    function syncPerformanceProfilePresentation() {
        document.body.classList.toggle('mm-performance-mode', isLiteMode());
        document.body.classList.toggle('mm-max-mode', isMaxMode());
    }

    function applyPerformanceProfileSideEffects() {
        syncPerformanceProfilePresentation();
        isLiteMode() ? stopMusic(0.12) : startMusic();
        if (settings.fontChallengeEnabled) {
            clearFontChallenge();
            applyFontChallenge();
        }
        restartArcadeBackdrop();
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
        const scheduleNextPaint = tick => {
            if (isMaxMode()) {
                comboBarRaf = requestAnimationFrame(tick);
            } else {
                comboBarTimer = setTimeout(tick, isLiteMode() ? 200 : 1000 / 30);
            }
        };
        const tick = now => {
            comboBarRaf = null;
            comboBarTimer = null;
            const paintTime = Number.isFinite(now) ? now : performance.now();
            const pct = Math.max(0, 1 - (paintTime - comboBarStart) / settings.comboTimeout);
            bar.style.width = (pct * 100) + '%';
            bar.classList.toggle('low', pct < 0.25);
            if (pct > 0) scheduleNextPaint(tick);
        };
        scheduleNextPaint(tick);
    }

    function stopComboBar() {
        if (comboBarTimer) {
            clearTimeout(comboBarTimer);
            comboBarTimer = null;
        }
        if (comboBarRaf) {
            cancelAnimationFrame(comboBarRaf);
            comboBarRaf = null;
        }
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
                if (timeoutFallbackTimer) clearTimeout(timeoutFallbackTimer);
                timeoutFallbackTimer = setTimeout(() => {
                    timeoutFallbackTimer = null;
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
        if (isLiteMode() || !settings.shakeEnabled
            || !settings.visualsEnabled || prefersReducedMotion()) return;
        const cls = hard ? 'mm-shake-hard' : 'mm-shake-light';
        document.body.classList.remove('mm-shake-light', 'mm-shake-hard');
        void document.body.offsetWidth;
        document.body.classList.add(cls);
        setTimeout(() => document.body.classList.remove(cls), hard ? 450 : 350);
    }

    function flashScreen(correct) {
        if (isLiteMode() || !settings.flashEnabled
            || !settings.visualsEnabled || prefersReducedMotion()) return;
        const f = els.flash;
        if (!f) return;
        f.className = '';
        void f.offsetWidth;
        f.classList.add(correct ? 'correct-flash' : 'wrong-flash');
    }

    function spawnFloat(text, cssClass, anchorEl) {
        if (!settings.floatEnabled || !settings.visualsEnabled || prefersReducedMotion()) return;
        if (isLiteMode()) {
            const now = performance.now();
            if (now - lastLiteFloatAt < 450) return;
            lastLiteFloatAt = now;
        }
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
        if (isLiteMode() || !settings.visualsEnabled || prefersReducedMotion()) return;
        const b = document.getElementById(id);
        if (!b) return;
        b.textContent = text;
        b.className   = '';
        void b.offsetWidth;
        b.classList.add('show');
    }

    function spawnCelebrate(celebration, x, y) {
        if (isLiteMode() || !settings.visualsEnabled || prefersReducedMotion()) return;
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
        if (isLiteMode() || !el
            || !settings.visualsEnabled || prefersReducedMotion()) return;
        el.classList.add('mm-pulse');
        setTimeout(() => el.classList.remove('mm-pulse'), 350);
    }

    function animateClass(el, cls, duration) {
        if (isLiteMode() || !el || prefersReducedMotion()) return;
        el.classList.add(cls);
        setTimeout(() => el.classList.remove(cls), duration);
    }

    let starRaf = null;
    let starFrameTimer = null;
    let starResizeHandler = null;
    let starVisibilityHandler = null;
    let starGeneration = 0;
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
            position: fixed; inset: 0; width: 100vw; height: 100vh;
            pointer-events: none; z-index: -1;
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
        body.mm-arcade[data-mm-bg="shrine"] {
            animation: none;
        }
        body.mm-performance-mode.mm-arcade {
            animation: none;
        }

        /* ── PHOSPHOR GLOW on the main card area ── */
        body.mm-arcade .input-wrapper,
        body.mm-arcade [class*="question"],
        body.mm-arcade [class*="card"],
        body.mm-arcade [class*="review"] {
            box-shadow: 0 0 24px rgba(0,220,255,0.12), 0 0 2px rgba(0,220,255,0.08) !important;
        }
        body.mm-performance-mode.mm-arcade .input-wrapper,
        body.mm-performance-mode.mm-arcade [class*="question"],
        body.mm-performance-mode.mm-arcade [class*="card"],
        body.mm-performance-mode.mm-arcade [class*="review"] {
            box-shadow: none !important;
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
        body.mm-performance-mode.mm-arcade input[type="text"],
        body.mm-performance-mode.mm-arcade input:not([type]) {
            text-shadow: none !important;
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
        body.mm-performance-mode.mm-arcade.mm-chromatic { animation: none; }

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
        body.mm-performance-mode.mm-arcade .input-wrapper.correct,
        body.mm-performance-mode.mm-arcade .input-wrapper.incorrect,
        body.mm-performance-mode.mm-arcade [role="progressbar"] > *,
        body.mm-performance-mode.mm-arcade .progress-bar,
        body.mm-performance-mode.mm-arcade .progress > * {
            box-shadow: none !important;
        }
        body.mm-performance-mode.mm-arcade .top_middle {
            text-shadow: none !important;
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
        starGeneration++;
        if (starRaf) { cancelAnimationFrame(starRaf); starRaf = null; }
        if (starFrameTimer) {
            clearTimeout(starFrameTimer);
            starFrameTimer = null;
        }
        if (starResizeHandler) {
            window.removeEventListener('resize', starResizeHandler);
            starResizeHandler.cancel?.();
            starResizeHandler = null;
        }
        if (starVisibilityHandler) {
            document.removeEventListener('visibilitychange', starVisibilityHandler);
            starVisibilityHandler = null;
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
        if (isLiteMode() || !settings.arcadeEnabled || !settings.visualsEnabled
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
        if (!hasCanvasBackdrop()
            || (prefersReducedMotion() && settings.backgroundTheme !== 'shrine')) return;
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
        const generation = ++starGeneration;
        let starfieldTexture, starfieldStars, starfieldSparkles, nextStarfieldSparkleAt;
        let nebulaTexture, nebulaStars, nebulaWisps;
        let gridTexture, gridStars, gridMountainLayers, gridPalms, matrixDrops;
        let gameCenterTexture, gameCenterCabinets, gameCenterLights;
        let shrineImage, shrineImageReady = false, shrineDirectFallbackTried = false;
        let shrinePetals;
        let lastRenderAt = 0;
        let nextFrameDue = 0;
        let frameScale = 1;

        const theme = settings.backgroundTheme;
        // Canvas cost scales with both pixels and frames; Lite Mode reduces both.
        const frameInterval = isLiteMode() ? 1000 / 12 : 1000 / 60;
        const renderScale = isLiteMode() ? 0.7 : 1;
        const MATRIX_FONT_SIZE = 18;
        const MATRIX_GLYPHS = '日月火水木金土山川人大小日本語学習01';

        function resize() {
            W = canvas.width  = Math.max(1, Math.floor(window.innerWidth * renderScale));
            H = canvas.height = Math.max(1, Math.floor(window.innerHeight * renderScale));
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
            const densityDivisor = isLiteMode() ? 1500 : 720;
            const starCount = Math.max(
                isLiteMode() ? 420 : 850,
                Math.min(isLiteMode() ? 1000 : 2100, Math.floor(area / densityDivisor))
            );
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

            starfieldStars = Array.from({ length: isLiteMode() ? 10 : 22 }, () => {
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
            starfieldSparkles = [];
            nextStarfieldSparkleAt = performance.now() / 1000 + 0.8 + Math.random() * 1.6;
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
            for (let i = 0; i < (isLiteMode() ? 110 : 260); i++) {
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
            for (let filament = 0; filament < (isLiteMode() ? 14 : 34); filament++) {
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
            for (let i = 0; i < (isLiteMode() ? 42 : 105); i++) {
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

            const baseStarCount = isLiteMode()
                ? Math.max(200, Math.min(520, Math.floor(W * H / 2800)))
                : Math.max(420, Math.min(1100, Math.floor(W * H / 1300)));
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

            nebulaStars = Array.from({ length: isLiteMode() ? 14 : 30 }, (_, index) => {
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

            const wispCount = isLiteMode() ? 5 : 11;
            nebulaWisps = Array.from({ length: wispCount }, (_, index) => {
                const p = (index + 0.5 + Math.random() * 0.45) / wispCount;
                const spine = getNebulaSpine(p);
                const radius = Math.min(W, H) * (0.045 + Math.random() * 0.055);
                return {
                    x: spine.x + randomBell() * H * 0.035,
                    y: spine.y + randomBell() * H * 0.045,
                    radiusX: radius * (1.35 + Math.random() * 1.2),
                    radiusY: radius * (0.42 + Math.random() * 0.38),
                    rotation: -0.48 + randomBell() * 0.28,
                    hue: getNebulaHue(p) + randomBell() * 12,
                    alpha: 0.04 + Math.random() * 0.05,
                    phase: Math.random() * Math.PI * 2,
                    speed: 0.18 + Math.random() * 0.16,
                    driftX: 10 + Math.random() * 14,
                    driftY: 7 + Math.random() * 10,
                };
            });
        }

        function makeGridMountainLayer(baseY, step, minHeight, maxHeight, color, fill) {
            const points = [];
            const count = Math.ceil(W / step) + 2;
            for (let index = -1; index <= count; index++) {
                const peakBoost = index % 3 === 0 ? 1.25 : 1;
                const height = (minHeight + Math.random() * (maxHeight - minHeight)) * peakBoost;
                points.push({ x: index * step, y: baseY - height });
            }
            return { baseY, points, color, fill };
        }

        function initGrid() {
            const horizon = H * 0.56;
            gridTexture = createBackdropTexture();
            const textureCtx = gridTexture.getContext('2d');
            if (!textureCtx) return;

            const sky = textureCtx.createLinearGradient(0, 0, 0, horizon);
            sky.addColorStop(0, '#030416');
            sky.addColorStop(0.48, '#12072d');
            sky.addColorStop(0.78, '#32104b');
            sky.addColorStop(1, '#651452');
            textureCtx.fillStyle = sky;
            textureCtx.fillRect(0, 0, W, horizon + 1);

            const horizonGlow = textureCtx.createRadialGradient(
                W * 0.5, horizon, 0, W * 0.5, horizon, Math.max(W * 0.52, H * 0.34)
            );
            horizonGlow.addColorStop(0, 'rgba(255,50,180,0.24)');
            horizonGlow.addColorStop(0.38, 'rgba(115,30,180,0.10)');
            horizonGlow.addColorStop(1, 'rgba(10,4,32,0)');
            textureCtx.fillStyle = horizonGlow;
            textureCtx.fillRect(0, 0, W, horizon + 1);

            const starCount = isLiteMode()
                ? Math.max(55, Math.min(130, Math.floor(W * H / 12000)))
                : Math.max(100, Math.min(280, Math.floor(W * H / 6200)));
            for (let index = 0; index < starCount; index++) {
                const star = {
                    x: Math.random() * W,
                    y: Math.random() * horizon * 0.88,
                    radius: 0.25 + Math.random() * 0.8,
                    alpha: 0.18 + Math.random() * 0.52,
                    hue: Math.random() < 0.72 ? 202 : 312,
                };
                drawStarPoint(textureCtx, star);
            }

            gridStars = Array.from({ length: isLiteMode() ? 12 : 26 }, () => ({
                x: W * (0.04 + Math.random() * 0.92),
                y: horizon * (0.08 + Math.random() * 0.72),
                radius: 0.65 + Math.random() * 0.85,
                alpha: 0.32 + Math.random() * 0.4,
                hue: Math.random() < 0.62 ? 196 : 315,
                phase: Math.random() * Math.PI * 2,
                speed: 0.35 + Math.random() * 0.8,
            }));

            gridMountainLayers = [
                makeGridMountainLayer(
                    horizon + 8, Math.max(62, W / 22), H * 0.075, H * 0.18,
                    'rgba(0,205,255,0.64)', 'rgba(3,5,28,0.88)'
                ),
                makeGridMountainLayer(
                    horizon + 24, Math.max(44, W / 30), H * 0.045, H * 0.13,
                    'rgba(255,0,210,0.62)', 'rgba(9,3,30,0.94)'
                ),
            ];

            const palmSize = Math.min(W, H);
            gridPalms = [
                { x: W * 0.055, size: palmSize * 0.19, lean: -0.18 },
                { x: W * 0.15, size: palmSize * 0.13, lean: 0.12 },
                { x: W * 0.85, size: palmSize * 0.13, lean: -0.1 },
                { x: W * 0.945, size: palmSize * 0.2, lean: 0.17 },
            ];
        }

        function drawGameCenterPanel(target, x, y, width, height, hue, label, sublabel = '') {
            target.save();
            target.fillStyle = 'rgba(5,4,18,0.92)';
            target.strokeStyle = `hsla(${hue},100%,58%,0.52)`;
            target.shadowColor = `hsla(${hue},100%,56%,0.4)`;
            target.shadowBlur = Math.max(3, height * 0.09);
            target.lineWidth = Math.max(1, height * 0.035);
            target.fillRect(x, y, width, height);
            target.strokeRect(x, y, width, height);
            target.shadowBlur = Math.max(2, height * 0.05);
            target.fillStyle = `hsla(${hue},100%,70%,0.72)`;
            const labelSize = Math.max(
                6,
                Math.min(height * 0.34, width / Math.max(4, label.length * 0.72))
            );
            target.font = `700 ${labelSize}px sans-serif`;
            target.textAlign = 'center';
            target.textBaseline = 'middle';
            target.fillText(label, x + width / 2, y + height * (sublabel ? 0.42 : 0.52));
            if (sublabel) {
                target.shadowBlur = 0;
                target.fillStyle = 'rgba(220,245,255,0.52)';
                const sublabelSize = Math.max(
                    5,
                    Math.min(height * 0.16, width / Math.max(5, sublabel.length * 0.68))
                );
                target.font = `600 ${sublabelSize}px sans-serif`;
                target.fillText(sublabel, x + width / 2, y + height * 0.76);
            }
            target.restore();
        }

        function initGameCenter() {
            gameCenterTexture = createBackdropTexture();
            const textureCtx = gameCenterTexture.getContext('2d');
            if (!textureCtx) return;

            const horizon = H * 0.53;
            const vanishingX = W / 2;
            const vanishingY = H * 0.4;
            const room = textureCtx.createRadialGradient(
                vanishingX, vanishingY, 0,
                vanishingX, vanishingY, Math.max(W, H) * 0.78
            );
            room.addColorStop(0, '#141025');
            room.addColorStop(0.46, '#080818');
            room.addColorStop(1, '#02040a');
            textureCtx.fillStyle = room;
            textureCtx.fillRect(0, 0, W, H);

            const leftWall = textureCtx.createLinearGradient(0, 0, W * 0.34, 0);
            leftWall.addColorStop(0, 'rgba(7,12,25,0.98)');
            leftWall.addColorStop(1, 'rgba(25,8,38,0.74)');
            textureCtx.fillStyle = leftWall;
            textureCtx.beginPath();
            textureCtx.moveTo(0, 0);
            textureCtx.lineTo(W * 0.3, H * 0.18);
            textureCtx.lineTo(W * 0.34, horizon);
            textureCtx.lineTo(0, H * 0.72);
            textureCtx.closePath();
            textureCtx.fill();

            const rightWall = textureCtx.createLinearGradient(W, 0, W * 0.66, 0);
            rightWall.addColorStop(0, 'rgba(7,12,25,0.98)');
            rightWall.addColorStop(1, 'rgba(28,7,32,0.74)');
            textureCtx.fillStyle = rightWall;
            textureCtx.beginPath();
            textureCtx.moveTo(W, 0);
            textureCtx.lineTo(W * 0.7, H * 0.18);
            textureCtx.lineTo(W * 0.66, horizon);
            textureCtx.lineTo(W, H * 0.72);
            textureCtx.closePath();
            textureCtx.fill();

            textureCtx.fillStyle = 'rgba(5,7,16,0.96)';
            textureCtx.fillRect(W * 0.3, H * 0.18, W * 0.4, horizon - H * 0.18);
            textureCtx.strokeStyle = 'rgba(0,205,255,0.07)';
            textureCtx.lineWidth = 1;
            for (let panel = 0; panel <= 8; panel++) {
                const x = W * 0.3 + panel * W * 0.05;
                textureCtx.beginPath();
                textureCtx.moveTo(x, H * 0.18);
                textureCtx.lineTo(x, horizon);
                textureCtx.stroke();
            }

            textureCtx.strokeStyle = 'rgba(70,150,220,0.06)';
            for (let beam = 0; beam <= 12; beam++) {
                textureCtx.beginPath();
                textureCtx.moveTo(vanishingX, vanishingY);
                textureCtx.lineTo(beam * W / 12, 0);
                textureCtx.stroke();
            }
            for (let row = 0; row < 5; row++) {
                const y = H * 0.04 + row * H * 0.055;
                const spread = W * (0.5 - row * 0.065);
                textureCtx.beginPath();
                textureCtx.moveTo(vanishingX - spread, y);
                textureCtx.lineTo(vanishingX + spread, y);
                textureCtx.stroke();
            }

            const floor = textureCtx.createLinearGradient(0, horizon, 0, H);
            floor.addColorStop(0, '#0c071c');
            floor.addColorStop(0.52, '#080919');
            floor.addColorStop(1, '#03050d');
            textureCtx.fillStyle = floor;
            textureCtx.fillRect(0, horizon, W, H - horizon);

            const floorRows = 13;
            const floorColumns = 20;
            for (let row = 0; row < floorRows; row++) {
                const p1 = row / floorRows;
                const p2 = (row + 1) / floorRows;
                const y1 = horizon + Math.pow(p1, 1.82) * (H - horizon);
                const y2 = horizon + Math.pow(p2, 1.82) * (H - horizon);
                for (let column = -floorColumns / 2; column < floorColumns / 2; column++) {
                    const x11 = vanishingX + column * W / floorColumns * p1;
                    const x12 = vanishingX + (column + 1) * W / floorColumns * p1;
                    const x21 = vanishingX + column * W / floorColumns * p2;
                    const x22 = vanishingX + (column + 1) * W / floorColumns * p2;
                    textureCtx.fillStyle = (row + column) % 2 === 0
                        ? 'rgba(42,17,62,0.12)'
                        : 'rgba(3,38,53,0.08)';
                    textureCtx.beginPath();
                    textureCtx.moveTo(x11, y1);
                    textureCtx.lineTo(x12, y1);
                    textureCtx.lineTo(x22, y2);
                    textureCtx.lineTo(x21, y2);
                    textureCtx.closePath();
                    textureCtx.fill();
                }
            }

            textureCtx.strokeStyle = 'rgba(0,205,255,0.055)';
            for (let column = -10; column <= 10; column++) {
                textureCtx.beginPath();
                textureCtx.moveTo(vanishingX, horizon);
                textureCtx.lineTo(vanishingX + column * W / 20, H);
                textureCtx.stroke();
            }
            for (let row = 1; row <= floorRows; row++) {
                const p = row / floorRows;
                const y = horizon + Math.pow(p, 1.82) * (H - horizon);
                textureCtx.beginPath();
                textureCtx.moveTo(0, y);
                textureCtx.lineTo(W, y);
                textureCtx.stroke();
            }

            drawGameCenterPanel(
                textureCtx, W * 0.055, H * 0.18, W * 0.13, H * 0.05,
                190, '音ゲー', 'RHYTHM'
            );
            drawGameCenterPanel(
                textureCtx, W * 0.815, H * 0.18, W * 0.13, H * 0.05,
                320, 'UFO キャッチャー', 'PRIZE'
            );

            const cabinetLabels = ['音', 'UFO', '対戦', 'RACE', '太鼓', 'GAME', '景品'];
            const cabinetCount = 5;
            gameCenterCabinets = [];
            for (let index = 0; index < cabinetCount; index++) {
                const p = (index + 1) / cabinetCount;
                const depth = Math.pow(p, 1.28);
                const width = Math.min(
                    W * 0.085,
                    H * 0.12,
                    30 + depth * W * 0.045
                );
                const height = width * 1.55;
                const baseY = horizon + depth * (H - horizon) * 0.94;
                const offset = W * (0.19 + depth * 0.285);
                for (const side of [-1, 1]) {
                    gameCenterCabinets.push({
                        x: vanishingX + side * offset,
                        baseY,
                        width,
                        height,
                        side,
                        hue: [190, 315, 28, 48][(index + (side > 0 ? 1 : 0)) % 4],
                        phase: Math.random() * Math.PI * 2,
                        label: cabinetLabels[(index + (side > 0 ? 2 : 0)) % cabinetLabels.length],
                    });
                }
            }

            gameCenterLights = Array.from({ length: 9 }, (_, index) => ({
                x: W * (0.1 + index * 0.1),
                y: H * (0.075 + Math.abs(index - 4) * 0.012),
                radius: Math.max(3, Math.min(W, H) * 0.006),
                hue: [28, 190, 315][index % 3],
                phase: Math.random() * Math.PI * 2,
            }));
        }

        function resetShrinePetal(petal = {}, randomY = false) {
            petal.x = Math.random() * W;
            petal.y = randomY ? Math.random() * H : -12 - Math.random() * H * 0.18;
            petal.size = 1.8 + Math.random() * 2.8;
            petal.speed = 0.16 + Math.random() * 0.25;
            petal.drift = 0.14 + Math.random() * 0.24;
            petal.alpha = 0.16 + Math.random() * 0.22;
            petal.phase = Math.random() * Math.PI * 2;
            petal.spin = 0.35 + Math.random() * 0.75;
            petal.hue = 36 + Math.random() * 16;
            return petal;
        }

        function initShrine() {
            const petalCount = isLiteMode()
                ? 0
                : Math.max(8, Math.min(18, Math.floor(W / 130)));
            shrinePetals = Array.from(
                { length: petalCount },
                () => resetShrinePetal({}, true)
            );
            if (shrineImage) return;

            shrineImage = document.createElement('img');
            shrineImage.decoding = 'async';
            shrineImage.onload = () => {
                shrineImageReady = true;
                if (prefersReducedMotion() || isLiteMode()) {
                    tick();
                }
            };
            const loadShrineDirectly = () => {
                if (shrineDirectFallbackTried) {
                    shrineImageReady = false;
                    console.warn('[MMGamify] Shrine background resource failed to load.');
                    return;
                }
                shrineDirectFallbackTried = true;
                shrineImage.crossOrigin = 'anonymous';
                shrineImage.src = SHRINE_IMAGE_URL;
            };
            shrineImage.onerror = loadShrineDirectly;
            try {
                Promise.resolve(GM_getResourceURL('mmShrineGarden'))
                    .then(resourceUrl => {
                        if (!resourceUrl) throw new Error('Empty shrine resource URL');
                        shrineImage.src = resourceUrl;
                    })
                    .catch(loadShrineDirectly);
            } catch {
                loadShrineDirectly();
            }
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
            drawStarfieldSparkles(t);
            ctx.restore();
        }

        function drawStarfieldSparkles(t) {
            if (isLiteMode()) return;
            if (t >= nextStarfieldSparkleAt && starfieldStars.length > 0) {
                const source = starfieldStars[Math.floor(Math.random() * starfieldStars.length)];
                starfieldSparkles.push({
                    x: source.x,
                    y: source.y,
                    hue: Math.random() < 0.76 ? source.hue : 315,
                    radius: source.radius * (1.25 + Math.random() * 0.75),
                    start: t,
                    duration: 0.48 + Math.random() * 0.34,
                });
                nextStarfieldSparkleAt = t + 0.9 + Math.random() * 2.1;
            }

            starfieldSparkles = starfieldSparkles.filter(sparkle => {
                const progress = (t - sparkle.start) / sparkle.duration;
                if (progress < 0 || progress >= 1) return false;
                const strength = Math.sin(progress * Math.PI);
                const length = sparkle.radius * (4 + strength * 5);
                const alpha = strength * 0.72;

                ctx.save();
                ctx.globalCompositeOperation = 'lighter';
                ctx.strokeStyle = `hsla(${sparkle.hue},100%,92%,${alpha})`;
                ctx.fillStyle = `hsla(${sparkle.hue},100%,94%,${alpha})`;
                ctx.shadowColor = `hsla(${sparkle.hue},100%,72%,${alpha})`;
                ctx.shadowBlur = 8 + strength * 10;
                ctx.lineWidth = 0.65 + strength * 0.75;
                ctx.beginPath();
                ctx.moveTo(sparkle.x - length, sparkle.y);
                ctx.lineTo(sparkle.x + length, sparkle.y);
                ctx.moveTo(sparkle.x, sparkle.y - length * 0.72);
                ctx.lineTo(sparkle.x, sparkle.y + length * 0.72);
                ctx.stroke();
                ctx.beginPath();
                ctx.arc(sparkle.x, sparkle.y, sparkle.radius * (0.7 + strength), 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
                return true;
            });
        }

        function drawNebula(t) {
            if (theme !== 'nebula') return;
            ctx.save();
            const driftX = Math.sin(t * 0.12) * 8;
            const driftY = Math.cos(t * 0.09) * 6;
            const breathe = 1 + Math.sin(t * 0.16) * 0.008;
            ctx.save();
            ctx.translate(W / 2, H / 2);
            ctx.scale(breathe, breathe);
            ctx.drawImage(
                nebulaTexture,
                -W / 2 + driftX - 3,
                -H / 2 + driftY - 3,
                W + 6,
                H + 6
            );
            ctx.restore();

            ctx.globalCompositeOperation = 'lighter';
            for (const wisp of nebulaWisps) {
                const pulse = 0.55 + Math.sin(t * wisp.speed + wisp.phase) * 0.45;
                const x = wisp.x + Math.sin(t * wisp.speed * 0.72 + wisp.phase) * wisp.driftX;
                const y = wisp.y + Math.cos(t * wisp.speed * 0.58 + wisp.phase) * wisp.driftY;
                paintEllipticalGlow(
                    ctx, x, y,
                    wisp.radiusX * (0.94 + pulse * 0.1),
                    wisp.radiusY * (0.94 + pulse * 0.08),
                    wisp.rotation + Math.sin(t * wisp.speed * 0.4 + wisp.phase) * 0.04,
                    [
                        [0, `hsla(${wisp.hue},96%,68%,${wisp.alpha * pulse})`],
                        [0.46, `hsla(${wisp.hue + 18},92%,48%,${wisp.alpha * pulse * 0.55})`],
                        [1, `hsla(${wisp.hue},90%,28%,0)`],
                    ]
                );
            }
            for (const star of nebulaStars) {
                const pulse = 0.68 + Math.sin(t * star.speed + star.phase) * 0.32;
                drawBrightStar(ctx, star, star.alpha * pulse);
            }
            ctx.restore();
        }

        function drawGameCenterCabinet(machine, t) {
            const flicker = 0.78 + Math.sin(t * 2.4 + machine.phase) * 0.16
                + Math.sin(t * 6.7 + machine.phase) * 0.06;
            const { width, height } = machine;

            ctx.save();
            ctx.translate(machine.x, machine.baseY);
            ctx.fillStyle = 'rgba(3,5,13,0.97)';
            ctx.strokeStyle = `hsla(${machine.hue},100%,58%,0.52)`;
            ctx.shadowColor = `hsla(${machine.hue},100%,54%,0.38)`;
            ctx.shadowBlur = Math.max(2, width * 0.04);
            ctx.lineWidth = Math.max(1, width * 0.018);

            ctx.beginPath();
            ctx.moveTo(-width * 0.43, -height);
            ctx.lineTo(width * 0.43, -height);
            ctx.lineTo(width * 0.5, 0);
            ctx.lineTo(-width * 0.5, 0);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = `hsla(${machine.hue},85%,22%,0.95)`;
            ctx.fillRect(-width * 0.4, -height * 0.94, width * 0.8, height * 0.15);
            ctx.fillStyle = `hsla(${machine.hue},100%,76%,${0.72 * flicker})`;
            ctx.font = `700 ${Math.max(6, width * 0.15)}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(machine.label, 0, -height * 0.865);

            const screenX = -width * 0.32;
            const screenY = -height * 0.72;
            const screenW = width * 0.64;
            const screenH = height * 0.3;
            const screen = ctx.createLinearGradient(
                screenX, screenY, screenX + screenW, screenY + screenH
            );
            screen.addColorStop(0, `hsla(${machine.hue},100%,62%,${0.16 * flicker})`);
            screen.addColorStop(0.5, `hsla(${machine.hue + 75},100%,55%,${0.42 * flicker})`);
            screen.addColorStop(1, 'rgba(2,8,18,0.95)');
            ctx.fillStyle = screen;
            ctx.fillRect(screenX, screenY, screenW, screenH);
            ctx.strokeRect(screenX, screenY, screenW, screenH);

            ctx.save();
            ctx.beginPath();
            ctx.rect(screenX, screenY, screenW, screenH);
            ctx.clip();
            ctx.strokeStyle = `hsla(${machine.hue + 55},100%,78%,${0.24 * flicker})`;
            ctx.lineWidth = Math.max(0.6, width * 0.008);
            for (let stripe = -2; stripe < 5; stripe++) {
                const offset = ((t * 18 + stripe * screenW * 0.28) % (screenW * 1.4)) - screenW * 0.2;
                ctx.beginPath();
                ctx.moveTo(screenX + offset, screenY + screenH);
                ctx.lineTo(screenX + offset + screenW * 0.4, screenY);
                ctx.stroke();
            }
            ctx.restore();

            ctx.fillStyle = 'rgba(20,18,32,0.98)';
            ctx.beginPath();
            ctx.moveTo(-width * 0.36, -height * 0.36);
            ctx.lineTo(width * 0.36, -height * 0.36);
            ctx.lineTo(width * 0.46, -height * 0.24);
            ctx.lineTo(-width * 0.46, -height * 0.24);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = `hsla(${machine.hue},100%,66%,0.62)`;
            ctx.beginPath();
            ctx.arc(-width * 0.16, -height * 0.3, Math.max(1.5, width * 0.035), 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'rgba(255,80,145,0.65)';
            ctx.beginPath();
            ctx.arc(width * 0.12, -height * 0.3, Math.max(1.2, width * 0.028), 0, Math.PI * 2);
            ctx.arc(width * 0.21, -height * 0.3, Math.max(1.2, width * 0.028), 0, Math.PI * 2);
            ctx.fill();

            ctx.shadowBlur = 0;
            ctx.fillStyle = 'rgba(15,18,26,0.96)';
            ctx.fillRect(-width * 0.32, -height * 0.18, width * 0.64, height * 0.12);
            ctx.fillStyle = `hsla(${machine.hue},100%,62%,0.34)`;
            ctx.fillRect(-width * 0.08, -height * 0.14, width * 0.16, height * 0.025);
            ctx.restore();
        }

        function drawGameCenter(t) {
            if (theme !== 'gamecenter') return;
            const horizon = H * 0.53;
            const vanishingX = W / 2;
            ctx.save();
            ctx.drawImage(gameCenterTexture, 0, 0, W, H);

            ctx.globalCompositeOperation = 'lighter';
            for (const light of gameCenterLights) {
                const pulse = 0.72 + Math.sin(t * 1.3 + light.phase) * 0.2;
                const glow = ctx.createRadialGradient(
                    light.x, light.y, 0,
                    light.x, light.y, light.radius * 8
                );
                glow.addColorStop(0, `hsla(${light.hue},100%,78%,${0.38 * pulse})`);
                glow.addColorStop(0.2, `hsla(${light.hue},100%,60%,${0.12 * pulse})`);
                glow.addColorStop(1, `hsla(${light.hue},100%,50%,0)`);
                ctx.fillStyle = glow;
                ctx.beginPath();
                ctx.arc(light.x, light.y, light.radius * 8, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = `hsla(${light.hue},100%,82%,${0.58 * pulse})`;
                ctx.fillRect(
                    light.x - light.radius * 1.8,
                    light.y - light.radius * 0.65,
                    light.radius * 3.6,
                    light.radius * 1.3
                );
            }

            for (const machine of gameCenterCabinets) {
                const reflection = ctx.createLinearGradient(
                    machine.x, machine.baseY,
                    machine.x, Math.min(H, machine.baseY + machine.height * 0.72)
                );
                reflection.addColorStop(0, `hsla(${machine.hue},100%,58%,0.055)`);
                reflection.addColorStop(1, `hsla(${machine.hue},100%,45%,0)`);
                ctx.fillStyle = reflection;
                ctx.beginPath();
                ctx.moveTo(machine.x - machine.width * 0.34, machine.baseY);
                ctx.lineTo(machine.x + machine.width * 0.34, machine.baseY);
                ctx.lineTo(machine.x + machine.width * 0.18, H);
                ctx.lineTo(machine.x - machine.width * 0.18, H);
                ctx.closePath();
                ctx.fill();
            }
            ctx.globalCompositeOperation = 'source-over';

            gameCenterCabinets.forEach(machine => drawGameCenterCabinet(machine, t));

            const focusShade = ctx.createRadialGradient(
                vanishingX, H * 0.35, 0,
                vanishingX, H * 0.35, Math.min(W, H) * 0.42
            );
            focusShade.addColorStop(0, 'rgba(1,3,10,0.34)');
            focusShade.addColorStop(0.56, 'rgba(1,3,10,0.12)');
            focusShade.addColorStop(1, 'rgba(1,3,10,0)');
            ctx.fillStyle = focusShade;
            ctx.fillRect(0, 0, W, H);

            ctx.globalCompositeOperation = 'lighter';
            for (let index = 0; index < 8; index++) {
                const progress = ((index / 8) + t * 0.12) % 1;
                const y = horizon + Math.pow(progress, 1.85) * (H - horizon);
                const spread = W * (0.025 + progress * 0.18);
                const alpha = 0.1 + progress * 0.22;
                for (const side of [-1, 1]) {
                    ctx.fillStyle = `rgba(255,92,42,${alpha})`;
                    ctx.shadowColor = '#ff5c2a';
                    ctx.shadowBlur = 4;
                    ctx.beginPath();
                    ctx.arc(vanishingX + side * spread, y, 0.8 + progress * 1.2, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
            ctx.restore();
        }

        function drawShrineImage(t) {
            if (!shrineImageReady) {
                const fallback = ctx.createLinearGradient(0, 0, 0, H);
                fallback.addColorStop(0, '#17212a');
                fallback.addColorStop(1, '#05090a');
                ctx.fillStyle = fallback;
                ctx.fillRect(0, 0, W, H);
                return;
            }

            const imageRatio = shrineImage.naturalWidth / shrineImage.naturalHeight;
            const viewportRatio = W / H;
            const animated = !isLiteMode() && !prefersReducedMotion();
            const scale = 1.012 + (animated ? Math.sin(t * 0.08) * 0.002 : 0);
            let drawWidth;
            let drawHeight;

            if (imageRatio > viewportRatio) {
                drawHeight = H * scale;
                drawWidth = drawHeight * imageRatio;
            } else {
                drawWidth = W * scale;
                drawHeight = drawWidth / imageRatio;
            }

            const driftX = animated ? Math.sin(t * 0.035) * 2.5 : 0;
            const driftY = animated ? Math.cos(t * 0.028) * 1.5 : 0;
            ctx.drawImage(
                shrineImage,
                (W - drawWidth) / 2 + driftX,
                (H - drawHeight) / 2 + driftY,
                drawWidth,
                drawHeight
            );
        }

        function drawShrineLanternGlow(t) {
            if (W / H < 1.15) return;
            const pulse = prefersReducedMotion() ? 1 : 0.88 + Math.sin(t * 1.15) * 0.12;
            const radius = Math.min(W, H) * 0.075;
            const lanterns = [
                { x: W * 0.68, y: H * 0.44 },
                { x: W * 0.812, y: H * 0.468 },
                { x: W * 0.835, y: H * 0.318 },
            ];
            for (const { x, y } of lanterns) {
                const glow = ctx.createRadialGradient(x, y, 0, x, y, radius);
                glow.addColorStop(0, `rgba(255,178,82,${0.085 * pulse})`);
                glow.addColorStop(0.28, `rgba(255,126,46,${0.035 * pulse})`);
                glow.addColorStop(1, 'rgba(255,100,35,0)');
                ctx.fillStyle = glow;
                ctx.beginPath();
                ctx.arc(x, y, radius, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        function drawShrinePetals(t) {
            if (isLiteMode() || prefersReducedMotion()) return;
            for (const petal of shrinePetals) {
                petal.y += petal.speed * frameScale;
                petal.x += Math.sin(t * petal.spin + petal.phase) * petal.drift * frameScale;
                if (petal.y > H + 12 || petal.x < -12 || petal.x > W + 12) {
                    resetShrinePetal(petal);
                }

                ctx.save();
                ctx.translate(petal.x, petal.y);
                ctx.rotate(Math.sin(t * petal.spin + petal.phase) * 1.4);
                ctx.fillStyle = `hsla(${petal.hue},90%,58%,${petal.alpha})`;
                ctx.beginPath();
                ctx.ellipse(0, 0, petal.size, petal.size * 0.42, 0.45, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        function drawShrine(t) {
            if (theme !== 'shrine') return;
            ctx.save();
            drawShrineImage(t);
            ctx.globalCompositeOperation = 'lighter';
            drawShrineLanternGlow(t);
            drawShrinePetals(t);
            ctx.restore();
        }

        function drawGridSun(t, horizon) {
            const sunX = W * 0.5 + Math.sin(t * 0.16) * 4;
            const sunR = Math.min(W, H) * 0.145;
            const sunY = horizon - sunR * 0.34;
            const glow = ctx.createRadialGradient(sunX, sunY, sunR * 0.15, sunX, sunY, sunR * 1.7);
            glow.addColorStop(0, 'rgba(255,210,105,0.32)');
            glow.addColorStop(0.42, 'rgba(255,65,165,0.18)');
            glow.addColorStop(1, 'rgba(255,0,185,0)');
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(sunX, sunY, sunR * 1.7, 0, Math.PI * 2);
            ctx.fill();

            ctx.save();
            ctx.beginPath();
            ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
            ctx.clip();

            const sun = ctx.createLinearGradient(0, sunY - sunR, 0, sunY + sunR);
            sun.addColorStop(0, '#ffd47a');
            sun.addColorStop(0.46, '#ff6e8f');
            sun.addColorStop(1, '#ff149f');
            ctx.fillStyle = sun;
            ctx.fillRect(sunX - sunR, sunY - sunR, sunR * 2, sunR * 2);

            ctx.fillStyle = 'rgba(16,3,38,0.74)';
            for (let stripe = 0; stripe < 10; stripe++) {
                const y = sunY - sunR * 0.34 + stripe * sunR * 0.145;
                ctx.fillRect(sunX - sunR, y, sunR * 2, 2.5 + stripe * 0.85);
            }
            ctx.restore();
        }

        function drawGridMountain(layer) {
            ctx.save();
            ctx.fillStyle = layer.fill;
            ctx.strokeStyle = layer.color;
            ctx.lineJoin = 'round';
            ctx.shadowColor = layer.color;
            ctx.shadowBlur = 9;
            ctx.lineWidth = 1.35;

            ctx.beginPath();
            ctx.moveTo(layer.points[0].x, layer.baseY);
            layer.points.forEach(point => ctx.lineTo(point.x, point.y));
            ctx.lineTo(layer.points[layer.points.length - 1].x, layer.baseY);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            ctx.shadowBlur = 0;
            ctx.lineWidth = 0.65;
            ctx.globalAlpha = 0.58;
            for (const point of layer.points) {
                ctx.beginPath();
                ctx.moveTo(point.x, point.y);
                ctx.lineTo(point.x, layer.baseY);
                ctx.stroke();
            }
            for (const depth of [0.28, 0.52, 0.74]) {
                ctx.beginPath();
                layer.points.forEach((point, index) => {
                    const y = point.y + (layer.baseY - point.y) * depth;
                    if (index === 0) ctx.moveTo(point.x, y);
                    else ctx.lineTo(point.x, y);
                });
                ctx.stroke();
            }
            ctx.restore();
        }

        function drawGridPalm(palm, horizon) {
            const baseY = horizon + 19;
            const crownX = palm.x + palm.size * palm.lean;
            const crownY = baseY - palm.size;

            ctx.save();
            ctx.strokeStyle = 'rgba(255,0,205,0.24)';
            ctx.shadowColor = '#ff00c8';
            ctx.shadowBlur = 8;
            ctx.lineCap = 'round';
            ctx.lineWidth = palm.size * 0.09;
            ctx.beginPath();
            ctx.moveTo(palm.x, baseY);
            ctx.quadraticCurveTo(
                palm.x + palm.size * palm.lean * 0.34,
                baseY - palm.size * 0.52,
                crownX,
                crownY
            );
            ctx.stroke();

            ctx.strokeStyle = 'rgba(2,2,16,0.98)';
            ctx.shadowBlur = 0;
            ctx.lineWidth = palm.size * 0.065;
            ctx.stroke();

            const frondLength = palm.size * 0.48;
            for (let index = 0; index < 9; index++) {
                const angle = Math.PI * (1.03 + index * 0.115);
                const endX = crownX + Math.cos(angle) * frondLength;
                const endY = crownY + Math.sin(angle) * frondLength * 0.72;
                const bend = index < 4 ? -1 : 1;
                ctx.lineWidth = palm.size * 0.035;
                ctx.beginPath();
                ctx.moveTo(crownX, crownY);
                ctx.quadraticCurveTo(
                    crownX + Math.cos(angle) * frondLength * 0.58,
                    crownY + Math.sin(angle) * frondLength * 0.36 - bend * palm.size * 0.05,
                    endX,
                    endY + palm.size * 0.06
                );
                ctx.stroke();
            }
            ctx.restore();
        }

        function drawGrid(t) {
            if (theme !== 'grid') return;
            const horizon = H * 0.56;
            ctx.save();
            ctx.drawImage(gridTexture, 0, 0, W, H);

            ctx.globalCompositeOperation = 'lighter';
            for (const star of gridStars) {
                const pulse = 0.62 + Math.sin(t * star.speed + star.phase) * 0.38;
                drawBrightStar(ctx, star, star.alpha * pulse);
            }
            ctx.globalCompositeOperation = 'source-over';

            drawGridSun(t, horizon);
            gridMountainLayers.forEach(drawGridMountain);
            gridPalms.forEach(palm => drawGridPalm(palm, horizon));

            const floor = ctx.createLinearGradient(0, horizon, 0, H);
            floor.addColorStop(0, 'rgba(24,2,46,0.97)');
            floor.addColorStop(0.42, 'rgba(7,3,26,0.98)');
            floor.addColorStop(1, 'rgba(2,3,16,1)');
            ctx.fillStyle = floor;
            ctx.fillRect(0, horizon, W, H - horizon);

            const horizonBloom = ctx.createLinearGradient(0, horizon - 10, 0, horizon + 42);
            horizonBloom.addColorStop(0, 'rgba(255,0,200,0)');
            horizonBloom.addColorStop(0.42, 'rgba(255,35,190,0.34)');
            horizonBloom.addColorStop(1, 'rgba(80,0,150,0)');
            ctx.fillStyle = horizonBloom;
            ctx.fillRect(0, horizon - 10, W, 52);

            ctx.save();
            ctx.strokeStyle = 'rgba(255,0,215,0.5)';
            ctx.shadowColor = '#ff00d4';
            ctx.shadowBlur = 7;
            ctx.lineWidth = 1;
            const travel = (t * 1.4) % 1;
            for (let index = 0; index < 25; index++) {
                const progress = (index + travel) / 25;
                const y = horizon + Math.pow(progress, 2.2) * (H - horizon);
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(W, y);
                ctx.stroke();
            }

            const vanishingX = W / 2;
            for (let index = -16; index <= 16; index++) {
                const x = W / 2 + index * W * 0.078;
                ctx.strokeStyle = index % 2 === 0
                    ? 'rgba(0,220,255,0.40)'
                    : 'rgba(255,0,215,0.32)';
                ctx.shadowColor = index % 2 === 0 ? '#00d8ff' : '#ff00d4';
                ctx.beginPath();
                ctx.moveTo(vanishingX, horizon);
                ctx.lineTo(x, H);
                ctx.stroke();
            }
            ctx.restore();

            ctx.save();
            ctx.strokeStyle = 'rgba(255,145,52,0.84)';
            ctx.shadowColor = '#ff6b1a';
            ctx.shadowBlur = 10;
            ctx.lineWidth = 2;
            for (const side of [-1, 1]) {
                ctx.beginPath();
                ctx.moveTo(vanishingX + side * 4, horizon);
                ctx.lineTo(vanishingX + side * W * 0.105, H);
                ctx.stroke();
            }
            ctx.restore();
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
                const trailLength = isLiteMode() ? 6 : 12;
                for (let trail = 0; trail < trailLength; trail++) {
                    const y = headY - trail * MATRIX_FONT_SIZE;
                    if (y < -MATRIX_FONT_SIZE || y > H + MATRIX_FONT_SIZE) continue;
                    const alpha = Math.max(0, 0.28 - trail * 0.022);
                    const charIndex = Math.floor(t * 8 + column * 7 + trail * 3) % MATRIX_GLYPHS.length;
                    ctx.fillStyle = trail === 0
                        ? 'rgba(210,255,240,0.38)'
                        : `rgba(0,255,180,${alpha})`;
                    ctx.fillText(MATRIX_GLYPHS[charIndex], x, y);
                }

                matrixDrops[column] += (0.32 + (column % 5) * 0.045) * frameScale;
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
                star.x += star.vx * frameScale;
                star.y += star.vy * frameScale;
                star.life -= 0.018 * frameScale;
            }
        }

        function scheduleNextFrame() {
            if (prefersReducedMotion() || (isLiteMode() && theme === 'shrine')
                || document.hidden) return;
            if (isLiteMode()) {
                if (starFrameTimer) return;
                const delay = Math.max(0, frameInterval - (performance.now() - lastRenderAt));
                starFrameTimer = setTimeout(() => {
                    starFrameTimer = null;
                    if (!starRaf) starRaf = requestAnimationFrame(tick);
                }, delay);
            } else if (!starRaf) {
                starRaf = requestAnimationFrame(tick);
            }
        }

        function tick(now = performance.now(), force = false) {
            starRaf = null;
            if (generation !== starGeneration) return;
            if (document.hidden && !force) return;
            if (!force && !isLiteMode() && !isMaxMode()) {
                if (nextFrameDue && now + 0.5 < nextFrameDue) {
                    scheduleNextFrame();
                    return;
                }
                if (!nextFrameDue) nextFrameDue = now + frameInterval;
                while (nextFrameDue <= now) nextFrameDue += frameInterval;
            }

            const elapsed = lastRenderAt ? Math.min(100, now - lastRenderAt) : 1000 / 60;
            frameScale = elapsed / (1000 / 60);
            lastRenderAt = now;
            ctx.clearRect(0, 0, W, H);
            const t = now / 1000;
            drawStarfield(t);
            drawNebula(t);
            drawGrid(t);
            drawGameCenter(t);
            drawShrine(t);
            drawMatrix(t);
            if (hasShootingStars(theme) && Math.random() < 0.0025 * frameScale) {
                triggerShootingStar();
            }
            drawShootingStars();
            scheduleNextFrame();
        }

        starResizeHandler = debounce(() => {
            resize();
            if (theme === 'starfield') initStarfield();
            if (theme === 'nebula') initNebula();
            if (theme === 'grid') initGrid();
            if (theme === 'gamecenter') initGameCenter();
            if (theme === 'shrine') initShrine();
            if (theme === 'matrix') initMatrix();
            if (prefersReducedMotion() || (isLiteMode() && theme === 'shrine')) {
                tick();
            }
        }, 180);
        starVisibilityHandler = () => {
            if (document.hidden) {
                if (starRaf) cancelAnimationFrame(starRaf);
                starRaf = null;
                if (starFrameTimer) clearTimeout(starFrameTimer);
                starFrameTimer = null;
                return;
            }
            lastRenderAt = 0;
            nextFrameDue = 0;
            if (!starRaf) tick();
        };
        window.addEventListener('resize', starResizeHandler);
        document.addEventListener('visibilitychange', starVisibilityHandler);
        resize();
        if (theme === 'starfield') initStarfield();
        if (theme === 'nebula') initNebula();
        if (theme === 'grid') initGrid();
        if (theme === 'gamecenter') initGameCenter();
        if (theme === 'shrine') initShrine();
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
        if (settings.backgroundTheme === 'shrine') {
            document.getElementById('mm-crt-tint')?.remove();
            document.getElementById('mm-scanlines')?.remove();
            return;
        }

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
        if (isLiteMode() || !settings.arcadeEnabled || !settings.visualsEnabled) return;
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

    function getInputWrapper() {
        if (!inputWrapperCache?.isConnected) {
            inputWrapperCache = document.querySelector('.input-wrapper');
        }
        return inputWrapperCache;
    }

    function getCounterElement() {
        if (!counterCache?.isConnected) {
            counterCache = document.querySelector('.top_middle');
        }
        return counterCache;
    }

    function getFontChallengeTarget() {
        if (!fontTargetCache?.isConnected) {
            fontTargetCache = document.querySelector('#main .main_form, #main > span');
        }
        return fontTargetCache;
    }

    function getLockedFont() {
        try { return GM_getValue('mmLockedChallengeFont', null); }
        catch { return null; }
    }

    function setLockedFont(font) {
        try { GM_setValue('mmLockedChallengeFont', font); } catch { /* no-op */ }
    }

    function getRandomChallengeFont() {
        const fonts = isLiteMode()
            ? FONT_CHALLENGE_LOCAL_FONTS
            : FONT_CHALLENGE_FONTS;
        return fonts[Math.floor(Math.random() * fonts.length)];
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
        const lockedFont = getLockedFont();
        const initialFont = isLiteMode()
            && FONT_CHALLENGE_WEB_FONTS.includes(lockedFont)
            ? getRandomChallengeFont()
            : lockedFont || getRandomChallengeFont();
        setChallengeFont(target, initialFont);

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
        if (timeoutFallbackTimer) {
            clearTimeout(timeoutFallbackTimer);
            timeoutFallbackTimer = null;
        }
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
        showHudMicro(
            newMult > prevMult ? `+${pts} XP · MULT x${newMult}` : `+${pts} XP`,
            newMult > prevMult ? 'mult' : 'score'
        );
        playCorrectSound();
        stopAnswerTimer();
        flashScreen(true);
        spawnFloat(`+${pts}`, 'correct', getInputWrapper());
        pulseElement(els.hud);
        if (state.answerStreak % 10 === 0) shakeScreen(true);
    }

    function handleIncorrect() {
        if (timeoutFallbackTimer) {
            clearTimeout(timeoutFallbackTimer);
            timeoutFallbackTimer = null;
        }
        timeoutInjectedInput = null;
        setRewindSnapshot(makeRewindSnapshot('incorrect'));
        state.sessionIncorrect++;
        const lostStreak = state.answerStreak;
        state.answerStreak = 0;
        state.multiplier   = 1;

        const penalty = Math.min(state.score, 50 * Math.floor(lostStreak / 5));
        state.score = Math.max(0, state.score - penalty);

        updateHUD();
        if (lostStreak > 0) showHudMicro('COMBO RESET', 'fail');
        playFailSound();
        stopAnswerTimer();
        flashScreen(false);
        shakeScreen(lostStreak > 4);
        arcadeChromatic();

        const anchor = getInputWrapper();
        spawnFloat('WRONG', 'incorrect', anchor);
        if (lostStreak >= 5) spawnFloat(`-${lostStreak} COMBO LOST`, 'incorrect', anchor);
        if (penalty > 0)     spawnFloat(`-${penalty}`, 'incorrect', anchor);

        if (!isLiteMode() && settings.visualsEnabled && !prefersReducedMotion()) {
            document.body.classList.add('mm-wrong-dim');
            setTimeout(() => { document.body.classList.remove('mm-wrong-dim'); }, 600);
        }
    }

    function handleWordComplete() {
        state.wordStreak++;
        state.sessionWords++;
        updateHUD();
        showHudMicro(`STREAK ${state.wordStreak}`, 'streak');
        playWordCompleteSound();

        const counter  = getCounterElement();
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
        if (!overlay) return;
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
        const wrapper = getInputWrapper();
        if (!wrapper || (correctnessObserver && correctnessTarget === wrapper)) return;
        const targetChanged = correctnessTarget && correctnessTarget !== wrapper;
        correctnessObserver?.disconnect();
        correctnessTarget = wrapper;
        if (targetChanged && !isAnswerResolved()) {
            setRewindSnapshot(null);
            timeoutAutoFailing = false;
            lastAnswerState = null;
        }
        correctnessObserver = new MutationObserver(() => {
            const correct   = wrapper.classList.contains('correct');
            const incorrect = wrapper.classList.contains('incorrect');
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
                return;
            }
            if (correct && lastAnswerState !== 'correct') {
                lastAnswerState = 'correct';
                handleCorrect();
            }
            if (incorrect && lastAnswerState !== 'incorrect') {
                lastAnswerState = 'incorrect';
                handleIncorrect();
                if (timeoutAutoFailing) setTimeout(clickNextAfterTimeoutFail, 150);
            }
            syncArcadePresentation();
        });
        correctnessObserver.observe(wrapper, { attributes: true, attributeFilter: ['class'] });
    }

    function processCounterChange(counter) {
        const [rawCur, rawMax] = counter.textContent.split('/');
        const current = parseInt(rawCur, 10), max = parseInt(rawMax, 10);
        if (isNaN(current) || isNaN(max)) return;
        if (current > state.lastCompleted) {
            state.lastCompleted = current;
            handleWordComplete();
            applyFontChallenge();
            refreshAnswerTimerForCurrentQuestion();
        }
        const summary = document.getElementById('mm-summary');
        if (current === max && max > 0 && state.sessionActive
            && summary && !summary.classList.contains('open')) {
            state.sessionActive = false;
            if (summaryTimer) clearTimeout(summaryTimer);
            summaryTimer = setTimeout(() => {
                summaryTimer = null;
                if (initialized) showSummary();
            }, 800);
        }
    }

    function observeCounter() {
        const counter = getCounterElement();
        if (!counter || (counterObserver && counterTarget === counter)) return;
        counterObserver?.disconnect();
        counterTarget = counter;
        counterObserver = new MutationObserver(() => processCounterChange(counter));
        counterObserver.observe(counter, { childList: true, subtree: true, characterData: true });
    }

    function init() {
        if (initialized || !getInputWrapper()) return;
        settings.backgroundTheme = settings.pinnedBackgroundTheme;
        resetState();
        syncPerformanceProfilePresentation();
        injectStyles();
        injectUI();

        const counter = getCounterElement();
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
        correctnessTarget = null;
        counterObserver?.disconnect();      counterObserver = null;
        counterTarget = null;
        uninstallNativeRewindDetection();
        uninstallMusicLifecycle();
        if (hudResizeHandler) {
            window.removeEventListener('resize', hudResizeHandler);
            hudResizeHandler.cancel?.();
            hudResizeHandler = null;
        }
        if (hudDragRaf) {
            cancelAnimationFrame(hudDragRaf);
            hudDragRaf = null;
        }
        if (hudCollapseTimer) {
            clearTimeout(hudCollapseTimer);
            hudCollapseTimer = null;
        }
        if (hudMicroTimer) {
            clearTimeout(hudMicroTimer);
            hudMicroTimer = null;
        }
        if (timeoutFallbackTimer) {
            clearTimeout(timeoutFallbackTimer);
            timeoutFallbackTimer = null;
        }
        if (summaryTimer) {
            clearTimeout(summaryTimer);
            summaryTimer = null;
        }
        if (sessionEndSoundTimer) {
            clearTimeout(sessionEndSoundTimer);
            sessionEndSoundTimer = null;
        }
        hudMicroEl?.remove();
        hudMicroEl = null;
        document.querySelectorAll('.mm-float, .mm-celebrate').forEach(node => node.remove());
        stopAnswerTimer();
        removeFirstAnswerInputGate();
        clearFontChallenge();
        flushRecordsSave();
        flushSettingsSave();
        hudDrag = null;
        rewindSnapshot = null;
        pendingRewindRestore = false;
        timeoutAutoFailing = false;
        timeoutInjectedInput = null;
        firstAnswerTimerStarted = false;
        inputWrapperCache = null;
        counterCache = null;
        fontTargetCache = null;
        els = {};
        initialized     = false;
        lastAnswerState = null;

        ['mm-hud','mm-flash','mm-mult-banner','mm-milestone-banner',
         'mm-settings','mm-summary','mm-gamify-styles'].forEach(id =>
            document.getElementById(id)?.remove()
        );
        arcadeOff();
        document.body.classList.remove(
            'mm-performance-mode', 'mm-max-mode',
            'mm-shake-light', 'mm-shake-hard', 'mm-wrong-dim'
        );
    }

    function isReviewPage() { return location.href.includes('/study-lists/reviews'); }

    function tryInitGamify() {
        const onReview = isReviewPage();
        if (onReview && !gamifyActive)  { gamifyActive = true;  init(); }
        if (!onReview && gamifyActive)  { gamifyActive = false; cleanup(); }
    }

    function syncGamifyDom() {
        domSyncRaf = null;
        if (!gamifyActive) return;
        const has = Boolean(getInputWrapper());
        if (has && !initialized)  init();
        if (has && initialized) {
            observeCorrectness();
            observeCounter();
            if (settings.fontChallengeEnabled) applyFontChallenge();
        }
        if (!has && initialized && !isReviewPage()) { cleanup(); gamifyActive = false; }
    }

    function scheduleGamifyDomSync() {
        if (!gamifyActive || domSyncRaf || document.hidden) return;
        // Coalesce broad SPA mutations into one review-element reconciliation per frame.
        domSyncRaf = requestAnimationFrame(syncGamifyDom);
    }

    const appObserver = new MutationObserver(scheduleGamifyDomSync);
    appObserver.observe(document.body, { childList: true, subtree: true });

    function handleRouteChange() {
        lastUrl = location.href;
        tryInitGamify();
        scheduleGamifyDomSync();
    }

    ['pushState', 'replaceState'].forEach(method => {
        const orig = history[method];
        history[method] = function (...args) {
            const r = orig.apply(this, args);
            handleRouteChange();
            return r;
        };
    });
    window.addEventListener('popstate', handleRouteChange);
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            handleRouteChange();
        } else {
            flushRecordsSave();
            flushSettingsSave();
        }
    });
    window.addEventListener('pagehide', () => {
        flushRecordsSave();
        flushSettingsSave();
    });

    setInterval(() => {
        if (!document.hidden && location.href !== lastUrl) handleRouteChange();
    }, 1500);

    handleRouteChange();

})();
