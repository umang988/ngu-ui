import { ChangeDetectionStrategy, Component, computed, forwardRef, inject, input } from '@angular/core';
import type { Field } from '@angular/forms/signals';
import { ordered } from '../internal';
import { injectNguI18n, type NguI18n } from '../messages';
import { isLeafDef, type AnyFieldDef, type ArrayDef, type FormDef, type FormDefinition, type LeafDef } from '../types';
import { UNVIEWED_TYPES, viewValue, type ViewValue } from '../view';
import { NguFormContext } from './ngu-form-context';

type Item =
  | { readonly kind: 'leaf'; readonly key: string; readonly def: LeafDef; readonly field: Field<any> }
  | { readonly kind: 'section'; readonly key: string; readonly title: string | undefined; readonly fields: FormDefinition; readonly field: Field<any> }
  | { readonly kind: 'array'; readonly key: string; readonly def: ArrayDef; readonly field: Field<any> };

const VIEW_STYLES = `
  .ngu-view {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(var(--ngu-view-column, 14rem), 100%), 1fr));
    gap: 0.875rem 1.5rem;
    margin: 0;
  }
  .ngu-view__item {
    min-inline-size: 0;
  }
  .ngu-view__item--section {
    grid-column: 1 / -1;
  }
  .ngu-view__label {
    font-size: var(--ngu-label-size, 0.875rem);
    color: var(--ngu-hint-color, #6b6b6b);
  }
  .ngu-view__heading {
    font-size: var(--ngu-title-size, 1rem);
    font-weight: 600;
    margin-block-end: 0.5rem;
  }
  .ngu-view__value {
    margin: 0.125rem 0 0;
    overflow-wrap: anywhere;
  }
  .ngu-view__multiline {
    white-space: pre-line;
  }
  .ngu-view__swatch {
    display: inline-block;
    inline-size: 0.875rem;
    block-size: 0.875rem;
    margin-inline-end: 0.375rem;
    vertical-align: -0.125rem;
    border: 1px solid var(--ngu-border-color, #c7c7c7);
    border-radius: 0.125rem;
  }
  .ngu-view__image {
    max-inline-size: 16rem;
    max-block-size: 6rem;
    background: #fff;
    border: 1px solid var(--ngu-border-color, #c7c7c7);
    border-radius: var(--ngu-radius, 0.375rem);
  }
  .ngu-view__empty {
    color: var(--ngu-hint-color, #6b6b6b);
  }
  .ngu-sr-only {
    position: absolute;
    inline-size: 1px;
    block-size: 1px;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
  }
`;

/** The `<dd>` content for one value. */
const VALUE_TEMPLATE = `
  @if (v.empty) {
    <span class="ngu-view__empty" aria-hidden="true">—</span><span class="ngu-sr-only">{{ i18n().message('notProvided') }}</span>
  } @else if (v.secret) {
    <span aria-hidden="true">{{ v.text }}</span><span class="ngu-sr-only">{{ i18n().message('secret') }}</span>
  } @else if (v.image) {
    <img class="ngu-view__image" [src]="v.image" [alt]="v.text" />
  } @else if (v.color) {
    <span class="ngu-view__swatch" aria-hidden="true" [style.background]="v.color"></span>{{ v.text }}
  } @else {
    <span [class.ngu-view__multiline]="v.multiline">{{ v.text }}</span>
  }
`;

/** Flattens untitled groups, so their fields sit in the same list as their siblings. */
function itemsOf(fields: FormDefinition, tree: Field<any>): Item[] {
  const children = tree as unknown as Record<string, Field<any>>;
  const out: Item[] = [];
  for (const [key, def] of ordered(fields)) {
    const field = children[key];
    if (!field) {
      continue;
    }
    pushItem(out, key, def, field);
  }
  return out;
}

function pushItem(out: Item[], key: string, def: AnyFieldDef, field: Field<any>): void {
  switch (def.__ngu) {
    case 'leaf':
      if (!UNVIEWED_TYPES.has(def.type)) {
        out.push({ kind: 'leaf', key, def, field });
      }
      return;
    case 'group':
      if (def.title) {
        out.push({ kind: 'section', key, title: def.title, fields: def.fields, field });
      } else {
        out.push(...itemsOf(def.fields, field));
      }
      return;
    case 'dynamic': {
      const present = (field().value() as object | null) ?? {};
      const fields: Record<string, LeafDef> = {};
      for (const [k, entry] of def.entries()) {
        if (k in present) {
          fields[k] = entry.leaf;
        }
      }
      if (def.title) {
        out.push({ kind: 'section', key, title: def.title, fields, field });
      } else {
        out.push(...itemsOf(fields, field));
      }
      return;
    }
    case 'array':
      out.push({ kind: 'array', key, def, field });
      return;
  }
}

