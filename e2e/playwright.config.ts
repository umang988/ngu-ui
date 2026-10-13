import { defineConfig, devices } from '@playwright/test';

// Runs against the production builds of both docs sites, served like Netlify serves them:
//   npm run build:dropdown && npx ng build demo && npx ng build ngu-dropdown-demo && npx ng build ssr-check
//   npm run e2e                   # every project
//   npm run e2e -- --project=chromium keyboard.spec.ts
const CI = !!process.env['CI'];

const FUNCTIONAL = /(keyboard|drafts|dropdown|recipes)\.spec\.ts/

export default defineConfig({
  testDir: '.',
  outputDir: '../test-results/e2e',
  snapshotPathTemplate: '{testDir}/snapshots/{testFileName}/{arg}-{platform}{ext}',
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  // One worker locally keeps memory low on small machines; CI runners have room for two.
  workers: CI ? 2 : 1,
  reporter: CI ? [['github'], ['html', { open: 'never', outputFolder: '../playwright-report' }]] : 'list',
  use: {
    trace: 'retain-on-failure',
  },
  expect: {
    toHaveScreenshot: { maxDiffPixelRatio: 0.002, animations: 'disabled', caret: 'hide' },
  },
  webServer: [
    {
      command: 'node e2e/serve.mjs dist/demo/browser 4321',
      cwd: '..',
      url: 'http://localhost:4321',
      reuseExistingServer: !CI,
    },
    {
      command: 'node e2e/serve.mjs dist/ngu-dropdown-demo/browser 4322',
      cwd: '..',
      url: 'http://localhost:4322',
      reuseExistingServer: !CI,
    },
    {
      command: 'node e2e/serve.mjs dist/ssr-check/browser 4323',
      cwd: '..',
      url: 'http://localhost:4323',
      reuseExistingServer: !CI,
    },
  ],
  projects: [
    // Every docs page, light and dark: console errors and axe.
    { name: 'site', testMatch: 'site.spec.ts', use: { ...devices['Desktop Chrome'] } },
    // The examples rendered on the server (projects/ssr-check) hydrate without mismatches.
    { name: 'ssr', testMatch: 'ssr.spec.ts', use: { ...devices['Desktop Chrome'] } },
    // A 500-field form: render time, typing and a full check (Long Tasks, Event Timing).
    { name: 'perf', testMatch: 'perf.spec.ts', use: { ...devices['Desktop Chrome'] } },
    // Behavior, keyboard flows and storage, in all three engines.
    { name: 'chromium', testMatch: FUNCTIONAL, use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', testMatch: FUNCTIONAL, use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', testMatch: FUNCTIONAL, use: { ...devices['Desktop Safari'] } },
    // Screenshots compare only against baselines made on Linux (see e2e/README.md).
    { name: 'visual', testMatch: 'visual.spec.ts', use: { ...devices['Desktop Chrome'] } },
  ],
});
