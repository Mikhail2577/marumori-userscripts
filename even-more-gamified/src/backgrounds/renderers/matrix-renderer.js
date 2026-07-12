const MATRIX_FONT_SIZE = 18;
const MATRIX_GLYPHS = '日月火水木金土山川人大小日本語学習01';

export function createMatrixRenderer(runtime) {
    const { ctx, theme, isLiteMode } = runtime;
    let matrixDrops = [];

    function initMatrix() {
        const columns = Math.ceil(runtime.width / MATRIX_FONT_SIZE);
        matrixDrops = Array.from({ length: columns }, () => -Math.random() * 18);
    }

    function drawMatrix(t) {
        if (theme !== 'matrix') return;
        ctx.save();
        ctx.font = `${MATRIX_FONT_SIZE}px monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';

        matrixDrops.forEach((drop, column) => {
            const x = column * MATRIX_FONT_SIZE + MATRIX_FONT_SIZE / 2;
            const headY = drop * MATRIX_FONT_SIZE;
            const trailLength = isLiteMode() ? 6 : 12;
            for (let trail = 0; trail < trailLength; trail++) {
                const y = headY - trail * MATRIX_FONT_SIZE;
                if (y < -MATRIX_FONT_SIZE || y > runtime.height + MATRIX_FONT_SIZE) continue;
                const alpha = Math.max(0, 0.28 - trail * 0.022);
                const charIndex = Math.floor(t * 8 + column * 7 + trail * 3) % MATRIX_GLYPHS.length;
                ctx.fillStyle = trail === 0 ? 'rgba(210,255,240,0.38)' : `rgba(0,255,180,${alpha})`;
                ctx.fillText(MATRIX_GLYPHS[charIndex], x, y);
            }

            matrixDrops[column] += (0.32 + (column % 5) * 0.045) * runtime.frameScale;
            if (headY > runtime.height + MATRIX_FONT_SIZE * 12 && Math.random() < 0.04) {
                matrixDrops[column] = -Math.random() * 16;
            }
        });
        ctx.restore();
    }

    return Object.freeze({ init: initMatrix, draw: drawMatrix });
}
