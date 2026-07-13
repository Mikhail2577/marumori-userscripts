import { RECORD_WINDOW_DAYS } from '../config/constants.js';
import { safeJsonParse } from '../utils/json.js';

const RECORD_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const RECORD_DAY_FIELDS = ['score', 'combo', 'multiplier'];

export function emptyRecordDay() {
    return { score: 0, combo: 0, multiplier: 1 };
}

export function getRecordKey(time = Date.now()) {
    const date = new Date(time);
    const year = String(date.getFullYear()).padStart(4, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

export function recordKeyToTime(key) {
    if (!RECORD_KEY_PATTERN.test(key)) return Number.NaN;

    const [year, month, day] = key.split('-').map(Number);
    const date = new Date(0);
    date.setHours(0, 0, 0, 0);
    date.setFullYear(year, month - 1, day);

    const roundTrips =
        date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
    return roundTrips ? date.getTime() : Number.NaN;
}

function recordsAreCanonical(source, normalized) {
    if (!source || typeof source !== 'object' || Array.isArray(source)) return false;
    if (Object.keys(source).length !== 1 || !Object.hasOwn(source, 'days')) return false;

    const sourceDays = source.days;
    if (!sourceDays || typeof sourceDays !== 'object' || Array.isArray(sourceDays)) return false;

    const sourceKeys = Object.keys(sourceDays);
    const normalizedKeys = Object.keys(normalized.days);
    if (sourceKeys.length !== normalizedKeys.length) return false;

    return normalizedKeys.every((key) => {
        if (!Object.hasOwn(sourceDays, key)) return false;
        const sourceDay = sourceDays[key];
        const normalizedDay = normalized.days[key];
        if (!sourceDay || typeof sourceDay !== 'object' || Array.isArray(sourceDay)) return false;
        if (Object.keys(sourceDay).length !== RECORD_DAY_FIELDS.length) return false;
        return RECORD_DAY_FIELDS.every(
            (field) => Object.hasOwn(sourceDay, field) && sourceDay[field] === normalizedDay[field],
        );
    });
}

export function normalizeRecords(raw = {}, time = Date.now()) {
    const days = raw?.days && typeof raw.days === 'object' ? raw.days : {};
    const next = { days: {} };
    const currentDay = new Date(time);
    currentDay.setHours(0, 0, 0, 0);
    const currentDayTime = currentDay.getTime();

    for (const [key, value] of Object.entries(days)) {
        const keyTime = recordKeyToTime(key);
        if (
            !Number.isFinite(keyTime) ||
            keyTime > currentDayTime ||
            !value ||
            typeof value !== 'object' ||
            Array.isArray(value)
        ) {
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

export function deserializeRecords(value, time = Date.now()) {
    return normalizeRecords(safeJsonParse(value, {}), time);
}

export function serializeRecords(records) {
    return JSON.stringify(records);
}

export function getRecordsSignature(source = {}, time = Date.now()) {
    const normalized = normalizeRecords(source, time);
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
    const records = normalizeRecords(source, time);
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
    const changed = recordImproved || !recordsAreCanonical(source, records);
    return { records, changed };
}
