import { playwright } from '@vitest/browser-playwright';
import type { TestUserConfig } from 'vitest/node';

const shared = ['tests/unit/core*.test.ts', 'tests/unit/config.test.ts', 'tests/e2e/browser/*.test.ts'];

// Plain Vite config keeps test options checked without globally augmenting Vite.
export default {
  test: {
    coverage: { provider: 'v8', reportsDirectory: 'artifacts/coverage', include: ['src/**/*.ts'], thresholds: { statements: 80, branches: 80, functions: 80, lines: 80 }, reporter: ['text', 'json-summary', 'html'] },
    projects: [
      { test: { name: 'node', environment: 'node', include: [...shared, 'tests/unit/*.test.ts'], testTimeout: 120_000 } },
      { test: { name: 'distribution', environment: 'node', include: ['tests/e2e/distribution/*.test.ts'], testTimeout: 120_000 } },
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
  } satisfies TestUserConfig,
};
