import { CANVAS_BACKGROUND_THEMES, SHOOTING_STAR_THEMES } from '../config/themes.js';
import { debounce } from '../utils/scheduling.js';
import ARCADE_CSS from './arcade.css';
import {
    CANVAS_PIXEL_BUDGETS,
    calculateCanvasSize,
    createFrameCadenceGate,
} from './canvas-runtime.js';
import {
    drawBrightStar,
    drawStarPoint,
    paintEllipticalGlow,
    randomBell,
} from './renderers/render-primitives.js';
import { createGameCenterRenderer } from './renderers/gamecenter-renderer.js';
import { createGridRenderer } from './renderers/grid-renderer.js';
import { createMatrixRenderer } from './renderers/matrix-renderer.js';
import { createNebulaRenderer } from './renderers/nebula-renderer.js';
import { createNightviewRenderer } from './renderers/nightview-renderer.js';
import { createShootingStarSystem } from './renderers/shooting-stars.js';
import { createShrineRenderer } from './renderers/shrine-renderer.js';
import { createStarfieldRenderer } from './renderers/starfield-renderer.js';

const RENDERER_FACTORIES = Object.freeze({
    starfield: createStarfieldRenderer,
    nebula: createNebulaRenderer,
    grid: createGridRenderer,
    gamecenter: createGameCenterRenderer,
    shrine: createShrineRenderer,
    nightview: createNightviewRenderer,
    matrix: createMatrixRenderer,
});

/**
 * Owns canvas renderer selection and the shared browser lifecycle.
 *
 * Individual themes own their drawing state in focused renderer modules. App
 * orchestration is injected so this controller is independent of scoring and
 * review reconciliation.
 */
