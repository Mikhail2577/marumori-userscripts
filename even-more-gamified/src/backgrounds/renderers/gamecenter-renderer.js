export function createGameCenterRenderer(runtime) {
    const { ctx, theme, createBackdropTexture } = runtime;
    let gameCenterTexture;
    let gameCenterCabinets = [];
    let gameCenterLights = [];

    function drawGameCenterPanel(target, x, y, width, height, hue, label, sublabel = '') {
        target.save();
        target.fillStyle = 'rgba(5,4,18,0.92)';
        target.strokeStyle = `hsla(${hue},100%,58%,0.52)`;
        target.shadowColor = `hsla(${hue},100%,56%,0.4)`;
        target.shadowBlur = Math.max(3, height * 0.09);
        target.lineWidth = Math.max(1, height * 0.035);
        target.fillRect(x, y, width, height);
        target.strokeRect(x, y, width, height);
        target.shadowBlur = Math.max(2, height * 0.05);
        target.fillStyle = `hsla(${hue},100%,70%,0.72)`;
        const labelSize = Math.max(
            6,
            Math.min(height * 0.34, width / Math.max(4, label.length * 0.72)),
        );
        target.font = `700 ${labelSize}px sans-serif`;
        target.textAlign = 'center';
        target.textBaseline = 'middle';
        target.fillText(label, x + width / 2, y + height * (sublabel ? 0.42 : 0.52));
        if (sublabel) {
            target.shadowBlur = 0;
            target.fillStyle = 'rgba(220,245,255,0.52)';
            const sublabelSize = Math.max(
                5,
                Math.min(height * 0.16, width / Math.max(5, sublabel.length * 0.68)),
            );
            target.font = `600 ${sublabelSize}px sans-serif`;
            target.fillText(sublabel, x + width / 2, y + height * 0.76);
        }
        target.restore();
    }

    function initGameCenter() {
        gameCenterTexture = createBackdropTexture();
        const textureCtx = gameCenterTexture.getContext('2d');
        if (!textureCtx) return;

        const horizon = runtime.height * 0.53;
        const vanishingX = runtime.width / 2;
        const vanishingY = runtime.height * 0.4;
        const room = textureCtx.createRadialGradient(
            vanishingX,
            vanishingY,
            0,
            vanishingX,
            vanishingY,
            Math.max(runtime.width, runtime.height) * 0.78,
        );
        room.addColorStop(0, '#141025');
        room.addColorStop(0.46, '#080818');
        room.addColorStop(1, '#02040a');
        textureCtx.fillStyle = room;
        textureCtx.fillRect(0, 0, runtime.width, runtime.height);

        const leftWall = textureCtx.createLinearGradient(0, 0, runtime.width * 0.34, 0);
        leftWall.addColorStop(0, 'rgba(7,12,25,0.98)');
        leftWall.addColorStop(1, 'rgba(25,8,38,0.74)');
        textureCtx.fillStyle = leftWall;
        textureCtx.beginPath();
        textureCtx.moveTo(0, 0);
        textureCtx.lineTo(runtime.width * 0.3, runtime.height * 0.18);
        textureCtx.lineTo(runtime.width * 0.34, horizon);
        textureCtx.lineTo(0, runtime.height * 0.72);
        textureCtx.closePath();
        textureCtx.fill();

        const rightWall = textureCtx.createLinearGradient(
            runtime.width,
            0,
            runtime.width * 0.66,
            0,
        );
        rightWall.addColorStop(0, 'rgba(7,12,25,0.98)');
        rightWall.addColorStop(1, 'rgba(28,7,32,0.74)');
        textureCtx.fillStyle = rightWall;
        textureCtx.beginPath();
        textureCtx.moveTo(runtime.width, 0);
        textureCtx.lineTo(runtime.width * 0.7, runtime.height * 0.18);
        textureCtx.lineTo(runtime.width * 0.66, horizon);
        textureCtx.lineTo(runtime.width, runtime.height * 0.72);
        textureCtx.closePath();
        textureCtx.fill();

        textureCtx.fillStyle = 'rgba(5,7,16,0.96)';
        textureCtx.fillRect(
            runtime.width * 0.3,
            runtime.height * 0.18,
            runtime.width * 0.4,
            horizon - runtime.height * 0.18,
        );
        textureCtx.strokeStyle = 'rgba(0,205,255,0.07)';
        textureCtx.lineWidth = 1;
        for (let panel = 0; panel <= 8; panel++) {
            const x = runtime.width * 0.3 + panel * runtime.width * 0.05;
            textureCtx.beginPath();
            textureCtx.moveTo(x, runtime.height * 0.18);
            textureCtx.lineTo(x, horizon);
            textureCtx.stroke();
        }

        textureCtx.strokeStyle = 'rgba(70,150,220,0.06)';
        for (let beam = 0; beam <= 12; beam++) {
            textureCtx.beginPath();
            textureCtx.moveTo(vanishingX, vanishingY);
            textureCtx.lineTo((beam * runtime.width) / 12, 0);
            textureCtx.stroke();
        }
        for (let row = 0; row < 5; row++) {
            const y = runtime.height * 0.04 + row * runtime.height * 0.055;
            const spread = runtime.width * (0.5 - row * 0.065);
            textureCtx.beginPath();
            textureCtx.moveTo(vanishingX - spread, y);
            textureCtx.lineTo(vanishingX + spread, y);
            textureCtx.stroke();
        }

        const floor = textureCtx.createLinearGradient(0, horizon, 0, runtime.height);
        floor.addColorStop(0, '#0c071c');
        floor.addColorStop(0.52, '#080919');
        floor.addColorStop(1, '#03050d');
        textureCtx.fillStyle = floor;
        textureCtx.fillRect(0, horizon, runtime.width, runtime.height - horizon);

        const floorRows = 13;
        const floorColumns = 20;
        for (let row = 0; row < floorRows; row++) {
            const p1 = row / floorRows;
            const p2 = (row + 1) / floorRows;
            const y1 = horizon + Math.pow(p1, 1.82) * (runtime.height - horizon);
            const y2 = horizon + Math.pow(p2, 1.82) * (runtime.height - horizon);
            for (let column = -floorColumns / 2; column < floorColumns / 2; column++) {
                const x11 = vanishingX + ((column * runtime.width) / floorColumns) * p1;
                const x12 = vanishingX + (((column + 1) * runtime.width) / floorColumns) * p1;
                const x21 = vanishingX + ((column * runtime.width) / floorColumns) * p2;
                const x22 = vanishingX + (((column + 1) * runtime.width) / floorColumns) * p2;
                textureCtx.fillStyle =
                    (row + column) % 2 === 0 ? 'rgba(42,17,62,0.12)' : 'rgba(3,38,53,0.08)';
                textureCtx.beginPath();
                textureCtx.moveTo(x11, y1);
                textureCtx.lineTo(x12, y1);
                textureCtx.lineTo(x22, y2);
                textureCtx.lineTo(x21, y2);
                textureCtx.closePath();
                textureCtx.fill();
            }
        }

        textureCtx.strokeStyle = 'rgba(0,205,255,0.055)';
        for (let column = -10; column <= 10; column++) {
            textureCtx.beginPath();
            textureCtx.moveTo(vanishingX, horizon);
            textureCtx.lineTo(vanishingX + (column * runtime.width) / 20, runtime.height);
            textureCtx.stroke();
        }
        for (let row = 1; row <= floorRows; row++) {
            const p = row / floorRows;
            const y = horizon + Math.pow(p, 1.82) * (runtime.height - horizon);
            textureCtx.beginPath();
            textureCtx.moveTo(0, y);
            textureCtx.lineTo(runtime.width, y);
            textureCtx.stroke();
        }

        drawGameCenterPanel(
            textureCtx,
            runtime.width * 0.055,
            runtime.height * 0.18,
            runtime.width * 0.13,
            runtime.height * 0.05,
            190,
            '音ゲー',
            'RHYTHM',
        );
        drawGameCenterPanel(
            textureCtx,
            runtime.width * 0.815,
            runtime.height * 0.18,
            runtime.width * 0.13,
            runtime.height * 0.05,
            320,
            'UFO キャッチャー',
            'PRIZE',
        );

        const cabinetLabels = ['音', 'UFO', '対戦', 'RACE', '太鼓', 'GAME', '景品'];
        const cabinetCount = 5;
        gameCenterCabinets = [];
        for (let index = 0; index < cabinetCount; index++) {
            const p = (index + 1) / cabinetCount;
            const depth = Math.pow(p, 1.28);
            const width = Math.min(
                runtime.width * 0.085,
                runtime.height * 0.12,
                30 + depth * runtime.width * 0.045,
            );
            const height = width * 1.55;
            const baseY = horizon + depth * (runtime.height - horizon) * 0.94;
            const offset = runtime.width * (0.19 + depth * 0.285);
            for (const side of [-1, 1]) {
                gameCenterCabinets.push({
                    x: vanishingX + side * offset,
                    baseY,
                    width,
                    height,
                    side,
                    hue: [190, 315, 28, 48][(index + (side > 0 ? 1 : 0)) % 4],
                    phase: Math.random() * Math.PI * 2,
                    label: cabinetLabels[(index + (side > 0 ? 2 : 0)) % cabinetLabels.length],
                });
            }
        }

        gameCenterLights = Array.from({ length: 9 }, (_, index) => ({
            x: runtime.width * (0.1 + index * 0.1),
            y: runtime.height * (0.075 + Math.abs(index - 4) * 0.012),
            radius: Math.max(3, Math.min(runtime.width, runtime.height) * 0.006),
            hue: [28, 190, 315][index % 3],
            phase: Math.random() * Math.PI * 2,
        }));
    }

    function drawGameCenterCabinet(machine, t) {
        const flicker =
            0.78 +
            Math.sin(t * 2.4 + machine.phase) * 0.16 +
            Math.sin(t * 6.7 + machine.phase) * 0.06;
        const { width, height } = machine;

        ctx.save();
        ctx.translate(machine.x, machine.baseY);
        ctx.fillStyle = 'rgba(3,5,13,0.97)';
        ctx.strokeStyle = `hsla(${machine.hue},100%,58%,0.52)`;
        ctx.shadowColor = `hsla(${machine.hue},100%,54%,0.38)`;
        ctx.shadowBlur = Math.max(2, width * 0.04);
        ctx.lineWidth = Math.max(1, width * 0.018);

        ctx.beginPath();
        ctx.moveTo(-width * 0.43, -height);
        ctx.lineTo(width * 0.43, -height);
        ctx.lineTo(width * 0.5, 0);
        ctx.lineTo(-width * 0.5, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = `hsla(${machine.hue},85%,22%,0.95)`;
        ctx.fillRect(-width * 0.4, -height * 0.94, width * 0.8, height * 0.15);
        ctx.fillStyle = `hsla(${machine.hue},100%,76%,${0.72 * flicker})`;
        ctx.font = `700 ${Math.max(6, width * 0.15)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(machine.label, 0, -height * 0.865);

        const screenX = -width * 0.32;
        const screenY = -height * 0.72;
        const screenW = width * 0.64;
        const screenH = height * 0.3;
        const screen = ctx.createLinearGradient(
            screenX,
            screenY,
            screenX + screenW,
            screenY + screenH,
        );
        screen.addColorStop(0, `hsla(${machine.hue},100%,62%,${0.16 * flicker})`);
        screen.addColorStop(0.5, `hsla(${machine.hue + 75},100%,55%,${0.42 * flicker})`);
        screen.addColorStop(1, 'rgba(2,8,18,0.95)');
        ctx.fillStyle = screen;
        ctx.fillRect(screenX, screenY, screenW, screenH);
        ctx.strokeRect(screenX, screenY, screenW, screenH);

        ctx.save();
        ctx.beginPath();
        ctx.rect(screenX, screenY, screenW, screenH);
        ctx.clip();
        ctx.strokeStyle = `hsla(${machine.hue + 55},100%,78%,${0.24 * flicker})`;
        ctx.lineWidth = Math.max(0.6, width * 0.008);
        for (let stripe = -2; stripe < 5; stripe++) {
            const offset = ((t * 18 + stripe * screenW * 0.28) % (screenW * 1.4)) - screenW * 0.2;
            ctx.beginPath();
            ctx.moveTo(screenX + offset, screenY + screenH);
            ctx.lineTo(screenX + offset + screenW * 0.4, screenY);
            ctx.stroke();
        }
        ctx.restore();

        ctx.fillStyle = 'rgba(20,18,32,0.98)';
        ctx.beginPath();
        ctx.moveTo(-width * 0.36, -height * 0.36);
        ctx.lineTo(width * 0.36, -height * 0.36);
        ctx.lineTo(width * 0.46, -height * 0.24);
        ctx.lineTo(-width * 0.46, -height * 0.24);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = `hsla(${machine.hue},100%,66%,0.62)`;
        ctx.beginPath();
        ctx.arc(-width * 0.16, -height * 0.3, Math.max(1.5, width * 0.035), 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,80,145,0.65)';
        ctx.beginPath();
        ctx.arc(width * 0.12, -height * 0.3, Math.max(1.2, width * 0.028), 0, Math.PI * 2);
        ctx.arc(width * 0.21, -height * 0.3, Math.max(1.2, width * 0.028), 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(15,18,26,0.96)';
        ctx.fillRect(-width * 0.32, -height * 0.18, width * 0.64, height * 0.12);
        ctx.fillStyle = `hsla(${machine.hue},100%,62%,0.34)`;
        ctx.fillRect(-width * 0.08, -height * 0.14, width * 0.16, height * 0.025);
        ctx.restore();
    }

    function drawGameCenter(t) {
        if (theme !== 'gamecenter') return;
        const horizon = runtime.height * 0.53;
        const vanishingX = runtime.width / 2;
        ctx.save();
        ctx.drawImage(gameCenterTexture, 0, 0, runtime.width, runtime.height);

        ctx.globalCompositeOperation = 'lighter';
        for (const light of gameCenterLights) {
            const pulse = 0.72 + Math.sin(t * 1.3 + light.phase) * 0.2;
            const glow = ctx.createRadialGradient(
                light.x,
                light.y,
                0,
                light.x,
                light.y,
                light.radius * 8,
            );
            glow.addColorStop(0, `hsla(${light.hue},100%,78%,${0.38 * pulse})`);
            glow.addColorStop(0.2, `hsla(${light.hue},100%,60%,${0.12 * pulse})`);
            glow.addColorStop(1, `hsla(${light.hue},100%,50%,0)`);
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(light.x, light.y, light.radius * 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = `hsla(${light.hue},100%,82%,${0.58 * pulse})`;
            ctx.fillRect(
                light.x - light.radius * 1.8,
                light.y - light.radius * 0.65,
                light.radius * 3.6,
                light.radius * 1.3,
            );
        }

        for (const machine of gameCenterCabinets) {
            const reflection = ctx.createLinearGradient(
                machine.x,
                machine.baseY,
                machine.x,
                Math.min(runtime.height, machine.baseY + machine.height * 0.72),
            );
            reflection.addColorStop(0, `hsla(${machine.hue},100%,58%,0.055)`);
            reflection.addColorStop(1, `hsla(${machine.hue},100%,45%,0)`);
            ctx.fillStyle = reflection;
            ctx.beginPath();
            ctx.moveTo(machine.x - machine.width * 0.34, machine.baseY);
            ctx.lineTo(machine.x + machine.width * 0.34, machine.baseY);
            ctx.lineTo(machine.x + machine.width * 0.18, runtime.height);
            ctx.lineTo(machine.x - machine.width * 0.18, runtime.height);
            ctx.closePath();
            ctx.fill();
        }
        ctx.globalCompositeOperation = 'source-over';

        gameCenterCabinets.forEach((machine) => drawGameCenterCabinet(machine, t));

        const focusShade = ctx.createRadialGradient(
            vanishingX,
            runtime.height * 0.35,
            0,
            vanishingX,
            runtime.height * 0.35,
            Math.min(runtime.width, runtime.height) * 0.42,
        );
        focusShade.addColorStop(0, 'rgba(1,3,10,0.34)');
        focusShade.addColorStop(0.56, 'rgba(1,3,10,0.12)');
        focusShade.addColorStop(1, 'rgba(1,3,10,0)');
        ctx.fillStyle = focusShade;
        ctx.fillRect(0, 0, runtime.width, runtime.height);

        ctx.globalCompositeOperation = 'lighter';
        for (let index = 0; index < 8; index++) {
            const progress = (index / 8 + t * 0.12) % 1;
            const y = horizon + Math.pow(progress, 1.85) * (runtime.height - horizon);
            const spread = runtime.width * (0.025 + progress * 0.18);
            const alpha = 0.1 + progress * 0.22;
            for (const side of [-1, 1]) {
                ctx.fillStyle = `rgba(255,92,42,${alpha})`;
                ctx.shadowColor = '#ff5c2a';
                ctx.shadowBlur = 4;
                ctx.beginPath();
                ctx.arc(vanishingX + side * spread, y, 0.8 + progress * 1.2, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.restore();
    }

    return Object.freeze({ init: initGameCenter, draw: drawGameCenter });
}
