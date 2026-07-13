import { clamp } from '../utils/clamp.js';
import { removeElementSafe } from '../utils/dom.js';
import { debounce } from '../utils/scheduling.js';

function setTextIfChanged(node, value) {
    if (!node) return;
    const text = String(value);
    if (node.textContent !== text) node.textContent = text;
}

function createHudElement(document) {
    const hud = document.createElement('div');
    hud.id = 'mm-hud';
    // Static extension-owned markup; no host-page or user-provided strings are interpolated.
    hud.innerHTML = `
        <div id="mm-hud-header">
            <span id="mm-hud-title">LIVE STATS</span>
            <button id="mm-hud-collapse-btn" type="button"
                aria-label="Collapse HUD" aria-expanded="true" title="Collapse HUD">−</button>
        </div>
        <div id="mm-hud-stats">
            <div class="mm-hud-stat">
                <div class="mm-hud-label" id="mm-hud-score-label">SCORE</div>
                <div class="mm-hud-value" id="mm-hud-score">0</div>
            </div>
            <div class="mm-hud-stat">
                <div class="mm-hud-label" id="mm-hud-combo-label">COMBO</div>
                <div class="mm-hud-value" id="mm-hud-combo">x0</div>
            </div>
            <div class="mm-hud-stat">
                <div class="mm-hud-label" id="mm-hud-mult-label">
                    <span class="mm-hud-label-full">MULTIPLIER</span>
                    <span class="mm-hud-label-short">MULT</span>
                </div>
                <div class="mm-hud-value" id="mm-hud-mult">x1</div>
            </div>
            <div class="mm-hud-stat">
                <div class="mm-hud-label" id="mm-hud-streak-label">
                    <span class="mm-hud-label-full">WORD STREAK</span>
                    <span class="mm-hud-label-short">STREAK</span>
                </div>
                <div class="mm-hud-value" id="mm-hud-streak">0</div>
            </div>
            <div class="mm-hud-stat mm-hud-secondary">
                <div class="mm-hud-label" id="mm-hud-acc-label">ACCURACY</div>
                <div class="mm-hud-value" id="mm-hud-acc">—</div>
            </div>
            <div class="mm-hud-stat">
                <div class="mm-hud-label" id="mm-hud-bonus-label">XP BONUS</div>
                <div class="mm-hud-value" id="mm-hud-bonus">x1.00</div>
            </div>
            <div class="mm-hud-stat mm-hud-secondary">
                <div class="mm-hud-label" id="mm-hud-record-label">7D BEST</div>
                <div class="mm-hud-value" id="mm-hud-record">
                    S <span>0</span> / C <span>x0</span> / M <span>x1</span>
                </div>
            </div>
        </div>
        <div id="mm-combo-bar-wrap"><div id="mm-combo-bar"></div></div>
        <div id="mm-hud-controls">
            <button id="mm-hud-rewind-btn" disabled>⟲ REWIND</button>
            <button id="mm-hud-settings-btn">⚙ SETTINGS</button>
        </div>
    `;
    return hud;
}

function createSettingsRecoveryLauncher(document) {
    const launcher = document.createElement('button');
    launcher.id = 'mm-settings-launcher';
    launcher.type = 'button';
    launcher.textContent = '⚙ SETTINGS';
    launcher.setAttribute('aria-label', 'Open gamification settings');
    launcher.setAttribute('aria-controls', 'mm-settings');
    launcher.title = 'Open gamification settings';
    return launcher;
}

