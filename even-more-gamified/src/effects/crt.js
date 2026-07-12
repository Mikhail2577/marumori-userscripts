const OVERLAY_IDS = Object.freeze(['mm-crt-tint', 'mm-scanlines']);

export function createCrtController({ document } = {}) {
    if (!document?.createElement || !document?.body) {
        throw new TypeError('CRT controller requires a document with a body');
    }

    function removeOverlays() {
        for (const id of OVERLAY_IDS) document.getElementById(id)?.remove();
    }

    function sync({ enabled = false } = {}) {
        document.body.classList.toggle('mm-crt-enabled', Boolean(enabled));
        if (!enabled) {
            removeOverlays();
            return false;
        }

        const fragment = document.createDocumentFragment();
        for (const id of OVERLAY_IDS) {
            if (document.getElementById(id)) continue;
            const overlay = document.createElement('div');
            overlay.id = id;
            overlay.dataset.mmOwned = '';
            fragment.append(overlay);
        }
        document.body.append(fragment);
        return true;
    }

    function cleanup() {
        document.body.classList.remove('mm-crt-enabled');
        removeOverlays();
    }

    return Object.freeze({ sync, cleanup });
}
