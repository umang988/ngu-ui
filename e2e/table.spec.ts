import type { Locator, Page } from '@playwright/test';
import { expect, settle, TABLE_SITE, test } from './support';

// ngu-table in real browsers: the filter panel in the top layer with an ngu-dropdown inside it,
// the native delete dialog and focus, rows by keyboard, search requests and a phone-width layout.

/** The text of one column across the rows on screen. */
async function column(table: Locator, index: number): Promise<string[]> {
  return table
    .locator('tbody tr.ngu-tbl-row')
    .evaluateAll(
      (rows, i) => rows.map((r) => r.querySelectorAll('td')[i]?.textContent?.trim() ?? ''),
      index,
    );
}

/** Waits for the pretend server (350 ms) to answer and the rows to settle. */
async function loaded(table: Locator): Promise<void> {
  await expect(table.locator('.ngu-tbl-wrap--refreshing')).toHaveCount(0);
  await expect(table.locator('tbody')).toHaveAttribute('aria-busy', 'false');
  await expect(table.locator('tbody tr.ngu-tbl-row').first()).toBeVisible();
}

async function open(page: Page, path: string): Promise<Locator> {
  await page.goto(TABLE_SITE + path);
  await settle(page);
  const table = page.locator('.demo ngu-table').first();
  await loaded(table);
  return table;
}

