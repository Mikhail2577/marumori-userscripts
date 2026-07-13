export function subscribeMediaQuery(mediaQuery, listener) {
    if (typeof listener !== 'function') {
        throw new TypeError('Media-query listener must be a function');
    }
    if (!mediaQuery) return () => {};

    let active = true;
    const guardedListener = (event) => {
        if (active) listener(event);
    };
    let remove;

    if (
        typeof mediaQuery.addEventListener === 'function' &&
        typeof mediaQuery.removeEventListener === 'function'
    ) {
        mediaQuery.addEventListener('change', guardedListener);
        remove = () => mediaQuery.removeEventListener('change', guardedListener);
    } else if (
        typeof mediaQuery.addListener === 'function' &&
        typeof mediaQuery.removeListener === 'function'
    ) {
        mediaQuery.addListener(guardedListener);
        remove = () => mediaQuery.removeListener(guardedListener);
    } else {
        return () => {};
    }

    return () => {
        if (!active) return;
        active = false;
        remove();
    };
}
