import { SPEED_XP_TIERS } from '../config/constants.js';
import { clamp } from '../utils/clamp.js';

export const COMBO_TIMER_STATUS = Object.freeze({
    IDLE: 'idle',
    RUNNING: 'running',
    PAUSED: 'paused',
    STOPPED: 'stopped',
    EXPIRED: 'expired',
    DISPOSED: 'disposed',
});

const BOUNDARY_EPSILON = 1e-9;

function defaultClock() {
    return globalThis.performance?.now?.() ?? Date.now();
}

function defaultScheduler() {
    return {
        setTimeout(callback, delay) {
            return globalThis.setTimeout(callback, delay);
        },
        clearTimeout(timerId) {
            globalThis.clearTimeout(timerId);
        },
        requestAnimationFrame(callback) {
            if (typeof globalThis.requestAnimationFrame === 'function') {
                return globalThis.requestAnimationFrame(callback);
            }
            return null;
        },
        cancelAnimationFrame(frameId) {
            if (typeof globalThis.cancelAnimationFrame === 'function') {
                globalThis.cancelAnimationFrame(frameId);
            }
        },
    };
}

function createReducedMotionReader(value) {
    if (typeof value === 'function') return () => value() === true;
    if (value && typeof value === 'object' && 'matches' in value) {
        return () => value.matches === true;
    }
    if (typeof value === 'boolean') return () => value;

    const mediaQuery = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');
    return () => mediaQuery?.matches === true;
}

function normalizeTiers(tiers) {
    if (!Array.isArray(tiers) || tiers.length === 0) {
        throw new TypeError('Combo timer tiers must be a non-empty array');
    }

    const normalized = tiers
        .map((tier) => {
            if (!tier || typeof tier.key !== 'string' || !Number.isFinite(tier.minRemainingPct)) {
                throw new TypeError('Each combo timer tier needs a key and minRemainingPct');
            }
            return tier;
        })
        .sort((left, right) => right.minRemainingPct - left.minRemainingPct);

    return Object.freeze(normalized);
}

function validateBar(bar) {
    if (!bar?.style || !bar?.classList) {
        throw new TypeError('Combo timer requires a bar element');
    }
}

function normalizeAnimationMode(mode) {
    if (['auto', 'waapi', 'css', 'none'].includes(mode)) return mode;
    throw new TypeError('Combo timer animationMode must be "auto", "waapi", "css", or "none"');
}

function formatScale(remainingPct) {
    return `scaleX(${clamp(remainingPct, 0, 1, 0)})`;
}

/**
 * A compositor-focused countdown presenter.
 *
 * JavaScript wakes only at visual tier boundaries (and expiration). The fill
 * itself is interpolated by WAAPI or a CSS transform transition when motion is
 * allowed. With reduced motion, the transform advances in deterministic steps.
 */
export class ComboTimerCompositor {
    constructor({
        bar,
        wrapper = null,
        tiers = SPEED_XP_TIERS,
        clock = defaultClock,
        scheduler = defaultScheduler(),
        reducedMotion,
        animationMode = 'auto',
        onTierChange = () => {},
        onExpire = () => {},
    } = {}) {
        validateBar(bar);
        if (typeof clock !== 'function') {
            throw new TypeError('Combo timer clock must be a function');
        }
        if (
            typeof scheduler?.setTimeout !== 'function' ||
            typeof scheduler?.clearTimeout !== 'function'
        ) {
            throw new TypeError('Combo timer scheduler needs setTimeout and clearTimeout');
        }
        if (typeof onTierChange !== 'function' || typeof onExpire !== 'function') {
            throw new TypeError('Combo timer callbacks must be functions');
        }

        this.bar = bar;
        this.wrapper = wrapper;
        this.tiers = normalizeTiers(tiers);
        this.tierClasses = [...new Set(this.tiers.map((tier) => tier.key))];
        this.clock = clock;
        this.scheduler = scheduler;
        this.readReducedMotion = createReducedMotionReader(reducedMotion);
        this.animationMode = normalizeAnimationMode(animationMode);
        this.onTierChange = onTierChange;
        this.onExpire = onExpire;

        this.status = COMBO_TIMER_STATUS.IDLE;
        this.durationMs = 0;
        this.anchorTime = 0;
        this.anchorRemainingPct = 1;
        this.visibleTierKey = null;
        this.activeAnimationMode = 'none';
        this.boundaryTimerId = null;
        this.frameId = null;
        this.animation = null;
        this.generation = 0;
        this.expirationNotified = false;
        this.visualsEnabled = true;
        this.ownership = null;

        this.initialStyle = Object.freeze({
            transform: bar.style.transform,
            transformOrigin: bar.style.transformOrigin,
            transition: bar.style.transition,
            willChange: bar.style.willChange,
        });
        this.initialTierClasses = new Map(
            this.tierClasses.map((key) => [key, bar.classList.contains(key)]),
        );
        this.initialInactive = wrapper?.classList?.contains('inactive') ?? false;

        bar.style.transformOrigin = 'left center';
        bar.style.willChange = 'transform';
    }

