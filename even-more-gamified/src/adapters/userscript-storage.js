import { safeJsonParse } from '../utils/json.js';

export function createUserscriptStorage({ getValue, setValue } = {}) {
    if (typeof getValue !== 'function' || typeof setValue !== 'function') {
        throw new TypeError('Userscript storage requires synchronous getValue and setValue');
    }

    function get(key, fallback = null) {
        try {
            const value = getValue(key, fallback);
            return value === undefined ? fallback : value;
        } catch {
            return fallback;
        }
    }

    function set(key, value) {
        try {
            setValue(key, value);
            return true;
        } catch {
            return false;
        }
    }

    function getJson(key, fallback = {}) {
        const value = get(key, null);
        if (value === null || value === undefined) return fallback;
        if (typeof value === 'string') return safeJsonParse(value, fallback);
        return value && typeof value === 'object' ? value : fallback;
    }

    function setJson(key, value) {
        try {
            return set(key, JSON.stringify(value));
        } catch {
            return false;
        }
    }

    return Object.freeze({ get, set, getJson, setJson, getValue: get, setValue: set });
}