test.describe('ngu-table filters', () => {
  test('opens the panel in the top layer, keeps it open for a dropdown inside, and applies on Apply', async ({
    page,
  }) => {
    const table = await open(page, '/filters');
    const trigger = table.getByRole('button', { name: 'Filter', exact: true });
    await trigger.click();

    const panel = table.locator('.ngu-tbl-filter');
    await expect(panel).toBeVisible();
    expect(await panel.evaluate((el) => el.matches(':popover-open'))).toBe(true);
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    // Nothing clips it: the whole panel is inside the viewport.
    const box = (await panel.boundingBox())!;
    const view = page.viewportSize()!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(view.width);

    // An ngu-dropdown inside the panel opens its own popup; picking from it keeps the panel.
    await panel.locator('#filter-region').click();
    await page.getByRole('option', { name: 'South' }).click();
    await expect(panel).toBeVisible();
    await expect(panel.locator('#filter-region')).toContainText('South');

    await panel.getByRole('button', { name: 'Apply' }).click();
    await expect(panel).toBeHidden();
    await loaded(table);
    expect(new Set(await column(table, 2))).toEqual(new Set(['South']));
    await expect(trigger).toHaveClass(/ngu-tbl-btn--primary/);
  });

  test('closes on Escape from inside and puts focus back on the button', async ({
    page,
    browserName,
  }) => {
    const table = await open(page, '/filters');
    const trigger = table.getByRole('button', { name: 'Filter', exact: true });
    await trigger.focus();
    await page.keyboard.press('Enter');
    const panel = table.locator('.ngu-tbl-filter');
    await expect(panel).toBeVisible();

    // The panel follows its button in the tab order. Safari tabs to buttons with Option.
    await page.keyboard.press(browserName === 'webkit' ? 'Alt+Tab' : 'Tab');
    await expect(panel.getByRole('button', { name: 'Close filters' })).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(panel).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test('applies a tab at once, without marking the Filter button', async ({ page }) => {
    const table = await open(page, '/filters');
    await table.getByRole('button', { name: 'Delivered' }).click();
    await loaded(table);

    expect(new Set(await column(table, 4))).toEqual(new Set(['DELIVERED']));
    await expect(table.getByRole('button', { name: 'Filter', exact: true })).not.toHaveClass(
      /ngu-tbl-btn--primary/,
    );
  });
});

test.describe('ngu-table row actions', () => {
  test('asks in a modal dialog, and focus goes back to Delete when it is cancelled', async ({
    page,
  }) => {
    const table = await open(page, '/row-actions');
    const row = table
      .locator('tbody tr.ngu-tbl-row')
      .filter({ has: page.getByRole('button', { name: 'Delete' }) })
      .first();
    const code = (await row.locator('td').first().textContent())!.trim();
    const remove = row.getByRole('button', { name: 'Delete' });

    await remove.click();
    const dialog = table.locator('dialog.ngu-tbl-dialog');
    await expect(dialog).toBeVisible();
    expect(await dialog.evaluate((el) => el.matches(':modal'))).toBe(true);
    await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(remove).toBeFocused();

    await remove.click();
    await dialog.getByRole('button', { name: 'Delete' }).click();
    await expect(dialog).toBeHidden();
    await expect(table.locator('tbody tr.ngu-tbl-row', { hasText: code })).toHaveCount(0);
    await expect(page.locator('.tb-log li').first()).toHaveText(`deleteRow: ${code}`);
  });

  test('opens a row with Enter, and a button inside it does its own action', async ({ page }) => {
    const table = await open(page, '/row-actions');
    const row = table.locator('tbody tr.ngu-tbl-row').nth(1);
    const code = (await row.locator('td').first().textContent())!.trim();
    const log = page.locator('.tb-log li').first();

    await row.focus();
    await page.keyboard.press('Enter');
    await expect(log).toHaveText(`rowClick: ${code}`);

    await row.getByRole('button', { name: 'View' }).focus();
    await page.keyboard.press('Enter');
    await expect(log).toHaveText(`viewRow: ${code}`);
    await expect(page.locator('.tb-log li').nth(1)).toHaveText(`rowClick: ${code}`);
  });
});

test.describe('ngu-table home', () => {
  test('searches with one request once typing settles', async ({ page }) => {
    await page.goto(TABLE_SITE);
    await settle(page);
    const table = page.locator('.sheet ngu-table');
    await loaded(table);
    const log = page.locator('.log li');
    await expect(log).toHaveCount(1);

    await table.getByRole('searchbox').pressSequentially('harbor', { delay: 40 });
    await expect(log.first()).toContainText('"harbor"');
    await loaded(table);
    await expect(log).toHaveCount(2);
    for (const name of await column(table, 1)) expect(name).toContain('Harbor');
  });

  test('fits a phone: no sideways page scroll, icon-only toolbar buttons, the table scrolls itself', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(TABLE_SITE);
    await settle(page);
    const table = page.locator('.sheet ngu-table');
    await loaded(table);

    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    const exportText = table.locator('.ngu-tbl-actions .ngu-tbl-btn-text', { hasText: 'Export' });
    expect((await exportText.boundingBox())!.width).toBeLessThanOrEqual(1);
    await expect(table.getByRole('button', { name: 'Export' })).toBeVisible();
    expect(
      await table.locator('.ngu-tbl-wrap').evaluate((el) => el.scrollWidth > el.clientWidth),
    ).toBe(true);
  });
});

test.describe('ngu-table virtual scrolling', () => {
  /** The drawn body rows' places in the whole list (aria-rowindex is 1-based, heading first). */
  async function drawn(table: Locator): Promise<number[]> {
    return table
      .locator('tbody tr[aria-rowindex]')
      .evaluateAll((rows) => rows.map((r) => Number(r.getAttribute('aria-rowindex')) - 2));
  }

  test('keeps 50,000 rows in hand down to a few dozen in the DOM, and scrolls to any of them', async ({
    page,
  }) => {
    const table = await open(page, '/virtual');
    await expect(table.locator('table')).toHaveAttribute('aria-rowcount', '50001');
    await expect(table.locator('.ngu-tbl-range')).toHaveText('50,000 rows');
    expect((await drawn(table)).length).toBeLessThan(60);

    const widths = () =>
      table
        .locator('thead th')
        .evaluateAll((ths) => ths.map((th) => Math.round(th.getBoundingClientRect().width)));
    const before = await widths();

    // Drag to the middle.
    const box = table.locator('.ngu-tbl-wrap');
    await box.evaluate((el) => el.scrollTo({ top: el.scrollHeight / 2 }));
    await expect.poll(async () => (await drawn(table))[0]).toBeGreaterThan(24_000);
    const rows = await drawn(table);
    expect(rows.length).toBeLessThan(60);
    expect(rows.at(-1)! - rows[0]).toBe(rows.length - 1);
    // The row drawn for index i is order i + 1.
    const first = table.locator('tbody tr.ngu-tbl-row').first();
    await expect(first.locator('td').first()).toHaveText(`SO-${10_000 + rows[0] + 1}`);

    // The heading stays at the top of the scroller, and the columns keep their widths.
    const top = await box.evaluate((el) => el.getBoundingClientRect().top);
    const head = await table
      .locator('thead th')
      .first()
      .evaluate((el) => el.getBoundingClientRect().top);
    expect(Math.abs(head - top)).toBeLessThan(2);
    expect(await widths()).toEqual(before);
  });

  test('asks the server only for the pages under the scroll position', async ({ page }) => {
    await page.goto(`${TABLE_SITE}/virtual`);
    await settle(page);
    const table = page.locator('.demo ngu-table').nth(1);
    await loaded(table);
    await expect(table.locator('.ngu-tbl-range')).toHaveText('50,000 rows');
    const asked = page.locator('.demo').nth(1).locator('.tb-note code');
    await expect(asked).toHaveText('0');

    await table
      .locator('.ngu-tbl-wrap')
      .evaluate((el) => el.scrollTo({ top: el.scrollHeight / 2 }));
    await expect(table.locator('tbody tr.ngu-tbl-row').first()).toHaveText(/SO-3\d{4}/);
    await expect(table.locator('tbody tr.ngu-tbl-placeholder')).toHaveCount(0);

    // Row 25,000 is on page 500 of 50: one or two pages, not the 499 before them.
    const pages = (await asked.textContent())!.split(', ').map(Number);
    expect(pages[0]).toBe(0);
    expect(pages.length).toBeLessThanOrEqual(4);
    for (const p of pages.slice(1)) expect(Math.abs(p - 500)).toBeLessThanOrEqual(2);
  });
});