    start({
        durationMs,
        remainingPct = 1,
        inactive = false,
        visualsEnabled = true,
        ownership = null,
    } = {}) {
        this.#assertUsable();
        if (!Number.isFinite(durationMs) || durationMs <= 0) {
            throw new RangeError('Combo timer durationMs must be greater than zero');
        }

        this.#cancelScheduledWork();
        this.generation += 1;
        this.durationMs = durationMs;
        this.anchorTime = this.clock();
        this.anchorRemainingPct = clamp(remainingPct, 0, 1, 0);
        this.status = COMBO_TIMER_STATUS.RUNNING;
        this.expirationNotified = false;
        this.visualsEnabled = Boolean(visualsEnabled);
        this.ownership = ownership;
        this.#setInactive(inactive);
        if (this.visualsEnabled) {
            this.#present(this.anchorRemainingPct, { updateTransform: true });
        }

        if (this.anchorRemainingPct <= 0) {
            this.#expire();
        } else if (!this.visualsEnabled) {
            this.#scheduleExpirationOnly();
        } else {
            this.#startInterpolation();
            this.#scheduleNextBoundary();
        }

        return this.getSnapshot();
    }

    pause() {
        this.#assertUsable();
        if (this.status !== COMBO_TIMER_STATUS.RUNNING) return this.getSnapshot();

        const remainingPct = this.getRemainingPct();
        this.#cancelScheduledWork();
        this.generation += 1;
        this.anchorRemainingPct = remainingPct;
        this.anchorTime = this.clock();
        this.status = COMBO_TIMER_STATUS.PAUSED;
        this.#present(remainingPct, { updateTransform: true });
        return this.getSnapshot();
    }

    resume() {
        this.#assertUsable();
        if (this.status !== COMBO_TIMER_STATUS.PAUSED) return this.getSnapshot();

        this.generation += 1;
        this.anchorTime = this.clock();
        this.status = COMBO_TIMER_STATUS.RUNNING;
        if (this.anchorRemainingPct <= 0) {
            this.#expire();
        } else if (!this.visualsEnabled) {
            this.#scheduleExpirationOnly();
        } else {
            this.#startInterpolation();
            this.#scheduleNextBoundary();
        }
        return this.getSnapshot();
    }

    setVisualsEnabled(nextEnabled) {
        this.#assertUsable();
        const enabled = Boolean(nextEnabled);
        if (enabled === this.visualsEnabled) return this.getSnapshot();

        const remainingPct = this.getRemainingPct();
        this.#cancelScheduledWork();
        this.generation += 1;
        this.anchorRemainingPct = remainingPct;
        this.anchorTime = this.clock();
        this.visualsEnabled = enabled;
        if (this.status !== COMBO_TIMER_STATUS.RUNNING) return this.getSnapshot();
        if (remainingPct <= 0) {
            this.#expire();
        } else if (enabled) {
            this.#present(remainingPct, { updateTransform: true });
            this.#startInterpolation();
            this.#scheduleNextBoundary();
        } else {
            this.#scheduleExpirationOnly();
        }
        return this.getSnapshot();
    }

    syncReducedMotion() {
        this.#assertUsable();
        if (this.status !== COMBO_TIMER_STATUS.RUNNING) return this.getSnapshot();

        // Re-anchor presentation work at one monotonic sample. This changes only
        // how the existing countdown is painted; ownership and its deadline remain
        // authoritative and are never paused or rearmed.
        const now = this.clock();
        const remainingPct = this.getRemainingPct(now);
        this.#cancelScheduledWork();
        this.generation += 1;
        this.anchorRemainingPct = remainingPct;
        this.anchorTime = now;

        if (remainingPct <= 0) {
            this.#expire();
        } else if (!this.visualsEnabled) {
            this.#scheduleExpirationOnly();
        } else {
            this.#present(remainingPct, { updateTransform: true });
            this.#startInterpolation();
            this.#scheduleNextBoundary();
        }
        return this.getSnapshot();
    }

