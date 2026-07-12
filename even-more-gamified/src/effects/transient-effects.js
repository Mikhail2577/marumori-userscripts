import { createAnimationReplayer } from './animation-replay.js';
import { removeElementSafe } from '../utils/dom.js';

const FLOAT_EVENT_TYPES = Object.freeze({
    correct: 'correct',
    incorrect: 'incorrect',
    wordwin: 'wordComplete',
    milestone: 'milestone',
    rewind: 'rewind',
});

const BANNER_EVENT_TYPES = Object.freeze({
    'mm-mult-banner': 'multiplierUp',
    'mm-milestone-banner': 'milestone',
});

const DEFAULT_CELEBRATIONS = Object.freeze([
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
]);

function defaultScheduler() {
    return {
        setTimeout: (callback, delay) => globalThis.setTimeout(callback, delay),
        clearTimeout: (id) => globalThis.clearTimeout(id),
    };
}

export function createTransientEffectsController({
    document,
    window,
    getSettings,
    theme,
    isLiteMode,
    isMaxMode,
    prefersReducedMotion,
    getFlashElement,
    getDefaultAnchor,
    temporaryEffectSelector,
    celebrations = DEFAULT_CELEBRATIONS,
    animationReplayer = createAnimationReplayer(),
    scheduler = defaultScheduler(),
    random = Math.random,
    now = () => globalThis.performance.now(),
} = {}) {
    if (!document?.createElement || !document?.body) {
        throw new TypeError('Transient effects require a document with a body');
    }
    if (!window || typeof getSettings !== 'function' || !theme) {
        throw new TypeError('Transient effects require window, settings, and theme adapters');
    }

    const removalTimers = new Map();
    const classTimers = new Set();
    const transientClasses = new Map();
    let failureFlashTimer = null;
    let lastLiteFloatAt = 0;

    function trackTransientClass(element, className) {
        let classes = transientClasses.get(element);
        if (!classes) {
            classes = new Set();
            transientClasses.set(element, classes);
        }
        classes.add(className);
    }

    function scheduleClassRemoval(element, className, delay) {
        const timer = scheduler.setTimeout(() => {
            classTimers.delete(timer);
            element.classList.remove(className);
            const classes = transientClasses.get(element);
            classes?.delete(className);
            if (classes?.size === 0) transientClasses.delete(element);
        }, delay);
        classTimers.add(timer);
    }

    function scheduleElementRemoval(node, delay) {
        const existingTimer = removalTimers.get(node);
        if (existingTimer !== undefined) scheduler.clearTimeout(existingTimer);
        const timer = scheduler.setTimeout(() => {
            removalTimers.delete(node);
            removeElementSafe(node);
        }, delay);
        removalTimers.set(node, timer);
    }

    function cancelElementRemoval(node) {
        const timer = removalTimers.get(node);
        if (timer === undefined) return;
        scheduler.clearTimeout(timer);
        removalTimers.delete(node);
    }

    function removeTemporaryEffects() {
        if (!temporaryEffectSelector) return;
        document.querySelectorAll(temporaryEffectSelector).forEach((node) => {
            cancelElementRemoval(node);
            removeElementSafe(node);
        });
    }

    function getAnchorPoint(anchorEl) {
        const rect = anchorEl?.getBoundingClientRect();
        return {
            x: rect ? rect.left + rect.width / 2 : window.innerWidth / 2,
            y: rect ? rect.top + rect.height / 2 : window.innerHeight / 2,
        };
    }

    function shakeScreen(hard = false) {
        const settings = getSettings();
        if (
            isLiteMode() ||
            !settings.shakeEnabled ||
            !settings.visualsEnabled ||
            prefersReducedMotion()
        ) {
            return;
        }
        const scale = theme.getEffectBudget(hard ? 'comboBreak' : 'correct').shakeScale;
        if (scale < 0.2) return;
        const hardShake = hard && scale >= 0.75;
        const activeClass = hardShake ? 'mm-shake-hard' : 'mm-shake-light';
        animationReplayer.replay(document.body, ['mm-shake-light', 'mm-shake-hard'], activeClass, {
            removeAfterMs: hardShake ? 450 : 350,
        });
    }

    function flashScreen(correct) {
        const settings = getSettings();
        if (isLiteMode() || !settings.visualsEnabled || prefersReducedMotion()) return;
        if (correct ? !settings.flashEnabled : !settings.failureFlashEnabled) return;
        const flash = getFlashElement?.();
        if (!flash) return;
        const budget = theme.getEffectBudget(correct ? 'correct' : 'incorrect');
        flash.style.setProperty('--mm-theme-flash-strength', budget.flashScale);
        animationReplayer.replay(
            flash,
            ['correct-flash', 'wrong-flash'],
            correct ? 'correct-flash' : 'wrong-flash',
        );
    }

    function scheduleFailureFlash() {
        if (failureFlashTimer !== null) scheduler.clearTimeout(failureFlashTimer);
        failureFlashTimer = scheduler.setTimeout(() => {
            failureFlashTimer = null;
            flashScreen(false);
        }, 70);
    }

    function spawnFloat(text, cssClass, anchorEl) {
        const settings = getSettings();
        if (!settings.floatEnabled || !settings.visualsEnabled || prefersReducedMotion()) return;
        if (isLiteMode()) {
            const timestamp = now();
            if (timestamp - lastLiteFloatAt < 450) return;
            lastLiteFloatAt = timestamp;
        }
        const node = document.createElement('div');
        const eventType = FLOAT_EVENT_TYPES[cssClass] || cssClass || 'correct';
        const preset = theme.getFloatingTextPreset(eventType);
        node.className = `mm-float ${cssClass}`;
        node.textContent = text;
        if (preset.color) node.style.color = preset.color;
        if (preset.shadow) node.style.textShadow = preset.shadow;
        if (preset.fontSize) node.style.fontSize = preset.fontSize;
        if (preset.fontFamily) node.style.fontFamily = preset.fontFamily;
        if (preset.label) node.dataset.mmLabel = preset.label;
        if (preset.motion) node.dataset.mmMotion = preset.motion;
        const point = getAnchorPoint(anchorEl);
        node.style.left = `${point.x - 60 + (random() - 0.5) * 80}px`;
        node.style.top = `${point.y}px`;
        node.style.setProperty('--mm-float-drift-x', `${Math.round((random() - 0.5) * 42)}px`);
        document.body.appendChild(node);
        scheduleElementRemoval(node, 1350);
    }

    function showBanner(id, text) {
        const settings = getSettings();
        if (isLiteMode() || !settings.visualsEnabled || prefersReducedMotion()) return;
        const banner = document.getElementById(id);
        if (!banner) return;
        const preset = theme.getComboPreset(BANNER_EVENT_TYPES[id] || 'multiplierUp');
        banner.textContent = text;
        banner.className = '';
        banner.dataset.mmComboStyle = preset.style || 'pop';
        if (preset.color) banner.style.color = preset.color;
        if (preset.shadow) banner.style.textShadow = preset.shadow;
        animationReplayer.replay(banner, ['show'], 'show');
    }

    function pickRandom(items, fallback) {
        return items?.length ? items[Math.floor(random() * items.length)] : fallback;
    }

    function spawnCelebrate(celebration, x, y, choreography) {
        const settings = getSettings();
        if (!settings.visualsEnabled || prefersReducedMotion() || document.hidden) return;
        const preset = choreography || theme.getCelebrationPreset('wordComplete');
        const node = document.createElement('div');
        node.className = `mm-celebrate ${celebration.effect}`;
        node.textContent = celebration.icon;
        node.style.left = `${x}px`;
        node.style.top = `${y}px`;
        node.style.color = preset.color || theme.getThemeValue('colors.banner', '#fff');
        node.style.fontSize = `${Number(preset.size) || 52}px`;
        node.style.setProperty('--mm-celebrate-life', `${Number(preset.durationMs) || 900}ms`);
        const spread = Number(preset.spread) || 72;
        node.style.setProperty('--mm-celebrate-x', `${Math.round((random() - 0.5) * spread)}px`);
        node.style.setProperty('--mm-celebrate-y', `${Math.round(-48 - random() * spread)}px`);
        node.style.setProperty('--mm-celebrate-rot', `${Math.round((random() - 0.5) * 90)}deg`);
        document.body.appendChild(node);
        scheduleElementRemoval(node, (Number(preset.durationMs) || 900) + 160);
    }

    function getRandomCelebration(eventType = 'wordComplete') {
        const preset = theme.getComboPreset(eventType);
        const choreography = theme.getCelebrationPreset(eventType);
        const icons = preset.celebrations?.length ? preset.celebrations : celebrations;
        const icon = pickRandom(icons, { icon: '✨', effect: 'rise' });
        if (typeof icon === 'string') {
            return {
                icon,
                effect: pickRandom(choreography.effects, 'rise'),
            };
        }
        return {
            icon: icon.icon,
            effect: icon.effect || pickRandom(choreography.effects, 'rise'),
        };
    }

    function spawnCelebrationBurst(eventType, anchorEl, options = {}) {
        const settings = getSettings();
        if (!settings.visualsEnabled || prefersReducedMotion() || document.hidden) return;
        const choreography = { ...theme.getCelebrationPreset(eventType), ...options };
        const budget = theme.getEffectBudget(eventType);
        const baseCount = isLiteMode()
            ? Number(choreography.liteCount) || 0
            : Number(choreography.count) || 1;
        const maxCount = isLiteMode() ? 1 : 4;
        const minCount = baseCount > 0 ? 1 : 0;
        const count = Math.min(
            maxCount,
            Math.max(minCount, Math.round(baseCount * budget.celebrationScale)),
        );
        if (count <= 0) return;

        const point = getAnchorPoint(anchorEl);
        const jitter = Math.max(8, (Number(choreography.spread) || 60) * 0.26);
        for (let index = 0; index < count; index++) {
            spawnCelebrate(
                getRandomCelebration(eventType),
                point.x + (random() - 0.5) * jitter,
                point.y + (random() - 0.5) * jitter,
                choreography,
            );
        }
    }

    function triggerAnswerBoxAccent(eventType, anchorEl = getDefaultAnchor?.()) {
        const settings = getSettings();
        if (!settings.visualsEnabled || prefersReducedMotion() || document.hidden) return;
        const rect = anchorEl?.getBoundingClientRect?.();
        if (!rect) return;
        const choreography = theme.getCelebrationPreset(eventType);
        const budget = theme.getEffectBudget(eventType);
        const node = document.createElement('div');
        node.className = 'mm-answer-accent';
        node.dataset.mmAccent = choreography.answerAccent || 'pop';
        node.style.left = `${rect.left - 5}px`;
        node.style.top = `${rect.top - 5}px`;
        node.style.width = `${rect.width + 10}px`;
        node.style.height = `${rect.height + 10}px`;
        node.style.setProperty('--mm-answer-accent-opacity', budget.flashScale);
        document.body.appendChild(node);
        scheduleElementRemoval(node, 980);
    }

    function getParticleText(shape, preset) {
        if (shape === 'star') return '✦';
        if (shape !== 'glyph') return '';
        const glyphs = preset.glyphs || '01';
        return glyphs[Math.floor(random() * glyphs.length)];
    }

    function spawnThemeParticles(eventType, anchorEl, options = {}) {
        const settings = getSettings();
        if (!settings.visualsEnabled || prefersReducedMotion() || document.hidden) return;
        const preset = { ...theme.getParticlePreset(eventType), ...options };
        const budget = theme.getEffectBudget(eventType);
        const baseCount = isLiteMode() ? Number(preset.liteCount) || 0 : Number(preset.count) || 0;
        const maxCount = isLiteMode() ? 2 : isMaxMode() ? 16 : 12;
        const count = Math.min(maxCount, Math.max(0, Math.round(baseCount * budget.intensity)));
        if (count <= 0) return;

        const point = getAnchorPoint(anchorEl);
        const spread = (Number(preset.spread) || 64) * budget.spreadScale;
        const lifetime = Number(preset.lifetimeMs) || 700;
        for (let index = 0; index < count; index++) {
            const node = document.createElement('span');
            const shape = preset.shape || 'dot';
            const motion = preset.motion || 'burst';
            const angle = random() * Math.PI * 2;
            const distance = spread * (0.25 + random() * 0.75);
            const fallBias = motion === 'fall' ? spread * 0.6 : 0;
            node.className = `mm-theme-particle ${shape} ${motion}`;
            node.textContent = getParticleText(shape, preset);
            node.style.left = `${point.x + (random() - 0.5) * 20}px`;
            node.style.top = `${point.y + (random() - 0.5) * 16}px`;
            node.style.setProperty(
                '--mm-particle-color',
                preset.color || 'var(--mm-theme-notification)',
            );
            node.style.setProperty('--mm-particle-size', `${Number(preset.size) || 5}px`);
            node.style.setProperty('--mm-particle-life', `${lifetime}ms`);
            node.style.setProperty('--mm-particle-x', `${Math.cos(angle) * distance}px`);
            node.style.setProperty('--mm-particle-y', `${Math.sin(angle) * distance + fallBias}px`);
            node.style.setProperty('--mm-particle-rot', `${Math.round((random() - 0.5) * 220)}deg`);
            document.body.appendChild(node);
            scheduleElementRemoval(node, lifetime + 120);
        }
    }

    function pulseElement(element) {
        const settings = getSettings();
        if (isLiteMode() || !element || !settings.visualsEnabled || prefersReducedMotion()) return;
        element.classList.add('mm-pulse');
        trackTransientClass(element, 'mm-pulse');
        scheduleClassRemoval(element, 'mm-pulse', 350);
    }

    function animateClass(element, className, duration) {
        if (isLiteMode() || !element || prefersReducedMotion()) return;
        element.classList.add(className);
        trackTransientClass(element, className);
        scheduleClassRemoval(element, className, duration);
    }

    function cleanup() {
        if (failureFlashTimer !== null) {
            scheduler.clearTimeout(failureFlashTimer);
            failureFlashTimer = null;
        }
        for (const timer of classTimers) scheduler.clearTimeout(timer);
        classTimers.clear();
        for (const [element, classes] of transientClasses) {
            element.classList.remove(...classes);
        }
        transientClasses.clear();
        for (const timer of removalTimers.values()) scheduler.clearTimeout(timer);
        removalTimers.clear();
        animationReplayer.cancelAll();
        removeTemporaryEffects();
        lastLiteFloatAt = 0;
    }

    return Object.freeze({
        animateClass,
        cleanup,
        flashScreen,
        getAnchorPoint,
        pulseElement,
        removeTemporaryEffects,
        scheduleFailureFlash,
        shakeScreen,
        showBanner,
        spawnCelebrationBurst,
        spawnFloat,
        spawnThemeParticles,
        triggerAnswerBoxAccent,
    });
}
