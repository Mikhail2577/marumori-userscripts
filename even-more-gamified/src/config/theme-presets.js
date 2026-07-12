/**
 * Resolve a preset into the flat shape consumed by theme effects.
 *
 * Precedence is base defaults, root-level properties, shared event defaults,
 * then the requested event override. Merging is intentionally shallow, like
 * the original preset resolver.
 */
export function mergeEventPreset(preset = {}, eventType = 'default') {
    const source = preset && typeof preset === 'object' ? preset : {};
    const { base = {}, events = {}, ...root } = source;

    return {
        ...base,
        ...root,
        ...(events.default || {}),
        ...(events[eventType] || {}),
    };
}
