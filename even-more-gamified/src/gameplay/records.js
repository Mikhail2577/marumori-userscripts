import { RECORD_WINDOW_DAYS } from '../config/constants.js';
import { safeJsonParse } from '../utils/json.js';

const RECORD_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function emptyRecordDay() {
    return { score: 0, combo: 0, multiplier: 1 };
}

export function getRecordKey(time = Date.now()) {
    const date = new Date(time);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

export function recordKeyToTime(key) {
    const [year, month, day] = key.split('-').map(Number);
    return new Date(year, month - 1, day).getTime();
}

export function normalizeRecords(raw = {}) {
    const days = raw?.days && typeof raw.days === 'object' ? raw.days : {};
    const next = { days: {} };

    for (const [key, value] of Object.entries(days)) {
        if (!RECORD_KEY_PATTERN.test(key) || !value || typeof value !== 'object') {
            continue;
        }
        next.days[key] = {
            score: Math.max(0, Math.floor(Number(value.score) || 0)),
            combo: Math.max(0, Math.floor(Number(value.combo) || 0)),
            multiplier: Math.max(1, Math.floor(Number(value.multiplier) || 1)),
        };
    }

    return next;
}

export function deserializeRecords(value) {
    return normalizeRecords(safeJsonParse(value, {}));
}

export function serializeRecords(records) {
    return JSON.stringify(records);
}

export function getRecordsSignature(source = {}) {
    const normalized = normalizeRecords(source);
    return Object.keys(normalized.days)
        .sort()
        .map((key) => {
            const day = normalized.days[key];
            return `${key}:${day.score}/${day.combo}/${day.multiplier}`;
        })
        .join('|');
}

/**
 * Start of the oldest local calendar day retained in the rolling window.
 *
 * Constructing the date by calendar fields intentionally avoids subtracting a
 * fixed number of 24-hour periods, which is incorrect across DST boundaries.
 */
export function getRecordWindowCutoff(time = Date.now(), windowDays = RECORD_WINDOW_DAYS) {
    const now = new Date(time);
    return new Date(now.getFullYear(), now.getMonth(), now.getDate() - (windowDays - 1)).getTime();
}

export function pruneRecords(source, time = Date.now(), windowDays = RECORD_WINDOW_DAYS) {
    const records = normalizeRecords(source);
    const cutoff = getRecordWindowCutoff(time, windowDays);
    for (const key of Object.keys(records.days)) {
        if (recordKeyToTime(key) < cutoff) delete records.days[key];
    }
    return records;
}

export function getRollingRecords(source, time = Date.now(), windowDays = RECORD_WINDOW_DAYS) {
    const records = pruneRecords(source, time, windowDays);
    const best = emptyRecordDay();
    for (const day of Object.values(records.days)) {
        best.score = Math.max(best.score, day.score);
        best.combo = Math.max(best.combo, day.combo);
        best.multiplier = Math.max(best.multiplier, day.multiplier);
    }
    return best;
}

/**
 * Return the pruned record set with today's best values merged into it.
 */
export function updateRollingRecords(
    source,
    state,
    time = Date.now(),
    windowDays = RECORD_WINDOW_DAYS,
) {
    const previousSignature = getRecordsSignature(source);
    const records = pruneRecords(source, time, windowDays);
    const key = getRecordKey(time);
    const day = records.days[key] || emptyRecordDay();
    const next = {
        score: Math.max(day.score, state.score),
        combo: Math.max(day.combo, state.answerStreak),
        multiplier: Math.max(day.multiplier, state.multiplier),
    };
    const recordImproved =
        next.score !== day.score || next.combo !== day.combo || next.multiplier !== day.multiplier;

    if (recordImproved) records.days[key] = next;
    const changed = recordImproved || getRecordsSignature(records) !== previousSignature;
    return { records, changed };
}
