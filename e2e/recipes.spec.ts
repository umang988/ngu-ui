import { expect, FORM_SITE, settle, test } from './support';

// The recipes that are not covered elsewhere: settings that save themselves, and a records
// screen with view mode and server errors.

test('settings save a moment after a change, and say so', async ({ page }) => {
  await page.goto(`${FORM_SITE}/examples/settings`);
  await settle(page);
  const status = page.locator('.demo-save-state');
  await expect(status).toHaveText('Changes save automatically.');

  await page.getByRole('tab', { name: 'Notifications' }).click();
  await page.getByLabel('Product news').check();
  await expect(status).toHaveText(/^All changes saved at/);

  // An invalid value is not saved.
  await page.getByRole('tab', { name: 'Profile' }).click();
  await page.getByLabel('Display name').fill('');
  await expect(status).toHaveText('Not saved: fix the highlighted field.');
});

test('team admin shows a record, edits it, and puts the server error under the field', async ({ page }) => {
  await page.goto(`${FORM_SITE}/examples/team`);
  await settle(page);
  const team = page.locator('app-team');
  await team.getByRole('button', { name: /^Ravi Kumar/ }).click();
  await expect(team.locator('ngu-view')).toContainText('ravi@example.com');

  await team.getByRole('button', { name: 'Edit', exact: true }).click();
  const email = team.getByLabel('Email');
  await email.fill('asha@example.com');
  await team.getByRole('button', { name: 'Save changes' }).click();
  await expect(team.locator('ngu-field[data-ngu-path="email"] .ngu-error')).toHaveText('Already used by Asha Patel');
  await expect(email).toBeFocused();

  await email.fill('ravi.k@example.com');
  await team.getByRole('button', { name: 'Save changes' }).click();
  await expect(team.locator('ngu-view')).toContainText('ravi.k@example.com');
  await expect(team.getByRole('status').filter({ hasText: 'Saved' })).toHaveText('Saved Ravi Kumar.');
});
