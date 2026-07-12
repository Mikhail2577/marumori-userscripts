import { compactInPlace } from '../canvas-runtime.js';

export function createShootingStarSystem({
    window,
    settings,
    isLiteMode,
    prefersReducedMotion,
    isAnswerResolved,
    hasShootingStars,
}) {
    let stars = [];

    function trigger() {
        if (
            isLiteMode() ||
            !settings.visualsEnabled ||
            prefersReducedMotion() ||
            isAnswerResolved() ||
            !hasShootingStars()
        ) {
            return false;
        }

        stars.push({
            x: window.innerWidth * (0.65 + Math.random() * 0.45),
            y: window.innerHeight * (0.06 + Math.random() * 0.38),
            vx: -9 - Math.random() * 7,
            vy: 4 + Math.random() * 4,
            life: 1,
            hue: Math.random() < 0.55 ? 190 : 310,
            length: 90 + Math.random() * 100,
        });
        return true;
    }

    function draw(ctx, frameScale) {
        compactInPlace(stars, (star) => star.life > 0);
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

    return Object.freeze({ trigger, draw, clear });
}
