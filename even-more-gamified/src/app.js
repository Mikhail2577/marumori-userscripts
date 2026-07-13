// Presentation integration migrated from the preserved legacy userscript.
// Correctness, platform, configuration, and lifecycle policy live in focused modules.

import { MILESTONES } from './config/constants.js';
import { AUDIO_WARN_THROTTLE_MS } from './config/audio-presets.js';
import { createThemeManager, validateThemeRegistry } from './config/theme-manager.js';
import { TEMP_EFFECT_SELECTOR } from './config/themes.js';
import { createCanvasBackgroundController } from './backgrounds/canvas-background-controller.js';
import { createAudioContextAdapter } from './adapters/audio-context.js';
import { createMaruMoriDomAdapter, DOM_RESOLUTION } from './adapters/marumori-dom.js';
import { createNavigationAdapter, isReviewPathname } from './adapters/navigation.js';
import { createUserscriptStorage } from './adapters/userscript-storage.js';
import { createAudioLifecycle } from './audio/lifecycle.js';
import { createMusicController } from './audio/music.js';
import { syncAudioPolicy } from './audio/policy.js';
import { createSfxPlayer } from './audio/sfx.js';
import { createThemeMusicScheduler } from './audio/theme-music-scheduler.js';
import { createToneScheduler } from './audio/tone-scheduler.js';
import { createLifecycleController, SESSION_STATES } from './core/lifecycle.js';
import { createReconciler } from './core/reconciliation.js';
import { createSessionFinalizationController } from './core/session-finalization.js';
import { getReviewSessionBoundaryReason } from './core/session-boundary.js';
import { createCrtController } from './effects/crt.js';
import { createTransientEffectsController } from './effects/transient-effects.js';
import { createFontChallengeController } from './font-challenge/controller.js';
import { createAnswerTimerOwnershipController } from './gameplay/answer-timer-ownership.js';
import { getGrade } from './gameplay/grades.js';
import { createFirstInputGate } from './gameplay/first-input-gate.js';
import {
    getRecordsSignature,
    getRollingRecords as selectRollingRecords,
    normalizeRecords,
    pruneRecords as pruneRecordSet,
    updateRollingRecords as mergeRollingRecords,
} from './gameplay/records.js';
import { resetRecordsAuthoritatively } from './gameplay/record-reset.js';
import { isResolvedReviewBackspaceIntent } from './gameplay/rewind-keyboard-intent.js';
import {
    calcAnswerPoints as calculateAnswerPoints,
    calcIncorrectPenalty,
    calcMultiplier,
    evaluateTimedXpAward,
    getCurrentXpBonusMultiplier as calculateCurrentXpBonusMultiplier,
} from './gameplay/scoring.js';
import { createTransactionalRewind } from './gameplay/rewind.js';
import { createTimeoutFailureController } from './gameplay/timeout-failure.js';
import { RECORDS_STORAGE_KEY, SETTINGS_STORAGE_KEY } from './storage/keys.js';
import { normalizeSettings } from './storage/settings.js';
import { createComboTimerCompositor } from './ui/combo-timer.js';
import { createHudController } from './ui/hud-controller.js';
import { createSettingsPanelController } from './ui/settings-panel.js';
import { createSummaryDialogController } from './ui/summary-dialog.js';
import BASE_STYLES from './ui/styles.css';
import { clamp } from './utils/clamp.js';
import { subscribeMediaQuery } from './utils/media-query.js';

function resolveToneFrequency(note, context = {}) {
    if (Array.isArray(note.freqByMultiplier)) {
        const index = Math.max(
            0,
            Math.min(
                note.freqByMultiplier.length - 1,
                Math.floor(Number(context.multiplier) || 1) - 1,
            ),
        );
        return note.freqByMultiplier[index];
    }
    const base = Number(note.freq) || 440;
    const streakAdd = (Number(context.answerStreak) || 0) * (Number(note.streakScale) || 0);
    const wordAdd = Math.min(
        (Number(context.wordStreak) || 0) * (Number(note.wordScale) || 0),
        Number(note.maxWordBonus) || 120,
    );
    return clamp(base + streakAdd + wordAdd, note.minFreq || 40, note.maxFreq || 2800, base);
}

function resolveToneVolume(note, context = {}) {
    const volume =
        (Number(note.volume) || 0.12) +
        (Number(context.answerStreak) || 0) * (Number(note.volumeStreakScale) || 0);
    return clamp(volume, 0.001, note.maxVolume || 0.3, note.volume || 0.12);
}

const userscriptStorage = createUserscriptStorage({
    getValue: (key, fallback) => GM_getValue(key, fallback),
    setValue: (key, value) => GM_setValue(key, value),
});

function loadSettings() {
    return normalizeSettings(userscriptStorage.getJson(SETTINGS_STORAGE_KEY, {}));
}
let settingsSaveTimer = null;

function saveSettings() {
    if (settingsSaveTimer) {
        clearTimeout(settingsSaveTimer);
        settingsSaveTimer = null;
    }
    userscriptStorage.setJson(SETTINGS_STORAGE_KEY, settings);
}

let settings = loadSettings();
validateThemeRegistry();
const ThemeManager = createThemeManager({
    document,
    getSettings: () => settings,
    saveSettings,
    isLiteMode,
    isMaxMode,
});
ThemeManager.applyCssVariables(settings.backgroundTheme);

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

function loadRecords() {
    return normalizeRecords(userscriptStorage.getJson(RECORDS_STORAGE_KEY, {}));
}

let recordsSaveTimer = null;
let lastRecordsSaveAt = 0;

function saveRecords() {
    if (recordsSaveTimer) {
        clearTimeout(recordsSaveTimer);
        recordsSaveTimer = null;
    }
    userscriptStorage.setJson(RECORDS_STORAGE_KEY, records);
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
    answerStreak: 0,
    wordStreak: 0,
    multiplier: 1,
    score: 0,
    lastCompleted: 0,
    sessionCorrect: 0,
    sessionIncorrect: 0,
    sessionWords: 0,
    sessionStart: 0,
    bestStreak: 0,
    bestMultiplier: 1,
    sessionActive: false,
};

const state = { ...STATE_INIT };

function resetState() {
    Object.assign(state, STATE_INIT, { sessionActive: true, sessionStart: Date.now() });
    firstInputGate.reset();
}

function pruneRecords() {
    const previousSignature = getRecordsSignature(records);
    records = pruneRecordSet(records);
    if (getRecordsSignature(records) !== previousSignature) scheduleRecordsSave();
}

function getRollingRecords() {
    pruneRecords();
    return selectRollingRecords(records);
}

