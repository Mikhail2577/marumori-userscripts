export function createGridRenderer(runtime) {
    const { ctx, theme, isLiteMode, createBackdropTexture, drawStarPoint, drawBrightStar } =
        runtime;
    let gridTexture;
    let gridStars = [];
    let gridMountainLayers = [];
    let gridPalms = [];

    function makeGridMountainLayer(baseY, step, minHeight, maxHeight, color, fill) {
        const points = [];
        const count = Math.ceil(runtime.width / step) + 2;
        for (let index = -1; index <= count; index++) {
            const peakBoost = index % 3 === 0 ? 1.25 : 1;
            const height = (minHeight + Math.random() * (maxHeight - minHeight)) * peakBoost;
            points.push({ x: index * step, y: baseY - height });
        }
        return { baseY, points, color, fill };
    }

    function initGrid() {
        const horizon = runtime.height * 0.56;
        gridTexture = createBackdropTexture();
        const textureCtx = gridTexture.getContext('2d');
        if (!textureCtx) return;

        const sky = textureCtx.createLinearGradient(0, 0, 0, horizon);
        sky.addColorStop(0, '#030416');
        sky.addColorStop(0.48, '#12072d');
        sky.addColorStop(0.78, '#32104b');
        sky.addColorStop(1, '#651452');
        textureCtx.fillStyle = sky;
        textureCtx.fillRect(0, 0, runtime.width, horizon + 1);

        const horizonGlow = textureCtx.createRadialGradient(
            runtime.width * 0.5,
            horizon,
            0,
            runtime.width * 0.5,
            horizon,
            Math.max(runtime.width * 0.52, runtime.height * 0.34),
        );
        horizonGlow.addColorStop(0, 'rgba(255,50,180,0.24)');
        horizonGlow.addColorStop(0.38, 'rgba(115,30,180,0.10)');
        horizonGlow.addColorStop(1, 'rgba(10,4,32,0)');
        textureCtx.fillStyle = horizonGlow;
        textureCtx.fillRect(0, 0, runtime.width, horizon + 1);

        const starCount = isLiteMode()
            ? Math.max(55, Math.min(130, Math.floor((runtime.width * runtime.height) / 12000)))
            : Math.max(100, Math.min(280, Math.floor((runtime.width * runtime.height) / 6200)));
        for (let index = 0; index < starCount; index++) {
            const star = {
                x: Math.random() * runtime.width,
                y: Math.random() * horizon * 0.88,
                radius: 0.25 + Math.random() * 0.8,
                alpha: 0.18 + Math.random() * 0.52,
                hue: Math.random() < 0.72 ? 202 : 312,
            };
            drawStarPoint(textureCtx, star);
        }

        gridStars = Array.from({ length: isLiteMode() ? 12 : 26 }, () => ({
            x: runtime.width * (0.04 + Math.random() * 0.92),
            y: horizon * (0.08 + Math.random() * 0.72),
            radius: 0.65 + Math.random() * 0.85,
            alpha: 0.32 + Math.random() * 0.4,
            hue: Math.random() < 0.62 ? 196 : 315,
            phase: Math.random() * Math.PI * 2,
            speed: 0.35 + Math.random() * 0.8,
        }));

        gridMountainLayers = [
            makeGridMountainLayer(
                horizon + 8,
                Math.max(62, runtime.width / 22),
                runtime.height * 0.075,
                runtime.height * 0.18,
                'rgba(0,205,255,0.64)',
                'rgba(3,5,28,0.88)',
            ),
            makeGridMountainLayer(
                horizon + 24,
                Math.max(44, runtime.width / 30),
                runtime.height * 0.045,
                runtime.height * 0.13,
                'rgba(255,0,210,0.62)',
                'rgba(9,3,30,0.94)',
            ),
        ];

        const palmSize = Math.min(runtime.width, runtime.height);
        gridPalms = [
            { x: runtime.width * 0.055, size: palmSize * 0.19, lean: -0.18 },
            { x: runtime.width * 0.15, size: palmSize * 0.13, lean: 0.12 },
            { x: runtime.width * 0.85, size: palmSize * 0.13, lean: -0.1 },
            { x: runtime.width * 0.945, size: palmSize * 0.2, lean: 0.17 },
        ];
    }

    function drawGridSun(t, horizon) {
        const sunX = runtime.width * 0.5 + Math.sin(t * 0.16) * 4;
        const sunR = Math.min(runtime.width, runtime.height) * 0.145;
        const sunY = horizon - sunR * 0.34;
        const glow = ctx.createRadialGradient(sunX, sunY, sunR * 0.15, sunX, sunY, sunR * 1.7);
        glow.addColorStop(0, 'rgba(255,210,105,0.32)');
        glow.addColorStop(0.42, 'rgba(255,65,165,0.18)');
        glow.addColorStop(1, 'rgba(255,0,185,0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(sunX, sunY, sunR * 1.7, 0, Math.PI * 2);
        ctx.fill();

        ctx.save();
        ctx.beginPath();
        ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
        ctx.clip();

        const sun = ctx.createLinearGradient(0, sunY - sunR, 0, sunY + sunR);
        sun.addColorStop(0, '#ffd47a');
        sun.addColorStop(0.46, '#ff6e8f');
        sun.addColorStop(1, '#ff149f');
        ctx.fillStyle = sun;
        ctx.fillRect(sunX - sunR, sunY - sunR, sunR * 2, sunR * 2);

        ctx.fillStyle = 'rgba(16,3,38,0.74)';
        for (let stripe = 0; stripe < 10; stripe++) {
            const y = sunY - sunR * 0.34 + stripe * sunR * 0.145;
            ctx.fillRect(sunX - sunR, y, sunR * 2, 2.5 + stripe * 0.85);
        }
        ctx.restore();
    }

    function drawGridMountain(layer) {
        ctx.save();
        ctx.fillStyle = layer.fill;
        ctx.strokeStyle = layer.color;
        ctx.lineJoin = 'round';
        ctx.shadowColor = layer.color;
        ctx.shadowBlur = 9;
        ctx.lineWidth = 1.35;

        ctx.beginPath();
        ctx.moveTo(layer.points[0].x, layer.baseY);
        layer.points.forEach((point) => ctx.lineTo(point.x, point.y));
        ctx.lineTo(layer.points[layer.points.length - 1].x, layer.baseY);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.shadowBlur = 0;
        ctx.lineWidth = 0.65;
        ctx.globalAlpha = 0.58;
        for (const point of layer.points) {
            ctx.beginPath();
            ctx.moveTo(point.x, point.y);
            ctx.lineTo(point.x, layer.baseY);
            ctx.stroke();
        }
        for (const depth of [0.28, 0.52, 0.74]) {
            ctx.beginPath();
            layer.points.forEach((point, index) => {
                const y = point.y + (layer.baseY - point.y) * depth;
                if (index === 0) ctx.moveTo(point.x, y);
                else ctx.lineTo(point.x, y);
            });
            ctx.stroke();
        }
        ctx.restore();
    }

    function drawGridPalm(palm, horizon) {
        const baseY = horizon + 19;
        const crownX = palm.x + palm.size * palm.lean;
        const crownY = baseY - palm.size;

        ctx.save();
        ctx.strokeStyle = 'rgba(255,0,205,0.24)';
        ctx.shadowColor = '#ff00c8';
        ctx.shadowBlur = 8;
        ctx.lineCap = 'round';
        ctx.lineWidth = palm.size * 0.09;
        ctx.beginPath();
        ctx.moveTo(palm.x, baseY);
        ctx.quadraticCurveTo(
            palm.x + palm.size * palm.lean * 0.34,
            baseY - palm.size * 0.52,
            crownX,
            crownY,
        );
        ctx.stroke();

        ctx.strokeStyle = 'rgba(2,2,16,0.98)';
        ctx.shadowBlur = 0;
        ctx.lineWidth = palm.size * 0.065;
        ctx.stroke();

        const frondLength = palm.size * 0.48;
        for (let index = 0; index < 9; index++) {
            const angle = Math.PI * (1.03 + index * 0.115);
            const endX = crownX + Math.cos(angle) * frondLength;
            const endY = crownY + Math.sin(angle) * frondLength * 0.72;
            const bend = index < 4 ? -1 : 1;
            ctx.lineWidth = palm.size * 0.035;
            ctx.beginPath();
            ctx.moveTo(crownX, crownY);
            ctx.quadraticCurveTo(
                crownX + Math.cos(angle) * frondLength * 0.58,
                crownY + Math.sin(angle) * frondLength * 0.36 - bend * palm.size * 0.05,
                endX,
                endY + palm.size * 0.06,
            );
            ctx.stroke();
        }
        ctx.restore();
    }

    function drawGrid(t) {
        if (theme !== 'grid') return;
        const horizon = runtime.height * 0.56;
        ctx.save();
        ctx.drawImage(gridTexture, 0, 0, runtime.width, runtime.height);

        ctx.globalCompositeOperation = 'lighter';
        for (const star of gridStars) {
            const pulse = 0.62 + Math.sin(t * star.speed + star.phase) * 0.38;
            drawBrightStar(ctx, star, star.alpha * pulse);
        }
        ctx.globalCompositeOperation = 'source-over';

        drawGridSun(t, horizon);
        gridMountainLayers.forEach(drawGridMountain);
        gridPalms.forEach((palm) => drawGridPalm(palm, horizon));

        const floor = ctx.createLinearGradient(0, horizon, 0, runtime.height);
        floor.addColorStop(0, 'rgba(24,2,46,0.97)');
        floor.addColorStop(0.42, 'rgba(7,3,26,0.98)');
        floor.addColorStop(1, 'rgba(2,3,16,1)');
        ctx.fillStyle = floor;
        ctx.fillRect(0, horizon, runtime.width, runtime.height - horizon);

        const horizonBloom = ctx.createLinearGradient(0, horizon - 10, 0, horizon + 42);
        horizonBloom.addColorStop(0, 'rgba(255,0,200,0)');
        horizonBloom.addColorStop(0.42, 'rgba(255,35,190,0.34)');
        horizonBloom.addColorStop(1, 'rgba(80,0,150,0)');
        ctx.fillStyle = horizonBloom;
        ctx.fillRect(0, horizon - 10, runtime.width, 52);

        ctx.save();
        ctx.strokeStyle = 'rgba(255,0,215,0.5)';
        ctx.shadowColor = '#ff00d4';
        ctx.shadowBlur = 7;
        ctx.lineWidth = 1;
        const travel = (t * 1.4) % 1;
        for (let index = 0; index < 25; index++) {
            const progress = (index + travel) / 25;
            const y = horizon + Math.pow(progress, 2.2) * (runtime.height - horizon);
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(runtime.width, y);
            ctx.stroke();
        }

        const vanishingX = runtime.width / 2;
        for (let index = -16; index <= 16; index++) {
            const x = runtime.width / 2 + index * runtime.width * 0.078;
            ctx.strokeStyle = index % 2 === 0 ? 'rgba(0,220,255,0.40)' : 'rgba(255,0,215,0.32)';
            ctx.shadowColor = index % 2 === 0 ? '#00d8ff' : '#ff00d4';
            ctx.beginPath();
            ctx.moveTo(vanishingX, horizon);
            ctx.lineTo(x, runtime.height);
            ctx.stroke();
        }
        ctx.restore();

        ctx.save();
        ctx.strokeStyle = 'rgba(255,145,52,0.84)';
        ctx.shadowColor = '#ff6b1a';
        ctx.shadowBlur = 10;
        ctx.lineWidth = 2;
        for (const side of [-1, 1]) {
            ctx.beginPath();
            ctx.moveTo(vanishingX + side * 4, horizon);
            ctx.lineTo(vanishingX + side * runtime.width * 0.105, runtime.height);
            ctx.stroke();
        }
        ctx.restore();
        ctx.restore();
    }

    return Object.freeze({ init: initGrid, draw: drawGrid });
}