export function createCanvasBackgroundController({
    document,
    window,
    settings,
    themeManager: ThemeManager,
    crtController,
    isLiteMode,
    isMaxMode,
    prefersReducedMotion,
    isAnswerResolved,
    isSessionActive = () => true,
    requestFrame = requestAnimationFrame,
    cancelFrame = cancelAnimationFrame,
    setTimer = setTimeout,
    clearTimer = clearTimeout,
    performanceNow = () => performance.now(),
}) {
    let starRaf = null;
    let starFrameTimer = null;
    let starResizeHandler = null;
    let starVisibilityHandler = null;
    let starGeneration = 0;
    let starActivityGeneration = 0;
    let resumeStarfield = null;
    let renderStarfieldOnce = null;

    function injectArcadeStyles() {
        if (document.getElementById('mm-arcade-styles')) return;
        const style = document.createElement('style');
        style.id = 'mm-arcade-styles';
        style.textContent = ARCADE_CSS;
        document.head.appendChild(style);
    }

    function hasCanvasBackdrop(theme = settings.backgroundTheme) {
        const resolved = ThemeManager.getActiveTheme(theme);
        return (
            resolved.background.allowCanvasEffects &&
            CANVAS_BACKGROUND_THEMES.includes(resolved.background.renderer)
        );
    }

    function hasShootingStars(theme = settings.backgroundTheme) {
        const resolved = ThemeManager.getActiveTheme(theme);
        return resolved.background.shootingStars && SHOOTING_STAR_THEMES.includes(resolved.id);
    }

    const shootingStars = createShootingStarSystem({
        window,
        settings,
        isLiteMode,
        prefersReducedMotion,
        isAnswerResolved,
        hasShootingStars,
    });

    function pauseArcadeBackdrop() {
        const hadScheduledWork = starRaf !== null || starFrameTimer !== null;
        if (hadScheduledWork) starActivityGeneration++;
        if (starRaf !== null) {
            cancelFrame(starRaf);
            starRaf = null;
        }
        if (starFrameTimer !== null) {
            clearTimer(starFrameTimer);
            starFrameTimer = null;
        }
        return hadScheduledWork;
    }

    function stopArcadeBackdrop() {
        starGeneration++;
        starActivityGeneration++;
        pauseArcadeBackdrop();
        if (starResizeHandler) {
            window.removeEventListener('resize', starResizeHandler);
            starResizeHandler.cancel?.();
            starResizeHandler = null;
        }
        if (starVisibilityHandler) {
            document.removeEventListener('visibilitychange', starVisibilityHandler);
            starVisibilityHandler = null;
        }
        resumeStarfield = null;
        renderStarfieldOnce = null;
        shootingStars.clear();
        document.getElementById('mm-starfield')?.remove();
    }

    function restartArcadeBackdrop() {
        ThemeManager.applyTheme(settings.backgroundTheme, { persist: false });
        stopArcadeBackdrop();
        if (!settings.visualsEnabled) return;
        syncArcadePresentation();
    }

    function resumeArcadeBackdrop() {
        const reducedMotion = prefersReducedMotion();
        if (
            !settings.visualsEnabled ||
            !hasCanvasBackdrop() ||
            !isSessionActive() ||
            document.hidden ||
            reducedMotion
        ) {
            pauseArcadeBackdrop();
            return false;
        }
        if (!document.getElementById('mm-starfield')) {
            buildStarfield();
            return Boolean(document.getElementById('mm-starfield'));
        }
        return resumeStarfield?.() === true;
    }

    function syncReducedMotion() {
        const nextReducedMotionState = prefersReducedMotion();
        pauseArcadeBackdrop();
        if (nextReducedMotionState) {
            if (isSessionActive() && !document.hidden) renderStarfieldOnce?.();
            return false;
        }
        return resumeArcadeBackdrop();
    }

    function triggerShootingStar() {
        return shootingStars.trigger();
    }

    function buildStarfield() {
        const currentRenderer = ThemeManager.getActiveTheme().background.renderer;
        const isStaticImageTheme = currentRenderer === 'shrine' || currentRenderer === 'nightview';
        const reducedMotion = prefersReducedMotion();
        if (!hasCanvasBackdrop() || (reducedMotion && !isStaticImageTheme)) {
            return;
        }

        if (document.getElementById('mm-starfield') || starResizeHandler || starVisibilityHandler) {
            stopArcadeBackdrop();
        }
        const canvas = document.createElement('canvas');
        canvas.id = 'mm-starfield';
        document.body.appendChild(canvas);

        const ctx = canvas.getContext('2d');
        if (!ctx) {
            canvas.remove();
            return;
        }

        const factory = RENDERER_FACTORIES[currentRenderer];
        if (!factory) {
            canvas.remove();
            return;
        }

        let width = 0;
        let height = 0;
        let lastRenderAt = 0;
        let frameScale = 1;
        let rendererRenderPending = false;
        const generation = ++starGeneration;
        const frameInterval = isLiteMode() ? 1000 / 12 : 1000 / 60;
        const frameCadence = createFrameCadenceGate({ intervalMs: frameInterval });
        const renderScale = isLiteMode() ? 0.7 : 1;
        const pixelBudget =
            CANVAS_PIXEL_BUDGETS[settings.performanceProfile] || CANVAS_PIXEL_BUDGETS.balanced;
        const shootingStarsEnabled = hasShootingStars(currentRenderer);

        function resize() {
            const size = calculateCanvasSize(window.innerWidth, window.innerHeight, {
                scale: renderScale,
                maxPixels: pixelBudget,
            });
            width = canvas.width = size.width;
            height = canvas.height = size.height;
        }

        function createBackdropTexture() {
            const texture = document.createElement('canvas');
            texture.width = width;
            texture.height = height;
            return texture;
        }

        const renderer = factory({
            ctx,
            theme: currentRenderer,
            document,
            get width() {
                return width;
            },
            get height() {
                return height;
            },
            get frameScale() {
                return frameScale;
            },
            isLiteMode,
            prefersReducedMotion,
            createBackdropTexture,
            randomBell,
            paintEllipticalGlow,
            drawStarPoint,
            drawBrightStar,
            requestRender: () => {
                if (document.hidden) {
                    rendererRenderPending = true;
                    return false;
                }
                rendererRenderPending = false;
                return renderStarfieldOnce?.() === true;
            },
        });

        function scheduleAnimationFrame() {
            if (starRaf !== null) return;
            const activityGeneration = starActivityGeneration;
            let frameId = null;
            frameId = requestFrame((now) => {
                if (starRaf === frameId) starRaf = null;
                if (activityGeneration !== starActivityGeneration) return;
                tick(now);
            });
            starRaf = frameId;
        }

        function scheduleNextFrame() {
            if (
                generation !== starGeneration ||
                !isSessionActive() ||
                prefersReducedMotion() ||
                (isLiteMode() && isStaticImageTheme) ||
                document.hidden
            ) {
                return;
            }
            if (isLiteMode()) {
                if (starFrameTimer !== null) return;
                const delay = Math.max(0, frameInterval - (performanceNow() - lastRenderAt));
                const activityGeneration = starActivityGeneration;
                let timerId = null;
                timerId = setTimer(() => {
                    if (starFrameTimer === timerId) starFrameTimer = null;
                    if (activityGeneration !== starActivityGeneration) return;
                    scheduleAnimationFrame();
                }, delay);
                starFrameTimer = timerId;
            } else {
                scheduleAnimationFrame();
            }
        }

        function tick(now = performanceNow(), force = false, schedule = true) {
            if (generation !== starGeneration) return;
            if (document.hidden || (!force && !isSessionActive())) return;
            if (!isLiteMode() && !isMaxMode()) {
                if (force) {
                    frameCadence.reset(now);
                } else if (!frameCadence.shouldRender(now)) {
                    scheduleNextFrame();
                    return;
                }
            }

            const elapsed = lastRenderAt ? Math.min(100, now - lastRenderAt) : 1000 / 60;
            frameScale = elapsed / (1000 / 60);
            lastRenderAt = now;
            ctx.clearRect(0, 0, width, height);
            const time = now / 1000;
            renderer.draw(time);
            if (shootingStarsEnabled && Math.random() < 0.0025 * frameScale) {
                triggerShootingStar();
            }
            shootingStars.draw(ctx, frameScale);
            if (schedule) scheduleNextFrame();
        }

        renderStarfieldOnce = () => {
            if (generation !== starGeneration || document.hidden) return false;
            tick(performanceNow(), true, false);
            return true;
        };
        resumeStarfield = () => {
            if (
                generation !== starGeneration ||
                starRaf !== null ||
                starFrameTimer !== null ||
                !isSessionActive() ||
                document.hidden ||
                prefersReducedMotion()
            ) {
                return false;
            }
            starActivityGeneration++;
            lastRenderAt = 0;
            frameCadence.reset();
            tick(performanceNow(), true);
            return true;
        };

        starResizeHandler = debounce(() => {
            resize();
            renderer.init();
            if (
                prefersReducedMotion() ||
                (isLiteMode() && isStaticImageTheme) ||
                !isSessionActive()
            ) {
                if (!renderStarfieldOnce()) rendererRenderPending = true;
            }
        }, 180);
        starVisibilityHandler = () => {
            if (document.hidden) {
                pauseArcadeBackdrop();
                return;
            }
            const renderedPendingFrame = rendererRenderPending;
            if (rendererRenderPending) {
                rendererRenderPending = false;
                renderStarfieldOnce();
            }
            if (isSessionActive() && !renderedPendingFrame) resumeArcadeBackdrop();
        };

        window.addEventListener('resize', starResizeHandler);
        document.addEventListener('visibilitychange', starVisibilityHandler);
        resize();
        renderer.init();
        tick(performanceNow(), true);
    }

    function syncCrtEffects() {
        const enabled = settings.visualsEnabled && settings.crtEnabled && !isLiteMode();
        crtController.sync({ enabled });
    }

    function arcadeOn(theme = ThemeManager.getActiveTheme()) {
        if (!settings.visualsEnabled) return;
        const resolved = isAnswerResolved();
        injectArcadeStyles();
        document.body.classList.add('mm-arcade');
        document.body.classList.toggle('mm-arcade-resolved', resolved);
        document.body.dataset.mmBg = theme.id;

        if (hasCanvasBackdrop()) {
            if (!document.getElementById('mm-starfield')) buildStarfield();
            else if (isSessionActive()) resumeArcadeBackdrop();
            else pauseArcadeBackdrop();
        } else {
            stopArcadeBackdrop();
        }
        syncCrtEffects();
    }

    function arcadeOff() {
        document.body.classList.remove('mm-arcade', 'mm-arcade-resolved');
        crtController.cleanup();
        delete document.body.dataset.mmBg;
        stopArcadeBackdrop();
        ['mm-starfield', 'mm-arcade-styles'].forEach((id) => document.getElementById(id)?.remove());
    }

    function syncArcadePresentation() {
        const theme = ThemeManager.applyTheme(settings.backgroundTheme, {
            persist: false,
        });
        if (settings.visualsEnabled) {
            arcadeOn(theme);
        } else {
            arcadeOff();
        }
    }

    return Object.freeze({
        injectStyles: injectArcadeStyles,
        stop: stopArcadeBackdrop,
        pause: pauseArcadeBackdrop,
        resume: resumeArcadeBackdrop,
        restart: restartArcadeBackdrop,
        syncReducedMotion,
        hasCanvasBackdrop,
        hasShootingStars,
        triggerShootingStar,
        build: buildStarfield,
        syncCrtEffects,
        on: arcadeOn,
        off: arcadeOff,
        sync: syncArcadePresentation,
    });
}
