import {
  ComponentHarness,
  HarnessPredicate,
  TestKey,
  type BaseHarnessFilters,
  type TestElement,
} from '@angular/cdk/testing';

/**
 * A value as the user sees and enters it: text for inputs, `true`/`false` for checkboxes and
 * switches, option labels for selects, radios and segments, a list of labels for checkbox
 * groups and multiple selects, a list of tags, and `{ from, to }` for date ranges.
 */
export type NguFieldValue = string | number | boolean | Date | readonly string[] | { readonly from?: string; readonly to?: string };

/** Filters for `NguFieldHarness.with`, on top of the CDK base filters (`selector`, `ancestor`). */
export interface NguFieldHarnessFilters extends BaseHarnessFilters {
  /** The label text, without the required asterisk. */
  readonly label?: string | RegExp;
  /** The model path, with numbers for list rows: `items.0.sku`. */
  readonly path?: string;
  /** The field's `type`. */
  readonly type?: string;
}

const TEXT_CONTROL = 'input:not([type="checkbox"]):not([type="radio"]):not([type="range"]), textarea';

/** ISO `yyyy-mm-dd` for date inputs, from a `Date` (UTC, as ngu-form stores dates) or a string. */
function isoDate(value: string | Date): string {
  return value instanceof Date ? value.toISOString().slice(0, 10) : value;
}

/** Harness for one `<ngu-field>`: read its label, state and messages, and enter values. */
export class NguFieldHarness extends ComponentHarness {
  /** Selector of the harness's host element: `ngu-field`. */
  static hostSelector = 'ngu-field';

  /** Matches fields by label, model path or type. */
  static with(options: NguFieldHarnessFilters = {}): HarnessPredicate<NguFieldHarness> {
    return new HarnessPredicate(NguFieldHarness, options)
      .addOption('label', options.label, (h, label) => HarnessPredicate.stringMatches(h.getLabel(), label))
      .addOption('path', options.path, async (h, path) => (await h.getPath()) === path)
      .addOption('type', options.type, async (h, type) => (await h.getType()) === type);
  }

  private readonly labelEl = this.locatorForOptional('.ngu-label, .ngu-check__text');
  private readonly errorEl = this.locatorForOptional('.ngu-error');
  private readonly hintEl = this.locatorForOptional('.ngu-hint:not([id$="-multi"])');
  private readonly warningEl = this.locatorForOptional('.ngu-warning');
  private readonly textControl = this.locatorForOptional(TEXT_CONTROL);
  private readonly select = this.locatorForOptional('select:not(.ngu-phone__country)');
  private readonly checkboxes = this.locatorForAll('input[type="checkbox"]');
  private readonly radios = this.locatorForAll('input[type="radio"]');
  private readonly choiceLabels = this.locatorForAll('.ngu-choice__label');
  private readonly range = this.locatorForOptional('input[type="range"]');
  private readonly tagTexts = this.locatorForAll('.ngu-tag__text');
  private readonly tagRemovers = this.locatorForAll('.ngu-tag__remove');
  private readonly dates = this.locatorForAll('input[type="date"]');
  private readonly phone = this.locatorForOptional('.ngu-phone__number');

  /** The label, without the asterisk of required fields. */
  async getLabel(): Promise<string> {
    const label = await this.labelEl();
    return label ? (await label.text()).replace(/\s*\*$/, '').trim() : '';
  }

  /** The model path, such as `account.email` or `items.0.sku`. */
  async getPath(): Promise<string | null> {
    return (await this.host()).getAttribute('data-ngu-path');
  }

  /** The `type` from the spec. */
  async getType(): Promise<string> {
    return (await (await this.host()).getAttribute('data-ngu-type')) ?? 'text';
  }

  /** The error message on screen, or `null`. Errors appear per `errorsOn`. */
  async getError(): Promise<string | null> {
    const el = await this.errorEl();
    return el ? (await el.text()).trim() : null;
  }

