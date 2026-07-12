export function fixtureVisibility(element) {
    return Boolean(
        element?.isConnected &&
        !element.hidden &&
        !element.closest('[hidden]') &&
        element.getAttribute('aria-hidden') !== 'true',
    );
}

export function mountReviewFixture(
    document,
    {
        current = 1,
        total = 3,
        questionId = 'question-1',
        resolution = 'unresolved',
        includeWrong = true,
        includeNext = true,
        includeRewind = true,
    } = {},
) {
    const resolutionClass = resolution === 'unresolved' ? '' : ` ${resolution}`;
    document.body.className = '';
    document.body.innerHTML = `
    <main id="main" data-review-session>
      <div class="top_middle">${current} / ${total}</div>
      <section class="input-wrapper${resolutionClass}" data-question-id="${questionId}">
        <label>Answer <input id="answer" type="text" value="original"></label>
        <button type="button" data-action="check">Check</button>
        ${includeWrong ? '<button type="button" data-action="wrong">Wrong</button>' : ''}
        ${includeNext ? '<button type="button" data-action="next">Next</button>' : ''}
        ${includeRewind ? '<button type="button" data-action="undo">Undo</button>' : ''}
      </section>
    </main>
    <button id="outside-next" type="button">Next</button>
    <aside id="mm-settings" data-mm-owned>
      <input id="mm-range" type="range" value="50">
      <button type="button">Next</button>
    </aside>
  `;

    return {
        root: document.querySelector('#main'),
        wrapper: document.querySelector('.input-wrapper'),
        counter: document.querySelector('.top_middle'),
        input: document.querySelector('#answer'),
        submit: document.querySelector("[data-action='check']"),
        wrong: document.querySelector("[data-action='wrong']"),
        next: document.querySelector("[data-action='next']"),
        rewind: document.querySelector("[data-action='undo']"),
    };
}

export function setResolution(wrapper, resolution) {
    wrapper.classList.remove('correct', 'incorrect');
    if (resolution === 'correct' || resolution === 'incorrect') {
        wrapper.classList.add(resolution);
    }
}

export function replaceQuestionWrapper(
    fixture,
    { questionId = 'question-2', keepOldConnected = false } = {},
) {
    const oldWrapper = fixture.wrapper;
    const replacement = oldWrapper.cloneNode(true);
    replacement.classList.remove('correct', 'incorrect');
    replacement.dataset.questionId = questionId;
    replacement.querySelector('input').value = 'new question';
    if (keepOldConnected) {
        oldWrapper.hidden = true;
        oldWrapper.after(replacement);
    } else {
        oldWrapper.replaceWith(replacement);
    }
    fixture.wrapper = replacement;
    fixture.input = replacement.querySelector('input');
    fixture.submit = replacement.querySelector("[data-action='check']");
    fixture.wrong = replacement.querySelector("[data-action='wrong']");
    fixture.next = replacement.querySelector("[data-action='next']");
    fixture.rewind = replacement.querySelector("[data-action='undo']");
    return replacement;
}
