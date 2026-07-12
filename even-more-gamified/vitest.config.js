import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        clearMocks: true,
        environment: 'jsdom',
        include: ['tests/**/*.test.js'],
        mockReset: true,
        restoreMocks: true,
    },
});
