import { SHRINE_IMAGE_URL } from '../../config/themes.js';
import {
    createManagedBackgroundImage,
    drawDriftingCoverImage,
} from './image-background-helpers.js';

const SHRINE_LANTERN_POINTS = Object.freeze([
    Object.freeze({ x: 0.68, y: 0.44 }),
    Object.freeze({ x: 0.812, y: 0.468 }),
    Object.freeze({ x: 0.835, y: 0.318 }),
]);

export function createShrineRenderer(runtime) {
    const { ctx, theme, document, isLiteMode, prefersReducedMotion, requestRender } = runtime;
    let shrinePetals = [];
    const shrineBackground = createManagedBackgroundImage({
        document,
        resourceName: 'mmShrineGarden',
        directUrl: SHRINE_IMAGE_URL,
        shouldRequestRender: () => prefersReducedMotion() || isLiteMode(),
        requestRender,
        onFailure: () => {
            console.warn('[MMGamify] Shrine background resource failed to load.');
        },
    });

    function resetShrinePetal(petal = {}, randomY = false) {
        petal.x = Math.random() * runtime.width;
        petal.y = randomY
            ? Math.random() * runtime.height
            : -12 - Math.random() * runtime.height * 0.18;
        petal.size = 1.8 + Math.random() * 2.8;
        petal.speed = 0.16 + Math.random() * 0.25;
        petal.drift = 0.14 + Math.random() * 0.24;
        petal.alpha = 0.16 + Math.random() * 0.22;
        petal.phase = Math.random() * Math.PI * 2;
        petal.spin = 0.35 + Math.random() * 0.75;
        petal.hue = 36 + Math.random() * 16;
        return petal;
    }

    function initShrine() {
        const petalCount = isLiteMode()
            ? 0
            : Math.max(8, Math.min(18, Math.floor(runtime.width / 130)));
        shrinePetals = Array.from({ length: petalCount }, () => resetShrinePetal({}, true));
        shrineBackground.load();
    }

    function drawShrineImage(t) {
        if (!shrineBackground.ready) {
            const fallback = ctx.createLinearGradient(0, 0, 0, runtime.height);
            fallback.addColorStop(0, '#17212a');
            fallback.addColorStop(1, '#05090a');
            ctx.fillStyle = fallback;
            ctx.fillRect(0, 0, runtime.width, runtime.height);
            return;
        }

        drawDriftingCoverImage({
            ctx,
            image: shrineBackground.image,
            width: runtime.width,
            height: runtime.height,
            time: t,
            animated: !isLiteMode() && !prefersReducedMotion(),
            baseScale: 1.012,
            scalePulseRate: 0.08,
            driftXRate: 0.035,
            driftXDistance: 2.5,
            driftYRate: 0.028,
            driftYDistance: 1.5,
        });
    }

    function drawShrineLanternGlow(t) {
        if (runtime.width / runtime.height < 1.15) return;
        const pulse = prefersReducedMotion() ? 1 : 0.88 + Math.sin(t * 1.15) * 0.12;
        const radius = Math.min(runtime.width, runtime.height) * 0.075;
        for (const point of SHRINE_LANTERN_POINTS) {
            const x = runtime.width * point.x;
            const y = runtime.height * point.y;
            const glow = ctx.createRadialGradient(x, y, 0, x, y, radius);
            glow.addColorStop(0, `rgba(255,178,82,${0.085 * pulse})`);
            glow.addColorStop(0.28, `rgba(255,126,46,${0.035 * pulse})`);
            glow.addColorStop(1, 'rgba(255,100,35,0)');
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function drawShrinePetals(t) {
        if (isLiteMode() || prefersReducedMotion()) return;
        for (const petal of shrinePetals) {
            petal.y += petal.speed * runtime.frameScale;
            petal.x += Math.sin(t * petal.spin + petal.phase) * petal.drift * runtime.frameScale;
            if (petal.y > runtime.height + 12 || petal.x < -12 || petal.x > runtime.width + 12) {
                resetShrinePetal(petal);
            }

            ctx.save();
            ctx.translate(petal.x, petal.y);
            ctx.rotate(Math.sin(t * petal.spin + petal.phase) * 1.4);
            ctx.fillStyle = `hsla(${petal.hue},90%,58%,${petal.alpha})`;
            ctx.beginPath();
            ctx.ellipse(0, 0, petal.size, petal.size * 0.42, 0.45, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    function drawShrine(t) {
        if (theme !== 'shrine') return;
        ctx.save();
        drawShrineImage(t);
        ctx.globalCompositeOperation = 'lighter';
        drawShrineLanternGlow(t);
        drawShrinePetals(t);
        ctx.restore();
    }

    return Object.freeze({ init: initShrine, draw: drawShrine });
}
