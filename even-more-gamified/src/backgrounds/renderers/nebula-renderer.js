export function createNebulaRenderer(runtime) {
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
    let nebulaTexture;
    let nebulaStars = [];
    let nebulaWisps = [];

    function getNebulaSpine(p) {
        return {
            x: runtime.width * (-0.08 + p * 1.16),
            y:
                runtime.height * (0.74 - p * 0.48) +
                Math.sin(p * Math.PI * 3.2) * runtime.height * 0.065,
        };
    }

    function getNebulaHue(p) {
        if (p < 0.28) return 18 + p * 80;
        if (p < 0.58) return 326 - (p - 0.28) * 110;
        return 214 - (p - 0.58) * 52;
    }

    function initNebula() {
        nebulaTexture = createBackdropTexture();
        const textureCtx = nebulaTexture.getContext('2d');
        if (!textureCtx) return;

        const sky = textureCtx.createRadialGradient(
            runtime.width * 0.56,
            runtime.height * 0.42,
            0,
            runtime.width * 0.56,
            runtime.height * 0.42,
            Math.max(runtime.width, runtime.height) * 0.88,
        );
        sky.addColorStop(0, '#100b1f');
        sky.addColorStop(0.48, '#050612');
        sky.addColorStop(1, '#010206');
        textureCtx.fillStyle = sky;
        textureCtx.fillRect(0, 0, runtime.width, runtime.height);

        textureCtx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < (isLiteMode() ? 110 : 260); i++) {
            const p = Math.random();
            const spine = getNebulaSpine(p);
            const spread = runtime.height * (0.035 + 0.16 * Math.sin(p * Math.PI));
            const x = spine.x + randomBell() * spread * 0.72;
            const y = spine.y + randomBell() * spread;
            const radius =
                Math.min(runtime.width, runtime.height) * (0.018 + Math.random() * 0.075);
            const hue = getNebulaHue(p) + randomBell() * 14;
            const alpha = 0.016 + Math.random() * 0.046;
            paintEllipticalGlow(
                textureCtx,
                x,
                y,
                radius * (1.2 + Math.random() * 1.8),
                radius * (0.42 + Math.random() * 0.72),
                -0.46 + randomBell() * 0.48,
                [
                    [0, `hsla(${hue},96%,68%,${alpha})`],
                    [0.34, `hsla(${hue + 18},94%,52%,${alpha * 0.72})`],
                    [0.72, `hsla(${hue - 24},90%,32%,${alpha * 0.22})`],
                    [1, `hsla(${hue},88%,20%,0)`],
                ],
            );
        }

        textureCtx.filter = 'blur(1.4px)';
        textureCtx.lineCap = 'round';
        for (let filament = 0; filament < (isLiteMode() ? 14 : 34); filament++) {
            const offset = randomBell() * runtime.height * 0.08;
            const hue = getNebulaHue(Math.random());
            textureCtx.strokeStyle = `hsla(${hue},96%,72%,${0.025 + Math.random() * 0.05})`;
            textureCtx.lineWidth = 0.7 + Math.random() * 2.4;
            textureCtx.beginPath();
            for (let step = 0; step <= 28; step++) {
                const p = step / 28;
                const spine = getNebulaSpine(p);
                const taper = Math.sin(p * Math.PI);
                const ripple =
                    Math.sin(p * (10 + (filament % 6)) + filament) * runtime.height * 0.018;
                const x = spine.x + ripple * 0.75 + offset * taper * 0.35;
                const y = spine.y + ripple + offset * taper;
                if (step === 0) textureCtx.moveTo(x, y);
                else textureCtx.lineTo(x, y);
            }
            textureCtx.stroke();
        }
        textureCtx.filter = 'none';

        textureCtx.globalCompositeOperation = 'source-over';
        textureCtx.filter = 'blur(5px)';
        for (let i = 0; i < (isLiteMode() ? 42 : 105); i++) {
            const p = Math.random();
            const spine = getNebulaSpine(p);
            const spread = runtime.height * (0.025 + Math.sin(p * Math.PI) * 0.09);
            const x = spine.x + randomBell() * spread;
            const y = spine.y + randomBell() * spread * 0.65;
            const radius =
                Math.min(runtime.width, runtime.height) * (0.008 + Math.random() * 0.045);
            textureCtx.fillStyle = `rgba(0,1,8,${0.07 + Math.random() * 0.18})`;
            textureCtx.beginPath();
            textureCtx.ellipse(
                x,
                y,
                radius * (1.4 + Math.random() * 2.4),
                radius,
                -0.48 + randomBell() * 0.38,
                0,
                Math.PI * 2,
            );
            textureCtx.fill();
        }
        textureCtx.filter = 'none';

        textureCtx.globalCompositeOperation = 'lighter';
        const clusterCenters = [
            { x: 0.24, y: 0.62, hue: 24 },
            { x: 0.51, y: 0.45, hue: 318 },
            { x: 0.74, y: 0.32, hue: 202 },
        ];
        for (const cluster of clusterCenters) {
            paintEllipticalGlow(
                textureCtx,
                cluster.x * runtime.width,
                cluster.y * runtime.height,
                Math.min(runtime.width, runtime.height) * 0.09,
                Math.min(runtime.width, runtime.height) * 0.065,
                -0.35,
                [
                    [0, `hsla(${cluster.hue},100%,90%,0.16)`],
                    [0.18, `hsla(${cluster.hue},100%,68%,0.10)`],
                    [1, `hsla(${cluster.hue},95%,45%,0)`],
                ],
            );
        }

        const baseStarCount = isLiteMode()
            ? Math.max(200, Math.min(520, Math.floor((runtime.width * runtime.height) / 2800)))
            : Math.max(420, Math.min(1100, Math.floor((runtime.width * runtime.height) / 1300)));
        for (let i = 0; i < baseStarCount; i++) {
            const star = {
                x: Math.random() * runtime.width,
                y: Math.random() * runtime.height,
                radius: 0.18 + Math.random() * 0.62,
                alpha: 0.12 + Math.random() * 0.46,
                hue: Math.random() < 0.86 ? 210 : 40,
            };
            drawStarPoint(textureCtx, star);
        }

        nebulaStars = Array.from({ length: isLiteMode() ? 14 : 30 }, (_, index) => {
            const cluster = clusterCenters[index % clusterCenters.length];
            return {
                x:
                    cluster.x * runtime.width +
                    randomBell() * Math.min(runtime.width, runtime.height) * 0.1,
                y:
                    cluster.y * runtime.height +
                    randomBell() * Math.min(runtime.width, runtime.height) * 0.08,
                radius: 0.65 + Math.random() * 0.95,
                alpha: 0.42 + Math.random() * 0.38,
                hue: index % 5 === 0 ? cluster.hue : 210,
                phase: Math.random() * Math.PI * 2,
                speed: 0.35 + Math.random() * 0.8,
            };
        });

        const wispCount = isLiteMode() ? 5 : 11;
        nebulaWisps = Array.from({ length: wispCount }, (_, index) => {
            const p = (index + 0.5 + Math.random() * 0.45) / wispCount;
            const spine = getNebulaSpine(p);
            const radius =
                Math.min(runtime.width, runtime.height) * (0.045 + Math.random() * 0.055);
            return {
                x: spine.x + randomBell() * runtime.height * 0.035,
                y: spine.y + randomBell() * runtime.height * 0.045,
                radiusX: radius * (1.35 + Math.random() * 1.2),
                radiusY: radius * (0.42 + Math.random() * 0.38),
                rotation: -0.48 + randomBell() * 0.28,
                hue: getNebulaHue(p) + randomBell() * 12,
                alpha: 0.04 + Math.random() * 0.05,
                phase: Math.random() * Math.PI * 2,
                speed: 0.18 + Math.random() * 0.16,
                driftX: 10 + Math.random() * 14,
                driftY: 7 + Math.random() * 10,
            };
        });
    }

    function drawNebula(t) {
        if (theme !== 'nebula') return;
        ctx.save();
        const driftX = Math.sin(t * 0.12) * 8;
        const driftY = Math.cos(t * 0.09) * 6;
        const breathe = 1 + Math.sin(t * 0.16) * 0.008;
        ctx.save();
        ctx.translate(runtime.width / 2, runtime.height / 2);
        ctx.scale(breathe, breathe);
        ctx.drawImage(
            nebulaTexture,
            -runtime.width / 2 + driftX - 3,
            -runtime.height / 2 + driftY - 3,
            runtime.width + 6,
            runtime.height + 6,
        );
        ctx.restore();

        ctx.globalCompositeOperation = 'lighter';
        for (const wisp of nebulaWisps) {
            const pulse = 0.55 + Math.sin(t * wisp.speed + wisp.phase) * 0.45;
            const x = wisp.x + Math.sin(t * wisp.speed * 0.72 + wisp.phase) * wisp.driftX;
            const y = wisp.y + Math.cos(t * wisp.speed * 0.58 + wisp.phase) * wisp.driftY;
            paintEllipticalGlow(
                ctx,
                x,
                y,
                wisp.radiusX * (0.94 + pulse * 0.1),
                wisp.radiusY * (0.94 + pulse * 0.08),
                wisp.rotation + Math.sin(t * wisp.speed * 0.4 + wisp.phase) * 0.04,
                [
                    [0, `hsla(${wisp.hue},96%,68%,${wisp.alpha * pulse})`],
                    [0.46, `hsla(${wisp.hue + 18},92%,48%,${wisp.alpha * pulse * 0.55})`],
                    [1, `hsla(${wisp.hue},90%,28%,0)`],
                ],
            );
        }
        for (const star of nebulaStars) {
            const pulse = 0.68 + Math.sin(t * star.speed + star.phase) * 0.32;
            drawBrightStar(ctx, star, star.alpha * pulse);
        }
        ctx.restore();
    }

    return Object.freeze({ init: initNebula, draw: drawNebula });
}
