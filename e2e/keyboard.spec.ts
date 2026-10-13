import { expect, FORM_SITE, settle, test } from './support';

// Keyboard-only flows on the ngu-form docs site. Each test moves focus and acts with keys; the
// mouse is never used. Selects are set with selectOption because the keys that open a native
// select differ by platform.

test.describe('keyboard', () => {
  test('a refused submit focuses the first problem, and Enter submits once it is fixed', async ({ page }) => {
    await page.goto(`${FORM_SITE}/examples/login`);
    await settle(page);
    const email = page.getByLabel('Email');
    await email.focus();
    await page.keyboard.press('Enter');
    await expect(email).toBeFocused();
    await expect(email).toHaveAttribute('aria-invalid', 'true');

    await page.keyboard.type('ada@example.com');
    await page.keyboard.press('Tab');
    await expect(page.getByLabel('Password', { exact: false }).first()).toBeFocused();
    await page.keyboard.type('correct horse');
    await page.keyboard.press('Enter');
    await expect(page.locator('.demo-success')).toHaveText('Signed in as ada@example.com');
  });

  test('tabs follow the arrow keys, Home and End, and stay put while text is selected', async ({ page }) => {
    await page.goto(`${FORM_SITE}/sections`);
    await settle(page);
    const tabs = page.locator('ngu-tabs').first().getByRole('tab');
    await tabs.first().focus();

    await page.keyboard.press('ArrowRight');
    await expect(tabs.nth(1)).toBeFocused();
    await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('End');
    await expect(tabs.last()).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('Home');
    await expect(tabs.first()).toHaveAttribute('aria-selected', 'true');

    // Into the second tab's first field; selecting its text must not switch tabs. Tab waits
    // until the second panel shows, or focus would land in the first one as it hides.
    await page.keyboard.press('ArrowRight');
    await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
    const panel = page.locator(`[id="${await tabs.nth(1).getAttribute('aria-controls')}"]`);
    await expect(panel).toBeVisible();
    await page.keyboard.press('Tab');
    await expect(panel.locator('input, textarea').first()).toBeFocused();
    await page.keyboard.type('someone@example.com');
    await page.keyboard.press('Shift+Home');
    await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
  });

  test('Next moves focus to the next step, and a refused Next focuses the problem', async ({ page }) => {
    await page.goto(`${FORM_SITE}/examples/checkout`);
    await settle(page);
    const title = page.locator('.ngu-step__title').filter({ visible: true });
    const next = async () => {
      await page.getByRole('button', { name: 'Next' }).focus();
      await page.keyboard.press('Enter');
    };

    // The cart and delivery steps start valid.
    await next();
    await expect(title).toContainText('Step 2 of 5');
    await expect(title).toBeFocused();
    await next();
    await expect(title).toContainText('Step 3 of 5');

    // The address step starts empty, so Next stays and focuses the first problem.
    await next();
    await expect(title).toContainText('Step 3 of 5');
    const focused = page.locator(':focus');
    await expect(focused).toHaveAttribute('aria-invalid', 'true');
    expect(await focused.evaluate((el) => !!el.closest('.ngu-step'))).toBe(true);
  });

  test('adding a list row focuses it, and removing it keeps focus in the list', async ({ page }) => {
    await page.goto(`${FORM_SITE}/lists`);
    await settle(page);
    const list = page.locator('ngu-array').first();
    const rows = list.locator('.ngu-array__row');
    const before = await rows.count();

    await list.getByRole('button', { name: /^Add/ }).last().focus();
    await page.keyboard.press('Enter');
    await expect(rows).toHaveCount(before + 1);
    await expect(rows.last().locator('input, select, textarea').first()).toBeFocused();

    await rows.last().getByRole('button', { name: `Remove ${before + 1}` }).focus();
    await page.keyboard.press('Enter');
    await expect(rows).toHaveCount(before);
    expect(await list.evaluate((el) => el.contains(document.activeElement))).toBe(true);
  });

  test('the error summary lists the problems and its links move focus to each field', async ({ page }) => {
    await page.goto(`${FORM_SITE}/examples/signup`);
    await settle(page);
    await page.getByRole('button', { name: 'Create account' }).focus();
    await page.keyboard.press('Enter');
    const summary = page.locator('.ngu-error-summary');
    await expect(summary).toBeVisible();
    const links = summary.getByRole('link');
    expect(await links.count()).toBeGreaterThan(1);

    const second = links.nth(1);
    const target = (await second.getAttribute('href'))!.replace(/^.*#/, '');
    await second.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator(`[id="${target}"]`)).toBeFocused();
  });
});
