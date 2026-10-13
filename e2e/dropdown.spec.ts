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
