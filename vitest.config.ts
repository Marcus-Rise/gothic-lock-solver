import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';

const shared = ['tests/unit/core*.test.ts', 'tests/browser/*.test.ts'];

export default defineConfig({
  test: {
    coverage: { provider: 'v8', include: ['src/**/*.ts', 'cli/**/*.ts'], thresholds: { statements: 80, branches: 80, functions: 80, lines: 80 }, reporter: ['text', 'json-summary', 'html'] },
    projects: [
      { test: { name: 'node', environment: 'node', include: [...shared, 'tests/unit/*.test.ts'], testTimeout: 120_000 } },
      { test: { name: 'distribution', environment: 'node', include: ['tests/distribution/*.test.ts'], testTimeout: 120_000 } },
      {
        test: {
          include: shared,
          testTimeout: 120_000,
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            instances: [{ browser: 'chromium', name: 'chromium' }, { browser: 'firefox', name: 'firefox' }, { browser: 'webkit', name: 'webkit' }],
          },
        },
      },
    ],
  },
});