  /** The hint on screen, or `null`. An error, warning or pending text shows in its place. */
  async getHint(): Promise<string | null> {
    const el = await this.hintEl();
    return el ? (await el.text()).trim() : null;
  }

  /** The warning on screen, without its "Warning:" prefix for screen readers. */
  async getWarning(): Promise<string | null> {
    const el = await this.warningEl();
    return el ? (await el.text()).replace(/^!\s*/, '').replace(/^Warning:\s*/, '').trim() : null;
  }

  /** True while an error shows. */
  async isInvalid(): Promise<boolean> {
    return (await this.host()).hasClass('ngu-field--invalid');
  }

  /** True while the field is disabled. */
  async isDisabled(): Promise<boolean> {
    return (await this.host()).hasClass('ngu-field--disabled');
  }

  /** True when the label shows the required asterisk (`.ngu-required`); a single checkbox has none. */
  async isRequired(): Promise<boolean> {
    // The host's state attribute, so single checkboxes and design-system renderers count too.
    return (await (await this.host()).getAttribute('data-required')) !== null;
  }

  /** True while an async check runs. */
  async isPending(): Promise<boolean> {
    return (await this.host()).hasClass('ngu-field--pending');
  }

  /** The value as shown; see `NguFieldValue`. */
  async getValue(): Promise<NguFieldValue> {
    const type = await this.getType();
    switch (type) {
      case 'checkbox':
      case 'switch':
      case 'consent': {
        const boxes = await this.checkboxes();
        if (boxes.length === 1 && type !== 'checkbox') {
          return boxes[0].getProperty<boolean>('checked');
        }
        if (boxes.length === 1 && !(await this.choiceLabels()).length) {
          return boxes[0].getProperty<boolean>('checked');
        }
        return this.checkedLabels(boxes);
      }
      case 'radio':
      case 'segmented':
        return (await this.checkedLabels(await this.radios()))[0] ?? '';
      case 'rating':
        return (await this.radios()).length ? String((await this.checkedIndex()) + 1) : '';
      case 'tags':
        return Promise.all((await this.tagTexts()).map((t) => t.text()));
      case 'daterange': {
        const [from, to] = await this.dates();
        return { from: await from.getProperty<string>('value'), to: await to.getProperty<string>('value') };
      }
      case 'range':
        return (await this.range())!.getProperty<string>('value');
    }
    const select = await this.select();
    if (select) {
      const options = await select.getProperty<HTMLOptionsCollection>('selectedOptions');
      const labels = Array.from(options as unknown as ArrayLike<HTMLOptionElement>, (o) => o.textContent!.trim());
      return (await select.getProperty<boolean>('multiple')) ? labels : (labels[0] ?? '');
    }
    const control = await this.textControl();
    return control ? control.getProperty<string>('value') : '';
  }

