import { describe, expect, it } from 'vitest';
import {
    getReviewSessionBoundaryReason,
    SESSION_BOUNDARY_REASONS,
} from '../../src/core/session-boundary.js';

const SESSION_ONE = 'https://www.marumori.io/study-lists/reviews/session-1';
const SESSION_TWO = 'https://www.marumori.io/study-lists/reviews/session-2';

describe('review session boundary detection', () => {
    it('detects a changed host session token at the same URL and root', () => {
        expect(
            getReviewSessionBoundaryReason({
                activeUrl: SESSION_ONE,
                currentUrl: SESSION_ONE,
                activeSessionIdentity: 'data-review-session:first',
                currentSessionIdentity: 'data-review-session:second',
                rewindPending: true,
            }),
        ).toBe(SESSION_BOUNDARY_REASONS.HOST_SESSION_CHANGED);
    });

    it('detects a new review URL while the DOM root remains reusable', () => {
        expect(
            getReviewSessionBoundaryReason({
                activeUrl: SESSION_ONE,
                currentUrl: SESSION_TWO,
                lastCompleted: 4,
                currentProgress: 4,
                unresolved: true,
            }),
        ).toBe(SESSION_BOUNDARY_REASONS.URL_CHANGED);
    });

    it('detects progress moving backwards on an unresolved active question', () => {
        expect(
            getReviewSessionBoundaryReason({
                activeUrl: SESSION_ONE,
                currentUrl: SESSION_ONE,
                lastCompleted: 7,
                currentProgress: 1,
                unresolved: true,
            }),
        ).toBe(SESSION_BOUNDARY_REASONS.PROGRESS_RESET);
    });

    it('does not treat a resolved counter update as a session reset', () => {
        expect(
            getReviewSessionBoundaryReason({
                activeUrl: SESSION_ONE,
                currentUrl: SESSION_ONE,
                lastCompleted: 7,
                currentProgress: 6,
                unresolved: false,
            }),
        ).toBeNull();
    });

    it('lets an authoritative URL boundary cancel a pending rewind', () => {
        expect(
            getReviewSessionBoundaryReason({
                activeUrl: SESSION_ONE,
                currentUrl: SESSION_TWO,
                lastCompleted: 7,
                currentProgress: 1,
                unresolved: true,
                rewindPending: true,
            }),
        ).toBe(SESSION_BOUNDARY_REASONS.URL_CHANGED);
    });

    it('defers an ambiguous progress reset until a pending rewind settles', () => {
        const progressReset = {
            activeUrl: SESSION_ONE,
            currentUrl: SESSION_ONE,
            lastCompleted: 7,
            currentProgress: 1,
            unresolved: true,
        };

        expect(
            getReviewSessionBoundaryReason({ ...progressReset, rewindPending: true }),
        ).toBeNull();
        expect(getReviewSessionBoundaryReason(progressReset)).toBe(
            SESSION_BOUNDARY_REASONS.PROGRESS_RESET,
        );
    });

    it('ignores hash-only navigation within the active review', () => {
        expect(
            getReviewSessionBoundaryReason({
                activeUrl: `${SESSION_ONE}#answer`,
                currentUrl: `${SESSION_ONE}#settings`,
                lastCompleted: 2,
                currentProgress: 2,
                unresolved: true,
            }),
        ).toBeNull();
    });
});