function updateRollingRecords() {
    const result = mergeRollingRecords(records, state);
    records = result.records;
    if (result.changed) scheduleRecordsSave();
}

let initialized = false;
let gamifyActive = false;
let lastAnswerState = null;
let correctnessObserver = null;
let correctnessTarget = null;
let counterObserver = null;
let counterTarget = null;
let comboTimerCompositor = null;
let hudController = null;
let settingsPanelController = null;
let summaryDialogController = null;
let documentClickHandler = null;
let documentKeyHandler = null;
let domSyncRaf = null;
let previewAllTimer = null;
let sessionRemountPending = false;
let els = {};

const marumoriDom = createMaruMoriDomAdapter({ document });
const lifecycle = createLifecycleController();
const answerTimerOwnership = createAnswerTimerOwnershipController({
    lifecycle,
    dom: marumoriDom,
    clock: () => performance.now(),
});
const crtController = createCrtController({ document });
const transientEffects = createTransientEffectsController({
    document,
    window,
    getSettings: () => settings,
    theme: ThemeManager,
    isLiteMode,
    isMaxMode,
    prefersReducedMotion,
    getFlashElement: () => els.flash,
    getDefaultAnchor: getInputWrapper,
    temporaryEffectSelector: TEMP_EFFECT_SELECTOR,
});
const {
    animateClass,
    flashScreen,
    pulseElement,
    removeTemporaryEffects,
    scheduleFailureFlash,
    shakeScreen,
    showBanner,
    spawnCelebrationBurst,
    spawnFloat,
    spawnThemeParticles,
    triggerAnswerBoxAccent,
} = transientEffects;
const fontChallengeController = createFontChallengeController({
    document,
    storage: userscriptStorage,
    feedback(target, message) {
        spawnFloat(message, 'rewind', target);
    },
    isLiteMode,
    getTarget: getFontChallengeTarget,
});
const firstInputGate = createFirstInputGate({
    lifecycle,
    isCurrentInput: (input) => getAnswerInput() === input,
    isResolved: isAnswerResolved,
    onStart: () => resetComboTimer(true),
});
let reviewReconciler = null;
let rewindController = null;
let timeoutFailureController = null;
let sessionFinalizationController = null;
let activeReviewRoot = null;
let activeReviewUrl = null;
let activeReviewSessionIdentity = null;

const timerState = {
    startedAt: 0,
    durationMs: settings.timerSeconds * 1000,
    remainingPct: 1,
    expired: false,
    running: false,
    currentQuestionId: 0,
    awardedForQuestionId: null,
    ownership: null,
};

let lastAudioWarnAt = 0;
const sfxToneScheduler = createToneScheduler({ onError: warnAudioError });
const reduceMotionMedia = window.matchMedia?.('(prefers-reduced-motion: reduce)');

function prefersReducedMotion() {
    return reduceMotionMedia?.matches === true;
}

function warnAudioError(error, operation = 'runtime') {
    const now = Date.now();
    if (now - lastAudioWarnAt < AUDIO_WARN_THROTTLE_MS) return;
    lastAudioWarnAt = now;
    console.warn(`[MMGamify] Audio ${operation} error:`, error);
}

const audioAdapter = createAudioContextAdapter({
    createContext() {
        const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
        return AudioContextConstructor ? new AudioContextConstructor() : null;
    },
    onError: warnAudioError,
});

const themeMusicScheduler = createThemeMusicScheduler({
    getMusicStyle: () => settings.musicStyle,
    isLiteMode,
});

const musicController = createMusicController({
    audio: audioAdapter,
    schedulePattern({ context, destination, start, patternIndex }) {
        return themeMusicScheduler.scheduleBar(
            context,
            destination,
            start,
            ThemeManager.getMusicPreset(),
            patternIndex,
        );
    },
    stopScheduled: themeMusicScheduler.stopScheduled,
    isEnabled: () => settings.musicEnabled,
    isSessionActive: () => initialized && state.sessionActive,
    isLiteMode,
    isVisible: () => !document.hidden,
    getVolume: () => settings.musicVolume,
    onError: warnAudioError,
});

const sfxPlayer = createSfxPlayer({
    audio: audioAdapter,
    isEnabled: () => settings.sfxEnabled,
    getVolume: () => settings.volume,
    scheduleSfx({ context: audioContext, destination, eventType, eventContext, volume }) {
        const notes = ThemeManager.getSoundPreset(eventType);
        const budget = ThemeManager.getEffectBudget(eventType);
        let scheduled = 0;
        notes.forEach((note) => {
            if (note.skipLite && isLiteMode()) return;
            if (note.every && (Number(eventContext.answerStreak) || 0) % note.every !== 0) return;
            if (note.chance && Math.random() >= note.chance) return;
            const frequency = resolveToneFrequency(note, eventContext);
            const endFreq = note.endFreqScale ? frequency * note.endFreqScale : note.endFreq;
            if (
                sfxToneScheduler.schedule({
                    context: audioContext,
                    destination,
                    frequency,
                    duration: note.duration,
                    volume: resolveToneVolume(note, eventContext) * budget.soundScale * volume,
                    type: note.type || 'square',
                    delay: note.delay || 0,
                    endFrequency: endFreq,
                    detune: note.detune || 0,
                })
            ) {
                scheduled++;
            }
        });
        return scheduled;
    },
    stopScheduled: () => sfxToneScheduler.stopAll(),
    onError: warnAudioError,
});

function hasAudibleAudioWork() {
    return (
        (settings.sfxEnabled && settings.volume > 0) ||
        (settings.musicEnabled && settings.musicVolume > 0)
    );
}

const audioLifecycle = createAudioLifecycle({
    audio: audioAdapter,
    music: musicController,
    sfx: sfxPlayer,
    target: document,
    isHidden: () => document.hidden,
    shouldArmUnlock: hasAudibleAudioWork,
    onError: warnAudioError,
});

function syncAudioUnlockPolicy({ consumeGesture = false } = {}) {
    syncAudioPolicy({
        lifecycle: audioLifecycle,
        sfx: sfxPlayer,
        sfxEnabled: settings.sfxEnabled,
        sfxVolume: settings.volume,
        musicEnabled: settings.musicEnabled,
        musicVolume: settings.musicVolume,
        consumeGesture,
    });
}

function stopMusic(fadeSeconds = 0.35) {
    return musicController.stop({ fadeSeconds });
}

function startMusic() {
    void musicController.start();
}

function restartMusic() {
    return musicController.restart();
}

