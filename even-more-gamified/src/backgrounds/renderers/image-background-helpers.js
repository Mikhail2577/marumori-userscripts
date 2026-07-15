export function createManagedBackgroundImage({
    document,
    resourceName,
    directUrl,
    shouldRequestRender,
    requestRender,
    onFailure,
}) {
    let image;
    let ready = false;
    let directFallbackTried = false;

    function loadDirectly() {
        if (directFallbackTried) {
            ready = false;
            onFailure();
            return;
        }
        directFallbackTried = true;
        image.crossOrigin = 'anonymous';
        image.referrerPolicy = 'no-referrer';
        image.src = directUrl;
    }

    function load() {
        if (image) return;

        image = document.createElement('img');
        image.decoding = 'async';
        image.onload = () => {
            ready = true;
            if (shouldRequestRender()) requestRender();
        };
        image.onerror = loadDirectly;

        try {
            Promise.resolve(GM_getResourceURL(resourceName))
                .then((resourceUrl) => {
                    if (!resourceUrl) {
                        loadDirectly();
                        return;
                    }
                    image.src = resourceUrl;
                })
                .catch(loadDirectly);
        } catch {
            loadDirectly();
        }
    }

    return Object.freeze({
        load,
        get image() {
            return image;
        },
        get ready() {
            return ready;
        },
    });
}

export function drawDriftingCoverImage({
    ctx,
    image,
    width,
    height,
    time,
    animated,
    baseScale,
    scalePulseRate,
    scalePulseAmount = 0.002,
    driftXRate,
    driftXDistance,
    driftYRate,
    driftYDistance,
}) {
    const imageRatio = image.naturalWidth / image.naturalHeight;
    const viewportRatio = width / height;
    const scale = baseScale + (animated ? Math.sin(time * scalePulseRate) * scalePulseAmount : 0);
    let drawWidth;
    let drawHeight;

    if (imageRatio > viewportRatio) {
        drawHeight = height * scale;
        drawWidth = drawHeight * imageRatio;
    } else {
        drawWidth = width * scale;
        drawHeight = drawWidth / imageRatio;
    }

    const driftX = animated ? Math.sin(time * driftXRate) * driftXDistance : 0;
    const driftY = animated ? Math.cos(time * driftYRate) * driftYDistance : 0;
    ctx.drawImage(
        image,
        (width - drawWidth) / 2 + driftX,
        (height - drawHeight) / 2 + driftY,
        drawWidth,
        drawHeight,
    );
}