  /**
   * Enters a value the way a user would, then leaves the field. Text is typed key by key, so
   * masks, transforms and `onChange` run; choices are picked by their label.
   */
  async setValue(value: NguFieldValue): Promise<void> {
    const type = await this.getType();
    switch (type) {
      case 'checkbox':
      case 'switch':
      case 'consent':
        if (typeof value === 'boolean') {
          const [box] = await this.checkboxes();
          if ((await box.getProperty<boolean>('checked')) !== value) {
            await box.click();
          }
        } else {
          await this.pickAll(await this.checkboxes(), asList(value));
        }
        return this.blur();
      case 'radio':
      case 'segmented':
        await this.pickAll(await this.radios(), [String(value)], true);
        return this.blur();
      case 'rating': {
        const stars = await this.radios();
        await stars[Number(value) - 1].click();
        return this.blur();
      }
      case 'tags':
        return this.setTags(asList(value));
      case 'daterange': {
        const range = value as { from?: string; to?: string };
        const [from, to] = await this.dates();
        await setNative(from, range.from ?? '');
        await setNative(to, range.to ?? '');
        return this.blur();
      }
      case 'range':
        await setNative((await this.range())!, String(value));
        return this.blur();
      case 'date':
      case 'time':
      case 'datetime-local':
      case 'month':
      case 'week':
      case 'color': {
        const control = (await this.textControl())!;
        await setNative(control, type === 'date' ? isoDate(value as string | Date) : String(value));
        return this.blur();
      }
      case 'phone': {
        const phone = (await this.phone())!;
        await phone.clear();
        await phone.sendKeys(String(value));
        return this.blur();
      }
    }
    const select = await this.select();
    if (select) {
      const labels = asList(value);
      const options = await select.getProperty<HTMLOptionsCollection>('options');
      const texts = Array.from(options as unknown as ArrayLike<HTMLOptionElement>, (o) => o.textContent!.trim());
      const indices = labels.map((label) => {
        const i = texts.indexOf(label);
        if (i < 0) {
          throw new Error(`ngu-form/testing: no option "${label}" in ${texts.join(', ')}.`);
        }
        return i;
      });
      await select.selectOptions(...indices);
      return this.blur();
    }
    const control = await this.textControl();
    if (!control) {
      throw new Error(`ngu-form/testing: cannot type into a "${type}" field; use its own harness.`);
    }
    await control.clear();
    await control.sendKeys(String(value));
    return this.blur();
  }

  /** Focuses the field's control. */
  async focus(): Promise<void> {
    await (await this.firstControl())?.focus();
  }

  /** Leaves the field, as a user tabbing away: it becomes touched and may show its error. */
  async blur(): Promise<void> {
    const control = await this.firstControl();
    if (control) {
      await control.dispatchEvent('focusout');
      await control.blur();
    }
  }

  private async firstControl(): Promise<TestElement | null> {
    return this.locatorForOptional('input, select, textarea, [tabindex="0"]')();
  }

  private async checkedLabels(inputs: TestElement[]): Promise<string[]> {
    const labels = await this.choiceLabels();
    const out: string[] = [];
    for (let i = 0; i < inputs.length; i++) {
      if (await inputs[i].getProperty<boolean>('checked')) {
        out.push((await labels[i]?.text())?.trim() ?? '');
      }
    }
    return out;
  }

  private async checkedIndex(): Promise<number> {
    const inputs = await this.radios();
    for (let i = 0; i < inputs.length; i++) {
      if (await inputs[i].getProperty<boolean>('checked')) {
        return i;
      }
    }
    return -1;
  }

  /** Checks exactly the inputs whose label is in `wanted`. */
  private async pickAll(inputs: TestElement[], wanted: readonly string[], single = false): Promise<void> {
    const labels = await Promise.all((await this.choiceLabels()).map(async (l) => (await l.text()).trim()));
    for (const label of wanted) {
      if (!labels.includes(label)) {
        throw new Error(`ngu-form/testing: no option "${label}" in ${labels.join(', ')}.`);
      }
    }
    for (let i = 0; i < inputs.length; i++) {
      const want = wanted.includes(labels[i]);
      if (want !== (await inputs[i].getProperty<boolean>('checked')) && (want || !single)) {
        await inputs[i].click();
      }
    }
  }

  private async setTags(tags: readonly string[]): Promise<void> {
    for (const remove of (await this.tagRemovers()).reverse()) {
      await remove.click();
    }
    const input = (await this.textControl())!;
    for (const tag of tags) {
      await input.sendKeys(tag, TestKey.ENTER);
    }
    return this.blur();
  }
}

/** Sets a native input's value and fires `input` and `change`, as a picker does. */
async function setNative(el: TestElement, value: string): Promise<void> {
  await el.setInputValue(value);
  await el.dispatchEvent('input');
  await el.dispatchEvent('change');
}

function asList(value: NguFieldValue): readonly string[] {
  return Array.isArray(value) ? value : [String(value)];
}

/** Filters for `NguListHarness.with`, on top of the CDK base filters (`selector`, `ancestor`). */
export interface NguListHarnessFilters extends BaseHarnessFilters {
  /** The model path of the list, such as `items`. */
  readonly path?: string;
  /** The list title. */
  readonly title?: string | RegExp;
}

