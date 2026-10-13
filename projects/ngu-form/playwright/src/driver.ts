/**
 * The parts of Playwright's `Locator` this helper uses. A real `Locator` (and a `Page`, as a
 * scope) fits it, so this package needs no dependency on Playwright.
 */
export interface NguPlaywrightLocator {
  /** The elements matching `selector` inside this one, such as a field's input. */
  locator(selector: string): NguPlaywrightLocator;
  /** The first matching element. */
  first(): NguPlaywrightLocator;
  /** The matching element at `index`, from 0, such as one star of a rating. */
  nth(index: number): NguPlaywrightLocator;
  /** How many elements match; the helpers use it to check whether an element exists. */
  count(): Promise<number>;
  /** A locator for each matching element, such as each option of a checkbox group. */
  all(): Promise<NguPlaywrightLocator[]>;
  /** Clicks the element; `force` skips Playwright's actionability checks. */
  click(options?: { force?: boolean }): Promise<void>;
  /** Focuses an input or textarea and replaces its value, firing an `input` event. */
  fill(value: string): Promise<void>;
  /** Presses a key on the element, such as `Enter` to add a tag. */
  press(key: string): Promise<void>;
  /** Removes focus from the element, so the field counts as touched. */
  blur(): Promise<void>;
  /** Checks or unchecks a checkbox or radio; `force` skips Playwright's actionability checks. */
  setChecked(checked: boolean, options?: { force?: boolean }): Promise<void>;
  /** Selects the options of a `<select>` with these labels, and resolves with their values. */
  selectOption(values: { label: string }[]): Promise<string[]>;
  /** The value of an attribute, such as `data-ngu-path`, or `null` when it is missing. */
  getAttribute(name: string): Promise<string | null>;
  /** The element's text, such as a label or an error message. */
  textContent(): Promise<string | null>;
  /** The current value of an input, textarea or select. */
  inputValue(): Promise<string>;
  /** Whether a checkbox or radio button is checked. */
  isChecked(): Promise<boolean>;
  /** Waits until the element reaches `state`, `'visible'` by default, for up to `timeout` ms. */
  waitFor(options?: { state?: 'attached' | 'detached' | 'visible' | 'hidden'; timeout?: number }): Promise<void>;
}

/** A Playwright `Page`, `Frame` or `Locator` to look for forms in. */
export interface NguPlaywrightScope {
  /** The elements matching `selector`, such as `ngu-form`. */
  locator(selector: string): NguPlaywrightLocator;
}

/** A value as the user enters it; the same shapes as `NguFieldValue` in `ngu-form/testing`. */
export type NguPlaywrightValue =
  | string
  | number
  | boolean
  | Date
  | readonly string[]
  | { readonly from?: string; readonly to?: string };

/** A selector string for Playwright's `:text-matches()`, escaped. */
function exact(text: string): string {
  return JSON.stringify(`^${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\*?$`);
}

const TEXT_CONTROL = 'input:not([type="checkbox"]):not([type="radio"]):not([type="range"]), textarea';

/** One `<ngu-field>`. */
export class NguFieldDriver {
  /** The field's `<ngu-field>` element. */
  readonly root: NguPlaywrightLocator;

  constructor(root: NguPlaywrightLocator) {
    this.root = root;
  }

  /** The label, without the asterisk of required fields; `''` when there is none. */
  async label(): Promise<string> {
    const label = this.root.locator('.ngu-label, .ngu-check__text').first();
    return (await label.count()) ? ((await label.textContent()) ?? '').replace(/\s*\*$/, '').trim() : '';
  }

  /** The model path from `data-ngu-path`, such as `account.email` or `items.0.sku`, or `null`. */
  path(): Promise<string | null> {
    return this.root.getAttribute('data-ngu-path');
  }

  /** The `type` from the spec, read from `data-ngu-type`; `'text'` when the attribute is missing. */
  async type(): Promise<string> {
    return (await this.root.getAttribute('data-ngu-type')) ?? 'text';
  }

  /** The error on screen, or `null`. */
  async error(): Promise<string | null> {
    const el = this.root.locator('.ngu-error');
    return (await el.count()) ? ((await el.first().textContent()) ?? '').trim() : null;
  }

  /** The hint on screen, or `null`. An error, warning or pending text shows in its place. */
  async hint(): Promise<string | null> {
    const el = this.root.locator('.ngu-hint:not([id$="-multi"])');
    return (await el.count()) ? ((await el.first().textContent()) ?? '').trim() : null;
  }

