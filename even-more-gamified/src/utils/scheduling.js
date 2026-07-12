export function debounce(callback, wait = 120, scheduler = globalThis) {
    if (typeof callback !== 'function') throw new TypeError('debounce expects a callback');
    let timer = null;
    const debounced = function (...args) {
        if (timer !== null) scheduler.clearTimeout(timer);
        timer = scheduler.setTimeout(() => {
            timer = null;
            callback.apply(this, args);
        }, wait);
    };
    debounced.cancel = () => {
        if (timer !== null) scheduler.clearTimeout(timer);
        timer = null;
    };
    return debounced;
}
