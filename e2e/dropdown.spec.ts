import type { Page } from '@playwright/test';
import { DROPDOWN_SITE, expect, settle, test } from './support';

// ngu-dropdown by keyboard, on the home page demo (50,000 rows from a pretend server).

test.describe('ngu-dropdown', () => {
  test('opens, moves and picks with the keyboard, and Escape closes without a change', async ({ page }) => {
    await page.goto(DROPDOWN_SITE);
    await settle(page);
    const combobox = page.locator('#home-customer');
    await combobox.focus();

    await page.keyboard.press('ArrowDown');
    await expect(combobox).toHaveAttribute('aria-expanded', 'true');
    const options = page.getByRole('option');
    await expect(options.first()).toBeVisible();

    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    // Focus moves to the panel's search box, which points at the active option.
    const search = page.locator('ngu-dropdown .ngu-dd-search input');
    await expect(search).toBeFocused();
    const active = await search.getAttribute('aria-activedescendant');
    expect(active).toBeTruthy();
    const label = (await page.locator(`[id="${active}"]`).textContent())!.trim();

    await page.keyboard.press('Enter');
    await expect(combobox).toHaveAttribute('aria-expanded', 'false');
    await expect(combobox).toContainText(label);
    await expect(combobox).toBeFocused();

    await page.keyboard.press('ArrowDown');
    await expect(combobox).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Escape');
    await expect(combobox).toHaveAttribute('aria-expanded', 'false');
    await expect(combobox).toContainText(label);
  });

  test('finds rows on the server as you type', async ({ page }) => {
    await page.goto(DROPDOWN_SITE);
    await settle(page);
    await page.locator('#home-customer').focus();
    await page.keyboard.press('ArrowDown');
    await expect(page.locator('ngu-dropdown .ngu-dd-search input')).toBeFocused();
    await page.keyboard.type('apex');
    const options = page.locator('ngu-dropdown').getByRole('option');
    await expect(options.first()).toContainText(/apex/i);
    for (const text of await options.allTextContents()) {
      expect(text.toLowerCase()).toContain('apex');
    }
  });
});

// The Events page logs every output, newest first.
test.describe('ngu-dropdown events', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${DROPDOWN_SITE}/events`);
    await settle(page);
  });

  /** The logged outputs with one of these names, oldest first. */
  async function logged(page: Page, ...names: string[]): Promise<string[]> {
    const entries = await page.locator('.dd-log li code').allTextContents();
    return entries.reverse().filter((entry) => names.some((name) => entry === `(${name})`));
  }

  test('focused and blurred once for a keyboard session, moves inside included', async ({ page }) => {
    const combobox = page.locator('#event-customers');
    await combobox.focus();
    await page.keyboard.press('ArrowDown');
    const search = page.locator('ngu-dropdown .ngu-dd-search input');
    await expect(search).toBeFocused();
    await expect(page.getByRole('option').first()).toBeVisible();

    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    // Escape puts focus back on the field; reopening moves it to the search box again.
    await page.keyboard.press('Escape');
    await expect(combobox).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(search).toBeFocused();

    // Tab goes on to the next element after the dropdown, not to the page.
    await page.keyboard.press('Tab');
    await expect(combobox).toHaveAttribute('aria-expanded', 'false');
    const next = await page.evaluate(() => {
      const active = document.activeElement;
      return active !== document.body && !active?.closest('ngu-dropdown');
    });
    expect(next).toBe(true);
    await expect.poll(() => logged(page, 'focused', 'blurred', 'added')).toEqual(['(focused)', '(added)', '(blurred)']);
  });

  test('a mouse session: picks, the footer, the clear button and the field keep focus inside', async ({ page }) => {
    const combobox = page.locator('#event-customers');
    await combobox.click();
    const search = page.locator('ngu-dropdown .ngu-dd-search input');
    await expect(search).toBeFocused();
    const options = page.getByRole('option');
    await expect(options.first()).toBeVisible();

    await options.nth(1).click();
    await options.nth(2).click();
    await page.locator('ngu-dropdown .ngu-dd-foot').click();
    await expect(search).toBeFocused();

    await page.locator('ngu-dropdown .ngu-dd-clear').click();
    await combobox.click();
    await expect(combobox).toHaveAttribute('aria-expanded', 'false');
    await expect(combobox).toBeFocused();
    await expect
      .poll(() => logged(page, 'focused', 'blurred', 'added', 'removed', 'cleared'))
      .toEqual(['(focused)', '(added)', '(added)', '(removed)', '(removed)', '(cleared)']);

    // The log keeps sixteen entries, so by now the first ones have scrolled out.
    await page.locator('h1').click();
    await expect.poll(() => logged(page, 'blurred', 'cleared')).toEqual(['(cleared)', '(blurred)']);
  });
});
