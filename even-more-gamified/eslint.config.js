import globals from 'globals';

const rules = {
    'no-undef': 'error',
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    'no-console': ['warn', { allow: ['warn', 'error', 'log'] }],
    eqeqeq: ['error', 'always'],
    curly: ['error', 'multi-line'],
};

export default [
    {
        ignores: ['dist/**', 'node_modules/**'],
    },
    {
        files: ['*.user.js'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'script',
            globals: {
                ...globals.browser,
                AudioContext: 'readonly',
                Event: 'readonly',
                GM_getResourceURL: 'readonly',
                GM_getValue: 'readonly',
                GM_setValue: 'readonly',
                HTMLInputElement: 'readonly',
                HTMLTextAreaElement: 'readonly',
                KeyboardEvent: 'readonly',
                MouseEvent: 'readonly',
                MutationObserver: 'readonly',
                Object: 'readonly',
                cancelAnimationFrame: 'readonly',
                clearTimeout: 'readonly',
                console: 'readonly',
                document: 'readonly',
                history: 'readonly',
                location: 'readonly',
                performance: 'readonly',
                requestAnimationFrame: 'readonly',
                setInterval: 'readonly',
                setTimeout: 'readonly',
                window: 'readonly',
            },
        },
        rules,
    },
    {
        files: ['src/**/*.js'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: {
                ...globals.browser,
                GM_getResourceURL: 'readonly',
                GM_getValue: 'readonly',
                GM_setValue: 'readonly',
            },
        },
        rules,
    },
    {
        files: ['build/**/*.mjs', 'tests/**/*.js', '*.config.js'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: {
                ...globals.browser,
                ...globals.node,
            },
        },
        rules,
    },
];
