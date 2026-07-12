// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';

import { QUESTION_STATES, createLifecycleController } from '../../src/core/lifecycle.js';
import { createFirstInputGate } from '../../src/gameplay/first-input-gate.js';

describe('first-answer input gate', () => {
    it('starts once on the first non-empty input and advances lifecycle state', () => {
        const lifecycle = createLifecycleController();
        lifecycle.mount();
        lifecycle.start();
        lifecycle.beginQuestion('question-1', { awaitingFirstInput: true });
        const input = document.createElement('input');
        document.body.append(input);
        const onStart = vi.fn(() => true);
        const gate = createFirstInputGate({
            lifecycle,
            isResolved: () => false,
            onStart,
        });

        gate.arm(input);
        input.value = '';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        expect(onStart).not.toHaveBeenCalled();

        input.value = 'に';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.value = '日本';
        input.dispatchEvent(new Event('input', { bubbles: true }));

        expect(onStart).toHaveBeenCalledTimes(1);
        expect(gate.hasStarted).toBe(true);
        expect(lifecycle.questionState).toBe(QUESTION_STATES.AWAITING_ANSWER);
    });

    it('does not start after resolution and removes stale listeners on reset', () => {
        const lifecycle = createLifecycleController();
        lifecycle.mount();
        lifecycle.start();
        lifecycle.beginQuestion('question-1', { awaitingFirstInput: true });
        const input = document.createElement('input');
        document.body.append(input);
        let resolved = true;
        const onStart = vi.fn(() => true);
        const gate = createFirstInputGate({ lifecycle, isResolved: () => resolved, onStart });

        expect(gate.arm(input)).toBe(false);
        resolved = false;
        expect(gate.arm(input)).toBe(true);
        gate.reset();
        input.value = 'answer';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        expect(onStart).not.toHaveBeenCalled();
    });

    it('keeps listening when timer ownership cannot start on the first input event', () => {
        const lifecycle = createLifecycleController();
        lifecycle.mount();
        lifecycle.start();
        lifecycle.beginQuestion('question-1', { awaitingFirstInput: true });
        const input = document.createElement('input');
        document.body.append(input);
        const onStart = vi.fn().mockReturnValueOnce(false).mockReturnValueOnce(true);
        const gate = createFirstInputGate({
            lifecycle,
            isResolved: () => false,
            onStart,
        });

        gate.arm(input);
        input.value = '一';
        input.dispatchEvent(new Event('input', { bubbles: true }));

        expect(onStart).toHaveBeenCalledTimes(1);
        expect(gate.hasStarted).toBe(false);
        expect(gate.input).toBe(input);
        expect(lifecycle.questionState).toBe(QUESTION_STATES.AWAITING_FIRST_INPUT);

        input.value = '一番';
        input.dispatchEvent(new Event('input', { bubbles: true }));

        expect(onStart).toHaveBeenCalledTimes(2);
        expect(gate.hasStarted).toBe(true);
        expect(gate.input).toBeNull();
        expect(lifecycle.questionState).toBe(QUESTION_STATES.AWAITING_ANSWER);
    });

    it('ignores input from a stale connected node', () => {
        const lifecycle = createLifecycleController();
        lifecycle.mount();
        lifecycle.start();
        lifecycle.beginQuestion('question-1', { awaitingFirstInput: true });
        const staleInput = document.createElement('input');
        const currentInput = document.createElement('input');
        document.body.append(staleInput, currentInput);
        const onStart = vi.fn(() => true);
        const gate = createFirstInputGate({
            lifecycle,
            isCurrentInput: (input) => input === currentInput,
            isResolved: () => false,
            onStart,
        });

        gate.arm(staleInput);
        staleInput.value = 'stale';
        staleInput.dispatchEvent(new Event('input', { bubbles: true }));

        expect(onStart).not.toHaveBeenCalled();
        expect(gate.hasStarted).toBe(false);
        expect(lifecycle.questionState).toBe(QUESTION_STATES.AWAITING_FIRST_INPUT);
    });
});