  /** True while an error shows. */
  async isInvalid(): Promise<boolean> {
    return ((await this.root.getAttribute('class')) ?? '').split(/\s+/).includes('ngu-field--invalid');
  }

  /** True when the field is required, from its `data-required` attribute (any renderer, any type). */
  async isRequired(): Promise<boolean> {
    return (await this.root.getAttribute('data-required')) !== null;
  }

  /** Enters a value the way a user would, then leaves the field. */
  async setValue(value: NguPlaywrightValue): Promise<void> {
    const type = await this.type();
    const root = this.root;
    switch (type) {
      case 'checkbox':
      case 'switch':
      case 'consent':
        if (typeof value === 'boolean') {
          await root.locator('input[type="checkbox"]').first().setChecked(value);
        } else {
          const wanted = list(value);
          for (const choice of await root.locator('.ngu-choice').all()) {
            const label = ((await choice.locator('.ngu-choice__label').textContent()) ?? '').trim();
            await choice.locator('input').setChecked(wanted.includes(label));
          }
        }
        return this.leave();
      case 'radio':
      case 'segmented':
        await root.locator(`.ngu-choice__label:text-matches(${exact(String(value))})`).first().click();
        return this.leave();
      case 'rating':
        await root.locator('.ngu-star').nth(Number(value) - 1).click();
        return this.leave();
      case 'tags': {
        const removes = root.locator('.ngu-tag__remove');
        while (await removes.count()) {
          await removes.first().click();
        }
        const input = root.locator('input').first();
        for (const tag of list(value)) {
          await input.fill(tag);
          await input.press('Enter');
        }
        return this.leave();
      }
      case 'daterange': {
        const range = value as { from?: string; to?: string };
        await root.locator('input[type="date"]').nth(0).fill(range.from ?? '');
        await root.locator('input[type="date"]').nth(1).fill(range.to ?? '');
        return this.leave();
      }
      case 'range':
        await root.locator('input[type="range"]').fill(String(value));
        return this.leave();
      case 'phone':
        await root.locator('.ngu-phone__number').fill(String(value));
        return this.leave();
      case 'date':
        await root.locator('input').first().fill(value instanceof Date ? value.toISOString().slice(0, 10) : String(value));
        return this.leave();
    }
    const select = root.locator('select:not(.ngu-phone__country)');
    if (await select.count()) {
      await select.selectOption(list(value).map((label) => ({ label })));
      return this.leave();
    }
    await root.locator(TEXT_CONTROL).first().fill(String(value));
    return this.leave();
  }

  /** The value as shown: input text, `true`/`false` for a checkbox, labels for choices. */
  async value(): Promise<NguPlaywrightValue> {
    const type = await this.type();
    const root = this.root;
    if (type === 'switch' || type === 'consent' || (type === 'checkbox' && !(await root.locator('.ngu-choice').count()))) {
      return root.locator('input[type="checkbox"]').first().isChecked();
    }
    if (type === 'checkbox' || type === 'radio' || type === 'segmented') {
      const out: string[] = [];
      for (const choice of await root.locator('.ngu-choice').all()) {
        if (await choice.locator('input').isChecked()) {
          out.push(((await choice.locator('.ngu-choice__label').textContent()) ?? '').trim());
        }
      }
      return type === 'checkbox' ? out : (out[0] ?? '');
    }
    if (type === 'tags') {
      return Promise.all((await root.locator('.ngu-tag__text').all()).map(async (t) => ((await t.textContent()) ?? '').trim()));
    }
    const select = root.locator('select:not(.ngu-phone__country) option:checked');
    if (await select.count()) {
      const labels = await Promise.all((await select.all()).map(async (o) => ((await o.textContent()) ?? '').trim()));
      return (await root.locator('select[multiple]').count()) ? labels : labels[0];
    }
    return root.locator(TEXT_CONTROL).first().inputValue();
  }

  /** Leaves the field, so it counts as touched. */
  async leave(): Promise<void> {
    const control = this.root.locator('input, select, textarea').first();
    if (await control.count()) {
      await control.blur();
    }
  }
}

/** A list (`<ngu-array>`). */
export class NguListDriver {
  /** The list's `<ngu-array>` element. */
  readonly root: NguPlaywrightLocator;

