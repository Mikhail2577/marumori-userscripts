import { SHRINE_IMAGE_URL } from '../../config/themes.js';

const SHRINE_LANTERN_POINTS = Object.freeze([
    Object.freeze({ x: 0.68, y: 0.44 }),
    Object.freeze({ x: 0.812, y: 0.468 }),
    Object.freeze({ x: 0.835, y: 0.318 }),
]);

export function createShrineRenderer(runtime) {
    const { ctx, theme, document, isLiteMode, prefersReducedMotion, requestRender } = runtime;
    let shrineImage;
    let shrineImageReady = false;
    let shrineDirectFallbackTried = false;
    let shrinePetals = [];

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
        if (shrineImage) return;

        shrineImage = document.createElement('img');
        shrineImage.decoding = 'async';
        shrineImage.onload = () => {
            shrineImageReady = true;
            if (prefersReducedMotion() || isLiteMode()) {
                requestRender();
            }
        };
        const loadShrineDirectly = () => {
            if (shrineDirectFallbackTried) {
                shrineImageReady = false;
                console.warn('[MMGamify] Shrine background resource failed to load.');
                return;
            }
            shrineDirectFallbackTried = true;
            shrineImage.crossOrigin = 'anonymous';
            shrineImage.referrerPolicy = 'no-referrer';
            shrineImage.src = SHRINE_IMAGE_URL;
        };
        shrineImage.onerror = loadShrineDirectly;
        try {
            Promise.resolve(GM_getResourceURL('mmShrineGarden'))
                .then((resourceUrl) => {
                    if (!resourceUrl) throw new Error('Empty shrine resource URL');
                    shrineImage.src = resourceUrl;
                })
                .catch(loadShrineDirectly);
        } catch {
            loadShrineDirectly();
        }
    }

    function drawShrineImage(t) {
        if (!shrineImageReady) {
            const fallback = ctx.createLinearGradient(0, 0, 0, runtime.height);
            fallback.addColorStop(0, '#17212a');
            fallback.addColorStop(1, '#05090a');
            ctx.fillStyle = fallback;
            ctx.fillRect(0, 0, runtime.width, runtime.height);
            return;
        }

        const imageRatio = shrineImage.naturalWidth / shrineImage.naturalHeight;
        const viewportRatio = runtime.width / runtime.height;
        const animated = !isLiteMode() && !prefersReducedMotion();
        const scale = 1.012 + (animated ? Math.sin(t * 0.08) * 0.002 : 0);
        let drawWidth;
        let drawHeight;

        if (imageRatio > viewportRatio) {
            drawHeight = runtime.height * scale;
            drawWidth = drawHeight * imageRatio;
        } else {
            drawWidth = runtime.width * scale;
            drawHeight = drawWidth / imageRatio;
        }

        const driftX = animated ? Math.sin(t * 0.035) * 2.5 : 0;
        const driftY = animated ? Math.cos(t * 0.028) * 1.5 : 0;
        ctx.drawImage(
            shrineImage,
            (runtime.width - drawWidth) / 2 + driftX,
            (runtime.height - drawHeight) / 2 + driftY,
            drawWidth,
            drawHeight,
        );
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
