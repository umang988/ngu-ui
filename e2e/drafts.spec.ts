import { expect, FORM_SITE, settle, test } from './support';

// The profile example keeps its draft in IndexedDB (`nguIndexedDbDrafts()`), which jsdom
// cannot run, so this is the only automated check that a draft survives a reload.

test('an IndexedDB draft survives a reload and is cleared by a save', async ({ page }) => {
  await page.goto(`${FORM_SITE}/examples/profile`);
  await settle(page);
  const name = page.getByLabel('Display name');
  // The record loads from a pretend server first.
  await expect(name).not.toHaveValue('');
  const loaded = await name.inputValue();

  await name.fill('Draft name');
  await name.blur();
  await expect(page.getByText(/^Saved locally at/)).toBeVisible();

  await page.reload();
  await settle(page);
  await expect(page.getByLabel('Display name')).toHaveValue('Draft name');
  expect(await storedDraftKeys(page)).toContain('ngu-demo:profile:42');

  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByText('No unsaved changes')).toBeVisible();
  await expect.poll(() => storedDraftKeys(page)).not.toContain('ngu-demo:profile:42');

  await page.reload();
  await settle(page);
  await expect(page.getByLabel('Display name')).not.toHaveValue('Draft name');
  expect(loaded).not.toBe('Draft name');
});

/** Keys of every record in every IndexedDB store of the page's origin. */
function storedDraftKeys(page: import('@playwright/test').Page): Promise<string[]> {
  return page.evaluate(async () => {
    const keys: string[] = [];
    for (const info of await indexedDB.databases()) {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const open = indexedDB.open(info.name!);
        open.onsuccess = () => resolve(open.result);
        open.onerror = () => reject(open.error);
      });
      for (const store of Array.from(db.objectStoreNames)) {
        const all = await new Promise<IDBValidKey[]>((resolve, reject) => {
          const request = db.transaction(store).objectStore(store).getAllKeys();
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
        keys.push(...all.map(String));
      }
      db.close();
    }
    return keys;
  });
}
