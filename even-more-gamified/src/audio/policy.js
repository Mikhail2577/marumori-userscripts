function isAudible(enabled, volume) {
    return Boolean(enabled) && Number(volume) > 0;
}

/**
 * Applies settings-driven audio policy at the user-event boundary.
 * Muting SFX also revokes ownership of tones that were scheduled with a delay.
 */
export function syncAudioPolicy({
    lifecycle,
    sfx,
    sfxEnabled,
    sfxVolume,
    musicEnabled,
    musicVolume,
    consumeGesture = false,
}) {
    const sfxAudible = isAudible(sfxEnabled, sfxVolume);
    const musicAudible = isAudible(musicEnabled, musicVolume);

    if (!sfxAudible) sfx?.cancel?.();

    if (!sfxAudible && !musicAudible) {
        lifecycle.disarmGestureUnlock();
        return 'inaudible';
    }
    if (consumeGesture) {
        void lifecycle.resume();
        return 'resuming';
    }
    lifecycle.armGestureUnlock();
    return 'armed';
}
