(() => {
    'use strict';

    const root = document.getElementById('time-me');
    const counter = root.querySelector('.top_middle');
    const parameters = globalThis.__mmBrowserContractParameters || {};
    const state = {
        checks: 0,
        current: 1,
        nextClicks: 0,
        nextResult: 'correct',
        resolutions: 0,
        rewindDelayMs: 900,
        rewindMode: 'in-place',
        rewinds: 0,
        total: Math.max(1, Number(parameters.total) || 3),
        wrongClicks: 0,
    };

    function wrapper() {
        return root.querySelector('.input-wrapper');
    }

    function updateCounter() {
        counter.textContent = `${state.current} / ${state.total}`;
    }

    function createWrapper(questionNumber = state.current) {
        const section = document.createElement('section');
        section.className = 'input-wrapper';
        section.dataset.questionId = `fixture-question-${questionNumber}`;
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

    function replaceQuestion(questionNumber = state.current) {
        wrapper()?.replaceWith(createWrapper(questionNumber));
    }

    function resolve(result) {
        const activeWrapper = wrapper();
        activeWrapper.classList.remove('correct', 'incorrect');
        activeWrapper.classList.add(result);
        state.resolutions += 1;
    }

    function nextQuestion() {
        state.nextClicks += 1;
        state.current = Math.min(state.total, state.current + 1);
        updateCounter();
        replaceQuestion();
    }

    function applyRewind() {
        const activeWrapper = wrapper();
        const logicalQuestionId = activeWrapper?.dataset.questionId;
        if (state.rewindMode === 'replace-progress') {
            state.current = Math.max(1, state.current - 1);
            updateCounter();
            const replacement = createWrapper();
            if (logicalQuestionId) replacement.dataset.questionId = logicalQuestionId;
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

    updateCounter();

    globalThis.__mmHost = Object.freeze({
        replaceQuestion,
        repeatSignals() {
            const activeWrapper = wrapper();
            activeWrapper?.setAttribute('class', activeWrapper.getAttribute('class') || '');
            counter.textContent = counter.textContent;
        },
        resetSession(sessionId = 'fixture-session-2', total = state.total) {
            state.checks = 0;
            state.current = 1;
            state.nextClicks = 0;
            state.nextResult = 'correct';
            state.resolutions = 0;
            state.rewindDelayMs = 900;
            state.rewindMode = 'in-place';
            state.rewinds = 0;
            state.total = Math.max(1, Number(total) || state.total);
            state.wrongClicks = 0;
            root.dataset.sessionId = sessionId;
            updateCounter();
            replaceQuestion(1);
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
                resolution: wrapper()?.classList.contains('correct')
                    ? 'correct'
                    : wrapper()?.classList.contains('incorrect')
                      ? 'incorrect'
                      : 'unresolved',
            };
        },
    });
})();
