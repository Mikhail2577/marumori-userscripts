/**
 * Coerce a value to a finite number and constrain it to the inclusive range.
 *
 * The fallback is returned verbatim, matching the legacy helper. In particular,
 * it is not itself clamped.
 */
export function clamp(value, minimum, maximum, fallback) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.min(maximum, Math.max(minimum, parsed)) : fallback;
}
