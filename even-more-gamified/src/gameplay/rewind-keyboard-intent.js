import { DOM_RESOLUTION } from '../adapters/marumori-dom.js';

const RESOLVED_STATES = new Set([DOM_RESOLUTION.CORRECT, DOM_RESOLUTION.INCORRECT]);

function isContentEditableTarget(target) {
    let current = target;
    while (current?.nodeType === 1) {
        if (current.hasAttribute('contenteditable')) {
            return current.getAttribute('contenteditable')?.toLowerCase() !== 'false';
        }
        current = current.parentElement;
    }
    return false;
}

export function isResolvedReviewBackspaceIntent({ event, dom, expectedResolution } = {}) {
    if (
        event?.key !== 'Backspace' ||
        event.defaultPrevented ||
        !RESOLVED_STATES.has(expectedResolution) ||
        typeof dom?.readQuestionContext !== 'function' ||
        typeof dom?.getAnswerInput !== 'function' ||
        typeof dom?.isUserscriptOwned !== 'function'
    ) {
        return false;
    }

    const target = event.target;
    if (target?.nodeType !== 1 || isContentEditableTarget(target)) return false;

    try {
        const context = dom.readQuestionContext();
        if (
            !context?.root?.isConnected ||
            !context.wrapper?.isConnected ||
            !context.root.contains(context.wrapper) ||
            context.resolution !== expectedResolution ||
            dom.isUserscriptOwned(target)
        ) {
            return false;
        }

        if (target === context.wrapper) return true;

        const answerInput = dom.getAnswerInput();
        return (
            target === answerInput &&
            answerInput?.isConnected === true &&
            context.wrapper.contains(answerInput)
        );
    } catch {
        return false;
    }
}
