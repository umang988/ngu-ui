import { defineConfig } from 'vitest/config';

// Schematics run in Node, outside Angular's test builder: `npx vitest run --config projects/ngu-form/schematics/vitest.config.mts`.
export default defineConfig({
  test: {
    root: import.meta.dirname,
    include: ['**/*.spec.ts'],
    environment: 'node',
    globals: true,
  },
});