/** This list's own rows, as cards or table rows; not the rows of lists inside them. */
const ROWS =
  ':scope > .ngu-array__viewport > .ngu-array__rows > [data-index], :scope > .ngu-array__viewport > ngu-array-table tbody > tr[data-index]';

/** Harness for a list (`<ngu-array>`): count, add and remove rows. */
export class NguListHarness extends ComponentHarness {
  /** Selector of the harness's host element: `ngu-array`. */
  static hostSelector = 'ngu-array';

  /** Matches lists by model path or title. */
  static with(options: NguListHarnessFilters = {}): HarnessPredicate<NguListHarness> {
    return new HarnessPredicate(NguListHarness, options)
      .addOption('path', options.path, async (h, path) => (await h.getPath()) === path)
      .addOption('title', options.title, (h, title) => HarnessPredicate.stringMatches(h.getTitle(), title));
  }

  // `:scope >`: lists inside the rows have titles and add buttons of their own.
  private readonly titleEl = this.locatorForOptional(':scope > .ngu-array__title');
  private readonly addButton = this.locatorForOptional(':scope > .ngu-array__add');

  /** The model path, such as `items`, or `null`. */
  async getPath(): Promise<string | null> {
    return (await this.host()).getAttribute('data-ngu-path');
  }

  /** The list's title, or `''` when it has none. */
  async getTitle(): Promise<string> {
    const el = await this.titleEl();
    return el ? (await el.text()).trim() : '';
  }

  /** Rows on screen (long lists render only the rows in view). */
  async getRowCount(): Promise<number> {
    return (await this.rows()).length;
  }

  /** Presses the add button. */
  async addRow(): Promise<void> {
    const add = await this.addButton();
    if (!add) {
      throw new Error('ngu-form/testing: this list has no add button.');
    }
    await add.click();
  }

  /** Presses the remove button of the row at `index`. */
  async removeRow(index: number): Promise<void> {
    const [card, tableRow] = ROWS.split(', ').map((row) => row.replace('[data-index]', `[data-index="${index}"]`));
    // A card's own buttons, beside its fields or in its summary header, never those of a list
    // inside it. Table rows hold plain fields only.
    const removes = await this.locatorForAll(
      `${card} > .ngu-array__actions .ngu-array__remove, ${card} > .ngu-array__head > .ngu-array__actions .ngu-array__remove, ${tableRow} .ngu-array__remove`,
    )();
    if (!removes.length) {
      throw new Error(`ngu-form/testing: no remove button on row ${index}.`);
    }
    await removes[0].click();
  }

  /** The fields of the row at `index`. */
  async getRowFields(index: number): Promise<NguFieldHarness[]> {
    const prefix = `${await this.getPath()}.${index}`;
    const all = await this.locatorForAll(NguFieldHarness)();
    const out: NguFieldHarness[] = [];
    for (const field of all) {
      const path = await field.getPath();
      if (path === prefix || path?.startsWith(prefix + '.')) {
        out.push(field);
      }
    }
    return out;
  }

  private rows(): Promise<TestElement[]> {
    return this.locatorForAll(ROWS)();
  }
}

/** Filters for `NguFormHarness.with`: the CDK base filters (`selector`, `ancestor`). */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- CDK harness convention; filters can grow without a breaking change
export interface NguFormHarnessFilters extends BaseHarnessFilters {}

/**
 * Harness for `<ngu-form>`: fill fields by model path, submit, and read the errors on screen.
 *
 * ```ts
 * const form = await TestbedHarnessEnvironment.harnessForFixture(fixture, NguFormHarness);
 * await form.fill({ 'account.email': 'ada@example.com', plan: 'Pro', remember: true });
 * await form.submit();
 * expect(await form.getErrors()).toEqual({});
 * ```
 */
export class NguFormHarness extends ComponentHarness {
  /** Selector of the harness's host element: `ngu-form`. */
  static hostSelector = 'ngu-form';

