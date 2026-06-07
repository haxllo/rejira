import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    include: ['lib/db/_tests/**/*.test.ts', 'lib/auth/_tests/**/*.test.ts'],
    setupFiles: ['lib/db/_tests/setup.ts'],
    testTimeout: 30000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
