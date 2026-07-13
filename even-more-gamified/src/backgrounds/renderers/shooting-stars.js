import { compactInPlace } from '../canvas-runtime.js';

export function createShootingStarSystem({
    settings,
    isLiteMode,
    prefersReducedMotion,
    isAnswerResolved,
    hasShootingStars,
}) {
    let stars = [];
    let width = 0;
    let height = 0;

    function resize(nextWidth, nextHeight) {
        const normalizedWidth = Number(nextWidth);
        const normalizedHeight = Number(nextHeight);
        if (
            !Number.isFinite(normalizedWidth) ||
            normalizedWidth <= 0 ||
            !Number.isFinite(normalizedHeight) ||
            normalizedHeight <= 0
        ) {
            width = 0;
            height = 0;
            stars = [];
            return false;
        }

        if (width !== normalizedWidth || height !== normalizedHeight) {
            // Existing trails are expressed in the previous backing coordinate space.
            width = normalizedWidth;
            height = normalizedHeight;
            stars = [];
        }
        return true;
    }

    function trigger() {
        if (
            isLiteMode() ||
            !settings.visualsEnabled ||
            prefersReducedMotion() ||
            isAnswerResolved() ||
            !hasShootingStars() ||
            width <= 0 ||
            height <= 0
        ) {
            return false;
        }

        stars.push({
            x: width * (0.65 + Math.random() * 0.45),
            y: height * (0.06 + Math.random() * 0.38),
            vx: -9 - Math.random() * 7,
            vy: 4 + Math.random() * 4,
            life: 1,
            hue: Math.random() < 0.55 ? 190 : 310,
            length: 90 + Math.random() * 100,
        });
        return true;
    }

    function draw(ctx, frameScale) {
        if (width <= 0 || height <= 0) return;
        compactInPlace(stars, (star) => {
            if (star.life <= 0) return false;
            const tailX = star.x - (star.vx * star.length) / 12;
            const tailY = star.y - (star.vy * star.length) / 12;
            const outsideLeft = Math.max(star.x, tailX) < 0;
            const outsideRight = Math.min(star.x, tailX) > width;
            const outsideTop = Math.max(star.y, tailY) < 0;
            const outsideBottom = Math.min(star.y, tailY) > height;
            return !(
                (outsideLeft && star.vx <= 0) ||
                (outsideRight && star.vx >= 0) ||
                (outsideTop && star.vy <= 0) ||
                (outsideBottom && star.vy >= 0)
            );
        });
        for (const star of stars) {
            const tailX = star.x - (star.vx * star.length) / 12;
            const tailY = star.y - (star.vy * star.length) / 12;
            const gradient = ctx.createLinearGradient(star.x, star.y, tailX, tailY);
            gradient.addColorStop(0, `hsla(${star.hue},100%,82%,${star.life})`);
            gradient.addColorStop(0.16, `hsla(${star.hue},100%,66%,${star.life * 0.62})`);
            gradient.addColorStop(1, `hsla(${star.hue},100%,60%,0)`);
            ctx.save();
            ctx.strokeStyle = gradient;
            ctx.lineWidth = 2.4;
            ctx.beginPath();
            ctx.moveTo(star.x, star.y);
            ctx.lineTo(tailX, tailY);
            ctx.stroke();
            ctx.fillStyle = `hsla(${star.hue},100%,88%,${star.life})`;
            ctx.beginPath();
            ctx.arc(star.x, star.y, 2.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
            star.x += star.vx * frameScale;
            star.y += star.vy * frameScale;
            star.life -= 0.018 * frameScale;
        }
    }

    function clear() {
        stars = [];
    }

    return Object.freeze({ resize, trigger, draw, clear });
}
