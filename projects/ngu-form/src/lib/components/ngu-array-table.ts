import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, type Signal, type TemplateRef } from '@angular/core';
import type { Field } from '@angular/forms/signals';
import type { NguI18n } from '../messages';
import type { ArrayDef, LeafDef } from '../types';
import { NguField } from './ngu-field';

/** One rendered row of a list. */
export interface ArrayRow {
  readonly field: Field<any>;
  readonly index: number;
}

/** One table column: a field of the item. */
export interface ArrayColumn {
  readonly key: string;
  readonly def: LeafDef;
  /** Share of the table width, from the field's `span`. */
  readonly width: number;
}

/** What the table reads from the `<ngu-array>` that owns it. */
export interface ArrayTableHost {
  readonly titleId: string;
  readonly i18n: NguI18n;
  readonly def: Signal<ArrayDef>;
  readonly rows: Signal<readonly Field<any>[]>;
  readonly visibleRows: Signal<readonly ArrayRow[]>;
  readonly columns: Signal<readonly ArrayColumn[]>;
  readonly virtual: Signal<boolean>;
  readonly padStart: Signal<number>;
  readonly padEnd: Signal<number>;
  readonly itemPath: Signal<string>;
  readonly hasActions: Signal<boolean>;
  readonly emptyText: Signal<string>;
  readonly drag: Signal<{ readonly from: number; readonly over: number } | null>;
  dropBefore(index: number): boolean;
  dropAfter(index: number): boolean;
}

/**
 * A list with `layout: 'table'`: one column per field, headed by its label. Loaded on demand
 * by `<ngu-array>`, which keeps the rows, buttons and focus handling.
 */
@Component({
  selector: 'ngu-array-table',
  imports: [NgTemplateOutlet, NguField],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'ngu-array-table' },
  template: `
    @let a = host();
    @let d = a.def();
    @let span = a.columns().length + (a.hasActions() ? 2 : 1);
    <table
      class="ngu-table"
      [class.ngu-table--sticky]="a.virtual()"
      [attr.aria-labelledby]="d.title ? a.titleId : null"
      [attr.aria-rowcount]="a.virtual() ? a.rows().length + 1 : null"
    >
      <thead>
        <tr [attr.aria-rowindex]="a.virtual() ? 1 : null">
          <th scope="col" class="ngu-table__num"><span aria-hidden="true">#</span><span class="ngu-sr-only">{{ a.i18n.message('rowNumber') }}</span></th>
          @for (col of a.columns(); track col.key) {
            <th scope="col" [style.width.%]="col.width">
              {{ a.i18n.text(col.def.label) ?? col.key }}@if (col.def.required && typeof col.def.required !== 'function') {<span class="ngu-required" aria-hidden="true">*</span>}
            </th>
          }
          @if (a.hasActions()) {
            <th scope="col" class="ngu-table__actions"><span class="ngu-sr-only">{{ a.i18n.message('rowActions') }}</span></th>
          }
        </tr>
      </thead>
      <tbody>
        @if (a.padStart()) {
          <tr class="ngu-spacer" aria-hidden="true"><td [attr.colspan]="span" [style.height.px]="a.padStart()"></td></tr>
        }
        @for (row of a.visibleRows(); track row.field) {
          <tr
            class="ngu-array__row"
            [attr.data-index]="row.index"
            [attr.aria-rowindex]="a.virtual() ? row.index + 2 : null"
            [class.ngu-array__row--picked]="a.drag()?.from === row.index"
            [class.ngu-array__row--drop-before]="a.dropBefore(row.index)"
            [class.ngu-array__row--drop-after]="a.dropAfter(row.index)"
          >
            <th scope="row" class="ngu-table__num">{{ row.index + 1 }}</th>
            @for (col of a.columns(); track col.key) {
              @let cell = cellOf(row, col.key);
              <td>
                @if (!cell().hidden()) {
                  <ngu-field [def]="col.def" [field]="cell" [path]="a.itemPath() + '.' + col.key" [compact]="true" />
                }
              </td>
            }
            @if (a.hasActions()) {
              <td class="ngu-table__actions">
                <ng-container *ngTemplateOutlet="actions(); context: { $implicit: row }" />
              </td>
            }
          </tr>
        } @empty {
          <tr>
            <td class="ngu-table__empty" [attr.colspan]="span">{{ a.emptyText() }}</td>
          </tr>
        }
        @if (a.padEnd()) {
          <tr class="ngu-spacer" aria-hidden="true"><td [attr.colspan]="span" [style.height.px]="a.padEnd()"></td></tr>
        }
      </tbody>
    </table>
  `,
  styles: `
    :host {
      display: block;
    }
    .ngu-table {
      inline-size: 100%;
      border-collapse: collapse;
      font-size: 0.875rem;
    }
    th {
      font-weight: 600;
      text-align: start;
      white-space: nowrap;
    }
    thead th {
      padding: 0.375rem 0.25rem;
      font-size: var(--ngu-label-size, 0.875rem);
      border-block-end: 1px solid var(--ngu-border-color, #c7c7c7);
    }
    .ngu-table--sticky thead th {
      position: sticky;
      inset-block-start: 0;
      z-index: 1;
      background: var(--ngu-surface, Canvas);
    }
    td,
    tbody th {
      padding: 0.375rem 0.25rem;
      vertical-align: top;
      border-block-end: 1px solid var(--ngu-border-color, #c7c7c7);
    }
    tbody th {
      padding-block-start: 0.875rem;
      color: var(--ngu-hint-color, #6b6b6b);
      font-weight: 500;
    }
    td ngu-field {
      min-inline-size: 5rem;
    }
    .ngu-table__num,
    .ngu-table__actions {
      inline-size: 1%;
    }
    .ngu-table__empty {
      color: var(--ngu-hint-color, #6b6b6b);
    }
    .ngu-spacer td {
      padding: 0;
      border: 0;
    }
    .ngu-array__row--picked {
      opacity: 0.55;
    }
    .ngu-array__row--drop-before {
      box-shadow: 0 -3px 0 var(--ngu-primary, #1a73e8);
    }
    .ngu-array__row--drop-after {
      box-shadow: 0 3px 0 var(--ngu-primary, #1a73e8);
    }
    .ngu-required {
      color: var(--ngu-error-color, #c62828);
      margin-inline-start: 0.125rem;
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
    @media (forced-colors: active) {
      .ngu-array__row--drop-before {
        outline: 2px solid Highlight;
      }
    }
    @media print {
      .ngu-table__actions {
        display: none;
      }
      tr {
        break-inside: avoid;
      }
    }
  `,
})
export class NguArrayTable {
  readonly host = input.required<ArrayTableHost>();
  /** The row buttons, rendered by the list. */
  readonly actions = input.required<TemplateRef<{ $implicit: ArrayRow }>>();

  protected cellOf(row: ArrayRow, key: string): Field<any> {
    return (row.field as unknown as Record<string, Field<any>>)[key];
  }
}
