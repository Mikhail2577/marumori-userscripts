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

function isTextEditingTarget(target) {
    let current = target;
    while (current?.nodeType === 1) {
        const role = current.getAttribute('role')?.toLowerCase();
        if (role === 'textbox' || role === 'searchbox' || role === 'combobox') return true;
        if (current.localName === 'textarea' || current.localName === 'select') return true;
        if (current.localName === 'input') {
            const type = (current.getAttribute('type') || 'text').toLowerCase();
            return ![
                'button',
                'checkbox',
                'color',
                'file',
                'hidden',
                'image',
                'radio',
                'range',
                'reset',
                'submit',
            ].includes(type);
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

        const answerInput = dom.getAnswerInput();
        if (
            target === answerInput &&
            answerInput?.isConnected === true &&
            context.wrapper.contains(answerInput)
        ) {
            return true;
        }

        // MaruMori's Undo hotkey is page-level, so resolved reviews can receive
        // Backspace from body, the review root, or a focused host button. Keep
        // ordinary editing safe while tracking every non-editable host target.
        return !isTextEditingTarget(target);
    } catch {
        return false;
    }
}
