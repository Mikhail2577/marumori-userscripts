// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest';
import { createMaruMoriDomAdapter, DOM_RESOLUTION } from '../../src/adapters/marumori-dom.js';
import { createLifecycleController } from '../../src/core/lifecycle.js';
import { createAnswerTimerOwnershipController } from '../../src/gameplay/answer-timer-ownership.js';
import {
    fixtureVisibility,
    mountReviewFixture,
    replaceQuestionWrapper,
    setResolution,
} from '../fixtures/review-dom.js';

function setup() {
    const fixture = mountReviewFixture(document);
    const dom = createMaruMoriDomAdapter({ document, isVisible: fixtureVisibility });
    const lifecycle = createLifecycleController();
    lifecycle.mount();
    lifecycle.start();
    lifecycle.beginQuestion(dom.getQuestionIdentity());
    const clock = { now: 1_000 };
    const timers = createAnswerTimerOwnershipController({
        lifecycle,
        dom,
        clock: () => clock.now,
    });
    return { clock, dom, fixture, lifecycle, timers };
}

describe('immutable answer-timer ownership', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
    });

    it('captures session, question, logical, DOM, timer, and deadline ownership', () => {
        const { timers } = setup();
        const owner = timers.arm({ durationMs: 5_000 });

        expect(owner).toMatchObject({
            kind: 'answer-timer',
            sessionGeneration: 1,
            questionGeneration: 1,
            timerGeneration: 1,
            identityKind: 'host',
            armedAt: 1_000,
            deadline: 6_000,
            durationMs: 5_000,
        });
        expect(Object.isFrozen(owner)).toBe(true);
        expect(timers.validate(owner)).toMatchObject({ ok: true });
    });

    it('rejects a new DOM question before lifecycle reconciliation', () => {
        const { dom, fixture, timers } = setup();
        const owner = timers.arm({ durationMs: 5_000 });

        replaceQuestionWrapper(fixture, { questionId: 'question-2' });
        fixture.counter.textContent = '2 / 3';

        expect(dom.getQuestionIdentity()).toContain('question-2');
        expect(timers.validate(owner, { requireExpired: true })).toMatchObject({
            ok: false,
            reason: 'logical-question-changed',
        });
    });

    it('rejects changed question and session generations', () => {
        const question = setup();
        const questionOwner = question.timers.arm({ durationMs: 5_000 });
        replaceQuestionWrapper(question.fixture, { questionId: 'question-2' });
        question.fixture.counter.textContent = '2 / 3';
        question.lifecycle.beginQuestion(question.dom.getQuestionIdentity());
        expect(question.timers.validate(questionOwner)).toMatchObject({
            ok: false,
            reason: 'stale-lifecycle-owner',
        });

        const session = setup();
        const sessionOwner = session.timers.arm({ durationMs: 5_000 });
        session.lifecycle.mount();
        session.lifecycle.start();
        session.lifecycle.beginQuestion(session.dom.getQuestionIdentity());
        expect(session.timers.validate(sessionOwner)).toMatchObject({
            ok: false,
            reason: 'stale-lifecycle-owner',
        });
    });

    it('rejects cleanup one millisecond before expiration', () => {
        const { clock, lifecycle, timers } = setup();
        const owner = timers.arm({ durationMs: 5_000 });
        clock.now = owner.deadline - 1;
        lifecycle.cleanup();
        clock.now = owner.deadline;

        expect(timers.validate(owner, { requireExpired: true })).toMatchObject({
            ok: false,
            reason: 'stale-lifecycle-owner',
        });
    });

    it('rejects early expiration and natural answer resolution', () => {
        const { clock, fixture, timers } = setup();
        const owner = timers.arm({ durationMs: 5_000 });

        clock.now = owner.deadline - 1;
        expect(timers.validate(owner, { requireExpired: true })).toMatchObject({
            ok: false,
            reason: 'deadline-not-reached',
        });

        setResolution(fixture.wrapper, 'correct');
        expect(timers.validate(owner)).toMatchObject({
            ok: false,
            reason: 'unexpected-resolution',
        });
    });

    it('rearms a same-logical wrapper replacement without extending its live deadline', () => {
        const { clock, fixture, timers } = setup();
        const owner = timers.arm({ durationMs: 5_000 });
        clock.now += 2_000;
        replaceQuestionWrapper(fixture, { questionId: 'question-1' });

        expect(timers.validate(owner)).toMatchObject({
            ok: false,
            reason: 'dom-generation-changed',
        });
        const rearmed = timers.rearmForCurrentDom(owner);
        expect(rearmed).toMatchObject({
            ok: true,
            reason: 'rearmed-replacement',
            restartedDeadline: false,
        });
        expect(rearmed.ownership.deadline).toBe(owner.deadline);
        expect(rearmed.ownership.timerGeneration).toBeGreaterThan(owner.timerGeneration);
        expect(timers.validate(owner)).toMatchObject({
            ok: false,
            reason: 'stale-timer-generation',
        });
        expect(timers.validate(rearmed.ownership)).toMatchObject({ ok: true });
    });

    it('uses a documented fresh deadline when replacement is first seen after expiration', () => {
        const { clock, fixture, timers } = setup();
        const owner = timers.arm({ durationMs: 5_000 });
        clock.now = owner.deadline + 10;
        replaceQuestionWrapper(fixture, { questionId: 'question-1' });

        const rearmed = timers.rearmForCurrentDom(owner);
        expect(rearmed).toMatchObject({
            ok: true,
            reason: 'restarted-after-replacement',
            restartedDeadline: true,
        });
        expect(rearmed.ownership.armedAt).toBe(clock.now);
        expect(rearmed.ownership.deadline).toBe(clock.now + 5_000);
    });

    it('does not let a stale owner invalidate a newer timer UI owner', () => {
        const { timers } = setup();
        const first = timers.arm({ durationMs: 5_000 });
        const second = timers.arm({ durationMs: 5_000 });

        expect(timers.invalidate(first)).toBe(false);
        expect(timers.current).toBe(second);
        expect(
            timers.validate(second, { allowedResolutions: DOM_RESOLUTION.UNRESOLVED }),
        ).toMatchObject({ ok: true });
    });
});