    stop({ remainingPct, inactive = false, clearTier = false } = {}) {
        this.#assertUsable();
        const finalRemainingPct = Number.isFinite(remainingPct)
            ? clamp(remainingPct, 0, 1, 0)
            : this.getRemainingPct();

        this.#cancelScheduledWork();
        this.generation += 1;
        this.anchorRemainingPct = finalRemainingPct;
        this.anchorTime = this.clock();
        this.status = COMBO_TIMER_STATUS.STOPPED;
        this.ownership = null;
        this.#setInactive(inactive);
        if (clearTier) {
            this.bar.classList.remove(...this.tierClasses);
            this.visibleTierKey = null;
            this.#setTransform(finalRemainingPct);
        } else {
            this.#present(finalRemainingPct, { updateTransform: true });
        }
        return this.getSnapshot();
    }

    getRemainingPct(now = this.clock()) {
        if (this.status !== COMBO_TIMER_STATUS.RUNNING) {
            return this.anchorRemainingPct;
        }
        const elapsedMs = Math.max(0, now - this.anchorTime);
        return clamp(this.anchorRemainingPct - elapsedMs / this.durationMs, 0, 1, 0);
    }

    getSnapshot() {
        const remainingPct = this.getRemainingPct();
        return Object.freeze({
            status: this.status,
            durationMs: this.durationMs,
            remainingPct,
            tierKey: this.#getTier(remainingPct).key,
            animationMode: this.activeAnimationMode,
            visualsEnabled: this.visualsEnabled,
            ownership: this.ownership,
        });
    }

    dispose() {
        if (this.status === COMBO_TIMER_STATUS.DISPOSED) return;
        this.#cancelScheduledWork();
        this.generation += 1;
        this.status = COMBO_TIMER_STATUS.DISPOSED;
        this.visibleTierKey = null;
        this.ownership = null;

        this.bar.style.transform = this.initialStyle.transform;
        this.bar.style.transformOrigin = this.initialStyle.transformOrigin;
        this.bar.style.transition = this.initialStyle.transition;
        this.bar.style.willChange = this.initialStyle.willChange;
        for (const [key, wasPresent] of this.initialTierClasses) {
            this.bar.classList.toggle(key, wasPresent);
        }
        this.wrapper?.classList?.toggle('inactive', this.initialInactive);
    }

