// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createTransientEffectsController } from '../../src/effects/transient-effects.js';

const TEMPORARY_EFFECTS = '.mm-float, .mm-celebrate, .mm-theme-particle, .mm-answer-accent';

function createScheduler() {
    let nextId = 1;
    const timers = new Map();
    return {
        timers,
        setTimeout: vi.fn((callback, delay) => {
            const id = nextId++;
            timers.set(id, { callback, delay });
            return id;
        }),
        clearTimeout: vi.fn((id) => timers.delete(id)),
        runDelay(delay) {
            const entry = [...timers.entries()].find(([, timer]) => timer.delay === delay);
            if (!entry) return false;
            const [id, timer] = entry;
            timers.delete(id);
            timer.callback();
            return true;
        },
        runAll() {
            for (const [id, timer] of [...timers]) {
                timers.delete(id);
                timer.callback();
            }
        },
    };
}

function createHarness(overrides = {}) {
    const settings = {
        failureFlashEnabled: true,
        flashEnabled: true,
        floatEnabled: true,
        shakeEnabled: true,
        visualsEnabled: true,
        ...overrides.settings,
    };
    const scheduler = overrides.scheduler || createScheduler();
    const animationReplayer = {
        replay: vi.fn(),
        cancelAll: vi.fn(),
        ...overrides.animationReplayer,
    };
    const theme = {
        getCelebrationPreset: vi.fn(() => ({
            answerAccent: 'pop',
            count: 2,
            durationMs: 900,
            effects: ['rise'],
            liteCount: 1,
            size: 52,
            spread: 60,
        })),
        getComboPreset: vi.fn(() => ({ style: 'pop' })),
        getEffectBudget: vi.fn(() => ({
            celebrationScale: 1,
            flashScale: 0.75,
            intensity: 1,
            shakeScale: 1,
            spreadScale: 1,
        })),
        getFloatingTextPreset: vi.fn(() => ({
            color: 'rgb(1, 2, 3)',
            fontFamily: 'monospace',
            fontSize: '20px',
            label: 'BONUS',
            motion: 'drift',
            shadow: '1px 1px black',
        })),
        getParticlePreset: vi.fn(() => ({
            color: '#fff',
            count: 2,
            glyphs: 'AB',
            lifetimeMs: 700,
            liteCount: 1,
            motion: 'burst',
            shape: 'glyph',
            size: 5,
            spread: 64,
        })),
        getThemeValue: vi.fn((_path, fallback) => fallback),
        ...overrides.theme,
    };
    const flash = document.body.appendChild(document.createElement('div'));
    flash.id = 'mm-flash';
    const anchor = document.body.appendChild(document.createElement('div'));
    anchor.getBoundingClientRect = vi.fn(() => ({
        height: 20,
        left: 100,
        top: 40,
        width: 80,
    }));
    const controller = createTransientEffectsController({
        document,
        window,
        getSettings: () => settings,
        theme,
        isLiteMode: overrides.isLiteMode || (() => false),
        isMaxMode: overrides.isMaxMode || (() => false),
        prefersReducedMotion: overrides.prefersReducedMotion || (() => false),
        getFlashElement: () => flash,
        getDefaultAnchor: () => anchor,
        temporaryEffectSelector: TEMPORARY_EFFECTS,
        animationReplayer,
        scheduler,
        random: () => 0.5,
        now: () => 1000,
    });
    return { anchor, animationReplayer, controller, flash, scheduler, settings, theme };
}

beforeEach(() => {
    document.head.innerHTML = '';
    document.body.innerHTML = '';
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
});

describe('transient effects controller', () => {
    it('renders floating feedback at the anchor with the configured presentation', () => {
        const { anchor, controller, scheduler, theme } = createHarness();

        controller.spawnFloat('+100', 'correct', anchor);

        const node = document.querySelector('.mm-float.correct');
        expect(node).not.toBeNull();
        expect(node.textContent).toBe('+100');
        expect(node.style.left).toBe('80px');
        expect(node.style.top).toBe('50px');
        expect(node.style.getPropertyValue('--mm-float-drift-x')).toBe('0px');
        expect(node.dataset.mmLabel).toBe('BONUS');
        expect(node.dataset.mmMotion).toBe('drift');
        expect(theme.getFloatingTextPreset).toHaveBeenCalledWith('correct');
        expect([...scheduler.timers.values()][0].delay).toBe(1350);
    });

    it('coalesces failure flashes and cancels delayed work during cleanup', () => {
        const { animationReplayer, controller, flash, scheduler } = createHarness();

        controller.scheduleFailureFlash();
        controller.scheduleFailureFlash();

        expect(scheduler.clearTimeout).toHaveBeenCalledTimes(1);
        expect(scheduler.timers.size).toBe(1);
        expect(scheduler.runDelay(70)).toBe(true);
        expect(animationReplayer.replay).toHaveBeenCalledWith(
            flash,
            ['correct-flash', 'wrong-flash'],
            'wrong-flash',
        );
        expect(flash.style.getPropertyValue('--mm-theme-flash-strength')).toBe('0.75');

        controller.scheduleFailureFlash();
        controller.cleanup();
        scheduler.runAll();
        expect(animationReplayer.replay).toHaveBeenCalledTimes(1);
        expect(animationReplayer.cancelAll).toHaveBeenCalledTimes(1);
    });

    it('owns generated particles, accents, celebrations, and class cleanup', () => {
        const { anchor, controller, scheduler } = createHarness();
        const animated = document.body.appendChild(document.createElement('div'));

        controller.spawnThemeParticles('correct', anchor);
        controller.triggerAnswerBoxAccent('correct', anchor);
        controller.spawnCelebrationBurst('wordComplete', anchor);
        controller.pulseElement(animated);
        controller.animateClass(animated, 'mm-bounce', 600);

        expect(document.querySelectorAll('.mm-theme-particle')).toHaveLength(2);
        expect(document.querySelector('.mm-answer-accent').dataset.mmAccent).toBe('pop');
        expect(document.querySelectorAll('.mm-celebrate')).toHaveLength(2);
        expect(animated.classList.contains('mm-pulse')).toBe(true);
        expect(animated.classList.contains('mm-bounce')).toBe(true);
        expect(scheduler.timers.size).toBe(7);

        controller.cleanup();

        expect(document.querySelectorAll(TEMPORARY_EFFECTS)).toHaveLength(0);
        expect(animated.classList.contains('mm-pulse')).toBe(false);
        expect(animated.classList.contains('mm-bounce')).toBe(false);
        expect(scheduler.timers.size).toBe(0);
    });

    it('suppresses visual work when reduced motion is requested', () => {
        const { anchor, animationReplayer, controller } = createHarness({
            prefersReducedMotion: () => true,
        });

        controller.spawnFloat('+100', 'correct', anchor);
        controller.spawnThemeParticles('correct', anchor);
        controller.triggerAnswerBoxAccent('correct', anchor);
        controller.spawnCelebrationBurst('wordComplete', anchor);
        controller.flashScreen(true);
        controller.shakeScreen(true);

        expect(document.querySelectorAll(TEMPORARY_EFFECTS)).toHaveLength(0);
        expect(animationReplayer.replay).not.toHaveBeenCalled();
    });
});
