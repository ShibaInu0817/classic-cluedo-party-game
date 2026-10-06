import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      { test: { name: 'theme-sdk', root: 'packages/theme-sdk', environment: 'node' } },
      { test: { name: 'engine', root: 'packages/engine', environment: 'node' } },
      { test: { name: 'server', root: 'apps/server', environment: 'node', testTimeout: 15000 } },
      'apps/client',
    ],
  },
});
