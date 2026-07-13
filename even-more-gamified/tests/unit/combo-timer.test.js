import { describe, expect, it, vi } from 'vitest';

import { COMBO_TIMER_STATUS, createComboTimerCompositor } from '../../src/ui/combo-timer.js';

class FakeScheduler {
    constructor() {
        this.time = 0;
        this.nextId = 1;
        this.tasks = new Map();
        this.timeoutDelays = [];
    }

    setTimeout(callback, delay) {
        const id = this.nextId++;
        this.timeoutDelays.push(delay);
        this.tasks.set(id, {
            at: this.time + delay,
            callback,
            type: 'timeout',
        });
        return id;
    }

    clearTimeout(id) {
        this.tasks.delete(id);
    }

    requestAnimationFrame(callback) {
        const id = this.nextId++;
        this.tasks.set(id, {
            at: this.time + 16,
            callback,
            type: 'frame',
        });
        return id;
    }

    cancelAnimationFrame(id) {
        this.tasks.delete(id);
    }

    advanceBy(milliseconds) {
        const target = this.time + milliseconds;
        while (true) {
            const next = [...this.tasks.entries()]
                .filter(([, task]) => task.at <= target)
                .sort(
                    ([leftId, left], [rightId, right]) => left.at - right.at || leftId - rightId,
                )[0];
            if (!next) break;

            const [id, task] = next;
            this.tasks.delete(id);
            this.time = task.at;
            task.callback(task.type === 'frame' ? this.time : undefined);
        }
        this.time = target;
    }

    pending(type) {
        return [...this.tasks.values()].filter((task) => task.type === type);
    }
}

function createElements() {
    const wrapper = document.createElement('div');
    const bar = document.createElement('div');
    wrapper.append(bar);
    return { bar, wrapper };
}

function createTimer(options = {}) {
    const scheduler = options.scheduler ?? new FakeScheduler();
    const elements = createElements();
    const timer = createComboTimerCompositor({
        ...elements,
        clock: () => scheduler.time,
        scheduler,
        reducedMotion: true,
        ...options,
    });
    return { ...elements, scheduler, timer };
}