    #assertUsable() {
        if (this.status === COMBO_TIMER_STATUS.DISPOSED) {
            throw new Error('Combo timer compositor has been disposed');
        }
    }

    #getTier(remainingPct) {
        const percentage = Number.isFinite(remainingPct) ? remainingPct : 0;
        return (
            this.tiers.find((tier) => percentage > tier.minRemainingPct) ??
            this.tiers[this.tiers.length - 1]
        );
    }

    #setInactive(inactive) {
        this.wrapper?.classList?.toggle('inactive', inactive === true);
    }

    #setTransform(remainingPct) {
        this.bar.style.transform = formatScale(remainingPct);
    }

    #present(remainingPct, { updateTransform }) {
        const tier = this.#getTier(remainingPct);
        if (updateTransform) this.#setTransform(remainingPct);
        if (tier.key === this.visibleTierKey) return;

        this.bar.classList.remove(...this.tierClasses);
        this.bar.classList.add(tier.key);
        this.visibleTierKey = tier.key;
        this.onTierChange(Object.freeze({ tier, remainingPct, snapshot: this.getSnapshot() }));
    }

    #resolveAnimationMode() {
        if (this.readReducedMotion()) return 'none';
        if (this.animationMode === 'none') return 'none';
        if (
            (this.animationMode === 'auto' || this.animationMode === 'waapi') &&
            typeof this.bar.animate === 'function'
        ) {
            return 'waapi';
        }
        if (this.animationMode === 'waapi') return 'none';
        if (
            (this.animationMode === 'auto' || this.animationMode === 'css') &&
            typeof this.scheduler.requestAnimationFrame === 'function'
        ) {
            return 'css';
        }
        return 'none';
    }

    #startInterpolation() {
        const remainingPct = this.getRemainingPct();
        const remainingDurationMs = remainingPct * this.durationMs;
        let mode = this.#resolveAnimationMode();
        this.activeAnimationMode = mode;

        if (mode === 'waapi') {
            this.bar.style.transition = 'none';
            this.#setTransform(0);
            try {
                this.animation = this.bar.animate(
                    [{ transform: formatScale(remainingPct) }, { transform: formatScale(0) }],
                    {
                        duration: remainingDurationMs,
                        easing: 'linear',
                        fill: 'forwards',
                    },
                );
                return;
            } catch {
                this.animation = null;
                mode =
                    this.animationMode === 'auto' &&
                    typeof this.scheduler.requestAnimationFrame === 'function'
                        ? 'css'
                        : 'none';
                this.activeAnimationMode = mode;
            }
        }

        if (mode === 'css') {
            this.bar.style.transition = 'none';
            this.#setTransform(remainingPct);
            const generation = this.generation;
            this.frameId = this.scheduler.requestAnimationFrame(() => {
                this.frameId = null;
                if (generation !== this.generation || this.status !== COMBO_TIMER_STATUS.RUNNING) {
                    return;
                }
                const currentRemainingPct = this.getRemainingPct();
                this.bar.style.transition = `transform ${
                    currentRemainingPct * this.durationMs
                }ms linear`;
                this.#setTransform(0);
            });
            if (this.frameId !== null && this.frameId !== undefined) return;
            this.activeAnimationMode = 'none';
        }

        this.bar.style.transition = 'none';
        this.#setTransform(remainingPct);
    }

    #scheduleNextBoundary() {
        if (this.status !== COMBO_TIMER_STATUS.RUNNING) return;
        const remainingPct = this.getRemainingPct();
        const nextBoundary = this.tiers
            .map((tier) => tier.minRemainingPct)
            .filter((boundary) => boundary >= 0 && boundary < remainingPct - BOUNDARY_EPSILON)
            .sort((left, right) => right - left)[0];

        const targetRemainingPct = Number.isFinite(nextBoundary) ? nextBoundary : 0;
        const delay = Math.max(0, (remainingPct - targetRemainingPct) * this.durationMs);
        const generation = this.generation;
        this.boundaryTimerId = this.scheduler.setTimeout(() => {
            this.boundaryTimerId = null;
            if (generation !== this.generation || this.status !== COMBO_TIMER_STATUS.RUNNING) {
                return;
            }

            const currentRemainingPct = this.getRemainingPct();
            this.#present(currentRemainingPct, {
                updateTransform: this.activeAnimationMode === 'none',
            });
            if (currentRemainingPct <= BOUNDARY_EPSILON) {
                this.#expire();
            } else {
                this.#scheduleNextBoundary();
            }
        }, delay);
    }

    #scheduleExpirationOnly() {
        if (this.status !== COMBO_TIMER_STATUS.RUNNING) return;
        const generation = this.generation;
        const delay = this.getRemainingPct() * this.durationMs;
        this.boundaryTimerId = this.scheduler.setTimeout(
            () => {
                this.boundaryTimerId = null;
                if (generation !== this.generation || this.status !== COMBO_TIMER_STATUS.RUNNING) {
                    return;
                }
                this.#expire();
            },
            Math.max(0, delay),
        );
    }

    #expire() {
        if (this.status === COMBO_TIMER_STATUS.DISPOSED) return;
        const ownership = this.ownership;
        this.#cancelScheduledWork();
        this.generation += 1;
        this.anchorRemainingPct = 0;
        this.anchorTime = this.clock();
        this.status = COMBO_TIMER_STATUS.EXPIRED;
        this.#present(0, { updateTransform: true });
        if (this.expirationNotified) return;

        this.expirationNotified = true;
        this.onExpire(this.getSnapshot(), ownership);
    }

    #cancelScheduledWork() {
        if (this.boundaryTimerId !== null) {
            this.scheduler.clearTimeout(this.boundaryTimerId);
            this.boundaryTimerId = null;
        }
        if (this.frameId !== null) {
            this.scheduler.cancelAnimationFrame?.(this.frameId);
            this.frameId = null;
        }
        this.animation?.cancel?.();
        this.animation = null;
        this.activeAnimationMode = 'none';
        this.bar.style.transition = 'none';
    }
}

export function createComboTimerCompositor(options) {
    return new ComboTimerCompositor(options);
}