function installMusicLifecycle() {
    audioLifecycle.install();
    if (audioAdapter.runningContext && settings.musicEnabled && settings.musicVolume > 0) {
        void audioLifecycle.resume();
    }
}

function uninstallMusicLifecycle() {
    audioLifecycle.cleanup();
}

function playThemeSound(eventType, context = {}) {
    void sfxPlayer.playThemeSound(eventType, context);
}

function playCorrectSound() {
    playThemeSound('correct', { answerStreak: state.answerStreak });
}

function playFailSound() {
    playThemeSound('incorrect');
}

function playWordCompleteSound() {
    playThemeSound('wordComplete', { wordStreak: state.wordStreak });
}

function playMultiplierUpSound(mult) {
    playThemeSound('multiplierUp', { multiplier: mult });
}

function playComboBreakSound() {
    playThemeSound('comboBreak');
}

function playSessionEndSound() {
    playThemeSound('sessionComplete');
}

function getTimedXpAward(now = performance.now()) {
    // Score from the monotonic deadline, never from the lower-rate painted bar.
    const remainingPct = getTimerRemainingPct(now);
    const award = evaluateTimedXpAward({ settings, timerState, remainingPct });
    timerState.awardedForQuestionId = award.awardedForQuestionId;
    return award;
}

function getCurrentXpBonusMultiplier(remainingPct = null) {
    const currentRemainingPct = Number.isFinite(remainingPct)
        ? remainingPct
        : getTimerRemainingPct();
    return calculateCurrentXpBonusMultiplier({
        settings,
        timerState,
        remainingPct: currentRemainingPct,
    });
}

function calcAnswerPoints(multiplier, timedXpMultiplier = 1) {
    return calculateAnswerPoints(multiplier, timedXpMultiplier, settings);
}

function injectStyles() {
    if (document.getElementById('mm-gamify-styles')) return;
    const s = document.createElement('style');
    s.id = 'mm-gamify-styles';
    s.textContent = BASE_STYLES;
    document.head.appendChild(s);
}

function injectUI() {
    if (document.getElementById('mm-hud')) return;

    hudController = createHudController({
        document,
        window,
        settings,
        saveSettings,
        prefersReducedMotion,
        isLiteMode,
        onRewind: requestRewind,
    });
    settingsPanelController = createSettingsPanelController({
        document,
        settings,
        saveSettings,
        scheduleSettingsSave,
        getMusicPreset: () => ThemeManager.getMusicPreset(),
        getThemeIds: () => ThemeManager.getThemeIds(),
        getThemeId: (theme) => ThemeManager.getThemeId(theme),
        getThemeLabel: (theme) => ThemeManager.getThemeLabel(theme),
        normalizeTheme: (theme) => ThemeManager.getThemeId(theme),
        onSettingSideEffects: applySettingSideEffects,
        onSfxVolumeChanged() {
            syncAudioUnlockPolicy({
                consumeGesture: settings.sfxEnabled && settings.volume > 0,
            });
        },
        onPerformanceProfileChanged: applyPerformanceProfileSideEffects,
        onTimerDurationChanged() {
            refreshAnswerTimerForCurrentQuestion(true);
            updateHUD();
        },
        onMusicStyleChanged() {
            if (settings.musicEnabled) restartMusic();
        },
        onMusicVolumeChanged() {
            const updated = musicController.setVolume(settings.musicVolume);
            if (!updated && settings.musicEnabled && settings.musicVolume > 0) {
                void musicController.sync();
            }
            syncAudioUnlockPolicy();
        },
        onPreviewThemeEvent: previewThemeEvent,
        applyBackgroundTheme: (theme) => ThemeManager.applyTheme(theme, { persist: true }),
        onBackgroundThemeChanged() {
            restartArcadeBackdrop();
            if (settings.musicEnabled) restartMusic();
        },
        onResetHudPosition: () => hudController?.resetPosition(),
        onResetRecords() {
            resetRecordsAuthoritatively({
                rewind: rewindController,
                setRecords(nextRecords) {
                    records = nextRecords;
                },
                saveRecords,
                updateHud: updateHUD,
            });
        },
    });
    summaryDialogController = createSummaryDialogController({
        document,
        getFallbackFocus() {
            const candidates = [
                marumoriDom.getAnswerInput(),
                hudController?.refs.settingsButton,
                hudController?.settingsLauncher,
            ];
            return (
                candidates.find(
                    (candidate) =>
                        candidate?.isConnected &&
                        !candidate.hidden &&
                        !candidate.closest?.('[hidden], [inert], [aria-hidden="true"]'),
                ) ?? null
            );
        },
    });

    const frag = document.createDocumentFragment();
    frag.appendChild(hudController.element);
    frag.appendChild(hudController.settingsLauncher);
    frag.appendChild(createTrustedTemplateElement('div', 'mm-flash'));
    frag.appendChild(createTrustedTemplateElement('div', 'mm-mult-banner'));
    frag.appendChild(createTrustedTemplateElement('div', 'mm-milestone-banner'));
    frag.appendChild(settingsPanelController.element);
    frag.appendChild(summaryDialogController.element);
    document.body.appendChild(frag);

    els = {
        hud: hudController.element,
        flash: document.getElementById('mm-flash'),
        bar: hudController.refs.bar,
        barWrap: hudController.refs.barWrap,
        rewind: hudController.refs.rewind,
    };

    hudController.install(settingsPanelController.element);
    settingsPanelController.install();
}

// `html` is restricted to internal static templates and normalized/allowlisted values.
// Page-derived strings must use textContent instead.
function createTrustedTemplateElement(tag, id, html = '') {
    const node = document.createElement(tag);
    node.id = id;
    if (html) node.innerHTML = html;
    return node;
}

const REWIND_KEYS = [
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
];

function makeRewindSnapshot(kind) {
    const snapshot = {
        kind,
        records: normalizeRecords(records),
    };
    for (const key of REWIND_KEYS) {
        snapshot[key] = state[key];
    }
    return snapshot;
}

function setRewindSnapshot(snapshot) {
    if (!snapshot) {
        rewindController?.discard();
    } else {
        rewindController?.capture(snapshot);
    }
    updateRewindButton();
}

function updateRewindButton() {
    if (els.rewind) {
        els.rewind.disabled = !rewindController?.hasSnapshot || rewindController.isPending;
    }
}

function cancelPendingSummary() {
    sessionFinalizationController?.cancelPendingSummary();
    summaryDialogController?.close();
}

