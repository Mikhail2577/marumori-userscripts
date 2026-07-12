export function createFirstInputGate({
    lifecycle,
    isCurrentInput = () => true,
    isResolved,
    onStart,
} = {}) {
    if (!lifecycle?.markFirstInput) {
        throw new TypeError('First-input gate requires a lifecycle controller');
    }
    if (
        typeof isCurrentInput !== 'function' ||
        typeof isResolved !== 'function' ||
        typeof onStart !== 'function'
    ) {
        throw new TypeError('First-input gate requires input, resolution, and start callbacks');
    }

    let input = null;
    let handler = null;
    let started = false;

    function disarm() {
        if (input && handler) input.removeEventListener('input', handler, true);
        input = null;
        handler = null;
    }

    function markStarted() {
        if (started) return false;
        started = true;
        disarm();
        return true;
    }

    function arm(nextInput) {
        if (started || isResolved() || !nextInput?.addEventListener) return false;
        if (input === nextInput && handler) return true;
        disarm();
        input = nextInput;
        handler = (event) => {
            const value = event.target?.value ?? '';
            if (
                started ||
                !isCurrentInput(event.target) ||
                isResolved() ||
                String(value).length === 0
            ) {
                return;
            }
            // Starting is transactional: a transient ownership/DOM rejection
            // must not consume the session's only first-input listener.
            if (onStart() !== true) return;
            lifecycle.markFirstInput();
            markStarted();
        };
        input.addEventListener('input', handler, true);
        return true;
    }

    function reset() {
        disarm();
        started = false;
    }

    return Object.freeze({
        arm,
        disarm,
        markStarted,
        reset,
        cleanup: reset,
        get hasStarted() {
            return started;
        },
        get input() {
            return input;
        },
    });
}