describe('combo timer compositor', () => {
    it('wakes JavaScript only at tier boundaries and expires once', () => {
        const onExpire = vi.fn();
        const onTierChange = vi.fn();
        const { bar, scheduler, timer } = createTimer({
            onExpire,
            onTierChange,
        });

        timer.start({ durationMs: 10_000 });

        expect(bar.style.width).toBe('');
        expect(bar.style.transform).toBe('scaleX(1)');
        expect(bar.classList.contains('lightning')).toBe(true);
        expect(scheduler.pending('timeout')).toHaveLength(1);
        expect(scheduler.timeoutDelays).toHaveLength(1);
        expect(scheduler.timeoutDelays[0]).toBeCloseTo(2_000);

        scheduler.advanceBy(2_000);
        expect(bar.style.transform).toBe('scaleX(0.8)');
        expect(bar.classList.contains('fast')).toBe(true);
        expect(scheduler.pending('timeout')).toHaveLength(1);
        expect(scheduler.timeoutDelays).toHaveLength(2);
        expect(scheduler.timeoutDelays[1]).toBeCloseTo(2_000);

        scheduler.advanceBy(6_000);
        expect(bar.classList.contains('barely')).toBe(true);
        expect(onExpire).not.toHaveBeenCalled();

        scheduler.advanceBy(2_000);
        expect(timer.getSnapshot()).toMatchObject({
            status: COMBO_TIMER_STATUS.EXPIRED,
            remainingPct: 0,
            tierKey: 'expired',
        });
        expect(bar.style.transform).toBe('scaleX(0)');
        expect(onExpire).toHaveBeenCalledTimes(1);
        expect(onTierChange.mock.calls.map(([event]) => event.tier.key)).toEqual([
            'lightning',
            'fast',
            'steady',
            'close',
            'barely',
            'expired',
        ]);

        scheduler.advanceBy(10_000);
        expect(onExpire).toHaveBeenCalledTimes(1);
        expect(scheduler.pending('timeout')).toHaveLength(0);
    });

    it('delivers the exact immutable owner supplied when that timer was armed', () => {
        const onExpire = vi.fn();
        const { scheduler, timer } = createTimer({ onExpire });
        const ownership = Object.freeze({ timerGeneration: 7, deadline: 11_000 });

        expect(timer.start({ durationMs: 10_000, ownership }).ownership).toBe(ownership);
        scheduler.advanceBy(10_000);

        expect(onExpire).toHaveBeenCalledTimes(1);
        expect(onExpire.mock.calls[0][1]).toBe(ownership);
        expect(onExpire.mock.calls[0][0].ownership).toBe(ownership);
    });

    it('keeps a replacement timer active when the superseded deadline passes', () => {
        const onExpire = vi.fn();
        const { scheduler, timer } = createTimer({ onExpire });
        const firstOwner = Object.freeze({ timerGeneration: 1 });
        const secondOwner = Object.freeze({ timerGeneration: 2 });
        timer.start({ durationMs: 10_000, ownership: firstOwner });
        scheduler.advanceBy(2_000);
        timer.start({ durationMs: 10_000, ownership: secondOwner });

        scheduler.advanceBy(8_000);
        expect(onExpire).not.toHaveBeenCalled();
        expect(timer.getSnapshot()).toMatchObject({
            status: COMBO_TIMER_STATUS.RUNNING,
            ownership: secondOwner,
        });

        scheduler.advanceBy(2_000);
        expect(onExpire).toHaveBeenCalledTimes(1);
        expect(onExpire.mock.calls[0][1]).toBe(secondOwner);
    });

    it('uses WAAPI for continuous transform interpolation without touching width', () => {
        const scheduler = new FakeScheduler();
        const { bar, wrapper } = createElements();
        bar.style.width = '73%';
        const animation = { cancel: vi.fn() };
        bar.animate = vi.fn(() => animation);
        const timer = createComboTimerCompositor({
            bar,
            wrapper,
            clock: () => scheduler.time,
            scheduler,
            reducedMotion: false,
        });

        const snapshot = timer.start({ durationMs: 10_000 });

        expect(snapshot.animationMode).toBe('waapi');
        expect(bar.animate).toHaveBeenCalledWith(
            [{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }],
            { duration: 10_000, easing: 'linear', fill: 'forwards' },
        );
        expect(bar.style.width).toBe('73%');
        expect(bar.style.transformOrigin).toBe('left center');
        expect(scheduler.pending('timeout')).toHaveLength(1);

        scheduler.advanceBy(2_000);
        expect(bar.classList.contains('fast')).toBe(true);
        expect(bar.animate).toHaveBeenCalledTimes(1);
        expect(bar.style.width).toBe('73%');

        timer.pause();
        expect(animation.cancel).toHaveBeenCalledTimes(1);
        expect(bar.style.transform).toBe('scaleX(0.8)');
    });

    it('pauses the deadline and resumes from the exact remaining percentage', () => {
        const onExpire = vi.fn();
        const { bar, scheduler, timer } = createTimer({ onExpire });
        timer.start({ durationMs: 10_000 });

        scheduler.advanceBy(2_500);
        expect(timer.pause()).toMatchObject({
            status: COMBO_TIMER_STATUS.PAUSED,
            remainingPct: 0.75,
            tierKey: 'fast',
        });
        expect(bar.style.transform).toBe('scaleX(0.75)');
        expect(scheduler.pending('timeout')).toHaveLength(0);

        scheduler.advanceBy(5_000);
        expect(timer.getRemainingPct()).toBe(0.75);
        expect(onExpire).not.toHaveBeenCalled();

        timer.resume();
        expect(scheduler.timeoutDelays.at(-1)).toBeCloseTo(1_500);
        scheduler.advanceBy(1_499);
        expect(bar.classList.contains('fast')).toBe(true);
        scheduler.advanceBy(1);
        expect(bar.classList.contains('steady')).toBe(true);

        scheduler.advanceBy(6_000);
        expect(onExpire).toHaveBeenCalledTimes(1);
    });

    it('uses a CSS transform transition when WAAPI is unavailable', () => {
        const scheduler = new FakeScheduler();
        const { bar, wrapper } = createElements();
        bar.style.width = '42%';
        const timer = createComboTimerCompositor({
            bar,
            wrapper,
            clock: () => scheduler.time,
            scheduler,
            reducedMotion: false,
        });

        expect(timer.start({ durationMs: 10_000 }).animationMode).toBe('css');
        expect(bar.style.transform).toBe('scaleX(1)');
        scheduler.advanceBy(16);
        expect(bar.style.transition).toBe('transform 9984ms linear');
        expect(bar.style.transform).toBe('scaleX(0)');
        expect(bar.style.width).toBe('42%');

        scheduler.advanceBy(984);
        timer.pause();
        expect(timer.getRemainingPct()).toBe(0.9);
        expect(bar.style.transition).toBe('none');
        expect(bar.style.transform).toBe('scaleX(0.9)');
    });

    it('honors reduced motion with deterministic stepped transforms', () => {
        const scheduler = new FakeScheduler();
        const { bar, wrapper } = createElements();
        bar.animate = vi.fn();
        const timer = createComboTimerCompositor({
            bar,
            wrapper,
            clock: () => scheduler.time,
            scheduler,
            reducedMotion: true,
        });

        expect(timer.start({ durationMs: 10_000 }).animationMode).toBe('none');
        expect(bar.animate).not.toHaveBeenCalled();
        expect(bar.style.transform).toBe('scaleX(1)');
        scheduler.advanceBy(1_999);
        expect(bar.style.transform).toBe('scaleX(1)');
        scheduler.advanceBy(1);
        expect(bar.style.transform).toBe('scaleX(0.8)');
    });

    it('reconfigures live reduced motion without changing ownership or deadline', () => {
        const scheduler = new FakeScheduler();
        const { bar, wrapper } = createElements();
        const animations = [];
        bar.animate = vi.fn(() => {
            const animation = { cancel: vi.fn() };
            animations.push(animation);
            return animation;
        });
        let reducedMotion = false;
        const onExpire = vi.fn();
        const ownership = Object.freeze({ deadline: 10_000, timerGeneration: 1 });
        const timer = createComboTimerCompositor({
            bar,
            wrapper,
            clock: () => scheduler.time,
            scheduler,
            reducedMotion: () => reducedMotion,
            onExpire,
        });

        timer.start({ durationMs: 10_000, ownership });
        scheduler.advanceBy(2_500);
        reducedMotion = true;
        expect(timer.syncReducedMotion()).toMatchObject({
            animationMode: 'none',
            ownership,
            remainingPct: 0.75,
            status: COMBO_TIMER_STATUS.RUNNING,
        });
        expect(animations[0].cancel).toHaveBeenCalledOnce();
        expect(bar.style.transform).toBe('scaleX(0.75)');

        scheduler.advanceBy(1_500);
        reducedMotion = false;
        expect(timer.syncReducedMotion()).toMatchObject({
            animationMode: 'waapi',
            ownership,
            remainingPct: 0.6,
        });
        expect(bar.animate).toHaveBeenCalledTimes(2);
        expect(bar.animate).toHaveBeenLastCalledWith(
            [{ transform: 'scaleX(0.6)' }, { transform: 'scaleX(0)' }],
            { duration: 6_000, easing: 'linear', fill: 'forwards' },
        );

        scheduler.advanceBy(1_000);
        reducedMotion = true;
        timer.syncReducedMotion();
        reducedMotion = false;
        expect(timer.syncReducedMotion()).toMatchObject({
            ownership,
            remainingPct: 0.5,
        });
        expect(scheduler.pending('timeout')).toHaveLength(1);

        scheduler.advanceBy(4_999);
        expect(onExpire).not.toHaveBeenCalled();
        scheduler.advanceBy(1);
        expect(onExpire).toHaveBeenCalledTimes(1);
        expect(onExpire.mock.calls[0][1]).toBe(ownership);
        expect(scheduler.pending('timeout')).toHaveLength(0);
    });

    it('keeps one expiration-only deadline when motion changes with hidden visuals', () => {
        const scheduler = new FakeScheduler();
        const { bar, wrapper } = createElements();
        bar.animate = vi.fn();
        let reducedMotion = false;
        const onExpire = vi.fn();
        const timer = createComboTimerCompositor({
            bar,
            wrapper,
            clock: () => scheduler.time,
            scheduler,
            reducedMotion: () => reducedMotion,
            onExpire,
        });
        timer.start({ durationMs: 10_000, visualsEnabled: false });
        scheduler.advanceBy(2_500);

        reducedMotion = true;
        expect(timer.syncReducedMotion()).toMatchObject({
            remainingPct: 0.75,
            visualsEnabled: false,
        });
        expect(bar.animate).not.toHaveBeenCalled();
        expect(scheduler.pending('timeout')).toHaveLength(1);

        scheduler.advanceBy(7_500);
        expect(onExpire).toHaveBeenCalledTimes(1);
    });

    it('does not restart paused or stopped timers when motion changes', () => {
        const scheduler = new FakeScheduler();
        let reducedMotion = false;
        const { timer } = createTimer({
            scheduler,
            reducedMotion: () => reducedMotion,
        });
        timer.start({ durationMs: 10_000 });
        scheduler.advanceBy(2_000);
        timer.pause();

        reducedMotion = true;
        expect(timer.syncReducedMotion()).toMatchObject({
            remainingPct: 0.8,
            status: COMBO_TIMER_STATUS.PAUSED,
        });
        expect(scheduler.pending('timeout')).toHaveLength(0);

        timer.stop();
        reducedMotion = false;
        expect(timer.syncReducedMotion().status).toBe(COMBO_TIMER_STATUS.STOPPED);
        expect(scheduler.pending('timeout')).toHaveLength(0);
    });

    it('schedules only expiration while the HUD visual is hidden', () => {
        const scheduler = new FakeScheduler();
        const { bar, wrapper } = createElements();
        bar.animate = vi.fn();
        const timer = createComboTimerCompositor({
            bar,
            wrapper,
            clock: () => scheduler.time,
            scheduler,
            reducedMotion: false,
        });

        timer.start({ durationMs: 10_000, visualsEnabled: false });
        expect(bar.animate).not.toHaveBeenCalled();
        expect(scheduler.pending('frame')).toHaveLength(0);
        expect(scheduler.timeoutDelays).toEqual([10_000]);

        scheduler.advanceBy(2_500);
        timer.setVisualsEnabled(true);
        expect(timer.getRemainingPct()).toBe(0.75);
        expect(bar.animate).toHaveBeenCalledTimes(1);
        expect(scheduler.timeoutDelays.at(-1)).toBeCloseTo(1_500);
    });

    it('stops cleanly and restores owned presentation on disposal', () => {
        const scheduler = new FakeScheduler();
        const { bar, wrapper } = createElements();
        const onExpire = vi.fn();
        bar.classList.add('fast', 'existing');
        wrapper.classList.add('inactive');
        bar.style.transform = 'rotate(1deg)';
        bar.style.transformOrigin = 'center';
        bar.style.transition = 'opacity 1s';
        bar.style.willChange = 'opacity';
        const timer = createComboTimerCompositor({
            bar,
            wrapper,
            clock: () => scheduler.time,
            scheduler,
            reducedMotion: true,
            onExpire,
        });

        timer.start({ durationMs: 10_000 });
        timer.stop({ remainingPct: 0.4, inactive: true, clearTier: true });
        scheduler.advanceBy(20_000);
        expect(onExpire).not.toHaveBeenCalled();
        expect(timer.getSnapshot()).toMatchObject({
            status: COMBO_TIMER_STATUS.STOPPED,
            remainingPct: 0.4,
        });

        timer.dispose();
        expect(bar.classList.contains('fast')).toBe(true);
        expect(bar.classList.contains('existing')).toBe(true);
        expect(wrapper.classList.contains('inactive')).toBe(true);
        expect(bar.style.transform).toBe('rotate(1deg)');
        expect(bar.style.transformOrigin).toBe('center');
        expect(bar.style.transition).toBe('opacity 1s');
        expect(bar.style.willChange).toBe('opacity');
        expect(() => timer.start({ durationMs: 1_000 })).toThrow(/disposed/);
    });
});
