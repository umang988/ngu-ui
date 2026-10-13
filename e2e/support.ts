import AxeBuilder from '@axe-core/playwright';
import { test as base, expect, type Page } from '@playwright/test';

export const FORM_SITE = 'http://localhost:4321';
export const DROPDOWN_SITE = 'http://localhost:4322';
export const TABLE_SITE = 'http://localhost:4324';

export type Theme = 'light' | 'dark';

/** Console messages that come from outside the app, such as a font CDN that is offline. */
const IGNORED = [/fonts\.(googleapis|gstatic)\.com/];

/**
 * `test` with a `consoleErrors` fixture that fails the test on any console error or uncaught
 * exception. Tests that expect errors can empty the array before the test ends.
 */
export const test = base.extend<{ consoleErrors: string[] }>({
  consoleErrors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on('console', (message) => {
        const text = message.text();
        if (message.type() === 'error' && !IGNORED.some((re) => re.test(text) || re.test(message.location().url))) {
          errors.push(text);
        }
      });
      page.on('pageerror', (error) => errors.push(error.message));
      await use(errors);
      expect(errors, 'console errors').toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

/** Opens pages in this theme from now on (the docs sites read it before the first paint). */
export async function useTheme(page: Page, theme: Theme): Promise<void> {
  await page.addInitScript((value) => {
    try {
      localStorage.setItem('ngu-theme', value);
    } catch {
      // Storage can be blocked; the system theme then applies.
    }
  }, theme);
  await page.emulateMedia({ colorScheme: theme });
}

/** axe violations on the page, one line each: `rule-id: selector, selector`. */
export async function axeViolations(page: Page): Promise<string[]> {
  const results = await new AxeBuilder({ page }).analyze();
  return results.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
}

/** Waits until the page's lazy parts (demos, highlighted code) have loaded. */
export async function settle(page: Page): Promise<void> {
  await page.locator('h1').first().waitFor();
  await page.waitForLoadState('networkidle');
}
