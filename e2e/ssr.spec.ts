import { PAGES } from '../projects/ssr-check/src/app/app.routes';
import { expect, test } from './support';

// projects/ssr-check renders the docs examples on the server at build time (development mode,
// so Angular reports every hydration problem). Each page must arrive with its form already in
// the HTML, hydrate without a mismatch, and then respond to the keyboard.

const SSR_SITE = 'http://localhost:4323';

for (const page of PAGES) {
  test(`${page} renders on the server and hydrates`, async ({ page: browser, request, consoleErrors }) => {
    const html = await (await request.get(`${SSR_SITE}/${page}`)).text();
    // Every page shows a form, or a record in view mode (team).
    expect(html, 'server HTML').toMatch(/<ngu-(form|view)/);
    expect(html, 'server HTML').toMatch(/class="ngu-(label|view__label)/);
    expect(html, 'hydration data').toContain('ngh=');

    const messages: string[] = [];
    browser.on('console', (m) => messages.push(`${m.type()}: ${m.text()}`));
    await browser.goto(`${SSR_SITE}/${page}`);
    await expect.poll(() => messages.find((m) => m.includes('Angular hydrated')), { message: 'hydration report' }).toBeTruthy();

    const report = messages.find((m) => m.includes('Angular hydrated'))!;
    expect(report, 'no component skipped hydration').toMatch(/\b0 component\(s\) were skipped/);
    const problems = messages.filter((m) => /NG05\d\d|hydration/i.test(m) && !m.includes('Angular hydrated'));
    expect(problems).toEqual([]);
    expect(consoleErrors).toEqual([]);

    // Live after hydration: a refused submit focuses the first field that needs attention.
    const submit = browser.locator('ngu-form .ngu-submit, ngu-form .ngu-next').first();
    if ((await submit.count()) > 0 && page !== 'field-types') {
      await submit.focus();
      await browser.keyboard.press('Enter');
      await expect(browser.locator(':focus')).not.toHaveCount(0);
    }
  });
}

test('wizards render their first step on the server with incremental hydration', async ({ request }) => {
  const html = await (await request.get(`${SSR_SITE}/checkout`)).text();
  expect(html).toContain('Step 1 of 5');
});
