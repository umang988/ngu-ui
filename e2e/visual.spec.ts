import { expect, FORM_SITE, settle, test, useTheme, type Theme } from './support';

// One screenshot per field type of the /gallery page, in light, dark and right to left, plus
// the states form after a refused submit. The committed baselines are made on Linux in CI
// (the "Update screenshots" workflow); fonts render differently elsewhere. On another system,
// NGU_VISUAL=1 compares against baselines of your own (`--update-snapshots` makes them; they
// are not committed).

const VARIANTS: readonly { name: string; theme: Theme; rtl: boolean }[] = [
  { name: 'light', theme: 'light', rtl: false },
  { name: 'dark', theme: 'dark', rtl: false },
  { name: 'rtl', theme: 'light', rtl: true },
];

test.skip(
  process.platform !== 'linux' && !process.env['NGU_VISUAL'],
  'Baselines are made on Linux; set NGU_VISUAL=1 to compare against your own.',
);
test.use({ viewport: { width: 1024, height: 900 }, locale: 'en-US', timezoneId: 'UTC' });

for (const variant of VARIANTS) {
  test(`field types, ${variant.name}`, async ({ page }) => {
    await useTheme(page, variant.theme);
    await page.goto(`${FORM_SITE}/gallery${variant.rtl ? '?dir=rtl' : ''}`);
    await settle(page);
    // Native controls such as select lay out their text once; make sure the site fonts are
    // there before anything is measured, then lay the page out again.
    await page.evaluate(async () => {
      await Promise.all(
        ['400 16px "Public Sans"', '600 16px "Public Sans"', '400 14px "IBM Plex Mono"'].map((font) => document.fonts.load(font)),
      );
      await document.fonts.ready;
      document.body.style.display = 'none';
      void document.body.offsetHeight;
      document.body.style.display = '';
    });

    const fields = page.locator('.gallery-types ngu-field');
    const paths = await fields.evaluateAll((els) => els.map((el) => el.getAttribute('data-ngu-path')!));
    expect(paths.length).toBeGreaterThan(30);
    for (const path of paths) {
      await expect
        .soft(page.locator(`.gallery-types ngu-field[data-ngu-path="${path}"]`))
        .toHaveScreenshot(`${path}-${variant.name}.png`);
    }

    // A refused submit by keyboard: errors show and the first problem has focus.
    await page.locator('.gallery-states .ngu-submit').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('.gallery-states ngu-field[data-ngu-path="required"] input')).toBeFocused();
    await expect.soft(page.locator('.gallery-states ngu-form')).toHaveScreenshot(`states-${variant.name}.png`);
  });
}