export function createHudController({
    document,
    window = document.defaultView,
    settings,
    saveSettings,
    prefersReducedMotion = () => false,
    isLiteMode = () => false,
    onRewind = () => {},
}) {
    if (!document || !window) throw new TypeError('HUD controller requires a document and window');

    const hud = createHudElement(document);
    const settingsLauncher = createSettingsRecoveryLauncher(document);
    if (settings.hudCollapsed) hud.classList.add('mm-panel-collapsed');

    const refs = {
        hud,
        score: hud.querySelector('#mm-hud-score'),
        combo: hud.querySelector('#mm-hud-combo'),
        mult: hud.querySelector('#mm-hud-mult'),
        streak: hud.querySelector('#mm-hud-streak'),
        acc: hud.querySelector('#mm-hud-acc'),
        bonus: hud.querySelector('#mm-hud-bonus'),
        record: hud.querySelector('#mm-hud-record'),
        bar: hud.querySelector('#mm-combo-bar'),
        barWrap: hud.querySelector('#mm-combo-bar-wrap'),
        rewind: hud.querySelector('#mm-hud-rewind-btn'),
        collapse: hud.querySelector('#mm-hud-collapse-btn'),
        title: hud.querySelector('#mm-hud-title'),
        settingsButton: hud.querySelector('#mm-hud-settings-btn'),
    };

    const listeners = [];
    let settingsPanel = null;
    let resizeHandler = null;
    let drag = null;
    let dragRaf = null;
    let collapseTimer = null;
    let microTimer = null;
    let microElement = null;
    let installed = false;

    const listen = (target, type, handler, options) => {
        target.addEventListener(type, handler, options);
        listeners.push(() => target.removeEventListener(type, handler, options));
    };

    function syncCollapseControl() {
        const collapsed = settings.hudCollapsed;
        refs.title.textContent = collapsed ? 'HUD' : 'LIVE STATS';
        refs.collapse.textContent = collapsed ? '+' : '−';
        refs.collapse.setAttribute('aria-expanded', String(!collapsed));
        refs.collapse.setAttribute('aria-label', collapsed ? 'Expand HUD' : 'Collapse HUD');
        refs.collapse.title = collapsed ? 'Expand HUD' : 'Collapse HUD';
    }

    function clampPosition(position, dimensions = null) {
        const margin = 20;
        const width = dimensions?.width || hud.offsetWidth || 220;
        const height = dimensions?.height || hud.offsetHeight || 330;
        const maxX = Math.max(margin, window.innerWidth - width - margin);
        const maxY = Math.max(margin, window.innerHeight - height - margin);
        return {
            x: clamp(position?.x, margin, maxX, margin),
            y: clamp(position?.y, margin, maxY, margin),
        };
    }

    function getDefaultPosition() {
        const margin = 20;
        const raisedBottom = 170;
        const hudHeight = hud.offsetHeight || 330;
        return {
            x: margin,
            y: Math.max(margin, window.innerHeight - hudHeight - raisedBottom),
        };
    }

    function positionSettingsPanel() {
        if (!settingsPanel) return;
        const margin = 12;
        const anchor = hud.hidden ? settingsLauncher : hud;
        const hudRect = anchor.getBoundingClientRect();
        const panelWidth = settingsPanel.offsetWidth || 260;
        const panelHeight = settingsPanel.offsetHeight || 300;
        const rightSideX = hudRect.right + margin;
        const leftSideX = hudRect.left - panelWidth - margin;
        const x =
            rightSideX + panelWidth <= window.innerWidth - margin
                ? rightSideX
                : Math.max(margin, leftSideX);
        const y = clamp(hudRect.top, margin, window.innerHeight - panelHeight - margin, margin);
        settingsPanel.style.left = `${x}px`;
        settingsPanel.style.top = `${y}px`;
        settingsPanel.style.right = 'auto';
        settingsPanel.style.bottom = 'auto';
    }

    function applyPosition(position, dimensions = null) {
        const next = clampPosition(position || getDefaultPosition(), dimensions);
        hud.style.left = `${next.x}px`;
        hud.style.top = `${next.y}px`;
        hud.style.right = 'auto';
        hud.style.bottom = 'auto';
        if (settingsPanel?.classList.contains('open')) positionSettingsPanel();
        return next;
    }

    function setCollapsed(collapsed) {
        settings.hudCollapsed = Boolean(collapsed);
        hud.classList.toggle('mm-panel-collapsed', settings.hudCollapsed);
        if (settings.hudCollapsed) settingsPanel?.classList.remove('open');
        syncCollapseControl();
        saveSettings();

        if (collapseTimer) window.clearTimeout(collapseTimer);
        collapseTimer = window.setTimeout(
            () => {
                collapseTimer = null;
                const next = applyPosition(settings.hudPosition);
                if (settings.hudPosition && next) {
                    settings.hudPosition = next;
                    saveSettings();
                }
            },
            prefersReducedMotion() ? 0 : 260,
        );
    }

    function resetPosition() {
        settings.hudPosition = null;
        applyPosition(null);
        saveSettings();
    }

    function installDrag() {
        resizeHandler = debounce(
            () => {
                const next = applyPosition(settings.hudPosition);
                if (settings.hudPosition && next) {
                    settings.hudPosition = next;
                    saveSettings();
                }
            },
            140,
            window,
        );
        listen(window, 'resize', resizeHandler);

        listen(hud, 'pointerdown', (event) => {
            if (event.button !== 0 || event.target.closest?.('button, input, label, a')) return;
            const rect = hud.getBoundingClientRect();
            drag = {
                pointerId: event.pointerId,
                offsetX: event.clientX - rect.left,
                offsetY: event.clientY - rect.top,
                width: rect.width,
                height: rect.height,
                pendingPosition: null,
            };
            hud.classList.add('dragging');
            hud.setPointerCapture?.(event.pointerId);
            event.preventDefault();
        });

        listen(hud, 'pointermove', (event) => {
            if (!drag || drag.pointerId !== event.pointerId) return;
            drag.pendingPosition = {
                x: event.clientX - drag.offsetX,
                y: event.clientY - drag.offsetY,
            };
            if (dragRaf) return;
            dragRaf = window.requestAnimationFrame(() => {
                dragRaf = null;
                if (!drag?.pendingPosition) return;
                const next = applyPosition(drag.pendingPosition, drag);
                drag.pendingPosition = null;
                if (next) settings.hudPosition = next;
            });
        });

        const stopDrag = (event) => {
            if (!drag || drag.pointerId !== event.pointerId) return;
            if (dragRaf) {
                window.cancelAnimationFrame(dragRaf);
                dragRaf = null;
            }
            if (drag.pendingPosition) {
                const next = applyPosition(drag.pendingPosition, drag);
                if (next) settings.hudPosition = next;
            }
            hud.releasePointerCapture?.(event.pointerId);
            hud.classList.remove('dragging');
            drag = null;
            saveSettings();
        };

        listen(hud, 'pointerup', stopDrag);
        listen(hud, 'pointercancel', stopDrag);
    }

    function install(panel) {
        if (installed) return;
        installed = true;
        settingsPanel = panel || null;
        syncCollapseControl();
        applyPosition(settings.hudPosition);
        installDrag();

        listen(refs.collapse, 'click', () => setCollapsed(!settings.hudCollapsed));
        listen(refs.settingsButton, 'click', () => {
            if (!settingsPanel) return;
            settingsPanel.classList.toggle('open');
            if (settingsPanel.classList.contains('open')) positionSettingsPanel();
        });
        listen(settingsLauncher, 'click', () => {
            if (!settingsPanel) return;
            settingsPanel.classList.toggle('open');
            if (settingsPanel.classList.contains('open')) positionSettingsPanel();
        });
        listen(refs.rewind, 'click', () => onRewind('hud'));
    }

    function update({ state, rollingRecords, bonusMultiplier }) {
        const total = state.sessionCorrect + state.sessionIncorrect;
        setTextIfChanged(refs.score, state.score.toLocaleString());
        setTextIfChanged(refs.combo, `x${state.answerStreak}`);
        setTextIfChanged(refs.mult, `x${state.multiplier}`);
        setTextIfChanged(refs.streak, state.wordStreak);
        setTextIfChanged(
            refs.acc,
            total > 0 ? `${Math.round((state.sessionCorrect / total) * 100)}%` : '—',
        );
        updateBonus(bonusMultiplier);

        const recordMarkup =
            `S <span>${rollingRecords.score.toLocaleString()}</span> / ` +
            `C <span>x${rollingRecords.combo}</span> / M <span>x${rollingRecords.multiplier}</span>`;
        if (refs.record._mmMarkup !== recordMarkup) {
            // Values are normalized finite record numbers supplied by the records domain.
            refs.record.innerHTML = recordMarkup;
            refs.record._mmMarkup = recordMarkup;
        }

        hud.classList.toggle('glow', state.answerStreak >= 10);
        hud.classList.toggle('danger', state.answerStreak === 0 && state.sessionIncorrect > 0);
    }

    function updateBonus(multiplier) {
        setTextIfChanged(refs.bonus, `x${multiplier.toFixed(2)}`);
    }

    function showMicro(text, tone = 'score') {
        if (
            isLiteMode() ||
            !settings.hudCollapsed ||
            !settings.visualsEnabled ||
            prefersReducedMotion()
        ) {
            return;
        }

        if (microTimer) window.clearTimeout(microTimer);
        removeElementSafe(microElement);

        const node = document.createElement('div');
        node.className = `mm-hud-micro ${tone}`;
        node.textContent = text;
        document.body.appendChild(node);
        microElement = node;

        const hudRect = hud.getBoundingClientRect();
        const gap = 7;
        const maxLeft = Math.max(8, window.innerWidth - node.offsetWidth - 8);
        const left = clamp(hudRect.left + (hudRect.width - node.offsetWidth) / 2, 8, maxLeft, 8);
        const fitsBelow = hudRect.bottom + gap + node.offsetHeight <= window.innerHeight - 8;
        node.style.left = `${left}px`;
        node.style.top = `${
            fitsBelow ? hudRect.bottom + gap : Math.max(8, hudRect.top - node.offsetHeight - gap)
        }px`;

        microTimer = window.setTimeout(() => {
            removeElementSafe(node);
            if (microElement === node) microElement = null;
            microTimer = null;
        }, 900);
    }

    function setVisible(visible) {
        const showHud = Boolean(visible);
        const focusWasInsideHud = hud.contains(document.activeElement);
        hud.classList.toggle('hidden', !showHud);
        hud.hidden = !showHud;
        hud.toggleAttribute('inert', !showHud);
        if (showHud) hud.removeAttribute('aria-hidden');
        else hud.setAttribute('aria-hidden', 'true');

        settingsLauncher.hidden = showHud;
        if (showHud) settingsLauncher.setAttribute('aria-hidden', 'true');
        else settingsLauncher.removeAttribute('aria-hidden');

        if (focusWasInsideHud && !showHud) settingsLauncher.focus();
        if (settingsPanel?.classList.contains('open')) positionSettingsPanel();
    }

    function cleanup() {
        listeners.splice(0).forEach((removeListener) => removeListener());
        resizeHandler?.cancel?.();
        resizeHandler = null;
        if (dragRaf) window.cancelAnimationFrame(dragRaf);
        if (collapseTimer) window.clearTimeout(collapseTimer);
        if (microTimer) window.clearTimeout(microTimer);
        dragRaf = null;
        collapseTimer = null;
        microTimer = null;
        drag = null;
        hud.classList.remove('dragging');
        removeElementSafe(microElement);
        removeElementSafe(settingsLauncher);
        microElement = null;
        settingsPanel = null;
        installed = false;
    }

    setVisible(settings.hudEnabled);

    return {
        element: hud,
        settingsLauncher,
        refs,
        install,
        cleanup,
        applyPosition,
        positionSettingsPanel,
        resetPosition,
        setCollapsed,
        setVisible,
        showMicro,
        update,
        updateBonus,
    };
}
