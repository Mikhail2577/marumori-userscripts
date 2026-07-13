import { clamp } from '../utils/clamp.js';

export const CANVAS_PIXEL_BUDGETS = Object.freeze({
    lite: 1_500_000,
    balanced: 3_686_400,
    max: 8_294_400,
});

export function createFrameCadenceGate({ intervalMs = 1000 / 60, earlyToleranceMs = 0.5 } = {}) {
    if (!Number.isFinite(intervalMs) || intervalMs <= 0) {
        throw new RangeError('Frame cadence interval must be greater than zero');
    }
    if (!Number.isFinite(earlyToleranceMs) || earlyToleranceMs < 0) {
        throw new RangeError('Frame cadence tolerance must be nonnegative');
    }

    let nextDeadline = null;

    function shouldRender(now) {
        if (!Number.isFinite(now)) return false;
        if (nextDeadline === null) {
            nextDeadline = now + intervalMs;
            return true;
        }
        if (now + earlyToleranceMs < nextDeadline) return false;

        // Every accepted frame advances the deadline at least once. Advancing
        // missed intervals arithmetically avoids catch-up bursts after a long frame.
        const missedIntervals = Math.floor(
            Math.max(0, now + earlyToleranceMs - nextDeadline) / intervalMs,
        );
        nextDeadline += (missedIntervals + 1) * intervalMs;
        return true;
    }

    function reset(now = null) {
        nextDeadline = Number.isFinite(now) ? now + intervalMs : null;
    }

    return Object.freeze({
        shouldRender,
        reset,
        get nextDeadline() {
            return nextDeadline;
        },
    });
}

export function calculateCanvasSize(
    viewportWidth,
    viewportHeight,
    { scale = 1, maxPixels = CANVAS_PIXEL_BUDGETS.balanced } = {},
) {
    const width = Math.max(1, Number(viewportWidth) || 1);
    const height = Math.max(1, Number(viewportHeight) || 1);
    const requestedScale = clamp(scale, 0.1, 1, 1);
    const pixelBudget = Math.max(1, Number(maxPixels) || CANVAS_PIXEL_BUDGETS.balanced);
    const budgetScale = Math.sqrt(pixelBudget / (width * height));
    const effectiveScale = Math.min(requestedScale, budgetScale);

    return Object.freeze({
        width: Math.max(1, Math.floor(width * effectiveScale)),
        height: Math.max(1, Math.floor(height * effectiveScale)),
        scale: effectiveScale,
    });
}

export function compactInPlace(items, keep) {
    if (!Array.isArray(items)) throw new TypeError('compactInPlace expects an array');
    if (typeof keep !== 'function') throw new TypeError('compactInPlace expects a predicate');

    let writeIndex = 0;
    for (let readIndex = 0; readIndex < items.length; readIndex += 1) {
        const item = items[readIndex];
        if (!keep(item, readIndex)) continue;
        items[writeIndex] = item;
        writeIndex += 1;
    }
    items.length = writeIndex;
    return items;
}
