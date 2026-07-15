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
