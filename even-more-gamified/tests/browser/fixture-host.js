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

    function rewind() {
        state.rewinds += 1;
        wrapper()?.classList.remove('correct', 'incorrect');
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
        resetSession(sessionId = 'fixture-session-2') {
            state.current = 1;
            state.nextResult = 'correct';
            root.dataset.sessionId = sessionId;
            updateCounter();
            replaceQuestion(1);
        },
        setNextResult(result) {
            state.nextResult = result === 'incorrect' ? 'incorrect' : 'correct';
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
