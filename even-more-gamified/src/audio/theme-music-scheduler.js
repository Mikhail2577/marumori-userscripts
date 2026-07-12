import {
    LOFI_MELODIES,
    MUSIC_PROGRESSIONS,
    NOTE_RATIOS,
    RETRO_MELODIES,
} from '../config/audio-presets.js';
import { clamp } from '../utils/clamp.js';

/** Owns theme music synthesis and every oscillator scheduled by it. */
export function createThemeMusicScheduler({
    getMusicStyle = () => 'lofi',
    isLiteMode = () => false,
} = {}) {
    const musicOscillators = new Set();

    function getScaleFrequency(root, degree) {
        const index = ((degree % NOTE_RATIOS.length) + NOTE_RATIOS.length) % NOTE_RATIOS.length;
        const octave = Math.floor(degree / NOTE_RATIOS.length);
        return root * NOTE_RATIOS[index] * Math.pow(2, octave);
    }

    function scheduleThemeMusicNote(
        ctx,
        destination,
        frequency,
        start,
        duration,
        preset,
        options = {},
    ) {
        const volumeScale = clamp(preset.volumeScale, 0.05, 1.4, 1);
        scheduleMusicNote(ctx, destination, frequency, start, duration, {
            type: options.type || preset.type || 'triangle',
            volume: (options.volume || 0.03) * volumeScale,
            cutoff: options.cutoff || preset.cutoff || 1400,
            detune: options.detune || 0,
        });
    }

    function scheduleMusicNote(ctx, destination, frequency, start, duration, options = {}) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();
        musicOscillators.add(osc);
        osc.addEventListener('ended', () => musicOscillators.delete(osc), { once: true });
        osc.type = options.type || 'triangle';
        osc.frequency.setValueAtTime(frequency, start);
        if (options.detune) osc.detune.setValueAtTime(options.detune, start);
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(options.cutoff || 1800, start);
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.linearRampToValueAtTime(options.volume || 0.08, start + 0.025);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(destination);
        osc.start(start);
        osc.stop(start + duration + 0.03);
    }

    function scheduleAmbientMusicBar(ctx, destination, start, preset, patternIndex) {
        const beat = 60 / (preset.bpm || 54);
        const chord = preset.chords[patternIndex % preset.chords.length];
        chord.forEach((degree, voice) => {
            scheduleThemeMusicNote(
                ctx,
                destination,
                getScaleFrequency(preset.root, degree),
                start,
                beat * 4.4,
                preset,
                {
                    type: voice === 0 ? 'sine' : preset.type,
                    volume: voice === 0 ? 0.034 : 0.023,
                    detune: (voice - 1) * 5,
                },
            );
        });

        const melody = preset.melody || [];
        melody.forEach((degree, step) => {
            if (degree === null || degree === undefined) return;
            scheduleThemeMusicNote(
                ctx,
                destination,
                getScaleFrequency(preset.root * 2, degree),
                start + step * beat,
                beat * 0.75,
                preset,
                { type: 'sine', volume: 0.018, cutoff: preset.cutoff + 450 },
            );
        });
        return beat * Math.max(8, melody.length || 8);
    }

    function schedulePulseMusicBar(ctx, destination, start, preset, patternIndex) {
        const beat = 60 / (preset.bpm || 104);
        const stepDuration = beat / 2;
        const pattern = preset.pattern || [];
        pattern.forEach((degree, step) => {
            const stepStart = start + step * stepDuration;
            if (degree !== null && degree !== undefined) {
                scheduleThemeMusicNote(
                    ctx,
                    destination,
                    getScaleFrequency(preset.root * 2, degree),
                    stepStart,
                    stepDuration * 0.52,
                    preset,
                    { volume: 0.025, cutoff: preset.cutoff },
                );
            }
            if (step % 4 === 0) {
                scheduleThemeMusicNote(
                    ctx,
                    destination,
                    preset.root / 2,
                    stepStart,
                    stepDuration * 0.8,
                    preset,
                    { type: 'sine', volume: 0.022, cutoff: 520 },
                );
            }
            if (preset.glitch && !isLiteMode() && step % 7 === patternIndex % 7) {
                scheduleThemeMusicNote(
                    ctx,
                    destination,
                    getScaleFrequency(preset.root * 3, 11),
                    stepStart + stepDuration * 0.35,
                    0.035,
                    preset,
                    { type: 'square', volume: 0.012, cutoff: 2400, detune: 16 },
                );
            }
        });
        return stepDuration * Math.max(8, pattern.length);
    }

    function scheduleChiptuneMusicBar(ctx, destination, start, preset) {
        const beat = 60 / (preset.bpm || 128);
        const stepDuration = beat / 2;
        const pattern = preset.pattern || [];
        pattern.forEach((degree, step) => {
            if (degree === null || degree === undefined) return;
            scheduleThemeMusicNote(
                ctx,
                destination,
                getScaleFrequency(preset.root * 2, degree),
                start + step * stepDuration,
                stepDuration * 0.62,
                preset,
                { volume: step % 4 === 0 ? 0.036 : 0.028, cutoff: preset.cutoff },
            );
        });
        for (let step = 0; step < pattern.length; step += 4) {
            scheduleThemeMusicNote(
                ctx,
                destination,
                preset.root / 2,
                start + step * stepDuration,
                stepDuration * 1.25,
                preset,
                { type: 'square', volume: 0.027, cutoff: 720 },
            );
        }
        return stepDuration * Math.max(8, pattern.length);
    }

    function scheduleBellMusicBar(ctx, destination, start, preset) {
        const beat = 60 / (preset.bpm || 62);
        const stepDuration = beat / 2;
        const pattern = preset.pattern || [];
        pattern.forEach((degree, step) => {
            if (degree === null || degree === undefined) return;
            scheduleThemeMusicNote(
                ctx,
                destination,
                getScaleFrequency(preset.root, degree),
                start + step * stepDuration,
                beat * 1.4,
                preset,
                {
                    type: step % 5 === 0 ? 'triangle' : 'sine',
                    volume: 0.024,
                    cutoff: preset.cutoff,
                },
            );
        });
        scheduleThemeMusicNote(ctx, destination, preset.root / 2, start, beat * 5.6, preset, {
            type: 'sine',
            volume: 0.014,
            cutoff: 500,
        });
        return stepDuration * Math.max(8, pattern.length);
    }

    function scheduleMinyoMusicBar(ctx, destination, start, preset, patternIndex) {
        const beat = 60 / (preset.bpm || 58);
        const stepDuration = beat / 2;
        const pattern = preset.pattern || [];
        const reply = preset.reply || [];
        const drone = preset.drone || [-12, 0];
        const phraseOffset = [0, -3, 2, 0][patternIndex % 4];

        drone.forEach((degree, voice) => {
            scheduleThemeMusicNote(
                ctx,
                destination,
                getScaleFrequency(preset.root, degree),
                start,
                beat * 7.4,
                preset,
                {
                    type: voice === 0 ? 'sine' : 'triangle',
                    volume: voice === 0 ? 0.015 : 0.01,
                    cutoff: 560 + voice * 180,
                    detune: voice === 0 ? -4 : 4,
                },
            );
        });

        pattern.forEach((degree, step) => {
            if (degree === null || degree === undefined) return;
            scheduleThemeMusicNote(
                ctx,
                destination,
                getScaleFrequency(preset.root * 2, degree + phraseOffset),
                start + step * stepDuration,
                stepDuration * (step % 4 === 2 ? 0.92 : 0.68),
                preset,
                {
                    type: step % 4 === 0 ? 'triangle' : 'sine',
                    volume: step % 4 === 0 ? 0.024 : 0.018,
                    cutoff: preset.cutoff,
                    detune: step % 3 === 0 ? -7 : 5,
                },
            );
        });

        reply.forEach((degree, step) => {
            if (degree === null || degree === undefined) return;
            scheduleThemeMusicNote(
                ctx,
                destination,
                getScaleFrequency(preset.root, degree + phraseOffset),
                start + beat * 4 + step * stepDuration,
                stepDuration * 0.74,
                preset,
                {
                    type: 'triangle',
                    volume: 0.014,
                    cutoff: preset.cutoff * 0.88,
                    detune: -10,
                },
            );
        });

        return stepDuration * Math.max(pattern.length, 8 + reply.length, 16);
    }

    function scheduleVoidMusicBar(ctx, destination, start, preset) {
        const duration = preset.duration || 5;
        scheduleThemeMusicNote(ctx, destination, preset.root, start, duration * 0.82, preset, {
            type: 'sine',
            volume: 0.006,
            cutoff: preset.cutoff,
        });
        return duration;
    }

    function scheduleLofiBar(ctx, destination, start, progression, patternIndex) {
        const beat = 60 / 74;
        progression.forEach((chord, chordIndex) => {
            const chordStart = start + chordIndex * beat * 2;
            chord.forEach((frequency, voice) => {
                scheduleMusicNote(ctx, destination, frequency, chordStart, beat * 1.85, {
                    type: 'triangle',
                    volume: voice === 0 ? 0.045 : 0.032,
                    cutoff: 950,
                    detune: (voice - 1) * 4,
                });
            });
            const bassDelay = chordIndex % 2 === patternIndex % 2 ? 0 : beat / 2;
            scheduleMusicNote(ctx, destination, chord[0] / 2, chordStart + bassDelay, beat * 0.72, {
                type: 'sine',
                volume: 0.055,
                cutoff: 520,
            });
        });

        const melody = LOFI_MELODIES[patternIndex % LOFI_MELODIES.length];
        melody.forEach((degree, step) => {
            if (degree === null) return;
            const chordIndex = Math.min(3, Math.floor(step / 4));
            const root = progression[chordIndex][0] * 2;
            const octave = (patternIndex + step) % 11 === 0 ? 2 : 1;
            scheduleMusicNote(
                ctx,
                destination,
                root * NOTE_RATIOS[degree] * octave,
                start + (step * beat) / 2,
                beat * (step % 4 === 3 ? 0.62 : 0.38),
                {
                    type: 'sine',
                    volume: octave === 2 ? 0.014 : 0.022,
                    cutoff: octave === 2 ? 1550 : 1150,
                },
            );
        });
        return beat * 8;
    }

    function scheduleRetroBar(ctx, destination, start, progression, patternIndex) {
        const beat = 60 / 104;
        const melody = RETRO_MELODIES[patternIndex % RETRO_MELODIES.length];
        const root = progression[patternIndex % progression.length][0];
        melody.forEach((degree, step) => {
            if (degree === null) return;
            scheduleMusicNote(
                ctx,
                destination,
                root * 2 * NOTE_RATIOS[degree],
                start + (step * beat) / 2,
                beat * 0.38,
                {
                    type: step % 4 === 0 ? 'square' : 'triangle',
                    volume: 0.035,
                    cutoff: 2100,
                },
            );
        });
        progression.forEach((chord, index) => {
            const chordStart = start + index * beat * 2;
            scheduleMusicNote(ctx, destination, chord[0] / 2, chordStart, beat * 0.7, {
                type: 'square',
                volume: 0.035,
                cutoff: 700,
            });
            chord.slice(1).forEach((frequency) => {
                scheduleMusicNote(ctx, destination, frequency, chordStart, beat * 1.75, {
                    type: 'triangle',
                    volume: 0.018,
                    cutoff: 1300,
                });
            });
        });
        return beat * 8;
    }

    function scheduleThemeMusicBar(ctx, destination, start, preset, patternIndex) {
        if (preset.scheduler === 'ambient') {
            return scheduleAmbientMusicBar(ctx, destination, start, preset, patternIndex);
        }
        if (preset.scheduler === 'pulse') {
            return schedulePulseMusicBar(ctx, destination, start, preset, patternIndex);
        }
        if (preset.scheduler === 'chiptune') {
            return scheduleChiptuneMusicBar(ctx, destination, start, preset);
        }
        if (preset.scheduler === 'bells') {
            return scheduleBellMusicBar(ctx, destination, start, preset);
        }
        if (preset.scheduler === 'minyo') {
            return scheduleMinyoMusicBar(ctx, destination, start, preset, patternIndex);
        }
        if (preset.scheduler === 'void') {
            return scheduleVoidMusicBar(ctx, destination, start, preset);
        }

        const progression = MUSIC_PROGRESSIONS[patternIndex % MUSIC_PROGRESSIONS.length];
        return getMusicStyle() === 'retro'
            ? scheduleRetroBar(ctx, destination, start, progression, patternIndex)
            : scheduleLofiBar(ctx, destination, start, progression, patternIndex);
    }

    function stopScheduledMusic({ context, fadeSeconds = 0 } = {}) {
        const stopAt = (context?.currentTime || 0) + Math.max(0.02, fadeSeconds);
        for (const oscillator of musicOscillators) {
            try {
                oscillator.stop(stopAt);
            } catch {
                /* already stopped */
            }
        }
        musicOscillators.clear();
    }

    return Object.freeze({
        scheduleBar: scheduleThemeMusicBar,
        stopScheduled: stopScheduledMusic,
        get activeCount() {
            return musicOscillators.size;
        },
    });
}