/** Rows of a list in view mode: a bulleted list, numbered entries, or a table. */
@Component({
  selector: 'ngu-view-rows',
  imports: [forwardRef(() => NguViewList)],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let d = def();
    @if (rows().length === 0) {
      <span class="ngu-view__empty" aria-hidden="true">—</span><span class="ngu-sr-only">{{ i18n().message('notProvided') }}</span>
    } @else if (leafItem(); as item) {
      <ul class="ngu-view__bullets">
        @for (row of rows(); track $index) {
          <li>
            @let v = valueOf(item, row);
            ${VALUE_TEMPLATE}
          </li>
        }
      </ul>
    } @else if (d.layout === 'table') {
      <div class="ngu-view__scroll">
        <table class="ngu-view__table">
          <thead>
            <tr>
              <th scope="col"><span aria-hidden="true">#</span><span class="ngu-sr-only">{{ i18n().message('rowNumber') }}</span></th>
              @for (col of columns(); track col[0]) {
                <th scope="col">{{ i18n().text(col[1].label) ?? col[0] }}</th>
              }
            </tr>
          </thead>
          <tbody>
            @for (row of rows(); track $index) {
              <tr>
                <th scope="row">{{ $index + 1 }}</th>
                @for (col of columns(); track col[0]) {
                  @let cell = cellOf(row, col[0]);
                  <td>
                    @if (!cell().hidden()) {
                      @let v = valueOf(col[1], cell);
                      ${VALUE_TEMPLATE}
                    }
                  </td>
                }
              </tr>
            }
          </tbody>
        </table>
      </div>
    } @else {
      <ol class="ngu-view__rows">
        @for (row of rows(); track $index) {
          <li class="ngu-view__row">
            <ngu-view-list [fields]="itemFields()" [tree]="row" [model]="model()" [i18n]="i18n()" />
          </li>
        }
      </ol>
    }
  `,
  styles: `
    ${VIEW_STYLES}
    .ngu-view__bullets {
      margin: 0;
      padding-inline-start: 1.25rem;
    }
    .ngu-view__rows {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      margin: 0;
      padding-inline-start: 1.5rem;
    }
    .ngu-view__row::marker {
      color: var(--ngu-hint-color, #6b6b6b);
    }
    .ngu-view__scroll {
      overflow-x: auto;
    }
    .ngu-view__table {
      inline-size: 100%;
      border-collapse: collapse;
      font-size: 0.875rem;
    }
    .ngu-view__table th,
    .ngu-view__table td {
      padding: 0.375rem 0.5rem;
      text-align: start;
      vertical-align: top;
      border-block-end: 1px solid var(--ngu-border-color, #c7c7c7);
    }
    .ngu-view__table thead th {
      font-weight: 600;
    }
    .ngu-view__table tbody th {
      font-weight: 500;
      color: var(--ngu-hint-color, #6b6b6b);
    }
  `,
})
export class NguViewRows {
  readonly def = input.required<ArrayDef>();
  readonly tree = input.required<Field<any>>();
  readonly model = input<unknown>();
  readonly i18n = input.required<NguI18n>();

  protected readonly rows = computed<readonly Field<any>[]>(() => {
    const list = this.tree() as unknown as ArrayLike<Field<any>>;
    this.tree()().value();
    return Array.from({ length: list.length }, (_, i) => list[i]);
  });
  protected readonly leafItem = computed(() => {
    const item = this.def().item;
    return isLeafDef(item) ? item : undefined;
  });
  protected readonly itemFields = computed(() => this.def().item as FormDefinition);
  protected readonly columns = computed(() => ordered(this.itemFields()) as [string, LeafDef][]);

  protected cellOf(row: Field<any>, key: string): Field<any> {
    return (row as unknown as Record<string, Field<any>>)[key];
  }

  protected valueOf(def: LeafDef, field: Field<any>): ViewValue {
    return viewValue(def, field, this.model(), this.i18n());
  }
}

/** One level of a form in view mode, as a description list. */
@Component({
  selector: 'ngu-view-list',
  imports: [NguViewRows],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dl class="ngu-view">
      @for (item of items(); track item.key) {
        @if (!item.field().hidden()) {
          @switch (item.kind) {
            @case ('leaf') {
              <div class="ngu-view__item">
                <dt class="ngu-view__label">{{ i18n().text(item.def.label) ?? item.key }}</dt>
                <dd class="ngu-view__value">
                  @let v = valueOf(item.def, item.field);
                  ${VALUE_TEMPLATE}
                </dd>
              </div>
            }
            @case ('section') {
              <div class="ngu-view__item ngu-view__item--section">
                <dt class="ngu-view__heading">{{ i18n().text(item.title) ?? item.key }}</dt>
                <dd class="ngu-view__value">
                  <ngu-view-list [fields]="item.fields" [tree]="item.field" [model]="model()" [i18n]="i18n()" />
                </dd>
              </div>
            }
            @case ('array') {
              <div class="ngu-view__item ngu-view__item--section">
                <dt class="ngu-view__heading">{{ i18n().text(item.def.title) ?? item.key }}</dt>
                <dd class="ngu-view__value">
                  <ngu-view-rows [def]="item.def" [tree]="item.field" [model]="model()" [i18n]="i18n()" />
                </dd>
              </div>
            }
          }
        }
      }
    </dl>
  `,
  styles: VIEW_STYLES,
})
export class NguViewList {
  readonly fields = input.required<FormDefinition>();
  readonly tree = input.required<Field<any>>();
  readonly model = input<unknown>();
  readonly i18n = input.required<NguI18n>();

  protected readonly items = computed(() => itemsOf(this.fields(), this.tree()));

  protected valueOf(def: LeafDef, field: Field<any>): ViewValue {
    return viewValue(def, field, this.model(), this.i18n());
  }
}

/**
 * Shows a form's values as label and value pairs, for detail and confirmation pages. It
 * follows the spec: labels, option labels, groups, lists and `order`; hidden fields are left
 * out, and values are formatted for the locale. Set `display` on a field to word its value.
 *
 * ```html
 * <ngu-view [form]="profile" />
 * ```
 */
@Component({
  selector: 'ngu-view',
  imports: [NguViewList, NguViewRows],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'ngu-view-host' },
  template: `
    @if (sectionArray(); as array) {
      <ngu-view-rows [def]="array" [tree]="sectionTree()!" [model]="model()" [i18n]="i18n" />
    } @else {
      <ngu-view-list [fields]="fields()" [tree]="listTree()" [model]="model()" [i18n]="i18n" />
    }
  `,
  styles: `
    :host {
      display: block;
    }
  `,
})
export class NguView<TModel extends object = any> {
  readonly form = input.required<FormDef<TModel, any>>();
  /** Show only these top-level entries, in this order. */
  readonly keys = input<readonly string[]>();
  /**
   * Show the content of one top-level group or list without its title, as the review step
   * does under each step's heading.
   */
  readonly section = input<string>();

  protected readonly i18n = inject(NguFormContext, { optional: true })?.i18n ?? injectNguI18n();
  protected readonly tree = computed(() => this.form().tree as unknown as Field<any>);
  protected readonly model = computed(() => this.form().value());

  private readonly sectionDef = computed(() => {
    const key = this.section();
    return key === undefined ? undefined : this.form().fields[key];
  });
  protected readonly sectionTree = computed(() => {
    const key = this.section();
    return key === undefined ? undefined : (this.tree() as unknown as Record<string, Field<any>>)[key];
  });
  /** A group section lists its own fields; everything else is looked up from the root. */
  protected readonly listTree = computed(() =>
    this.sectionDef()?.__ngu === 'group' ? this.sectionTree()! : this.tree(),
  );
  protected readonly sectionArray = computed(() => {
    const def = this.sectionDef();
    return def?.__ngu === 'array' ? def : undefined;
  });

  protected readonly fields = computed<FormDefinition>(() => {
    const def = this.sectionDef();
    if (def) {
      if (def.__ngu === 'group') {
        return def.fields;
      }
      if (def.__ngu === 'dynamic') {
        return { [this.section()!]: { ...def, title: undefined } };
      }
      return { [this.section()!]: def };
    }
    const all = this.form().fields;
    const keys = this.keys();
    return keys ? Object.fromEntries(keys.filter((k) => k in all).map((k) => [k, all[k]])) : all;
  });
}
