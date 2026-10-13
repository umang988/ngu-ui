import { expect, FORM_SITE, test } from './support';

// A 500-field form (/bench): how long it takes to render, and whether typing and a full check
// stay smooth. Chromium only: it uses the Long Tasks and Event Timing APIs.

interface Timings {
  longTasks: number[];
  /** Event Timing: `duration` runs to the next paint, `work` is the time spent in handlers. */
  events: { name: string; duration: number; work: number }[];
}

test('500 fields render, take typing without long tasks, and check all at once', async ({ page }) => {
  await page.goto(`${FORM_SITE}/bench?fields=500`);
  await expect(page.locator('ngu-field')).toHaveCount(500);
  const render = await page.evaluate(() => performance.measure('bench', 'bench:start', 'bench:rendered').duration);
  console.log(`render: ${render.toFixed(0)} ms`);

  const watch = () =>
    page.evaluate(() => {
      const timings: Timings = { longTasks: [], events: [] };
      (window as unknown as { timings: Timings }).timings = timings;
      new PerformanceObserver((list) => list.getEntries().forEach((e) => timings.longTasks.push(e.duration))).observe({ type: 'longtask' });
      new PerformanceObserver((list) =>
        list.getEntries().forEach((e) => {
          const t = e as PerformanceEventTiming;
          timings.events.push({ name: t.name, duration: t.duration, work: Math.round(t.processingEnd - t.processingStart) });
        }),
      ).observe({ type: 'event', durationThreshold: 16 } as PerformanceObserverInit);
    });
  const collected = async () => {
    await page.waitForTimeout(300);
    return page.evaluate(() => (window as unknown as { timings: Timings }).timings);
  };

  // Typing in a field in the middle of the form.
  await watch();
  await page.locator('ngu-field[data-ngu-path="g25.text"] input').focus();
  await page.keyboard.type('Performance', { delay: 40 });
  const typing = await collected();
  const keys = typing.events.filter((e) => e.name === 'keydown' || e.name === 'input');
  console.log(
    `typing: long tasks ${JSON.stringify(typing.longTasks)}, slowest event ${Math.max(0, ...keys.map((e) => e.duration))} ms, ` +
      `most handler time ${Math.max(0, ...keys.map((e) => e.work))} ms`,
  );

  // Checking every field: a refused submit shows all errors and the summary.
  await watch();
  await page.getByRole('button', { name: 'Check all' }).click();
  await expect(page.locator('.ngu-error-summary')).toBeVisible();
  const check = await collected();
  const checkTime = Math.max(0, ...check.events.filter((e) => e.name === 'click').map((e) => e.duration));
  console.log(`check all: click ${checkTime} ms, long tasks ${JSON.stringify(check.longTasks)}`);

  expect(render, 'first render of 500 fields, ms').toBeLessThan(RENDER_BUDGET_MS);
  expect(typing.longTasks, 'long tasks while typing').toEqual([]);
  expect(Math.max(0, ...typing.events.map((e) => e.duration)), 'slowest keystroke, ms').toBeLessThanOrEqual(KEY_BUDGET_MS);
  expect(Math.max(0, ...typing.events.map((e) => e.work)), 'most handler time for a keystroke, ms').toBeLessThan(FRAME_MS);
  expect(checkTime, 'click to errors on screen, ms').toBeLessThan(CHECK_BUDGET_MS);
});

// Measured on 2026-10-13 on an Apple M-series laptop: render 226 ms, keystrokes 16 to 32 ms to
// the next paint, check all 96 ms. The budgets leave room for slower CI machines.
const RENDER_BUDGET_MS = 1000;
const KEY_BUDGET_MS = 50;
const FRAME_MS = 16;
const CHECK_BUDGET_MS = 300;