  constructor(root: NguPlaywrightLocator) {
    this.root = root;
  }

  private rows(): NguPlaywrightLocator {
    return this.root.locator(
      ':scope > .ngu-array__viewport > .ngu-array__rows > [data-index], :scope > .ngu-array__viewport > ngu-array-table tbody > tr[data-index]',
    );
  }

  /** Rows on screen (long lists render only the rows in view). */
  rowCount(): Promise<number> {
    return this.rows().count();
  }

  /** Clicks the list's add button. */
  async addRow(): Promise<void> {
    await this.root.locator(':scope > .ngu-array__add').click();
  }

  /** Clicks the remove button of the row on screen at `index`, from 0. */
  async removeRow(index: number): Promise<void> {
    // The row's own button, beside its fields or in its summary header, not a nested list's.
    await this.rows()
      .nth(index)
      .locator(':scope > .ngu-array__actions .ngu-array__remove, :scope > .ngu-array__head > .ngu-array__actions .ngu-array__remove, :scope > td .ngu-array__remove')
      .first()
      .click();
  }
}

/** One `<ngu-form>`: fill by model path, submit, read errors. */
export class NguFormDriver {
  /** The form's `<ngu-form>` element. */
  readonly root: NguPlaywrightLocator;

  constructor(root: NguPlaywrightLocator) {
    this.root = root;
  }

  /** The field at a model path (`items.0.sku`), else the one with this label. */
  field(pathOrLabel: string): NguFieldDriver {
    const quoted = JSON.stringify(pathOrLabel);
    return new NguFieldDriver(
      this.root
        .locator(
          `ngu-field[data-ngu-path=${quoted}], ngu-field:has(.ngu-label:text-matches(${exact(pathOrLabel)})), ngu-field:has(.ngu-check__text:text-matches(${exact(pathOrLabel)}))`,
        )
        .first(),
    );
  }

  /** The list at a model path, such as `items`. */
  list(path: string): NguListDriver {
    return new NguListDriver(this.root.locator(`ngu-array[data-ngu-path=${JSON.stringify(path)}]`).first());
  }

  /** Enters each value into the field at its model path (or label), in order. */
  async fill(values: Readonly<Record<string, NguPlaywrightValue>>): Promise<void> {
    for (const [key, value] of Object.entries(values)) {
      await this.field(key).setValue(value);
    }
  }

  /** Clicks the submit button. */
  async submit(): Promise<void> {
    await this.root.locator('.ngu-submit').click();
  }

  /** Clicks Next in a wizard. */
  async next(): Promise<void> {
    await this.root.locator('.ngu-next').click();
  }

  /** Clicks Back in a wizard. */
  async back(): Promise<void> {
    await this.root.locator('.ngu-back').click();
  }

  /** The heading of the wizard step on screen. */
  async step(): Promise<string | null> {
    const title = this.root.locator('.ngu-step:not([hidden]) > .ngu-step__title');
    return (await title.count()) ? ((await title.textContent()) ?? '').replace(/\s+/g, ' ').trim() : null;
  }

  /** Errors on screen by model path; a form-level error is under `$form`. */
  async errors(): Promise<Record<string, string>> {
    const out: Record<string, string> = {};
    for (const field of await this.root.locator('ngu-field.ngu-field--invalid').all()) {
      const driver = new NguFieldDriver(field);
      const error = await driver.error();
      if (error) {
        out[(await driver.path()) ?? (await driver.label())] = error;
      }
    }
    const formError = this.root.locator('.ngu-form-error');
    if (await formError.count()) {
      out['$form'] = ((await formError.first().textContent()) ?? '').trim();
    }
    return out;
  }
}

function list(value: NguPlaywrightValue): readonly string[] {
  return Array.isArray(value) ? value : [String(value)];
}

/**
 * Drives the first `<ngu-form>` in `scope` (or the one matching `selector`).
 *
 * ```ts
 * import { nguForm } from 'ngu-form/playwright';
 *
 * test('signs up', async ({ page }) => {
 *   const form = nguForm(page);
 *   await form.fill({ 'account.email': 'ada@example.com', plan: 'Pro' });
 *   await form.submit();
 *   expect(await form.errors()).toEqual({});
 * });
 * ```
 */
export function nguForm(scope: NguPlaywrightScope, selector = 'ngu-form'): NguFormDriver {
  return new NguFormDriver(scope.locator(selector).first());
}
