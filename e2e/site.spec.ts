import { axeViolations, DROPDOWN_SITE, expect, FORM_SITE, settle, test, useTheme, type Theme } from './support';

// Every page of both docs sites, in both themes: it renders, logs no errors, and axe finds
// nothing. Pages come from each site's own sidebar, so new pages are covered without edits here.

const SITES = [
  { name: 'ngu-form', base: FORM_SITE },
  { name: 'ngu-dropdown', base: DROPDOWN_SITE },
];
const THEMES: readonly Theme[] = ['light', 'dark'];

test.describe.configure({ mode: 'parallel' });

for (const site of SITES) {
  for (const theme of THEMES) {
    test(`${site.name} pages in the ${theme} theme`, async ({ page, consoleErrors }) => {
      test.setTimeout(10 * 60_000);
      await useTheme(page, theme);
      await page.goto(`${site.base}/introduction`);
      await settle(page);
      const fromNav = await page
        .locator('.nav-menu a[href]')
        .evaluateAll((links) => links.map((a) => new URL((a as HTMLAnchorElement).href).pathname));
      // The gallery is not in the sidebar but shows every field type at once.
      const extra = site.base === FORM_SITE ? ['/gallery'] : [];
      const paths = ['/', ...new Set(fromNav), ...extra];
      expect(paths.length).toBeGreaterThan(5);

      for (const path of paths) {
        await test.step(path, async () => {
          await page.goto(site.base + path);
          await settle(page);
          await expect(page.locator('h1').first()).toBeVisible();
          expect.soft(await page.evaluate(() => document.documentElement.dataset['theme'] ?? null)).toBe(theme);
          expect.soft(await axeViolations(page), `axe on ${path}`).toEqual([]);
          expect.soft([...consoleErrors], `console on ${path}`).toEqual([]);
          consoleErrors.length = 0;
        });
      }
    });
  }
}
