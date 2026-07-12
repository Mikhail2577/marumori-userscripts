import { clamp } from '../utils/clamp.js';

export const CANVAS_PIXEL_BUDGETS = Object.freeze({
    lite: 1_500_000,
    balanced: 3_686_400,
    max: 8_294_400,
});

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