  /** Matches forms by the CDK base filters, `selector` and `ancestor`. */
  static with(options: NguFormHarnessFilters = {}): HarnessPredicate<NguFormHarness> {
    return new HarnessPredicate(NguFormHarness, options);
  }

  private readonly formEl = this.locatorFor('form');
  private readonly submitButton = this.locatorForOptional('.ngu-submit');
  private readonly nextButton = this.locatorForOptional('.ngu-next');
  private readonly backButton = this.locatorForOptional('.ngu-back');
  private readonly formErrorEl = this.locatorForOptional('.ngu-form-error');
  private readonly stepTitle = this.locatorForOptional('.ngu-step:not([hidden]) > .ngu-step__title');

  /** The field at a model path (`items.0.sku`), or with this label. Throws when there is none. */
  async field(pathOrLabel: string): Promise<NguFieldHarness> {
    const byPath = await this.locatorForOptional(NguFieldHarness.with({ path: pathOrLabel }))();
    if (byPath) {
      return byPath;
    }
    const byLabel = await this.locatorForOptional(NguFieldHarness.with({ label: pathOrLabel }))();
    if (byLabel) {
      return byLabel;
    }
    throw new Error(`ngu-form/testing: no field on screen at path or with label "${pathOrLabel}".`);
  }

  /** Every field on screen; hidden fields, closed steps and collapsed rows are not rendered. */
  async fields(filter: NguFieldHarnessFilters = {}): Promise<NguFieldHarness[]> {
    return this.locatorForAll(NguFieldHarness.with(filter))();
  }

  /** The list at a model path, such as `items`. */
  async list(path: string): Promise<NguListHarness> {
    return this.locatorFor(NguListHarness.with({ path }))();
  }

  /** Enters each value into the field at its model path (or label), in order. */
  async fill(values: Readonly<Record<string, NguFieldValue>>): Promise<void> {
    for (const [key, value] of Object.entries(values)) {
      await (await this.field(key)).setValue(value);
    }
  }

  /** Presses the submit button, or submits the form when it has none. */
  async submit(): Promise<void> {
    const button = await this.submitButton();
    if (button) {
      await button.click();
    } else {
      await (await this.formEl()).dispatchEvent('submit');
    }
    await this.forceStabilize();
  }

  /** Presses Next in a wizard. */
  async next(): Promise<void> {
    const next = await this.nextButton();
    if (!next) {
      throw new Error('ngu-form/testing: no Next button; this is the last step or not a wizard.');
    }
    await next.click();
    await this.forceStabilize();
  }

  /** Presses Back in a wizard. */
  async back(): Promise<void> {
    const back = await this.backButton();
    if (!back) {
      throw new Error('ngu-form/testing: no Back button on this step.');
    }
    await back.click();
  }

  /** The heading of the wizard step on screen, such as "Step 2 of 4: Address". */
  async getStep(): Promise<string | null> {
    const title = await this.stepTitle();
    return title ? (await title.text()).replace(/\s+/g, ' ').trim() : null;
  }

  /** Errors on screen by model path; a form-level error is under `$form`. */
  async getErrors(): Promise<Record<string, string>> {
    const out: Record<string, string> = {};
    for (const field of await this.locatorForAll(NguFieldHarness)()) {
      const error = await field.getError();
      if (error) {
        out[(await field.getPath()) ?? (await field.getLabel())] = error;
      }
    }
    const formError = await this.getFormError();
    if (formError) {
      out['$form'] = formError;
    }
    return out;
  }

  /** The form-level error: from `$form`, a string returned by the action, or a failed load. */
  async getFormError(): Promise<string | null> {
    const el = await this.formErrorEl();
    return el ? (await el.text()).trim() : null;
  }

  /** True while the form submits or loads (`aria-busy`). */
  async isBusy(): Promise<boolean> {
    return (await (await this.formEl()).getAttribute('aria-busy')) === 'true';
  }
}
