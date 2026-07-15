import { createAudioErrorReporter } from './runtime-helpers.js';

/**
 * Schedules short Web Audio tones while retaining ownership of every oscillator.
 * Delayed oscillators can therefore be stopped when a session is hidden or torn down.
 */
export function createToneScheduler({ onError = () => {} } = {}) {
    const activeOscillators = new Map();
    const warn = createAudioErrorReporter(onError);

    function schedule({
        context,
        destination,
        frequency,
        duration = 0.12,
        volume = 0.2,
        type = 'square',
        delay = 0,
        endFrequency,
        detune = 0,
    }) {
        if (!context?.createOscillator || !context?.createGain || !destination) return false;

        try {
            const oscillator = context.createOscillator();
            const gain = context.createGain();
            const startAt = context.currentTime + Math.max(0, delay);
            const toneDuration = Math.max(0.015, duration);

            oscillator.type = type;
            oscillator.connect(gain);
            gain.connect(destination);
            oscillator.frequency.setValueAtTime(frequency, startAt);
            if (detune) oscillator.detune.setValueAtTime(detune, startAt);
            if (Number.isFinite(endFrequency) && endFrequency > 0) {
                oscillator.frequency.exponentialRampToValueAtTime(
                    endFrequency,
                    startAt + Math.max(0.015, toneDuration * 0.86),
                );
            }
            gain.gain.setValueAtTime(0.0001, startAt);
            gain.gain.linearRampToValueAtTime(volume, startAt + 0.005);
            gain.gain.exponentialRampToValueAtTime(0.0001, startAt + toneDuration);

            activeOscillators.set(oscillator, context);
            oscillator.addEventListener?.('ended', () => activeOscillators.delete(oscillator), {
                once: true,
            });
            oscillator.start(startAt);
            oscillator.stop(startAt + toneDuration + 0.01);
            return true;
        } catch (error) {
            warn(error, 'schedule-tone');
            return false;
        }
    }

    function stopAll() {
        for (const [oscillator, context] of activeOscillators) {
            try {
                oscillator.stop(context.currentTime);
            } catch {
                // An oscillator may already have ended between iteration and stop().
            }
        }
        activeOscillators.clear();
    }

    return Object.freeze({
        schedule,
        stopAll,
        get activeCount() {
            return activeOscillators.size;
        },
    });
}
