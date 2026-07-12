import { compactInPlace } from '../canvas-runtime.js';

export function createStarfieldRenderer(runtime) {
    const {
        ctx,
        theme,
        isLiteMode,
        createBackdropTexture,
        randomBell,
        paintEllipticalGlow,
        drawStarPoint,
        drawBrightStar,
    } = runtime;
    let starfieldTexture;
    let starfieldStars = [];
    let starfieldSparkles = [];
    let nextStarfieldSparkleAt = 0;

    function getGalaxyBandY(x) {
        return (
            runtime.height * (0.84 - (0.58 * x) / runtime.width) +
            Math.sin(x / Math.max(160, runtime.width * 0.16)) * runtime.height * 0.035
        );
    }

    function initStarfield() {
        starfieldTexture = createBackdropTexture();
        const textureCtx = starfieldTexture.getContext('2d');
        if (!textureCtx) return;

        const sky = textureCtx.createRadialGradient(
            runtime.width * 0.55,
            runtime.height * 0.48,
            0,
            runtime.width * 0.55,
            runtime.height * 0.48,
            Math.max(runtime.width, runtime.height) * 0.78,
        );
        sky.addColorStop(0, '#081226');
        sky.addColorStop(0.48, '#030817');
        sky.addColorStop(1, '#010207');
        textureCtx.fillStyle = sky;
        textureCtx.fillRect(0, 0, runtime.width, runtime.height);

        textureCtx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 42; i++) {
            const x = (i / 41) * runtime.width + randomBell() * runtime.width * 0.018;
            const y = getGalaxyBandY(x) + randomBell() * runtime.height * 0.035;
            const width = runtime.width * (0.1 + Math.random() * 0.09);
            const height = runtime.height * (0.055 + Math.random() * 0.055);
            const hue = Math.random() < 0.72 ? 215 : 278;
            paintEllipticalGlow(textureCtx, x, y, width, height, -0.55, [
                [0, `hsla(${hue},75%,66%,${0.018 + Math.random() * 0.024})`],
                [0.48, `hsla(${hue + 24},70%,45%,0.012)`],
                [1, `hsla(${hue},70%,28%,0)`],
            ]);
        }

        const area = runtime.width * runtime.height;
        const densityDivisor = isLiteMode() ? 1500 : 720;
        const starCount = Math.max(
            isLiteMode() ? 420 : 850,
            Math.min(isLiteMode() ? 1000 : 2100, Math.floor(area / densityDivisor)),
        );
        for (let i = 0; i < starCount; i++) {
            const inBand = Math.random() < 0.58;
            const x = Math.random() * runtime.width;
            const y = inBand
                ? getGalaxyBandY(x) + randomBell() * runtime.height * 0.105
                : Math.random() * runtime.height;
            if (y < 0 || y > runtime.height) continue;
            const radiusRoll = Math.random();
            const star = {
                x,
                y,
                radius: radiusRoll > 0.985 ? 1.35 : 0.22 + Math.random() * 0.62,
                alpha: 0.2 + Math.random() * (inBand ? 0.66 : 0.48),
                hue: Math.random() < 0.82 ? 210 : Math.random() < 0.55 ? 42 : 4,
            };
            drawStarPoint(textureCtx, star);
        }

        textureCtx.globalCompositeOperation = 'source-over';
        for (let i = 0; i < 170; i++) {
            const x = Math.random() * runtime.width;
            const y = getGalaxyBandY(x) + randomBell() * runtime.height * 0.06;
            if (y < 0 || y > runtime.height) continue;
            textureCtx.fillStyle = `rgba(0,0,8,${0.035 + Math.random() * 0.08})`;
            textureCtx.beginPath();
            textureCtx.ellipse(
                x,
                y,
                8 + Math.random() * 34,
                2 + Math.random() * 9,
                -0.55 + randomBell() * 0.18,
                0,
                Math.PI * 2,
            );
            textureCtx.fill();
        }

        starfieldStars = Array.from({ length: isLiteMode() ? 10 : 22 }, () => {
            const x = Math.random() * runtime.width;
            const nearBand = Math.random() < 0.66;
            return {
                x,
                y: nearBand
                    ? Math.max(
                          12,
                          Math.min(
                              runtime.height - 12,
                              getGalaxyBandY(x) + randomBell() * runtime.height * 0.13,
                          ),
                      )
                    : 12 + Math.random() * Math.max(1, runtime.height - 24),
                radius: 0.8 + Math.random() * 0.75,
                alpha: 0.44 + Math.random() * 0.34,
                hue: Math.random() < 0.78 ? 210 : 42,
                phase: Math.random() * Math.PI * 2,
                speed: 0.45 + Math.random() * 0.85,
            };
        });
        starfieldSparkles = [];
        nextStarfieldSparkleAt = performance.now() / 1000 + 0.8 + Math.random() * 1.6;
    }

    function drawStarfield(t) {
        if (theme !== 'starfield') return;
        ctx.save();
        const driftX = Math.sin(t * 0.012) * 1.5;
        const driftY = Math.cos(t * 0.01) * 1.5;
        ctx.drawImage(
            starfieldTexture,
            driftX - 2,
            driftY - 2,
            runtime.width + 4,
            runtime.height + 4,
        );
        ctx.globalCompositeOperation = 'lighter';
        for (const star of starfieldStars) {
            const pulse = 0.72 + Math.sin(t * star.speed + star.phase) * 0.28;
            drawBrightStar(ctx, star, star.alpha * pulse);
        }
        drawStarfieldSparkles(t);
        ctx.restore();
    }

    function drawStarfieldSparkles(t) {
        if (isLiteMode()) return;
        if (t >= nextStarfieldSparkleAt && starfieldStars.length > 0) {
            const source = starfieldStars[Math.floor(Math.random() * starfieldStars.length)];
            starfieldSparkles.push({
                x: source.x,
                y: source.y,
                hue: Math.random() < 0.76 ? source.hue : 315,
                radius: source.radius * (1.25 + Math.random() * 0.75),
                start: t,
                duration: 0.48 + Math.random() * 0.34,
            });
            nextStarfieldSparkleAt = t + 0.9 + Math.random() * 2.1;
        }

        compactInPlace(starfieldSparkles, (sparkle) => {
            const progress = (t - sparkle.start) / sparkle.duration;
            if (progress < 0 || progress >= 1) return false;
            const strength = Math.sin(progress * Math.PI);
            const length = sparkle.radius * (4 + strength * 5);
            const alpha = strength * 0.72;

            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.strokeStyle = `hsla(${sparkle.hue},100%,92%,${alpha})`;
            ctx.fillStyle = `hsla(${sparkle.hue},100%,94%,${alpha})`;
            ctx.shadowColor = `hsla(${sparkle.hue},100%,72%,${alpha})`;
            ctx.shadowBlur = 8 + strength * 10;
            ctx.lineWidth = 0.65 + strength * 0.75;
            ctx.beginPath();
            ctx.moveTo(sparkle.x - length, sparkle.y);
            ctx.lineTo(sparkle.x + length, sparkle.y);
            ctx.moveTo(sparkle.x, sparkle.y - length * 0.72);
            ctx.lineTo(sparkle.x, sparkle.y + length * 0.72);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(sparkle.x, sparkle.y, sparkle.radius * (0.7 + strength), 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
            return true;
        });
    }

    return Object.freeze({ init: initStarfield, draw: drawStarfield });
}
