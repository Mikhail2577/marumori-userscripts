import { NIGHTVIEW_IMAGE_URL } from '../../config/themes.js';
import {
    createManagedBackgroundImage,
    drawDriftingCoverImage,
} from './image-background-helpers.js';

const NIGHTVIEW_LANTERN_POINTS = Object.freeze([
    Object.freeze({ x: 0.077, y: 0.69, radius: 0.95, phase: 0.4 }),
    Object.freeze({ x: 0.67, y: 0.88, radius: 0.72, phase: 1.7 }),
    Object.freeze({ x: 0.744, y: 0.585, radius: 0.52, phase: 2.8 }),
    Object.freeze({ x: 0.402, y: 0.59, radius: 0.42, phase: 3.6 }),
]);

export function createNightviewRenderer(runtime) {
    const { ctx, theme, document, isLiteMode, prefersReducedMotion, requestRender } = runtime;
    let nightviewFireflies = [];
    let nightviewStars = [];
    const nightviewBackground = createManagedBackgroundImage({
        document,
        resourceName: 'mmNightview',
        directUrl: NIGHTVIEW_IMAGE_URL,
        shouldRequestRender: () => prefersReducedMotion() || isLiteMode(),
        requestRender,
        onFailure: () => {
            console.warn('[MMGamify] Night View background resource failed to load.');
        },
    });

    function resetNightviewFirefly(firefly = {}, randomY = false) {
        firefly.x = Math.random() * runtime.width;
        firefly.y = randomY
            ? runtime.height * (0.52 + Math.random() * 0.43)
            : runtime.height + 8 + Math.random() * runtime.height * 0.16;
        firefly.size = 1.1 + Math.random() * 1.8;
        firefly.speed = 0.08 + Math.random() * 0.18;
        firefly.drift = 0.18 + Math.random() * 0.38;
        firefly.alpha = 0.14 + Math.random() * 0.24;
        firefly.phase = Math.random() * Math.PI * 2;
        firefly.hue = Math.random() < 0.72 ? 48 : 205;
        return firefly;
    }

    function initNightview() {
        const fireflyCount = isLiteMode()
            ? 0
            : Math.max(10, Math.min(24, Math.floor(runtime.width / 95)));
        nightviewFireflies = Array.from({ length: fireflyCount }, () =>
            resetNightviewFirefly({}, true),
        );
        const starCount = isLiteMode()
            ? 0
            : Math.max(12, Math.min(34, Math.floor(runtime.width / 72)));
        nightviewStars = Array.from({ length: starCount }, () => ({
            x: runtime.width * (0.08 + Math.random() * 0.84),
            y: runtime.height * (0.055 + Math.random() * 0.28),
            radius: 0.55 + Math.random() * 1.25,
            alpha: 0.1 + Math.random() * 0.22,
            phase: Math.random() * Math.PI * 2,
            speed: 0.55 + Math.random() * 1.25,
            hue: Math.random() < 0.7 ? 212 : 46,
        }));
        nightviewBackground.load();
    }

    function drawNightviewImage(t) {
        if (!nightviewBackground.ready) {
            const fallback = ctx.createLinearGradient(0, 0, 0, runtime.height);
            fallback.addColorStop(0, '#071326');
            fallback.addColorStop(0.55, '#050b18');
            fallback.addColorStop(1, '#02050a');
            ctx.fillStyle = fallback;
            ctx.fillRect(0, 0, runtime.width, runtime.height);
            return;
        }

        drawDriftingCoverImage({
            ctx,
            image: nightviewBackground.image,
            width: runtime.width,
            height: runtime.height,
            time: t,
            animated: !isLiteMode() && !prefersReducedMotion(),
            baseScale: 1.01,
            scalePulseRate: 0.06,
            driftXRate: 0.03,
            driftXDistance: 2.1,
            driftYRate: 0.026,
            driftYDistance: 1.2,
        });
    }

    function drawNightviewMoonGlow(t) {
        const pulse = prefersReducedMotion() ? 1 : 0.88 + Math.sin(t * 0.52) * 0.12;
        const moonX = runtime.width * 0.305;
        const moonY = runtime.height * 0.16;
        const radius = Math.min(runtime.width, runtime.height) * 0.13;
        const glow = ctx.createRadialGradient(moonX, moonY, 0, moonX, moonY, radius);
        glow.addColorStop(0, `rgba(235,244,255,${0.16 * pulse})`);
        glow.addColorStop(0.34, `rgba(140,186,255,${0.055 * pulse})`);
        glow.addColorStop(1, 'rgba(80,130,220,0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(moonX, moonY, radius, 0, Math.PI * 2);
        ctx.fill();
    }

    function drawNightviewLanternGlow(t) {
        const radius = Math.min(runtime.width, runtime.height) * 0.075;
        for (const lantern of NIGHTVIEW_LANTERN_POINTS) {
            const x = runtime.width * lantern.x;
            const y = runtime.height * lantern.y;
            const pulse = prefersReducedMotion()
                ? 1
                : 0.82 +
                  Math.sin(t * 1.08 + lantern.phase) * 0.11 +
                  Math.sin(t * 5.1 + lantern.phase) * 0.035;
            const glow = ctx.createRadialGradient(x, y, 0, x, y, radius * lantern.radius);
            glow.addColorStop(0, `rgba(255,202,102,${0.12 * pulse})`);
            glow.addColorStop(0.34, `rgba(255,156,58,${0.045 * pulse})`);
            glow.addColorStop(1, 'rgba(255,120,35,0)');
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(x, y, radius * lantern.radius, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function drawNightviewStarFlickers(t) {
        if (isLiteMode() || prefersReducedMotion()) return;
        for (const star of nightviewStars) {
            const pulse =
                0.52 +
                Math.sin(t * star.speed + star.phase) * 0.34 +
                Math.sin(t * star.speed * 2.7 + star.phase) * 0.14;
            const alpha = Math.max(0, star.alpha * pulse);
            ctx.save();
            ctx.fillStyle = `hsla(${star.hue},90%,88%,${alpha})`;
            ctx.shadowColor = `hsla(${star.hue},95%,78%,${alpha * 0.72})`;
            ctx.shadowBlur = 5 + star.radius * 4;
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    function drawNightviewFireflies(t) {
        if (isLiteMode() || prefersReducedMotion()) return;
        for (const firefly of nightviewFireflies) {
            firefly.y -= firefly.speed * runtime.frameScale;
            firefly.x += Math.sin(t * 0.75 + firefly.phase) * firefly.drift * runtime.frameScale;
            if (
                firefly.y < runtime.height * 0.48 ||
                firefly.x < -12 ||
                firefly.x > runtime.width + 12
            ) {
                resetNightviewFirefly(firefly);
            }

            const pulse = 0.58 + Math.sin(t * 1.8 + firefly.phase) * 0.42;
            ctx.save();
            ctx.fillStyle = `hsla(${firefly.hue},95%,72%,${firefly.alpha * pulse})`;
            ctx.shadowColor = `hsla(${firefly.hue},95%,68%,${0.42 * pulse})`;
            ctx.shadowBlur = 8 + firefly.size * 4;
            ctx.beginPath();
            ctx.arc(firefly.x, firefly.y, firefly.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    function drawNightview(t) {
        if (theme !== 'nightview') return;
        ctx.save();
        drawNightviewImage(t);
        ctx.globalCompositeOperation = 'lighter';
        drawNightviewStarFlickers(t);
        drawNightviewMoonGlow(t);
        drawNightviewLanternGlow(t);
        drawNightviewFireflies(t);
        ctx.restore();
    }

    return Object.freeze({ init: initNightview, draw: drawNightview });
}
