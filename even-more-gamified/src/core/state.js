export const SESSION_STATES = Object.freeze({
    INACTIVE: 'inactive',
    MOUNTING: 'mounting',
    ACTIVE: 'active',
    COMPLETED: 'completed',
    CLEANING_UP: 'cleaning-up',
});

export const QUESTION_STATES = Object.freeze({
    INACTIVE: 'inactive',
    AWAITING_FIRST_INPUT: 'awaiting-first-input',
    AWAITING_ANSWER: 'awaiting-answer',
    RESOLVED_CORRECT: 'resolved-correct',
    RESOLVED_INCORRECT: 'resolved-incorrect',
    REWINDING: 'rewinding',
});

const SESSION_TRANSITIONS = Object.freeze({
    [SESSION_STATES.INACTIVE]: new Set([SESSION_STATES.MOUNTING]),
    [SESSION_STATES.MOUNTING]: new Set([SESSION_STATES.ACTIVE, SESSION_STATES.CLEANING_UP]),
    [SESSION_STATES.ACTIVE]: new Set([SESSION_STATES.COMPLETED, SESSION_STATES.CLEANING_UP]),
    [SESSION_STATES.COMPLETED]: new Set([SESSION_STATES.ACTIVE, SESSION_STATES.CLEANING_UP]),
    [SESSION_STATES.CLEANING_UP]: new Set([SESSION_STATES.INACTIVE]),
});

const QUESTION_TRANSITIONS = Object.freeze({
    [QUESTION_STATES.INACTIVE]: new Set([
        QUESTION_STATES.AWAITING_FIRST_INPUT,
        QUESTION_STATES.AWAITING_ANSWER,
    ]),
    [QUESTION_STATES.AWAITING_FIRST_INPUT]: new Set([
        QUESTION_STATES.AWAITING_ANSWER,
        QUESTION_STATES.RESOLVED_CORRECT,
        QUESTION_STATES.RESOLVED_INCORRECT,
        QUESTION_STATES.INACTIVE,
    ]),
    [QUESTION_STATES.AWAITING_ANSWER]: new Set([
        QUESTION_STATES.RESOLVED_CORRECT,
        QUESTION_STATES.RESOLVED_INCORRECT,
        QUESTION_STATES.INACTIVE,
    ]),
    [QUESTION_STATES.RESOLVED_CORRECT]: new Set([
        QUESTION_STATES.REWINDING,
        QUESTION_STATES.INACTIVE,
    ]),
    [QUESTION_STATES.RESOLVED_INCORRECT]: new Set([
        QUESTION_STATES.REWINDING,
        QUESTION_STATES.INACTIVE,
    ]),
    [QUESTION_STATES.REWINDING]: new Set([
        QUESTION_STATES.AWAITING_ANSWER,
        QUESTION_STATES.RESOLVED_CORRECT,
        QUESTION_STATES.RESOLVED_INCORRECT,
        QUESTION_STATES.INACTIVE,
    ]),
});

export function canTransitionSession(from, to) {
    return SESSION_TRANSITIONS[from]?.has(to) ?? false;
}

export function canTransitionQuestion(from, to) {
    return QUESTION_TRANSITIONS[from]?.has(to) ?? false;
}

export function assertSessionTransition(from, to) {
    if (!canTransitionSession(from, to)) {
        throw new Error(`Invalid session transition: ${from} -> ${to}`);
    }
}

export function assertQuestionTransition(from, to) {
    if (!canTransitionQuestion(from, to)) {
        throw new Error(`Invalid question transition: ${from} -> ${to}`);
    }
}
