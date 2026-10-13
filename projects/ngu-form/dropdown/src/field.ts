import { ChangeDetectionStrategy, Component, computed, input, isSignal, type Provider, type Signal } from '@angular/core';
import { FormField, type Field } from '@angular/forms/signals';
import { injectNguI18n, provideNguFieldTypes, type LeafDef } from 'ngu-form';
import { NguDropdown, type NguDropdownFetch, type NguDropdownLookup } from 'ngu-dropdown';

/** Spec options of `type: 'dropdown'`. */
export interface NguDropdownFieldOptions {
  /**
   * A static list of rows, a signal of rows, or a function of the model for cascading lists.
   * Rows are objects (read with `optionValue` and `optionLabel`) or plain strings.
   */
  options?: unknown;
  /** Loads one page of rows from the server: `(query, { signal }) => Observable | Promise`. */
  fetch?: NguDropdownFetch<any>;
  /** Loads the rows of values that are not on a loaded page yet, such as a saved record's. */
  lookup?: NguDropdownLookup<any>;
  /** Path of the value in a row. Default `'value'`, or `provideNguDropdownConfig`. */
  optionValue?: string;
  /** Path of the label, or a function of the row. Default `'label'`. */
  optionLabel?: string | ((row: any) => string);
  /** Sent to `fetch` with every query; a signal re-queries when it changes. */
  filters?: Record<string, unknown> | Signal<Record<string, unknown>>;
  /** Show the search box. Default: with a `fetch`, or more than 8 options (ngu-dropdown's `searchThreshold`). */
  search?: boolean;
  /** Rows per request. */
  pageSize?: number;
  /** Show a clear button. Default `true`. */
  clearable?: boolean;
  /** Chips shown before "+3 more" in multiple mode. Default 2. */
  maxChips?: number;
}

/** What a dropdown stores: the chosen row's key, or the keys of a multiple selection. */
export type NguDropdownValue = string | number | null | readonly (string | number)[];

declare module 'ngu-form' {
  interface NguFieldTypeMap {
    /** `type: 'dropdown'`, on properties holding a row's key or a list of keys. */
    dropdown: NguDropdownValue;
  }
  interface NguFieldOptionsMap {
    /** The options of `type: 'dropdown'`. */
    dropdown: NguDropdownFieldOptions;
  }
}

/**
 * Renderer of `type: 'dropdown'`: an `<ngu-dropdown>` with server paging, search and virtual
 * scrolling. ngu-form keeps the label, hint and messages; the dropdown shows the error state
 * when ngu-form shows the error. A list value makes it a multiple select.
 */
@Component({
  selector: 'ngu-dropdown-field',
  imports: [FormField, NguDropdown],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let d = def();
    @let o = opts();
    <ngu-dropdown
      [formField]="field()"
      [inputId]="id()"
      [describedBy]="describedBy()"
      [errorShown]="invalid()"
      [options]="rows()"
      [fetchFn]="o.fetch ?? null"
      [lookupFn]="o.lookup ?? null"
      [optionValue]="o.optionValue"
      [optionLabel]="o.optionLabel"
      [filters]="filters()"
      [multiple]="!!d.multiple"
      [placeholder]="placeholder()"
      [showSearch]="o.search ?? null"
      [pageSize]="o.pageSize"
      [clearable]="o.clearable ?? true"
      [maxChips]="o.maxChips ?? 2"
    />
  `,
  styles: `
    :host {
      display: block;
    }
  `,
})
export class NguDropdownField {
  /** The field to edit, bound to the dropdown with `[formField]`. Set by ngu-form. */
  readonly field = input.required<Field<unknown>>();
  /** The field's spec, with the dropdown options. Set by ngu-form. */
  readonly def = input.required<LeafDef>();
  /** Id of the dropdown's trigger, used by the label's `for`. Set by ngu-form. */
  readonly id = input<string>();
  /** True while ngu-form shows the field's error; the dropdown then shows its error state. */
  readonly invalid = input(false);
  /** Ids of the field's hint and messages, for `aria-describedby`. Set by ngu-form. */
  readonly describedBy = input<string>();
  /** Options resolved by ngu-form: lists, signals and functions of the model. */
  readonly choices = input<readonly unknown[]>([]);

  private readonly i18n = injectNguI18n();
  protected readonly opts = computed(() => this.def() as unknown as NguDropdownFieldOptions);
  protected readonly rows = computed(() => (this.opts().fetch ? [] : (this.choices() as unknown[])));
  protected readonly filters = computed(() => {
    const f = this.opts().filters;
    return (isSignal(f) ? f() : f) ?? {};
  });
  protected readonly placeholder = computed(() => this.i18n.text(this.def().placeholder));
}

/**
 * Registers `type: 'dropdown'`. Add it next to your other providers; importing
 * `ngu-form/dropdown` also teaches TypeScript the type and its options.
 *
 * ```ts
 * providers: [provideNguDropdown(), provideNguDropdownConfig({ optionValue: 'id', optionLabel: 'name' })]
 * ```
 */
export function provideNguDropdown(): Provider {
  return provideNguFieldTypes({ dropdown: NguDropdownField });
}