function restoreRewindSnapshot(snapshot, { source = 'unknown' } = {}) {
    if (!snapshot) return false;

    for (const key of REWIND_KEYS) {
        state[key] = snapshot[key];
    }
    records = normalizeRecords(snapshot.records);
    saveRecords();

    lastAnswerState = null;
    updateHUD();
    updateRewindButton();
    spawnFloat('REWIND', 'rewind', els.hud);
    console.warn(`[MMGamify] Rewound last ${source} answer.`);
    return true;
}

function requestRewind(source) {
    if (!rewindController?.hasSnapshot || rewindController.isPending) return false;
    updateRewindButton();
    rewindController.request(source).finally(() => {
        updateRewindButton();
    });
    return true;
}

function installNativeRewindDetection() {
    if (documentClickHandler || documentKeyHandler) return;

    documentClickHandler = (event) => {
        const control = event.target.closest?.('button, [role="button"]');
        const capability = marumoriDom.getNativeRewindCapability();
        if (!control || capability?.element !== control || !rewindController?.hasSnapshot) return;
        rewindController.trackNativeIntent('native').finally(updateRewindButton);
        updateRewindButton();
    };

    documentKeyHandler = (event) => {
        if (
            !rewindController?.hasSnapshot ||
            !isResolvedReviewBackspaceIntent({
                event,
                dom: marumoriDom,
                expectedResolution: lastAnswerState,
            })
        ) {
            return;
        }
        rewindController.trackNativeIntent('keyboard').finally(updateRewindButton);
        updateRewindButton();
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
    if (!hudController) return;
    updateRollingRecords();
    hudController.update({
        state,
        rollingRecords: getRollingRecords(),
        bonusMultiplier: getCurrentXpBonusMultiplier(),
    });
    updateRewindButton();
}

function showHudMicro(text, tone = 'score') {
    hudController?.showMicro(text, tone);
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
    if (key === 'sfxEnabled') {
        syncAudioUnlockPolicy({
            consumeGesture: settings.sfxEnabled && settings.volume > 0,
        });
    }

    if (key === 'hudEnabled') {
        hudController?.setVisible(settings.hudEnabled);
        comboTimerCompositor?.setVisualsEnabled(settings.hudEnabled);
    }

    if (key === 'visualsEnabled') {
        if (!settings.visualsEnabled) {
            arcadeOff();
            document.body.classList.remove('mm-shake-light', 'mm-shake-hard');
            removeTemporaryEffects();
        } else {
            syncArcadePresentation();
        }
    }

    if (key === 'crtEnabled') {
        syncCrtEffects();
    }

    if (key === 'musicEnabled') {
        settings.musicEnabled ? startMusic() : stopMusic();
        syncAudioUnlockPolicy();
    }

    if (key === 'timerEnabled') {
        if (!settings.timerEnabled) timeoutFailureController?.cancel('timer-disabled');
        refreshAnswerTimerForCurrentQuestion(true);
    }

    if (key === 'timeoutFailureEnabled' && !settings.timeoutFailureEnabled) {
        timeoutFailureController?.cancel('timeout-auto-fail-disabled');
    }

    if (
        key === 'timedXpBonusEnabled' ||
        key === 'timeoutFailureEnabled' ||
        key === 'fontChallengeEnabled'
    ) {
        updateHUD();
    }

    if (key === 'fontChallengeEnabled') {
        settings.fontChallengeEnabled ? applyFontChallenge() : clearFontChallenge();
    }
}

function isAnswerResolved() {
    const resolution = marumoriDom.getResolvedState();
    return resolution === DOM_RESOLUTION.CORRECT || resolution === DOM_RESOLUTION.INCORRECT;
}

function getAnswerInput() {
    return marumoriDom.getAnswerInput();
}

function getTimerDurationMs() {
    return settings.timerSeconds * 1000;
}

function getTimerRemainingPct(now = performance.now()) {
    if (!timerState.running) return timerState.remainingPct;
    const remainingPct = comboTimerCompositor
        ? comboTimerCompositor.getRemainingPct(now)
        : clamp(1 - Math.max(0, now - timerState.startedAt) / timerState.durationMs, 0, 1, 0);
    timerState.remainingPct = remainingPct;
    if (remainingPct <= 0) timerState.expired = true;
    return remainingPct;
}

function syncXpBonusDisplay(remainingPct = null) {
    hudController?.updateBonus(getCurrentXpBonusMultiplier(remainingPct));
}

function ensureComboTimerCompositor() {
    if (!els.bar || !els.barWrap) return null;
    if (comboTimerCompositor?.bar === els.bar) return comboTimerCompositor;
    comboTimerCompositor?.dispose();
    comboTimerCompositor = createComboTimerCompositor({
        bar: els.bar,
        wrapper: els.barWrap,
        reducedMotion: prefersReducedMotion,
        onTierChange({ remainingPct, snapshot }) {
            if (snapshot.ownership !== timerState.ownership) return;
            timerState.remainingPct = remainingPct;
            syncXpBonusDisplay(remainingPct);
        },
        onExpire(_snapshot, ownership) {
            if (!ownership || ownership !== timerState.ownership) return;
            const validation = answerTimerOwnership.validate(ownership, {
                requireExpired: true,
            });
            if (!validation.ok) {
                handleRejectedTimerExpiration(ownership, validation);
                return;
            }
            handleAnswerTimeout(ownership);
        },
    });
    return comboTimerCompositor;
}

function startComboBar({ ownership = null } = {}) {
    const compositor = ensureComboTimerCompositor();
    if (!compositor) return false;
    const durationMs = ownership?.durationMs ?? getTimerDurationMs();
    const nextOwnership = ownership ?? answerTimerOwnership.arm({ durationMs });
    if (!nextOwnership) return false;
    const remainingPct = clamp(
        (nextOwnership.deadline - performance.now()) / nextOwnership.durationMs,
        0,
        1,
        0,
    );
    timerState.startedAt = nextOwnership.armedAt;
    timerState.durationMs = nextOwnership.durationMs;
    timerState.remainingPct = remainingPct;
    timerState.expired = false;
    timerState.running = true;
    timerState.currentQuestionId = nextOwnership.timerGeneration;
    timerState.awardedForQuestionId = null;
    timerState.ownership = nextOwnership;
    compositor.start({
        durationMs: timerState.durationMs,
        remainingPct,
        visualsEnabled: settings.hudEnabled,
        ownership: nextOwnership,
    });
    return true;
}

function stopComboBar({ remainingPct = 0, inactive = false, clearTier = true } = {}) {
    ensureComboTimerCompositor()?.stop({ remainingPct, inactive, clearTier });
}

function invalidateAnswerTimerOwnership(ownership = timerState.ownership) {
    const invalidated = answerTimerOwnership.invalidate(ownership);
    if (timerState.ownership === ownership) timerState.ownership = null;
    return invalidated;
}

function stopAnswerTimer({ preserveOwnership = false } = {}) {
    timerState.running = false;
    if (!preserveOwnership) invalidateAnswerTimerOwnership();
    stopComboBar();
    syncXpBonusDisplay();
}

function removeFirstAnswerInputGate() {
    firstInputGate.disarm();
}

function pauseFirstAnswerTimer() {
    timerState.running = false;
    timerState.expired = false;
    timerState.remainingPct = 1;
    invalidateAnswerTimerOwnership();
    stopComboBar({ remainingPct: 1, clearTier: false });
    syncXpBonusDisplay();
}

function armFirstAnswerTimer() {
    if (!settings.timerEnabled) {
        removeFirstAnswerInputGate();
        return resetComboTimer(true);
    }
    if (firstInputGate.hasStarted || isAnswerResolved()) {
        return resetComboTimer();
    }

    const input = getAnswerInput();
    if (!input) return false;
    if (firstInputGate.input === input) return true;

    pauseFirstAnswerTimer();
    return firstInputGate.arm(input);
}

function refreshAnswerTimerForCurrentQuestion(force = false) {
    if (!firstInputGate.hasStarted) {
        return armFirstAnswerTimer();
    }
    return resetComboTimer(force);
}

function resetComboTimer(force = false) {
    // Class and counter observers can announce the same prompt; keep one deadline.
    if (!force && timerState.running && !isAnswerResolved()) {
        return true;
    }
    timerState.running = false;
    invalidateAnswerTimerOwnership();

    if (!settings.timerEnabled) {
        timerState.remainingPct = 1;
        timerState.expired = false;
        stopComboBar({ remainingPct: 1, inactive: true, clearTier: true });
        syncXpBonusDisplay();
        return true;
    }

    if (state.sessionActive && getInputWrapper() && !isAnswerResolved()) {
        return startComboBar();
    } else {
        stopAnswerTimer();
        return false;
    }
}

function applyTimeoutPenalty() {
    if (state.answerStreak > 4) {
        playComboBreakSound();
        spawnThemeParticles('comboBreak', getInputWrapper());
    }
    state.answerStreak = 0;
    state.multiplier = 1;
    updateHUD();
}

function handleRejectedTimerExpiration(ownership, validation) {
    if (answerTimerOwnership.current !== ownership) return false;
    if (validation.reason === 'deadline-not-reached') {
        return startComboBar({ ownership });
    }
    const rearmed = answerTimerOwnership.rearmForCurrentDom(ownership);
    if (rearmed.ok && rearmed.ownership) {
        return startComboBar({ ownership: rearmed.ownership });
    }

    invalidateAnswerTimerOwnership(ownership);
    timerState.running = false;
    timerState.expired = false;
    timerState.remainingPct = 1;
    stopComboBar({ remainingPct: 1, inactive: true, clearTier: true });
    syncXpBonusDisplay();
    reviewReconciler?.request('timer-owner-rejected');
    return false;
}

function reconcileAnswerTimerDomOwnership() {
    const ownership = timerState.ownership;
    if (!timerState.running || !ownership) return false;
    const validation = answerTimerOwnership.validate(ownership);
    if (validation.ok) return false;
    if (validation.reason !== 'dom-generation-changed') return false;
    const rearmed = answerTimerOwnership.rearmForCurrentDom(ownership);
    if (!rearmed.ok || !rearmed.ownership || rearmed.ownership === ownership) return false;
    return startComboBar({ ownership: rearmed.ownership });
}

function handleAnswerTimeout(ownership) {
    const validation = answerTimerOwnership.validate(ownership, {
        requireExpired: true,
    });
    if (!validation.ok || ownership !== timerState.ownership) {
        handleRejectedTimerExpiration(ownership, validation);
        return false;
    }
    timerState.remainingPct = 0;
    timerState.expired = true;
    timerState.running = false;
    stopComboBar({ remainingPct: 0, clearTier: false });
    syncXpBonusDisplay();
    spawnFloat('TIME UP', 'incorrect', getInputWrapper());
    playThemeSound('timeout');
    triggerAnswerBoxAccent('timeout');
    spawnThemeParticles('timeout', getInputWrapper());

    if (settings.timeoutFailureEnabled && timeoutFailureController) {
        timeoutFailureController.start('answer-timeout', ownership);
        return true;
    }

    applyTimeoutPenalty();
    invalidateAnswerTimerOwnership(ownership);
    return true;
}

const THEME_PREVIEW_EVENTS = [
    'correct',
    'combo',
    'wordComplete',
    'milestone',
    'timeout',
    'incorrect',
    'sessionComplete',
];
const THEME_PREVIEW_DELAY_MS = 360;
const PREVIEW_STATE_KEYS = [
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
];

function getPreviewAnchor() {
    return getInputWrapper() || els.hud || null;
}

function getPreviewStateInvariant() {
    return {
        state: Object.fromEntries(PREVIEW_STATE_KEYS.map((key) => [key, state[key]])),
        records: getRecordsSignature(records),
        rewindAvailable: Boolean(rewindController?.hasSnapshot),
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
        console.warn('[MMGamify] Theme preview changed gameplay state:', {
            eventType,
            before,
            after,
        });
    }
}

function runThemePreviewEvent(eventType) {
    const anchor = getPreviewAnchor();
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
        clearTimeout(previewAllTimer);
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
        previewAllTimer = setTimeout(runNext, THEME_PREVIEW_DELAY_MS);
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

const canvasBackgroundController = createCanvasBackgroundController({
    document,
    window,
    settings,
    themeManager: ThemeManager,
    crtController,
    isLiteMode,
    isMaxMode,
    prefersReducedMotion,
    isAnswerResolved,
    isSessionActive: () =>
        initialized && lifecycle.sessionState === SESSION_STATES.ACTIVE && state.sessionActive,
});
const {
    restart: restartArcadeBackdrop,
    triggerShootingStar,
    syncCrtEffects,
    off: arcadeOff,
    sync: syncArcadePresentation,
} = canvasBackgroundController;

function installReducedMotionLifecycle() {
    const removeListener = subscribeMediaQuery(reduceMotionMedia, () => {
        if (!initialized) return;
        if (prefersReducedMotion()) transientEffects.cleanup();
        canvasBackgroundController.syncReducedMotion();
        comboTimerCompositor?.syncReducedMotion();
    });
    lifecycle.sessionScope?.defer(removeListener);
}

function getInputWrapper() {
    return marumoriDom.getInputWrapper();
}

function getCounterElement() {
    return marumoriDom.getCounterElement();
}

function getFontChallengeTarget() {
    return marumoriDom.getQuestionPrompt();
}

function applyFontChallenge() {
    fontChallengeController.setEnabled(settings.fontChallengeEnabled);
    if (settings.fontChallengeEnabled) fontChallengeController.reconcile();
}

function clearFontChallenge() {
    fontChallengeController.disable();
}

function handleCorrect() {
    firstInputGate.markStarted();
    removeFirstAnswerInputGate();
    setRewindSnapshot(makeRewindSnapshot('correct'));
    const timedXp = getTimedXpAward();
    state.sessionCorrect++;
    state.answerStreak++;
    if (state.answerStreak > state.bestStreak) state.bestStreak = state.answerStreak;

    const prevMult = state.multiplier;
    const newMult = calcMultiplier(state.answerStreak);
    state.multiplier = newMult;
    if (newMult > state.bestMultiplier) state.bestMultiplier = newMult;

    const pts = calcAnswerPoints(newMult, timedXp.multiplier);
    state.score += pts;
    stopAnswerTimer();

    if (newMult > prevMult) {
        showBanner('mm-mult-banner', `${newMult}x COMBO!`);
        playMultiplierUpSound(newMult);
        spawnThemeParticles('multiplierUp', getInputWrapper());
        spawnCelebrationBurst('multiplierUp', getInputWrapper());
    }

    const milestone = MILESTONES[state.answerStreak];
    if (milestone) {
        showBanner('mm-milestone-banner', milestone);
        spawnFloat(milestone, 'milestone', getInputWrapper());
        spawnThemeParticles('milestone', getInputWrapper());
        spawnCelebrationBurst('milestone', getInputWrapper());
    }

    updateHUD();
    const feedback = [`+${pts} XP`];
    if (timedXp.eligible && timedXp.multiplier > 1) {
        feedback.push(`${timedXp.tier.label.toUpperCase()} x${timedXp.multiplier.toFixed(2)}`);
    }
    if (newMult > prevMult) feedback.push(`MULT x${newMult}`);
    showHudMicro(feedback.join(' · '), newMult > prevMult ? 'mult' : 'score');
    playCorrectSound();
    flashScreen(true);
    triggerAnswerBoxAccent('correct');
    const floatText =
        timedXp.eligible && timedXp.multiplier > 1
            ? `+${pts} · ${timedXp.tier.label}! XP x${timedXp.multiplier.toFixed(2)}`
            : `+${pts}`;
    spawnFloat(floatText, 'correct', getInputWrapper());
    spawnThemeParticles('correct', getInputWrapper());
    pulseElement(els.hud);
    if (state.answerStreak % 10 === 0) shakeScreen(true);
}

function handleIncorrect({ preserveTimerOwnership = false } = {}) {
    firstInputGate.markStarted();
    removeFirstAnswerInputGate();
    setRewindSnapshot(makeRewindSnapshot('incorrect'));
    state.sessionIncorrect++;
    const lostStreak = state.answerStreak;
    state.answerStreak = 0;
    state.multiplier = 1;

    const penalty = calcIncorrectPenalty(state.score, lostStreak);
    state.score = Math.max(0, state.score - penalty);

    stopAnswerTimer({ preserveOwnership: preserveTimerOwnership });
    updateHUD();
    if (lostStreak > 0) showHudMicro('COMBO RESET', 'fail');
    playFailSound();
    scheduleFailureFlash();
    triggerAnswerBoxAccent('incorrect');
    shakeScreen(lostStreak > 4);

    const anchor = getInputWrapper();
    spawnFloat('WRONG', 'incorrect', anchor);
    if (lostStreak >= 5) spawnFloat(`-${lostStreak} COMBO LOST`, 'incorrect', anchor);
    if (penalty > 0) spawnFloat(`-${penalty}`, 'incorrect', anchor);
    spawnThemeParticles(lostStreak >= 5 ? 'comboBreak' : 'incorrect', anchor);
}

function handleWordComplete() {
    state.wordStreak++;
    state.sessionWords++;
    updateHUD();
    showHudMicro(`STREAK ${state.wordStreak}`, 'streak');
    playWordCompleteSound();

    const counter = getCounterElement();
    const progress = document.querySelector('[role="progressbar"], .progress, .progress-bar');
    if (counter) animateClass(counter, 'mm-bounce', 600);
    if (progress) animateClass(progress, 'mm-progress-glow', 600);

    spawnFloat('WORD CLEAR!', 'wordwin', counter);
    spawnThemeParticles('wordComplete', counter);
    spawnCelebrationBurst('wordComplete', counter);
    if (Math.random() < 0.55 || state.wordStreak % 5 === 0) triggerShootingStar();
}

function showSummary() {
    stopMusic(0.6);
    playSessionEndSound();
    const total = state.sessionCorrect + state.sessionIncorrect;
    const acc = total > 0 ? Math.round((state.sessionCorrect / total) * 100) : 0;
    const elapsed = Math.round((Date.now() - state.sessionStart) / 1000);
    const { label: g, color: c } = getGrade(acc, state.score);

    const opened = summaryDialogController?.open({
        grade: g,
        gradeColor: c,
        stats: [
            { label: 'SCORE', value: state.score.toLocaleString(), tone: 'gold' },
            { label: 'ACCURACY', value: `${acc}%`, tone: 'green' },
            { label: 'CORRECT', value: state.sessionCorrect, tone: 'cyan' },
            { label: 'INCORRECT', value: state.sessionIncorrect },
            { label: 'WORDS DONE', value: state.sessionWords, tone: 'orange' },
            { label: 'BEST COMBO', value: `x${state.bestStreak}`, tone: 'pink' },
            { label: 'BEST MULT', value: `x${state.bestMultiplier}`, tone: 'orange' },
            {
                label: 'TIME',
                value: `${Math.floor(elapsed / 60)}m ${elapsed % 60}s`,
                tone: 'cyan',
            },
        ],
    });
    if (!opened) return;
    spawnThemeParticles('sessionComplete', summaryDialogController.refs.inner);
    spawnCelebrationBurst('sessionComplete', summaryDialogController.refs.inner);
}

function processResolvedAnswer(
    resolution,
    {
        lifecycleAlreadyResolved = false,
        preserveTimerOwnership = false,
        ownership = lifecycle.captureOwnership(),
        questionIdentity = ownership?.questionId,
        progress = marumoriDom.getProgress(),
    } = {},
) {
    if (resolution !== DOM_RESOLUTION.CORRECT && resolution !== DOM_RESOLUTION.INCORRECT) {
        return false;
    }
    let processed = false;
    if (lastAnswerState !== resolution) {
        if (!lifecycleAlreadyResolved && !lifecycle.resolve(resolution)) return false;
        lastAnswerState = resolution;
        if (resolution === DOM_RESOLUTION.CORRECT) handleCorrect();
        else handleIncorrect({ preserveTimerOwnership });
        processed = true;
    }
    sessionFinalizationController?.recordResolvedQuestion({
        ownership,
        questionIdentity,
        progress,
        resolution,
    });
    return processed;
}

function processCounterChange(progress) {
    if (!progress) return;
    const { current } = progress;
    if (current > state.lastCompleted) {
        state.lastCompleted = current;
        handleWordComplete();
        applyFontChallenge();
        refreshAnswerTimerForCurrentQuestion();
    }
}

function scheduleSessionRemount() {
    if (sessionRemountPending) return;
    sessionRemountPending = true;
    const sessionGeneration = lifecycle.sessionGeneration;
    queueMicrotask(() => {
        sessionRemountPending = false;
        if (!gamifyActive || !initialized || !isReviewPage()) return;
        if (lifecycle.sessionGeneration !== sessionGeneration) return;
        cleanup();
        init();
    });
}

function reconcileReviewDom() {
    if (!initialized) return;
    const questionContext = marumoriDom.readQuestionContext();
    if (!questionContext) return;
    const { root, logicalQuestionIdentity: questionId, progress, resolution } = questionContext;

    if (root !== activeReviewRoot) {
        scheduleSessionRemount();
        return;
    }

    const currentSessionIdentity = marumoriDom.getSessionIdentity();
    if (!activeReviewSessionIdentity && currentSessionIdentity) {
        activeReviewSessionIdentity = currentSessionIdentity;
    }

    // Rewind reconciliation precedes progress-boundary handling so a confirmed
    // same-question regression restores its owned snapshot instead of remounting.
    const rewindCommitted = rewindController?.reconcile() === true;

    const sessionBoundaryReason = getReviewSessionBoundaryReason({
        activeUrl: activeReviewUrl,
        currentUrl: location.href,
        activeSessionIdentity: activeReviewSessionIdentity,
        currentSessionIdentity,
        lastCompleted: state.lastCompleted,
        currentProgress: progress.current,
        unresolved:
            lifecycle.sessionState === SESSION_STATES.ACTIVE &&
            resolution === DOM_RESOLUTION.UNRESOLVED,
        rewindPending: rewindController?.isPending === true || rewindCommitted,
    });
    if (sessionBoundaryReason) {
        scheduleSessionRemount();
        return;
    }

    if (
        lifecycle.sessionState === SESSION_STATES.COMPLETED &&
        resolution === DOM_RESOLUTION.UNRESOLVED &&
        !rewindCommitted &&
        rewindController?.isPending !== true
    ) {
        scheduleSessionRemount();
        return;
    }

    if (
        lifecycle.sessionState === SESSION_STATES.ACTIVE &&
        resolution === DOM_RESOLUTION.UNRESOLVED &&
        questionId === lifecycle.questionId &&
        lastAnswerState &&
        !rewindCommitted &&
        rewindController?.isPending !== true
    ) {
        if (lastAnswerState === DOM_RESOLUTION.INCORRECT) {
            timeoutFailureController?.cancel('question-retried');
            rewindController?.discard();
            lastAnswerState = null;
            lifecycle.beginQuestion(questionId, { force: true });
            updateRewindButton();
            applyFontChallenge();
            refreshAnswerTimerForCurrentQuestion();
        } else {
            scheduleSessionRemount();
            return;
        }
    }

    if (lifecycle.sessionState === SESSION_STATES.ACTIVE && questionId !== lifecycle.questionId) {
        timeoutFailureController?.cancel('question-changed');
        rewindController?.discard();
        lastAnswerState = null;
        lifecycle.beginQuestion(questionId);
        updateRewindButton();
        applyFontChallenge();
        refreshAnswerTimerForCurrentQuestion();
    } else {
        reconcileAnswerTimerDomOwnership();
    }

    timeoutFailureController?.reconcile();
    if (resolution === DOM_RESOLUTION.CORRECT || resolution === DOM_RESOLUTION.INCORRECT) {
        processResolvedAnswer(resolution, {
            ownership: lifecycle.captureOwnership(),
            questionIdentity: questionId,
            progress,
        });
    }

    processCounterChange(progress);
    syncArcadePresentation();
}

function observeCorrectness() {
    const wrapper = getInputWrapper();
    if (!wrapper || (correctnessObserver && correctnessTarget === wrapper)) return;
    correctnessObserver?.disconnect();
    correctnessTarget = wrapper;
    correctnessObserver = new MutationObserver(() => {
        reviewReconciler?.request('resolution');
    });
    correctnessObserver.observe(wrapper, { attributes: true, attributeFilter: ['class'] });
}

function observeCounter() {
    const counter = getCounterElement();
    if (!counter || (counterObserver && counterTarget === counter)) return;
    counterObserver?.disconnect();
    counterTarget = counter;
    counterObserver = new MutationObserver(() => {
        reviewReconciler?.request('counter');
    });
    counterObserver.observe(counter, { childList: true, subtree: true, characterData: true });
}

function setupReviewControllers() {
    sessionFinalizationController = createSessionFinalizationController({
        lifecycle,
        isCompletionCurrent(completion) {
            return (
                initialized &&
                marumoriDom.getActiveReviewRoot() === activeReviewRoot &&
                marumoriDom.getQuestionIdentity() === completion.logicalQuestionIdentity &&
                marumoriDom.getResolvedState() === completion.resolution
            );
        },
        onSessionCompleted() {
            state.sessionActive = false;
            canvasBackgroundController.pause();
        },
        onShowSummary: showSummary,
    });
    rewindController = createTransactionalRewind({
        lifecycle,
        dom: marumoriDom,
        restoreSnapshot: restoreRewindSnapshot,
        cancelSummary: cancelPendingSummary,
        onCommit(outcome) {
            sessionFinalizationController?.reopenQuestion(lifecycle.captureOwnership());
            const rewindProgress = outcome.progress ?? marumoriDom.getProgress();
            if (
                Number.isFinite(rewindProgress?.current) &&
                rewindProgress.current < state.lastCompleted
            ) {
                state.lastCompleted = rewindProgress.current;
            }
            lastAnswerState = null;
            state.sessionActive = true;
            canvasBackgroundController.resume();
            if (settings.musicEnabled) startMusic();
            applyFontChallenge();
            refreshAnswerTimerForCurrentQuestion(true);
            updateRewindButton();
            reviewReconciler?.request('rewind-committed');
        },
        onFailure(outcome) {
            updateRewindButton();
            reviewReconciler?.request('rewind-settled');
            if (outcome.status === 'failed') {
                console.warn('[MMGamify] Rewind was not confirmed:', outcome.reason);
            }
        },
    });
    timeoutFailureController = createTimeoutFailureController({
        lifecycle,
        dom: marumoriDom,
        validateTimerOwnership: (ownership, options) =>
            answerTimerOwnership.validate(ownership, options),
        canAdvance({ ownership, questionIdentity }) {
            return Boolean(
                state.sessionActive &&
                lifecycle.sessionState === SESSION_STATES.ACTIVE &&
                lifecycle.owns(ownership) &&
                !sessionFinalizationController?.isFinalizedQuestion({
                    ownership,
                    questionIdentity,
                }),
            );
        },
        onIncorrectConfirmed({ ownership, questionIdentity }) {
            processResolvedAnswer(DOM_RESOLUTION.INCORRECT, {
                lifecycleAlreadyResolved: true,
                preserveTimerOwnership: true,
                ownership,
                questionIdentity,
                progress: marumoriDom.getProgress(),
            });
            reviewReconciler?.request('timeout-incorrect');
        },
        onUnresolvedFailure(outcome) {
            if (outcome.status === 'failed') applyTimeoutPenalty();
        },
        onFailure(outcome) {
            if (outcome.status === 'failed') {
                console.warn('[MMGamify] Timeout auto-fail stopped:', outcome.reason);
            }
        },
        onSettled(_outcome, context) {
            const ownership = context?.timerOwnership;
            if (ownership) invalidateAnswerTimerOwnership(ownership);
        },
    });
}

function init() {
    const questionContext = marumoriDom.readQuestionContext();
    if (initialized || !questionContext) return;
    const { root, logicalQuestionIdentity: questionId, progress } = questionContext;
    ThemeManager.applyTheme(settings.pinnedBackgroundTheme, { persist: true });
    resetState();
    lifecycle.mount();
    lifecycle.start();
    lifecycle.beginQuestion(questionId, { awaitingFirstInput: true });
    activeReviewRoot = root;
    activeReviewUrl = location.href;
    activeReviewSessionIdentity = marumoriDom.getSessionIdentity();
    setupReviewControllers();
    reviewReconciler = createReconciler(reconcileReviewDom);
    syncPerformanceProfilePresentation();
    injectStyles();
    injectUI();

    state.lastCompleted = progress.current;

    initialized = true;
    installReducedMotionLifecycle();
    observeCorrectness();
    observeCounter();
    installNativeRewindDetection();
    installMusicLifecycle();
    updateHUD();
    applyFontChallenge();
    refreshAnswerTimerForCurrentQuestion();
    canvasBackgroundController.resume();
    syncArcadePresentation();
    reviewReconciler.request('init');
}

function cleanup() {
    initialized = false;
    canvasBackgroundController.pause();
    if (domSyncRaf) {
        cancelAnimationFrame(domSyncRaf);
        domSyncRaf = null;
    }
    correctnessObserver?.disconnect();
    correctnessObserver = null;
    correctnessTarget = null;
    counterObserver?.disconnect();
    counterObserver = null;
    counterTarget = null;
    reviewReconciler?.dispose();
    reviewReconciler = null;
    timeoutFailureController?.cancel('session-cleanup');
    timeoutFailureController = null;
    rewindController?.discard();
    rewindController = null;
    sessionFinalizationController?.cleanup();
    sessionFinalizationController = null;
    summaryDialogController?.cleanup();
    summaryDialogController = null;
    lifecycle.cleanup();
    activeReviewRoot = null;
    activeReviewUrl = null;
    activeReviewSessionIdentity = null;
    uninstallNativeRewindDetection();
    uninstallMusicLifecycle();
    hudController?.cleanup();
    hudController = null;
    settingsPanelController?.cleanup();
    settingsPanelController = null;
    if (previewAllTimer) {
        clearTimeout(previewAllTimer);
        previewAllTimer = null;
    }
    transientEffects.cleanup();
    stopAnswerTimer();
    comboTimerCompositor?.dispose();
    comboTimerCompositor = null;
    removeFirstAnswerInputGate();
    fontChallengeController.cleanup();
    flushRecordsSave();
    flushSettingsSave();
    firstInputGate.cleanup();
    els = {};
    lastAnswerState = null;

    [
        'mm-hud',
        'mm-settings-launcher',
        'mm-flash',
        'mm-mult-banner',
        'mm-milestone-banner',
        'mm-settings',
        'mm-summary',
        'mm-gamify-styles',
    ].forEach((id) => document.getElementById(id)?.remove());
    arcadeOff();
    ThemeManager.clearPresentation();
    document.body.classList.remove(
        'mm-performance-mode',
        'mm-max-mode',
        'mm-shake-light',
        'mm-shake-hard',
    );
}

function isReviewPage() {
    try {
        return isReviewPathname(new URL(location.href).pathname);
    } catch {
        return false;
    }
}

function syncGamifyDom() {
    domSyncRaf = null;
    if (!gamifyActive) return;
    const has = Boolean(getInputWrapper());
    if (has && !initialized) init();
    if (has && initialized) {
        observeCorrectness();
        observeCounter();
        reviewReconciler?.request('dom-sync');
        if (!firstInputGate.hasStarted && firstInputGate.input !== getAnswerInput()) {
            armFirstAnswerTimer();
        }
        if (settings.fontChallengeEnabled) applyFontChallenge();
    }
}

function scheduleGamifyDomSync() {
    if (!gamifyActive || domSyncRaf || document.hidden) return;
    // Coalesce broad SPA mutations into one review-element reconciliation per frame.
    domSyncRaf = requestAnimationFrame(syncGamifyDom);
}

const navigationAdapter = createNavigationAdapter({
    window,
    document,
    history,
    location,
    getObserverRoot: () => marumoriDom.getActiveReviewRoot() || document.body,
    onEnter() {
        gamifyActive = true;
        init();
        scheduleGamifyDomSync();
    },
    onLeave() {
        gamifyActive = false;
        cleanup();
    },
    onReconcile() {
        scheduleGamifyDomSync();
    },
});

document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        navigationAdapter.requestReconcile('visibility');
        scheduleGamifyDomSync();
    } else {
        flushRecordsSave();
        flushSettingsSave();
    }
});
window.addEventListener('pagehide', () => {
    flushRecordsSave();
    flushSettingsSave();
});

navigationAdapter.start();
