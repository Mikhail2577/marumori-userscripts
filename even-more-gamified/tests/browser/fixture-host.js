(() => {
    'use strict';

    const root = document.getElementById('time-me');
    const counter = root.querySelector('.top_middle');
    const modals = document.getElementById('modals');
    const parameters = globalThis.__mmBrowserContractParameters || {};
    const state = {
        checks: 0,
        current: 0,
        item: 1,
        layoutIndex: 0,
        layoutsPerItem: Math.min(2, Math.max(1, Number(parameters.layouts) || 1)),
        nextClicks: 0,
        nextResult: 'correct',
        resolutions: 0,
        rewindDelayMs: 900,
        rewindMode: 'in-place',
        rewinds: 0,
        terminal: false,
        total: Math.max(1, Number(parameters.total) || 3),
        wrapperReplacements: 0,
        wrongClicks: 0,
    };
    const layoutNames = ['reading', 'meaning'];

    function wrapper() {
        return root.querySelector('.input-wrapper');
    }

    function activeLayout() {
        if (state.layoutsPerItem === 1) return 'meaning';
        return layoutNames[state.layoutIndex];
    }

    function updateCounter() {
        counter.textContent = `${state.current} / ${state.total}`;
    }

    function updateFixtureIdentity(activeWrapper) {
        activeWrapper.dataset.fixtureItem = String(state.item);
        activeWrapper.dataset.fixtureLayout = activeLayout();
        if (parameters.hostIds === '1') {
            activeWrapper.dataset.questionId = `fixture-item-${state.item}-${activeLayout()}`;
        } else {
            delete activeWrapper.dataset.questionId;
        }
    }

    function createWrapper() {
        const section = document.createElement('section');
        section.className = `input-wrapper ${activeLayout()}`;
        updateFixtureIdentity(section);
        section.innerHTML = `
            <label>
                Answer
                <input id="answer" type="text" autocomplete="off">
            </label>
            <div class="fixture-controls">
                <button type="button" data-action="check">Check</button>
                <button type="button" data-action="wrong">Wrong</button>
                <button type="button" data-action="next">Next</button>
                <button type="button" data-action="undo">Undo</button>
            </div>
        `;
        return section;
    }

    function replaceQuestion() {
        state.wrapperReplacements += 1;
        wrapper()?.replaceWith(createWrapper());
    }

    function reuseWrapperForLayout() {
        const activeWrapper = wrapper();
        if (!activeWrapper) return;
        activeWrapper.classList.remove(
            'correct',
            'incorrect',
            'reading',
            'meaning',
            'unscramble',
            'fill-in-the-blank',
        );
        activeWrapper.classList.add(activeLayout());
        updateFixtureIdentity(activeWrapper);
        const input = activeWrapper.querySelector('#answer');
        if (input) input.value = '';
    }

    function clearDoneModal() {
        modals.replaceChildren();
    }

    function showDoneModal() {
        const modal = document.createElement('section');
        modal.className = 'lesson-done-modal';
        modal.innerHTML = '<h1>Done with all your reviews!</h1>';
        modals.replaceChildren(modal);
    }

    function resolve(result) {
        const activeWrapper = wrapper();
        activeWrapper.classList.remove('correct', 'incorrect');
        activeWrapper.classList.add(result);
        state.resolutions += 1;
    }

    function nextQuestion() {
        state.nextClicks += 1;
        const activeWrapper = wrapper();
        const correct = activeWrapper?.classList.contains('correct');
        const incorrect = activeWrapper?.classList.contains('incorrect');
        if (!correct && !incorrect) return;

        if (incorrect) {
            reuseWrapperForLayout();
            return;
        }

        if (state.layoutIndex + 1 < state.layoutsPerItem) {
            state.layoutIndex += 1;
            reuseWrapperForLayout();
            return;
        }

        state.current = Math.min(state.total, state.current + 1);
        updateCounter();
        if (state.current === state.total) {
            state.terminal = true;
            showDoneModal();
            return;
        }

        state.item += 1;
        state.layoutIndex = 0;
        replaceQuestion();
    }

    function applyRewind() {
        const activeWrapper = wrapper();
        if (state.rewindMode === 'replace-progress') {
            if (state.terminal) {
                state.current = Math.max(0, state.current - 1);
                state.terminal = false;
                clearDoneModal();
                updateCounter();
            }
            const replacement = createWrapper();
            activeWrapper?.replaceWith(replacement);
            return;
        }
        activeWrapper?.classList.remove('correct', 'incorrect');
    }

    function rewind() {
        state.rewinds += 1;
        if (state.rewindMode === 'delayed') {
            setTimeout(applyRewind, state.rewindDelayMs);
            return;
        }
        applyRewind();
    }

    root.addEventListener('click', (event) => {
        const action = event.target.closest?.('[data-action]')?.dataset.action;
        if (action === 'check') {
            state.checks += 1;
            resolve(state.nextResult);
        } else if (action === 'wrong') {
            state.wrongClicks += 1;
            resolve('incorrect');
        } else if (action === 'next') {
            nextQuestion();
        } else if (action === 'undo') {
            rewind();
        }
    });

    state.layoutIndex = 0;
    reuseWrapperForLayout();
    updateCounter();

    globalThis.__mmHost = Object.freeze({
        repeatSignals() {
            const activeWrapper = wrapper();
            activeWrapper?.setAttribute('class', activeWrapper.getAttribute('class') || '');
            counter.textContent = counter.textContent;
        },
        resetSession(sessionId = 'fixture-session-2', total = state.total) {
            state.checks = 0;
            state.current = 0;
            state.item = 1;
            state.layoutIndex = 0;
            state.nextClicks = 0;
            state.nextResult = 'correct';
            state.resolutions = 0;
            state.rewindDelayMs = 900;
            state.rewindMode = 'in-place';
            state.rewinds = 0;
            state.terminal = false;
            state.total = Math.max(1, Number(total) || state.total);
            state.wrapperReplacements = 0;
            state.wrongClicks = 0;
            root.dataset.sessionId = sessionId;
            clearDoneModal();
            updateCounter();
            replaceQuestion();
        },
        setNextResult(result) {
            state.nextResult = result === 'incorrect' ? 'incorrect' : 'correct';
        },
        setRewindMode(mode, delayMs = 900) {
            state.rewindMode = ['delayed', 'replace-progress'].includes(mode) ? mode : 'in-place';
            state.rewindDelayMs = Math.max(0, Number(delayMs) || 0);
        },
        snapshot() {
            return {
                ...state,
                layout: activeLayout(),
                resolution: wrapper()?.classList.contains('correct')
                    ? 'correct'
                    : wrapper()?.classList.contains('incorrect')
                      ? 'incorrect'
                      : 'unresolved',
            };
        },
    });
})();
