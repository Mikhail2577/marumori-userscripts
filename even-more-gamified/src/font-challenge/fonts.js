export const FONT_CHALLENGE_LOCAL_FONTS = Object.freeze([
    'MS Gothic',
    'MS Mincho',
    'Meiryo',
    'Yu Gothic',
    'Yu Mincho',
    'Hiragino Kaku Gothic Pro',
    'Hiragino Mincho Pro',
    'Osaka',
    'TakaoGothic',
    'TakaoMincho',
    'Kochi Gothic',
    'Kochi Mincho',
]);

export const FONT_CHALLENGE_WEB_FONTS = Object.freeze([
    'Noto Sans JP',
    'Noto Serif JP',
    'Sawarabi Gothic',
    'Sawarabi Mincho',
    'M PLUS Rounded 1c',
    'M PLUS 1p',
    'Kosugi',
    'Kosugi Maru',
    'Shippori Mincho',
    'Yuji Syuku',
    'Yuji Mai',
    'Yuji Boku',
    'Reggae One',
    'RocknRoll One',
    'Zen Kurenaido',
    'Zen Antique',
    'Zen Antique Soft',
    'Zen Maru Gothic',
    'Zen Kaku Gothic New',
    'Zen Old Mincho',
]);

export const FONT_CHALLENGE_FONTS = Object.freeze([
    ...FONT_CHALLENGE_LOCAL_FONTS,
    ...FONT_CHALLENGE_WEB_FONTS,
]);

const ALLOWED_FONT_NAMES = new Set(FONT_CHALLENGE_FONTS);
const WEB_FONT_NAMES = new Set(FONT_CHALLENGE_WEB_FONTS);

export function isAllowedChallengeFont(fontName) {
    return typeof fontName === 'string' && ALLOWED_FONT_NAMES.has(fontName);
}

export function isWebChallengeFont(fontName) {
    return typeof fontName === 'string' && WEB_FONT_NAMES.has(fontName);
}

export function getChallengeFontPool({ lite = false } = {}) {
    return lite ? FONT_CHALLENGE_LOCAL_FONTS : FONT_CHALLENGE_FONTS;
}

export function pickChallengeFont({ lite = false, random = Math.random } = {}) {
    const fonts = getChallengeFontPool({ lite });
    let randomValue = 0;
    try {
        randomValue = Number(typeof random === 'function' ? random() : random);
    } catch {
        randomValue = 0;
    }
    const boundedValue = Number.isFinite(randomValue) ? Math.min(1, Math.max(0, randomValue)) : 0;
    const index = Math.min(fonts.length - 1, Math.floor(boundedValue * fonts.length));
    return fonts[index];
}

export function getChallengeFontFamily(fontName) {
    if (!isAllowedChallengeFont(fontName)) return null;
    return `'${fontName}', sans-serif`;
}

export function getChallengeFontStylesheetUrl(fontName) {
    if (!isWebChallengeFont(fontName)) return null;
    return `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontName)}&display=swap`;
}
