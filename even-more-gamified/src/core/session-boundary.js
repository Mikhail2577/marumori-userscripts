export const SESSION_BOUNDARY_REASONS = Object.freeze({
    HOST_SESSION_CHANGED: 'host-session-changed',
    URL_CHANGED: 'url-changed',
    PROGRESS_RESET: 'progress-reset',
});

const FALLBACK_BASE_URL = 'https://marumori.invalid/';

export function normalizeSessionUrl(value) {
    if (value === null || value === undefined || value === '') return null;
    try {
        const url = new URL(String(value), FALLBACK_BASE_URL);
        return `${url.origin}${url.pathname}${url.search}`;
    } catch {
        return null;
    }
}

export function getReviewSessionBoundaryReason({
    activeUrl,
    currentUrl,
    activeSessionIdentity,
    currentSessionIdentity,
    lastCompleted,
    currentProgress,
    unresolved = false,
    rewindPending = false,
} = {}) {
    if (
        activeSessionIdentity &&
        currentSessionIdentity &&
        activeSessionIdentity !== currentSessionIdentity
    ) {
        return SESSION_BOUNDARY_REASONS.HOST_SESSION_CHANGED;
    }

    const normalizedActiveUrl = normalizeSessionUrl(activeUrl);
    const normalizedCurrentUrl = normalizeSessionUrl(currentUrl);
    if (
        normalizedActiveUrl &&
        normalizedCurrentUrl &&
        normalizedActiveUrl !== normalizedCurrentUrl
    ) {
        return SESSION_BOUNDARY_REASONS.URL_CHANGED;
    }

    // A rewind intentionally makes progress move backwards. URL and root changes
    // are authoritative boundaries, but a counter regression is ambiguous until
    // the rewind transaction either commits or cancels.
    if (rewindPending) return null;

    if (
        unresolved &&
        Number.isFinite(lastCompleted) &&
        Number.isFinite(currentProgress) &&
        currentProgress < lastCompleted
    ) {
        return SESSION_BOUNDARY_REASONS.PROGRESS_RESET;
    }

    return null;
}
